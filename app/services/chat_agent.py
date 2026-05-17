"""
ReAct-based AI Chat Agent — Vity Insurance Lead Intake

Flow:
  START → PLAN → TOOL (collect_info / ask_user) → OBSERVE → ... → TOOL (submit_lead) → OUTPUT

The agent gathers: name, email, phone, policy_type, lead_score (derived from conversation).
Once all required fields are collected it calls submit_lead which writes to the DB
via the same intake pipeline as the web form.
"""
import json
import logging
import os
import re
from typing import Any

import httpx
from openai import OpenAI

log = logging.getLogger(__name__)

# ── OpenAI Client ────────────────────────────────────────────────────
_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
MODEL = "gpt-4o-mini"
TEMPERATURE = 0.4
MAX_TOKENS = 512

# ── System prompt ─────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Vity, a friendly AI insurance assistant for Vity Insurance.
Your job is to gather: name, email, phone, policy_type (life/health/car/home), then submit the lead.

You operate as a ReAct agent. ALWAYS output a single, strictly valid JSON object — nothing else.
JSON format:
  {"step": "TOOL", "tool": "<name>", "input": {<args>}, "content": "<brief reason>"}
  {"step": "OUTPUT", "content": "<final message to user>"}

AVAILABLE TOOLS:
1. ask_user  — input: {"message": "<what to say to the user>"}
2. collect_info — input: {"field": "name|email|phone|policy_type", "value": "<value>"}
3. submit_lead  — input: {"name": "...", "email": "...", "phone": "...", "policy_type": "...", "lead_score": 0.7}
   Call ONLY when you have ALL 4 fields: name, email, phone, policy_type.

RULES:
- Start with a warm greeting using ask_user
- Collect all 4 fields via natural conversation (ask 2 at a time)
- Use collect_info to store each field as you learn it
- Once you have all 4, call submit_lead BEFORE outputting anything to the user
- After submit_lead succeeds, call OUTPUT with a confirmation message
- Keep messages brief (1-2 sentences)
- Output ONLY the JSON, no markdown, no prose outside JSON"""

# ── In-memory session store ───────────────────────────────────────────────────
# session_id → {"history": [...], "collected": {...}, "done": bool, "pending_reply": bool}
_sessions: dict[str, dict] = {}


def _get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "history": [{"role": "system", "content": SYSTEM_PROMPT}],
            "collected": {},
            "done": False,
            "pending_user_reply": False,
        }
    return _sessions[session_id]


def reset_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


def _call_llm(history: list[dict]) -> tuple[dict, str]:
    """Call OpenAI gpt-4o-mini with json_object mode — always returns valid JSON."""
    resp = _client.chat.completions.create(
        model=MODEL,
        messages=history,
        response_format={"type": "json_object"},
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS,
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw), raw


_TOOL_NAMES = {"ask_user", "collect_info", "submit_lead"}

def _normalize(step_data: dict) -> dict:
    """
    Normalize GPT's response into the canonical ReAct format.
    GPT-4o-mini sometimes outputs:
      {"step": "ask_user", "message": "..."} instead of
      {"step": "TOOL", "tool": "ask_user", "input": {"message": "..."}}
    This function converts both forms to the canonical one.
    """
    step = step_data.get("step", "").lower()

    # Already canonical TOOL/OUTPUT
    if step == "tool":
        return step_data
    if step == "output":
        return step_data

    # step IS the tool name (flat format)
    if step in _TOOL_NAMES:
        tool = step
        # Build input from remaining keys
        input_data = {k: v for k, v in step_data.items() if k not in ("step", "content")}
        return {
            "step": "TOOL",
            "tool": tool,
            "input": input_data,
            "content": step_data.get("content", ""),
        }

    return step_data  # unknown — pass through


def _submit_lead_tool(data: dict) -> str:
    """Submit the lead directly in-process — no HTTP self-call (avoids event loop deadlock)."""
    import uuid
    from app.core.database import SessionLocal
    from app.models.lead import Lead as LeadModel
    from app.policy_engine import PolicyViolationError, policy
    from app.schemas.schemas import LeadDataContract, ContactInfo
    from app.services.router_operator import route_lead_to_rep

    try:
        policy_type = data.get("policy_type", "unknown")
        lead_score = float(data.get("lead_score", 0.5))
        contact = ContactInfo(
            name=data.get("name", ""),
            email=data.get("email", ""),
            phone=data.get("phone", ""),
        )
        lead_dict = {
            "lead_id": "",
            "policy_type": policy_type,
            "contact": contact.dict(),
            "lead_score": lead_score,
        }

        # Run policy checks
        for pid, check in [
            ("POLICY-1", lambda: policy.check_contact_completeness(lead_dict)),
            ("POLICY-2", lambda: policy.check_duplicate_lead(lead_dict)),
            ("POLICY-3", lambda: policy.check_minimum_lead_score(lead_dict)),
        ]:
            try:
                check()
            except PolicyViolationError as e:
                if not e.route_to_workbench:
                    return json.dumps({"success": False, "error": f"Policy blocked: {e.reason}"})

        # Write to DB
        db = SessionLocal()
        try:
            lead_uuid = uuid.uuid4()
            new_lead = LeadModel(
                lead_id=lead_uuid,
                policy_type=policy_type,
                contact=contact.dict(),
                lead_score=lead_score,
                status="new",
            )
            db.add(new_lead)
            db.commit()
            db.refresh(new_lead)
            routed = route_lead_to_rep(db, new_lead)
            return json.dumps({
                "success": True,
                "lead_id": str(routed.lead_id),
                "assigned_rep_id": routed.assigned_rep_id,
                "status": routed.status,
            })
        finally:
            db.close()
    except Exception as e:
        log.error(f"submit_lead failed: {e}")
        return json.dumps({"success": False, "error": str(e)})


def _run_tool(tool: str, input_data: dict, session: dict, step_data: dict | None = None) -> str:
    """Execute a tool and return the observation string."""
    if tool == "ask_user":
        session["pending_user_reply"] = True
        message = input_data.get("message") or (step_data.get("content") if step_data else None) or ""
        return f"__ASK_USER__:{message}"

    elif tool == "collect_info":
        field = input_data.get("field", "")
        value = input_data.get("value", "")
        if field in ("name", "email", "phone", "policy_type"):
            session["collected"][field] = value
        return json.dumps({"stored": True, "field": field, "value": value})

    elif tool == "submit_lead":
        return _submit_lead_tool(input_data)

    return json.dumps({"error": f"Unknown tool: {tool}"})


def process_message(session_id: str, user_message: str | None) -> dict[str, Any]:
    """
    Main entry point. Call with:
      - user_message=None on first call (agent starts the conversation)
      - user_message="..." on subsequent calls with the user's reply

    Returns:
      {
        "reply": str,          # message to show the user (if any)
        "done": bool,          # True when conversation is complete
        "lead_submitted": bool,
        "lead_id": str | None,
        "assigned_rep_id": int | None,
      }
    """
    session = _get_session(session_id)

    if session["done"]:
        return {"reply": "This conversation has ended. Refresh to start a new one.", "done": True, "lead_submitted": False, "lead_id": None, "assigned_rep_id": None}

    # If user sent a reply, inject it as an OBSERVE
    if user_message is not None:
        observe = json.dumps({"step": "OBSERVE", "source": "user_reply", "content": user_message})
        session["history"].append({"role": "user", "content": observe})
        session["pending_user_reply"] = False

    # If this is the very first call (no user message), inject a START trigger
    if user_message is None and len(session["history"]) == 1:
        session["history"].append({
            "role": "user",
            "content": json.dumps({"step": "OBSERVE", "source": "system", "content": "User opened the chat. Begin the conversation."})
        })

    lead_id = None
    assigned_rep_id = None
    lead_submitted = False

    # Run the ReAct loop until we need user input or reach OUTPUT
    max_steps = 10  # Reduced from 20 for faster responses
    for _ in range(max_steps):
        try:
            step_data, raw = _call_llm(session["history"])
        except Exception as e:
            log.error(f"LLM error: {e}")
            return {"reply": "Sorry, I'm having trouble right now. Please try again.", "done": False, "lead_submitted": False, "lead_id": None, "assigned_rep_id": None}

        session["history"].append({"role": "assistant", "content": raw})
        step_data = _normalize(step_data)
        step = step_data.get("step", "").upper()

        if step in ("START", "PLAN"):
            # Internal reasoning — continue loop
            session["history"].append({
                "role": "user",
                "content": json.dumps({"step": "OBSERVE", "source": "system", "content": "Continue to the next step."})
            })
            continue

        elif step == "TOOL":
            tool = step_data.get("tool", "")
            input_data = step_data.get("input", {})
            observation = _run_tool(tool, input_data, session, step_data=step_data)

            if observation.startswith("__ASK_USER__:"):
                # Agent wants to say something to the user — return and wait
                message = observation[len("__ASK_USER__:"):]
                return {
                    "reply": message,
                    "done": False,
                    "lead_submitted": False,
                    "lead_id": None,
                    "assigned_rep_id": None,
                }

            # For submit_lead, extract result
            if tool == "submit_lead":
                try:
                    result = json.loads(observation)
                    if result.get("success"):
                        lead_submitted = True
                        lead_id = result.get("lead_id")
                        assigned_rep_id = result.get("assigned_rep_id")
                except Exception:
                    pass

            # Inject observation back
            session["history"].append({
                "role": "user",
                "content": json.dumps({"step": "OBSERVE", "tool": tool, "output": observation})
            })
            continue

        elif step == "OUTPUT":
            session["done"] = True
            return {
                "reply": step_data.get("content", "Thank you! A rep will be in touch soon."),
                "done": True,
                "lead_submitted": lead_submitted,
                "lead_id": lead_id,
                "assigned_rep_id": assigned_rep_id,
            }

        else:
            # Unknown step — nudge
            session["history"].append({
                "role": "user",
                "content": json.dumps({"step": "OBSERVE", "source": "system", "content": "Continue."})
            })

    return {"reply": "Something went wrong. Please refresh and try again.", "done": True, "lead_submitted": False, "lead_id": None, "assigned_rep_id": None}

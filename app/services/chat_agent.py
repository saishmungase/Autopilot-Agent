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

# ── Gemini via OpenAI-compat endpoint ────────────────────────────────────────
_client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY", ""),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)
MODEL = "gemini-3.1-flash-lite-preview"

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Vity, a friendly AI insurance assistant for Vity Insurance.
Your job is to have a natural conversation with the user, gather their insurance interest details,
and then submit them as a lead so a sales rep can follow up.

You operate as a ReAct agent. Output ONLY strictly valid JSON, one step at a time.
Never output prose, markdown, or backticks outside the JSON.

JSON format:
{"step": "START"|"PLAN"|"TOOL"|"OUTPUT", "content": "string", "tool": "string", "input": "object"}

"tool" and "input" are only required when step is "TOOL".

AVAILABLE TOOLS:
1. ask_user(message: string)
   — Send a message to the user and wait for their reply.
     Use this to greet, ask questions, or clarify.
     input: {"message": "..."}

2. collect_info(field: string, value: string)
   — Store a piece of collected information.
     field must be one of: name, email, phone, policy_type
     policy_type must be one of: life, health, car, home, unknown
     input: {"field": "name", "value": "Jane Doe"}

3. submit_lead(name: string, email: string, phone: string, policy_type: string, lead_score: number)
   — Submit the collected lead to the database and assign to a sales rep.
     Only call this when you have name, email, phone, and policy_type.
     lead_score: 0.0–1.0 based on how engaged/qualified the user seems.
     input: {"name": "...", "email": "...", "phone": "...", "policy_type": "...", "lead_score": 0.7}

RULES:
- Always start with a warm greeting using ask_user.
- Collect name, email, phone, and policy_type through natural conversation.
- Never ask for all fields at once — ask one or two at a time naturally.
- Once you have all 4 required fields, call submit_lead.
- After submit_lead succeeds (OBSERVE shows success), output a friendly confirmation via OUTPUT.
- If the user seems disengaged or says goodbye without providing info, output a polite farewell.
- Keep responses warm, concise, and professional.

Example flow:
{"step": "START", "content": "User started a chat. I will greet them and begin gathering info."}
{"step": "PLAN", "content": "I'll greet the user and ask their name first."}
{"step": "TOOL", "tool": "ask_user", "input": {"message": "Hi! I'm Vity, your insurance assistant. What's your name?"}, "content": "Greeting user."}
[OBSERVE: user replied "Jane"]
{"step": "TOOL", "tool": "collect_info", "input": {"field": "name", "value": "Jane"}, "content": "Storing name."}
[OBSERVE: stored]
{"step": "TOOL", "tool": "ask_user", "input": {"message": "Nice to meet you, Jane! What type of insurance are you interested in — life, health, auto, or home?"}, "content": "Asking policy type."}
...
{"step": "TOOL", "tool": "submit_lead", "input": {"name": "Jane Doe", "email": "jane@example.com", "phone": "555-1234", "policy_type": "life", "lead_score": 0.75}, "content": "Submitting lead."}
[OBSERVE: success]
{"step": "OUTPUT", "content": "Thanks Jane! A specialist will reach out within 24 hours."}
"""

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


def _call_llm(history: list[dict]) -> dict:
    """Call Gemini and parse the JSON step response."""
    resp = _client.chat.completions.create(
        model=MODEL,
        response_format={"type": "json_object"},
        messages=history,
    )
    raw = resp.choices[0].message.content
    return json.loads(raw), raw


def _submit_lead_tool(data: dict) -> str:
    """Call the internal intake API to create and route the lead."""
    api_base = os.getenv("INTERNAL_API_URL", "http://localhost:8000")
    payload = {
        "policy_type": data.get("policy_type", "unknown"),
        "contact": {
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "phone": data.get("phone", ""),
        },
        "lead_score": float(data.get("lead_score", 0.5)),
    }
    try:
        r = httpx.post(f"{api_base}/api/intake/process-lead", json=payload, timeout=10)
        r.raise_for_status()
        result = r.json()
        rep_id = result.get("assigned_rep_id")
        return json.dumps({
            "success": True,
            "lead_id": str(result.get("lead_id", "")),
            "assigned_rep_id": rep_id,
            "status": result.get("status", "assigned"),
        })
    except Exception as e:
        log.error(f"submit_lead failed: {e}")
        return json.dumps({"success": False, "error": str(e)})


def _run_tool(tool: str, input_data: dict, session: dict) -> str:
    """Execute a tool and return the observation string."""
    if tool == "ask_user":
        # Mark that we're waiting for the user's reply
        session["pending_user_reply"] = True
        return f"__ASK_USER__:{input_data.get('message', '')}"

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
    max_steps = 20
    for _ in range(max_steps):
        try:
            step_data, raw = _call_llm(session["history"])
        except Exception as e:
            log.error(f"LLM error: {e}")
            return {"reply": "Sorry, I'm having trouble right now. Please try again.", "done": False, "lead_submitted": False, "lead_id": None, "assigned_rep_id": None}

        session["history"].append({"role": "assistant", "content": raw})
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
            observation = _run_tool(tool, input_data, session)

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

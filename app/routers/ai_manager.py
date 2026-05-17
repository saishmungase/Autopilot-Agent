"""
AI Manager — conversational sales ops assistant with live data tools + RAG.
Uses SQLAlchemy ORM (Lead, AuditLog models) — same pattern as all other routers.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from openai import OpenAI

from app.core.database import get_db
from app.models.lead import Lead
from app.models.audit import AuditLog

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai-manager", tags=["AI Manager"])

# ─── OpenAI Client ───────────────────────────────────────────────────────────
_openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── Qdrant / Gemini RAG config ───────────────────────────────────────────────
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "sales_playbook")
RAG_TOP_K = 3


def _qdrant_client():
    try:
        from qdrant_client import QdrantClient
    except ImportError:
        return None
    url = os.getenv("QDRANT_URL", "").strip()
    api_key = os.getenv("QDRANT_API_KEY", "").strip() or None
    if url:
        return QdrantClient(url=url, api_key=api_key)
    return QdrantClient(host=os.getenv("QDRANT_HOST", "localhost"), port=int(os.getenv("QDRANT_PORT", "6333")), api_key=api_key)


def _gemini_embed(text_: str) -> list[float] | None:
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        result = genai.embed_content(model="models/gemini-embedding-001", content=text_, task_type="retrieval_query")
        return result["embedding"]
    except Exception as e:
        log.warning("Gemini embed failed: %s", e)
        return None


def _rag_search(query: str) -> list[dict]:
    try:
        vector = _gemini_embed(query)
        if not vector:
            return []
        client = _qdrant_client()
        if not client:
            return []
        hits = client.search(collection_name=COLLECTION_NAME, query_vector=vector, limit=RAG_TOP_K, with_payload=True, score_threshold=0.35)
        return [{"title": h.payload.get("title", ""), "chunk": h.payload.get("chunk", ""), "score": round(h.score, 3)} for h in hits]
    except Exception as e:
        log.warning("RAG search failed: %s", e)
        return []


def _build_rag_context(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    parts = ["## Relevant Knowledge Base Context\n"]
    for i, c in enumerate(chunks, 1):
        parts.append(f"**[{i}] {c['title']}** (relevance: {c['score']})\n{c['chunk']}\n")
    parts.append("---\nUse the above context where relevant. Do not cite chunk numbers in your reply.")
    return "\n".join(parts)


# ─── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an AI Manager embedded inside this sales platform. You assist sales teams and managers by answering questions about live data, summarising performance, and generating reports. You have direct access to the platform's database through tools AND a knowledge base of sales playbooks retrieved for each question.

## Identity
- Knowledgeable, no-nonsense sales operations assistant
- Concise and precise — lead with numbers, not fluff
- Never fabricate data — if unavailable, say so clearly
- Use knowledge base context (when provided above) to enrich your answer

## Behaviour rules
1. Always call the relevant tool first — never answer live data questions from memory
2. Use knowledge base context to supplement tool results with best practices
3. For reports, ask for date range once if not provided
4. After generating a report, offer: "Want me to export this as PDF or CSV?"
5. If a tool returns empty data, say so plainly
6. Never expose raw database objects or SQL — translate to plain English

## Output format
- Lead with key numbers
- Markdown tables for lists, bullet points for summaries
- Under 150 words unless a full report
- Always end with one suggested next step
"""

# ─── Tool Schema ─────────────────────────────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_campaigns",
            "description": "Returns lead/campaign data including performance metrics and status from the database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status: new, assigned, in_progress, unqualified"},
                    "policy_type": {"type": "string", "description": "Filter by policy type: life, health, car, home"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_workflows",
            "description": "Returns the 20 most recent audit/workflow events from the platform.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_activity",
            "description": "Returns the 10 most recent user actions and audit events across the platform.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_email": {"type": "string", "description": "Optional: filter by specific user email"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_audit_logs",
            "description": "Returns the detailed audit trail (last 7 days by default).",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_email": {"type": "string", "description": "Optional: filter by user email"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_report",
            "description": "Compiles a structured summary report from live platform data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "report_type": {
                        "type": "string",
                        "enum": ["campaigns", "activity", "full"],
                        "description": "Type of report to generate",
                    },
                    "days": {
                        "type": "string",
                        "description": "Date range as number of past days, e.g. '7' or '30'",
                    },
                },
                "required": ["report_type", "days"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_analytics_summary",
            "description": "Returns high-level KPI summary: total leads, qualified, unqualified, by policy type.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Semantic search across uploaded sales playbooks, SOPs, and documentation. Use for process/policy questions, NOT for live lead data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The question or topic to search for"},
                },
                "required": ["query"],
            },
        },
    },
]

# ─── Tool Implementations (using ORM models, mirroring working routers) ───────

def _get_campaigns(db: Session, status: str | None = None, policy_type: str | None = None) -> dict:
    """Mirror of leads.py get_all_leads — uses Lead ORM model."""
    try:
        query = db.query(Lead)
        if status:
            query = query.filter(Lead.status == status)
        if policy_type:
            query = query.filter(Lead.policy_type == policy_type)
        leads = query.order_by(Lead.lead_id.desc()).limit(50).all()

        by_status: dict = {}
        by_policy: dict = {}
        result = []
        for lead in leads:
            contact = lead.contact if isinstance(lead.contact, dict) else {}
            by_status[lead.status] = by_status.get(lead.status, 0) + 1
            by_policy[lead.policy_type] = by_policy.get(lead.policy_type, 0) + 1
            result.append({
                "name": contact.get("name", "—"),
                "email": contact.get("email", "—"),
                "policy": lead.policy_type,
                "status": lead.status,
                "score_pct": round((lead.lead_score or 0) * 100),
                "rep_id": lead.assigned_rep_id,
            })
        return {"total": len(result), "by_status": by_status, "by_policy": by_policy, "leads": result}
    except Exception as e:
        return {"error": str(e)}


def _get_workflows(db: Session) -> dict:
    """Returns recent audit events — uses AuditLog ORM model like audit.py."""
    try:
        logs = (
            db.query(AuditLog)
            .filter(AuditLog.is_middleware == False)  # custom business events only
            .order_by(desc(AuditLog.timestamp))
            .limit(20)
            .all()
        )
        return {
            "total_events": len(logs),
            "events": [
                {
                    "action": log.action,
                    "actor": log.actor_email or "system",
                    "category": log.category,
                    "description": log.description,
                    "ts": log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else "—",
                    "severity": log.severity,
                }
                for log in logs
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def _get_user_activity(db: Session, user_email: str | None = None) -> dict:
    """Returns recent user-driven audit events."""
    try:
        query = db.query(AuditLog).filter(AuditLog.is_middleware == False)
        if user_email:
            query = query.filter(AuditLog.actor_email.ilike(f"%{user_email}%"))
        logs = query.order_by(desc(AuditLog.timestamp)).limit(10).all()
        return {
            "total": len(logs),
            "events": [
                {
                    "actor": log.actor_email or "system",
                    "action": log.action,
                    "description": log.description,
                    "ts": log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else "—",
                }
                for log in logs
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def _get_audit_logs(db: Session, days: int = 7, user_email: str | None = None) -> dict:
    """Returns audit trail — mirrors audit.py list_audit_logs."""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        query = db.query(AuditLog).filter(AuditLog.timestamp >= since)
        if user_email:
            query = query.filter(AuditLog.actor_email.ilike(f"%{user_email}%"))
        logs = query.order_by(desc(AuditLog.timestamp)).limit(50).all()
        return {
            "period_days": days,
            "total_entries": len(logs),
            "entries": [
                {
                    "ts": log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else "—",
                    "actor": log.actor_email or "system",
                    "action": log.action,
                    "category": log.category,
                    "resource": log.resource_type,
                    "description": log.description,
                    "severity": log.severity,
                }
                for log in logs
            ],
        }
    except Exception as e:
        return {"error": str(e)}


def _generate_report(db: Session, report_type: str, days: int) -> dict:
    """Mirrors analytics.py patterns exactly."""
    report: dict[str, Any] = {
        "report_type": report_type,
        "period_days": days,
        "generated_at": datetime.utcnow().isoformat(),
    }
    try:
        if report_type in ("campaigns", "full"):
            # Total leads (analytics.py uses func.count on Lead.lead_id)
            total = db.query(func.count(Lead.lead_id)).scalar() or 0
            qualified = db.query(func.count(Lead.lead_id)).filter(
                Lead.status.in_(["assigned", "in_progress"])
            ).scalar() or 0
            unqualified = db.query(func.count(Lead.lead_id)).filter(
                Lead.status == "unqualified"
            ).scalar() or 0

            # By status
            status_rows = db.query(Lead.status, func.count(Lead.lead_id)).group_by(Lead.status).all()
            # By policy
            policy_rows = db.query(Lead.policy_type, func.count(Lead.lead_id)).group_by(Lead.policy_type).all()

            report["campaigns"] = {
                "total_leads": total,
                "qualified": qualified,
                "unqualified": unqualified,
                "new": total - qualified - unqualified,
                "by_status": {s: c for s, c in status_rows},
                "by_policy": {p: c for p, c in policy_rows},
            }

        if report_type in ("activity", "full"):
            since = datetime.utcnow() - timedelta(days=days)
            total_events = db.query(func.count(AuditLog.id)).filter(
                AuditLog.timestamp >= since,
                AuditLog.is_middleware == False,
            ).scalar() or 0

            # By category
            cat_rows = db.query(AuditLog.category, func.count(AuditLog.id)).filter(
                AuditLog.timestamp >= since,
                AuditLog.is_middleware == False,
            ).group_by(AuditLog.category).all()

            report["activity"] = {
                "total_events": total_events,
                "by_category": {cat: cnt for cat, cnt in cat_rows},
            }
    except Exception as e:
        report["error"] = str(e)
    return report


def _get_analytics_summary(db: Session) -> dict:
    """Exact mirror of analytics.py get_analytics_summary."""
    try:
        total = db.query(func.count(Lead.lead_id)).scalar() or 0
        qualified = db.query(func.count(Lead.lead_id)).filter(
            Lead.status.in_(["assigned", "in_progress"])
        ).scalar() or 0
        unqualified = db.query(func.count(Lead.lead_id)).filter(
            Lead.status == "unqualified"
        ).scalar() or 0

        policy_rows = db.query(Lead.policy_type, func.count(Lead.lead_id)).group_by(Lead.policy_type).all()
        status_rows = db.query(Lead.status, func.count(Lead.lead_id)).group_by(Lead.status).all()

        return {
            "total_leads": total,
            "qualified": qualified,
            "unqualified": unqualified,
            "new": db.query(func.count(Lead.lead_id)).filter(Lead.status == "new").scalar() or 0,
            "by_policy": {p: c for p, c in policy_rows},
            "by_status": {s: c for s, c in status_rows},
        }
    except Exception as e:
        return {"error": str(e)}


def _search_knowledge_base_tool(query: str) -> dict:
    chunks = _rag_search(query)
    if not chunks:
        return {"found": 0, "message": "No relevant documents found in the knowledge base.", "results": []}
    return {"found": len(chunks), "results": chunks}


def _int(val: object, default: int) -> int:
    try:
        return int(val)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _dispatch(name: str, args: dict, db: Session) -> str:
    if name == "get_campaigns":
        r = _get_campaigns(db, status=args.get("status"), policy_type=args.get("policy_type"))
    elif name == "get_workflows":
        r = _get_workflows(db)
    elif name == "get_user_activity":
        r = _get_user_activity(db, user_email=args.get("user_email"))
    elif name == "get_audit_logs":
        r = _get_audit_logs(db, days=_int(args.get("days"), 7), user_email=args.get("user_email"))
    elif name == "generate_report":
        r = _generate_report(db, report_type=args.get("report_type", "full"), days=_int(args.get("days"), 7))
    elif name == "get_analytics_summary":
        r = _get_analytics_summary(db)
    elif name == "search_knowledge_base":
        r = _search_knowledge_base_tool(args.get("query", ""))
    else:
        r = {"error": f"Unknown tool: {name}"}
    return json.dumps(r, default=str)


# ─── Request / Response ───────────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


class ChatResponse(BaseModel):
    reply: str
    tool_calls_made: list[str] = []
    rag_chunks_used: int = 0


# ─── Chat Endpoint ────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def ai_manager_chat(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    # 1. RAG: embed latest user message → search Qdrant
    user_query = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
    rag_chunks = _rag_search(user_query) if user_query else []
    rag_context = _build_rag_context(rag_chunks)

    system_content = SYSTEM_PROMPT + ("\n\n" + rag_context if rag_context else "")

    # 2. Build history
    history: list[dict] = [{"role": "system", "content": system_content}]
    history += [{"role": m.role, "content": m.content} for m in req.messages]

    tool_calls_made: list[str] = []
    MAX_ROUNDS = 4

    # 3. Agentic tool-calling loop
    for _ in range(MAX_ROUNDS):
        response = _openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=history,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.3,
            max_tokens=1024,
        )
        msg = response.choices[0].message

        if not msg.tool_calls:
            return ChatResponse(reply=msg.content or "", tool_calls_made=tool_calls_made, rag_chunks_used=len(rag_chunks))

        history.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in msg.tool_calls
            ],
        })

        for tc in msg.tool_calls:
            fn_args = json.loads(tc.function.arguments or "{}")
            tool_calls_made.append(tc.function.name)
            if tc.function.name == "search_knowledge_base":
                extra = _rag_search(fn_args.get("query", user_query))
                rag_chunks = list({c["chunk"]: c for c in rag_chunks + extra}.values())
            result = _dispatch(tc.function.name, fn_args, db)
            history.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    # 4. Final answer
    final = _openai.chat.completions.create(model="gpt-4o-mini", messages=history, temperature=0.3, max_tokens=1024)
    return ChatResponse(reply=final.choices[0].message.content or "", tool_calls_made=tool_calls_made, rag_chunks_used=len(rag_chunks))

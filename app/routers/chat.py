"""
Chat router — ReAct AI agent endpoints.

POST /api/chat/message   — Send a message (or start a session)
POST /api/chat/reset     — Reset a session
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.services.chat_agent import process_message, reset_session

router = APIRouter(prefix="/chat", tags=["AI Chat Agent"])


class ChatRequest(BaseModel):
    session_id: str
    message: Optional[str] = None  # None = start conversation


class ChatResponse(BaseModel):
    reply: str
    done: bool
    lead_submitted: bool
    lead_id: Optional[str] = None
    assigned_rep_id: Optional[int] = None


class ResetRequest(BaseModel):
    session_id: str


@router.post("/message", response_model=ChatResponse)
async def chat_message(req: ChatRequest):
    """
    Send a message to the AI agent.
    - First call: send with message=null to start the conversation.
    - Subsequent calls: send the user's reply as message.
    """
    result = process_message(req.session_id, req.message)
    return ChatResponse(**result)


@router.post("/reset")
async def chat_reset(req: ResetRequest):
    """Reset a chat session."""
    reset_session(req.session_id)
    return {"status": "reset", "session_id": req.session_id}

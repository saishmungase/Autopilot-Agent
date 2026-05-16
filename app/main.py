import asyncio
import uuid
import json
import logging
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Load .env file before any other app imports
from dotenv import load_dotenv
load_dotenv()

from app.core.database import engine, Base
from app.routers.reps import router as reps_router
from app.routers.intake import router as intake_router
from app.routers.sales_agent import router as sales_agent_router
from app.routers.client import router as client_router
from app.routers.chat import router as chat_router
from app.routers.leads import router as leads_router
from app.routers.analytics import router as analytics_router
from app.routers.workbench import router as workbench_router
from app.routers.playbook import router as playbook_router
from app.routers.supervity import router as supervity_router

# Import your orchestrator (using the correct path we fixed earlier)
from app.orchestrator.manager import Orchestrator

# Import your newly perfected Groq transcription service
from app.services.groq_services import generate_transcript

# Import all models so SQLAlchemy can resolve relationships
import app.models  # noqa: F401

log = logging.getLogger(__name__)

app = FastAPI(
    title="Sales Agent Communication API",
    description="Autopilot backend — lead intake, rep management, and transcript processing.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS — allow local frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Orchestrator and WebSocket state
orchestrator = Orchestrator()
ws_clients: dict[str, WebSocket] = {}

# Include Routers
app.include_router(reps_router, prefix="/api")
app.include_router(intake_router, prefix="/api")
app.include_router(sales_agent_router, prefix="/api")
app.include_router(client_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(workbench_router, prefix="/api")
app.include_router(playbook_router, prefix="/api")
app.include_router(supervity_router, prefix="/api")


@app.on_event("startup")
async def startup():
    # Start the background worker to process leads in real-time
    asyncio.create_task(orchestrator.worker(ws_clients))
    # Changed from log.info to print so it ALWAYS shows up in Docker logs
    print("🚀 Background orchestrator started.") 


@app.post("/api/process-call")
async def process_call(
    audio_file: UploadFile = File(...),
    context: Optional[str] = Form(None),
    lead_id: Optional[str] = Form(None), # <--- WE ADDED THIS
):
    # Use the lead_id from Postman, or generate a new one if it's empty
    actual_lead_id = lead_id if lead_id else str(uuid.uuid4())
 
    print(f"🎙️ Transcribing audio for lead: {actual_lead_id}...")
    transcript = await generate_transcript(audio_file)
 
    prev_context = json.loads(context) if context else {}
 
    print(f"🧠 Transcription finished! Pushing to Orchestrator...")
    
    # We added `ws_clients` as the 4th argument here!
    await orchestrator.serialize_and_enqueue(actual_lead_id, transcript, prev_context, ws_clients)
 
    return {"lead_id": actual_lead_id, "status": "queued"}

# ── WEBSOCKET ROUTE ───────────────────────────────────────────────
@app.websocket("/ws/{lead_id}")
async def websocket_endpoint(websocket: WebSocket, lead_id: str):
    """
    Listen for real-time updates for a specific lead. Test this via Hoppscotch.
    """
    await websocket.accept()
    ws_clients[lead_id] = websocket
    log.info(f"🟢 WebSocket connected for lead: {lead_id}")
    
    try:
        while True:
            # Keep the connection alive
            msg = await websocket.receive_text()  
            if msg.lower() == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_clients.pop(lead_id, None)
        log.info(f"🔴 WebSocket disconnected for lead: {lead_id}")
 

# ── HEALTH CHECKS ─────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Server is running", "docs": "/api/docs"}

@app.get("/api/health", tags=["Health"])
def health_check():
    """Liveness probe used by Docker healthcheck and frontend."""
    return {"status": "ok"}

@app.get("/api/ready", tags=["Health"])
def ready_check():
    """Readiness probe."""
    return {"status": "ready"}
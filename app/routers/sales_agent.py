from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List

# Assume you have standard deps for DB and Auth in your boilerplate
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.sales_agent import SalesAgent, Client
from app.schemas.schemas import SalesAgentCreate, SalesAgentResponse, Token, ClientResponse, SalesAgentLogin
from app.services.groq_services import generate_transcript

router = APIRouter(prefix="/sales-agents", tags=["Sales Agents"])

@router.post("/auth", response_model=SalesAgentResponse)
def register_sales_agent(agent: SalesAgentCreate, db: Session = Depends(get_db)):
    db_agent = db.query(SalesAgent).filter(SalesAgent.username == agent.username).first()
    if db_agent:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_agent = SalesAgent(
        name=agent.name,
        username=agent.username,
        password_hash=get_password_hash(agent.password),
        domains=agent.domains
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

@router.post("/signin", response_model=Token)
def login_sales_agent(agent: SalesAgentLogin, db: Session = Depends(get_db)):
    db_agent = db.query(SalesAgent).filter(SalesAgent.username == agent.username).first()
    if not db_agent or not verify_password(agent.password, db_agent.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": db_agent.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/fetch")
def fetch_assigned_clients(agent_id: int, db: Session = Depends(get_db)):
    # Note: Replace `agent_id` parameter with a JWT dependency (e.g., current_user) in production
    pending_clients = db.query(Client).filter(Client.sales_agent_id == agent_id, Client.is_contacted == False).all()
    completed_clients = db.query(Client).filter(Client.sales_agent_id == agent_id, Client.is_contacted == True).all()
    
    return {
        "pending": pending_clients,
        "completed": completed_clients
    }

@router.post("/transcript")
async def upload_transcript(
    client_id: int = Form(...),
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 1. Generate Transcript via Groq Whisper
    transcript_text = await generate_transcript(audio_file)

    # 2. Update DB: Set contacted and save transcript
    client.is_contacted = True
    client.transcript = transcript_text
    db.commit()
    db.refresh(client)

    # 3. Return combined object
    return {
        "message": "Transcript generated and client updated successfully",
        "client_details": {
            "name": client.name,
            "contact_number": client.contact_number,
            "age": client.age,
            "domains": client.domains,
            "other_details": client.other_details
        },
        "transcript": transcript_text
    }
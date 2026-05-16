from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

# Imports
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token 
from app.models.rep import Rep
from app.models.lead import Lead
from app.schemas.schemas import RepCreate, RepResponse, Token, SalesAgentLogin
from app.services.groq_services import generate_transcript

router = APIRouter(prefix="/reps", tags=["Reps & Transcripts"])

@router.post("/auth", response_model=RepResponse)
def register_rep(rep: RepCreate, db: Session = Depends(get_db)):
    db_rep = db.query(Rep).filter(Rep.username == rep.username).first()
    if db_rep:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_rep = Rep(
        name=rep.name,
        username=rep.username,
        password_hash=get_password_hash(rep.password),
        team=rep.team
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)
    return new_rep

@router.post("/signin", response_model=Token)
def login_rep(rep: SalesAgentLogin, db: Session = Depends(get_db)):
    db_rep = db.query(Rep).filter(Rep.username == rep.username).first()
    if not db_rep or not verify_password(rep.password, db_rep.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": db_rep.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/fetch")
def fetch_assigned_leads(rep_id: int, db: Session = Depends(get_db)):
    assigned_leads = db.query(Lead).filter(Lead.assigned_rep_id == rep_id, Lead.status == "assigned").all()
    completed_leads = db.query(Lead).filter(Lead.assigned_rep_id == rep_id, Lead.status == "closed").all()
    
    return {"assigned": assigned_leads, "completed": completed_leads}

@router.post("/transcript")
async def process_call_transcript(
    lead_id: UUID = Form(...),
    audio_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Call Groq Service 
    transcript_text = await generate_transcript(audio_file)

    lead.transcript = transcript_text
    lead.status = "closed" 
    db.commit()
    db.refresh(lead)

    return {
        "message": "Transcript generated successfully",
        "lead_data": {
            "lead_id": lead.lead_id,
            "contact": lead.contact,
            "policy_type": lead.policy_type
        },
        "transcript": transcript_text
    }


@router.post("/transcript/manual")
def save_manual_transcript(
    lead_id: UUID = Body(...),
    transcript_text: str = Body(...),
    db: Session = Depends(get_db)
):
    """
    Save a manually typed transcript for a lead and mark it as closed.
    Body: { "lead_id": "<uuid>", "transcript_text": "..." }
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.transcript = transcript_text
    lead.status = "closed"
    db.commit()
    db.refresh(lead)

    return {
        "message": "Transcript saved successfully",
        "lead_id": str(lead.lead_id),
        "status": lead.status,
    }

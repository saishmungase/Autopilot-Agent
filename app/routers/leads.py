from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.lead import Lead
from app.models.rep import Rep

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("")
def get_all_leads(db: Session = Depends(get_db)):
    """
    Get all leads sorted by created_at descending (newest first).
    Returns leads with all their information for the Command Center dashboard.
    """
    leads = db.query(Lead).order_by(Lead.lead_id.desc()).all()
    
    # Transform leads to include proper structure
    result = []
    for lead in leads:
        lead_dict = {
            "lead_id": str(lead.lead_id),
            "policy_type": lead.policy_type,
            "contact": lead.contact,  # Already JSON
            "lead_score": lead.lead_score,
            "status": lead.status,
            "assigned_rep_id": lead.assigned_rep_id,
            "created_at": lead.lead_id.time if hasattr(lead.lead_id, 'time') else datetime.utcnow().isoformat(),
            "source": "form",  # Default source, can be enhanced later
            "workbench_required": False,  # Can be enhanced with actual logic
            "hubspot_deal_id": None,  # Can be enhanced if you track HubSpot IDs
        }
        result.append(lead_dict)
    
    return result


@router.get("/{lead_id}")
def get_lead_by_id(lead_id: UUID, db: Session = Depends(get_db)):
    """
    Get a specific lead by ID.
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {
        "lead_id": str(lead.lead_id),
        "policy_type": lead.policy_type,
        "contact": lead.contact,
        "lead_score": lead.lead_score,
        "status": lead.status,
        "assigned_rep_id": lead.assigned_rep_id,
        "transcript": lead.transcript,
        "created_at": lead.lead_id.time if hasattr(lead.lead_id, 'time') else datetime.utcnow().isoformat(),
    }

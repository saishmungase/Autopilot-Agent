from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.lead import Lead

router = APIRouter(prefix="/workbench", tags=["Workbench"])


@router.get("/pending")
def get_pending_workbench_items(db: Session = Depends(get_db)):
    """
    Get all leads that require human review in the workbench.
    For now, returns leads with status 'new' that haven't been assigned yet.
    This can be enhanced with a dedicated workbench_required field.
    """
    # For now, consider unassigned leads as pending workbench items
    pending_leads = db.query(Lead).filter(
        Lead.status == "new",
        Lead.assigned_rep_id.is_(None)
    ).all()
    
    result = []
    for lead in pending_leads:
        contact = lead.contact if isinstance(lead.contact, dict) else {}
        lead_name = contact.get("name", "Unknown") if contact else "Unknown"
        
        result.append({
            "lead_id": str(lead.lead_id),
            "lead_name": lead_name,
            "policy_type": lead.policy_type,
            "reason": "No available rep - awaiting manual assignment",
            "created_at": lead.lead_id.time if hasattr(lead.lead_id, 'time') else datetime.utcnow().isoformat(),
        })
    
    return result


@router.post("/force/{lead_id}")
def force_lead_to_workbench(lead_id: UUID, db: Session = Depends(get_db)):
    """
    Force a lead into workbench review.
    Sets the lead status to 'new' and removes any assignment.
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Reset lead to workbench state
    lead.status = "new"
    lead.assigned_rep_id = None
    
    db.commit()
    db.refresh(lead)
    
    return {
        "message": "Lead forced to workbench review",
        "lead_id": str(lead.lead_id),
        "status": lead.status,
    }


@router.post("/{lead_id}/approve")
def approve_workbench_item(lead_id: UUID, db: Session = Depends(get_db)):
    """
    Approve a workbench item and attempt to route it to a rep.
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Import routing logic
    from app.services.router_operator import route_lead_to_rep
    
    # Attempt to route the lead
    routed_lead = route_lead_to_rep(db, lead)
    
    return {
        "message": "Workbench item approved and routed",
        "lead_id": str(routed_lead.lead_id),
        "status": routed_lead.status,
        "assigned_rep_id": routed_lead.assigned_rep_id,
    }


@router.post("/{lead_id}/reject")
def reject_workbench_item(
    lead_id: UUID,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Reject a workbench item.
    Sets the lead status to 'unqualified' with a rejection reason.
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Mark as unqualified
    lead.status = "unqualified"
    
    # Store rejection reason in transcript field (or create a new field)
    if lead.transcript:
        lead.transcript += f"\n\n[REJECTED]: {reason}"
    else:
        lead.transcript = f"[REJECTED]: {reason}"
    
    db.commit()
    db.refresh(lead)
    
    return {
        "message": "Workbench item rejected",
        "lead_id": str(lead.lead_id),
        "status": lead.status,
        "reason": reason,
    }


@router.post("/leads/{lead_id}/reassign")
def reassign_lead(
    lead_id: UUID,
    new_rep_id: int = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Manually reassign a lead to a different rep.
    """
    lead = db.query(Lead).filter(Lead.lead_id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify the new rep exists
    from app.models.rep import Rep
    new_rep = db.query(Rep).filter(Rep.id == new_rep_id).first()
    if not new_rep:
        raise HTTPException(status_code=404, detail="Rep not found")
    
    # Reassign
    lead.assigned_rep_id = new_rep_id
    lead.status = "assigned"
    
    db.commit()
    db.refresh(lead)
    
    return {
        "message": "Lead reassigned successfully",
        "lead_id": str(lead.lead_id),
        "assigned_rep_id": lead.assigned_rep_id,
        "rep_name": new_rep.name,
    }

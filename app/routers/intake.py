from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.lead import Lead
from app.schemas.schemas import LeadDataContract
from app.services.router_operator import route_lead_to_rep
import uuid

router = APIRouter(prefix="/intake", tags=["Intake Layer"])

@router.post("/process-lead", response_model=LeadDataContract)
def process_intake_lead(contract: LeadDataContract, db: Session = Depends(get_db)):
    """
    Layer 2 -> Layer 3 -> Layer 4: Receives the enriched JSON, saves to DB, and routes.
    """
    # 1. Generate UUID if not provided by Intent Capture Operator
    lead_uuid = contract.lead_id or uuid.uuid4()

    # 2. Layer 3: Write to DB (Single source of truth)
    new_lead = Lead(
        lead_id=lead_uuid,
        policy_type=contract.policy_type,
        contact=contract.contact.dict(),
        lead_score=contract.lead_score,
        status="new"
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    # 3. Layer 4: Qualification & Routing Operator
    routed_lead = route_lead_to_rep(db, new_lead)

    # Reconstruct contract to return
    return LeadDataContract(
        lead_id=routed_lead.lead_id,
        policy_type=routed_lead.policy_type,
        contact=routed_lead.contact,
        lead_score=routed_lead.lead_score,
        assigned_rep_id=routed_lead.assigned_rep_id,
        status=routed_lead.status
    )
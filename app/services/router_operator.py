from sqlalchemy.orm import Session
from app.models.rep import Rep
from app.models.lead import Lead

def route_lead_to_rep(db: Session, lead: Lead):
    """
    Layer 4: Qualification & Routing Operator
    Routes lead to a rep whose team matches the policy_type.
    Falls back to any available rep if no exact match exists.
    """
    policy = lead.policy_type  # "life", "health", "car", "home", "unknown"

    # Direct team match first
    available_rep = db.query(Rep).filter(Rep.team == policy).first()

    # Fallback 1: "unknown" → try "other" team
    if not available_rep and policy == "unknown":
        available_rep = db.query(Rep).filter(Rep.team == "other").first()

    # Fallback 2: any rep at all (so no lead is ever left unassigned)
    if not available_rep:
        available_rep = db.query(Rep).first()

    if available_rep:
        lead.assigned_rep_id = available_rep.id
        lead.status = "assigned"

    db.commit()
    db.refresh(lead)
    return lead
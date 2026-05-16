from sqlalchemy.orm import Session
from app.models.rep import Rep
from app.models.lead import Lead

def route_lead_to_rep(db: Session, lead: Lead):
    """
    Layer 4: Qualification & Routing Operator
    Queries reps table based on policy_type -> picks available rep -> updates JSON
    """
    # Map unknown to the generic 'other' team
    target_team = lead.policy_type if lead.policy_type in ["life", "health", "car"] else "home"
    if lead.policy_type == "unknown":
        target_team = "other"

    # Find a rep in that team (in a real app, you'd check load balancing/availability here)
    available_rep = db.query(Rep).filter(Rep.team == target_team).first()

    if available_rep:
        lead.assigned_rep_id = available_rep.id
        lead.status = "assigned"
    
    db.commit()
    db.refresh(lead)
    return lead
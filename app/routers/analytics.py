from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.lead import Lead
from app.models.rep import Rep

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Get comprehensive analytics summary for the Command Center dashboard.
    Returns KPI metrics, breakdowns by status/policy, and hourly lead counts.
    """
    # Get today's date range
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Total leads (all time for now, can be filtered to today if needed)
    total_leads = db.query(func.count(Lead.lead_id)).scalar() or 0
    
    # Qualified count (assigned or proposal_sent status)
    qualified_count = db.query(func.count(Lead.lead_id)).filter(
        Lead.status.in_(["assigned", "in_progress", "closed"])
    ).scalar() or 0
    
    # Unqualified count
    unqualified_count = db.query(func.count(Lead.lead_id)).filter(
        Lead.status == "unqualified"
    ).scalar() or 0
    
    # Workbench count (for now, return 0 - can be enhanced with actual workbench logic)
    workbench_count = 0
    
    # Policy violations (for now, return 0 - can be enhanced with audit log integration)
    policy_violations = 0
    
    # Leads by status
    status_counts = db.query(
        Lead.status,
        func.count(Lead.lead_id)
    ).group_by(Lead.status).all()
    
    leads_by_status = {status: count for status, count in status_counts}
    
    # Leads by policy type
    policy_counts = db.query(
        Lead.policy_type,
        func.count(Lead.lead_id)
    ).group_by(Lead.policy_type).all()
    
    leads_by_policy = {policy: count for policy, count in policy_counts}
    
    # Leads by hour (mock data for now - would need timestamp field in Lead model)
    # For now, return empty array or mock data
    leads_by_hour = []
    for hour in range(24):
        leads_by_hour.append({"hour": hour, "count": 0})
    
    # Policy bypasses (empty for now)
    policy_bypasses = []
    
    return {
        "total_leads_today": total_leads,
        "qualified_count": qualified_count,
        "unqualified_count": unqualified_count,
        "workbench_count": workbench_count,
        "policy_violations": policy_violations,
        "leads_by_status": leads_by_status,
        "leads_by_policy": leads_by_policy,
        "leads_by_hour": leads_by_hour,
        "policy_bypasses": policy_bypasses,
    }


@router.get("/reps-summary")
def get_reps_summary(db: Session = Depends(get_db)):
    """
    Get summary of all reps with their current workload.
    """
    reps = db.query(Rep).all()
    
    result = []
    for rep in reps:
        # Count assigned leads for this rep
        assigned_count = db.query(func.count(Lead.lead_id)).filter(
            Lead.assigned_rep_id == rep.id,
            Lead.status.in_(["assigned", "in_progress"])
        ).scalar() or 0
        
        result.append({
            "rep_id": rep.id,
            "name": rep.name,
            "policy_type": rep.team,
            "current_load": assigned_count,
            "max_load": 10,  # Default max load
            "is_available": assigned_count < 10,
        })
    
    return result

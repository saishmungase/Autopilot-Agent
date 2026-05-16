import asyncio
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.lead import Lead
from app.policy_engine import PolicyViolationError, policy
from app.policy_logger import log_policy_pass, log_policy_violation
from app.schemas.schemas import LeadDataContract
from app.services.router_operator import route_lead_to_rep

router = APIRouter(prefix="/intake", tags=["Intake Layer"])


def _run_async(coro):
    """Run an async coroutine from sync context (policy logger uses async)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except Exception:
        pass  # audit failures are never fatal


@router.post("/process-lead", response_model=LeadDataContract)
def process_intake_lead(contract: LeadDataContract, db: Session = Depends(get_db)):
    """
    ┌──────────────────────────────────────────────────────────┐
    │  POLICY GATE  →  DB Write  →  Routing Operator           │
    └──────────────────────────────────────────────────────────┘

    Layer 1: Policy Engine checks run BEFORE any DB write.
    Only if all policies pass does the lead enter the system.
    """
    lead_dict = {
        "lead_id":    str(contract.lead_id or ""),
        "policy_type": contract.policy_type,
        "contact":    contract.contact.dict() if contract.contact else {},
        "lead_score": contract.lead_score,
    }
    lead_id_str = str(contract.lead_id or "pending")

    # ── POLICY CHECKS (intake) ────────────────────────────────────────────
    intake_policies = [
        ("POLICY-1", lambda: policy.check_contact_completeness(lead_dict)),
        ("POLICY-2", lambda: policy.check_duplicate_lead(lead_dict)),
        ("POLICY-3", lambda: policy.check_minimum_lead_score(lead_dict)),
    ]

    for pid, check in intake_policies:
        try:
            check()
            _run_async(log_policy_pass(lead_id=lead_id_str, policy_id=pid))
        except PolicyViolationError as e:
            _run_async(log_policy_violation(
                lead_id=lead_id_str,
                policy_id=e.policy_id,
                reason=e.reason,
            ))

            # POLICY-3 (low score) → hard reject, don't queue
            if not e.route_to_workbench:
                return LeadDataContract(
                    lead_id=contract.lead_id,
                    policy_type=contract.policy_type,
                    contact=contract.contact,
                    lead_score=contract.lead_score,
                    status="unqualified",
                    workbench_required=False,
                    policy_violation=e.policy_id,
                    policy_reason=e.reason,
                )

            # All other violations → route to Workbench for human review
            return LeadDataContract(
                lead_id=contract.lead_id,
                policy_type=contract.policy_type,
                contact=contract.contact,
                lead_score=contract.lead_score,
                status="blocked",
                workbench_required=True,
                policy_violation=e.policy_id,
                policy_reason=e.reason,
            )

    # ── ALL POLICIES PASSED — proceed ─────────────────────────────────────

    # Layer 3: Write to DB (single source of truth)
    lead_uuid = contract.lead_id or uuid.uuid4()
    new_lead = Lead(
        lead_id=lead_uuid,
        policy_type=contract.policy_type,
        contact=contract.contact.dict(),
        lead_score=contract.lead_score,
        status="new",
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    # Layer 4: Qualification & Routing Operator
    routed_lead = route_lead_to_rep(db, new_lead)

    return LeadDataContract(
        lead_id=routed_lead.lead_id,
        policy_type=routed_lead.policy_type,
        contact=routed_lead.contact,
        lead_score=routed_lead.lead_score,
        assigned_rep_id=routed_lead.assigned_rep_id,
        status=routed_lead.status,
    )
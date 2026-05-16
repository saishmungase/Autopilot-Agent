# app/policy_engine.py
"""
Policy Engine — Business Rule Enforcement Layer

Architecture
------------
  Frontend → FastAPI → [POLICY CHECK] → Operator API → [POLICY CHECK] → Database

Every agent action passes through this layer before and after calling a
Supervity operator.  Operators never execute until all upstream policies pass.

Adding a new policy
-------------------
1. Add a `check_*` method to `PolicyEngine`.
2. Register it in the relevant route handler in the routes that use it.
3. Policies are logged automatically via the existing AuditService — no
   extra Supabase calls needed (we already use PostgreSQL).
"""

import os
import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


# ─── Custom exception ─────────────────────────────────────────────────────────

class PolicyViolationError(Exception):
    """
    Raised when a business rule blocks an action.

    Attributes:
        policy_id  – Machine-readable identifier  (e.g. "POLICY-3")
        reason     – Human-readable explanation shown in the Workbench
        route_to_workbench – True  → block + queue for human review
                             False → hard reject (e.g. unqualified leads)
    """

    def __init__(
        self,
        policy_id: str,
        reason: str,
        route_to_workbench: bool = True,
    ):
        self.policy_id = policy_id
        self.reason = reason
        self.route_to_workbench = route_to_workbench
        super().__init__(f"[{policy_id}] {reason}")


# ─── Policy Engine ────────────────────────────────────────────────────────────

class PolicyEngine:
    """
    Stateless policy checker.  Each method raises PolicyViolationError or
    returns None (pass).  The route handler decides what to do on violation.

    Instantiate once and reuse:
        policy = PolicyEngine()
    """

    # ── POLICY-1: Contact completeness ──────────────────────────────────────
    def check_contact_completeness(self, lead: dict) -> None:
        """A lead must have at least one contact method (email OR phone)."""
        contact = lead.get("contact", {})
        if not contact.get("email") and not contact.get("phone"):
            raise PolicyViolationError(
                "POLICY-1",
                "Both email and phone are missing. Cannot create lead without at "
                "least one contact method.",
            )

    # ── POLICY-2: Duplicate lead (same email, same day) ──────────────────────
    def check_duplicate_lead(self, lead: dict) -> None:
        """
        Prevent the same email being submitted more than once per day.
        Uses the existing PostgreSQL DB via SQLAlchemy — not Supabase.
        """
        email = lead.get("contact", {}).get("email")
        if not email:
            return  # no email → skip (covered by POLICY-1 if both missing)

        try:
            from .core.database import SessionLocal
            from .models.audit import AuditLog

            db = SessionLocal()
            try:
                today_start = datetime.utcnow().replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                existing = (
                    db.query(AuditLog)
                    .filter(
                        AuditLog.action == "lead.intake",
                        AuditLog.resource_name == email,
                        AuditLog.timestamp >= today_start,
                        AuditLog.success == "true",
                    )
                    .first()
                )
                if existing:
                    raise PolicyViolationError(
                        "POLICY-2",
                        f"Duplicate lead: {email} was already submitted today.",
                    )
            finally:
                db.close()
        except PolicyViolationError:
            raise
        except Exception as exc:
            log.warning("POLICY-2 duplicate check failed (skipping): %s", exc)

    # ── POLICY-3: Minimum lead score ─────────────────────────────────────────
    def check_minimum_lead_score(self, lead: dict) -> None:
        """Leads below 0.6 are immediately unqualified (no workbench needed)."""
        score = lead.get("lead_score")
        if score is not None and score < 0.6:
            raise PolicyViolationError(
                "POLICY-3",
                f"Lead score {score:.2f} is below the 0.6 threshold. "
                "Lead is automatically disqualified.",
                route_to_workbench=False,  # discard, don't queue
            )

    # ── POLICY-4: Rep capacity ───────────────────────────────────────────────
    def check_rep_capacity(self, rep: dict) -> None:
        """A rep cannot take more than 10 concurrent leads."""
        if rep.get("current_load", 0) >= 10:
            raise PolicyViolationError(
                "POLICY-4",
                f"Rep {rep.get('name', rep.get('rep_id', '?'))} is at full capacity "
                f"({rep['current_load']}/10). Cannot assign new lead.",
            )

    # ── POLICY-5: Rep availability ───────────────────────────────────────────
    def check_rep_availability(self, rep: dict) -> None:
        """Rep must be marked available before a lead can be assigned."""
        if not rep.get("is_available", False):
            raise PolicyViolationError(
                "POLICY-5",
                f"Rep {rep.get('name', rep.get('rep_id', '?'))} is currently "
                "unavailable. Cannot assign lead.",
            )

    # ── POLICY-6: Working hours (IST 9 AM – 7 PM) ───────────────────────────
    def check_working_hours(self) -> None:
        """
        Outbound actions are only allowed 9:00–19:00 IST.
        Violations are routed to the Workbench for next-business-day review.
        """
        now = datetime.now()
        if now.hour < 9 or now.hour >= 19:
            raise PolicyViolationError(
                "POLICY-6",
                f"Current time {now.strftime('%H:%M')} is outside working hours "
                "(9 AM – 7 PM IST). Action queued for next business window.",
            )

    # ── POLICY-7: Proposal prerequisites ────────────────────────────────────
    def check_proposal_prerequisites(self, lead_id: str) -> None:
        """
        Before advancing to Proposal:
          • A discovery call must be logged in audit_logs
          • lead_score ≥ 0.5
          • Email must be on file
        """
        try:
            from .core.database import SessionLocal
            from .models.audit import AuditLog
            from .models.lead import Lead  # adjust import to your Lead model path

            db = SessionLocal()
            try:
                # Check discovery call in audit trail
                discovery = (
                    db.query(AuditLog)
                    .filter(
                        AuditLog.resource_id == str(lead_id),
                        AuditLog.action == "lead.discovery_call_logged",
                    )
                    .first()
                )
                if not discovery:
                    raise PolicyViolationError(
                        "POLICY-7",
                        "No discovery call logged for this lead. "
                        "Cannot advance to Proposal stage.",
                    )

                # Fetch lead for score + email
                lead = db.query(Lead).filter(Lead.id == lead_id).first()
                if lead:
                    score = getattr(lead, "lead_score", 1.0) or 1.0
                    if score < 0.5:
                        raise PolicyViolationError(
                            "POLICY-8",
                            f"Lead score {score:.2f} dropped below 0.5. Proposal blocked.",
                        )
                    contact = getattr(lead, "contact", {}) or {}
                    if not contact.get("email"):
                        raise PolicyViolationError(
                            "POLICY-9",
                            "No email address on file. Cannot send proposal without contact email.",
                        )
            finally:
                db.close()

        except PolicyViolationError:
            raise
        except Exception as exc:
            log.warning("POLICY-7 prerequisite check error (skipping): %s", exc)

    # ── POLICY-8: Closed-Won requires Workbench approval ─────────────────────
    def check_closed_won_prerequisites(self, lead_id: str) -> None:
        """Deal cannot be marked Closed Won without a Workbench approval entry."""
        try:
            from .core.database import SessionLocal
            from .models.audit import AuditLog

            db = SessionLocal()
            try:
                approval = (
                    db.query(AuditLog)
                    .filter(
                        AuditLog.resource_id == str(lead_id),
                        AuditLog.action == "workbench.approved",
                    )
                    .first()
                )
                if not approval:
                    raise PolicyViolationError(
                        "POLICY-10",
                        "No Workbench approval found. Cannot mark deal Closed Won "
                        "without manager approval.",
                    )
            finally:
                db.close()

        except PolicyViolationError:
            raise
        except Exception as exc:
            log.warning("POLICY-10 prerequisite check error (skipping): %s", exc)

    # ── POLICY-9: Senior approval for large life-insurance deals ─────────────
    def check_senior_approval_for_large_deals(self, lead: dict) -> None:
        """Life-insurance policies > ₹50L require a senior_manager_approved audit entry."""
        policy_type = lead.get("policy_type")
        coverage = lead.get("coverage_amount", 0)

        if policy_type == "life" and coverage > 5_000_000:
            try:
                from .core.database import SessionLocal
                from .models.audit import AuditLog

                db = SessionLocal()
                try:
                    approval = (
                        db.query(AuditLog)
                        .filter(
                            AuditLog.resource_id == str(lead.get("lead_id", "")),
                            AuditLog.action == "lead.senior_manager_approved",
                        )
                        .first()
                    )
                    if not approval:
                        raise PolicyViolationError(
                            "POLICY-11",
                            f"Life insurance deal above ₹50L requires Senior Manager approval. "
                            f"Coverage: ₹{coverage:,}",
                        )
                finally:
                    db.close()

            except PolicyViolationError:
                raise
            except Exception as exc:
                log.warning("POLICY-11 check error (skipping): %s", exc)


# Singleton — import once, reuse everywhere
policy = PolicyEngine()

# app/policy_logger.py
"""
Policy Logger — Wires PolicyViolationError into the existing AuditService
plus optional Slack alerting.

Usage (in route handlers):
    from app.policy_logger import log_policy_violation, log_policy_pass

    try:
        policy.check_contact_completeness(lead)
        await log_policy_pass(lead_id="abc", policy_id="POLICY-1")
    except PolicyViolationError as e:
        await log_policy_violation(
            lead_id="abc",
            rep_id="rep-42",
            policy_id=e.policy_id,
            reason=e.reason,
        )
        # then decide: route to workbench or hard-reject
"""

import logging
import os
from datetime import datetime
from typing import Optional

import httpx

from .models.audit import AuditCategory, AuditSeverity
from .services.audit import audit as audit_service

log = logging.getLogger(__name__)

SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "").strip()


# ─── Core helpers ─────────────────────────────────────────────────────────────

async def log_policy_violation(
    lead_id: str,
    policy_id: str,
    reason: str,
    rep_id: Optional[str] = None,
    action: str = "policy.violation",
) -> None:
    """
    Record a policy violation in the audit trail and fire a Slack alert.

    The log goes into the existing `audit_logs` table via AuditService,
    so it shows up in /api/admin/audit automatically.
    """

    # ── 1. Write to audit_logs ─────────────────────────────────────────────
    await audit_service.log(
        action=action,
        description=f"[{policy_id}] {reason}",
        category=AuditCategory.SECURITY,
        severity=AuditSeverity.WARNING,
        resource_type="lead",
        resource_id=lead_id,
        metadata={
            "policy_id": policy_id,
            "rep_id": rep_id,
            "reason": reason,
            "blocked_at": datetime.utcnow().isoformat(),
        },
        success=False,
        error_message=reason,
    )

    # ── 2. Slack alert (best-effort, never crashes the app) ─────────────────
    if SLACK_WEBHOOK:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    SLACK_WEBHOOK,
                    json={
                        "text": (
                            f"🚨 *Policy Violation — {policy_id}*\n"
                            f"Lead: `{lead_id}`"
                            + (f"  Rep: `{rep_id}`" if rep_id else "")
                            + f"\nReason: {reason}\n"
                            f"Time: {datetime.now().strftime('%H:%M:%S IST')}"
                        )
                    },
                )
        except Exception as exc:
            log.warning("Slack alert failed (non-fatal): %s", exc)


async def log_policy_pass(lead_id: str, policy_id: str) -> None:
    """
    Record a successful policy check.  Creates a lightweight INFO entry so
    the full policy trace is visible per-lead in the audit explorer.
    """
    await audit_service.log(
        action="policy.passed",
        description=f"[{policy_id}] Policy check passed",
        category=AuditCategory.SECURITY,
        severity=AuditSeverity.INFO,
        resource_type="lead",
        resource_id=lead_id,
        metadata={"policy_id": policy_id},
        success=True,
    )

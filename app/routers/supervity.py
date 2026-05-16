"""
Supervity Human-in-Command Proxy
---------------------------------
Proxies requests to the Supervity API so the bearer token
never has to be exposed in the browser / frontend env vars.

Routes:
  GET  /api/supervity/user-forms              → list pending reviews
  GET  /api/supervity/user-forms/:formId      → fetch form detail
  POST /api/supervity/user-forms/:formId/submit → submit decision
  GET  /api/supervity/workflow-runs/:runId    → check run status
"""

import os
import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

router = APIRouter(prefix="/supervity", tags=["Supervity Human-in-Command"])

SUPERVITY_API_URL = os.getenv("SUPERVITY_API_URL", "https://auto-workflow-api.supervity.ai").rstrip("/")
SUPERVITY_TOKEN   = os.getenv("SUPERVITY_TOKEN", "").strip()


def _headers() -> dict:
    if not SUPERVITY_TOKEN:
        raise HTTPException(status_code=503, detail="SUPERVITY_TOKEN not configured")
    return {
        "Authorization": f"Bearer {SUPERVITY_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _get(path: str) -> Any:
    url = f"{SUPERVITY_API_URL}{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=_headers())
    if not resp.is_success:
        log.warning(f"Supervity GET {path} → {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def _post(path: str, body: dict) -> Any:
    url = f"{SUPERVITY_API_URL}{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, headers=_headers(), json=body)
    if not resp.is_success:
        log.warning(f"Supervity POST {path} → {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/user-forms")
async def list_user_forms(page: int = 1, limit: int = 50, search: str = ""):
    """List all pending human review forms from Supervity."""
    qs = f"?page={page}&limit={limit}"
    if search:
        qs += f"&search={search}"
    return await _get(f"/api/v1/user-forms{qs}")


@router.get("/user-forms/{form_id}")
async def get_user_form(form_id: str):
    """Fetch the detail (schema + HTML) of a specific review form."""
    return await _get(f"/api/v1/user-forms/{form_id}")


@router.post("/user-forms/{form_id}/submit")
async def submit_user_form(form_id: str, request: Request):
    """Submit a human decision for a review form, resuming agent execution."""
    body = await request.json()
    return await _post(f"/api/v1/user-forms/{form_id}/submit", body)


@router.get("/workflow-runs/{run_id}")
async def get_run_status(run_id: str):
    """Check the execution status of a workflow run."""
    return await _get(f"/api/v1/workflow-runs/{run_id}")

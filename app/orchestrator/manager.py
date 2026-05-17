import os
import asyncio
import httpx
import json
import logging
from dotenv import load_dotenv
load_dotenv()

log = logging.getLogger(__name__)

pi = os.getenv("SUPER_API", "")

SUPERVITY_URL = "https://auto-workflow-api.supervity.ai/api/v1/workflow-runs/execute/stream"
SUPERVITY_API_KEY = pi

HEADERS = {
    "Authorization": f"Bearer {SUPERVITY_API_KEY}",
    "x-source" : "v1"
}

WORKFLOW_IDS = {
    "serialize": "019e31d2-ece5-7000-9fa8-8b7d54c6ab50",
    "hubspot":   "019e31e9-4bdf-7000-9e56-ad2611cf32cc",
    "slack":     "019e3209-5dbb-7000-8def-48535d706a33",
    "email":     "019e3229-b80f-7000-80a5-71534a2d88bf",
}


class Orchestrator:
    def __init__(self):
        self.queue = None

    async def _init_queue(self):
        if self.queue is None:
            self.queue = asyncio.Queue()

    # ── Function 1: Serialize ──────────────────────────────────────────────
    async def serialize_and_enqueue(self, lead_id: str, transcript: str, prev_context: dict, ws_clients: dict):
        await self._init_queue()
        
        async def send(agent: str, message: str):
            ws = ws_clients.get(lead_id)
            if ws:
                await ws.send_text(json.dumps({
                    "lead_id": lead_id,
                    "agent": agent,
                    "message": message,
                }))

        # FIX 1: Prevent Supervity Crash by ensuring a valid domain
        domain_val = prev_context.get("domain", "health")
        if domain_val not in ["life", "car", "health", "wealth"]:
            domain_val = "health"

        form_data = {
            "workflowId":               WORKFLOW_IDS["serialize"],
            "inputs[name]":             prev_context.get("name", ""),
            "inputs[email]":            prev_context.get("email", ""),
            "inputs[mobileNo]":         prev_context.get("mobileNo", ""),
            "inputs[domain]":           domain_val,  # Now strictly validated
            "inputs[assigned_to]":      prev_context.get("assigned_to", ""),
            "inputs[assigned_to_mail]": prev_context.get("assigned_to_mail", ""),
            "inputs[transcript]":       transcript,
        }

        print(f"⚙️ [Serialize] Agent starting...")
        result_json = await self._stream_workflow(form_data, "Serialize", send=send)

        job = {
            "lead_id":    lead_id,
            "context":    result_json,
            "transcript": transcript,   # carry transcript so worker can save it
        }
        await self.queue.put(job)
        print(f"📥 [Serialize] Job enqueued for Worker!")

    # ── Function 2: Worker ─────────────────────────────────────────────────
    async def worker(self, ws_clients: dict):
        await self._init_queue()
        print("👷 Worker is online and waiting for jobs...")
        
        while True:
            job = await self.queue.get()
            lead_id = job["lead_id"]
            context = job["context"]
            transcript = job.get("transcript", "")

            async def send(agent: str, message: str):
                ws = ws_clients.get(lead_id)
                if ws:
                    await ws.send_text(json.dumps({
                        "lead_id": lead_id,
                        "agent":   agent,
                        "message": message,
                    }))

            try:
                print(f"🚀 Worker picked up job for lead {lead_id}!")
                await self.run_hubspot(context, send)
                await self.run_slack(context, send)
                await self.run_email(context, send)
                print(f"✅ All agents finished for lead {lead_id}")

                # ── Mark lead as closed in the database ──────────────────
                await self._close_lead(lead_id, transcript)
                await send("System", "✅ Lead marked as closed")

            except Exception as e:
                print(f"❌ Worker Error: {str(e)}")
                await send("Error", f"Job failed: {str(e)}")
            finally:
                self.queue.task_done()

    async def _close_lead(self, lead_id: str, transcript: str) -> None:
        """Update the lead status to 'closed' in the database after all agents finish."""
        try:
            from app.core.database import SessionLocal
            from app.models.lead import Lead
            import uuid as _uuid

            db = SessionLocal()
            try:
                lead_uuid = _uuid.UUID(lead_id)
                lead = db.query(Lead).filter(Lead.lead_id == lead_uuid).first()
                if lead:
                    lead.status = "closed"
                    if transcript:
                        lead.transcript = transcript
                    db.commit()
                    print(f"✅ Lead {lead_id} marked as closed in DB")
                else:
                    print(f"⚠️  Lead {lead_id} not found in intake_leads — skipping close")
            finally:
                db.close()
        except Exception as e:
            log.error(f"Failed to close lead {lead_id}: {e}")

# ── Function 3: HubSpot ───────────────────────────────────────────────
    async def run_hubspot(self, context: dict, send):
        form_data = {
            "workflowId": WORKFLOW_IDS["hubspot"],
            # Give HubSpot exactly what it wants: the single 'client_data' package
            "inputs[client_data]": json.dumps(context),
        }
        await self._stream_workflow(form_data, "HubSpot", send)

    # ── Function 5: Slack ─────────────────────────────────────────────────
    async def run_slack(self, context: dict, send):
        form_data = {
            "workflowId": WORKFLOW_IDS["slack"],
            # Give Slack exactly what it wants: the single 'deal_details' package
            "inputs[deal_details]": json.dumps(context),
        }
        await self._stream_workflow(form_data, "Slack", send)

    # ── Function 6: Email ─────────────────────────────────────────────────
    async def run_email(self, context: dict, send):
        form_data = {
            "workflowId": WORKFLOW_IDS["email"],
            # Give Email exactly what it wants: the single 'deal_detail' package
            "inputs[deal_detail]": json.dumps(context),
        }
        await self._stream_workflow(form_data, "Email", send)
    # ── Shared: stream SSE from Supervity, forward trails, return result ───
    async def _stream_workflow(self, form_data: dict, agent_name: str, send) -> dict:
        result = {}

        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream("POST", SUPERVITY_URL,
                                     data=form_data, headers=HEADERS) as resp:
                resp.raise_for_status()

                # FIX 2: State manager for multi-line SSE streams
                current_event = "message"

                async for raw_line in resp.aiter_lines():
                    raw_line = raw_line.strip()
                    if not raw_line:
                        continue
                        
                    print(f"📡 [{agent_name}] SSE: {raw_line}")

                    # 1. Update the event state (e.g. "event: thinking")
                    if raw_line.startswith("event:"):
                        current_event = raw_line.split(":", 1)[1].strip()
                        continue

                    # 2. Extract and route the data payload
                    if raw_line.startswith("data:"):
                        payload_str = raw_line.split(":", 1)[1].strip()

                        try:
                            payload = json.loads(payload_str)
                        except json.JSONDecodeError:
                            continue

                        # Route based on the event state we captured earlier
                        if current_event == "thinking":
                            content = payload.get("content", "")
                            if content and send:
                                await send(agent_name, content)

                        elif current_event == "result":
                            if payload.get("success"):
                                activity_runs = payload.get("workflowRun", {}).get("activityRuns", [])
                                if activity_runs:
                                    raw_output = activity_runs[-1].get("outputs", {}).get("output", "{}")
                                    try:
                                        result = json.loads(raw_output)
                                    except json.JSONDecodeError:
                                        result = {"raw": raw_output}
                            if send:
                                await send(agent_name, "✓ Done")

        return result
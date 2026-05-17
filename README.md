# ⚡ SuperAgent — AI Sales Autopilot

An end-to-end AI-powered insurance sales platform built on FastAPI, Next.js, and PostgreSQL.  
Leads come in through a web form or an AI chat agent, get routed to the right sales rep automatically, and reps close deals by uploading call transcripts — which trigger a full downstream automation pipeline (HubSpot → Slack → Email) via Supervity workflows.

---

## What This Does

```
Client visits /          →  fills form  OR  chats with AI agent
                                  ↓
              Lead created in DB, routed to matching sales rep
                                  ↓
Rep visits /sales        →  sees their assigned leads
                                  ↓
Rep clicks "Open & Process Call"  →  uploads audio or types transcript
                                  ↓
Groq Whisper transcribes audio    →  Supervity orchestrator runs:
                                       ⚙️  Serialize → 🔗 HubSpot → 💬 Slack → 📧 Email
                                  ↓
Lead marked "closed"  →  appears in Completed Deals
```

---

## Prerequisites

| Tool | Download | Why |
|------|----------|-----|
| **Docker Desktop** | [docker.com](https://www.docker.com/products/docker-desktop/) | Runs all services |
| **Git** | [git-scm.com](https://git-scm.com/) | Clone the repo |

> **Windows users:** Make sure WSL 2 is enabled. If you see a WSL error, run `wsl --install` in PowerShell as Administrator and restart.

---

## Quick Start

### 1. Clone

```bash
git clone <your-repo-url>
cd Autopilot-Agent
```

### 2. Configure environment

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` and fill in the required keys:

```env
# Database (Aiven PostgreSQL or local)
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# Security
SECRET_KEY=your-secret-key-here

# Groq — audio transcription (whisper-large-v3)
# Get free key at: https://console.groq.com
GROQ_API_KEY=gsk_...

# Gemini — AI chat agent (gemini-2.0-flash)
# Get free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

# Supervity — downstream automation workflows
SUPER_API=your-supervity-api-key

# Internal service URL (used by chat agent inside Docker)
INTERNAL_API_URL=http://backend:8000
```

### 3. Start everything

```bash
docker compose up --build
```

First run takes 3–5 minutes (downloads images, installs packages). Subsequent runs use cache and start in ~15 seconds.

### 4. Open the app

| Service | URL | Description |
|---------|-----|-------------|
| 🏠 **Client Page** | [http://localhost:3001](http://localhost:3001) | Public landing — form + AI chat |
| 💼 **Sales Portal** | [http://localhost:3001/sales](http://localhost:3001/sales) | Rep login + lead dashboard |
| 📖 **API Docs** | [http://localhost:8001/api/docs](http://localhost:8001/api/docs) | Swagger UI |

---

## Features

### Client Page (`/`)
- Company info with phone, email, and hours
- **"Request a Free Quote"** button → opens a modal form → submits lead to DB → auto-routes to a rep
- **AI Chat Assistant** (right panel) — powered by Gemini 2.0 Flash via a ReAct agent loop:
  - Greets the user, collects name / email / phone / policy type through natural conversation
  - Once all info is gathered, calls the intake API to create and assign the lead
  - Fully stateful per session

### Sales Portal (`/sales`)
- **Auth gate** — sign in or register; JWT stored in `localStorage`; auto-redirects to dashboard on return visits
- **Dashboard** shows only the leads assigned to the logged-in rep (by `rep_id` decoded from JWT)
- **Newly Assigned** — leads waiting to be called
- **Completed Deals** — leads closed after transcript upload
- **"Open & Process Call"** button on each lead card:
  - **Manual transcript** — type or paste the call notes
  - **Audio upload** — upload any audio file (MP3, M4A, WAV); auto-compressed with pydub + ffmpeg before sending to Groq Whisper
  - After transcript is saved → lead status set to `"closed"` → Supervity orchestrator runs HubSpot, Slack, and Email workflows in sequence via WebSocket real-time updates

### Backend
- **ReAct AI agent** (`/api/chat/message`) — stateless REST endpoint, session managed server-side
- **Lead intake** (`/api/intake/process-lead`) — creates lead, routes to matching rep by team/policy type
- **Transcript endpoint** (`/api/reps/transcript`) — accepts audio file OR manual text, closes the lead
- **Orchestrator** — async background worker; runs Supervity workflows after transcript is saved; marks lead closed in DB when all agents finish
- **Rep auth** — bcrypt passwords, JWT with embedded `rep_id` so the frontend never needs to hardcode IDs

---

## Project Structure

```
Autopilot-Agent/
├── app/                        # Backend (FastAPI)
│   ├── main.py                 # App entry point + /api/process-call + WebSocket
│   ├── core/
│   │   ├── database.py         # SQLAlchemy engine + session
│   │   └── security.py         # bcrypt + JWT (with rep_id embedded)
│   ├── models/
│   │   ├── lead.py             # intake_leads table (UUID PK)
│   │   ├── rep.py              # reps table
│   │   └── sales_agent.py      # sales_agents + clients tables
│   ├── routers/
│   │   ├── reps.py             # auth, signin, /me, fetch, transcript
│   │   ├── intake.py           # process-lead
│   │   └── chat.py             # AI chat agent endpoints
│   ├── services/
│   │   ├── chat_agent.py       # ReAct agent (Gemini 2.0 Flash)
│   │   ├── groq_services.py    # Audio compression + Whisper transcription
│   │   └── router_operator.py  # Lead → Rep routing logic
│   └── orchestrator/
│       └── manager.py          # Supervity workflow runner + DB close-lead
├── frontend/                   # Frontend (Next.js 15)
│   └── src/app/
│       ├── page.tsx            # Client landing page (form + chatbot)
│       └── sales/page.tsx      # Sales portal (auth + dashboard)
├── alembic/versions/           # DB migrations
├── packages/requirements.txt   # Python dependencies
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reps/auth` | Register a new rep |
| `POST` | `/api/reps/signin` | Login → returns JWT with `rep_id` |
| `GET`  | `/api/reps/me?token=...` | Get rep profile from JWT |
| `GET`  | `/api/reps/fetch?rep_id=N` | Get assigned + completed leads for a rep |
| `POST` | `/api/reps/transcript` | Save transcript (audio or text), close lead |
| `POST` | `/api/intake/process-lead` | Create lead + auto-route to rep |
| `POST` | `/api/chat/message` | Send message to AI chat agent |
| `POST` | `/api/chat/reset` | Reset a chat session |
| `POST` | `/api/process-call` | Upload audio → transcribe → run Supervity pipeline |
| `WS`   | `/ws/{lead_id}` | Real-time agent progress updates |
| `GET`  | `/api/health` | Liveness probe |

---

## Key Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret |
| `GROQ_API_KEY` | ✅ | Groq Whisper transcription |
| `GEMINI_API_KEY` | ✅ | Gemini 2.0 Flash for AI chat |
| `SUPER_API` | ✅ | Supervity workflow automation |
| `INTERNAL_API_URL` | ✅ | `http://backend:8000` inside Docker |
| `AUTH_BYPASS` | optional | `true` = skip Keycloak auth (dev mode) |

---

## Common Commands

```bash
# Start everything
docker compose up --build

# Start without rebuilding
docker compose up

# Stop
docker compose down

# View backend logs live
docker compose logs -f backend

# View frontend logs live
docker compose logs -f frontend

# Run a DB migration
docker compose exec backend alembic upgrade head

# Create a new migration
docker compose exec backend alembic revision --autogenerate -m "description"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `GEMINI_API_KEY` error on startup | Add your key to `.env` — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Frontend shows "site can't be reached" on `:3000` | Use **`:3001`** — Docker maps `3001 → 3000` internally |
| Lead not moving to Completed | Make sure you click "Open & Process Call" and submit a transcript — the chat agent only creates leads, it doesn't close them |
| Audio upload fails with 413 | File is too large even after compression — try a shorter recording |
| `bcrypt` error | Rebuild with `--no-cache`: `docker compose build --no-cache` |
| Port already in use | `docker compose down` then `docker compose up --build` |
| DB migration fails | Check `docker compose logs backend` — usually a stale `leads` table conflict |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11 + FastAPI + Gunicorn |
| Frontend | Next.js 15 + React 19 + Tailwind CSS + Framer Motion |
| Database | PostgreSQL 15 + SQLAlchemy + Alembic |
| AI Chat | Gemini 2.0 Flash (via OpenAI-compat endpoint) |
| Transcription | Groq Whisper Large v3 + pydub + ffmpeg |
| Automation | Supervity workflow orchestration (HubSpot, Slack, Email) |
| Auth | bcrypt + JWT (rep_id embedded) |
| Containers | Docker + Docker Compose |

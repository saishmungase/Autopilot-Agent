# 🚀 SecurePulse Insurance - AI-Powered Sales Automation Platform

An intelligent, multi-agent sales automation system that streamlines insurance lead intake, qualification, and routing with AI-powered chatbots and human-in-command oversight.

---

## 🎯 Overview

SecurePulse Insurance is a full-stack application that automates the insurance sales pipeline:

- **AI Chatbot**: Gemini-powered conversational agent for lead collection
- **Lead Intake**: Multi-channel lead capture (web form, chat, audio)
- **Policy Engine**: Automated lead qualification and validation
- **Smart Routing**: Intelligent assignment to sales representatives
- **Sales Dashboard**: Rep portal with lead management and call processing
- **Human-in-Command**: Supervity AI integration for exception handling
- **Sales Playbook**: Vector-based knowledge management with Qdrant

---

## 📋 Prerequisites

| Tool | Installation | Purpose |
|------|-------------|---------|
| **Python 3.11+** | [Download](https://www.python.org/downloads/) | Backend runtime |
| **Node.js 18+** | [Download](https://nodejs.org/) | Frontend runtime |
| **PostgreSQL** | [Download](https://www.postgresql.org/download/) or use Aiven | Database |
| **Docker** (optional) | [Download](https://www.docker.com/products/docker-desktop/) | Containerized deployment |

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/saishmungase/Autopilot-Agent.git
cd Autopilot-Agent
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database (Aiven PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# API Keys
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Qdrant Vector Database
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key

# Supervity AI (optional)
SUPERVITY_API_URL=https://auto-workflow-api.supervity.ai
SUPERVITY_TOKEN=your_supervity_token
```

### 3. Install Backend Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Start the Application

**Backend:**
```bash
uvicorn app.main:app --reload --port 8001
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**UI (TanStack Router):**
```bash
cd ui
npm run dev
```

### 6. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| 🏠 **Main Website** | [http://localhost:3000](http://localhost:3000) | Public-facing site with intake form |
| 📊 **Sales Dashboard** | [http://localhost:3001/sales](http://localhost:3001/sales) | Sales rep portal |
| 📚 **Sales Playbook** | [http://localhost:3001/playbook](http://localhost:3001/playbook) | Knowledge base management |
| 🔧 **Workbench** | [http://localhost:3001/workbench](http://localhost:3001/workbench) | Human-in-command interface |
| 📖 **API Docs** | [http://localhost:8001/api/docs](http://localhost:8001/api/docs) | Swagger documentation |

---

## 🏗️ Architecture

### System Flow

```
┌─────────────┐
│   Website   │ → Lead Form / Chatbot
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ → Policy Engine → Database
│   FastAPI   │ → Lead Routing → Sales Reps
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Sales     │ → Process Calls
│  Dashboard  │ → Manage Leads
└─────────────┘
```

### Key Components

#### 1. **AI Chatbot** (`/app/services/chat_agent.py`)
- **Model**: Gemini 1.5 Flash
- **Pattern**: ReAct (Reasoning + Acting) agent
- **Tools**: 
  - `ask_user` - Conversational interaction
  - `collect_info` - Data extraction
  - `submit_lead` - Lead submission
- **Features**: Natural language lead collection, automatic field extraction

#### 2. **Lead Intake** (`/app/routers/intake.py`)
- Multi-channel support (form, chat, audio)
- Policy-based validation
- Automatic lead scoring
- Database persistence

#### 3. **Policy Engine** (`/app/policy_engine.py`)
- **POLICY-1**: Contact completeness validation
- **POLICY-2**: Duplicate lead detection
- **POLICY-3**: Minimum lead score threshold
- Routes violations to workbench for human review

#### 4. **Smart Routing** (`/app/services/router_operator.py`)
- Policy-type based assignment
- Rep availability checking
- Load balancing

#### 5. **Sales Dashboard** (`/frontend/src/app/sales/page.tsx`)
- Lead management interface
- Process call modal with audio upload
- Real-time lead updates
- Rep authentication

#### 6. **Sales Playbook** (`/app/routers/playbook.py`)
- Document upload (PDF, DOCX, TXT, MD)
- Vector embeddings with Gemini
- Semantic search with Qdrant
- Knowledge base for AI agents

---

## 📁 Project Structure

```
Autopilot-Agent/
├── app/                          # Backend (FastAPI)
│   ├── main.py                   # Application entry point
│   ├── routers/                  # API endpoints
│   │   ├── intake.py             # Lead intake
│   │   ├── chat.py               # AI chatbot
│   │   ├── sales_agent.py        # Sales rep management
│   │   ├── playbook.py           # Knowledge base
│   │   └── workbench.py          # Human-in-command
│   ├── services/                 # Business logic
│   │   ├── chat_agent.py         # ReAct agent
│   │   ├── router_operator.py   # Lead routing
│   │   └── groq_services.py     # Audio transcription
│   ├── models/                   # Database models
│   ├── schemas/                  # Pydantic schemas
│   ├── core/                     # Core utilities
│   │   ├── database.py           # DB connection
│   │   ├── security.py           # Authentication
│   │   └── storage.py            # File storage
│   └── orchestrator/             # Lead orchestration
│       └── manager.py            # Async lead processing
├── frontend/                     # Next.js Dashboard
│   └── src/
│       ├── app/                  # Pages
│       │   ├── sales/            # Sales portal
│       │   ├── playbook/         # Knowledge base
│       │   ├── workbench/        # Human oversight
│       │   └── command-center/   # Analytics
│       └── components/           # UI components
├── ui/                           # TanStack Router Website
│   └── src/
│       ├── routes/               # Pages
│       └── components/           # UI components
├── alembic/                      # Database migrations
├── docs/                         # Documentation
└── .env                          # Environment configuration
```

---

## 🔑 Key Features

### 1. Multi-Channel Lead Intake
- **Web Form**: Direct lead submission from website
- **AI Chatbot**: Conversational lead collection
- **Audio Processing**: Call transcription with Groq Whisper

### 2. Intelligent Lead Qualification
- Automated policy checks
- Lead scoring algorithm
- Duplicate detection
- Contact validation

### 3. Smart Lead Routing
- Policy-type based assignment
- Rep specialization matching
- Automatic load balancing

### 4. Sales Rep Portal
- Lead dashboard with filters
- Process call interface
- Audio upload and transcription
- Lead status management

### 5. Vector-Powered Knowledge Base
- Document upload and parsing
- Semantic search
- AI-accessible playbook
- Qdrant vector storage

### 6. Human-in-Command
- Exception handling workflow
- Supervity AI integration
- Review and approval interface
- Audit trail

---

## 🛠️ API Endpoints

### Lead Management
```
POST   /api/intake/process-lead    # Submit new lead
GET    /api/reps/fetch              # Get rep's leads
POST   /api/process-call            # Process audio call
```

### Chat & AI
```
POST   /api/chat/message            # Send chat message
POST   /api/chat/reset              # Reset chat session
```

### Sales Playbook
```
POST   /api/playbook/upload         # Upload document
GET    /api/playbook/documents      # List documents
GET    /api/playbook/search         # Semantic search
DELETE /api/playbook/documents/:id  # Delete document
```

### Authentication
```
POST   /api/reps/auth               # Register rep
POST   /api/reps/signin             # Sign in
```

---

## 🧪 Testing

### Backend Tests
```bash
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing
Use the Swagger UI at `http://localhost:8001/api/docs`

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

1. **Backend**: Deploy to Railway, Render, or AWS
2. **Frontend**: Deploy to Vercel or Netlify
3. **Database**: Use Aiven PostgreSQL (already configured)
4. **Vector DB**: Use Qdrant Cloud (already configured)

---

## 🔧 Configuration

### Environment Variables

#### Required
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key
- `QDRANT_URL` - Qdrant cloud URL
- `QDRANT_API_KEY` - Qdrant API key

#### Optional
- `GROQ_API_KEY` - For audio transcription
- `SUPERVITY_TOKEN` - For human-in-command
- `SECRET_KEY` - JWT secret (auto-generated if not set)

---

## 📊 Database Schema

### Core Tables
- `leads` - Lead information and status
- `reps` - Sales representatives
- `sales_agents` - Agent configurations
- `audit_logs` - System audit trail
- `settings` - Application settings

### Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🤖 AI Models Used

| Model | Purpose | Provider |
|-------|---------|----------|
| **Gemini 1.5 Flash** | Chatbot conversations | Google |
| **Gemini Embedding 004** | Document embeddings | Google |
| **Groq Whisper** | Audio transcription | Groq |

---

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection protection (SQLAlchemy ORM)
- CORS configuration
- Environment variable protection
- Audit logging for all operations

---

## 🐛 Troubleshooting

### Common Issues

**Chatbot not responding:**
- Check `GEMINI_API_KEY` is set correctly
- Verify backend is running on port 8001
- Check browser console for errors

**Database connection failed:**
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure SSL mode is set correctly

**Form submission fails:**
- Check backend API is accessible
- Verify CORS settings
- Check browser network tab for errors

**Playbook search not working:**
- Verify Qdrant credentials
- Check collection exists
- Ensure documents are uploaded

---

## 📝 License

This project is licensed under the MIT License.

---

## 👥 Contributors

- Madhav Chaturvedi
- Saish Mungase

---

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Qdrant for vector search
- Supervity for human-in-command platform
- Aiven for managed PostgreSQL

---

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact: madhavchaturvedi005@gmail.com

---

**Built with ❤️ for the AutoPilot Hackathon**

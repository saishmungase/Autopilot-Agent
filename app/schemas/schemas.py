# app/schemas/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from uuid import UUID

# ---------------------------------------------------------------------------
# Shared Auth Schemas
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str


class SalesAgentLogin(BaseModel):
    username: str
    password: str


# ---------------------------------------------------------------------------
# Data Contract Schemas (Intake Layer)
# ---------------------------------------------------------------------------

class ContactInfo(BaseModel):
    name: str
    email: EmailStr
    phone: str


class LeadDataContract(BaseModel):
    lead_id: Optional[UUID] = None
    policy_type: Literal["life", "health", "car", "home", "unknown"]
    contact: ContactInfo
    lead_score: float = Field(ge=0.0, le=1.0)
    assigned_rep_id: Optional[int] = None
    status: str = "new"  # new | assigned | in_progress | closed | blocked | unqualified

    # Policy Engine fields — populated on violation
    workbench_required: bool = False
    policy_violation: Optional[str] = None   # e.g. "POLICY-2"
    policy_reason: Optional[str] = None      # human-readable explanation



# ---------------------------------------------------------------------------
# Rep Schemas (reps router)
# ---------------------------------------------------------------------------

class RepCreate(BaseModel):
    name: str
    username: str
    password: str
    team: Literal["life", "health", "car", "home", "other"]


class RepResponse(BaseModel):
    id: int
    name: str
    team: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Sales Agent Schemas (sales_agent router — legacy/alternative flow)
# ---------------------------------------------------------------------------

class SalesAgentCreate(BaseModel):
    name: str
    username: str
    password: str
    domains: List[str] = []


class SalesAgentResponse(BaseModel):
    id: int
    name: str
    username: str
    domains: List[str] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Client Schemas (client router — legacy/alternative flow)
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    name: str
    contact_number: str
    age: int
    domains: List[str] = []
    other_details: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    name: str
    contact_number: str
    age: int
    domains: List[str] = []
    other_details: Optional[str] = None
    sales_agent_id: Optional[int] = None
    is_contacted: bool = False

    class Config:
        from_attributes = True

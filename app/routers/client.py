from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.sales_agent import Client
from app.schemas.schemas import ClientCreate, ClientResponse
from app.services.matching_servies import find_best_agent

router = APIRouter(prefix="/clients", tags=["Clients & Comm-Forms"])

@router.post("/comm-form", response_model=ClientResponse)
def handle_comm_form(form_data: ClientCreate, db: Session = Depends(get_db)):
    """
    Receives form from frontend, finds the best agent, and queues the client.
    """
    # 1. Find Best Agent based on domain
    assigned_agent_id = find_best_agent(db, form_data.domains)

    # 2. Insert into DB
    new_client = Client(
        name=form_data.name,
        contact_number=form_data.contact_number,
        age=form_data.age,
        domains=form_data.domains,
        other_details=form_data.other_details,
        sales_agent_id=assigned_agent_id
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    return new_client

@router.post("/chats")
def handle_chats():
    # Leave empty for future integration as requested
    return {"message": "Chat integration coming soon"}
from sqlalchemy import Column, String, Float, ForeignKey, JSON, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base


class Lead(Base):
    # Use "intake_leads" to avoid collision with the existing "leads" table
    # in the shared Aiven DB (which belongs to a different project/schema).
    __tablename__ = "intake_leads"

    lead_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_type = Column(String, nullable=False, index=True)  # "life", "health", "car", "home", "unknown"
    contact = Column(JSON, nullable=False)  # { name, email, phone }
    lead_score = Column(Float, default=0.0)
    assigned_rep_id = Column(Integer, ForeignKey("reps.id"), nullable=True)
    status = Column(String, default="new")  # "new", "assigned", "in_progress", "closed"

    # Audio/Transcript fields (Post-intake)
    transcript = Column(Text, nullable=True)

    assigned_rep = relationship("Rep", back_populates="leads")

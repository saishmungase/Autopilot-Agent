# app/models/sales_agent.py
"""
SalesAgent and Client models for the legacy sales-agent flow.
"""
from sqlalchemy import Boolean, Column, Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class SalesAgent(Base):
    __tablename__ = "sales_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    domains = Column(JSON, default=list)  # e.g. ["life", "health"]

    clients = relationship("Client", back_populates="sales_agent")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    domains = Column(JSON, default=list)
    other_details = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    is_contacted = Column(Boolean, default=False)
    sales_agent_id = Column(Integer, ForeignKey("sales_agents.id"), nullable=True)

    sales_agent = relationship("SalesAgent", back_populates="clients")

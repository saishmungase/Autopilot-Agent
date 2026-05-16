from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class Rep(Base):
    __tablename__ = "reps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    team = Column(String, nullable=False, index=True) # "life", "health", "car", "home", "other"
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    leads = relationship("Lead", back_populates="assigned_rep")
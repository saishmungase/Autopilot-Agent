import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

# We import Base and the models so SQLAlchemy knows what tables to create
from app.core.database import Base
# Make sure to import your actual models here so they register with Base
from app.models.lead import Lead 
from app.models.rep import Rep

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the .env file")

print(f"Connecting to database...")

# Create the engine
engine = create_engine(DATABASE_URL)

print("Creating tables...")
# This will create tables that don't exist yet
Base.metadata.create_all(bind=engine)

print("Tables created successfully!")
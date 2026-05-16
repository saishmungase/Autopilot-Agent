import os, warnings
warnings.filterwarnings("ignore")
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    exists = conn.execute(text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name='intake_leads')"
    )).scalar()
    print("intake_leads exists:", exists)

    cols = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name='reps' ORDER BY ordinal_position"
    )).fetchall()
    print("reps columns:", [c[0] for c in cols])

    ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    print("alembic current version:", ver)
    print()
    if not exists and ver == "c3d4e5f6g7h8":
        print("✅ Migration will run cleanly: CREATE TABLE intake_leads")
    elif exists:
        print("✅ intake_leads already exists — migration will skip creation")
    else:
        print("⚠️  Unexpected state — check manually")

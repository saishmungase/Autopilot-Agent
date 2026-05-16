import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    # All tables
    tables = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' ORDER BY table_name"
    )).fetchall()
    print("=== ALL TABLES ===")
    for t in tables:
        print(" ", t[0])

    # Columns for every table
    for (tname,) in tables:
        cols = conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t ORDER BY ordinal_position"
        ), {"t": tname}).fetchall()
        print(f"\n--- {tname} ---")
        for c in cols:
            print(f"  {c[0]:30s} {c[1]}")

    # Alembic version
    print("\n=== ALEMBIC VERSION ===")
    try:
        ver = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
        for v in ver:
            print(" ", v[0])
    except Exception as e:
        print("  No alembic_version table:", e)

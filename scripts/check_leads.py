import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    print("=== REPS ===")
    reps = conn.execute(text("SELECT id, name, team, username FROM reps ORDER BY id")).fetchall()
    for r in reps:
        print(f"  id={r[0]}  name={r[1]}  team={r[2]}  username={r[3]}")

    print("\n=== INTAKE_LEADS ===")
    leads = conn.execute(text(
        "SELECT lead_id, policy_type, status, assigned_rep_id, lead_score FROM intake_leads ORDER BY status"
    )).fetchall()
    for l in leads:
        print(f"  {str(l[0])[:8]}...  policy={l[1]}  status={l[2]}  rep_id={l[3]}  score={l[4]}")

    print(f"\nTotal leads: {len(leads)}")
    print(f"Assigned: {sum(1 for l in leads if l[2]=='assigned')}")
    print(f"Closed:   {sum(1 for l in leads if l[2]=='closed')}")
    print(f"New:      {sum(1 for l in leads if l[2]=='new')}")

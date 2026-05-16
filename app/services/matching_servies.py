from sqlalchemy.orm import Session
from app.models.sales_agent import SalesAgent

def find_best_agent(db: Session, client_domains: list[str]):
    """
    Finds the best sales agent based on matching domains.
    If no overlap, assigns to the agent with the fewest active clients.
    """
    agents = db.query(SalesAgent).all()
    if not agents:
        return None
    
    best_agent = None
    max_overlap = -1

    for agent in agents:
        # Calculate intersection of domains
        overlap = len(set(client_domains).intersection(set(agent.domains)))
        if overlap > max_overlap:
            max_overlap = overlap
            best_agent = agent
            
    # Fallback to the first agent if no overlap found
    return best_agent.id if best_agent else agents[0].id
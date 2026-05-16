# Backend API Integration for Command Center Dashboard

## Overview
This document describes the backend API endpoints created to support the Command Center dashboard, routing all frontend calls to the existing backend infrastructure.

---

## New Backend Routers Created

### 1. **Leads Router** (`app/routers/leads.py`)

#### `GET /api/leads`
Returns all leads sorted by newest first for the Live Lead Feed.

**Response:**
```json
[
  {
    "lead_id": "uuid-string",
    "policy_type": "life|health|car|home|unknown",
    "contact": { "name": "...", "email": "...", "phone": "..." },
    "lead_score": 0.85,
    "status": "new|assigned|in_progress|closed|unqualified",
    "assigned_rep_id": 1,
    "created_at": "2024-01-01T12:00:00",
    "source": "form",
    "workbench_required": false,
    "hubspot_deal_id": null
  }
]
```

#### `GET /api/leads/{lead_id}`
Returns a specific lead by UUID.

---

### 2. **Analytics Router** (`app/routers/analytics.py`)

#### `GET /api/analytics/summary`
Returns comprehensive KPI metrics for the dashboard.

**Response:**
```json
{
  "total_leads_today": 42,
  "qualified_count": 28,
  "unqualified_count": 5,
  "workbench_count": 3,
  "policy_violations": 0,
  "leads_by_status": {
    "new": 10,
    "assigned": 15,
    "in_progress": 8,
    "closed": 5,
    "unqualified": 4
  },
  "leads_by_policy": {
    "life": 12,
    "health": 15,
    "car": 8,
    "home": 7
  },
  "leads_by_hour": [
    { "hour": 0, "count": 0 },
    { "hour": 1, "count": 2 },
    ...
  ],
  "policy_bypasses": []
}
```

#### `GET /api/analytics/reps-summary`
Returns rep workload summary (alternative to `/api/reps` endpoint).

---

### 3. **Workbench Router** (`app/routers/workbench.py`)

#### `GET /api/workbench/pending`
Returns leads requiring human review.

**Response:**
```json
[
  {
    "lead_id": "uuid-string",
    "lead_name": "John Doe",
    "policy_type": "life",
    "reason": "No available rep - awaiting manual assignment",
    "created_at": "2024-01-01T12:00:00"
  }
]
```

#### `POST /api/workbench/force/{lead_id}`
Forces a lead into workbench review (resets status to 'new', removes assignment).

**Response:**
```json
{
  "message": "Lead forced to workbench review",
  "lead_id": "uuid-string",
  "status": "new"
}
```

#### `POST /api/workbench/{lead_id}/approve`
Approves a workbench item and routes it to an available rep.

**Response:**
```json
{
  "message": "Workbench item approved and routed",
  "lead_id": "uuid-string",
  "status": "assigned",
  "assigned_rep_id": 1
}
```

#### `POST /api/workbench/{lead_id}/reject`
Rejects a workbench item with a reason.

**Request Body:**
```json
{
  "reason": "Does not meet qualification criteria"
}
```

**Response:**
```json
{
  "message": "Workbench item rejected",
  "lead_id": "uuid-string",
  "status": "unqualified",
  "reason": "Does not meet qualification criteria"
}
```

#### `POST /api/workbench/leads/{lead_id}/reassign`
Manually reassigns a lead to a different rep.

**Request Body:**
```json
{
  "new_rep_id": 2
}
```

---

### 4. **Updated Reps Router** (`app/routers/reps.py`)

#### `GET /api/reps` (NEW)
Returns all reps with their current workload for the Command Center.

**Response:**
```json
[
  {
    "rep_id": 1,
    "name": "Alice Johnson",
    "policy_type": "life",
    "current_load": 7,
    "max_load": 10,
    "is_available": true
  }
]
```

#### `GET /api/reps/fetch` (EXISTING)
Returns assigned and completed leads for a specific rep (unchanged).

---

## Updated Main Application (`app/main.py`)

Added router registrations:
```python
from app.routers.leads import router as leads_router
from app.routers.analytics import router as analytics_router
from app.routers.workbench import router as workbench_router

app.include_router(leads_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(workbench_router, prefix="/api")
```

---

## Frontend Updates (`frontend/src/app/command-center/page.tsx`)

### API Endpoint Changes

| Old Endpoint | New Endpoint | Status |
|-------------|--------------|--------|
| `GET /api/leads` | `GET /api/leads` | ✅ Created |
| `GET /api/reps` | `GET /api/reps` | ✅ Updated |
| `GET /api/analytics/summary` | `GET /api/analytics/summary` | ✅ Created |
| `GET /api/workbench/pending` | `GET /api/workbench/pending` | ✅ Created |
| `GET /api/audit-log` | `GET /api/admin/audit` | ✅ Updated |
| `POST /api/workbench/force/{lead_id}` | `POST /api/workbench/force/{lead_id}` | ✅ Created |
| `POST /api/workbench/{lead_id}/approve` | `POST /api/workbench/{lead_id}/approve` | ✅ Created |
| `POST /api/workbench/{lead_id}/reject` | `POST /api/workbench/{lead_id}/reject` | ✅ Created |

### Interface Updates

Updated `AuditEntry` interface to match backend audit log structure:
```typescript
interface AuditEntry {
  id: number
  timestamp: string
  actor_email?: string
  action: string
  description?: string
  category?: string
  resource_type?: string
  resource_id?: string
  notes?: string
}
```

### Functional Updates

1. **Audit Log Fetching**: Updated to use `/api/admin/audit` with pagination
2. **Workbench Actions**: Added onClick handlers for Approve/Reject buttons
3. **Lead Detail Modal**: Updated audit trail fetching with resource_id filter
4. **Audit Trail Table**: Updated to display correct field names from backend

---

## Testing Checklist

### Backend Endpoints
- [ ] `GET /api/leads` - Returns all leads
- [ ] `GET /api/reps` - Returns reps with workload
- [ ] `GET /api/analytics/summary` - Returns KPI metrics
- [ ] `GET /api/workbench/pending` - Returns pending items
- [ ] `POST /api/workbench/{lead_id}/approve` - Approves and routes lead
- [ ] `POST /api/workbench/{lead_id}/reject` - Rejects lead with reason
- [ ] `POST /api/workbench/force/{lead_id}` - Forces lead to workbench
- [ ] `GET /api/admin/audit` - Returns audit logs with pagination

### Frontend Integration
- [ ] Live Lead Feed displays leads from `/api/leads`
- [ ] KPI cards show metrics from `/api/analytics/summary`
- [ ] Rep Availability panel shows data from `/api/reps`
- [ ] Workbench panel shows pending items
- [ ] Approve button routes leads successfully
- [ ] Reject button marks leads as unqualified
- [ ] Audit trail displays correctly
- [ ] Lead detail modal shows audit history

---

## Database Schema Notes

### Current Lead Model (`app/models/lead.py`)
```python
class Lead(Base):
    __tablename__ = "intake_leads"
    
    lead_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_type = Column(String, nullable=False, index=True)
    contact = Column(JSON, nullable=False)
    lead_score = Column(Float, default=0.0)
    assigned_rep_id = Column(Integer, ForeignKey("reps.id"), nullable=True)
    status = Column(String, default="new")
    transcript = Column(Text, nullable=True)
```

### Potential Enhancements
1. Add `created_at` timestamp field to Lead model
2. Add `workbench_required` boolean field
3. Add `hubspot_deal_id` field for CRM integration
4. Add `source` field to track lead origin (form/chatbot/audio)
5. Add `rejection_reason` field instead of using transcript

---

## API Documentation

Full API documentation available at:
- **Swagger UI**: `http://localhost:8001/api/docs`
- **ReDoc**: `http://localhost:8001/api/redoc`

---

## Build Status

✅ **Backend**: All Python files compile successfully
✅ **Frontend**: Next.js build successful with no TypeScript errors

---

## Next Steps

1. **Test all endpoints** with real data
2. **Add authentication** to Command Center endpoints if needed
3. **Enhance Lead model** with additional fields (created_at, source, etc.)
4. **Implement real-time updates** using WebSockets or Server-Sent Events
5. **Add Recharts integration** for pipeline visualizations
6. **Create database migration** for new Lead model fields
7. **Add error handling** and loading states in frontend
8. **Implement toast notifications** for user actions

---

## Summary

All Command Center API endpoints have been successfully created and integrated with the existing backend. The frontend now communicates with the backend APIs instead of using mock data. The system is ready for testing and further enhancements.

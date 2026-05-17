'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const SUPERVITY_API = process.env.NEXT_PUBLIC_SUPERVITY_API_URL || 'https://auto-workflow-api.supervity.ai'
const SUPERVITY_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJCOVg3RVFFWE8td25ucjBJd3Vjbm5vQWlVcWdDM1JpNzh2aGMxMG9xTmJnIn0.eyJleHAiOjE3ODY3MTI5MTMsImlhdCI6MTc3ODkzOTIwNywianRpIjoiMjgzZTY4MWEtNWQ4NS00ZWU0LTk1OTItOWNlNzEyODAxM2ZlIiwiaXNzIjoiaHR0cHM6Ly9hdXRvLXNzby5zdXBlcnZpdHkuYWkvYXV0aC9yZWFsbXMvdGVjaGZvcmNlIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6IjA4ZTQzNzI4LTU4NDYtNDA3Ni04YmJiLTM3MTRjOWI1Mjc0NyIsInR5cCI6IkJlYXJlciIsImF6cCI6ImJvdC1tYWtlciIsInNpZCI6IjMwMjM4OTJiLTUwMmMtNGJjZS04NmQ3LWIxZTliNTc2N2ViOCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwczovL2F1dG8uc3VwZXJ2aXR5LmFpIiwiKiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy10ZWNoZm9yY2UiLCJvZmZsaW5lX2FjY2VzcyIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6IlNhaXNoIE11bmdhc2UiLCJncm91cHMiOlsiL0dpdFB1c2gvR2l0UHVzaC9Sb2xlcy9BZG1pbnMiLCIvU2Fpc2ggTXVuZ2FzZSBXb3Jrc3BhY2UvUm9sZXMvQWRtaW5zIiwiL1NhaXNoIE11bmdhc2UgV29ya3NwYWNlL0hhY2thdGhvbi9Sb2xlcy9BZG1pbnMiLCIvR2l0UHVzaC9Sb2xlcy9BZG1pbnMiLCIvR2l0UHVzaCIsIi9TYWlzaCBNdW5nYXNlIFdvcmtzcGFjZSJdLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJzYWlzaG11bmdhc2VAZ21haWwuY29tIiwiZ2l2ZW5fbmFtZSI6IlNhaXNoIiwiZmFtaWx5X25hbWUiOiJNdW5nYXNlIiwiZW1haWwiOiJzYWlzaG11bmdhc2VAZ21haWwuY29tIn0.EvC0p4HaLqDDRHTDT2drl_2Gbp1_4HBUddy_Nn6uOxYIrKtIqHMhIDmNgUD8wzZDw71JoWu7WwGzNhGpz_c-CIHJkHQ-E3oVjZoHmAMWvx6WqEYVEqbkZ3vsw0E10tLX-SIB-qZ-Gr-8SYYK_cxKwotf3MXL97DF97bzj5568bis1b-CRPxvxPB8Bm5o6VQeisUmArT80qA1ML2bjqq2LB_zcgOdEP8TFiIwllPavOsH51DldOzzCc_FdnPS15U4GvCsOU0uhv3Cnc85mT6fhwy7m8VxUukH0h49C6cS-ro4I6EgGLcpR8JoCJSYS8fuUqs2qJHYX08iSRqG-gvfmg'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  lead_id: string
  policy_type: string
  contact: { name: string; email: string; phone: string } | string
  lead_score: number
  status: string
  source?: string
  created_at: string
  assigned_rep_id?: number
  hubspot_deal_id?: string
  workbench_required?: boolean
}

interface Rep {
  rep_id: number
  name: string
  policy_type: string
  current_load: number
  max_load: number
  is_available: boolean
}

interface AnalyticsSummary {
  total_leads_today: number
  qualified_count: number
  unqualified_count: number
  workbench_count: number
  policy_violations: number
  leads_by_status: Record<string, number>
  leads_by_policy: Record<string, number>
  leads_by_hour: Array<{ hour: number; count: number }>
  policy_bypasses?: Array<{ hubspot_deal_id: string; rep_name: string }>
}

interface WorkbenchItem {
  lead_id: string
  lead_name: string
  policy_type: string
  reason: string
  created_at: string
}

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

// ─── Supervity Human-in-Command Types ─────────────────────────────────────────
interface ReviewForm {
  id: string
  formId?: string          // alias — we normalise to id
  workflowRunId: string
  runId?: string           // alias
  workflowId?: string
  workflowName?: string
  workflowStepName?: string
  workflowStepDescription?: string
  status: 'pending' | 'submitted' | 'expired' | string
  createdAt: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  message?: string
}

interface FormField {
  name: string
  type: 'enum' | 'text' | 'boolean' | 'number'
  label?: string
  options?: string[]
  required?: boolean
}

interface FormDetail extends ReviewForm {
  html?: string
  schema?: { fields: FormField[] }
}

// ─── Supervity API helpers (direct — token is not secret in this context) ─────
async function supervityGet(path: string) {
  const res = await fetch(`${SUPERVITY_API}${path}`, {
    headers: { Authorization: `Bearer ${SUPERVITY_TOKEN}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function supervityPost(path: string, body: unknown) {
  const res = await fetch(`${SUPERVITY_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPERVITY_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getContact(lead: Lead) {
  if (typeof lead.contact === 'string') {
    try { return JSON.parse(lead.contact) } catch { return { name: '—', email: '', phone: '' } }
  }
  return lead.contact
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const past = new Date(dateString)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

function policyColor(_type: string): string {
  return 'bg-[#F0F2FF] text-[#3D4B8F] border-[#E2E6F8]'
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    new:           'bg-[#E8ECF8] text-[#3D4B8F] border-[#E2E6F8]',
    assigned:      'bg-[#E8ECF8] text-[#3D4B8F] border-[#E2E6F8]',
    in_progress:   'bg-[#F0F2FF] text-[#8B9FE8] border-[#E2E6F8]',
    proposal_sent: 'bg-[#F0F2FF] text-[#8B9FE8] border-[#E2E6F8]',
    unqualified:   'bg-[#F0F2FF] text-[#8B9FE8] border-[#E2E6F8]',
    incomplete:    'bg-[#F8F9FF] text-[#8B9FE8] border-[#E2E6F8]',
  }
  return map[status] || 'bg-[#F0F2FF] text-[#8B9FE8] border-[#E2E6F8]'
}

function sourceIcon(source?: string): string {
  if (source === 'form') return '📋'
  if (source === 'audio') return '🎙️'
  if (source === 'chatbot') return '💬'
  return '📄'
}

// ─── Counter Animation ────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) return

    const incrementTime = duration / end
    const timer = setInterval(() => {
      start += 1
      setCount(start)
      if (start === end) clearInterval(timer)
    }, incrementTime)

    return () => clearInterval(timer)
  }, [value, duration])

  return <span>{count}</span>
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ 
  label, 
  value, 
  trend, 
  borderColor, 
  pulse 
}: { 
  label: string
  value: number
  trend?: 'up' | 'down'
  borderColor: string
  pulse?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 border border-[#E2E6F8] bg-white shadow-sm border-l-4 ${borderColor} ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-[#3D4B8F]">
            <AnimatedNumber value={value} />
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-[#8B9FE8]">{label}</p>
        </div>
        {trend && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0F2FF]">
            <svg
              className={`h-4 w-4 text-[#3D4B8F] ${trend === 'down' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ label, status, color }: { label: string; status: string; color: string }) {
  return (
    <div className="rounded-full px-4 py-2 flex items-center gap-2 border border-[#E2E6F8] bg-white">
      <span className="h-2 w-2 rounded-full bg-[#3D4B8F] animate-pulse" />
      <span className="text-xs font-medium text-[#3D4B8F]">{label}</span>
      <span className="text-xs font-semibold text-[#8B9FE8]">{status}</span>
    </div>
  )
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="text-center">
      <p className="text-sm font-medium text-gray-600">
        {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <p className="text-2xl font-bold text-[#3D4B8F]">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </div>
  )
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────
function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const contact = getContact(lead)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 cursor-pointer bg-white hover:bg-[#F0F2FF] transition-all border border-[#E2E6F8] hover:border-[#8B9FE8] hover:shadow-sm"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{sourceIcon(lead.source)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-[#3D4B8F] truncate">{contact.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${policyColor(lead.policy_type)}`}>
              {lead.policy_type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8B9FE8]">
            <span className="font-semibold text-[#3D4B8F]">
              {Math.round(lead.lead_score * 100)}%
            </span>
            <span className={`px-2 py-0.5 rounded-full border ${statusColor(lead.status)}`}>
              {lead.status.replace('_', ' ')}
            </span>
            <span>{timeAgo(lead.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────
function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const contact = getContact(lead)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/audit?page=1&page_size=20&resource_id=${lead.lead_id}`)
        if (res.ok) {
          const data = await res.json()
          setAuditEntries(data.logs || [])
        }
      } catch {
        // Silently fail - audit logs are optional
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [lead.lead_id])

  const handleForceWorkbench = async () => {
    try {
      await fetch(`${API_URL}/api/workbench/force/${lead.lead_id}`, { method: 'POST' })
      alert('Lead forced to workbench review')
      onClose()
    } catch (error) {
      alert('Failed to force workbench review')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-[#E2E6F8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 p-6 border-b border-[#E2E6F8] bg-[#3D4B8F]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Lead Details</h2>
              <p className="text-sm text-white/80 mt-1">ID: {lead.lead_id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="rounded-2xl p-6 bg-[#F8F9FF] border border-[#E2E6F8]">
            <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Name</p>
                <p className="text-[#3D4B8F] font-medium">{contact.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-[#3D4B8F] font-medium">{contact.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-[#3D4B8F] font-medium">{contact.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Policy Type</p>
                <span className={`inline-block px-3 py-1 rounded-full border text-sm ${policyColor(lead.policy_type)}`}>
                  {lead.policy_type}
                </span>
              </div>
            </div>
          </div>

          {/* Lead Score */}
          <div className="rounded-2xl p-6 bg-[#F8F9FF] border border-[#E2E6F8]">
            <h3 className="text-lg font-semibold text-[#3D4B8F] mb-4">Lead Score</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg className="transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${lead.lead_score * 251.2} 251.2`}
                    className={lead.lead_score > 0.6 ? 'text-emerald-400' : 'text-rose-400'}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">
                    {Math.round(lead.lead_score * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {lead.lead_score > 0.6 ? 'High quality lead' : 'Needs nurturing'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {timeAgo(lead.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-2xl p-6 bg-[#F8F9FF] border border-[#E2E6F8]">
            <h3 className="text-lg font-semibold text-[#3D4B8F] mb-4">Status</h3>
            <span className={`inline-block px-4 py-2 rounded-full border ${statusColor(lead.status)}`}>
              {lead.status.replace('_', ' ')}
            </span>
          </div>

          {/* Audit Trail */}
          <div className="rounded-2xl p-6 bg-[#F8F9FF] border border-[#E2E6F8]">
            <h3 className="text-lg font-semibold text-[#3D4B8F] mb-4">Audit Trail</h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : auditEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries</p>
            ) : (
              <div className="space-y-2">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="text-sm border-l-2 border-emerald-500/20 pl-3 py-1">
                    <p className="text-foreground">
                      <span className="font-medium">{entry.actor_email || 'System'}</span> - {entry.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                    {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleForceWorkbench}
              className="flex-1 px-6 py-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all font-medium"
            >
              Force Workbench Review
            </button>
            {lead.hubspot_deal_id && (
              <a
                href={`https://app.hubspot.com/contacts/deal/${lead.hubspot_deal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all font-medium text-center"
              >
                View in HubSpot
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Review Modal (Supervity Human-in-Command) ────────────────────────────────
function ReviewModal({ form, onClose, onSubmitted }: {
  form: FormDetail; onClose: () => void; onSubmitted: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const fields: FormField[] = form.schema?.fields || [
    { name: 'decision', type: 'enum', label: 'Decision', options: ['approve', 'reject'], required: true },
    { name: 'comments', type: 'text', label: 'Comments', required: false },
  ]

  const handleSubmit = async () => {
    const fid = form.id || form.formId || ''
    setSubmitting(true); setError(null)
    try {
      await supervityPost(`/api/v1/user-forms/${fid}/submit`, values)
      setDone(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1400)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const canSubmit = fields.filter(f => f.required).every(f => values[f.name])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#1E2A3B] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="font-bold text-white">Human Review Required</h2>
            </div>
            <p className="text-xs text-white/50 mt-0.5 font-mono truncate max-w-xs">
              {form.workflowName || form.workflowStepName || `run: ${form.workflowRunId || form.runId || form.id}`}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {form.message && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <svg className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-200">{form.message}</p>
            </div>
          )}

          {done ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-white">Decision submitted</p>
              <p className="text-sm text-white/50">Agent execution is resuming…</p>
            </div>
          ) : (
            <>
              {fields.map(field => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium text-white/80 capitalize">
                    {field.label || field.name}
                    {field.required && <span className="text-rose-400 ml-1">*</span>}
                  </label>
                  {field.type === 'enum' && field.options ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setValues(v => ({ ...v, [field.name]: opt }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            values[field.name] === opt
                              ? opt === 'approve' || opt === 'yes'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : opt === 'reject' || opt === 'no'
                                ? 'bg-rose-500 text-white border-rose-500'
                                : 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {opt === 'approve' && '✓ '}{opt === 'reject' && '✗ '}
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      ))}
                    </div>
                  ) : field.type === 'boolean' ? (
                    <div className="flex gap-2">
                      {['true', 'false'].map(opt => (
                        <button key={opt}
                          onClick={() => setValues(v => ({ ...v, [field.name]: opt }))}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            values[field.name] === opt
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white/5 text-white/70 border-white/10 hover:border-white/30'
                          }`}
                        >{opt === 'true' ? 'Yes' : 'No'}</button>
                      ))}
                    </div>
                  ) : (
                    <textarea rows={3} value={values[field.name] || ''}
                      onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                      placeholder={`Enter ${field.label || field.name}…`}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/30 resize-none"
                    />
                  )}
                </div>
              ))}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button onClick={onClose} disabled={submitting}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-sm transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || !canSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              {submitting ? (
                <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting…</>
              ) : (
                <><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Submit Decision</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Workbench Panel (Supervity Human-in-Command) ─────────────────────────────
function WorkbenchPanel() {
  const [forms, setForms] = useState<ReviewForm[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedForm, setSelectedForm] = useState<FormDetail | null>(null)
  const [loadingFormId, setLoadingFormId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchForms = useCallback(async () => {
    try {
      const data = await supervityGet('/api/v1/user-forms?page=1&limit=50')
      // API returns { forms: [...], pagination: {...} }
      const raw: ReviewForm[] = data.forms || data.items || []
      setForms(raw)
      setLastRefresh(new Date())
    } catch {
      // silently fail — show stale data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
    intervalRef.current = setInterval(fetchForms, 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchForms])

  const handleOpenForm = async (form: ReviewForm) => {
    const fid = form.id || form.formId || ''
    setLoadingFormId(fid)
    try {
      const detail = await supervityGet(`/api/v1/user-forms/${fid}`)
      setSelectedForm({ ...form, ...detail })
    } catch {
      // Fall back to default approve/reject form
      setSelectedForm({
        ...form,
        schema: {
          fields: [
            { name: 'decision', type: 'enum', label: 'Decision', options: ['approve', 'reject'], required: true },
            { name: 'comments', type: 'text', label: 'Comments', required: false },
          ],
        },
      })
    } finally { setLoadingFormId(null) }
  }

  const pending = forms.filter(f => f.status === 'pending')
  const completed = forms.filter(f => f.status !== 'pending')

  return (
    <>
      <div className="glass-strong rounded-2xl p-6 mb-8 border-2 border-amber-500/30 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AI Workbench — Human-in-Command</h2>
              <p className="text-xs text-muted-foreground">Supervity agent executions awaiting your decision</p>
            </div>
            {pending.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white animate-bounce">
                {pending.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live · {timeAgo(lastRefresh.toISOString())}
            </div>
            <button onClick={fetchForms}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white transition-all">
              <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Pending', value: pending.length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Completed', value: completed.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Total', value: forms.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pending queue */}
        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="h-6 w-6 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : pending.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-400">All clear — agents running autonomously, no pending reviews</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pending.map(form => (
                <motion.div key={form.formId}
                  layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-4 glass rounded-xl px-4 py-3 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                >
                  <div className="relative shrink-0">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-amber-400 animate-ping opacity-60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {form.workflowStepDescription || form.workflowStepName || form.message || 'Approval required before proceeding'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="truncate max-w-[180px]">{form.workflowName || 'Workflow'}</span>
                      <span>·</span>
                      <span>{timeAgo(form.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenForm(form)}
                    disabled={loadingFormId === (form.id || form.formId)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold transition-all"
                  >
                    {loadingFormId === form.formId ? (
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    )}
                    Review
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Completed history */}
        {completed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Recent Decisions</p>
            <div className="space-y-1.5">
              {completed.slice(0, 5).map(form => (
                <div key={form.id || form.formId} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/3 border border-white/5">
                  <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-mono text-xs text-muted-foreground truncate flex-1">{form.formId}</span>
                  <span className="text-xs text-emerald-400 shrink-0">{form.status}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(form.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedForm && (
          <ReviewModal
            form={selectedForm}
            onClose={() => setSelectedForm(null)}
            onSubmitted={fetchForms}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── AI Manager Panel ────────────────────────────────────────────────────────
interface AiMessage { role: 'user' | 'assistant'; content: string; tools?: string[]; ragChunks?: number }
const QUICK_ACTIONS = [
  { label: 'Show insights',      msg: 'Show insights' },
  { label: 'Recent activity',    msg: 'Show recent activity' },
  { label: 'Generate report',    msg: 'Generate a report' },
  { label: 'Campaign summary',   msg: 'How are my campaigns doing?' },
]

function AiManagerPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: 'assistant', content: '👋 Hi, I\'m your **AI Manager**. I have live access to your leads, audit logs, workflows, and analytics.\n\nTry a quick action below or ask me anything about your sales data.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    const next: AiMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/ai-manager/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply || '(no response)', tools: data.tool_calls_made, ragChunks: data.rag_chunks_used }])
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: '⚠️ Could not reach the AI Manager. Check backend connection.' }])
    } finally { setLoading(false); setTimeout(() => inputRef.current?.focus(), 100) }
  }

  // Minimal markdown: bold, bullet, table header
  const renderMd = (text: string) => (
    <span dangerouslySetInnerHTML={{ __html:
      text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code class="bg-[#E8ECF8] px-1 rounded text-[#3D4B8F] text-xs">$1</code>')
        .replace(/^(#+) (.+)$/gm, '<span class="font-bold text-[#3D4B8F]">$2</span>')
        .replace(/^[-*] (.+)$/gm, '• $1')
        .replace(/\n/g, '<br/>')
    }} />
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,20,40,0.45)' }} onClick={onClose}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex h-full w-full max-w-md flex-col shadow-2xl" style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6F8] px-5 py-4"
          style={{ background: 'linear-gradient(135deg,#3D4B8F,#5A6BC4)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">AI Manager</p>
              <p className="text-xs" style={{ color: '#C5CCEF' }}>Live data · Groq LLaMA 3.3</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-white/60 hover:bg-white/20 hover:text-white transition-colors">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#F8F9FF' }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#3D4B8F] text-white rounded-br-sm'
                  : 'bg-white border border-[#E2E6F8] text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {m.role === 'assistant' ? renderMd(m.content) : m.content}
                {m.role === 'assistant' && (m.ragChunks ?? 0) > 0 && (
                  <div className="mt-1.5">
                    <span className="rounded-full bg-[#F0F2FF] border border-[#E2E6F8] px-2 py-0.5 text-xs text-[#8B9FE8]">📚 {m.ragChunks} knowledge base {m.ragChunks === 1 ? 'doc' : 'docs'} used</span>
                  </div>
                )}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.tools.map((t, ti) => (
                      <span key={`${ti}-${t}`} className="rounded-full bg-[#E8ECF8] px-2 py-0.5 text-xs text-[#8B9FE8]">⚡ {t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-[#E2E6F8] px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-[#8B9FE8] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick actions */}
        <div className="border-t border-[#E2E6F8] px-4 py-2 flex gap-2 overflow-x-auto" style={{ background: '#fff' }}>
          {QUICK_ACTIONS.map(q => (
            <button key={q.label} onClick={() => send(q.msg)}
              className="shrink-0 rounded-full border border-[#E2E6F8] bg-[#F0F2FF] px-3 py-1 text-xs font-medium text-[#3D4B8F] hover:bg-[#E8ECF8] transition-colors">
              {q.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-[#E2E6F8] p-4" style={{ background: '#fff' }}>
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E6F8] bg-[#F8F9FF] px-4 py-2 focus-within:border-[#8B9FE8] focus-within:ring-2 focus-within:ring-[#8B9FE8]/20 transition-all">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about leads, reports, activity…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-[#8B9FE8] outline-none"
              disabled={loading}
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3D4B8F] text-white disabled:opacity-40 hover:bg-[#5A6BC4] transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-center text-xs" style={{ color: '#8B9FE8' }}>AI Manager · powered by live platform data</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CommandCenter() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [reps, setReps] = useState<Rep[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Fetch functions
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    }
  }, [])

  const fetchReps = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/reps`)
      if (res.ok) {
        const data = await res.json()
        setReps(data)
      }
    } catch (error) {
      console.error('Failed to fetch reps:', error)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/summary`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }, [])

  const fetchAuditLog = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/audit?page=1&page_size=50`)
      if (res.ok) {
        const data = await res.json()
        setAuditLog(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLeads()
    fetchReps()
    fetchAnalytics()
    fetchAuditLog()
  }, [fetchLeads, fetchReps, fetchAnalytics, fetchAuditLog])

  // Auto-refresh intervals
  useEffect(() => {
    const leadsInterval = setInterval(() => {
      fetchLeads()
      setLastRefresh(new Date())
    }, 30000)

    const analyticsInterval = setInterval(() => {
      fetchAnalytics()
    }, 60000)

    return () => {
      clearInterval(leadsInterval)
      clearInterval(analyticsInterval)
    }
  }, [fetchLeads, fetchAnalytics])

  // Calculate KPIs
  const qualifiedCount = leads.filter(l => ['assigned', 'proposal_sent'].includes(l.status)).length
  const unqualifiedCount = leads.filter(l => l.status === 'unqualified').length
  const workbenchCount = leads.filter(l => l.workbench_required).length
  const policyViolations = analytics?.policy_violations || 0

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E2E6F8] bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex items-center justify-between mb-4">
            {/* Left: Navigation */}
            <div className="flex items-center gap-4">
              <Link 
                href="/command-center"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
              >
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-semibold text-white">Dashboard</span>
              </Link>
              <Link 
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
              >
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm font-semibold text-white">Website</span>
              </Link>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-[#3D4B8F]">InsureFlow Command Center</h1>
                <p className="text-xs text-[#8B9FE8]">Real-time Sales Intelligence</p>
              </div>
            </div>

            {/* Live Clock */}
            <LiveClock />

            {/* Status Pills */}
            <div className="flex items-center gap-3">
              <StatusPill label="Supabase" status="Live" color="border-emerald-500/30" />
              <StatusPill label="HubSpot" status="Connected" color="border-blue-500/30" />
              <StatusPill label="Slack" status="Active" color="border-purple-500/30" />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4">
            <KPICard label="Total Leads Today" value={analytics?.total_leads_today || leads.length} trend="up" borderColor="border-[#3D4B8F]" />
            <KPICard label="Qualified"          value={qualifiedCount}    trend="up" borderColor="border-[#8B9FE8]" />
            <KPICard label="Unqualified"        value={unqualifiedCount}             borderColor="border-[#8B9FE8]" />
            <KPICard label="Routed to Workbench" value={workbenchCount}              borderColor="border-[#3D4B8F]" />
            <KPICard label="Policy Violations"  value={policyViolations}            borderColor="border-[#3D4B8F]" pulse={policyViolations > 0} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-6 py-8">
        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-6 mb-8">
          {/* Left: Live Lead Feed */}
          <div className="col-span-4">
            <div className="rounded-2xl p-6 h-[600px] flex flex-col bg-white border border-[#E2E6F8] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-[#3D4B8F]">Live Lead Feed</h2>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                {leads.length === 0 ? (
                  <p className="text-sm text-[#8B9FE8] text-center py-8">
                    No leads yet today — waiting for intake
                  </p>
                ) : (
                  leads.map((lead) => (
                    <LeadRow key={lead.lead_id} lead={lead} onClick={() => setSelectedLead(lead)} />
                  ))
                )}
              </div>
              <p className="text-xs text-[#8B9FE8] mt-4">
                Last updated {timeAgo(lastRefresh.toISOString())}
              </p>
            </div>
          </div>

          {/* Center: Pipeline Overview */}
          <div className="col-span-5">
            <div className="rounded-2xl p-6 bg-white border border-[#E2E6F8] shadow-sm">
              <h2 className="text-lg font-semibold text-[#3D4B8F] mb-6">Pipeline Overview</h2>
              <div className="space-y-6">

                {/* Leads by Hour — Bar Chart */}
                <div>
                  <p className="text-xs font-medium text-[#8B9FE8] uppercase tracking-wider mb-3">Leads by Hour (Today)</p>
                  <div className="h-44">
                    {analytics ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.leads_by_hour} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                          <XAxis
                            dataKey="hour"
                            tick={{ fontSize: 10, fill: '#8B9FE8' }}
                            tickFormatter={(h) => `${h}h`}
                            interval={3}
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#8B9FE8' }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: '#fff', border: '1px solid #E2E6F8', borderRadius: 8, fontSize: 12 }}
                            formatter={(v) => [v, 'Leads']}
                            labelFormatter={(h) => `Hour ${h}:00`}
                          />
                          <Bar dataKey="count" fill="#3D4B8F" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3D4B8F] border-t-transparent" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Policy Split — Donut */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#8B9FE8] uppercase tracking-wider mb-3">By Policy Type</p>
                    <div className="h-40">
                      {analytics && Object.keys(analytics.leads_by_policy).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(analytics.leads_by_policy).map(([name, value]) => ({ name, value }))}
                              cx="50%" cy="50%"
                              innerRadius={38} outerRadius={60}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {Object.keys(analytics.leads_by_policy).map((_, i) => (
                                <Cell key={i} fill={['#3D4B8F', '#6B7FD4', '#8B9FE8', '#B8C4F5', '#E2E6F8'][i % 5]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E6F8', borderRadius: 8, fontSize: 12 }} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8B9FE8' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-[#8B9FE8]">No data yet</div>
                      )}
                    </div>
                  </div>

                  {/* Status Funnel — horizontal bars */}
                  <div>
                    <p className="text-xs font-medium text-[#8B9FE8] uppercase tracking-wider mb-3">By Status</p>
                    <div className="h-40 flex flex-col justify-center gap-2">
                      {analytics && Object.keys(analytics.leads_by_status).length > 0 ? (
                        Object.entries(analytics.leads_by_status).map(([status, count]) => {
                          const total = Object.values(analytics.leads_by_status).reduce((a, b) => a + b, 0)
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0
                          const colourMap: Record<string, string> = {
                            new: '#8B9FE8', assigned: '#3D4B8F', in_progress: '#6B7FD4',
                            closed: '#2D3A6F', unqualified: '#B8C4F5', blocked: '#E2E6F8',
                          }
                          return (
                            <div key={status}>
                              <div className="flex justify-between text-xs text-[#8B9FE8] mb-1">
                                <span className="capitalize">{status.replace('_', ' ')}</span>
                                <span>{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-[#E2E6F8] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: colourMap[status] ?? '#3D4B8F' }}
                                />
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-xs text-[#8B9FE8] text-center">No data yet</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right: Rep Workload */}
          <div className="col-span-3">
            <div className="rounded-2xl p-6 bg-white border border-[#E2E6F8] shadow-sm">
              <h2 className="text-lg font-semibold text-[#3D4B8F] mb-4">Rep Availability</h2>
              <div className="space-y-3">
                {reps.map((rep) => (
                  <div key={rep.rep_id} className="rounded-xl p-4 bg-[#F8F9FF] border border-[#E2E6F8]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-[#3D4B8F]">{rep.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${policyColor(rep.policy_type)}`}>
                          {rep.policy_type}
                        </span>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${rep.is_available ? 'bg-[#3D4B8F]' : 'bg-[#8B9FE8]'}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-[#8B9FE8]">
                        <span>Load: {rep.current_load}/{rep.max_load}</span>
                        {rep.current_load >= 10 && (
                          <span className="text-[#3D4B8F] font-semibold">Full</span>
                        )}
                      </div>
                      <div className="h-2 bg-[#E2E6F8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3D4B8F] transition-all"
                          style={{ width: `${(rep.current_load / rep.max_load) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Workbench Panel — Supervity Human-in-Command */}
        <WorkbenchPanel />

        {/* Audit Trail */}
        <div className="rounded-2xl p-6 bg-white border border-[#E2E6F8] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-[#3D4B8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <h2 className="text-lg font-semibold text-[#3D4B8F]">Audit Trail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E6F8]">
                  <th className="text-left py-3 px-4 text-[#8B9FE8] font-medium">Timestamp</th>
                  <th className="text-left py-3 px-4 text-[#8B9FE8] font-medium">Resource</th>
                  <th className="text-left py-3 px-4 text-[#8B9FE8] font-medium">Actor</th>
                  <th className="text-left py-3 px-4 text-[#8B9FE8] font-medium">Action</th>
                  <th className="text-left py-3 px-4 text-[#8B9FE8] font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#E2E6F8] hover:bg-[#F8F9FF] transition-colors"
                  >
                    <td className="py-3 px-4 text-[#8B9FE8] text-xs">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#3D4B8F] font-mono text-xs">
                      {entry.resource_type && entry.resource_id
                        ? `${entry.resource_type}:${entry.resource_id.substring(0, 8)}...`
                        : '—'
                      }
                    </td>
                    <td className="py-3 px-4 text-[#3D4B8F] text-sm">{entry.actor_email || 'System'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8ECF8] text-[#3D4B8F]">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8B9FE8] text-xs">{entry.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

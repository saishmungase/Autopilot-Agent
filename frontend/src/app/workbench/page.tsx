'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const BACKEND_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReviewForm {
  id?: string
  formId: string          // normalised from id || formId
  runId: string
  workflowRunId?: string  // alias for runId
  workflowId?: string
  workflowName?: string
  workflowStepName?: string
  workflowStepDescription?: string
  status: 'pending' | 'submitted' | 'expired' | string
  createdAt: string
  message?: string
}

interface FormDetail extends ReviewForm {
  html?: string
  schema?: {
    fields: Array<{
      name: string
      type: 'enum' | 'text' | 'boolean' | 'number'
      label?: string
      options?: string[]
      required?: boolean
    }>
  }
}

// Normalise a raw API item so formId / runId are always populated
function normaliseForm(raw: ReviewForm): ReviewForm {
  return {
    ...raw,
    formId: raw.formId || raw.id || '',
    runId: raw.runId || raw.workflowRunId || '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function statusBadge(status: string) {
  if (status === 'pending' || status === 'waiting')
    return 'bg-[#F0F2FF] text-brand-navy border-[#E2E6F8]'
  if (status === 'submitted' || status === 'completed')
    return 'bg-[#F0F2FF] text-brand-cornflower border-[#E2E6F8]'
  return 'bg-[#F0F2FF] text-brand-muted border-[#E2E6F8]'
}

// ─── Supervity API calls (proxied through our backend to keep token server-side)
async function supervityGet(path: string) {
  const res = await fetch(`${BACKEND_API}/api/supervity${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function supervityPost(path: string, body: unknown) {
  const res = await fetch(`${BACKEND_API}/api/supervity${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ─── Review Form Modal ────────────────────────────────────────────────────────
function ReviewModal({
  form,
  onClose,
  onSubmitted,
}: {
  form: FormDetail
  onClose: () => void
  onSubmitted: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const fields = form.schema?.fields || [
    { name: 'decision', type: 'enum' as const, label: 'Decision', options: ['approve', 'reject'], required: true },
    { name: 'comments', type: 'text' as const, label: 'Comments', required: false },
  ]

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await supervityPost(`/user-forms/${form.formId}/submit`, values)
      setDone(true)
      setTimeout(() => { onSubmitted(); onClose() }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E6F8] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E6F8] bg-[#F0F2FF]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-navy animate-pulse" />
              <h2 className="font-bold text-brand-navy">Human Review Required</h2>
            </div>
            <p className="text-xs text-brand-muted mt-0.5 font-mono truncate max-w-xs">
              {form.workflowName || form.workflowStepName || `run: ${form.runId}`}
            </p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-navy transition-colors">
            <Icons.close className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {form.message && (
            <div className="flex items-start gap-3 rounded-xl bg-[#F0F2FF] border border-[#E2E6F8] px-4 py-3">
              <Icons.alertCircle className="h-4 w-4 text-brand-cornflower shrink-0 mt-0.5" />
              <p className="text-sm text-brand-navy">{form.message}</p>
            </div>
          )}

          {done ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F2FF]">
                <Icons.checkCircle className="h-7 w-7 text-brand-cornflower" />
              </div>
              <p className="font-semibold text-brand-navy">Decision submitted</p>
              <p className="text-sm text-brand-muted">Agent execution is resuming…</p>
            </div>
          ) : (
            <>
              {fields.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-sm font-medium text-brand-navy capitalize">
                    {field.label || field.name}
                    {field.required && <span className="text-brand-cornflower ml-1">*</span>}
                  </label>

                  {field.type === 'enum' && field.options ? (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setValues((v) => ({ ...v, [field.name]: opt }))}
                          className={cn(
                            'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                            values[field.name] === opt
                              ? 'bg-brand-navy text-white border-brand-navy'
                              : 'bg-white text-brand-navy/70 border-[#E2E6F8] hover:border-brand-cornflower'
                          )}
                        >
                          {opt === 'approve' && <span className="mr-1.5">✓</span>}
                          {opt === 'reject' && <span className="mr-1.5">✗</span>}
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      ))}
                    </div>
                  ) : field.type === 'boolean' ? (
                    <div className="flex gap-2">
                      {['true', 'false'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setValues((v) => ({ ...v, [field.name]: opt }))}
                          className={cn(
                            'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                            values[field.name] === opt
                              ? 'bg-brand-navy text-white border-brand-navy'
                              : 'bg-white text-brand-navy/70 border-[#E2E6F8] hover:border-brand-cornflower'
                          )}
                        >
                          {opt === 'true' ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={values[field.name] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                      placeholder={`Enter ${field.label || field.name}…`}
                      className="w-full rounded-lg border border-[#E2E6F8] px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted focus:border-brand-cornflower focus:outline-none focus:ring-2 focus:ring-brand-cornflower/20 resize-none"
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-[#E2E6F8] bg-[#F0F2FF] px-3 py-2 text-sm text-brand-navy">
                  <Icons.alertCircle className="h-4 w-4 shrink-0 text-brand-cornflower" />{error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E2E6F8] bg-[#F8F9FF]">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || fields.filter(f => f.required).some(f => !values[f.name])}
              className="bg-brand-navy text-white hover:bg-brand-navy-light"
            >
              {submitting
                ? <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                : <><Icons.check className="mr-2 h-4 w-4" />Submit Decision</>}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({
  form,
  onAction,
  loadingId,
}: {
  form: ReviewForm
  onAction: (form: ReviewForm) => void
  loadingId: string | null
}) {
  const isLoading = loadingId === form.formId
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-4 rounded-xl border border-[#E2E6F8] bg-white px-5 py-4 hover:border-brand-cornflower/50 hover:shadow-sm transition-all"
    >
      {/* Pulse indicator */}
      <div className="relative shrink-0">
        <div className="h-2.5 w-2.5 rounded-full bg-brand-navy" />
        <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-brand-navy animate-ping opacity-40" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-brand-navy text-sm">
            {form.workflowStepDescription || form.workflowStepName || form.message || 'Approval required'}
          </p>
          <span className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            statusBadge(form.status)
          )}>
            {form.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-brand-muted">
          <span className="truncate max-w-[200px]">{form.workflowName || `form: ${form.formId}`}</span>
          <span>·</span>
          <span>{timeAgo(form.createdAt)}</span>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => onAction(form)}
        disabled={isLoading}
        className="shrink-0 bg-brand-navy text-white hover:bg-brand-navy-light disabled:opacity-50"
      >
        {isLoading
          ? <Icons.loader className="h-3.5 w-3.5 animate-spin" />
          : <><Icons.check className="mr-1.5 h-3.5 w-3.5" />Review</>
        }
      </Button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WorkbenchPage() {
  const [forms, setForms] = useState<ReviewForm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedForm, setSelectedForm] = useState<FormDetail | null>(null)
  const [loadingForm, setLoadingForm] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchForms = useCallback(async () => {
    try {
      const data = await supervityGet('/user-forms?page=1&limit=50')
      // Supervity API returns { forms: [...] } or { items: [...] }
      const raw: ReviewForm[] = data.forms || data.items || []
      setForms(raw.map(normaliseForm))
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch review queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchForms, 15000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchForms])

  const handleOpenForm = async (form: ReviewForm) => {
    setLoadingForm(form.formId)
    try {
      const detail = await supervityGet(`/user-forms/${form.formId}`)
      setSelectedForm(normaliseForm({ ...form, ...detail }))
    } catch {
      // Fall back to basic form with approve/reject
      setSelectedForm({
        ...form,
        schema: {
          fields: [
            { name: 'decision', type: 'enum', label: 'Decision', options: ['approve', 'reject'], required: true },
            { name: 'comments', type: 'text', label: 'Comments', required: false },
          ],
        },
      })
    } finally {
      setLoadingForm(null)
    }
  }

  const pendingForms = forms.filter(f => f.status === 'pending')
  const completedForms = forms.filter(f => f.status !== 'pending')

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
            Workbench
          </h1>
          <p className="mt-2 text-base text-brand-muted">
            Human-in-Command — review and approve AI agent decisions in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
              autoRefresh
                ? 'bg-[#F0F2FF] text-brand-navy border-brand-cornflower/40'
                : 'bg-white text-brand-muted border-[#E2E6F8]'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', autoRefresh ? 'bg-brand-navy animate-pulse' : 'bg-brand-muted')} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchForms}
            disabled={loading}
          >
            <Icons.refresh className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: pendingForms.length, accent: true },
          { label: 'Completed', value: completedForms.length, accent: false },
          { label: 'Total in Queue', value: forms.length, accent: false },
        ].map((s) => (
          <div key={s.label} className={cn(
            'rounded-xl border p-4',
            s.accent
              ? 'bg-brand-navy text-white border-brand-navy'
              : 'bg-white border-[#E2E6F8]'
          )}>
            <p className={cn('text-3xl font-bold', s.accent ? 'text-white' : 'text-brand-navy')}>{s.value}</p>
            <p className={cn('text-xs mt-1', s.accent ? 'text-white/70' : 'text-brand-muted')}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E6F8] bg-[#F0F2FF] px-4 py-3 text-sm text-brand-navy">
          <Icons.alertCircle className="h-4 w-4 shrink-0 text-brand-cornflower" />
          <span>{error}</span>
          <button onClick={fetchForms} className="ml-auto underline text-xs text-brand-cornflower">Retry</button>
        </div>
      )}

      {/* Pending queue */}
      <div className="rounded-2xl border border-[#E2E6F8] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E6F8] bg-[#F8F9FF]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10">
              <Icons.clock className="h-4 w-4 text-brand-navy" />
            </div>
            <div>
              <h2 className="font-semibold text-brand-navy text-sm">Pending Reviews</h2>
              <p className="text-xs text-brand-muted">Agent executions waiting for your decision</p>
            </div>
          </div>
          <span className="text-xs text-brand-muted">
            Updated {timeAgo(lastRefresh.toISOString())}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Icons.loader className="h-7 w-7 animate-spin text-brand-cornflower" />
            </div>
          ) : pendingForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-brand-muted">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F2FF] mb-3">
                <Icons.checkCircle className="h-7 w-7 text-brand-cornflower" />
              </div>
              <p className="font-semibold text-brand-navy">All clear</p>
              <p className="text-sm mt-1">No pending reviews — agents are running autonomously</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {pendingForms.map((form) => (
                <ReviewCard
                  key={form.formId}
                  form={form}
                  onAction={handleOpenForm}
                  loadingId={loadingForm}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Completed / history */}
      {completedForms.length > 0 && (
        <div className="rounded-2xl border border-[#E2E6F8] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E6F8] bg-[#F8F9FF]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-navy/10">
              <Icons.checkCircle className="h-4 w-4 text-brand-navy" />
            </div>
            <div>
              <h2 className="font-semibold text-brand-navy text-sm">Recent Decisions</h2>
              <p className="text-xs text-brand-muted">Submitted reviews from this session</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {completedForms.slice(0, 10).map((form) => (
              <div
                key={form.formId}
                className="flex items-center gap-3 rounded-lg px-4 py-2.5 bg-[#F8F9FF] border border-[#E2E6F8]"
              >
                <Icons.checkCircle className="h-4 w-4 text-brand-cornflower shrink-0" />
                <span className="font-mono text-xs text-brand-muted truncate flex-1">{form.formId}</span>
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0',
                  statusBadge(form.status)
                )}>
                  {form.status}
                </span>
                <span className="text-xs text-brand-muted shrink-0">{timeAgo(form.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-[#E2E6F8] bg-[#F0F2FF] p-5">
        <div className="flex items-start gap-3">
          <Icons.info className="h-5 w-5 text-brand-cornflower shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="text-sm text-brand-navy/80 space-y-1">
            <p className="font-semibold text-brand-navy">How Human-in-Command works</p>
            <p>When a Supervity AI agent reaches a decision point requiring human oversight, it pauses and creates a review form here. You approve or reject, and the agent resumes automatically with your decision as context.</p>
            <p className="text-xs text-brand-muted mt-2">Polling every 15 seconds · All decisions are logged and auditable · Powered by Supervity Human-in-Command API</p>
          </div>
        </div>
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {selectedForm && (
          <ReviewModal
            form={selectedForm}
            onClose={() => setSelectedForm(null)}
            onSubmitted={fetchForms}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

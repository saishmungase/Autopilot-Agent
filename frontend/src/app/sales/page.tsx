'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const WS_URL  = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001').replace(/^http/, 'ws')
const TOKEN_KEY = 'vity_rep_token'
const NAME_KEY = 'vity_rep_name'
const TEAM_KEY = 'vity_rep_team'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  lead_id: string
  policy_type: string
  contact: { name: string; email: string; phone: string } | string
  lead_score: number
  status: string
}

type AuthMode = 'signin' | 'register'
type View = 'auth' | 'dashboard'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getContact(lead: Lead) {
  if (typeof lead.contact === 'string') {
    try { return JSON.parse(lead.contact) } catch { return { name: '—', email: '', phone: '' } }
  }
  return lead.contact
}

function policyColor(type: string) {
  const map: Record<string, string> = {
    life: 'bg-violet-100 text-violet-700',
    health: 'bg-green-100 text-green-700',
    car: 'bg-blue-100 text-blue-700',
    home: 'bg-amber-100 text-amber-700',
    unknown: 'bg-gray-100 text-gray-600',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

function statusColor(s: string) {
  if (s === 'assigned') return 'bg-blue-50 text-blue-600 border-blue-200'
  if (s === 'closed') return 'bg-green-50 text-green-600 border-green-200'
  return 'bg-gray-50 text-gray-600 border-gray-200'
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onSuccess }: { onSuccess: (name: string, team: string, token: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [team, setTeam] = useState('life')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const teams = ['life', 'health', 'car', 'home', 'other']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'register') {
        const r = await fetch(`${API_URL}/api/reps/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, password, team }),
        })
        if (!r.ok) throw new Error((await r.json()).detail || 'Registration failed')
      }

      const r = await fetch(`${API_URL}/api/reps/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!r.ok) throw new Error((await r.json()).detail || 'Invalid credentials')

      const { access_token } = await r.json()
      const displayName = mode === 'register' ? name : username
      const displayTeam = mode === 'register' ? team : ''

      localStorage.setItem(TOKEN_KEY, access_token)
      localStorage.setItem(NAME_KEY, displayName)
      localStorage.setItem(TEAM_KEY, displayTeam)
      onSuccess(displayName, displayTeam, access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC] p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Vity Sales Portal</h1>
          <p className="mt-1 text-sm text-gray-600">Sign in to manage your leads</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Mode toggle */}
          <div className="mb-5 flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {(['signin', 'register'] as AuthMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="reg"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <Field label="Full Name">
                    <input required className={inputCls} placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
                  </Field>
                  <Field label="Team">
                    <div className="flex flex-wrap gap-2">
                      {teams.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTeam(t)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-all ${
                            team === t
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label="Username">
              <input required className={inputCls} placeholder="john_doe" value={username} onChange={e => setUsername(e.target.value)} />
            </Field>
            <Field label="Password">
              <input required type="password" className={inputCls} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
        <Link href="/" className="hover:text-indigo-600 transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}

// ─── Process Call Panel ───────────────────────────────────────────────────────
interface WsMsg { lead_id: string; agent: string; message: string }
interface AgentUpdate { agent: string; message: string; ts: string; isDone: boolean }
const DOMAINS_PC = ['life','health','car','home'] as const
const AGENT_ICON: Record<string,string> = { Serialize:'⚙️', HubSpot:'🔗', Slack:'💬', Email:'📧', Error:'❌' }

function ProcessCallPanel({ lead, repName, repEmail, onClose }: {
  lead: Lead; repName: string; repEmail: string; onClose: () => void
}) {
  const contact = getContact(lead)
  const [domain,       setDomain]       = useState<string>(lead.policy_type in {life:1,health:1,car:1,home:1} ? lead.policy_type : 'health')
  const [assignedTo,   setAssignedTo]   = useState(repName)
  const [assignedMail, setAssignedMail] = useState(repEmail)
  const [audioFile,    setAudioFile]    = useState<File|null>(null)
  const [status,       setStatus]       = useState<'idle'|'uploading'|'processing'|'done'|'error'>('idle')
  const [leadId,       setLeadId]       = useState<string|null>(null)
  const [updates,      setUpdates]      = useState<AgentUpdate[]>([])
  const [errMsg,       setErrMsg]       = useState('')
  const wsRef    = useRef<WebSocket|null>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const logEnd   = useRef<HTMLDivElement>(null)

  useEffect(() => { logEnd.current?.scrollIntoView({ behavior:'smooth' }) }, [updates])
  useEffect(() => () => { wsRef.current?.close() }, [])

  const openWS = (id: string) => {
    const ws = new WebSocket(`${WS_URL}/ws/${id}`)
    wsRef.current = ws
    ws.onopen = () => setStatus('processing')
    ws.onmessage = ev => {
      try {
        const m: WsMsg = JSON.parse(ev.data)
        setUpdates(p => [...p, { agent:m.agent, message:m.message, ts:new Date().toLocaleTimeString(), isDone:m.message==='✓ Done' }])
      } catch {}
    }
    ws.onclose = () => setStatus(p => p==='processing'?'done':p)
    ws.onerror = () => { setErrMsg('WebSocket failed'); setStatus('error') }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!audioFile) { setErrMsg('Select an audio file'); return }
    setStatus('uploading'); setErrMsg(''); setUpdates([]); wsRef.current?.close()
    const ctx = JSON.stringify({ name:contact.name, email:contact.email, mobileNo:contact.phone, domain, transcript:'', assigned_to:assignedTo, assigned_to_mail:assignedMail })
    const fd = new FormData()
    fd.append('audio_file', audioFile)
    fd.append('context', ctx)
    try {
      const r = await fetch(`${API_URL}/api/process-call`, { method:'POST', body:fd })
      if (!r.ok) throw new Error((await r.json().catch(()=>({detail:r.statusText}))).detail)
      const d = await r.json()
      setLeadId(d.lead_id)
      openWS(d.lead_id)
    } catch(e) { setErrMsg(e instanceof Error?e.message:'Failed'); setStatus('error') }
  }

  const inp = 'w-full rounded-xl border border-[#E2E6F8] bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#8B9FE8] focus:outline-none focus:ring-2 focus:ring-[#8B9FE8]/20 transition-all'
  const lbl = 'block text-xs font-semibold text-[#3D4B8F] uppercase tracking-wide mb-1.5'

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex" style={{background:'rgba(15,20,40,0.6)'}} onClick={onClose}>
      <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',stiffness:300,damping:30}}
        className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden shadow-2xl"
        style={{background:'#fff'}}
        onClick={e=>e.stopPropagation()}>

        {/* Header — brand gradient */}
        <div className="flex items-center justify-between border-b border-[#E2E6F8] px-6 py-4"
          style={{background:'linear-gradient(135deg,#3D4B8F 0%,#5A6BC4 100%)'}}>
          <div>
            <h2 className="text-base font-bold text-white">Process Call — {contact.name}</h2>
            <p className="mt-0.5 text-xs" style={{color:'#C5CCEF'}}>{contact.email} · {lead.policy_type}</p>
          </div>
          <button onClick={onClose}
            className="rounded-xl p-2 transition-colors hover:bg-white/20"
            style={{color:'#C5CCEF'}}>✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{background:'#F0F2FF'}}>
          {/* ── Left: Form ── */}
          <form onSubmit={submit}
            className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-[#E2E6F8] p-5"
            style={{background:'#fff'}}>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Name</label>
                <input className={inp} value={contact.name} readOnly /></div>
              <div><label className={lbl}>Email</label>
                <input className={inp} value={contact.email} readOnly /></div>
            </div>

            <div><label className={lbl}>Mobile</label>
              <input className={inp} value={contact.phone} readOnly /></div>

            <div>
              <label className={lbl}>Insurance Domain</label>
              <div className="flex gap-2 flex-wrap">
                {DOMAINS_PC.map(d => (
                  <button key={d} type="button" onClick={()=>setDomain(d)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                      domain===d
                        ? 'border-[#3D4B8F] bg-[#3D4B8F] text-white shadow-sm'
                        : 'border-[#E2E6F8] text-[#8B9FE8] hover:border-[#8B9FE8]'}`}>{d}</button>
                ))}
              </div>
            </div>

            <div><label className={lbl}>Assigned To</label>
              <input className={inp} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} /></div>

            <div><label className={lbl}>Assigned Email</label>
              <input className={inp} value={assignedMail} onChange={e=>setAssignedMail(e.target.value)} /></div>

            <div>
              <label className={lbl}>Audio File *</label>
              <div onClick={()=>fileRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed py-6 text-center transition-all ${
                  audioFile
                    ? 'border-[#3D4B8F] bg-[#F0F2FF]'
                    : 'border-[#E2E6F8] hover:border-[#8B9FE8] hover:bg-[#F0F2FF]'}`}>
                <p className="text-2xl">{audioFile ? '🎵' : '☁️'}</p>
                <p className="mt-1 text-xs font-medium text-[#3D4B8F]">
                  {audioFile ? audioFile.name : 'Click to upload audio'}
                </p>
                <p className="text-xs" style={{color:'#8B9FE8'}}>
                  {audioFile ? `${(audioFile.size/1024/1024).toFixed(1)} MB` : 'MP3, M4A, WAV — any length'}
                </p>
                <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                  onChange={e=>setAudioFile(e.target.files?.[0]??null)} />
              </div>
            </div>

            {errMsg && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">{errMsg}</p>
            )}

            <button type="submit" disabled={status==='uploading'||status==='processing'}
              className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{background: status==='uploading'||status==='processing' ? '#8B9FE8' : '#3D4B8F'}}>
              {status==='uploading' ? '⏳ Transcribing…' : status==='processing' ? '🤖 Processing…' : '🚀 Process Call'}
            </button>
          </form>

          {/* ── Right: Live log ── */}
          <div className="flex w-1/2 flex-col" style={{background:'#fff'}}>
            <div className="flex items-center justify-between border-b border-[#E2E6F8] px-4 py-3">
              <p className="text-xs font-semibold text-[#3D4B8F]">Live Agent Log</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                status==='done'       ? 'bg-green-50 text-green-600' :
                status==='processing' ? 'bg-[#E8ECF8] text-[#3D4B8F] animate-pulse' :
                'bg-gray-100 text-gray-400'}`}>
                {status==='done' ? '✅ Complete' : status==='processing' ? '🤖 Running' : '— Waiting'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-4" style={{background:'#F8F9FF', maxHeight:'calc(100vh - 200px)'}}>
              {updates.length===0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                  <span className="text-3xl opacity-20">🤖</span>
                  <p className="text-xs" style={{color:'#8B9FE8'}}>Agent updates appear here…</p>
                </div>
              ) : updates.map((u,i) => (
                <div key={i} className={`rounded-xl border p-3 text-xs transition-all ${
                  u.isDone
                    ? 'border-green-100 bg-green-50 text-green-700'
                    : 'border-[#E2E6F8] bg-[#F0F2FF] text-[#3D4B8F]'}`}>
                  <div className="mb-1 flex justify-between">
                    <span className="font-bold">{AGENT_ICON[u.agent]??'🔄'} {u.agent}</span>
                    <span className="opacity-40">{u.ts}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap opacity-90">{u.message}</p>
                </div>
              ))}
              <div ref={logEnd}/>
            </div>

            {/* Pipeline progress */}
            {(status==='processing'||status==='done') && (
              <div className="border-t border-[#E2E6F8] px-4 py-3">
                <div className="flex justify-between gap-1">
                  {['Serialize','HubSpot','Slack','Email'].map(agent => {
                    const done   = updates.some(u=>u.agent===agent&&u.isDone)
                    const active = updates.some(u=>u.agent===agent)&&!done
                    return (
                      <div key={agent} className="flex flex-1 flex-col items-center gap-1">
                        <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                          done?'bg-[#3D4B8F]':active?'bg-[#8B9FE8] animate-pulse':'bg-gray-100'}`}/>
                        <span className={`text-xs font-medium ${
                          done?'text-[#3D4B8F]':active?'text-[#8B9FE8]':'text-gray-300'}`}>
                          {done?'✓ ':active?'… ':''}{agent}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {leadId && (
              <p className="border-t border-[#E2E6F8] px-4 py-2 font-mono text-xs" style={{color:'#8B9FE8'}}>
                ID: {leadId}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen?: () => void }) {
  const contact = getContact(lead)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{contact.name || '—'}</p>
          <p className="truncate text-xs text-gray-600">{contact.email}</p>
          <p className="text-xs text-gray-600">{contact.phone}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(lead.status)}`}>
            {lead.status}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${policyColor(lead.policy_type)}`}>
            {lead.policy_type}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width:`${Math.round((lead.lead_score??0)*100)}%` }}/>
        </div>
        <span className="text-xs text-gray-500">{Math.round((lead.lead_score??0)*100)}%</span>
      </div>
      {onOpen && (
        <button onClick={onOpen}
          className="mt-3 w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">
          🚀 Open &amp; Process Call
        </button>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({
  repName,
  repTeam,
  token,
  onSignOut,
}: {
  repName: string
  repTeam: string
  token: string
  onSignOut: () => void
}) {
  const [assigned,     setAssigned]     = useState<Lead[]>([])
  const [completed,    setCompleted]    = useState<Lead[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activePanel,  setActivePanel]  = useState<Lead|null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/reps/fetch?rep_id=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAssigned(data.assigned || [])
      setCompleted(data.completed || [])
    } catch {
      setAssigned([])
      setCompleted([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Welcome, {repName}
                {repTeam && (
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium capitalize text-indigo-700">
                    {repTeam}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">Sales Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchLeads()}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={onSignOut}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Total Leads', value: assigned.length + completed.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Assigned', value: assigned.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed', value: completed.length, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Assigned */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Newly Assigned</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {assigned.length}
                </span>
              </div>
              {assigned.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-12 text-center">
                  <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm text-gray-500">No assigned leads yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assigned.map(lead => (
                    <LeadCard key={lead.lead_id} lead={lead} onOpen={() => setActivePanel(lead)} />
                  ))}
                </div>
              )}
            </div>

            {/* Completed */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Completed Deals</h2>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  {completed.length}
                </span>
              </div>
              {completed.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-12 text-center">
                  <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">No completed deals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completed.map(lead => <LeadCard key={lead.lead_id} lead={lead} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Process Call slide-over */}
      <AnimatePresence>
        {activePanel && (
          <ProcessCallPanel
            lead={activePanel}
            repName={repName}
            repEmail=""
            onClose={() => setActivePanel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [view, setView] = useState<View | null>(null) // null = checking localStorage
  const [repName, setRepName] = useState('')
  const [repTeam, setRepTeam] = useState('')
  const [token, setToken] = useState('')

  // On mount: check if already logged in
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedName = localStorage.getItem(NAME_KEY) || ''
    const savedTeam = localStorage.getItem(TEAM_KEY) || ''
    if (savedToken) {
      setToken(savedToken)
      setRepName(savedName)
      setRepTeam(savedTeam)
      setView('dashboard')
    } else {
      setView('auth')
    }
  }, [])

  const handleAuthSuccess = (name: string, team: string, t: string) => {
    setRepName(name)
    setRepTeam(team)
    setToken(t)
    setView('dashboard')
  }

  const handleSignOut = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(TEAM_KEY)
    setToken('')
    setRepName('')
    setRepTeam('')
    setView('auth')
  }

  // Loading state while checking localStorage
  if (view === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {view === 'auth' ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthScreen onSuccess={handleAuthSuccess} />
        </motion.div>
      ) : (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard repName={repName} repTeam={repTeam} token={token} onSignOut={handleSignOut} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

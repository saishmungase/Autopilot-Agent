'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const WS_URL  = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
  .replace(/^http/, 'ws')

// ─── Types ────────────────────────────────────────────────────────────────────
interface WsMessage {
  lead_id: string
  agent:   string
  message: string
}

interface AgentUpdate {
  agent:     string
  message:   string
  ts:        string
  isDone:    boolean
}

const DOMAINS = ['life', 'health', 'car', 'home'] as const
type Domain = typeof DOMAINS[number]

const AGENT_COLORS: Record<string, string> = {
  Serialize: 'bg-[#E8ECF8] text-[#3D4B8F]',
  HubSpot:   'bg-[#EEF0FB] text-[#5A6BC4]',
  Slack:     'bg-[#F0F2FF] text-[#3D4B8F]',
  Email:     'bg-[#E8ECF8] text-[#5A6BC4]',
  Error:     'bg-red-50 text-red-600',
}

const agentIcon: Record<string, string> = {
  Serialize: '⚙️',
  HubSpot:   '🔗',
  Slack:     '💬',
  Email:     '📧',
  Error:     '❌',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProcessCallPage() {
  // Form state
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [mobileNo,      setMobileNo]      = useState('')
  const [domain,        setDomain]        = useState<Domain>('health')
  const [transcript,    setTranscript]    = useState('')
  const [assignedTo,    setAssignedTo]    = useState('')
  const [assignedMail,  setAssignedMail]  = useState('')
  const [audioFile,     setAudioFile]     = useState<File | null>(null)

  // Process state
  const [leadId,        setLeadId]        = useState<string | null>(null)
  const [status,        setStatus]        = useState<'idle'|'uploading'|'processing'|'done'|'error'>('idle')
  const [errorMsg,      setErrorMsg]      = useState('')
  const [updates,       setUpdates]       = useState<AgentUpdate[]>([])

  const wsRef        = useRef<WebSocket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logEndRef    = useRef<HTMLDivElement>(null)

  // Auto-scroll live log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [updates])

  // Cleanup WS on unmount
  useEffect(() => () => { wsRef.current?.close() }, [])

  // ── Open WebSocket for a given lead_id ──────────────────────────────────
  const openWebSocket = useCallback((id: string) => {
    const ws = new WebSocket(`${WS_URL}/ws/${id}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('processing')
    }

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data)
        const isDone = msg.message === '✓ Done'
        setUpdates(prev => [...prev, {
          agent:   msg.agent,
          message: msg.message,
          ts:      new Date().toLocaleTimeString(),
          isDone,
        }])
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setStatus(prev => prev === 'processing' ? 'done' : prev)
    }

    ws.onerror = () => {
      setErrorMsg('WebSocket connection failed.')
      setStatus('error')
    }
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!audioFile) { setErrorMsg('Please select an audio file.'); return }

    setStatus('uploading')
    setErrorMsg('')
    setUpdates([])
    setLeadId(null)
    wsRef.current?.close()

    const context = JSON.stringify({
      name,
      email,
      mobileNo,
      domain,
      transcript,
      assigned_to:    assignedTo,
      assigned_to_mail: assignedMail,
    })

    const formData = new FormData()
    formData.append('audio_file', audioFile)
    formData.append('context', context)

    try {
      const res = await fetch(`${API_URL}/api/process-call`, {
        method: 'POST',
        body:   formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Upload failed')
      }

      const data = await res.json()          // { lead_id, status: "queued" }
      const id: string = data.lead_id
      setLeadId(id)
      openWebSocket(id)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    wsRef.current?.close()
    setStatus('idle')
    setLeadId(null)
    setUpdates([])
    setErrorMsg('')
    setAudioFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const inputCls = [
    'w-full rounded-xl border border-[#E2E6F8] bg-white px-4 py-2.5 text-sm',
    'text-gray-900 placeholder:text-gray-400',
    'focus:border-[#8B9FE8] focus:outline-none focus:ring-2 focus:ring-[#8B9FE8]/20',
    'transition-all',
  ].join(' ')

  const labelCls = 'block text-xs font-semibold text-[#3D4B8F] uppercase tracking-wide mb-1.5'

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F2FF] p-6">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[#3D4B8F]">Process Call</h1>
          <p className="mt-1 text-sm text-[#8B9FE8]">
            Upload a call recording — the AI will transcribe, score, and push to HubSpot, Slack, and Email automatically.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ── Left: Form ──────────────────────────────────────────────── */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-5 rounded-2xl border border-[#E2E6F8] bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-[#3D4B8F]">Call Context</h2>

            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>User Name *</label>
                <input required className={inputCls} placeholder="Jane Smith"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>User Email *</label>
                <input required type="email" className={inputCls} placeholder="jane@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label className={labelCls}>Mobile Number *</label>
              <input required className={inputCls} placeholder="+91 98765 43210"
                value={mobileNo} onChange={e => setMobileNo(e.target.value)} />
            </div>

            {/* Insurance Domain */}
            <div>
              <label className={labelCls}>Insurance Domain *</label>
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDomain(d)}
                    className={[
                      'rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all',
                      domain === d
                        ? 'border-[#3D4B8F] bg-[#3D4B8F] text-white shadow-sm'
                        : 'border-[#E2E6F8] text-[#8B9FE8] hover:border-[#8B9FE8]',
                    ].join(' ')}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Call Transcript (optional — Groq will transcribe anyway) */}
            <div>
              <label className={labelCls}>Call Transcript <span className="normal-case font-normal text-gray-400">(optional — auto-generated from audio)</span></label>
              <textarea
                rows={3}
                className={inputCls + ' resize-none'}
                placeholder="Paste transcript here, or leave blank to let Groq transcribe the audio..."
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
            </div>

            {/* Row: Assigned To */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Assigned To (Agent Name) *</label>
                <input required className={inputCls} placeholder="Rahul Sharma"
                  value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Assigned To Email *</label>
                <input required type="email" className={inputCls} placeholder="rahul@company.com"
                  value={assignedMail} onChange={e => setAssignedMail(e.target.value)} />
              </div>
            </div>

            {/* Audio file upload */}
            <div>
              <label className={labelCls}>Audio File *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center gap-2',
                  'rounded-xl border-2 border-dashed py-6 transition-all',
                  audioFile
                    ? 'border-[#3D4B8F] bg-[#F0F2FF]'
                    : 'border-[#E2E6F8] hover:border-[#8B9FE8] hover:bg-[#F0F2FF]',
                ].join(' ')}
              >
                <span className="text-2xl">{audioFile ? '🎵' : '☁️'}</span>
                <p className="text-xs font-medium text-[#3D4B8F]">
                  {audioFile ? audioFile.name : 'Click to upload audio'}
                </p>
                <p className="text-xs text-gray-400">
                  {audioFile
                    ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB`
                    : 'MP3, M4A, WAV, OGG — any length'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 border border-red-100">
                {errorMsg}
              </p>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={status === 'uploading' || status === 'processing'}
                className={[
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all',
                  status === 'uploading' || status === 'processing'
                    ? 'bg-[#8B9FE8] cursor-not-allowed'
                    : 'bg-[#3D4B8F] hover:bg-[#2d3a6e] shadow-sm hover:shadow-md',
                ].join(' ')}
              >
                {status === 'uploading'   && '⏳ Uploading & Transcribing…'}
                {status === 'processing'  && '🤖 AI Agents Running…'}
                {(status === 'idle' || status === 'done' || status === 'error') && '🚀 Process Call'}
              </button>
              {(status === 'done' || status === 'error') && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-[#E2E6F8] px-4 py-2.5 text-sm font-medium text-[#3D4B8F] hover:bg-[#F0F2FF] transition-all"
                >
                  New Call
                </button>
              )}
            </div>
          </motion.form>

          {/* ── Right: Live Agent Log ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col rounded-2xl border border-[#E2E6F8] bg-white shadow-sm overflow-hidden"
          >
            {/* Log header */}
            <div className="flex items-center justify-between border-b border-[#E2E6F8] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#3D4B8F]">Live Agent Log</h2>
                {leadId && (
                  <p className="mt-0.5 font-mono text-xs text-[#8B9FE8]">
                    Lead: {leadId}
                  </p>
                )}
              </div>
              {/* Status badge */}
              <span className={[
                'rounded-full px-3 py-1 text-xs font-semibold',
                status === 'idle'       && 'bg-gray-100 text-gray-500',
                status === 'uploading'  && 'bg-amber-50 text-amber-600',
                status === 'processing' && 'bg-[#E8ECF8] text-[#3D4B8F] animate-pulse',
                status === 'done'       && 'bg-green-50 text-green-600',
                status === 'error'      && 'bg-red-50 text-red-600',
              ].filter(Boolean).join(' ')}>
                {status === 'idle'       && '— Waiting'}
                {status === 'uploading'  && '⏳ Transcribing'}
                {status === 'processing' && '🤖 Processing'}
                {status === 'done'       && '✅ Complete'}
                {status === 'error'      && '❌ Error'}
              </span>
            </div>

            {/* Log body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ minHeight: '420px', maxHeight: '520px' }}>
              {updates.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center py-16">
                  <span className="text-4xl opacity-30">🤖</span>
                  <p className="text-sm text-gray-400">
                    {status === 'idle'
                      ? 'Submit a call to see real-time agent updates here.'
                      : 'Waiting for agents to start…'}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {updates.map((u, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={[
                        'rounded-xl p-3.5 border',
                        u.isDone
                          ? 'border-green-100 bg-green-50'
                          : (AGENT_COLORS[u.agent] ? 'border-[#E2E6F8] ' + AGENT_COLORS[u.agent] : 'border-[#E2E6F8] bg-[#F0F2FF] text-[#3D4B8F]'),
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold">
                          {agentIcon[u.agent] ?? '🔄'} {u.agent}
                        </span>
                        <span className="text-xs opacity-50">{u.ts}</span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{u.message}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={logEndRef} />
            </div>

            {/* Pipeline progress footer */}
            {(status === 'processing' || status === 'done') && (
              <div className="border-t border-[#E2E6F8] px-5 py-3">
                <div className="flex justify-between gap-1">
                  {['Serialize', 'HubSpot', 'Slack', 'Email'].map(agent => {
                    const done = updates.some(u => u.agent === agent && u.isDone)
                    const active = updates.some(u => u.agent === agent) && !done
                    return (
                      <div key={agent} className="flex flex-1 flex-col items-center gap-1">
                        <div className={[
                          'h-1.5 w-full rounded-full transition-all duration-500',
                          done   ? 'bg-[#3D4B8F]'   :
                          active ? 'bg-[#8B9FE8] animate-pulse' : 'bg-gray-100',
                        ].join(' ')} />
                        <span className={[
                          'text-xs font-medium',
                          done ? 'text-[#3D4B8F]' : active ? 'text-[#8B9FE8]' : 'text-gray-300',
                        ].join(' ')}>
                          {done ? '✓ ' : active ? '… ' : ''}{agent}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

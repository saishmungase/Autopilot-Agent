'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// ─── Types ────────────────────────────────────────────────────────────────────
type PolicyType = 'life' | 'health' | 'car' | 'home' | 'unknown'
type FormStatus = 'idle' | 'loading' | 'success' | 'error'

interface ChatMessage {
  role: 'bot' | 'user'
  text: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        required={required}
        className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
      />
    </div>
  )
}

// ─── Quote Form Modal ─────────────────────────────────────────────────────────
function QuoteModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [policy, setPolicy] = useState<PolicyType>('life')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState('')

  const policies: { value: PolicyType; label: string }[] = [
    { value: 'life', label: 'Life' },
    { value: 'health', label: 'Health' },
    { value: 'car', label: 'Auto' },
    { value: 'home', label: 'Home' },
    { value: 'unknown', label: "Not sure" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/intake/process-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_type: policy,
          contact: { name, email, phone },
          lead_score: 0.5,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Submission failed')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25 }}
      >
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Get a Free Quote</h2>
              <p className="mt-0.5 text-sm text-gray-500">A rep will reach out within 24 hours.</p>
            </div>
            <button onClick={onClose} className="ml-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {status === 'success' ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Request submitted!</p>
                <p className="mt-1 text-sm text-gray-500">We&apos;ll be in touch within 24 hours.</p>
              </div>
              <button onClick={onClose} className="mt-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">Close</button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">I&apos;m interested in</label>
                <div className="flex flex-wrap gap-2">
                  {policies.map(p => (
                    <button key={p.value} type="button" onClick={() => setPolicy(p.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${policy === p.value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Full Name" required placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Email" required type="email" placeholder="jane@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Phone" required type="tel" placeholder="555-1234" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              {status === 'error' && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={status === 'loading'}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {status === 'loading' ? 'Submitting…' : 'Request a Quote →'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── AI Chatbot Panel ─────────────────────────────────────────────────────────
function ChatbotPanel() {
  const [sessionId] = useState(genSessionId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendToAgent = async (userMsg: string | null) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      }
      if (data.done) setDone(true)
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleStart = () => {
    setStarted(true)
    sendToAgent(null)
  }

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading || done) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    await sendToAgent(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleReset = async () => {
    await fetch(`${API_URL}/api/chat/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    setMessages([])
    setDone(false)
    setStarted(false)
    setInput('')
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 bg-indigo-600 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Vity AI Assistant</p>
          <p className="text-xs text-indigo-200">Powered by Gemini 2.0 Flash</p>
        </div>
        {started && (
          <button onClick={handleReset} className="text-xs text-indigo-200 hover:text-white transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!started ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Chat with our AI</p>
              <p className="mt-1 text-sm text-gray-500 max-w-xs">Tell us about your insurance needs and we&apos;ll connect you with the right rep.</p>
            </div>
            <button onClick={handleStart}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200">
              Start Chat
            </button>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      {started && !done && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Type your message…"
              className="flex-1 rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="border-t border-gray-100 p-3 text-center">
          <p className="mb-2 text-xs text-gray-500">Conversation complete</p>
          <button onClick={handleReset} className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            Start new chat
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      {/* Nav */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Vity Insurance</span>
          </div>
          <a href="/sales" className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            Sales Portal →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Left: Company info + CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Vity Insurance</h1>
                  <p className="text-sm text-gray-500">Your trusted coverage partner</p>
                </div>
              </div>
              <p className="mb-6 text-gray-600 leading-relaxed">
                We provide comprehensive life, health, auto, and home insurance solutions tailored to your needs. Our expert reps are ready to help you find the right coverage at the right price.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Sales Hotline', value: '+1 (800) 848-9200', href: 'tel:+18008489200', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' },
                  { label: 'Email', value: 'sales@vity.insurance', href: 'mailto:sales@vity.insurance', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
                  { label: 'Hours', value: 'Mon–Fri, 8 AM – 6 PM CST', href: '#', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
                ].map(item => (
                  <a key={item.label} href={item.href}
                    className={`flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 transition-colors ${item.href !== '#' ? 'hover:border-indigo-200 hover:bg-indigo-50' : 'pointer-events-none'}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-500 shadow-sm border border-gray-100">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                    </span>
                    <div>
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <motion.button onClick={() => setShowModal(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Request a Free Quote
            </motion.button>

            <div className="flex flex-wrap gap-2">
              {['Life Insurance', 'Health Insurance', 'Auto Insurance', 'Home Insurance'].map(tag => (
                <span key={tag} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">{tag}</span>
              ))}
            </div>
          </motion.div>

          {/* Right: Live chatbot */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col" style={{ minHeight: '520px' }}>
            <ChatbotPanel />
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {showModal && <QuoteModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  )
}

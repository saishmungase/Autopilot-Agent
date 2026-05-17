'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Phone, MessageCircle, X, Send, ShieldCheck, ArrowRight, Heart, Umbrella, Car, TrendingUp, Clock, Award, Users, Mail, MapPin, Loader2, CheckCircle2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'bot' | 'user'
  text: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <>
      {/* Glassmorphic backdrop blur effect */}
      <div className="fixed top-0 inset-x-0 h-24 bg-gradient-to-b from-background/80 via-background/40 to-transparent backdrop-blur-xl z-30 pointer-events-none" />
      
      <header className="fixed top-0 inset-x-0 z-40 px-6 py-4">
        <nav className="max-w-6xl mx-auto glass rounded-full px-5 py-2.5 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center glow-emerald">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">SecurePulse</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">Insurance</span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#coverage" className="hover:text-foreground transition-colors">Coverage</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Get a Quote</a>
            <a href="#contact-info" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/command-center"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium hover:bg-emerald-500/20 transition-all"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Command Center</span>
            </a>
            <a
              href="tel:9822983444"
              className="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">98229 83444</span>
            </a>
          </div>
        </nav>
      </header>
    </>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 text-xs tracking-wider uppercase text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
          Trusted by 50,000+ Policyholders
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] mb-6">
          Intelligent Coverage.<br />
          <span className="text-gradient">Accelerated Solutions.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Comprehensive health, life, auto, and wealth protection — backed by dedicated specialists who respond in real time.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={scrollToContact}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-accent text-primary-foreground font-medium text-sm glow-emerald hover:scale-[1.02] transition-transform"
          >
            Get a Quote / Submit Claim
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a
            href="tel:9822983444"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full glass text-foreground font-medium text-sm hover:bg-white/5 transition-colors"
          >
            <Phone className="h-4 w-4 text-emerald" />
            Call 98229 83444
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { v: "50K+", l: "Policyholders" },
            { v: "$2.4B", l: "Claims Paid" },
            { v: "24/7", l: "Specialist Support" },
            { v: "A+", l: "Financial Rating" },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl px-4 py-5">
              <div className="text-2xl font-semibold text-gradient">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Company Sections ─────────────────────────────────────────────────────────
function CompanySections() {
  const coverages = [
    { icon: Heart, title: "Health Insurance", desc: "Family and individual plans with cashless hospitalization at 12,000+ network hospitals." },
    { icon: Umbrella, title: "Life Insurance", desc: "Term and whole-life policies designed to protect what matters most to your loved ones." },
    { icon: Car, title: "Auto / Car Insurance", desc: "Comprehensive vehicle cover with 24/7 roadside assistance and instant claim approval." },
    { icon: TrendingUp, title: "Wealth & Asset Management", desc: "Long-term wealth-building strategies and asset protection for high net-worth clients." },
  ];

  const features = [
    { icon: ShieldCheck, title: "Licensed & Regulated", desc: "Fully IRDAI-licensed with A+ financial strength rating." },
    { icon: Clock, title: "Real-Time Claims", desc: "Average claim settlement under 4 hours for routine cases." },
    { icon: Award, title: "Award-Winning Service", desc: "Voted 'Insurer of the Year' three years running." },
    { icon: Users, title: "Dedicated Specialists", desc: "A personal advisor assigned to every policyholder." },
  ];

  return (
    <>
      {/* About */}
      <section id="about" className="px-6 pb-24">
        <div className="max-w-5xl mx-auto glass-strong rounded-3xl p-8 md:p-12 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-3">About SecurePulse</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-5">
            Protection, reimagined for the modern policyholder.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            Founded in 2008, SecurePulse Insurance is a leading enterprise insurance firm trusted by individuals,
            families, and Fortune 500 employers. We combine deep underwriting expertise with a relentless focus on
            speed, transparency, and human-centered service — so the moment you need us, we&apos;re already there.
          </p>
        </div>
      </section>

      {/* Coverage */}
      <section id="coverage" className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.2em] text-electric mb-3">Our Coverage</div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Built for every stage of life</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Four pillars of protection, each tailored by a dedicated specialist team.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coverages.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="glass rounded-2xl p-6 hover:bg-white/5 hover:border-emerald/30 transition-all group">
                  <div className="h-11 w-11 rounded-xl bg-gradient-accent flex items-center justify-center mb-4 glow-emerald group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-3">Why SecurePulse</div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">A standard of care above the rest</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="glass rounded-2xl p-6">
                  <Icon className="h-6 w-6 text-emerald mb-3" />
                  <h3 className="font-semibold mb-1.5 text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Intake Portal ────────────────────────────────────────────────────────────
function IntakePortal() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policyTypes = [
    "Health Insurance",
    "Life Insurance",
    "Auto/Car Insurance",
    "Wealth & Asset Management",
  ];

  const inputCls = "w-full px-4 py-3 rounded-xl bg-black/30 border border-border focus:border-emerald focus:ring-2 focus:ring-emerald/30 outline-none transition-all text-foreground placeholder:text-muted-foreground/60";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
    const policyType = (form.elements.namedItem('policyType') as HTMLSelectElement).value;
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;

    try {
      // Use your backend API instead of Supervity directly
      const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      
      // Map policy type to backend format
      const policyTypeMap: Record<string, string> = {
        'Health Insurance': 'health',
        'Life Insurance': 'life',
        'Auto/Car Insurance': 'car',
        'Wealth & Asset Management': 'home',
      };
      
      // Calculate lead score based on form completeness
      let leadScore = 0.5; // Base score
      if (message && message.trim().length > 10) leadScore += 0.2;
      if (email.includes('@') && !email.endsWith('@gmail.com') && !email.endsWith('@yahoo.com')) leadScore += 0.15;
      if (phone.length >= 10) leadScore += 0.15;
      leadScore = Math.min(leadScore, 1.0);

      // Create payload for your backend API
      const payload = {
        policy_type: policyTypeMap[policyType] || 'unknown',
        contact: {
          name: fullName,
          email: email,
          phone: phone,
        },
        lead_score: leadScore,
      };

      console.log('Submitting to backend API:', `${BACKEND_API_URL}/api/intake/process-lead`);
      console.log('Payload:', payload);

      // Make request to your backend API
      const response = await fetch(`${BACKEND_API_URL}/api/intake/process-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Backend API error:', response.status, errorData);
        throw new Error(errorData.detail || `API request failed with status ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Lead processed successfully:', responseData);
      
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to submit form. Please try again.');
      console.error('Form submission error:', err);
    }
  };

  return (
    <section id="contact" className="px-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald mb-3">Get a Quote · File a Claim</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Reach a SecurePulse Specialist</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Send us your details via the form below — a dedicated advisor will respond within minutes.
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-5 md:p-8 shadow-[0_30px_80px_-20px_oklch(0_0_0/0.6)]">
          {submitted ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 animate-slide-up">
              <div className="h-16 w-16 rounded-full bg-emerald/15 flex items-center justify-center mb-4 glow-emerald">
                <CheckCircle2 className="h-8 w-8 text-emerald" />
              </div>
              <h3 className="text-2xl font-semibold">Lead Submitted Successfully</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                A SecurePulse specialist will contact you within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5 animate-slide-up">
              {error && (
                <div className="md:col-span-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Full Name</span>
                <input name="fullName" required className={inputCls} placeholder="Jane Doe" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Email</span>
                <input name="email" required type="email" className={inputCls} placeholder="jane@company.com" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Phone Number</span>
                <input name="phone" required className={inputCls} placeholder="+1 (555) 123-4567" />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Policy Type</span>
                <select name="policyType" required className={inputCls} defaultValue="">
                  <option value="" disabled>Select a policy…</option>
                  {policyTypes.map((p) => <option key={p} className="bg-card">{p}</option>)}
                </select>
              </label>
              <div className="md:col-span-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Message / Description</span>
                  <textarea name="message" rows={4} className={inputCls} placeholder="Briefly describe your needs or claim…" />
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-accent text-primary-foreground font-medium text-sm glow-emerald hover:scale-[1.02] transition-transform disabled:opacity-70"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Request a Callback <Send className="h-4 w-4" /></>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Contact Section ──────────────────────────────────────────────────────────
function ContactSection() {
  return (
    <section id="contact-info" className="px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-electric mb-3">Get in Touch</div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">We&apos;re here when you need us</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Reach a SecurePulse specialist directly — no menus, no wait queues.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="tel:9822983444"
            className="glass-strong rounded-2xl p-6 hover:border-emerald/40 hover:bg-emerald/5 transition-all group"
          >
            <Phone className="h-6 w-6 text-emerald mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">24/7 Helpline</div>
            <div className="text-lg font-semibold">98229 83444</div>
          </a>
          <a
            href="mailto:care@securepulse.com"
            className="glass-strong rounded-2xl p-6 hover:border-electric/40 hover:bg-electric/5 transition-all group"
          >
            <Mail className="h-6 w-6 text-electric mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email Support</div>
            <div className="text-lg font-semibold">care@securepulse.com</div>
          </a>
          <div className="glass-strong rounded-2xl p-6">
            <MapPin className="h-6 w-6 text-emerald mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Head Office</div>
            <div className="text-sm font-medium leading-relaxed">12 Marine Drive,<br />Mumbai 400020, India</div>
          </div>
          <div className="glass-strong rounded-2xl p-6">
            <Clock className="h-6 w-6 text-electric mb-3" />
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Office Hours</div>
            <div className="text-sm font-medium leading-relaxed">Mon – Sat<br />9:00 AM – 8:00 PM IST</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Chat Widget ──────────────────────────────────────────────────────────────
function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(genSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  // Submit collected chat data to backend API
  const submitChatData = async () => {
    if (leadSubmitted) return; // Already submitted
    
    try {
      const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      
      // Create a basic lead payload from chat data
      const payload = {
        policy_type: 'unknown', // Could be extracted from chat using AI
        contact: {
          name: 'Chat User', // Could be extracted from chat
          email: 'chat@example.com', // Should be collected in chat
          phone: '0000000000', // Should be collected in chat
        },
        lead_score: 0.4, // Lower score for chat leads without complete info
      };

      console.log('Submitting chatbot data to backend API');
      console.log('Payload:', payload);

      const response = await fetch(`${BACKEND_API_URL}/api/intake/process-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('Chatbot data submitted successfully');
        setLeadSubmitted(true);
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to submit chatbot data:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error submitting chatbot data:', error);
    }
  };

  const sendToAgent = async (userMsg: string | null) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
      }
      if (data.done) {
        setDone(true);
        // Submit chat data when conversation is done
        setTimeout(() => submitChatData(), 500);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    sendToAgent(null);
  };

  const send = (text: string) => {
    if (!text.trim() || loading || done) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    sendToAgent(text);
  };

  const handleReset = async () => {
    await fetch(`${API_URL}/api/chat/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setMessages([]);
    setDone(false);
    setStarted(false);
    setInput('');
    setLeadSubmitted(false);
  };

  const handleClose = () => {
    // Submit chat data when user closes the window if there are messages
    if (started && messages.length > 0 && !leadSubmitted) {
      submitChatData();
    }
    setOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open SecurePulse AI chat"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-accent flex items-center justify-center glow-emerald hover:scale-110 transition-transform"
      >
        {open ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageCircle className="h-6 w-6 text-primary-foreground" />}
        {!open && <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-electric ring-2 ring-background pulse-dot" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(380px,calc(100vw-3rem))] h-[540px] max-h-[calc(100vh-8rem)] rounded-3xl flex flex-col overflow-hidden animate-slide-up shadow-[0_30px_80px_-20px_oklch(0_0_0/0.7)] bg-card/95 backdrop-blur-2xl border border-border">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-accent">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">SecurePulse AI Assistant</div>
              <div className="text-xs text-white/80 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white pulse-dot" /> Online
              </div>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {!started ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/10">
                  <Shield className="h-8 w-8 text-emerald" />
                </div>
                <div>
                  <p className="font-semibold">Chat with our AI</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xs">Tell us about your insurance needs and we&apos;ll connect you with the right specialist.</p>
                </div>
                <button onClick={handleStart}
                  className="rounded-xl bg-gradient-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground glow-emerald hover:scale-105 transition-transform">
                  Start Chat
                </button>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm rounded-2xl animate-slide-up ${
                      m.role === 'user'
                        ? 'ml-auto bg-gradient-accent text-white rounded-tr-sm'
                        : 'bg-secondary text-foreground rounded-tl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {loading && (
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-3 inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground pulse-dot" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          {started && !done && (
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-border bg-card/80 backdrop-blur-sm flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 bg-background/60 border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/30 text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="h-10 w-10 shrink-0 rounded-full bg-gradient-accent flex items-center justify-center glow-emerald hover:scale-105 transition-transform"
                aria-label="Send"
              >
                <Send className="h-4 w-4 text-primary-foreground" />
              </button>
            </form>
          )}

          {done && (
            <div className="border-t border-border p-3 text-center bg-card/80 backdrop-blur-sm">
              <p className="mb-2 text-xs text-muted-foreground">Conversation complete</p>
              <button onClick={handleReset} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:border-emerald hover:text-emerald transition-colors">
                Start new chat
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen relative">
      <Navbar />
      <main>
        <Hero />
        <CompanySections />
        <IntakePortal />
        <ContactSection />
      </main>
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} SecurePulse Insurance · IRDAI Licensed</span>
          <span>24/7 Helpline · <a href="tel:9822983444" className="text-emerald hover:underline">98229 83444</a></span>
        </div>
      </footer>
      <ChatWidget />
    </div>
  )
}

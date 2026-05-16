'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Document {
  doc_id: string
  filename: string
  title: string
  uploaded_at: string
}

interface SearchResult {
  doc_id: string
  filename: string
  title: string
  chunk: string
  score: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (ext === 'docx' || ext === 'doc') return '📝'
  if (ext === 'md') return '📋'
  return '📃'
}

function scoreColor(score: number) {
  if (score >= 0.85) return 'text-brand-navy bg-[#F0F2FF] border-[#E2E6F8]'
  if (score >= 0.70) return 'text-brand-cornflower bg-[#F0F2FF] border-[#E2E6F8]'
  return 'text-brand-muted bg-white border-[#E2E6F8]'
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) { setFile(dropped); setTitle(dropped.name.replace(/\.[^.]+$/, '')) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) { setFile(picked); setTitle(picked.name.replace(/\.[^.]+$/, '')) }
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    setUploading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData()
    form.append('file', file)
    form.append('title', title.trim())

    try {
      const res = await fetch(`${API_URL}/api/playbook/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Upload failed (${res.status})`)
      }
      setSuccess(true)
      setFile(null)
      setTitle('')
      if (inputRef.current) inputRef.current.value = ''
      onUploaded()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all',
          dragging
            ? 'border-brand-navy bg-brand-light scale-[1.01]'
            : 'border-[#E2E6F8] bg-[#F8F9FF] hover:border-brand-cornflower hover:bg-brand-light'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-navy/10">
          <Icons.upload className="h-7 w-7 text-brand-navy" strokeWidth={1.5} />
        </div>
        {file ? (
          <div className="text-center">
            <p className="font-semibold text-brand-navy">{file.name}</p>
            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-brand-navy">Drop a file here or click to browse</p>
            <p className="mt-1 text-sm text-gray-500">PDF, DOCX, TXT, MD — up to 20 MB</p>
          </div>
        )}
      </div>

      {/* Title + upload button */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex gap-3"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title…"
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              className="shrink-0 bg-brand-navy text-white hover:bg-brand-navy-light"
            >
              {uploading ? (
                <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
              ) : (
                <><Icons.upload className="mr-2 h-4 w-4" />Upload</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-[#E2E6F8] bg-[#F0F2FF] px-4 py-3 text-sm text-brand-navy"
          >
            <Icons.alertCircle className="h-4 w-4 shrink-0 text-brand-cornflower" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-[#E2E6F8] bg-[#F0F2FF] px-4 py-3 text-sm text-brand-navy"
          >
            <Icons.checkCircle className="h-4 w-4 shrink-0 text-brand-cornflower" />
            Document uploaded and indexed successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Document Row ─────────────────────────────────────────────────────────────
function DocumentRow({ doc, onDeleted }: { doc: Document; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/playbook/documents/${doc.doc_id}`, { method: 'DELETE' })
      onDeleted()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-4 rounded-xl border border-[#E2E6F8] bg-white px-4 py-3 hover:border-brand-cornflower/40 transition-colors"
    >
      <span className="text-2xl">{fileIcon(doc.filename)}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-navy truncate">{doc.title}</p>
        <p className="text-xs text-gray-500 truncate">{doc.filename} · {formatDate(doc.uploaded_at)}</p>
      </div>
      {confirm ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-red-600">Delete?</span>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Icons.loader className="h-3 w-3 animate-spin" /> : 'Yes'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>No</Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirm(true)}
          className="shrink-0 text-gray-400 hover:text-red-600"
        >
          <Icons.trash className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  )
}

// ─── Search Panel ─────────────────────────────────────────────────────────────
function SearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    setSearched(false)
    try {
      const res = await fetch(`${API_URL}/api/playbook/search?q=${encodeURIComponent(query)}&top_k=6`)
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      const data = await res.json()
      setResults(data.results || [])
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search the playbook… e.g. 'objection handling for health insurance'"
          className="flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 bg-brand-navy text-white hover:bg-brand-navy-light"
        >
          {searching
            ? <Icons.loader className="h-4 w-4 animate-spin" />
            : <Icons.search className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#E2E6F8] bg-[#F0F2FF] px-4 py-3 text-sm text-brand-navy">
          <Icons.alertCircle className="h-4 w-4 text-brand-cornflower" />{error}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {searched && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-gray-500"
          >
            <Icons.search className="h-10 w-10 mb-3 text-gray-300" />
            <p className="font-medium">No results found</p>
            <p className="text-sm">Try a different query or upload more documents</p>
          </motion.div>
        )}

        {results.map((r, i) => (
          <motion.div
            key={`${r.doc_id}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-[#E2E6F8] bg-white p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{fileIcon(r.filename)}</span>
                <p className="font-semibold text-brand-navy truncate">{r.title}</p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                scoreColor(r.score)
              )}>
                {Math.round(r.score * 100)}% match
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{r.chunk}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlaybookPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'documents' | 'search'>('documents')

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/playbook/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
      }
    } catch {
      // silently fail — Qdrant may not be running locally
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-display-3 font-bold tracking-tight text-brand-navy">
          Sales Playbook
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Upload training documents, scripts, and guides. Search them semantically using AI.
        </p>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-[#E2E6F8] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/10">
            <Icons.upload className="h-5 w-5 text-brand-navy" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-brand-navy">Upload Document</h2>
            <p className="text-xs text-gray-500">PDF, DOCX, TXT, or Markdown — chunked &amp; indexed into Qdrant</p>
          </div>
        </div>
        <UploadZone onUploaded={fetchDocs} />
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-[#E2E6F8] bg-white shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[#E2E6F8]">
          {(['documents', 'search'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-b-2 border-brand-navy text-brand-navy bg-brand-light/50'
                  : 'text-gray-500 hover:text-brand-navy hover:bg-brand-light/30'
              )}
            >
              {t === 'documents'
                ? <><Icons.fileText className="h-4 w-4" />Documents ({docs.length})</>
                : <><Icons.search className="h-4 w-4" />Semantic Search</>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'documents' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Icons.loader className="h-7 w-7 animate-spin text-brand-cornflower" />
                </div>
              ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                  <Icons.fileText className="h-12 w-12 mb-3 text-gray-300" />
                  <p className="font-medium">No documents yet</p>
                  <p className="text-sm">Upload your first playbook document above</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {docs.map((doc) => (
                    <DocumentRow key={doc.doc_id} doc={doc} onDeleted={fetchDocs} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}

          {tab === 'search' && <SearchPanel />}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-4 rounded-xl border border-brand-cornflower/30 bg-brand-light p-4">
        <Icons.info className="h-5 w-5 shrink-0 text-brand-cornflower mt-0.5" strokeWidth={1.5} />
        <div className="text-sm text-brand-navy/80">
          <span className="font-semibold">How it works: </span>
          Documents are split into ~800-character chunks, embedded with Gemini
          <span className="font-mono text-xs mx-1">text-embedding-004</span>
          and stored in Qdrant. The semantic search finds the most relevant passages
          for any natural-language query — perfect for AI-assisted rep coaching.
        </div>
      </div>
    </div>
  )
}

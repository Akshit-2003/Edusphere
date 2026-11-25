import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import {
  Check,
  CheckCircle2,
  FileText,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { ApiError, api, currentUserId } from '../lib/api'
import type { Page } from '../types'

type ImportPhase = 'ready' | 'processing' | 'success'

interface ImportResult {
  document_id: number | null
  document_title: string
  page_count: number
  extracted_characters: number
  summary: string
  key_concepts: string[]
  flashcards_created: number
  preview: string
}

interface PDFUploadPageProps {
  setPage: (page: Page) => void
  onOpenDocument: (id: number) => void
}

const MAX_FILE_BYTES = 15 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PDFUploadPage({ setPage, onOpenDocument }: PDFUploadPageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<ImportPhase>('ready')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [options, setOptions] = useState({
    summary: true,
    flashcards: true,
    workspaceNote: true,
  })

  const chooseFile = (candidate: File | undefined) => {
    setError('')
    setResult(null)
    setPhase('ready')

    if (!candidate) return

    const isPdf = candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setFile(null)
      setError('Please select a PDF file. Other file types are not supported here.')
      return
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setFile(null)
      setError('This PDF is larger than 15 MB. Please choose a smaller document.')
      return
    }

    setFile(candidate)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  const handleUploadZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const resetImport = () => {
    setFile(null)
    setError('')
    setResult(null)
    setProgress(0)
    setPhase('ready')
    if (inputRef.current) inputRef.current.value = ''
  }

  const importPdf = async () => {
    if (!file) {
      setError('Choose a PDF first, then start the import.')
      return
    }

    const userId = currentUserId()
    if (!userId) {
      setError('Your session could not be found. Please sign in again and retry.')
      return
    }

    setError('')
    setProgress(8)
    setPhase('processing')

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(90, current + Math.max(2, Math.round((90 - current) / 5))))
    }, 420)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', String(userId))
      formData.append('generate_summary', String(options.summary))
      formData.append('generate_flashcards', String(options.flashcards))
      formData.append('save_as_note', String(options.workspaceNote))

      const imported = await api<ImportResult>('/pdf/import', {
        method: 'POST',
        body: formData,
      })

      window.clearInterval(progressTimer)
      setProgress(100)
      setResult(imported)
      setPhase('success')
    } catch (uploadError) {
      window.clearInterval(progressTimer)
      setProgress(0)
      setPhase('ready')
      setError(uploadError instanceof ApiError ? uploadError.message : 'The PDF could not be imported. Please check your connection and try again.')
    }
  }

  const processingLabel = progress < 35
    ? 'Uploading your PDF securely…'
    : progress < 78
      ? 'Reading pages and extracting useful text…'
      : 'Creating your study material…'

  if (phase === 'success' && result) {
    return (
      <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-[var(--bg-card)] to-sky-50 p-6 shadow-[0_18px_55px_-32px_rgba(16,185,129,0.55)] dark:border-emerald-800/60 dark:from-emerald-950/35 dark:to-sky-950/20 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                  <CheckCircle2 size={25} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Import complete</p>
                  <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-[var(--text-primary)]">{result.document_title}</h1>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Your material is ready to review, organise, and continue studying.</p>
                </div>
              </div>
              <button type="button" onClick={resetImport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm">
                <RefreshCw size={16} /> Import another
              </button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/20">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Pages read</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{result.page_count}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/20">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Text extracted</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{result.extracted_characters.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/20">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Flashcards made</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{result.flashcards_created}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Sparkles size={19} className="text-violet-500" />
                <h2 className="font-semibold">Study preview</h2>
              </div>
              {result.summary && (
                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-[var(--text-secondary)] dark:border-violet-900/60 dark:bg-violet-950/25">
                  <p className="mb-1 font-semibold text-violet-800 dark:text-violet-200">AI summary</p>
                  <p>{result.summary}</p>
                </div>
              )}
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{result.preview || 'The document has been saved and is ready in your workspace.'}</p>
              {result.key_concepts.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Key concepts</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.key_concepts.map((concept) => (
                      <span key={concept} className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">{concept}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            <aside className="flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm">
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <FolderOpen size={21} />
                </div>
                <h2 className="mt-4 font-semibold text-[var(--text-primary)]">Keep learning</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Open the imported note or continue from your workspace.</p>
              </div>
              <div className="mt-6 space-y-3">
                {result.document_id && (
                  <button type="button" onClick={() => onOpenDocument(result.document_id!)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700">
                    <FileText size={16} /> Open imported note
                  </button>
                )}
                <button type="button" onClick={() => setPage(result.flashcards_created ? 'flashcards' : 'workspace')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                  {result.flashcards_created ? 'Review flashcards' : 'Open workspace'}
                </button>
              </div>
            </aside>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_20px_60px_-42px_rgba(79,70,229,0.55)]">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-indigo-50 via-violet-50/70 to-sky-50 px-6 py-8 dark:from-indigo-950/30 dark:via-violet-950/20 dark:to-sky-950/20 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/75 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                  <Sparkles size={14} /> AI-powered study import
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--text-primary)]">Turn a PDF into study material</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Upload your lecture slides, reading, or handout. EduSphere extracts the text and can organise it into a workspace note, summary, and revision flashcards.</p>
              </div>
              <div className="hidden h-16 w-16 place-items-center rounded-3xl bg-white/80 text-indigo-600 shadow-sm dark:bg-slate-900/70 sm:grid">
                <FileText size={30} />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {error && (
              <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="rounded-lg p-0.5 transition hover:bg-rose-100 dark:hover:bg-rose-900/50"><X size={16} /></button>
              </div>
            )}

            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={handleFileChange} />
            <div
              role="button"
              tabIndex={0}
              onKeyDown={handleUploadZoneKeyDown}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false) }}
              onDrop={handleDrop}
              className={`group cursor-pointer rounded-3xl border-2 border-dashed px-5 py-10 text-center transition duration-200 sm:px-10 ${isDragging ? 'border-indigo-500 bg-indigo-50/75 scale-[1.01] dark:bg-indigo-950/30' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'}`}
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-indigo-100 text-indigo-600 transition group-hover:-translate-y-1 group-hover:scale-105 dark:bg-indigo-950/65 dark:text-indigo-300">
                <Upload size={28} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-[var(--text-primary)]">Drop your PDF here</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">or <span className="font-semibold text-indigo-600 dark:text-indigo-300">browse from your device</span></p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">PDF only · Up to 15 MB · Text-based documents work best</p>
            </div>

            {file && (
              <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><FileText size={21} /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{file.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatFileSize(file.size)} · Ready to import</p>
                  </div>
                </div>
                <button type="button" onClick={resetImport} className="inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 sm:self-auto"><X size={15} /> Remove</button>
              </div>
            )}

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Choose what to create</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">You stay in control of how this material is organised.</p>
                </div>
                <ShieldCheck size={21} className="shrink-0 text-emerald-500" aria-label="Secure import" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { key: 'workspaceNote', title: 'Workspace note', description: 'Save the extracted text as an editable note.', icon: FileText, accent: 'indigo' },
                  { key: 'summary', title: 'AI summary', description: 'Create a concise overview to review first.', icon: Sparkles, accent: 'violet' },
                  { key: 'flashcards', title: 'Revision cards', description: 'Generate key cards from the document.', icon: Check, accent: 'emerald' },
                ].map((option) => {
                  const selected = options[option.key as keyof typeof options]
                  const Icon = option.icon
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setOptions((current) => ({ ...current, [option.key]: !selected }))}
                      className={`relative rounded-2xl border p-4 text-left transition ${selected ? 'border-indigo-300 bg-indigo-50/70 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/25' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-indigo-200 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/15'}`}
                    >
                      <span className={`grid h-9 w-9 place-items-center rounded-xl ${option.accent === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' : option.accent === 'violet' ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'}`}><Icon size={18} /></span>
                      <span className="mt-3 block text-sm font-semibold text-[var(--text-primary)]">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{option.description}</span>
                      <span className={`absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-[var(--border)] bg-[var(--bg-card)] text-transparent'}`}><Check size={13} strokeWidth={3} /></span>
                    </button>
                  )
                })}
              </div>
            </div>

            {phase === 'processing' && (
              <div className="mt-7 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-indigo-800 dark:text-indigo-200"><LoaderCircle size={17} className="animate-spin" /> {processingLabel}</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950/70"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[var(--text-muted)]">Your file is validated before processing. Scanned PDFs without selectable text may need OCR first.</p>
              <button type="button" disabled={!file || phase === 'processing'} onClick={importPdf} className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                {phase === 'processing' ? <><LoaderCircle size={17} className="animate-spin" /> Processing…</> : <><Upload size={17} /> Import PDF</>}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

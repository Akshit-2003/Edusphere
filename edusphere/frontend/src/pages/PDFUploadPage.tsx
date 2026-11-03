import { useState, useRef } from 'react'
import { Upload, FileText, Check, Bot, CreditCard, HelpCircle, Share2 } from 'lucide-react'
import { api, currentUserId } from '../lib/api'
import type { Page } from '../types'

const steps = [
  { label: 'Extracting content', done: true },
  { label: 'Generating summary', done: true },
  { label: 'Finding key concepts', done: true },
  { label: 'Creating flashcards', done: false },
]

const keyConceptsData = ['TCP Three-Way Handshake', 'Congestion Control', 'Sliding Window', 'Flow Control', 'Error Detection', 'Retransmission']

export default function PDFUploadPage({ setPage }: { setPage: (page: Page) => void }) {
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload')
  const [drag, setDrag] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('Imported study document')
  const [savedDocument, setSavedDocument] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const startProcess = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a PDF smaller than 5 MB for this import.')
      return
    }
    setError('')
    setSavedDocument(false)
    setProgress(0)
    setFileName(file.name)
    setPhase('processing')
    let p = 0
    const iv = window.setInterval(async () => {
      p += 4
      setProgress(p)
      if (p >= 100) {
        window.clearInterval(iv)
        const userId = currentUserId()
        if (!userId) {
          setError('Your session expired. Please sign in again.')
          setPhase('upload')
          return
        }
        try {
          await api('/documents/', {
            method: 'POST',
            body: JSON.stringify({
              owner_id: userId,
              title: file.name,
              folder: 'PDF Imports',
              content: `PDF import: ${file.name}\nFile size: ${Math.ceil(file.size / 1024)} KB\n\nThis document was added from the PDF importer and is ready for study notes, flashcards, and quiz preparation.`,
            }),
          })
          setSavedDocument(true)
          setPhase('done')
        } catch {
          setError('The PDF reference could not be saved to your workspace. Please try again.')
          setPhase('upload')
        }
      }
    }, 80)
  }

  if (phase === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>PDF AI Processing</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Upload a PDF and let AI generate summaries, flashcards, and quizzes</p>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const file = e.dataTransfer.files[0]; if (file) startProcess(file) }}
          className="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all"
          style={{
            borderColor: drag ? 'var(--primary)' : 'var(--border)',
            background: drag ? 'var(--secondary-bg)' : 'var(--card)',
          }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--secondary-bg)' }}>
            <Upload size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="font-heading font-bold text-lg mb-2" style={{ color: 'var(--foreground)' }}>Drop your PDF here</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>or click to browse files</p>
          <button
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: '#fff' }}
            onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          >
            Browse Files
          </button>
          <p className="text-xs mt-4" style={{ color: 'var(--muted-foreground)' }}>Supports PDF up to 5MB</p>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) startProcess(file); event.currentTarget.value = '' }} />
        </div>
        {error && <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}
      </div>
    )
  }

  if (phase === 'processing') {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-96 page-enter">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--secondary-bg)' }}>
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3, borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        </div>
        <h2 className="font-heading font-bold text-xl mb-2" style={{ color: 'var(--foreground)' }}>Processing your PDF...</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>{fileName}</p>

        <div className="w-full max-w-xs mb-6">
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--muted)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--primary)' }} />
          </div>
          <div className="text-xs text-center font-mono" style={{ color: 'var(--muted-foreground)' }}>{progress}%</div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < Math.floor(progress / 25) ? 'bg-green-500' : 'border-2'}`} style={{ borderColor: 'var(--border)' }}>
                {i < Math.floor(progress / 25) && <Check size={11} className="text-white" />}
              </div>
              <span className="text-sm" style={{ color: i < Math.floor(progress / 25) ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--secondary-bg)' }}>
          <FileText size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl" style={{ color: 'var(--foreground)' }}>{fileName} — Import complete</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{savedDocument ? 'Saved to your PDF Imports workspace' : 'Processing complete'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { icon: Bot, label: 'Summary', color: '#4f46e5', action: () => document.getElementById('pdf-summary')?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: FileText, label: 'Key Concepts', color: '#8b5cf6', action: () => document.getElementById('pdf-summary')?.scrollIntoView({ behavior: 'smooth' }) },
          { icon: CreditCard, label: 'Open Flashcards', color: '#10b981', action: () => setPage('flashcards') },
          { icon: HelpCircle, label: 'Open Quiz', color: '#f59e0b', action: () => setPage('quiz') },
          { icon: Share2, label: 'Knowledge Graph', color: '#3b82f6', action: () => setPage('knowledge-graph') },
        ].map(({ icon: Icon, label, color, action }) => (
          <button key={label} onClick={action} className="flex items-center gap-3 p-4 rounded-xl border text-left hover:border-primary/50 transition-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{label}</span>
          </button>
        ))}
        <button onClick={() => setPhase('upload')} className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:border-primary/50 transition-all" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ef444415' }}>
            <Upload size={18} style={{ color: '#ef4444' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Upload Another</span>
        </button>
      </div>

      {/* Summary */}
      <div id="pdf-summary" className="rounded-xl border p-6 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="font-heading font-semibold mb-3" style={{ color: 'var(--foreground)' }}>AI Summary</h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--foreground)', opacity: 0.85 }}>
          This lecture covers TCP's connection-oriented nature and reliability mechanisms. Key topics include the three-way handshake for connection establishment, congestion control algorithms (Slow Start, AIMD), flow control via sliding windows, and error detection through checksums and ACK-based retransmission.
        </p>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Key Concepts</div>
          <div className="flex flex-wrap gap-2">
            {keyConceptsData.map(c => (
              <span key={c} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

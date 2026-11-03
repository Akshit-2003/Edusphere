import { useRef, useState } from 'react'
import { Search, FileText, CreditCard, HelpCircle, Video, Users } from 'lucide-react'
import type { Page } from '../types'
import { api, currentUserId } from '../lib/api'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: FileText },
  { id: 'flashcards', label: 'Flashcards', icon: CreditCard },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { id: 'concepts', label: 'Concepts', icon: Users },
  { id: 'events', label: 'Events', icon: Video },
]

const exampleSearches = ['TCP', 'DBMS', 'Machine Learning', 'Binary Search']

const typeIcon: Record<string, typeof FileText> = { notes: FileText, tasks: FileText, flashcards: CreditCard, quizzes: HelpCircle, concepts: Users, events: Video }
const typeColor: Record<string, string> = { notes: '#4f46e5', tasks: '#64748b', flashcards: '#10b981', quizzes: '#f59e0b', concepts: '#8b5cf6', events: '#3b82f6' }

interface SearchResult {
  id: number
  type: string
  title: string
  desc: string
  relevance: number
  subject: string
}

export default function SearchPage({ setPage, onOpenDocument }: { setPage: (p: Page) => void; onOpenDocument: (id: number) => void }) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const latestRequest = useRef(0)

  const filtered = results.filter(r => activeFilter === 'all' || r.type === activeFilter)

  const handleSearch = (value: string) => {
    const q = value.trim()
    setQuery(value)
    setSearched(Boolean(q))
    setError('')
    const userId = currentUserId()
    const requestId = ++latestRequest.current
    if (q && userId) {
      setSearching(true)
      api<{ results: { id: number; type: string; title: string; snippet: string }[] }>(`/search/?user_id=${userId}&q=${encodeURIComponent(q)}`)
        .then(response => {
          if (requestId !== latestRequest.current) return
          setResults(response.results.map(result => ({ ...result, desc: result.snippet, relevance: 100, subject: 'Your study data' })))
        })
        .catch(() => {
          if (requestId !== latestRequest.current) return
          setResults([])
          setError('Search could not reach your study data. Please try again.')
        })
        .finally(() => {
          if (requestId === latestRequest.current) setSearching(false)
        })
    } else {
      setSearching(false)
      setResults([])
    }
  }

  const openResult = (result: SearchResult) => {
    if (result.type === 'notes') return onOpenDocument(result.id)
    if (result.type === 'tasks') return setPage('planner')
    if (result.type === 'flashcards') return setPage('flashcards')
    if (result.type === 'quizzes') return setPage('quiz')
    if (result.type === 'concepts') return setPage('knowledge-graph')
    if (result.type === 'events') return setPage('calendar')
  }

  return (
    <div className="p-6 max-w-3xl mx-auto page-enter">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold mb-1" style={{ color: 'var(--foreground)' }}>Semantic Search</h1>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>AI-powered search across all your study materials</p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Ask a question or search your materials..."
          className="w-full pl-12 pr-4 py-4 rounded-xl border-2 text-base outline-none transition-all focus:border-primary"
          style={{ background: 'var(--card)', borderColor: query ? 'var(--primary)' : 'var(--border)', color: 'var(--foreground)' }}
          autoFocus
        />
        {query && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>AI Search</div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0"
            style={{
              background: activeFilter === f.id ? 'var(--primary)' : 'var(--muted)',
              color: activeFilter === f.id ? '#fff' : 'var(--muted-foreground)',
            }}
          >
            {f.icon && <f.icon size={13} />}
            {f.label}
          </button>
        ))}
      </div>

      {!searched ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>Try these searches</div>
          <div className="space-y-2">
            {exampleSearches.map(s => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-primary/50 transition-all"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                <Search size={15} style={{ color: 'var(--muted-foreground)' }} />
                <span className="text-sm">{s}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Found <strong style={{ color: 'var(--foreground)' }}>{filtered.length} results</strong> for "{query}"
          </div>
          <div className="space-y-3">
            {filtered.map((r, i) => {
              const Icon = typeIcon[r.type] || FileText
              return (
                <button
                  key={i}
                  onClick={() => openResult(r)}
                  className="w-full text-left p-5 rounded-xl border hover:border-primary/50 transition-all group"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${typeColor[r.type]}15` }}>
                      <Icon size={18} style={{ color: typeColor[r.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors" style={{ color: 'var(--foreground)' }}>{r.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${typeColor[r.type]}15`, color: typeColor[r.type] }}>{r.type}</span>
                      </div>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--muted-foreground)' }}>{r.desc}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{r.subject}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                            <div className="h-full rounded-full" style={{ width: `${r.relevance}%`, background: typeColor[r.type] }} />
                          </div>
                          <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>{r.relevance}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {searching && <p className="py-4 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Searching your saved study data…</p>}
          {!searching && error && <p className="rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}
          {!searching && !error && !filtered.length && <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>No saved notes, tasks, cards, quizzes, concepts, or events match this search.</p>}
        </div>
      )}
    </div>
  )
}

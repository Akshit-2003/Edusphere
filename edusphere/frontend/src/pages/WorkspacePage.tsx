import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, Plus, Star, FolderOpen, FileText, Search, MoreHorizontal, RefreshCw, CheckCircle2, ListTodo, Upload, CreditCard, Sparkles, CalendarDays, X } from 'lucide-react'
import type { CalendarEvent, Page, StudyDocument, StudyTask } from '../types'
import { api, ApiError, currentUserId } from '../lib/api'

const folderColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const cacheLifetime = 5 * 60 * 1000

type CachedDocuments = { savedAt: number; documents: StudyDocument[] }

function workspaceCacheKey(userId: number) {
  return `edusphere.workspace.v1.${userId}`
}

function readCachedDocuments(userId: number): StudyDocument[] | null {
  try {
    const stored = localStorage.getItem(workspaceCacheKey(userId))
    if (!stored) return null
    const cached = JSON.parse(stored) as CachedDocuments
    return Array.isArray(cached.documents) && Date.now() - cached.savedAt < cacheLifetime ? cached.documents : null
  } catch {
    return null
  }
}

function formatRelativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'Edited just now'
  if (minutes < 60) return `Edited ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `Edited ${hours}h ago` : `Edited ${Math.floor(hours / 24)}d ago`
}

export default function WorkspacePage({ onOpenDocument, setPage }: { onOpenDocument: (id: number) => void; setPage: (page: Page) => void }) {
  const [search, setSearch] = useState('')
  const [docs, setDocs] = useState<StudyDocument[]>([])
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [openDocumentMenu, setOpenDocumentMenu] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [quickTaskSubject, setQuickTaskSubject] = useState('')
  const [quickTaskDueAt, setQuickTaskDueAt] = useState('')
  const [savingQuickTask, setSavingQuickTask] = useState(false)

  const updateDocuments = useCallback((documents: StudyDocument[]) => {
    setDocs(documents)
    const userId = currentUserId()
    if (!userId) return
    try {
      localStorage.setItem(workspaceCacheKey(userId), JSON.stringify({ savedAt: Date.now(), documents }))
    } catch {
      // The server remains the source of truth if browser storage is unavailable.
    }
  }, [])

  const loadDocuments = useCallback(async (manual = false) => {
    const userId = currentUserId()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }
    const cached = readCachedDocuments(userId)
    if (cached && !manual) {
      setDocs(cached)
      setLoading(false)
    } else if (!manual) {
      setLoading(true)
    }
    setRefreshing(manual || Boolean(cached))
    setError('')
    try {
      updateDocuments(await api<StudyDocument[]>(`/documents/?user_id=${userId}`))
    } catch (requestError) {
      console.error('Unable to load workspace:', requestError)
      if (!cached) setError('Your workspace could not be loaded. Check that the backend is running and try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [updateDocuments])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const loadStudyOverview = useCallback(async () => {
    const userId = currentUserId()
    if (!userId) {
      setOverviewLoading(false)
      return
    }
    setOverviewLoading(true)
    try {
      const [storedTasks, storedEvents] = await Promise.all([
        api<StudyTask[]>(`/study-tasks/?user_id=${userId}`),
        api<CalendarEvent[]>(`/events/?user_id=${userId}`),
      ])
      setTasks(storedTasks)
      setEvents(storedEvents)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Your study overview could not be loaded. Please try again.')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStudyOverview()
  }, [loadStudyOverview])

  const filtered = useMemo(() => docs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase())
    const matchFolder = !activeFolder || d.folder === activeFolder
    return matchSearch && matchFolder
  }), [activeFolder, docs, search])
  const folders = useMemo(() => Array.from(new Set(docs.map(document => document.folder))).map((name, index) => ({
    name,
    docs: docs.filter(document => document.folder === name).length,
    color: folderColors[index % folderColors.length],
  })), [docs])

  const toggleStar = async (document: StudyDocument) => {
    const nextStarred = !document.is_starred
    const before = docs
    updateDocuments(docs.map(item => item.id === document.id ? { ...item, is_starred: nextStarred } : item))

    try {
      const updated = await api<StudyDocument>(`/documents/${document.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_starred: nextStarred }),
      })
      updateDocuments(docs.map(item => item.id === document.id ? updated : item))
    } catch (error) {
      console.error('Unable to update document favorite:', error)
      updateDocuments(before)
      setError('Could not update the favorite. Please try again.')
    }
  }

  const createFolder = async () => {
    const folder = window.prompt('New folder name')?.trim()
    const userId = currentUserId()
    if (!folder || !userId) return
    try {
      const created = await api<StudyDocument>('/documents/', {
        method: 'POST',
        body: JSON.stringify({ owner_id: userId, title: 'Untitled note', content: '', folder }),
      })
      updateDocuments([created, ...docs])
      setActiveFolder(folder)
      setNotice(`“${folder}” is ready with its first note.`)
    } catch (error) {
      console.error('Unable to create folder:', error)
      setError('The folder could not be created. Please try again.')
    }
  }

  const createDocument = async () => {
    const userId = currentUserId()
    if (!userId) return
    try {
      const created = await api<StudyDocument>('/documents/', {
        method: 'POST',
        body: JSON.stringify({ owner_id: userId, title: 'Untitled note', content: '', folder: activeFolder ?? 'General' }),
      })
      updateDocuments([created, ...docs])
      onOpenDocument(created.id)
    } catch (error) {
      console.error('Unable to create document:', error)
      setError('A new document could not be created. Please try again.')
    }
  }

  const renameDocument = async (document: StudyDocument) => {
    const title = window.prompt('Document title', document.title)?.trim()
    if (!title || title === document.title) { setOpenDocumentMenu(null); return }
    try {
      const updated = await api<StudyDocument>(`/documents/${document.id}`, { method: 'PUT', body: JSON.stringify({ title }) })
      updateDocuments(docs.map(item => item.id === document.id ? updated : item))
    } catch (error) {
      console.error('Unable to rename document:', error)
      setError('The document could not be renamed. Please try again.')
    } finally {
      setOpenDocumentMenu(null)
    }
  }

  const deleteDocument = async (document: StudyDocument) => {
    if (!window.confirm(`Delete “${document.title}”? This cannot be undone.`)) return
    try {
      await api<void>(`/documents/${document.id}`, { method: 'DELETE' })
      updateDocuments(docs.filter(item => item.id !== document.id))
      setNotice(`“${document.title}” was deleted.`)
    } catch (error) {
      console.error('Unable to delete document:', error)
      setError('The document could not be deleted. Please try again.')
    } finally {
      setOpenDocumentMenu(null)
    }
  }

  const activeTask = useMemo(() => {
    const pending = tasks.filter(task => task.status !== 'done')
    return [...pending].sort((left, right) => {
      const leftRank = left.status === 'inprogress' ? 0 : left.status === 'review' ? 1 : 2
      const rightRank = right.status === 'inprogress' ? 0 : right.status === 'review' ? 1 : 2
      if (leftRank !== rightRank) return leftRank - rightRank
      const leftDue = left.due_at ? new Date(left.due_at).getTime() : Number.MAX_SAFE_INTEGER
      const rightDue = right.due_at ? new Date(right.due_at).getTime() : Number.MAX_SAFE_INTEGER
      return leftDue - rightDue
    })[0] ?? null
  }, [tasks])

  const quickNotes = useMemo(() => [...docs]
    .sort((left, right) => Number(right.is_starred) - Number(left.is_starred) || new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
    .slice(0, 4), [docs])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events.filter(event => new Date(event.starts_at).getTime() >= now)
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime())
      .slice(0, 3)
  }, [events])

  const completeActiveTask = async () => {
    if (!activeTask) return
    setError('')
    try {
      const updated = await api<StudyTask>(`/study-tasks/${activeTask.id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) })
      setTasks(previous => previous.map(task => task.id === updated.id ? updated : task))
      setNotice(`“${updated.title}” marked complete.`)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The task could not be updated. Please try again.')
    }
  }

  const createQuickTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userId = currentUserId()
    const title = quickTaskTitle.trim()
    if (!userId || !title) return
    if (quickTaskDueAt && Number.isNaN(new Date(quickTaskDueAt).getTime())) {
      setError('Choose a valid due date and time.')
      return
    }
    setSavingQuickTask(true)
    setError('')
    try {
      const created = await api<StudyTask>('/study-tasks/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, title, subject: quickTaskSubject.trim() || null, priority: 'medium', status: 'todo', due_at: quickTaskDueAt || null }),
      })
      setTasks(previous => [created, ...previous])
      setQuickTaskTitle('')
      setQuickTaskSubject('')
      setQuickTaskDueAt('')
      setShowQuickTask(false)
      setNotice(`“${created.title}” was added to your planner.`)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The task could not be saved. Please try again.')
    } finally {
      setSavingQuickTask(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Workspace sidebar */}
      <aside className="hidden md:flex w-56 border-r shrink-0 flex-col p-3 overflow-y-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>My Workspace</div>
          <button
            className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${!activeFolder ? 'bg-muted' : 'hover:bg-muted'}`}
            style={{ color: 'var(--foreground)' }}
            onClick={() => setActiveFolder(null)}
          >
            All Documents
          </button>
        </div>
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Folders</div>
          {folders.map(f => (
            <button
              key={f.name}
              onClick={() => setActiveFolder(f.name === activeFolder ? null : f.name)}
              className={`w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all ${activeFolder === f.name ? 'bg-muted' : 'hover:bg-muted'}`}
              style={{ color: 'var(--foreground)' }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{f.docs}</span>
            </button>
          ))}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Favorites</div>
          {docs.filter(d => d.is_starred).map(d => (
            <button
              key={d.id}
              onClick={() => onOpenDocument(d.id)}
              className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-muted transition-all"
              style={{ color: 'var(--foreground)' }}
            >
              <Star size={13} style={{ color: '#f59e0b' }} />
              <span className="truncate">{d.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Knowledge workspace</p>
            <h1 className="font-heading text-2xl font-bold sm:text-3xl" style={{ color: 'var(--foreground)' }}>{activeFolder ?? 'All documents'}</h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Your notes are saved securely in your Edusphere workspace.</p>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <button onClick={() => void loadDocuments(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[['TOTAL NOTES', docs.length], ['FOLDERS', folders.length], ['FAVORITES', docs.filter(document => document.is_starred).length]].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border p-3 sm:p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><p className="text-[10px] font-semibold tracking-wide sm:text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl" style={{ color: 'var(--foreground)' }}>{value}</p></div>
          ))}
        </div>
        <div className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-2xl border" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, var(--card)), var(--card))', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><ListTodo size={16} /> Active focus</div>{overviewLoading ? <div className="h-7 w-2/3 animate-pulse rounded" style={{ background: 'var(--muted)' }} /> : activeTask ? <><h2 className="truncate text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{activeTask.title}</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>{activeTask.subject || 'General study'} · {activeTask.estimate_minutes ? `${activeTask.estimate_minutes} min estimate` : activeTask.due_at ? `Due ${new Date(activeTask.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No deadline set'}</p></> : <><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Your desk is clear</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>Add a focused task and it will appear here.</p></>}</div>
                {activeTask ? <button onClick={() => void completeActiveTask()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ background: 'var(--primary)', color: '#fff' }}><CheckCircle2 size={16} /> Complete</button> : <button onClick={() => setShowQuickTask(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={16} /> Add task</button>}
              </div>
              {activeTask && <div className="flex items-center justify-between border-t px-5 py-3 text-xs sm:px-6" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}><span>{tasks.filter(task => task.status !== 'done').length} open planner task{tasks.filter(task => task.status !== 'done').length === 1 ? '' : 's'}</span><button onClick={() => setPage('planner')} className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>Open planner →</button></div>}
            </div>

            <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Quick access</p><p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Pinned and recently edited notes</p></div><button onClick={() => setActiveFolder(null)} className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>View all</button></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{quickNotes.map(document => <button key={document.id} onClick={() => onOpenDocument(document.id)} className="flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/50" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}><div className="rounded-lg p-2" style={{ background: document.is_starred ? '#f59e0b18' : 'var(--card)', color: document.is_starred ? '#d97706' : 'var(--primary)' }}>{document.is_starred ? <Star size={15} fill="currentColor" /> : <FileText size={15} />}</div><div className="min-w-0"><p className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>{document.title}</p><p className="truncate text-xs" style={{ color: 'var(--muted-foreground)' }}>{document.folder} · {formatRelativeTime(document.updated_at)}</p></div></button>)}{!loading && !quickNotes.length && <button onClick={() => void createDocument()} className="rounded-xl border border-dashed p-4 text-left text-sm hover:border-primary/50" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>Create your first quick note</button>}</div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><p className="mb-3 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Mini tools</p><div className="grid grid-cols-2 gap-2"><button onClick={() => setShowQuickTask(true)} className="rounded-xl border p-3 text-left transition-colors hover:border-primary/50" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><Plus size={16} style={{ color: 'var(--primary)' }} /><p className="mt-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>New task</p></button><button onClick={() => void createDocument()} className="rounded-xl border p-3 text-left transition-colors hover:border-primary/50" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><FileText size={16} style={{ color: '#10b981' }} /><p className="mt-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Quick note</p></button><button onClick={() => setPage('pdf-upload')} className="rounded-xl border p-3 text-left transition-colors hover:border-primary/50" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><Upload size={16} style={{ color: '#f59e0b' }} /><p className="mt-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Import PDF</p></button><button onClick={() => setPage('flashcards')} className="rounded-xl border p-3 text-left transition-colors hover:border-primary/50" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><CreditCard size={16} style={{ color: '#8b5cf6' }} /><p className="mt-2 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>Revise cards</p></button></div></div>
            <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Upcoming reminders</p><CalendarDays size={16} style={{ color: 'var(--primary)' }} /></div><div className="space-y-2">{overviewLoading && <div className="h-12 animate-pulse rounded-lg" style={{ background: 'var(--muted)' }} />}{!overviewLoading && upcoming.map(event => <button key={event.id} onClick={() => setPage('calendar')} className="w-full rounded-xl border p-3 text-left hover:border-primary/50" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><p className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>{event.title}</p><p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{new Date(event.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {event.event_type}</p></button>)}{!overviewLoading && !upcoming.length && <p className="rounded-xl border border-dashed p-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>No upcoming events. Add one in Calendar.</p>}</div></div>
            <button onClick={() => setPage('ai-assistant')} className="w-full rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #4f46e515, #8b5cf615)', borderColor: 'var(--primary)30' }}><div className="flex items-center gap-2"><Sparkles size={17} style={{ color: 'var(--accent)' }} /><span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Ask EduSphere AI</span></div><p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>Turn your notes and tasks into a study plan.</p></button>
          </aside>
        </div>
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="w-full sm:flex-1 relative sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <button
            onClick={() => void createDocument()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            <Plus size={15} /> New Document
          </button>
          <button onClick={() => void createFolder()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <FolderOpen size={15} /> New Folder
          </button>
        </div>

        {notice && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #10b981 12%, var(--card))', color: '#047857' }}>{notice}</div>}
        {error && <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--card))', color: '#dc2626' }}><AlertCircle size={16} />{error}</div>}

        {/* Folder grid */}
        {!activeFolder && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted-foreground)' }}>FOLDERS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {folders.map(f => (
                <button
                  key={f.name}
                  onClick={() => setActiveFolder(f.name)}
                  className="text-left p-4 rounded-xl border hover:border-primary/50 transition-all group"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <FolderOpen size={24} className="mb-2" style={{ color: f.color }} />
                  <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{f.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{f.docs} documents</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted-foreground)' }}>
            {activeFolder ? activeFolder.toUpperCase() : 'RECENT DOCUMENTS'}
          </h3>
          <div className="space-y-2">
            {loading && [0, 1, 2].map(item => <div key={item} className="h-20 animate-pulse rounded-xl" style={{ background: 'var(--muted)' }} />)}
            {!loading && filtered.map(d => (
              <div
                key={d.id}
                className="relative flex items-center gap-4 p-4 rounded-xl border hover:border-primary/40 transition-all cursor-pointer group"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                onClick={() => onOpenDocument(d.id)}
              >
                <FileText size={18} style={{ color: 'var(--muted-foreground)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-primary transition-colors" style={{ color: 'var(--foreground)' }}>{d.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{d.folder} · {formatRelativeTime(d.updated_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={event => { event.stopPropagation(); void toggleStar(d) }}
                    className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <Star size={15} style={{ color: d.is_starred ? '#f59e0b' : 'var(--muted-foreground)', fill: d.is_starred ? '#f59e0b' : 'none' }} />
                  </button>
                  <button onClick={event => { event.stopPropagation(); setOpenDocumentMenu(openDocumentMenu === d.id ? null : d.id) }} aria-label={`Open actions for ${d.title}`} className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted-foreground)' }}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {openDocumentMenu === d.id && (
                  <div onClick={event => event.stopPropagation()} className="absolute right-3 top-12 z-20 w-32 rounded-lg border py-1 shadow-lg" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                    <button onClick={() => void renameDocument(d)} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted" style={{ color: 'var(--foreground)' }}>Rename</button>
                    <button onClick={() => void deleteDocument(d)} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted" style={{ color: '#ef4444' }}>Delete</button>
                  </div>
                )}
              </div>
            ))}
            {!loading && !filtered.length && <div className="rounded-xl border border-dashed px-5 py-12 text-center" style={{ borderColor: 'var(--border)' }}><FolderOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--muted-foreground)' }} /><p className="font-medium" style={{ color: 'var(--foreground)' }}>{search ? 'No matching documents' : 'Your workspace is ready'}</p><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>{search ? 'Try a different search term.' : 'Create your first note to start working.'}</p></div>}
          </div>
        </div>
        </div>
      </div>
      {showQuickTask && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => !savingQuickTask && setShowQuickTask(false)}><form onSubmit={event => void createQuickTask(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-lg rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Workspace shortcut</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Add a focused task</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>This is saved directly to your study planner.</p></div><button type="button" onClick={() => setShowQuickTask(false)} disabled={savingQuickTask} aria-label="Close task form" className="rounded-lg p-2 hover:bg-muted disabled:opacity-50" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button></div><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Task title <span style={{ color: '#dc2626' }}>*</span></span><input required autoFocus value={quickTaskTitle} onChange={event => setQuickTaskTitle(event.target.value)} placeholder="e.g. Finish DBMS revision" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Subject</span><input value={quickTaskSubject} onChange={event => setQuickTaskSubject(event.target.value)} placeholder="Optional" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Due date</span><input type="datetime-local" value={quickTaskDueAt} onChange={event => setQuickTaskDueAt(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label></div></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowQuickTask(false)} disabled={savingQuickTask} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={savingQuickTask} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={15} />{savingQuickTask ? 'Saving…' : 'Add task'}</button></div></form></div>}
    </div>
  )
}

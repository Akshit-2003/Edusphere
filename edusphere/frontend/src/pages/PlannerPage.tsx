import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Flag, Clock, MoreHorizontal, X } from 'lucide-react'
import { api, ApiError, currentUserId } from '../lib/api'
import type { StudyTask } from '../types'

const emptyColumns: Record<string, StudyTask[]> = { todo: [], inprogress: [], review: [], done: [] }

const cols = [
  { id: 'todo', label: 'To Do', color: '#64748b' },
  { id: 'inprogress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#3b82f6' },
  { id: 'done', label: 'Done', color: '#10b981' },
] as const

const priorityColor = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

type TaskStatus = StudyTask['status']
type TaskForm = {
  title: string
  description: string
  subject: string
  priority: StudyTask['priority']
  status: TaskStatus
  estimateMinutes: string
  dueAt: string
}

const newTaskForm = (status: TaskStatus): TaskForm => ({
  title: '', description: '', subject: '', priority: 'medium', status, estimateMinutes: '', dueAt: '',
})

export default function PlannerPage() {
  const [cols2, setCols2] = useState(emptyColumns)
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [openTaskMenu, setOpenTaskMenu] = useState<number | null>(null)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState<TaskForm>(newTaskForm('todo'))
  const [savingTask, setSavingTask] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setPageError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }
    let cancelled = false
    api<StudyTask[]>(`/study-tasks/?user_id=${userId}`).then(tasks => {
      if (cancelled) return
      setCols2(tasks.reduce<Record<string, StudyTask[]>>((groups, task) => {
        groups[task.status].push(task)
        return groups
      }, { todo: [], inprogress: [], review: [], done: [] }))
    }).catch(() => {
      if (!cancelled) setPageError('Your planner could not be loaded. Please refresh and try again.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const moveTask = async (taskId: number, toCol: string) => {
    const before = cols2
    setCols2(prev => {
      const next = { ...prev }
      let task: StudyTask | undefined
      for (const col of Object.keys(next)) {
        const idx = next[col].findIndex(t => t.id === taskId)
        if (idx !== -1) { task = next[col][idx]; next[col] = next[col].filter(t => t.id !== taskId); break }
      }
      if (task) next[toCol] = [...next[toCol], task]
      return next
    })
    try {
      await api<StudyTask>(`/study-tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: toCol }) })
    } catch {
      setCols2(before)
      setPageError('The task status could not be updated. Please try again.')
    }
  }

  const openTaskForm = (status: TaskStatus = 'todo') => {
    setTaskForm(newTaskForm(status))
    setFormError('')
    setShowTaskForm(true)
  }

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = taskForm.title.trim()
    const userId = currentUserId()
    if (!title) {
      setFormError('Add a task title before saving.')
      return
    }
    if (!userId) {
      setFormError('Your session has expired. Please sign in again.')
      return
    }
    const estimateMinutes = taskForm.estimateMinutes.trim() ? Number(taskForm.estimateMinutes) : null
    if (estimateMinutes !== null && (!Number.isInteger(estimateMinutes) || estimateMinutes < 1)) {
      setFormError('Estimated time must be a whole number of at least 1 minute.')
      return
    }
    const dueAt = taskForm.dueAt ? new Date(taskForm.dueAt) : null
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      setFormError('Choose a valid due date and time, or clear the field.')
      return
    }

    setSavingTask(true)
    setFormError('')
    try {
      const task = await api<StudyTask>('/study-tasks/', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          title,
          description: taskForm.description.trim() || null,
          subject: taskForm.subject.trim() || null,
          priority: taskForm.priority,
          status: taskForm.status,
          estimate_minutes: estimateMinutes,
          due_at: dueAt?.toISOString() ?? null,
        }),
      })
      setCols2(previous => ({ ...previous, [task.status]: [task, ...(previous[task.status] ?? [])] }))
      setNotice(`“${task.title}” was added to ${cols.find(column => column.id === task.status)?.label ?? 'the planner'}.`)
      setShowTaskForm(false)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'The task could not be saved. Please try again.')
    } finally {
      setSavingTask(false)
    }
  }

  const deleteTask = async (taskId: number) => {
    if (!window.confirm('Delete this task?')) return
    const before = cols2
    setCols2(previous => Object.fromEntries(
      Object.entries(previous).map(([column, tasks]) => [column, tasks.filter(task => task.id !== taskId)])
    ) as Record<string, StudyTask[]>)
    setOpenTaskMenu(null)
    try {
      await api<void>(`/study-tasks/${taskId}`, { method: 'DELETE' })
    } catch {
      setCols2(before)
      setPageError('The task could not be deleted. Please try again.')
    }
  }

  const subjects = Array.from(new Set(Object.values(cols2).flat().map(task => task.subject).filter(Boolean))) as string[]
  const visibleTasks = (tasks: StudyTask[]) => tasks.filter(task =>
    (subjectFilter === 'all' || task.subject === subjectFilter)
    && (priorityFilter === 'all' || task.priority === priorityFilter)
  )

  return (
    <div className="min-h-full flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Study Planner</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Organize tasks across your study sessions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="min-w-0 flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <option value="all">All Subjects</option>
            {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} className="min-w-0 flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button onClick={() => openTaskForm()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #10b981 12%, var(--card))', color: '#047857' }}>{notice}</div>}
      {pageError && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--card))', color: '#dc2626' }}><span>{pageError}</span><button onClick={() => setPageError('')} className="shrink-0 text-xs font-medium underline">Dismiss</button></div>}

      {/* Kanban board */}
      <div className="-mx-4 flex min-h-[31rem] flex-1 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {cols.map(col => (
          <div
            key={col.id}
            className="flex h-[30rem] w-[calc(100vw-2rem)] max-w-72 flex-shrink-0 flex-col overflow-hidden rounded-xl sm:w-72"
            style={{ background: 'var(--muted)' }}
            onDragOver={e => { e.preventDefault(); setOver(col.id) }}
            onDrop={() => { if (dragging) { void moveTask(dragging, col.id); setDragging(null); setOver(null) } }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: `2px solid ${col.color}20` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{col.label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: `${col.color}20`, color: col.color }}>
                  {visibleTasks(cols2[col.id]).length}
                </span>
              </div>
              <button onClick={() => openTaskForm(col.id)} aria-label={`Add task to ${col.label}`} className="p-1 rounded hover:bg-muted transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                <Plus size={15} />
              </button>
            </div>

            {/* Tasks */}
            <div
              className="flex-1 overflow-y-auto p-2 space-y-2 transition-all"
              style={{ background: over === col.id && dragging ? `${col.color}08` : undefined }}
            >
              {loading && [0, 1, 2].map(item => <div key={item} className="h-28 animate-pulse rounded-xl" style={{ background: 'var(--card)' }} />)}
              {!loading && visibleTasks(cols2[col.id]).map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => { setDragging(null); setOver(null) }}
                  className="kanban-card relative rounded-xl p-3.5 border cursor-grab group transition-all hover:shadow-md hover:border-primary/30"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: dragging === task.id ? 0.5 : 1 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--foreground)' }}>{task.title}</p>
                    <button onClick={() => setOpenTaskMenu(openTaskMenu === task.id ? null : task.id)} aria-label={`Open actions for ${task.title}`} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                  {openTaskMenu === task.id && (
                    <div className="absolute right-3 top-9 z-20 w-32 rounded-lg border py-1 shadow-lg" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                      {col.id !== 'done' && <button onClick={() => { void moveTask(task.id, 'done'); setOpenTaskMenu(null) }} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted" style={{ color: 'var(--foreground)' }}>Mark done</button>}
                      <button onClick={() => void deleteTask(task.id)} className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted" style={{ color: '#ef4444' }}>Delete task</button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs mb-2.5" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)' }}>{task.subject ?? 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      <Clock size={11} />
                      <span>{task.estimate_minutes ? `${task.estimate_minutes}m` : 'No estimate'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}</span>
                      <Flag size={11} style={{ color: priorityColor[task.priority] }} />
                    </div>
                  </div>
                </div>
              ))}

              {!loading && visibleTasks(cols2[col.id]).length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{cols2[col.id].length ? 'No tasks match these filters' : 'Drop tasks here'}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showTaskForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => !savingTask && setShowTaskForm(false)}>
          <form
            onSubmit={event => void createTask(event)}
            onMouseDown={event => event.stopPropagation()}
            className="max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto overscroll-contain rounded-t-2xl border p-5 pb-6 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:rounded-2xl sm:p-6"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="new-task-heading"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Planner</p><h2 id="new-task-heading" className="mt-0.5 text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Add a study task</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>Add the details once—your task is saved directly to your planner.</p></div>
              <button type="button" onClick={() => setShowTaskForm(false)} disabled={savingTask} aria-label="Close task form" className="rounded-lg p-2 hover:bg-muted disabled:opacity-50" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Task title <span style={{ color: '#dc2626' }}>*</span></span><input autoFocus required value={taskForm.title} onChange={event => setTaskForm(form => ({ ...form, title: event.target.value }))} placeholder="e.g. Finish calculus problem set" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Description</span><textarea value={taskForm.description} onChange={event => setTaskForm(form => ({ ...form, description: event.target.value }))} placeholder="What needs to be completed?" rows={3} className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Subject</span><input value={taskForm.subject} onChange={event => setTaskForm(form => ({ ...form, subject: event.target.value }))} placeholder="e.g. Mathematics" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Priority</span><select value={taskForm.priority} onChange={event => setTaskForm(form => ({ ...form, priority: event.target.value as StudyTask['priority'] }))} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Board column</span><select value={taskForm.status} onChange={event => setTaskForm(form => ({ ...form, status: event.target.value as TaskStatus }))} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{cols.map(column => <option key={column.id} value={column.id}>{column.label}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Estimated time (minutes)</span><input type="number" min="1" step="1" value={taskForm.estimateMinutes} onChange={event => setTaskForm(form => ({ ...form, estimateMinutes: event.target.value }))} placeholder="e.g. 45" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label>
              </div>
              <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Due date and time</span><input type="datetime-local" value={taskForm.dueAt} onChange={event => setTaskForm(form => ({ ...form, dueAt: event.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label>
            </div>

            {formError && <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--card))', color: '#dc2626' }}>{formError}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowTaskForm(false)} disabled={savingTask} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button type="submit" disabled={savingTask} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={15} />{savingTask ? 'Saving…' : 'Add task'}</button></div>
          </form>
        </div>
      )}
    </div>
  )
}

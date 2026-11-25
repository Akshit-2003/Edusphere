import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Pencil, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { api, ApiError, currentUserId } from '../lib/api'
import type { CalendarEvent } from '../types'

type CalendarView = 'month' | 'week' | 'day'
type EventType = 'study' | 'class' | 'exam' | 'deadline'
type EventPriority = 'low' | 'medium' | 'high'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 14 }, (_, index) => index + 7)
const eventTypes: { value: EventType; label: string; color: string }[] = [
  { value: 'study', label: 'Study session', color: '#4f46e5' },
  { value: 'class', label: 'Class', color: '#0284c7' },
  { value: 'exam', label: 'Exam', color: '#dc2626' },
  { value: 'deadline', label: 'Deadline', color: '#d97706' },
]
const priorities: { value: EventPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
]

function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setDate(next.getDate() + amount); return next }
function isSameDay(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate() }
function toDateTimeLocal(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16) }
function formatTime(value: string) { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
function typeMeta(value: string) { return eventTypes.find(item => item.value === value) ?? eventTypes[0] }
function priorityOf(event: CalendarEvent): EventPriority { return event.priority ?? 'medium' }
function priorityMeta(value: EventPriority) { return priorities.find(item => item.value === value) ?? priorities[1] }
function sortEvents(events: CalendarEvent[]) { return [...events].sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()) }

function EventPill({ event, onOpen, compact = false, showTime = false }: { event: CalendarEvent; onOpen: (event: CalendarEvent) => void; compact?: boolean; showTime?: boolean }) {
  const category = typeMeta(event.event_type)
  const priority = priorityMeta(priorityOf(event))
  const color = event.color || category.color
  const detail = `${event.title} · ${category.label} · ${formatTime(event.starts_at)}${event.ends_at ? `–${formatTime(event.ends_at)}` : ''} · ${priority.label} priority`
  return <button
    type="button" title={detail} onClick={click => { click.stopPropagation(); onOpen(event) }}
    className={`group relative flex w-full items-center gap-1.5 rounded-md border border-transparent text-left font-medium transition-all hover:-translate-y-px hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${compact ? 'px-1.5 py-1 text-[11px]' : 'px-2 py-1.5 text-xs'}`}
    style={{ background: `${color}14`, color, borderColor: `${color}28` }}
  >
    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: priority.color }} />
    {showTime && <span className="shrink-0 opacity-80">{formatTime(event.starts_at)}</span>}
    <span className="truncate">{event.title}</span>
    <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-0 z-30 hidden w-56 rounded-lg border px-2.5 py-2 text-xs font-normal leading-5 shadow-xl group-hover:block" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
      <strong className="block truncate">{event.title}</strong><span style={{ color: 'var(--muted-foreground)' }}>{formatTime(event.starts_at)}{event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''} · {category.label}</span>
    </span>
  </button>
}

export default function CalendarPage() {
  const today = startOfDay(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | EventPriority>('all')
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState<EventType>('study')
  const [eventPriorityValue, setEventPriorityValue] = useState<EventPriority>('medium')
  const [eventColor, setEventColor] = useState(eventTypes[0].color)
  const [eventStart, setEventStart] = useState(() => toDateTimeLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0)))
  const [eventEnd, setEventEnd] = useState(() => toDateTimeLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0)))
  const [savingEvent, setSavingEvent] = useState(false)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [formError, setFormError] = useState('')

  const loadEvents = useCallback(async () => {
    const userId = currentUserId()
    if (!userId) { setPageError('Your session has expired. Please sign in again.'); setLoading(false); return }
    setLoading(true); setPageError('')
    try { setEvents(sortEvents(await api<CalendarEvent[]>(`/calendar-events/?user_id=${userId}`))) }
    catch (error) { setPageError(error instanceof ApiError ? error.message : 'Your calendar could not be loaded. Please try again.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadEvents() }, [loadEvents])

  const filteredEvents = useMemo(() => events.filter(event => (typeFilter === 'all' || event.event_type === typeFilter) && (priorityFilter === 'all' || priorityOf(event) === priorityFilter)), [events, priorityFilter, typeFilter])
  const weekStart = useMemo(() => addDays(selected, -selected.getDay()), [selected])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const monthDates = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    return Array.from({ length: 42 }, (_, index) => addDays(first, index - first.getDay()))
  }, [cursor])
  const eventsFor = (date: Date) => filteredEvents.filter(event => isSameDay(new Date(event.starts_at), date))
  const eventsAtHour = (date: Date, hour: number) => eventsFor(date).filter(event => new Date(event.starts_at).getHours() === hour)
  const selectedEvents = eventsFor(selected)
  const selectedDateTitle = selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const monthTitle = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const viewTitle = view === 'month' ? monthTitle : view === 'week' ? `${weekDates[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekDates[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : selectedDateTitle
  const syncDate = (date: Date) => { const normalized = startOfDay(date); setSelected(normalized); setCursor(new Date(normalized.getFullYear(), normalized.getMonth(), 1)) }

  const openCreate = (date = selected, hour = 9) => {
    const startsAt = new Date(date); startsAt.setHours(hour, 0, 0, 0)
    const endsAt = new Date(startsAt); endsAt.setHours(endsAt.getHours() + 1)
    syncDate(date); setEditingEvent(null); setEventTitle(''); setEventType('study'); setEventPriorityValue('medium'); setEventColor(eventTypes[0].color)
    setEventStart(toDateTimeLocal(startsAt)); setEventEnd(toDateTimeLocal(endsAt)); setFormError(''); setDeleteArmed(false); setShowEventForm(true)
  }
  const openEdit = (event: CalendarEvent) => {
    const start = new Date(event.starts_at)
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60_000)
    syncDate(start); setEditingEvent(event); setEventTitle(event.title)
    setEventType((eventTypes.some(item => item.value === event.event_type) ? event.event_type : 'study') as EventType)
    setEventPriorityValue(priorityOf(event)); setEventColor(event.color || typeMeta(event.event_type).color)
    setEventStart(toDateTimeLocal(start)); setEventEnd(toDateTimeLocal(end)); setFormError(''); setDeleteArmed(false); setShowEventForm(true)
  }
  const closeModal = () => { if (savingEvent || deletingEvent) return; setShowEventForm(false); setEditingEvent(null); setFormError(''); setDeleteArmed(false) }

  const saveEvent = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    const userId = currentUserId(); const title = eventTitle.trim(); const startsAt = new Date(eventStart); const endsAt = eventEnd ? new Date(eventEnd) : null
    if (!userId) { setFormError('Your session has expired. Please sign in again.'); return }
    if (!title) { setFormError('Add an event title before saving.'); return }
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) { setFormError('Choose a valid start and end time.'); return }
    if (endsAt && endsAt <= startsAt) { setFormError('End time must be after the start time.'); return }
    const payload = { title, starts_at: eventStart, ends_at: eventEnd || null, event_type: eventType, color: eventColor, priority: eventPriorityValue }
    setSavingEvent(true); setFormError('')
    try {
      const saved = editingEvent ? await api<CalendarEvent>(`/calendar-events/${editingEvent.id}`, { method: 'PUT', body: JSON.stringify(payload) }) : await api<CalendarEvent>('/calendar-events/', { method: 'POST', body: JSON.stringify({ ...payload, user_id: userId }) })
      setEvents(previous => sortEvents(editingEvent ? previous.map(event => event.id === saved.id ? saved : event) : [...previous, saved]))
      syncDate(new Date(saved.starts_at)); setShowEventForm(false); setEditingEvent(null)
    } catch (error) { setFormError(error instanceof ApiError ? error.message : 'The event could not be saved. Please try again.') }
    finally { setSavingEvent(false) }
  }
  const deleteEvent = async () => {
    if (!editingEvent) return
    if (!deleteArmed) { setDeleteArmed(true); return }
    setDeletingEvent(true); setFormError('')
    try { await api<void>(`/calendar-events/${editingEvent.id}`, { method: 'DELETE' }); setEvents(previous => previous.filter(event => event.id !== editingEvent.id)); setShowEventForm(false); setEditingEvent(null) }
    catch (error) { setFormError(error instanceof ApiError ? error.message : 'The event could not be deleted. Please try again.') }
    finally { setDeletingEvent(false) }
  }
  const shiftView = (amount: number) => {
    if (view === 'month') { const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1); setCursor(next); setSelected(next); return }
    syncDate(addDays(selected, amount * (view === 'week' ? 7 : 1)))
  }

  const renderTimeline = (dates: Date[]) => <div className="overflow-auto rounded-2xl border shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
    <div className="min-w-[760px]">
      <div className="sticky top-0 z-20 grid border-b backdrop-blur-xl" style={{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(130px, 1fr))`, borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--card) 92%, transparent)' }}>
        <div className="border-r" style={{ borderColor: 'var(--border)' }} />
        {dates.map(date => <button key={date.toISOString()} type="button" onClick={() => syncDate(date)} className="border-r px-2 py-3 text-center transition-colors hover:bg-muted" style={{ borderColor: 'var(--border)', background: isSameDay(date, selected) ? 'var(--secondary-bg)' : undefined }}>
          <span className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
          <span className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold" style={{ background: isSameDay(date, today) ? 'var(--primary)' : undefined, color: isSameDay(date, today) ? '#fff' : 'var(--foreground)' }}>{date.getDate()}</span>
        </button>)}
      </div>
      {HOURS.map(hour => <div key={hour} className="grid" style={{ gridTemplateColumns: `64px repeat(${dates.length}, minmax(130px, 1fr))` }}>
        <div className="relative -top-2 border-r pr-2 text-right text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })}</div>
        {dates.map(date => <div key={`${date.toISOString()}-${hour}`} role="button" tabIndex={0} onClick={() => openCreate(date, hour)} onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') openCreate(date, hour) }} className="min-h-[76px] border-b border-r p-1.5 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none" style={{ borderColor: 'var(--border)' }} aria-label={`Add event on ${date.toDateString()} at ${hour}:00`}>
          <div className="space-y-1.5">{eventsAtHour(date, hour).map(event => <EventPill key={event.id} event={event} onOpen={openEdit} showTime />)}</div>
        </div>)}
      </div>)}
    </div>
  </div>

  const activeFilterCount = Number(typeFilter !== 'all') + Number(priorityFilter !== 'all')
  const upcomingCount = events.filter(event => new Date(event.starts_at) >= today).length

  return <div className="min-h-full p-4 sm:p-6 lg:p-8" style={{ background: 'var(--background)' }}>
    <section className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <header className="relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--primary) 17%, transparent)' }} />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><CalendarDays size={16} /> Study calendar</div><div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2"><h1 className="text-2xl font-heading font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--foreground)' }}>{viewTitle}</h1><span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--secondary-bg)', color: 'var(--muted-foreground)' }}>{upcomingCount} upcoming</span></div><p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>Plan focused study blocks, classes, exams, and deadlines in one calm workspace.</p></div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => syncDate(today)} className="rounded-lg border px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Today</button><div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}><button type="button" onClick={() => shiftView(-1)} aria-label="Previous date range" className="rounded-md p-1.5 transition-colors hover:bg-card" style={{ color: 'var(--muted-foreground)' }}><ChevronLeft size={18} /></button><button type="button" onClick={() => shiftView(1)} aria-label="Next date range" className="rounded-md p-1.5 transition-colors hover:bg-card" style={{ color: 'var(--muted-foreground)' }}><ChevronRight size={18} /></button></div><button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md" style={{ background: 'var(--primary)', color: '#fff' }}><CalendarPlus size={16} /> New event</button></div>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="inline-flex w-fit rounded-xl p-1" style={{ background: 'var(--muted)' }}>{(['month', 'week', 'day'] as CalendarView[]).map(item => <button key={item} type="button" onClick={() => { setView(item); if (item !== 'month') syncDate(selected) }} className="rounded-lg px-3.5 py-2 text-sm font-semibold capitalize transition-all" style={{ background: view === item ? 'var(--card)' : 'transparent', color: view === item ? 'var(--foreground)' : 'var(--muted-foreground)', boxShadow: view === item ? '0 1px 4px rgba(15, 23, 42, 0.08)' : undefined }}>{item}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}><SlidersHorizontal size={14} /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</span><select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | EventType)} aria-label="Filter event category" className="rounded-lg border px-2.5 py-2 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="all">All categories</option>{eventTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as 'all' | EventPriority)} aria-label="Filter event priority" className="rounded-lg border px-2.5 py-2 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="all">All priorities</option>{priorities.map(item => <option key={item.value} value={item.value}>{item.label} priority</option>)}</select>{activeFilterCount > 0 && <button type="button" onClick={() => { setTypeFilter('all'); setPriorityFilter('all') }} className="rounded-lg px-2.5 py-2 text-xs font-semibold hover:bg-muted" style={{ color: 'var(--primary)' }}>Clear</button>}</div>
      </div>

      {pageError && <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: '#ef444412', borderColor: '#ef444433', color: '#b91c1c' }}><span className="flex items-center gap-2"><AlertCircle size={16} /> {pageError}</span><button type="button" onClick={() => void loadEvents()} className="font-semibold underline">Retry</button></div>}

      {loading ? <div className="overflow-hidden rounded-2xl border p-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-4 h-8 w-52 animate-pulse rounded-lg" style={{ background: 'var(--muted)' }} /><div className="grid grid-cols-7 gap-px rounded-xl" style={{ background: 'var(--border)' }}>{Array.from({ length: 35 }, (_, index) => <div key={index} className="min-h-28 animate-pulse p-3" style={{ background: 'var(--card)' }}><div className="h-6 w-6 rounded-full" style={{ background: 'var(--muted)' }} /><div className="mt-5 h-4 w-4/5 rounded" style={{ background: 'var(--muted)' }} /></div>)}</div></div> : view === 'month' ? <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>{DAYS.map(day => <div key={day} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{day}</div>)}</div>
        <div className="grid grid-cols-7">{monthDates.map(date => {
          const dayEvents = eventsFor(date); const insideMonth = date.getMonth() === cursor.getMonth(); const isToday = isSameDay(date, today); const isSelected = isSameDay(date, selected)
          return <div key={date.toISOString()} role="button" tabIndex={0} onClick={() => openCreate(date)} onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') openCreate(date) }} className="group min-h-32 border-b border-r p-2.5 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none" style={{ borderColor: 'var(--border)', background: isSelected ? 'var(--secondary-bg)' : !insideMonth ? 'color-mix(in srgb, var(--muted) 35%, var(--card))' : undefined }}>
            <div className="mb-2 flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" style={{ background: isToday ? 'var(--primary)' : undefined, color: isToday ? '#fff' : insideMonth ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{date.getDate()}</span><span className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--primary)' }}><CalendarPlus size={14} /></span></div><div className="space-y-1">{dayEvents.slice(0, 3).map(event => <EventPill key={event.id} event={event} onOpen={openEdit} compact />)}{dayEvents.length > 3 && <button type="button" onClick={click => { click.stopPropagation(); syncDate(date); setView('day') }} className="px-1 text-[11px] font-semibold hover:underline" style={{ color: 'var(--primary)' }}>+{dayEvents.length - 3} more</button>}</div>
          </div>
        })}</div></div></div>{!filteredEvents.length && <div className="border-t px-5 py-4 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>No matching events. Click any day to schedule your first block.</div>}
      </div> : renderTimeline(view === 'week' ? weekDates : [selected])}

      {!loading && view !== 'day' && selectedEvents.length > 0 && <section className="rounded-2xl border p-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Selected date</p><h2 className="mt-0.5 font-heading text-lg font-bold" style={{ color: 'var(--foreground)' }}>{selectedDateTitle}</h2></div><button type="button" onClick={() => openCreate(selected)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted" style={{ color: 'var(--primary)' }}><CalendarPlus size={14} /> Add event</button></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{selectedEvents.map(event => <div key={event.id} className="rounded-xl border p-3 transition-shadow hover:shadow-sm" style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${event.color || typeMeta(event.event_type).color}` }}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{event.title}</p><p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--muted-foreground)' }}><Clock3 size={12} /> {formatTime(event.starts_at)}{event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}</p></div><button type="button" aria-label={`Edit ${event.title}`} onClick={() => openEdit(event)} className="rounded-md p-1.5 hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><Pencil size={14} /></button></div></div>)}</div></section>}
      {!loading && view === 'day' && !eventsFor(selected).length && <div className="rounded-2xl border border-dashed p-5 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>No matching events on this day. Click a time slot to schedule one.</div>}
    </section>

    {showEventForm && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={closeModal}>
      <form onSubmit={event => void saveEvent(event)} onMouseDown={event => event.stopPropagation()} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} aria-modal="true" role="dialog" aria-labelledby="event-form-title">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>{editingEvent ? 'Edit schedule' : 'New schedule'}</p><h2 id="event-form-title" className="mt-1 text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{editingEvent ? 'Update event' : 'Add an event'}</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>Your changes are saved directly to your calendar.</p></div><button type="button" onClick={closeModal} disabled={savingEvent || deletingEvent} aria-label="Close event form" className="rounded-lg p-2 hover:bg-muted disabled:opacity-50" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button></div>
        <div className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Event title <span style={{ color: '#dc2626' }}>*</span></span><input autoFocus required value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="e.g. Operating systems revision" className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Category</span><select value={eventType} onChange={event => { const next = event.target.value as EventType; setEventType(next); setEventColor(typeMeta(next).color) }} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{eventTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Priority</span><select value={eventPriorityValue} onChange={event => setEventPriorityValue(event.target.value as EventPriority)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{priorities.map(item => <option key={item.value} value={item.value}>{item.label} priority</option>)}</select></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Starts</span><input type="datetime-local" required value={eventStart} onChange={event => setEventStart(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><label className="block"><span className="mb-1.5 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Ends</span><input type="datetime-local" value={eventEnd} onChange={event => setEventEnd(event.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label></div><div><span className="mb-2 block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Event color</span><div className="flex flex-wrap gap-2">{eventTypes.map(item => <button key={item.value} type="button" onClick={() => setEventColor(item.color)} title={`Use ${item.label} color`} aria-label={`Use ${item.label} color`} className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110" style={{ background: item.color, borderColor: eventColor === item.color ? 'var(--foreground)' : 'transparent', boxShadow: eventColor === item.color ? `0 0 0 2px ${item.color}55` : undefined }} />)}</div></div></div>
        {formError && <p className="mt-4 rounded-xl border px-3 py-2.5 text-sm" style={{ background: '#ef444412', borderColor: '#ef444433', color: '#b91c1c' }}>{formError}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"><div>{editingEvent && <button type="button" onClick={() => void deleteEvent()} disabled={savingEvent || deletingEvent} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 sm:w-auto" style={{ color: deleteArmed ? '#fff' : '#dc2626', background: deleteArmed ? '#dc2626' : '#ef444414' }}><Trash2 size={15} />{deletingEvent ? 'Deleting…' : deleteArmed ? 'Confirm delete' : 'Delete event'}</button>}</div><div className="flex gap-2"><button type="button" onClick={closeModal} disabled={savingEvent || deletingEvent} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button type="submit" disabled={savingEvent || deletingEvent} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-px disabled:opacity-60" style={{ background: 'var(--primary)', color: '#fff' }}><CalendarPlus size={15} />{savingEvent ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}</button></div></div>
      </form>
    </div>}
  </div>
}

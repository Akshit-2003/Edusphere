import { useEffect, useState, type FormEvent } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { api, ApiError, currentUserId } from '../lib/api'
import type { CalendarEvent } from '../types'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const eventColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']

function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const now = new Date()
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState('study')
  const [eventColor, setEventColor] = useState(eventColors[0])
  const [eventStart, setEventStart] = useState(() => toDateTimeLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0)))
  const [savingEvent, setSavingEvent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }
    let cancelled = false
    api<CalendarEvent[]>(`/events/?user_id=${userId}`).then(data => {
      if (!cancelled) setEvents(data)
    }).catch(() => {
      if (!cancelled) setError('Your calendar could not be loaded. Please try again.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const title = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const isSameDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
  const eventsFor = (date: Date) => events.filter(event => isSameDay(new Date(event.starts_at), date))
  const selectDate = (date: Date) => {
    setSelected(date)
    if (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }
  const openEventForm = (date = selected) => {
    const nextStart = new Date(date)
    nextStart.setHours(9, 0, 0, 0)
    setEventStart(toDateTimeLocal(nextStart))
    setEventTitle('')
    setEventType('study')
    setEventColor(eventColors[0])
    setError('')
    setShowEventForm(true)
  }
  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const userId = currentUserId()
    const title = eventTitle.trim()
    const startsAt = new Date(eventStart)
    if (!title) { setError('Add an event title before saving.'); return }
    if (!userId) { setError('Your session has expired. Please sign in again.'); return }
    if (Number.isNaN(startsAt.getTime())) { setError('Choose a valid event date and time.'); return }
    setSavingEvent(true)
    setError('')
    try {
      const created = await api<CalendarEvent>('/events/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, title, starts_at: startsAt.toISOString(), event_type: eventType, color: eventColor }),
      })
      setEvents(previous => [...previous, created].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))
      setSelected(new Date(created.starts_at))
      setCursor(new Date(new Date(created.starts_at).getFullYear(), new Date(created.starts_at).getMonth(), 1))
      setShowEventForm(false)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'The event could not be saved. Please try again.')
    } finally {
      setSavingEvent(false)
    }
  }
  const shiftMonth = (amount: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)
    setCursor(next)
    setSelected(new Date(next.getFullYear(), next.getMonth(), 1))
  }
  const weekStart = new Date(selected)
  weekStart.setDate(selected.getDate() - selected.getDay())
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  return (
    <div className="min-h-full flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{title}</h1>
          <div className="flex gap-1">
            <button onClick={() => shiftMonth(-1)} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: 'var(--muted-foreground)' }}><ChevronLeft size={18} /></button>
            <button onClick={() => shiftMonth(1)} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-muted transition-colors" style={{ color: 'var(--muted-foreground)' }}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--muted)' }}>
          {(['month', 'week', 'day'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all"
              style={{ background: view === v ? 'var(--card)' : 'transparent', color: view === v ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            >
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => openEventForm()} className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5" style={{ background: 'var(--primary)', color: '#fff' }}><CalendarPlus size={15} /> Add event</button>
      </div>

      {error && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--card))', color: '#dc2626' }}>{error}</div>}

      {view === 'day' ? (
        <div className="flex-1 overflow-auto rounded-xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <div className="space-y-3">
            {eventsFor(selected).map(event => <div key={event.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', borderLeft: `3px solid ${event.color}` }}><div className="font-medium" style={{ color: 'var(--foreground)' }}>{event.title}</div><div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {event.event_type}</div></div>)}
            {!eventsFor(selected).length && <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No events scheduled for this day.</p>}
          </div>
        </div>
      ) : <div className="flex-1 overflow-auto rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 min-w-[620px] border-b" style={{ borderColor: 'var(--border)' }}>
          {DAYS.map(d => (
            <div key={d} className="text-xs font-semibold py-3 text-center" style={{ color: 'var(--muted-foreground)' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 min-w-[620px]" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {/* Empty cells before first day */}
          {view === 'month' && Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="border-b border-r p-2" style={{ borderColor: 'var(--border)', background: 'var(--muted)', opacity: 0.5 }} />
          ))}
          {/* Days */}
          {loading && Array.from({ length: view === 'month' ? 35 : 7 }, (_, index) => <div key={`loading-${index}`} className="min-h-[100px] border-b border-r p-2" style={{ borderColor: 'var(--border)' }}><div className="h-7 w-7 animate-pulse rounded-full" style={{ background: 'var(--muted)' }} /></div>)}
          {!loading && (view === 'month' ? Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)) : weekDates).map(date => {
            const isToday = isSameDay(date, now)
            const isSelected = isSameDay(date, selected)
            const dayEvents = eventsFor(date)
            return (
              <div
                key={date.toISOString()}
                onClick={() => selectDate(date)}
                className="border-b border-r p-2 cursor-pointer transition-all"
                style={{
                  borderColor: 'var(--border)',
                  background: isSelected ? 'var(--secondary-bg)' : undefined,
                }}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1.5 ${isToday ? 'text-white' : ''}`}
                  style={{ background: isToday ? 'var(--primary)' : undefined, color: isToday ? '#fff' : 'var(--foreground)' }}>
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="text-xs px-1.5 py-0.5 rounded truncate font-medium" style={{ background: `${ev.color}20`, color: ev.color }}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>}

      {/* Selected day events */}
      {view !== 'day' && eventsFor(selected).length > 0 && (
        <div className="mt-4 shrink-0">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {eventsFor(selected).map(ev => (
              <div key={ev.id} className="flex-1 rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)', borderLeft: `3px solid ${ev.color}` }}>
                <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{ev.title}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{new Date(ev.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => !savingEvent && setShowEventForm(false)}>
          <form onSubmit={event => void createEvent(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-lg rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} aria-modal="true" role="dialog" aria-labelledby="event-form-title">
            <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Calendar</p><h2 id="event-form-title" className="mt-0.5 text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Schedule an event</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>This is saved to your Edusphere calendar.</p></div><button type="button" onClick={() => setShowEventForm(false)} disabled={savingEvent} aria-label="Close event form" className="rounded-lg p-2 hover:bg-muted disabled:opacity-50" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button></div>
            <div className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Event title <span style={{ color: '#dc2626' }}>*</span></span><input autoFocus required value={eventTitle} onChange={event => setEventTitle(event.target.value)} placeholder="e.g. Data structures revision" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Event type</span><select value={eventType} onChange={event => setEventType(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="study">Study session</option><option value="class">Class</option><option value="exam">Exam</option><option value="deadline">Deadline</option></select></label><label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Date & time</span><input type="datetime-local" required value={eventStart} onChange={event => setEventStart(event.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label></div><div><span className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Color</span><div className="flex gap-2">{eventColors.map(color => <button key={color} type="button" onClick={() => setEventColor(color)} aria-label={`Use ${color} event color`} className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110" style={{ background: color, borderColor: eventColor === color ? 'var(--foreground)' : 'transparent', boxShadow: eventColor === color ? `0 0 0 2px ${color}55` : undefined }} />)}</div></div></div>
            {error && <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, #ef4444 10%, var(--card))', color: '#dc2626' }}>{error}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowEventForm(false)} disabled={savingEvent} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button type="submit" disabled={savingEvent} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: '#fff' }}><CalendarPlus size={15} />{savingEvent ? 'Saving…' : 'Save event'}</button></div>
          </form>
        </div>
      )}
    </div>
  )
}

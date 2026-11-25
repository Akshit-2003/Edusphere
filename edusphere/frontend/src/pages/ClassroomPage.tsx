import { useState, useEffect } from 'react'
import { Check, Copy, Hash, LogIn, Send, Users, Paperclip, Smile, MoreHorizontal, Plus, X } from 'lucide-react'
import type { Classroom } from '../types';
import { api, currentUserId } from '../lib/api';

const tabs = ['Overview', 'Announcements', 'Materials', 'Assignments', 'Lectures', 'Discussion', 'Members']

interface Channel { id: number; name: string }
interface StoredMessage { id: number; sender_id: number; content: string; created_at: string }
interface Course { id: number; title: string; description: string | null; classroom_id: number }
interface ClassroomMember { user_id: number; full_name: string; email: string; role: 'owner' | 'student'; joined_at: string }

export default function ClassroomPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [classroomDetailsLoading, setClassroomDetailsLoading] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [classroomMembers, setClassroomMembers] = useState<ClassroomMember[]>([])
  const [activeClassroom, setActiveClassroom] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [showClassroomForm, setShowClassroomForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [classroomName, setClassroomName] = useState('')
  const [classroomSection, setClassroomSection] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [joining, setJoining] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [attachmentInput, setAttachmentInput] = useState<HTMLInputElement | null>(null)

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }
    let cancelled = false
    api<Classroom[]>(`/classrooms/?user_id=${userId}`)
      .then((data) => {
        if (cancelled) return
        setClassrooms(data);
        setActiveClassroom(data[0]?.id ?? null)
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return
        setError('Your classrooms could not be loaded. Please try again.');
        setLoading(false);
      });
    return () => { cancelled = true }
  }, []);
  const [activeChannel, setActiveChannel] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('Discussion')
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<StoredMessage[]>([])
  const classroom = activeClassroom === null ? null : classrooms.find(item => item.id === activeClassroom) ?? null
  const classroomId = classroom?.id
  const currentUser = currentUserId()
  const members = classroomMembers.map((member, index) => ({
      id: member.user_id,
      name: member.user_id === currentUser ? 'You' : member.full_name,
      role: member.role === 'owner' ? 'Owner' : 'Student',
      color: ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b'][index % 4],
      status: 'online',
    }))

  useEffect(() => {
    const userId = currentUserId()
    if (!classroomId || !userId) {
      setChannels([])
      setCourses([])
      setClassroomMembers([])
      setActiveChannel(null)
      setMsgs([])
      return
    }
    let cancelled = false
    setClassroomDetailsLoading(true)
    setChannels([])
    setCourses([])
    setClassroomMembers([])
    setMsgs([])
    setActiveChannel(null)
    const loadClassroomDetails = async () => {
      try {
        const [storedChannels, storedCourses, storedMembers] = await Promise.all([
          api<Channel[]>(`/classrooms/${classroomId}/channels`),
          api<Course[]>(`/courses/?classroom_id=${classroomId}&user_id=${userId}`),
          api<ClassroomMember[]>(`/classrooms/${classroomId}/members?user_id=${userId}`),
        ])
        if (cancelled) return
        const nextChannels = storedChannels.length
          ? storedChannels
          : [await api<Channel>(`/classrooms/${classroomId}/channels`, { method: 'POST', body: JSON.stringify({ name: 'general' }) })]
        if (cancelled) return
        setChannels(nextChannels)
        setActiveChannel(nextChannels[0]?.id ?? null)
        setCourses(storedCourses)
        setClassroomMembers(storedMembers)
      } catch {
        if (!cancelled) setError('Classroom details could not be loaded. Please try again.')
      } finally {
        if (!cancelled) setClassroomDetailsLoading(false)
      }
    }
    void loadClassroomDetails()
    return () => { cancelled = true }
  }, [classroomId])

  useEffect(() => {
    if (!activeChannel) {
      setMsgs([])
      return
    }
    let cancelled = false
    setMessagesLoading(true)
    api<StoredMessage[]>(`/channels/${activeChannel}/messages`)
      .then(messages => { if (!cancelled) setMsgs(messages) })
      .catch(() => { if (!cancelled) setError('Messages could not be loaded.') })
      .finally(() => { if (!cancelled) setMessagesLoading(false) })
    return () => { cancelled = true }
  }, [activeChannel])

  const send = async () => {
    if (!input.trim()) return
    const userId = currentUserId()
    if (!activeChannel || !userId) return
    setSending(true)
    setError('')
    try {
      const message = await api<StoredMessage>(`/channels/${activeChannel}/messages`, { method: 'POST', body: JSON.stringify({ sender_id: userId, content: input.trim() }) })
      setMsgs(previous => [...previous, message])
      setInput('')
    } catch {
      setError('Your message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }
  const createClassroom = async (event: React.FormEvent) => {
    event.preventDefault()
    const userId = currentUserId()
    if (!userId || !classroomName.trim()) return
    setSaving(true)
    try {
      const created = await api<Classroom>('/classrooms/', { method: 'POST', body: JSON.stringify({ name: classroomName.trim(), section: classroomSection.trim() || null, creator_id: userId }) })
      setClassrooms(previous => [created, ...previous])
      setClassroomDetailsLoading(true)
      setActiveClassroom(created.id)
      setClassroomName('')
      setClassroomSection('')
      setShowClassroomForm(false)
    } catch {
      setError('The classroom could not be created. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const joinClassroom = async (event: React.FormEvent) => {
    event.preventDefault()
    const userId = currentUserId()
    const classCode = joinCode.replace(/\s+/g, '').toUpperCase()
    if (!userId || !classCode) return
    setJoining(true)
    setError('')
    try {
      const joined = await api<Classroom>('/classrooms/join', { method: 'POST', body: JSON.stringify({ user_id: userId, class_code: classCode }) })
      setClassrooms(previous => [joined, ...previous.filter(item => item.id !== joined.id)])
      setClassroomDetailsLoading(true)
      setActiveClassroom(joined.id)
      setJoinCode('')
      setShowJoinForm(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The classroom could not be joined. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const copyClassCode = async () => {
    if (!classroom) return
    try {
      await navigator.clipboard.writeText(classroom.class_code)
      setCodeCopied(true)
      window.setTimeout(() => setCodeCopied(false), 1800)
    } catch {
      setError('Could not copy the class code. Please copy it manually.')
    }
  }

  const createCourse = async (event: React.FormEvent) => {
    event.preventDefault()
    const userId = currentUserId()
    if (!classroom || !courseTitle.trim() || !userId) return
    setSaving(true)
    try {
      const created = await api<Course>('/courses/', { method: 'POST', body: JSON.stringify({ classroom_id: classroom.id, title: courseTitle.trim(), description: courseDescription.trim() || null, actor_id: userId }) })
      setCourses(previous => [created, ...previous])
      setCourseTitle('')
      setCourseDescription('')
      setShowCourseForm(false)
    } catch {
      setError('The course could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-5 sm:p-8" style={{ background: 'var(--background)' }}>
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-28 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
          <div className="grid gap-5 lg:grid-cols-[13rem_1fr_13rem]">
            <div className="hidden min-h-96 rounded-2xl border lg:block" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
            <div className="min-h-96 rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="h-5 w-40 rounded" style={{ background: 'var(--muted)' }} />
              <div className="mt-8 h-16 max-w-md rounded-xl" style={{ background: 'var(--muted)' }} />
              <div className="mt-4 ml-auto h-12 max-w-xs rounded-xl" style={{ background: 'var(--muted)' }} />
            </div>
            <div className="hidden min-h-96 rounded-2xl border lg:block" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="relative flex h-full min-h-[540px] items-center justify-center overflow-auto p-5 sm:p-8" style={{ background: 'var(--background)' }}>
        <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }} />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <section className="relative w-full max-w-xl rounded-3xl border p-7 text-center shadow-xl sm:p-10" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}><Users size={30} /></div>
          <p className="mt-6 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Collaborative learning space</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>Create your first classroom</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6" style={{ color: 'var(--muted-foreground)' }}>Bring your class together for focused discussions, shared course materials, announcements, and assignments.</p>
          {error && <p className="mt-5 rounded-xl border px-3 py-2.5 text-sm" style={{ background: '#ef444412', borderColor: '#ef444433', color: '#b91c1c' }}>{error}</p>}
          <div className="mt-7 flex flex-wrap justify-center gap-2"><button onClick={() => { setError(''); setShowClassroomForm(true) }} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={17} /> Create classroom</button><button onClick={() => { setError(''); setShowJoinForm(true) }} className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-px hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}><LogIn size={17} /> Join with code</button></div>
          <p className="mt-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>Your classroom is securely saved to your Edusphere account.</p>
        </section>
        {showJoinForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !joining && setShowJoinForm(false)}><form onSubmit={event => void joinClassroom(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Class code</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Join a classroom</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>Ask the classroom owner for their 6-character code.</p></div><button type="button" onClick={() => setShowJoinForm(false)} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Class code<input autoFocus required maxLength={6} value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-lg font-bold uppercase tracking-[0.25em] outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="ABC123" /></label>{error && <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowJoinForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={joining || joinCode.length !== 6} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}><LogIn size={15} />{joining ? 'Joining…' : 'Join classroom'}</button></div></form></div>}
        {showClassroomForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !saving && setShowClassroomForm(false)}><form onSubmit={event => void createClassroom(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Classroom</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Create a class</h2></div><button type="button" onClick={() => setShowClassroomForm(false)} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Class name<input autoFocus required value={classroomName} onChange={event => setClassroomName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="e.g. B.Tech CSE 3rd Year" /></label><label className="mt-4 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Section <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span><input value={classroomSection} onChange={event => setClassroomSection(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="Section A" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowClassroomForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{saving ? 'Creating…' : 'Create classroom'}</button></div></form></div>}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Classroom header */}
      <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h1 className="font-heading font-bold text-xl" style={{ color: 'var(--foreground)' }}>
              {loading ? 'Loading classroom…' : classroom ? `${classroom.name}${classroom.section ? ` — ${classroom.section}` : ''}` : 'No classroom yet'}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {classroom ? `${classroom.membership_role === 'owner' ? 'You own this classroom' : 'Joined classroom'} · ${classroom.member_count} member${classroom.member_count === 1 ? '' : 's'}` : 'Create a classroom from the academic API to start collaborating.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {classrooms.length > 1 && <select value={classroom?.id ?? ''} onChange={event => { setClassroomDetailsLoading(true); setActiveClassroom(Number(event.target.value)) }} aria-label="Choose classroom" className="max-w-36 rounded-lg border px-2 py-1.5 text-xs" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>{classrooms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
            <button onClick={() => void copyClassCode()} title="Copy class code" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--muted)' }}><span style={{ color: 'var(--muted-foreground)' }}>Code</span> {classroom.class_code} {codeCopied ? <Check size={13} style={{ color: '#10b981' }} /> : <Copy size={13} />}</button>
            <button onClick={() => { setError(''); setShowJoinForm(true) }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}><LogIn size={13} /> Join</button>
            <button onClick={() => { setError(''); setShowClassroomForm(true) }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}><Plus size={13} /> Class</button>
            {classroom.membership_role === 'owner' && <button onClick={() => { setError(''); setShowCourseForm(true) }} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}><Plus size={13} /> Course</button>}
            <div className="flex -space-x-2">
              {members.slice(0, 4).map(m => (
                <div key={m.name} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color, borderColor: 'var(--card)' }}>{m.name[0]}</div>
              ))}
            </div>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{members.length} member{members.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: activeTab === t ? 'var(--primary)' : 'transparent',
                color: activeTab === t ? '#fff' : 'var(--muted-foreground)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {channels.length > 1 && (
          <select value={activeChannel ?? ''} onChange={event => setActiveChannel(Number(event.target.value))} className="lg:hidden mt-3 w-full rounded-lg border px-3 py-2 text-sm" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            {channels.map(channel => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
          </select>
        )}
        {error && <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}
      </div>

      {classroomDetailsLoading ? (
        <div className="flex flex-1 overflow-hidden" aria-label="Loading classroom details">
          <aside className="hidden w-52 shrink-0 border-r p-4 lg:block" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="h-4 w-20 animate-pulse rounded" style={{ background: 'var(--muted)' }} />
            {Array.from({ length: 4 }, (_, index) => <div key={index} className="mt-4 h-9 animate-pulse rounded-lg" style={{ background: 'var(--muted)' }} />)}
          </aside>
          <div className="flex-1 space-y-6 overflow-hidden p-5 sm:p-7" style={{ background: 'var(--background)' }}>
            <div className="h-5 w-40 animate-pulse rounded" style={{ background: 'var(--muted)' }} />
            <div className="max-w-lg space-y-3"><div className="h-14 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /><div className="ml-auto h-12 w-3/4 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /><div className="h-16 w-2/3 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /></div>
          </div>
          <aside className="hidden w-52 shrink-0 border-l p-4 xl:block" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="h-4 w-24 animate-pulse rounded" style={{ background: 'var(--muted)' }} /></aside>
        </div>
      ) : activeTab === 'Discussion' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Channels sidebar */}
          <aside className="hidden lg:block w-52 border-r shrink-0 p-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Channels</div>
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all ${activeChannel === ch.id ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                style={{ color: activeChannel === ch.id ? '#fff' : 'var(--foreground)' }}
              >
                <Hash size={14} style={{ opacity: 0.7 }} />
                {ch.name}
              </button>
            ))}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Online — {members.filter(m => m.status === 'online').length}</div>
              {members.filter(m => m.status === 'online').map(m => (
                <div key={m.name} className="flex items-center gap-2 px-2.5 py-1.5 text-sm">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: m.color }}>{m.name[0]}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-white" />
                  </div>
                  <span className="truncate" style={{ color: 'var(--foreground)' }}>{m.name}</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
              {messagesLoading && Array.from({ length: 3 }, (_, index) => <div key={`message-skeleton-${index}`} className={`flex gap-3 ${index % 2 ? 'flex-row-reverse' : ''}`}><div className="h-9 w-9 animate-pulse rounded-full" style={{ background: 'var(--muted)' }} /><div className={`h-14 w-52 animate-pulse rounded-2xl ${index % 2 ? 'ml-auto' : ''}`} style={{ background: 'var(--muted)' }} /></div>)}
              {!messagesLoading && msgs.map(m => {
                const isMe = m.sender_id === currentUserId()
                return <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: isMe ? '#ef4444' : '#4f46e5' }}>{isMe ? 'Y' : 'M'}</div>
                  <div className={`max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{isMe ? 'You' : `User #${m.sender_id}`}</span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm"
                      style={{
                        background: isMe ? 'var(--primary)' : 'var(--card)',
                        color: isMe ? '#fff' : 'var(--foreground)',
                        border: !isMe ? '1px solid var(--border)' : 'none',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>})}
              {!messagesLoading && !msgs.length && <p className="text-sm py-6 text-center" style={{ color: 'var(--muted-foreground)' }}>No messages yet. Start the discussion.</p>}
            </div>

            {/* Input */}
            <div className="px-4 sm:px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2 items-end">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                  <button onClick={() => attachmentInput?.click()} aria-label="Attach a note" style={{ color: 'var(--muted-foreground)' }}><Paperclip size={16} /></button>
                  <input ref={setAttachmentInput} type="file" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) setInput(previous => `${previous}${previous ? ' ' : ''}[Attachment: ${file.name}]`); event.currentTarget.value = '' }} />
                  <input
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void send()}
                    placeholder={`Message #${channels.find(channel => channel.id === activeChannel)?.name ?? 'channel'}`}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--foreground)' }}
                  />
                  <button onClick={() => setInput(previous => `${previous}🙂`)} aria-label="Add emoji" style={{ color: 'var(--muted-foreground)' }}><Smile size={16} /></button>
                </div>
                <button
                  onClick={() => void send()}
                  disabled={sending || !input.trim() || !activeChannel}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-90"
                  style={{ background: 'var(--primary)', color: '#fff', opacity: sending || !input.trim() || !activeChannel ? 0.5 : 1 }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Members sidebar */}
          <aside className="hidden xl:block w-52 border-l shrink-0 p-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--muted-foreground)' }}>Members ({members.length})</div>
            {members.map(m => (
              <div key={m.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted transition-all group">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: m.color }}>{m.name[0]}</div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${m.status === 'online' ? 'bg-green-400' : 'bg-gray-400'}`} style={{ borderColor: 'var(--card)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{m.name}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{m.role}</div>
                </div>
                <button onClick={() => setInput(previous => `${previous}${previous ? ' ' : ''}@${m.name} `)} aria-label={`Mention ${m.name}`} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted-foreground)' }}><MoreHorizontal size={14} /></button>
              </div>
            ))}
          </aside>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6" style={{ color: 'var(--muted-foreground)' }}>
          <div className="mx-auto max-w-2xl rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>{activeTab}</p><h2 className="mt-1 text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{classroom?.name ?? 'Classroom'}</h2><p className="mt-2 text-sm">{activeTab === 'Overview' ? 'Courses and discussion are stored in your EduSphere database.' : `No ${activeTab.toLowerCase()} have been added yet. Use the class discussion to coordinate with your group.`}</p></div><Users size={32} className="shrink-0 opacity-30" /></div>
            {activeTab === 'Overview' && <div className="mt-5 space-y-2">{courses.map(course => <div key={course.id} className="rounded-xl border p-3" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}><p className="font-medium" style={{ color: 'var(--foreground)' }}>{course.title}</p>{course.description && <p className="mt-1 text-sm">{course.description}</p>}</div>)}{!courses.length && <p className="rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: 'var(--border)' }}>Add a course to start organising class material.</p>}</div>}
          </div>
        </div>
      )}
      {showJoinForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !joining && setShowJoinForm(false)}><form onSubmit={event => void joinClassroom(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Class code</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Join a classroom</h2><p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>Ask the classroom owner for their 6-character code.</p></div><button type="button" onClick={() => setShowJoinForm(false)} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Class code<input autoFocus required maxLength={6} value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-lg font-bold uppercase tracking-[0.25em] outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="ABC123" /></label>{error && <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowJoinForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={joining || joinCode.length !== 6} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}><LogIn size={15} />{joining ? 'Joining…' : 'Join classroom'}</button></div></form></div>}
      {showClassroomForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !saving && setShowClassroomForm(false)}><form onSubmit={event => void createClassroom(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Classroom</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Create a class</h2></div><button type="button" onClick={() => setShowClassroomForm(false)} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Class name<input autoFocus required value={classroomName} onChange={event => setClassroomName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="e.g. B.Tech CSE 3rd Year" /></label><label className="mt-4 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Section <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span><input value={classroomSection} onChange={event => setClassroomSection(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="Section A" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowClassroomForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{saving ? 'Creating…' : 'Create classroom'}</button></div></form></div>}
      {showCourseForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !saving && setShowCourseForm(false)}><form onSubmit={event => void createCourse(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Course</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Add course</h2></div><button type="button" onClick={() => setShowCourseForm(false)} className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Course title<input autoFocus required value={courseTitle} onChange={event => setCourseTitle(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="e.g. Data Structures" /></label><label className="mt-4 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Description <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span><textarea value={courseDescription} onChange={event => setCourseDescription(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCourseForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{saving ? 'Saving…' : 'Save course'}</button></div></form></div>}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Bot,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  CreditCard,
  FilePlus2,
  FileText,
  GraduationCap,
  HelpCircle,
  LibraryBig,
  ListPlus,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { ApiError, api, currentUserId } from '../lib/api'
import type { Page, StudyDocument } from '../types'

type AssistantRole = 'user' | 'assistant'
type StudyMode = 'summary' | 'explain' | 'flashcards' | 'quiz' | 'roadmap'
type ActionKind = 'flashcards' | 'quiz' | 'roadmap' | 'note'

interface Conversation {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string
}

interface ContextItem {
  document_id: number
  title: string
  kind: 'Note' | 'PDF' | string
}

interface AssistantMessage {
  id: number
  user_id: number
  conversation_id: number | null
  role: AssistantRole
  content: string
  context_items: ContextItem[]
  created_at: string
  pending?: boolean
}

interface Toast {
  kind: 'success' | 'error'
  message: string
  destination?: Page
  actionLabel?: string
}

interface ActionResponse {
  message: string
  created_count?: number
  quiz_id?: number
  document_id?: number
}

const quickActions: Array<{ mode: StudyMode; label: string; prompt: string; icon: typeof FileText; color: string }> = [
  { mode: 'summary', label: 'Summarize', prompt: 'Summarize the selected study material into the most important ideas.', icon: FileText, color: 'text-indigo-600 dark:text-indigo-300' },
  { mode: 'explain', label: 'Explain step by step', prompt: 'Explain this topic step by step with a simple study approach.', icon: BookOpen, color: 'text-violet-600 dark:text-violet-300' },
  { mode: 'flashcards', label: 'Make flashcards', prompt: 'Identify the most useful active-recall flashcards from this material.', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-300' },
  { mode: 'quiz', label: 'Practice quiz', prompt: 'Create a practice plan and quiz ideas from this topic.', icon: HelpCircle, color: 'text-amber-600 dark:text-amber-300' },
  { mode: 'roadmap', label: 'Study roadmap', prompt: 'Create a realistic step-by-step study roadmap for this topic.', icon: ListPlus, color: 'text-rose-600 dark:text-rose-300' },
]

const actionMeta: Record<ActionKind, { label: string; icon: typeof CreditCard; destination: Page; actionLabel: string }> = {
  flashcards: { label: 'Create flashcards', icon: CreditCard, destination: 'flashcards', actionLabel: 'Open flashcards' },
  quiz: { label: 'Create quiz', icon: HelpCircle, destination: 'quiz', actionLabel: 'Open quiz' },
  roadmap: { label: 'Create roadmap tasks', icon: ListPlus, destination: 'planner', actionLabel: 'Open planner' },
  note: { label: 'Save to notes', icon: FilePlus2, destination: 'workspace', actionLabel: 'Open workspace' },
}

function formatConversationDate(value: string) {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return 'Recently'
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000))
  if (minutes < 2) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function inlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-semibold text-[var(--foreground)]">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[0.83em] text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">{part.slice(1, -1)}</code>
    if (part.startsWith('$') && part.endsWith('$')) return <span key={index} className="rounded-md bg-violet-100 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">{part.slice(1, -1)}</span>
    return <span key={index}>{part}</span>
  })
}

function highlightCode(code: string) {
  return code.split(/(\b(?:const|let|var|function|return|if|else|for|while|import|from|class|async|await|def|print|True|False|None)\b|"[^"\n]*"|'[^'\n]*'|\/\/[^\n]*|#[^\n]*)/g).filter(Boolean).map((token, index) => {
    const isKeyword = /^(const|let|var|function|return|if|else|for|while|import|from|class|async|await|def|print|True|False|None)$/.test(token)
    const isString = /^['"]/.test(token)
    const isComment = token.startsWith('//') || token.startsWith('#')
    return <span key={index} className={isKeyword ? 'text-fuchsia-300' : isString ? 'text-emerald-300' : isComment ? 'text-slate-400' : undefined}>{token}</span>
  })
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Copy support is optional in restricted browser contexts.
    }
  }
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2 text-xs text-slate-300"><span className="font-mono">{language || 'code'}</span><button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold transition hover:bg-white/10">{copied ? <Check size={13} className="text-emerald-300" /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy'}</button></div>
      <pre className="overflow-x-auto p-4 text-xs leading-6"><code>{highlightCode(code)}</code></pre>
    </div>
  )
}

function MarkdownTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="my-4 overflow-x-auto rounded-xl border border-[var(--border)]"><table className="min-w-full text-left text-xs"><thead className="bg-[var(--muted)]"><tr>{headers.map(header => <th key={header} className="px-3 py-2.5 font-semibold text-[var(--foreground)]">{inlineMarkdown(header)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-[var(--border)]">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2.5 text-[var(--muted-foreground)]">{inlineMarkdown(cell)}</td>)}</tr>)}</tbody></table></div>
}

function MarkdownContent({ content }: { content: string }) {
  const chunks = content.split(/```([\w+-]*)\n?([\s\S]*?)```/g)
  const rendered: React.ReactNode[] = []

  const renderText = (text: string, prefix: string) => {
    const lines = text.split('\n')
    let index = 0
    while (index < lines.length) {
      const line = lines[index]
      const isTableHeader = line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1])
      if (isTableHeader) {
        const cells = (value: string) => value.split('|').map(cell => cell.trim()).filter(Boolean)
        const headers = cells(line)
        index += 2
        const rows: string[][] = []
        while (index < lines.length && lines[index].includes('|')) { rows.push(cells(lines[index])); index += 1 }
        rendered.push(<MarkdownTable key={`${prefix}-table-${index}`} headers={headers} rows={rows} />)
        continue
      }
      if (!line.trim()) { index += 1; continue }
      if (line.startsWith('### ')) rendered.push(<h4 key={`${prefix}-${index}`} className="mt-4 text-sm font-bold text-[var(--foreground)]">{inlineMarkdown(line.slice(4))}</h4>)
      else if (line.startsWith('## ')) rendered.push(<h3 key={`${prefix}-${index}`} className="mt-5 text-base font-bold text-[var(--foreground)]">{inlineMarkdown(line.slice(3))}</h3>)
      else if (line.startsWith('# ')) rendered.push(<h2 key={`${prefix}-${index}`} className="mt-5 text-lg font-bold text-[var(--foreground)]">{inlineMarkdown(line.slice(2))}</h2>)
      else if (/^[-*] /.test(line)) rendered.push(<div key={`${prefix}-${index}`} className="flex gap-2 py-0.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" /><span>{inlineMarkdown(line.slice(2))}</span></div>)
      else if (/^\d+\. /.test(line)) rendered.push(<div key={`${prefix}-${index}`} className="flex gap-2 py-0.5"><span className="font-semibold text-indigo-600 dark:text-indigo-300">{line.match(/^\d+/)?.[0]}.</span><span>{inlineMarkdown(line.replace(/^\d+\. /, ''))}</span></div>)
      else rendered.push(<p key={`${prefix}-${index}`} className="py-0.5">{inlineMarkdown(line)}</p>)
      index += 1
    }
  }

  for (let index = 0; index < chunks.length; index += 3) {
    renderText(chunks[index], `text-${index}`)
    if (chunks[index + 2] !== undefined) rendered.push(<CodeBlock key={`code-${index}`} language={chunks[index + 1]} code={chunks[index + 2].replace(/\n$/, '')} />)
  }
  return <div className="space-y-0.5 text-sm leading-6 text-[var(--muted-foreground)]">{rendered}</div>
}

function TypingIndicator() {
  return <div className="flex items-end gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm"><Bot size={16} /></div><div className="flex gap-1.5 rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">{[0, 1, 2].map(index => <span key={index} className="h-2 w-2 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: `${index * 0.14}s` }} />)}</div></div>
}

export default function AIAssistantPage({ setPage }: { setPage: (page: Page) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [documents, setDocuments] = useState<StudyDocument[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([])
  const [subject, setSubject] = useState('')
  const [input, setInput] = useState('')
  const [sourceSearch, setSourceSearch] = useState('')
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeConversation = conversations.find(conversation => conversation.id === activeConversationId) ?? null
  const selectedDocuments = useMemo(() => documents.filter(document => selectedDocumentIds.includes(document.id)), [documents, selectedDocumentIds])
  const filteredDocuments = useMemo(() => documents.filter(document => document.title.toLowerCase().includes(sourceSearch.toLowerCase()) || document.folder.toLowerCase().includes(sourceSearch.toLowerCase())), [documents, sourceSearch])

  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    window.setTimeout(() => setToast(current => current === nextToast ? null : current), 5000)
  }

  const loadMessages = async (conversationId: number) => {
    const userId = currentUserId()
    if (!userId) return
    setMessagesLoading(true)
    try {
      const stored = await api<AssistantMessage[]>(`/assistant/conversations/${conversationId}/messages/?user_id=${userId}`)
      setMessages(stored)
    } catch (error) {
      setMessages([])
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'This chat could not be loaded. Please try again.' })
    } finally {
      setMessagesLoading(false)
    }
  }

  const createConversation = async (focus = true) => {
    const userId = currentUserId()
    if (!userId) {
      showToast({ kind: 'error', message: 'Your session has expired. Please sign in again.' })
      return null
    }
    setCreatingConversation(true)
    try {
      const conversation = await api<Conversation>('/assistant/conversations/', { method: 'POST', body: JSON.stringify({ user_id: userId, title: 'New study chat' }) })
      setConversations(current => [conversation, ...current])
      setActiveConversationId(conversation.id)
      setMessages([])
      setSelectedDocumentIds([])
      setSubject('')
      if (focus) window.setTimeout(() => inputRef.current?.focus(), 100)
      return conversation
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'Could not create a new study chat.' })
      return null
    } finally {
      setCreatingConversation(false)
    }
  }

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) {
      setLoading(false)
      showToast({ kind: 'error', message: 'Your session has expired. Please sign in again.' })
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const [storedConversations, storedDocuments] = await Promise.all([
          api<Conversation[]>(`/assistant/conversations/?user_id=${userId}`),
          api<StudyDocument[]>(`/documents/?user_id=${userId}`),
        ])
        if (cancelled) return
        setConversations(storedConversations)
        setDocuments(storedDocuments)
        if (storedConversations[0]) {
          setActiveConversationId(storedConversations[0].id)
          await loadMessages(storedConversations[0].id)
        }
      } catch (error) {
        if (!cancelled) showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'Your assistant workspace could not be loaded. Please refresh and try again.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
    // Initial workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, sending])

  const switchConversation = (conversationId: number) => {
    if (conversationId === activeConversationId || messagesLoading) return
    setActiveConversationId(conversationId)
    setOpenMenuId(null)
    setSelectedDocumentIds([])
    setSubject('')
    void loadMessages(conversationId)
  }

  const renameConversation = async (conversation: Conversation) => {
    const userId = currentUserId()
    const title = renameValue.trim()
    if (!userId || !title) return
    try {
      const updated = await api<Conversation>(`/assistant/conversations/${conversation.id}`, { method: 'PATCH', body: JSON.stringify({ user_id: userId, title }) })
      setConversations(current => current.map(item => item.id === updated.id ? updated : item))
      setRenamingId(null)
      setOpenMenuId(null)
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'Chat could not be renamed.' })
    }
  }

  const deleteConversation = async (conversation: Conversation) => {
    const userId = currentUserId()
    if (!userId) return
    if (!window.confirm(`Delete “${conversation.title}”? This removes its saved messages.`)) return
    try {
      await api<void>(`/assistant/conversations/${conversation.id}?user_id=${userId}`, { method: 'DELETE' })
      const remaining = conversations.filter(item => item.id !== conversation.id)
      setConversations(remaining)
      setOpenMenuId(null)
      if (activeConversationId === conversation.id) {
        if (remaining[0]) switchConversation(remaining[0].id)
        else void createConversation(false)
      }
      showToast({ kind: 'success', message: 'Study chat deleted.' })
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'Chat could not be deleted.' })
    }
  }

  const toggleDocument = (documentId: number) => {
    setSelectedDocumentIds(current => current.includes(documentId) ? current.filter(id => id !== documentId) : [...current, documentId])
  }

  const send = async (preset?: { text: string; mode?: StudyMode }) => {
    const text = (preset?.text ?? input).trim()
    if (!text || sending) return
    let conversationId = activeConversationId
    if (!conversationId) {
      const conversation = await createConversation(false)
      if (!conversation) return
      conversationId = conversation.id
    }
    const userId = currentUserId()
    if (!userId || !conversationId) return

    const pendingId = -Date.now()
    const contextItems = selectedDocuments.map(document => ({ document_id: document.id, title: document.title, kind: document.folder.toLowerCase() === 'pdf imports' ? 'PDF' : 'Note' }))
    const optimistic: AssistantMessage = { id: pendingId, user_id: userId, conversation_id: conversationId, role: 'user', content: text, context_items: contextItems, created_at: new Date().toISOString(), pending: true }
    setMessages(current => [...current, optimistic])
    setInput('')
    setSending(true)
    try {
      const response = await api<{ conversation: Conversation; user_message: AssistantMessage; assistant_message: AssistantMessage }>('/assistant/messages/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, conversation_id: conversationId, content: text, document_ids: selectedDocumentIds, subject: subject.trim() || undefined, mode: preset?.mode }),
      })
      setMessages(current => [...current.filter(message => message.id !== pendingId), response.user_message, response.assistant_message])
      setConversations(current => [response.conversation, ...current.filter(item => item.id !== response.conversation.id)].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
    } catch (error) {
      setMessages(current => current.filter(message => message.id !== pendingId))
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : 'The assistant could not answer right now. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const runAction = async (message: AssistantMessage, kind: ActionKind) => {
    const userId = currentUserId()
    if (!userId || activeAction) return
    const meta = actionMeta[kind]
    setActiveAction(`${message.id}:${kind}`)
    try {
      const response = await api<ActionResponse>(`/assistant/actions/${kind}`, { method: 'POST', body: JSON.stringify({ user_id: userId, assistant_message_id: message.id }) })
      showToast({ kind: 'success', message: response.message, destination: meta.destination, actionLabel: meta.actionLabel })
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof ApiError ? error.message : `Could not ${meta.label.toLowerCase()}.` })
    } finally {
      setActiveAction(null)
    }
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  if (loading) {
    return <main className="min-h-full p-4 sm:p-6"><div className="mx-auto grid min-h-[680px] max-w-7xl animate-pulse gap-4 lg:grid-cols-[270px_minmax(0,1fr)]"><div className="hidden rounded-3xl bg-[var(--muted)] lg:block" /><div className="rounded-3xl bg-[var(--muted)]" /></div></main>
  }

  return (
    <main className="min-h-full p-3 sm:p-5 lg:p-6">
      <div className="relative mx-auto flex max-w-7xl overflow-visible rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_70px_-45px_rgba(79,70,229,0.65)]">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} absolute inset-y-0 left-0 z-30 flex w-[276px] flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-200 lg:static lg:w-[272px]`}>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25"><Sparkles size={18} /></span><div><p className="font-bold text-[var(--foreground)]">EduSphere AI</p><p className="text-[11px] text-[var(--muted-foreground)]">Study companion</p></div></div><button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close chat history" className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] lg:hidden"><PanelLeftClose size={17} /></button></div>
            <button type="button" onClick={() => void createConversation()} disabled={creatingConversation} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-60"><Plus size={16} /> {creatingConversation ? 'Creating…' : 'New chat'}</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <p className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--muted-foreground)]">Recent chats</p>
            {conversations.length === 0 ? <div className="px-3 py-8 text-center text-xs leading-5 text-[var(--muted-foreground)]">Start a chat to keep your study ideas, notes, and actions together.</div> : conversations.map(conversation => (
              <div key={conversation.id} className={`group relative mb-1 rounded-xl ${activeConversationId === conversation.id ? 'bg-indigo-50 dark:bg-indigo-950/35' : 'hover:bg-[var(--muted)]'}`}>
                {renamingId === conversation.id ? <div className="flex gap-1 p-2"><input autoFocus value={renameValue} onChange={event => setRenameValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void renameConversation(conversation); if (event.key === 'Escape') setRenamingId(null) }} className="min-w-0 flex-1 rounded-lg border border-indigo-400 bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none" /><button type="button" onClick={() => void renameConversation(conversation)} className="rounded-lg bg-indigo-600 p-1.5 text-white"><Check size={14} /></button></div> : <><button type="button" onClick={() => switchConversation(conversation.id)} className="block w-full min-w-0 px-3 py-2.5 pr-9 text-left"><span className={`block truncate text-sm font-semibold ${activeConversationId === conversation.id ? 'text-indigo-700 dark:text-indigo-200' : 'text-[var(--foreground)]'}`}>{conversation.title}</span><span className="mt-0.5 block text-[11px] text-[var(--muted-foreground)]">{formatConversationDate(conversation.updated_at)}</span></button><button type="button" onClick={() => setOpenMenuId(current => current === conversation.id ? null : conversation.id)} aria-label={`Manage ${conversation.title}`} className="absolute right-1.5 top-2.5 rounded-lg p-1.5 text-[var(--muted-foreground)] opacity-100 transition hover:bg-[var(--card)] hover:text-[var(--foreground)] lg:opacity-0 lg:group-hover:opacity-100"><MoreHorizontal size={16} /></button>{openMenuId === conversation.id && <div className="absolute right-2 top-9 z-40 w-32 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl"><button type="button" onClick={() => { setRenamingId(conversation.id); setRenameValue(conversation.title); setOpenMenuId(null) }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"><Pencil size={13} /> Rename</button><button type="button" onClick={() => void deleteConversation(conversation)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 size={13} /> Delete</button></div>}</>}
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] p-3"><div className="flex items-center gap-2 rounded-xl bg-[var(--muted)] px-3 py-2.5"><GraduationCap size={16} className="text-indigo-600 dark:text-indigo-300" /><p className="text-xs leading-4 text-[var(--muted-foreground)]">Attach notes or PDFs to make each answer study-specific.</p></div></div>
        </aside>

        {sidebarOpen && <button type="button" aria-label="Close chat history overlay" onClick={() => setSidebarOpen(false)} className="absolute inset-0 z-20 bg-slate-950/25 lg:hidden" />}

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
            <button type="button" onClick={() => setSidebarOpen(value => !value)} aria-label="Toggle chat history" className="rounded-xl p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] lg:hidden"><Menu size={19} /></button>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate text-base font-bold text-[var(--foreground)]">{activeConversation?.title ?? 'New study chat'}</h1><span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ready</span></div><p className="truncate text-xs text-[var(--muted-foreground)]">Connected to your workspace notes, PDFs, planner and revision tools</p></div>
            <button type="button" onClick={() => void createConversation()} className="hidden items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 sm:inline-flex"><Plus size={15} /> New chat</button>
          </header>

          <div className="border-b border-[var(--border)] bg-[var(--muted)]/35 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setSourcesOpen(value => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${sourcesOpen ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/35 dark:text-indigo-200' : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-indigo-300'}`}><LibraryBig size={15} /> Attach context <ChevronDown size={14} className={sourcesOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button><div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{selectedDocuments.map(document => <span key={document.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/35 dark:text-indigo-200"><FileText size={12} className="shrink-0" /><span className="max-w-28 truncate">{document.title}</span><button type="button" aria-label={`Remove ${document.title}`} onClick={() => toggleDocument(document.id)} className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800"><X size={11} /></button></span>)}{subject && <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-200"><BookOpen size={12} /><span className="max-w-28 truncate">{subject}</span><button type="button" aria-label="Remove subject" onClick={() => setSubject('')} className="rounded-full p-0.5 hover:bg-violet-200 dark:hover:bg-violet-800"><X size={11} /></button></span>}</div><div className="relative"><input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Subject or topic" className="w-32 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)] outline-none transition focus:border-indigo-400 sm:w-40" /></div></div>
            {sourcesOpen && <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[var(--foreground)]">Select workspace notes or imported PDFs</p><button type="button" onClick={() => setSourcesOpen(false)} className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><X size={15} /></button></div><input value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} placeholder="Search your material" className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-indigo-400" /><div className="mt-2 max-h-44 overflow-y-auto pr-1">{filteredDocuments.length === 0 ? <p className="px-2 py-5 text-center text-xs text-[var(--muted-foreground)]">No matching documents yet. Import a PDF or create a workspace note first.</p> : filteredDocuments.map(document => { const selected = selectedDocumentIds.includes(document.id); const isPdf = document.folder.toLowerCase() === 'pdf imports'; return <button key={document.id} type="button" onClick={() => toggleDocument(document.id)} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${selected ? 'bg-indigo-50 dark:bg-indigo-950/35' : 'hover:bg-[var(--muted)]'}`}><span className={`grid h-7 w-7 place-items-center rounded-lg ${isPdf ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'}`}><FileText size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[var(--foreground)]">{document.title}</span><span className="block text-[10px] text-[var(--muted-foreground)]">{isPdf ? 'Imported PDF' : document.folder || 'Workspace note'}</span></span><span className={`grid h-5 w-5 place-items-center rounded-full border ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-[var(--border)] text-transparent'}`}><Check size={12} strokeWidth={3} /></span></button> })}</div></div>}
          </div>

          <div className="bg-gradient-to-b from-[var(--background)] to-[var(--muted)]/25 px-4 py-5 sm:px-6">
            {messagesLoading ? <div className="space-y-4"><div className="h-20 w-4/5 animate-pulse rounded-2xl bg-[var(--muted)]" /><div className="ml-auto h-14 w-3/5 animate-pulse rounded-2xl bg-indigo-100 dark:bg-indigo-950/35" /></div> : messages.length === 0 ? <div className="mx-auto flex min-h-[28rem] max-w-2xl flex-col justify-center pb-12 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/25"><Sparkles size={29} /></div><h2 className="mt-5 text-2xl font-bold tracking-tight text-[var(--foreground)]">What are you studying today?</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Ask for a clear explanation, attach your notes or PDFs for source-aware help, or turn useful answers into revision material.</p><div className="mx-auto mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">{quickActions.slice(0, 4).map(action => { const Icon = action.icon; return <button key={action.mode} type="button" onClick={() => void send({ text: action.prompt, mode: action.mode })} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"><span className={`grid h-9 w-9 place-items-center rounded-xl bg-[var(--muted)] ${action.color}`}><Icon size={18} /></span><span className="text-sm font-semibold text-[var(--foreground)]">{action.label}</span><ChevronRight size={16} className="ml-auto text-[var(--muted-foreground)]" /></button> })}</div></div> : <div className="mx-auto max-w-3xl space-y-6">{messages.map(message => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm ${message.role === 'assistant' ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-slate-700 dark:bg-slate-600'}`}>{message.role === 'assistant' ? <Bot size={16} /> : <UserRound size={16} />}</div><div className={`min-w-0 max-w-[calc(100%-44px)] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}><div className={`${message.role === 'user' ? 'rounded-2xl rounded-tr-md bg-indigo-600 px-4 py-3 text-white shadow-md shadow-indigo-500/15' : 'w-full rounded-2xl rounded-tl-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm'} ${message.pending ? 'opacity-60' : ''}`}>{message.role === 'user' ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : <MarkdownContent content={message.content} />}</div>{message.context_items?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{message.context_items.map(item => <span key={`${message.id}-${item.document_id}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--muted)] px-2 py-1 text-[10px] font-semibold text-[var(--muted-foreground)]"><FileText size={10} className="text-indigo-600 dark:text-indigo-300" />{item.title}</span>)}</div>}{message.role === 'assistant' && !message.pending && <div className="mt-3 flex flex-wrap gap-2">{(Object.keys(actionMeta) as ActionKind[]).map(kind => { const meta = actionMeta[kind]; const Icon = meta.icon; const processing = activeAction === `${message.id}:${kind}`; return <button key={kind} type="button" disabled={Boolean(activeAction)} onClick={() => void runAction(message, kind)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-55 dark:hover:bg-indigo-950/35 dark:hover:text-indigo-200">{processing ? <LoaderCircle size={13} className="animate-spin" /> : <Icon size={13} />}{processing ? 'Saving…' : meta.label}</button> })}</div>}</div></div>)}{sending && <TypingIndicator />}<div ref={bottomRef} /></div>}
          </div>

          <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--card)]/95 p-3 shadow-[0_-14px_28px_-24px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-4"><div className="flex gap-2 overflow-x-auto pb-2">{quickActions.map(action => { const Icon = action.icon; return <button key={action.mode} type="button" disabled={sending} onClick={() => void send({ text: action.prompt, mode: action.mode })} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-55 dark:hover:bg-indigo-950/35 dark:hover:text-indigo-200"><Icon size={13} className={action.color} />{action.label}</button> })}</div><div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-2 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10"><textarea ref={inputRef} rows={1} value={input} onChange={event => { setInput(event.target.value); event.currentTarget.style.height = 'auto'; event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 144)}px` }} onKeyDown={onInputKeyDown} placeholder="Ask about your study material…" className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]" /><button type="button" onClick={() => void send()} disabled={!input.trim() || sending} aria-label="Send message" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"><Send size={17} /></button></div><p className="mt-2 text-center text-[10px] text-[var(--muted-foreground)]">Enter to send · Shift + Enter for a new line · Attach notes or PDFs for source-aware help</p></div>
        </section>
      </div>

      {toast && <div className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${toast.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100'}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/70 dark:bg-black/15">{toast.kind === 'success' ? <Check size={16} /> : <X size={16} />}</span><p className="flex-1 text-xs font-semibold leading-5">{toast.message}</p>{toast.destination && <button type="button" onClick={() => setPage(toast.destination!)} className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">{toast.actionLabel}</button>}<button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"><X size={14} /></button></div>}
    </main>
  )
}

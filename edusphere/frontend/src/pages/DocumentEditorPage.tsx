import { useEffect, useState } from 'react'
import { Share2, MoreHorizontal, ChevronRight, Check, X } from 'lucide-react'
import type { Page } from '../types'
import type { StudyDocument } from '../types'
import { api, currentUserId } from '../lib/api'

const blocks = [
  { type: 'heading', content: 'TCP — Transmission Control Protocol' },
  { type: 'callout', content: '📌 Key Concept: TCP is a connection-oriented protocol providing reliable, ordered, and error-checked delivery of data.' },
  { type: 'paragraph', content: 'TCP (Transmission Control Protocol) operates at the transport layer of the OSI model. It establishes a connection before data transmission using the three-way handshake mechanism, ensuring both parties are ready to communicate.' },
  { type: 'heading2', content: 'Three-Way Handshake' },
  { type: 'paragraph', content: 'The TCP three-way handshake is the process used to establish a reliable connection between a client and server.' },
  { type: 'bullet', content: 'SYN — Client sends a SYN packet to the server to initiate a connection' },
  { type: 'bullet', content: 'SYN-ACK — Server responds with SYN-ACK, acknowledging the request' },
  { type: 'bullet', content: 'ACK — Client sends ACK to confirm, and the connection is established' },
  { type: 'heading2', content: 'Congestion Control' },
  { type: 'paragraph', content: 'TCP uses several algorithms for congestion control including Slow Start, Congestion Avoidance, Fast Retransmit, and Fast Recovery.' },
  { type: 'code', content: 'socket = socket.socket(AF_INET, SOCK_STREAM)\nsocket.connect((host, port))\nsocket.send(data.encode())\nresponse = socket.recv(1024)' },
]

const collaborators = [
  { name: 'Akshit', color: '#4f46e5', editing: false },
  { name: 'Rahul', color: '#10b981', editing: true },
  { name: 'Aman', color: '#f59e0b', editing: false },
]

const slashItems = ['Heading', 'Text', 'Checklist', 'Table', 'Image', 'Code', 'Callout', 'File']

interface DocumentShare {
  id: number
  document_id: number
  email: string
  permission: 'view' | 'edit'
  created_at: string
}

export default function DocumentEditorPage({ setPage, documentId, onDocumentChange }: { setPage: (p: Page) => void; documentId: number | null; onDocumentChange: (id: number | null) => void }) {
  const [showSlash, setShowSlash] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [saved, setSaved] = useState(true)
  const [shareEmail, setShareEmail] = useState('')
  const [document, setDocument] = useState<StudyDocument | null>(null)
  const [showDocumentMenu, setShowDocumentMenu] = useState(false)
  const [shares, setShares] = useState<DocumentShare[]>([])
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('edit')
  const [shareNotice, setShareNotice] = useState('')

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) return
    let cancelled = false

    const openDocument = async () => {
      try {
        if (documentId) {
          const selected = await api<StudyDocument>(`/documents/${documentId}`)
          if (!cancelled) setDocument(selected)
          return
        }
        const documents = await api<StudyDocument[]>(`/documents/?user_id=${userId}`)
        if (documents[0]) {
          if (!cancelled) {
            setDocument(documents[0])
            onDocumentChange(documents[0].id)
          }
          return
        }
        const created = await api<StudyDocument>('/documents/', {
          method: 'POST',
          body: JSON.stringify({ owner_id: userId, title: 'Untitled study note', content: '', folder: 'General' }),
        })
        if (!cancelled) {
          setDocument(created)
          onDocumentChange(created.id)
        }
      } catch (error) {
        console.error('Unable to open document:', error)
      }
    }

    void openDocument()
    return () => { cancelled = true }
  }, [documentId, onDocumentChange])

  const sharedDocumentId = document?.id

  useEffect(() => {
    if (!sharedDocumentId) {
      setShares([])
      return
    }
    api<DocumentShare[]>(`/documents/${sharedDocumentId}/shares`)
      .then(setShares)
      .catch(() => setShareNotice('Sharing details could not be loaded.'))
  }, [sharedDocumentId])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === '/') setShowSlash(true)
    else if (e.key === 'Escape') setShowSlash(false)
    else { setSaved(false); setTimeout(() => setSaved(true), 1500) }
  }

  const saveField = async (field: 'title' | 'content', value: string) => {
    if (!document) return
    setSaved(false)
    try {
      const updated = await api<StudyDocument>(`/documents/${document.id}`, { method: 'PUT', body: JSON.stringify({ [field]: value }) })
      setDocument(updated)
    } catch (error) {
      console.error('Unable to save document:', error)
    } finally {
      setSaved(true)
    }
  }

  const insertBlock = async (item: string) => {
    if (!document) return
    const prefix = document.content ? `${document.content}\n\n` : ''
    await saveField('content', `${prefix}${item}\n`)
    setShowSlash(false)
  }

  const duplicateDocument = async () => {
    const userId = currentUserId()
    if (!document || !userId) return
    try {
      const duplicate = await api<StudyDocument>('/documents/', {
        method: 'POST',
        body: JSON.stringify({ owner_id: userId, title: `${document.title} (copy)`, content: document.content, folder: document.folder }),
      })
      setDocument(duplicate)
      onDocumentChange(duplicate.id)
      setShowDocumentMenu(false)
    } catch (error) {
      console.error('Unable to duplicate document:', error)
    }
  }

  const deleteCurrentDocument = async () => {
    if (!document || !window.confirm(`Delete “${document.title}”?`)) return
    try {
      await api<void>(`/documents/${document.id}`, { method: 'DELETE' })
      onDocumentChange(null)
      setPage('workspace')
    } catch (error) {
      console.error('Unable to delete document:', error)
    }
  }

  const invite = async () => {
    const email = shareEmail.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setShareNotice('Enter a valid email address first.')
      return
    }
    if (!document) return
    try {
      const share = await api<DocumentShare>(`/documents/${document.id}/shares`, {
        method: 'POST',
        body: JSON.stringify({ email, permission: sharePermission }),
      })
      setShares(previous => [...previous.filter(item => item.id !== share.id && item.email !== share.email), share])
      setShareEmail('')
      setShareNotice(`Access saved for ${email}.`)
    } catch (error) {
      setShareNotice(error instanceof Error ? error.message : 'The invitation could not be saved.')
    }
  }

  const removeShare = async (share: DocumentShare) => {
    if (!document) return
    try {
      await api<void>(`/documents/${document.id}/shares/${share.id}`, { method: 'DELETE' })
      setShares(previous => previous.filter(item => item.id !== share.id))
      setShareNotice(`Access removed for ${share.email}.`)
    } catch (error) {
      setShareNotice(error instanceof Error ? error.message : 'The invitation could not be removed.')
    }
  }

  const displayBlocks = document ? [
    { type: 'heading', content: document.title },
    { type: 'paragraph', content: document.content || 'Start writing your study notes…' },
  ] : blocks

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Doc toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Breadcrumb */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <button className="hover:text-foreground transition-colors" onClick={() => setPage('workspace')}>Workspace</button>
          <ChevronRight size={14} />
          <span>{document?.folder ?? 'Workspace'}</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--foreground)' }} className="font-medium">{document?.title ?? 'Document'}</span>
        </nav>

        <div className="flex items-center gap-2">
          {/* Autosave */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {saved ? <><Check size={12} style={{ color: '#10b981' }} /> Saved</> : <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Saving...</>}
          </div>

          {/* Collaborators */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}>
            {collaborators.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: c.color }}>{c.name[0]}</div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${c.editing ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
              </div>
            ))}
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {collaborators.find(c => c.editing)?.name} is editing...
            </span>
          </div>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            <Share2 size={14} /> Share
          </button>

          <div className="relative">
          <button onClick={() => setShowDocumentMenu(open => !open)} aria-label="Document actions" className="p-2 rounded-lg hover:bg-muted transition-colors" style={{ color: 'var(--muted-foreground)' }}>
            <MoreHorizontal size={16} />
          </button>
          {showDocumentMenu && <div className="absolute right-0 top-10 z-30 w-36 rounded-lg border py-1 shadow-lg" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <button onClick={() => void duplicateDocument()} className="w-full px-3 py-2 text-left text-xs hover:bg-muted" style={{ color: 'var(--foreground)' }}>Duplicate note</button>
            <button onClick={() => void deleteCurrentDocument()} className="w-full px-3 py-2 text-left text-xs hover:bg-muted" style={{ color: '#ef4444' }}>Delete note</button>
          </div>}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {displayBlocks.map((block, i) => (
            <div key={i} className="group relative">
              {block.type === 'heading' && (
                <h1
                  contentEditable suppressContentEditableWarning
                  onKeyDown={handleKey}
                  onBlur={event => saveField('title', event.currentTarget.innerText)}
                  className="text-4xl font-heading font-bold mb-2 outline-none focus:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                  style={{ color: 'var(--foreground)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  {block.content}
                </h1>
              )}
              {block.type === 'heading2' && (
                <h2
                  contentEditable suppressContentEditableWarning
                  onKeyDown={handleKey}
                  onBlur={event => saveField('content', event.currentTarget.innerText)}
                  className="text-2xl font-heading font-bold mt-8 mb-3 outline-none px-2 -mx-2 rounded-lg focus:bg-muted/50 transition-colors"
                  style={{ color: 'var(--foreground)' }}
                >
                  {block.content}
                </h2>
              )}
              {block.type === 'paragraph' && (
                <p
                  contentEditable suppressContentEditableWarning
                  onKeyDown={handleKey}
                  onBlur={event => saveField('content', event.currentTarget.innerText)}
                  className="text-base leading-7 mb-4 outline-none px-2 -mx-2 rounded-lg focus:bg-muted/50 transition-colors"
                  style={{ color: 'var(--foreground)', opacity: 0.9 }}
                >
                  {block.content}
                </p>
              )}
              {block.type === 'callout' && (
                <div className="flex gap-3 p-4 rounded-xl mb-4 border" style={{ background: 'var(--secondary-bg)', borderColor: 'var(--primary)20' }}>
                  <p
                    contentEditable suppressContentEditableWarning
                    className="text-sm leading-6 outline-none flex-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {block.content}
                  </p>
                </div>
              )}
              {block.type === 'bullet' && (
                <div className="flex items-start gap-3 mb-2 px-2 -mx-2 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full mt-2.5 shrink-0" style={{ background: 'var(--primary)' }} />
                  <p
                    contentEditable suppressContentEditableWarning
                    onKeyDown={handleKey}
                    className="text-base leading-7 outline-none flex-1"
                    style={{ color: 'var(--foreground)', opacity: 0.9 }}
                  >
                    {block.content}
                  </p>
                </div>
              )}
              {block.type === 'code' && (
                <div className="rounded-xl mb-4 overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-2 border-b" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                    <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>python</span>
                  </div>
                  <pre
                    contentEditable suppressContentEditableWarning
                    className="p-4 text-sm outline-none overflow-x-auto"
                    style={{ background: 'var(--card)', color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {block.content}
                  </pre>
                </div>
              )}
            </div>
          ))}

          {/* Slash command */}
          <div className="relative mt-4">
            <p
              contentEditable suppressContentEditableWarning
              onKeyDown={handleKey}
              className="text-base outline-none px-2 -mx-2 rounded-lg py-1 focus:bg-muted/30 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              data-placeholder="Press / for commands..."
            />
            {showSlash && (
              <div
                className="absolute left-0 top-8 w-56 rounded-xl border shadow-xl overflow-hidden z-50"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>INSERT BLOCK</span>
                </div>
                {slashItems.map(item => (
                  <button
                    key={item}
                    onClick={() => void insertBlock(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowShare(false)}>
          <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-4" style={{ color: 'var(--foreground)' }}>Share document</h3>
            <div className="flex gap-2 mb-4">
              <input
                value={shareEmail} onChange={e => setShareEmail(e.target.value)}
                placeholder="Invite by email..."
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:border-primary"
                style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              />
              <select value={sharePermission} onChange={event => setSharePermission(event.target.value as 'view' | 'edit')} className="px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </select>
              <button onClick={() => void invite()} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}>Invite</button>
            </div>
            {shareNotice && <p className="text-xs mb-3" style={{ color: shareNotice.includes('saved') || shareNotice.includes('removed') ? '#10b981' : '#ef4444' }}>{shareNotice}</p>}
            <div className="space-y-2">
              {shares.map(share => (
                <div key={share.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--muted)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: '#7c3aed' }}>{share.email[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><div className="truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>{share.email}</div><div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Can {share.permission}</div></div>
                  <button onClick={() => void removeShare(share)} aria-label={`Remove ${share.email}`} className="rounded p-1 hover:bg-background" style={{ color: 'var(--muted-foreground)' }}><X size={14} /></button>
                </div>
              ))}
              {!shares.length && <p className="px-1 py-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>Only you have access to this document.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

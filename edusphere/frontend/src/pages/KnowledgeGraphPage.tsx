import { useEffect, useState } from 'react'
import { X, BookOpen, CreditCard, BarChart2, ArrowRight, Plus } from 'lucide-react'
import type { Page } from '../types'
import { api, currentUserId } from '../lib/api'

interface Node {
  id: string
  label: string
  x: number
  y: number
  size: number
  color: string
  mastery: number
  notes: number
  flashcards: number
  quizAcc: number
  prerequisites: string[]
}

function masteryColor(m: number) {
  if (m >= 75) return '#10b981'
  if (m >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function KnowledgeGraphPage({ setPage }: { setPage: (p: Page) => void }) {
  const [selected, setSelected] = useState<Node | null>(null)
  const [search, setSearch] = useState('')
  const [nodes, setNodes] = useState<Node[]>([])
  const [showConceptForm, setShowConceptForm] = useState(false)
  const [conceptName, setConceptName] = useState('')
  const [conceptDescription, setConceptDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) return
    api<{ id: number; name: string; description: string | null; category: string }[]>(`/concepts/?user_id=${userId}`)
      .then(concepts => setNodes(concepts.map((concept, index) => ({
        id: String(concept.id),
        label: concept.name,
        x: 100 + (index % 5) * 150,
        y: 95 + Math.floor(index / 5) * 150,
        size: 24,
        color: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#3b82f6'][index % 5],
        mastery: 0,
        notes: 0,
        flashcards: 0,
        quizAcc: 0,
        prerequisites: [],
      }))))
      .catch(() => setError('Concepts could not be loaded. Please try again.'))
  }, [])

  const addConcept = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = conceptName.trim()
    const userId = currentUserId()
    if (!name || !userId) return
    setSaving(true)
    setError('')
    try {
      const concept = await api<{ id: number; name: string; description: string | null; category: string }>('/concepts/', {
        method: 'POST', body: JSON.stringify({ user_id: userId, name, description: conceptDescription.trim() || null }),
      })
      setNodes(previous => [...previous, {
        id: String(concept.id), label: concept.name, x: 100 + (previous.length % 5) * 150,
        y: 95 + Math.floor(previous.length / 5) * 150, size: 24,
        color: '#4f46e5', mastery: 0, notes: 0, flashcards: 0, quizAcc: 0, prerequisites: [],
      }])
      setConceptName('')
      setConceptDescription('')
      setShowConceptForm(false)
    } catch {
      setError('The concept could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = search ? nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase())) : nodes

  return (
    <div className="h-full flex overflow-hidden">
      {/* Graph area */}
      <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--background)' }}>
        {/* Controls */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', width: 200 }}
          />
          <button onClick={() => { setError(''); setShowConceptForm(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={15} /> Add concept</button>
        </div>
        {error && <div className="absolute left-4 right-4 top-16 z-20 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</div>}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 rounded-xl border p-3 text-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Mastery Level</div>
          {[{ c: '#10b981', l: '≥75% Strong' }, { c: '#f59e0b', l: '50-74% Learning' }, { c: '#ef4444', l: '<50% Needs work' }].map(x => (
            <div key={x.l} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: x.c }} />
              <span style={{ color: 'var(--muted-foreground)' }}>{x.l}</span>
            </div>
          ))}
        </div>

        {/* SVG graph */}
        <svg width="100%" height="100%" viewBox="0 0 800 400" className="w-full h-full">
          {/* Edges */}
          <g>
            {([] as [string, string][]).map(([from, to]) => {
              const a = nodes.find(n => n.id === from)!
              const b = nodes.find(n => n.id === to)!
              return (
                <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.5} style={{ stroke: 'var(--border)' }} />
              )
            })}
          </g>

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selected?.id === node.id
            const isFiltered = filtered.find(n => n.id === node.id)
            const opacity = search && !isFiltered ? 0.2 : 1
            return (
              <g key={node.id} style={{ cursor: 'pointer', opacity }} onClick={() => setSelected(isSelected ? null : node)}>
                {/* Glow ring for selected */}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={node.size + 8} fill="none" stroke={node.color} strokeWidth={2} opacity={0.4} />
                )}
                {/* Mastery ring */}
                <circle cx={node.x} cy={node.y} r={node.size + 3} fill="none" stroke={masteryColor(node.mastery)} strokeWidth={2} opacity={0.6}
                  strokeDasharray={`${(node.mastery / 100) * 2 * Math.PI * (node.size + 3)} ${2 * Math.PI * (node.size + 3)}`}
                  strokeLinecap="round"
                  transform={`rotate(-90, ${node.x}, ${node.y})`}
                />
                {/* Main circle */}
                <circle cx={node.x} cy={node.y} r={node.size} fill={node.color} opacity={isSelected ? 1 : 0.85} />
                {/* Label */}
                <text x={node.x} y={node.y + node.size + 14} textAnchor="middle" fontSize={11} fontFamily="Inter, sans-serif" fontWeight={500} fill="var(--foreground)" opacity={0.8}>
                  {node.label}
                </text>
                {/* Mastery % */}
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={600} fill="white">
                  {node.mastery}%
                </text>
              </g>
            )
          })}
        </svg>
        {!nodes.length && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="rounded-xl border px-4 py-3 text-sm" style={{ color: 'var(--muted-foreground)', background: 'var(--card)', borderColor: 'var(--border)' }}>No concepts saved yet. Add your first concept to build this graph.</p></div>}
      </div>

      {/* Details panel */}
      {selected && (
        <aside className="w-72 border-l overflow-y-auto shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
                <h3 className="font-heading font-bold text-base" style={{ color: 'var(--foreground)' }}>{selected.label}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--muted-foreground)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Mastery */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Mastery</span>
                <span className="text-sm font-semibold font-mono" style={{ color: masteryColor(selected.mastery) }}>{selected.mastery}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${selected.mastery}%`, background: masteryColor(selected.mastery) }} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: BookOpen, label: 'Notes', value: selected.notes },
                { icon: CreditCard, label: 'Cards', value: selected.flashcards },
                { icon: BarChart2, label: 'Quiz Acc', value: `${selected.quizAcc}%` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'var(--muted)' }}>
                  <Icon size={14} className="mx-auto mb-1" style={{ color: selected.color }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{value}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Prerequisites */}
            {selected.prerequisites.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Prerequisites</div>
                {selected.prerequisites.map(p => {
                  const prereq = nodes.find(n => n.id === p)
                  return prereq ? (
                    <div key={p} className="flex items-center gap-2 text-sm py-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: prereq.color }} />
                      <span style={{ color: 'var(--foreground)' }}>{prereq.label}</span>
                    </div>
                  ) : null
                })}
              </div>
            )}

            <button
              onClick={() => setPage('document')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{ background: selected.color, color: '#fff' }}
            >
              Study This Topic <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      )}
      {showConceptForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={() => !saving && setShowConceptForm(false)}><form onSubmit={event => void addConcept(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Knowledge graph</p><h2 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>Add concept</h2></div><button type="button" onClick={() => setShowConceptForm(false)} className="rounded-lg p-2 hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button></div><label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Concept name<input required autoFocus value={conceptName} onChange={event => setConceptName(event.target.value)} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} placeholder="e.g. Recursion" /></label><label className="mt-4 block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Description <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span><textarea value={conceptDescription} onChange={event => setConceptDescription(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowConceptForm(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{saving ? 'Saving…' : 'Save concept'}</button></div></form></div>}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowRight, BookOpen, CreditCard, Filter, Link2, ListTodo, LoaderCircle, Network, Plus, RefreshCw, Search, X } from 'lucide-react'
import type { Page } from '../types'
import { api, ApiError, currentUserId } from '../lib/api'

type GraphNodeType = 'concept' | 'note' | 'flashcard' | 'task'

interface KnowledgeNode {
  id: string
  entity_id: number
  node_type: GraphNodeType
  label: string
  description: string | null
  category: string
  mastery: number
  linked_notes: { id: number; title: string }[]
  linked_flashcards: { id: number; front: string }[]
  linked_tasks: { id: number; title: string; status: string }[]
}

interface KnowledgeEdge {
  id: string
  source: string
  target: string
  relationship_type: string
}

interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  categories: string[]
}

const typeStyles: Record<GraphNodeType, { color: string; label: string }> = {
  concept: { color: '#4f46e5', label: 'Topic' },
  note: { color: '#0284c7', label: 'Note' },
  flashcard: { color: '#a855f7', label: 'Flashcard' },
  task: { color: '#d97706', label: 'Task' },
}

function categoryColor(category: string) {
  const palette = ['#4f46e5', '#0f766e', '#b45309', '#9333ea', '#dc2626', '#0369a1']
  const total = [...category].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return palette[total % palette.length]
}

function masteryColor(mastery: number) {
  if (mastery >= 75) return '#10b981'
  if (mastery >= 40) return '#f59e0b'
  return '#ef4444'
}

function makeFlowNodes(items: KnowledgeNode[]): Node[] {
  const concepts = items.filter(item => item.node_type === 'concept')
  const artifacts = items.filter(item => item.node_type !== 'concept')
  const conceptPosition = new Map(concepts.map((item, index) => [item.id, {
    x: 100 + (index % 4) * 260,
    y: 90 + Math.floor(index / 4) * 190,
  }]))
  return items.map((item, index) => {
    const position = conceptPosition.get(item.id) ?? {
      x: 130 + (index % 5) * 210,
      y: 460 + Math.floor(artifacts.findIndex(artifact => artifact.id === item.id) / 5) * 145,
    }
    const accent = item.node_type === 'concept' ? categoryColor(item.category) : typeStyles[item.node_type].color
    return {
      id: item.id,
      position,
      data: {
        label: <div className="min-w-28 max-w-40"><div className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} /><span className="truncate text-xs font-bold">{item.label}</span></div><div className="mt-1 flex items-center justify-between gap-2 text-[10px]" style={{ color: 'var(--muted-foreground)' }}><span className="truncate">{item.node_type === 'concept' ? item.category : typeStyles[item.node_type].label}</span>{item.node_type === 'concept' && <span style={{ color: masteryColor(item.mastery) }}>{item.mastery}%</span>}</div></div>,
      },
      style: {
        border: `1px solid ${accent}45`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 12,
        background: 'var(--card)',
        color: 'var(--foreground)',
        boxShadow: '0 5px 18px rgba(15, 23, 42, 0.08)',
        padding: '9px 11px',
      },
    }
  })
}

export default function KnowledgeGraphPage({ setPage }: { setPage: (p: Page) => void }) {
  const [graph, setGraph] = useState<KnowledgeGraphData>({ nodes: [], edges: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [showConceptForm, setShowConceptForm] = useState(false)
  const [conceptName, setConceptName] = useState('')
  const [conceptDescription, setConceptDescription] = useState('')
  const [conceptCategory, setConceptCategory] = useState('concept')
  const [saving, setSaving] = useState(false)
  const [connectionTarget, setConnectionTarget] = useState('')
  const [connecting, setConnecting] = useState(false)

  const loadGraph = useCallback(async () => {
    const userId = currentUserId()
    if (!userId) {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const graphData = await api<KnowledgeGraphData>(`/knowledge-graph/?user_id=${userId}`)
      setGraph(graphData)
      setSelected(previous => previous ? graphData.nodes.find(node => node.id === previous.id) ?? null : null)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Your knowledge graph could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadGraph() }, [loadGraph])

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase()
    return graph.nodes.filter(node => (
      (category === 'all' || node.category === category)
      && (!term || `${node.label} ${node.description ?? ''} ${node.category}`.toLowerCase().includes(term))
    ))
  }, [category, graph.nodes, search])
  const visibleIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes])
  const flowNodes = useMemo(() => makeFlowNodes(visibleNodes), [visibleNodes])
  const flowEdges = useMemo<Edge[]>(() => graph.edges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.relationship_type !== 'related_to',
    label: edge.relationship_type === 'related_to' ? undefined : edge.relationship_type.replaceAll('_', ' '),
    style: { stroke: 'var(--border)', strokeWidth: 1.7 },
    labelStyle: { fill: 'var(--muted-foreground)', fontSize: 10 },
    labelBgStyle: { fill: 'var(--card)', fillOpacity: 0.9 },
  })), [graph.edges, visibleIds])
  const connectionOptions = graph.nodes.filter(node => node.node_type === 'concept' && node.id !== selected?.id)

  const addConcept = async (event: React.FormEvent) => {
    event.preventDefault()
    const userId = currentUserId()
    const name = conceptName.trim()
    if (!userId || !name) return
    setSaving(true)
    setError('')
    try {
      await api('/concepts/', { method: 'POST', body: JSON.stringify({ user_id: userId, name, description: conceptDescription.trim() || null, category: conceptCategory.trim() || 'concept' }) })
      setConceptName('')
      setConceptDescription('')
      setConceptCategory('concept')
      setShowConceptForm(false)
      await loadGraph()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The concept could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const connectConcepts = async () => {
    const userId = currentUserId()
    if (!userId || !selected || selected.node_type !== 'concept' || !connectionTarget) return
    const target = graph.nodes.find(node => node.id === connectionTarget)
    if (!target) return
    setConnecting(true)
    try {
      await api('/knowledge-graph/relationships', { method: 'POST', body: JSON.stringify({ user_id: userId, source_id: selected.entity_id, target_id: target.entity_id, relationship_type: 'related_to' }) })
      setConnectionTarget('')
      await loadGraph()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The topics could not be connected. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const selectedAccent = selected ? (selected.node_type === 'concept' ? categoryColor(selected.category) : typeStyles[selected.node_type].color) : 'var(--primary)'

  return <div className="min-h-full p-4 sm:p-6 lg:p-8" style={{ background: 'var(--background)' }}>
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      <header className="relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-52 w-52 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}><Network size={16} /> Knowledge map</p><h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--foreground)' }}>Connect what you are learning</h1><p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>Explore concepts and the notes, flashcards, and tasks linked to them.</p></div><button type="button" onClick={() => { setError(''); setShowConceptForm(true) }} className="inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-px hover:shadow-md" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={16} /> Add topic</button></div>
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border p-3 shadow-sm lg:flex-row lg:items-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <label className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}><Search size={16} style={{ color: 'var(--muted-foreground)' }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search topics, notes, or linked study items…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--foreground)' }} /></label>
        <div className="flex items-center gap-2"><Filter size={15} style={{ color: 'var(--muted-foreground)' }} /><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter graph category" className="rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="all">All categories</option>{graph.categories.map(item => <option key={item} value={item}>{item}</option>)}</select><button type="button" title="Refresh graph" onClick={() => void loadGraph()} className="rounded-xl p-2.5 transition-colors hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><RefreshCw size={16} /></button></div>
      </div>

      {error && <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm" style={{ background: '#ef444412', borderColor: '#ef444433', color: '#b91c1c' }}><span>{error}</span><button type="button" onClick={() => void loadGraph()} className="font-semibold underline">Retry</button></div>}

      <div className={`grid min-h-[590px] gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
        <section className="relative h-[590px] overflow-hidden rounded-2xl border shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {loading ? <div className="h-full p-5"><div className="h-7 w-52 animate-pulse rounded-lg" style={{ background: 'var(--muted)' }} /><div className="grid h-[490px] grid-cols-3 gap-10 p-12"><div className="h-20 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /><div className="mt-24 h-20 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /><div className="mt-10 h-20 animate-pulse rounded-2xl" style={{ background: 'var(--muted)' }} /></div></div> : !graph.nodes.length ? <div className="flex h-full flex-col items-center justify-center p-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--secondary-bg)', color: 'var(--primary)' }}><Network size={30} /></div><h2 className="mt-5 font-heading text-xl font-bold" style={{ color: 'var(--foreground)' }}>Your knowledge map starts here</h2><p className="mt-2 max-w-sm text-sm leading-6" style={{ color: 'var(--muted-foreground)' }}>Add a topic, then use its name in your notes, flashcards, or planner tasks to automatically reveal learning connections.</p><button type="button" onClick={() => setShowConceptForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={16} /> Add your first topic</button></div> : !visibleNodes.length ? <div className="flex h-full flex-col items-center justify-center p-8 text-center"><Search size={30} style={{ color: 'var(--muted-foreground)' }} /><h2 className="mt-4 font-heading text-lg font-bold" style={{ color: 'var(--foreground)' }}>No matching nodes</h2><button type="button" onClick={() => { setSearch(''); setCategory('all') }} className="mt-3 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Clear filters</button></div> : <ReactFlow nodes={flowNodes} edges={flowEdges} onNodeClick={(_, node) => setSelected(graph.nodes.find(item => item.id === node.id) ?? null)} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.25} maxZoom={1.7} proOptions={{ hideAttribution: true }}>
            <Background gap={20} size={1} color="var(--border)" /><Controls position="bottom-right" showInteractive={false} /><MiniMap nodeColor={node => String(node.style?.borderLeftColor ?? 'var(--primary)')} maskColor="rgba(15, 23, 42, 0.08)" position="bottom-left" />
          </ReactFlow>}
          {!loading && graph.nodes.length > 0 && <div className="pointer-events-none absolute left-4 top-4 rounded-xl border px-3 py-2 text-xs shadow-sm" style={{ background: 'color-mix(in srgb, var(--card) 92%, transparent)', borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>{visibleNodes.length} nodes · {flowEdges.length} connections <span className="ml-2 hidden sm:inline">Drag, scroll, and click to explore</span></div>}
        </section>

        {selected && <aside className="overflow-hidden rounded-2xl border shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="border-b p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: selectedAccent }} /><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{selected.node_type === 'concept' ? selected.category : typeStyles[selected.node_type].label}</p></div><h2 className="mt-1 truncate font-heading text-lg font-bold" style={{ color: 'var(--foreground)' }}>{selected.label}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><X size={17} /></button></div>{selected.description && <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted-foreground)' }}>{selected.description}</p>}</div>
          <div className="max-h-[465px] space-y-5 overflow-y-auto p-4">{selected.node_type === 'concept' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span style={{ color: 'var(--muted-foreground)' }}>Learning activity</span><strong style={{ color: masteryColor(selected.mastery) }}>{selected.mastery}%</strong></div><div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}><div className="h-full rounded-full" style={{ width: `${selected.mastery}%`, background: masteryColor(selected.mastery) }} /></div></div><div className="grid grid-cols-3 gap-2">{[{ icon: BookOpen, label: 'Notes', value: selected.linked_notes.length }, { icon: CreditCard, label: 'Cards', value: selected.linked_flashcards.length }, { icon: ListTodo, label: 'Tasks', value: selected.linked_tasks.length }].map(({ icon: Icon, label, value }) => <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--muted)' }}><Icon size={15} className="mx-auto" style={{ color: selectedAccent }} /><strong className="mt-1 block text-sm" style={{ color: 'var(--foreground)' }}>{value}</strong><span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{label}</span></div>)}</div>{selected.linked_notes.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Linked notes</p>{selected.linked_notes.slice(0, 4).map(note => <button key={note.id} onClick={() => setPage('workspace')} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted" style={{ color: 'var(--foreground)' }}><BookOpen size={14} style={{ color: '#0284c7' }} /><span className="truncate">{note.title}</span></button>)}</div>}{selected.linked_flashcards.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Linked flashcards</p>{selected.linked_flashcards.slice(0, 3).map(card => <button key={card.id} onClick={() => setPage('flashcards')} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted" style={{ color: 'var(--foreground)' }}><CreditCard size={14} style={{ color: '#a855f7' }} /><span className="truncate">{card.front}</span></button>)}</div>}{selected.linked_tasks.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Linked tasks</p>{selected.linked_tasks.slice(0, 3).map(task => <button key={task.id} onClick={() => setPage('planner')} className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted" style={{ color: 'var(--foreground)' }}><ListTodo size={14} style={{ color: '#d97706' }} /><span className="truncate">{task.title}</span></button>)}</div>}<div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Connect a topic</p><div className="flex gap-2"><select value={connectionTarget} onChange={event => setConnectionTarget(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs outline-none" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}><option value="">Choose topic</option>{connectionOptions.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select><button type="button" disabled={!connectionTarget || connecting} onClick={() => void connectConcepts()} className="rounded-lg px-2.5 disabled:opacity-50" style={{ background: selectedAccent, color: '#fff' }}>{connecting ? <LoaderCircle className="animate-spin" size={15} /> : <Link2 size={15} />}</button></div></div></>}</div>
          <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}><button type="button" onClick={() => setPage(selected.node_type === 'note' ? 'workspace' : selected.node_type === 'flashcard' ? 'flashcards' : selected.node_type === 'task' ? 'planner' : 'workspace')} className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold" style={{ background: selectedAccent, color: '#fff' }}>Open related study area <ArrowRight size={15} /></button></div>
        </aside>}
      </div>
    </div>

    {showConceptForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => !saving && setShowConceptForm(false)}><form onSubmit={event => void addConcept(event)} onMouseDown={event => event.stopPropagation()} className="w-full max-w-md rounded-t-2xl border p-5 shadow-2xl sm:rounded-2xl sm:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}><div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Knowledge graph</p><h2 className="mt-1 font-heading text-xl font-bold" style={{ color: 'var(--foreground)' }}>Add a topic</h2></div><button type="button" onClick={() => setShowConceptForm(false)} className="rounded-lg p-2 hover:bg-muted" style={{ color: 'var(--muted-foreground)' }}><X size={18} /></button></div><div className="space-y-4"><label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Topic name<input autoFocus required value={conceptName} onChange={event => setConceptName(event.target.value)} placeholder="e.g. Binary Trees" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Subject or category<input value={conceptCategory} onChange={event => setConceptCategory(event.target.value)} placeholder="e.g. Data Structures" className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label><label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Description <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>(optional)</span><textarea value={conceptDescription} onChange={event => setConceptDescription(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border px-3 py-2.5 font-normal outline-none focus:border-primary" style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }} /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowConceptForm(false)} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--primary)', color: '#fff' }}>{saving && <LoaderCircle size={15} className="animate-spin" />}{saving ? 'Saving…' : 'Save topic'}</button></div></form></div>}
  </div>
}

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { api, currentUserId } from '../lib/api'

interface StoredFlashcard {
  id: number
  front: string
  back: string
  subject: string | null
  next_review_at: string
  review_count: number
}

type Rating = 'again' | 'hard' | 'good' | 'easy'
const ratings: { id: Rating; label: string; color: string; days: string }[] = [
  { id: 'again', label: 'Again', color: '#ef4444', days: '<1m' },
  { id: 'hard', label: 'Hard', color: '#f59e0b', days: '1d' },
  { id: 'good', label: 'Good', color: '#10b981', days: '4d' },
  { id: 'easy', label: 'Easy', color: '#3b82f6', days: '7d' },
]

export default function FlashcardsPage() {
  const [cards, setCards] = useState<StoredFlashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [savingReview, setSavingReview] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = currentUserId()
    if (userId) api<StoredFlashcard[]>(`/flashcards/?user_id=${userId}`).then(data => {
      setCards(data)
      setCurrent(0)
    }).catch(() => setError('Your flashcards could not be loaded. Please try again.')).finally(() => setLoading(false))
    else {
      setError('Your session has expired. Please sign in again.')
      setLoading(false)
    }
  }, [])

  const card = cards[current]
  const progress = ((current) / cards.length) * 100
  const stats = [
    { label: 'Due Today', value: cards.filter(item => new Date(item.next_review_at) <= new Date()).length, color: '#ef4444' },
    { label: 'Learning', value: cards.filter(item => item.review_count < 3).length, color: '#f59e0b' },
    { label: 'Mastered', value: cards.filter(item => item.review_count >= 3).length, color: '#10b981' },
  ]

  const handleRating = async (r: Rating) => {
    if (!card || savingReview) return
    setSavingReview(true)
    setError('')
    try {
      const updated = await api<StoredFlashcard>(`/flashcards/${card.id}/review`, { method: 'POST', body: JSON.stringify({ rating: r }) })
      setCards(previous => previous.map(item => item.id === updated.id ? updated : item))
      setReviewed(previous => [...previous, r])
      setFlipped(false)
      window.setTimeout(() => setCurrent(value => cards.length ? (value + 1) % cards.length : 0), 200)
    } catch {
      setError('Your review could not be saved. Please try again.')
    } finally {
      setSavingReview(false)
    }
  }

  const reset = () => { setCurrent(0); setFlipped(false); setReviewed([]) }

  if (loading) return <div className="p-6" style={{ color: 'var(--muted-foreground)' }}>Loading your flashcards…</div>
  if (!card) return <div className="p-6" style={{ color: error ? '#dc2626' : 'var(--muted-foreground)' }}>{error || 'No flashcards yet. Create flashcards from your notes to begin reviewing.'}</div>

  return (
    <div className="p-6 max-w-2xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{card.subject ?? 'Flashcards'}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Spaced repetition review</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono" style={{ color: 'var(--muted-foreground)' }}>{current + 1} / {cards.length}</span>
          <button onClick={reset} className="p-2 rounded-lg hover:bg-muted transition-colors" style={{ color: 'var(--muted-foreground)' }}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span style={{ color: 'var(--muted-foreground)' }}>{s.label}:</span>
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{s.value}</span>
          </div>
        ))}
      </div>
      {error && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-8 overflow-hidden" style={{ background: 'var(--muted)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--primary)' }} />
      </div>

      {/* Card */}
      <div className="card-flip-container mb-6" style={{ height: 300 }}>
        <div
          className={`card-flip-inner relative w-full h-full cursor-pointer`}
          style={{ height: 300 }}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="card-front absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-8 text-center"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted-foreground)' }}>Question</div>
            <p className="text-2xl font-heading font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>{card.front}</p>
            <p className="text-sm mt-6" style={{ color: 'var(--muted-foreground)' }}>Click to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="card-back absolute inset-0 rounded-2xl border flex flex-col items-center justify-center p-8 text-center"
            style={{ background: 'linear-gradient(135deg, var(--secondary-bg), var(--card))', borderColor: 'var(--primary)40' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--primary)' }}>Answer</div>
            <p className="text-base leading-relaxed" style={{ color: 'var(--foreground)' }}>{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }}
          className="p-2 rounded-lg border hover:bg-muted transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {flipped ? 'How well did you know this?' : 'Flip the card to reveal the answer'}
        </span>
        <button
          onClick={() => { setCurrent(c => (c + 1) % cards.length); setFlipped(false) }}
          className="p-2 rounded-lg border hover:bg-muted transition-all"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="flex gap-3 justify-center animate-in fade-in">
          {ratings.map(r => (
            <button
              key={r.id}
              onClick={() => void handleRating(r.id)}
              disabled={savingReview}
              className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border font-medium text-sm transition-all hover:opacity-90 hover:scale-105 disabled:opacity-50"
              style={{ background: `${r.color}15`, borderColor: `${r.color}40`, color: r.color }}
            >
              <span>{r.label}</span>
              <span className="text-xs font-mono opacity-60">{r.days}</span>
            </button>
          ))}
        </div>
      )}

      {/* History */}
      {reviewed.length > 0 && (
        <div className="mt-6 flex items-center gap-1">
          <span className="text-xs mr-2" style={{ color: 'var(--muted-foreground)' }}>Session:</span>
          {reviewed.map((r, i) => (
            <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: ratings.find(x => x.id === r)?.color }}>
              {r[0].toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

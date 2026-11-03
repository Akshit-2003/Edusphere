import { useState, useEffect } from 'react'
import { Clock, ChevronLeft, ChevronRight, Bot } from 'lucide-react'
import type { Page } from '../types'
import { api, currentUserId } from '../lib/api'

interface QuizQuestion { q: string; opts: string[]; correct: number }

const defaultQuestions: QuizQuestion[] = [
  { q: 'Which protocol is connection-oriented?', opts: ['UDP', 'TCP', 'IP', 'ARP'], correct: 1 },
  { q: 'What does the SYN flag represent in TCP?', opts: ['Synchronize sequence numbers', 'Send acknowledgment', 'Start new packet', 'Signal error'], correct: 0 },
  { q: 'Which layer does TCP operate at?', opts: ['Network', 'Data Link', 'Transport', 'Application'], correct: 2 },
  { q: 'What is the default port for HTTP?', opts: ['443', '22', '80', '8080'], correct: 2 },
  { q: 'In TCP three-way handshake, what is the second step?', opts: ['ACK', 'SYN', 'FIN', 'SYN-ACK'], correct: 3 },
  { q: 'What does UDP stand for?', opts: ['Universal Data Protocol', 'User Datagram Protocol', 'Unified Data Packet', 'User Data Packet'], correct: 1 },
  { q: 'Which algorithm is used for TCP congestion control?', opts: ['FIFO', 'Slow Start', 'Round Robin', 'Priority Queue'], correct: 1 },
  { q: 'What is the maximum segment size in TCP?', opts: ['512 bytes', '1024 bytes', '1460 bytes', '2048 bytes'], correct: 2 },
  { q: 'Which field in the TCP header specifies the receiving window size?', opts: ['Sequence number', 'Checksum', 'Window size', 'Urgent pointer'], correct: 2 },
  { q: 'DNS operates on which port?', opts: ['53', '80', '443', '25'], correct: 0 },
]

interface StoredQuiz { id: number; title: string; subject: string | null; questions: QuizQuestion[] }
interface ResultProps {
  answers: (number | null)[]
  questions: QuizQuestion[]
  setPage: (p: Page) => void
  onReview: () => void
  onPractice: () => void
  onGenerateFlashcards: () => void
  error: string
}

function ResultScreen({ answers, questions, setPage, onReview, onPractice, onGenerateFlashcards, error }: ResultProps) {
  const correct = answers.filter((a, i) => a === questions[i].correct).length
  const acc = Math.round((correct / questions.length) * 100)
  const weak = questions.filter((_, i) => answers[i] !== questions[i].correct).map(q => q.q.split(' ').slice(0, 4).join(' '))

  return (
    <div className="p-8 max-w-xl mx-auto page-enter">
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${acc >= 70 ? '#10b981' : '#ef4444'}15`, border: `3px solid ${acc >= 70 ? '#10b981' : '#ef4444'}` }}>
          <span className="text-3xl font-heading font-bold" style={{ color: acc >= 70 ? '#10b981' : '#ef4444' }}>{acc}%</span>
        </div>
        <h2 className="text-2xl font-heading font-bold mb-1" style={{ color: 'var(--foreground)' }}>Quiz Complete!</h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Computer Networks Quiz</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Score', value: `${correct} / ${questions.length}` },
          { label: 'Accuracy', value: `${acc}%` },
          { label: 'Time', value: '12:32' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {weak.length > 0 && (
        <div className="rounded-xl border p-4 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Weak Topics</div>
          {weak.slice(0, 3).map(w => (
            <div key={w} className="flex items-center gap-2 text-sm py-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#ef4444' }} />
              <span style={{ color: 'var(--muted-foreground)' }}>{w}...</span>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Review Answers', primary: false, action: onReview },
          { label: 'Generate Flashcards', primary: false, action: onGenerateFlashcards },
          { label: 'Practice Again', primary: false, action: onPractice },
          { label: 'Ask AI', primary: true, action: () => setPage('ai-assistant') },
        ].map(b => (
          <button
            key={b.label}
            onClick={b.action}
            className="py-2.5 rounded-lg text-sm font-medium border transition-all hover:opacity-90"
            style={b.primary
              ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
              : { background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }
            }
          >
            {b.primary && <Bot size={14} className="inline mr-1.5 -mt-0.5" />}
            {b.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function QuizPage({ setPage }: { setPage: (p: Page) => void }) {
  const [quiz, setQuiz] = useState<StoredQuiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>(defaultQuestions)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(defaultQuestions.length).fill(null))
  const [done, setDone] = useState(false)
  const [time, setTime] = useState(600)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = currentUserId()
    if (!userId) { setError('Your session has expired. Please sign in again.'); setLoading(false); return }
    api<StoredQuiz[]>(`/quizzes/?user_id=${userId}`).then(async quizzes => {
      const savedQuiz = quizzes.find(item => Array.isArray(item.questions) && item.questions.length)
      if (savedQuiz) {
        setQuiz(savedQuiz)
        setQuestions(savedQuiz.questions)
        setAnswers(Array(savedQuiz.questions.length).fill(null))
        return
      }
      const created = await api<StoredQuiz>('/quizzes/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, title: 'Study Practice Quiz', subject: 'General', questions: defaultQuestions }),
      })
      setQuiz(created)
      setQuestions(created.questions)
      setAnswers(Array(created.questions.length).fill(null))
    }).catch(() => setError('Your quiz could not be loaded. Please try again.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (done) return
    const t = setInterval(() => setTime(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [done])

  const mins = String(Math.floor(time / 60)).padStart(2, '0')
  const secs = String(time % 60).padStart(2, '0')

  const reviewAnswers = () => { setCurrent(0); setDone(false) }
  const practiceAgain = () => { setAnswers(Array(questions.length).fill(null)); setCurrent(0); setTime(600); setDone(false) }
  const generateFlashcards = async () => {
    const userId = currentUserId()
    if (!userId) return
    try {
      await Promise.all(questions.map(question => api('/flashcards/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, front: question.q, back: question.opts[question.correct], subject: quiz?.subject ?? 'General' }),
      })))
      setPage('flashcards')
    } catch (error) {
      setError('Flashcards could not be generated. Please try again.')
    }
  }

  if (loading) return <div className="p-6" style={{ color: 'var(--muted-foreground)' }}>Loading your quiz…</div>
  if (done) return <ResultScreen answers={answers} questions={questions} setPage={setPage} onReview={reviewAnswers} onPractice={practiceAgain} onGenerateFlashcards={() => void generateFlashcards()} error={error} />

  const q = questions[current]
  const selected = answers[current]
  const progress = ((current) / questions.length) * 100

  return (
    <div className="p-6 max-w-2xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold" style={{ color: 'var(--foreground)' }}>{quiz?.title ?? 'Loading quiz…'}</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: time < 60 ? '#ef444420' : 'var(--muted)', color: time < 60 ? '#ef4444' : 'var(--foreground)' }}>
          <Clock size={14} />
          <span className="font-mono text-sm font-semibold">{mins}:{secs}</span>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

      {/* Progress */}
      <div className="h-1.5 rounded-full mb-2 overflow-hidden" style={{ background: 'var(--muted)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--primary)' }} />
      </div>
      <div className="flex gap-1 mb-8">
        {questions.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all"
            style={{ background: i < current ? 'var(--primary)' : i === current ? 'var(--accent)' : 'var(--border)' }}
          />
        ))}
      </div>

      {/* Question */}
      <div className="rounded-2xl border p-8 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xl font-heading font-semibold mb-8" style={{ color: 'var(--foreground)' }}>{q.q}</p>
        <div className="space-y-3">
          {q.opts.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers(prev => { const n = [...prev]; n[current] = i; return n })}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all"
              style={{
                background: selected === i ? 'var(--secondary-bg)' : 'var(--muted)',
                borderColor: selected === i ? 'var(--primary)' : 'var(--border)',
                color: 'var(--foreground)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 font-mono"
                style={{ background: selected === i ? 'var(--primary)' : 'var(--card)', color: selected === i ? '#fff' : 'var(--muted-foreground)' }}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {current === questions.length - 1 ? (
          <button
            onClick={async () => {
              const userId = currentUserId()
              const correct = answers.filter((answer, index) => answer === questions[index].correct).length
              if (!quiz || !userId) { setError('Your quiz session is unavailable. Please reload the page.'); return }
              setSubmitting(true)
              setError('')
              try {
                await api(`/quizzes/${quiz.id}/attempts`, {
                  method: 'POST',
                  body: JSON.stringify({ user_id: userId, answers: answers.map(answer => answer ?? -1), score: Math.round((correct / questions.length) * 100) }),
                })
                setDone(true)
              } catch {
                setError('Your quiz attempt could not be saved. Please try again.')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting}
            className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {submitting ? 'Saving…' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

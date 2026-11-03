import { useState } from 'react'
import { Sparkles, GraduationCap, Award, BookOpen, CheckCircle, ArrowRight } from 'lucide-react'
import { api, currentUserId } from '../lib/api'

interface OnboardingModalProps {
  onComplete: () => void
}

type AcademicProfileForm = {
  department: string
  semester: string
  rollNumber: string
  cgpa: string
  targetGoal: string
}

const academicProfileStorageKey = (userId: number) => `edusphere.academic-profile.${userId}`

const defaultFormData: AcademicProfileForm = {
  department: 'Computer Science & Engineering',
  semester: '6th Semester',
  rollNumber: '',
  cgpa: '',
  targetGoal: 'GATE & Software Engineering Placement'
}

function getInitialFormData(): AcademicProfileForm {
  const userId = currentUserId()
  if (!userId) return defaultFormData

  try {
    const saved = localStorage.getItem(academicProfileStorageKey(userId))
    return saved ? { ...defaultFormData, ...JSON.parse(saved) } : defaultFormData
  } catch {
    return defaultFormData
  }
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<AcademicProfileForm>(getInitialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field: keyof AcademicProfileForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const userId = currentUserId()

    try {
      if (!userId) throw new Error('No signed-in user found.')

      await api(`/profiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          department: formData.department,
          semester: formData.semester,
          roll_number: formData.rollNumber,
          cgpa: formData.cgpa,
          target_goal: formData.targetGoal,
          onboarding_completed: true,
        })
      })
      localStorage.setItem(academicProfileStorageKey(userId), JSON.stringify(formData))
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Academic profile could not be saved. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div 
        className="relative w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden" 
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        {/* Header */}
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--muted)', color: 'var(--primary)' }}>
            <Sparkles size={13} /> Complete Your Academic Profile
          </div>
          <h2 className="text-2xl font-heading font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {step === 1 ? 'Academic Information' : 'Performance & Goals'}
          </h2>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {step === 1 
              ? 'Help EduSphere customize your study workspace, AI insights, and course timelines.' 
              : 'Share your academic standing and targets to optimize AI-driven recommendations.'}
          </p>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
            <div className="h-full bg-primary transition-all duration-300" style={{ width: step === 1 ? '50%' : '100%' }} />
          </div>
          <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--muted-foreground)' }}>Step {step} of 2</span>
        </div>

        {/* Step 1: Department, Semester & Roll Number */}
        {step === 1 && (
          <div className="space-y-4 relative z-10 animate-in fade-in-50">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Department / Branch</label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3.5 top-3.5" style={{ color: 'var(--muted-foreground)' }} />
                <select
                  value={formData.department}
                  onChange={e => handleChange('department', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm border outline-none transition-all appearance-none cursor-pointer"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Current Semester</label>
                <select
                  value={formData.semester}
                  onChange={e => handleChange('semester', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm border outline-none transition-all cursor-pointer"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="3rd Semester">3rd Semester</option>
                  <option value="4th Semester">4th Semester</option>
                  <option value="5th Semester">5th Semester</option>
                  <option value="6th Semester">6th Semester</option>
                  <option value="7th Semester">7th Semester</option>
                  <option value="8th Semester">8th Semester</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Roll / Enrollment Number</label>
                <input
                  type="text"
                  placeholder="e.g., 22CS104"
                  value={formData.rollNumber}
                  onChange={e => handleChange('rollNumber', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs sm:text-sm border outline-none transition-all"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Marks/CGPA & Target Goals */}
        {step === 2 && (
          <div className="space-y-4 relative z-10 animate-in fade-in-50">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Current CGPA / Percentage</label>
              <div className="relative">
                <Award size={16} className="absolute left-3.5 top-3.5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  placeholder="e.g., 8.5 CGPA or 85%"
                  value={formData.cgpa}
                  onChange={e => handleChange('cgpa', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm border outline-none transition-all"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Primary Target / Career Goal</label>
              <div className="relative">
                <BookOpen size={16} className="absolute left-3.5 top-3.5" style={{ color: 'var(--muted-foreground)' }} />
                <select
                  value={formData.targetGoal}
                  onChange={e => handleChange('targetGoal', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-xs sm:text-sm border outline-none transition-all cursor-pointer"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                >
                  <option value="GATE & Software Engineering Placement">GATE & Software Engineering Placement</option>
                  <option value="Full Stack Development & MERN">Full Stack Development & MERN</option>
                  <option value="AI / Machine Learning Engineering">AI / Machine Learning Engineering</option>
                  <option value="Core Academic Excellence & Semester Exams">Core Academic Excellence & Semester Exams</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && <p className="relative z-10 rounded-xl px-3 py-2 text-xs" style={{ background: '#ef444415', color: '#dc2626' }}>{error}</p>}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t relative z-10" style={{ borderColor: 'var(--border)' }}>
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-muted"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--card)' }}
            >
              Back
            </button>
          ) : <div />}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:opacity-90 shadow-md ml-auto"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:opacity-90 shadow-md ml-auto disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              {loading ? 'Saving Profile...' : 'Complete & Launch Dashboard'} <CheckCircle size={15} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

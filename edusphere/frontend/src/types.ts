export type Page =
  | 'login'
  | 'dashboard'
  | 'workspace'
  | 'document'
  | 'planner'
  | 'calendar'
  | 'flashcards'
  | 'quiz'
  | 'quiz-result'
  | 'ai-assistant'
  | 'knowledge-graph'
  | 'analytics'
  | 'classroom'
  | 'profile'
  | 'pdf-upload'
  | 'pomodoro'
  | 'search'

export interface NavProps {
  setPage: (p: Page) => void
}

export interface Classroom {
  id: number;
  name: string;
  section: string | null;
  teacher_id: number;
}

export interface CurrentUser {
  id: number
  full_name: string
  email: string
  is_active: boolean
  email_verified: boolean
  role_id: number
}

export interface StudyTask {
  id: number
  user_id: number
  title: string
  description: string | null
  subject: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'inprogress' | 'review' | 'done'
  due_at: string | null
  estimate_minutes: number | null
}

export interface CalendarEvent {
  id: number
  user_id: number
  title: string
  starts_at: string
  ends_at: string | null
  event_type: string
  color: string
}

export interface StudyDocument {
  id: number
  owner_id: number
  workspace_id: number | null
  title: string
  content: string
  folder: string
  is_starred: boolean
  created_at: string
  updated_at: string
}

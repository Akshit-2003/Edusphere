# Database Architecture & ER Schema (PostgreSQL)

## 1. Authentication & Users
Core tables for managing users and RBAC (Role-Based Access Control).

- **roles**
  - `id` (UUID, PK)
  - `name` (VARCHAR) - e.g., 'Student', 'Teacher', 'Admin'
  
- **users**
  - `id` (UUID, PK)
  - `email` (VARCHAR, Unique)
  - `password_hash` (VARCHAR)
  - `full_name` (VARCHAR)
  - `role_id` (UUID, FK -> roles.id)
  - `created_at` (TIMESTAMP)

## 2. Workspace & Documents (Notion-like)
Handling collaborative documents and modular text blocks.

- **workspaces**
  - `id` (UUID, PK)
  - `name` (VARCHAR)
  - `owner_id` (UUID, FK -> users.id)

- **workspace_members**
  - `workspace_id` (UUID, FK -> workspaces.id)
  - `user_id` (UUID, FK -> users.id)
  - `access_level` (VARCHAR) - e.g., 'read', 'write', 'admin'

- **documents**
  - `id` (UUID, PK)
  - `workspace_id` (UUID, FK -> workspaces.id)
  - `title` (VARCHAR)
  - `is_archived` (BOOLEAN)

- **document_blocks** (For Yjs & TipTap integration)
  - `id` (UUID, PK)
  - `document_id` (UUID, FK -> documents.id)
  - `type` (VARCHAR) - e.g., 'paragraph', 'heading', 'code'
  - `content` (JSONB)
  - `position` (FLOAT) - For drag & drop reordering

## 3. Study Planner & Productivity
Kanban tasks and Pomodoro tracking.

- **tasks**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> users.id)
  - `title` (VARCHAR)
  - `status` (VARCHAR) - 'TODO', 'IN_PROGRESS', 'DONE'
  - `due_date` (TIMESTAMP)
  - `position` (FLOAT)

- **study_sessions** (Pomodoro logs)
  - `id` (UUID, PK)
  - `user_id` (UUID, FK -> users.id)
  - `duration_minutes` (INT)
  - `focus_type` (VARCHAR)

## 4. Spaced Repetition (Flashcards) & Quizzes
- **flashcards**
  - `id` (UUID, PK)
  - `document_id` (UUID, FK -> documents.id)
  - `front_content` (TEXT)
  - `back_content` (TEXT)

- **flashcard_reviews** (SRS Algorithm Data)
  - `id` (UUID, PK)
  - `flashcard_id` (UUID, FK -> flashcards.id)
  - `user_id` (UUID, FK -> users.id)
  - `next_review_date` (TIMESTAMP)
  - `interval_days` (FLOAT)
  - `ease_factor` (FLOAT)

## 5. Classroom, Chat & Lectures
- **classrooms**
  - `id` (UUID, PK)
  - `name` (VARCHAR)
  - `teacher_id` (UUID, FK -> users.id)

- **channels**
  - `id` (UUID, PK)
  - `classroom_id` (UUID, FK -> classrooms.id)
  - `name` (VARCHAR) - e.g., 'general', 'doubts'

- **messages** (Real-time chat)
  - `id` (UUID, PK)
  - `channel_id` (UUID, FK -> channels.id)
  - `sender_id` (UUID, FK -> users.id)
  - `content` (TEXT)
  - `created_at` (TIMESTAMP)

- **lectures**
  - `id` (UUID, PK)
  - `classroom_id` (UUID, FK -> classrooms.id)
  - `video_url` (VARCHAR)

- **lecture_notes**
  - `id` (UUID, PK)
  - `lecture_id` (UUID, FK -> lectures.id)
  - `user_id` (UUID, FK -> users.id)
  - `timestamp_seconds` (INT)
  - `note_content` (TEXT)

## 6. AI, RAG & Knowledge Graph (pgvector)
- **document_chunks**
  - `id` (UUID, PK)
  - `document_id` (UUID, FK -> documents.id)
  - `chunk_text` (TEXT)

- **embeddings** (Requires pgvector extension)
  - `id` (UUID, PK)
  - `chunk_id` (UUID, FK -> document_chunks.id)
  - `vector_data` (VECTOR(1536)) - Assuming OpenAI ada-002 dimensions

- **concepts** (For Knowledge Graph)
  - `id` (UUID, PK)
  - `name` (VARCHAR) - e.g., 'TCP', 'Transport Layer'

- **concept_relationships**
  - `source_concept_id` (UUID, FK -> concepts.id)
  - `target_concept_id` (UUID, FK -> concepts.id)
  - `relationship_type` (VARCHAR) - e.g., 'prerequisite', 'related_to'
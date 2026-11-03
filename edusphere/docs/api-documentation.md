# Edusphere: API Architecture Specification

## 1. Authentication & User Management (/api/v1/auth & /api/v1/users)
- **POST** `/api/v1/auth/register` — Register new user (Student/Teacher).
- **POST** `/api/v1/auth/login` — Authenticate and issue HTTP-only JWT cookies.
- **POST** `/api/v1/auth/logout` — Revoke tokens and clear cookies.
- **GET** `/api/v1/auth/me` — Retrieve current authenticated user profile.
- **GET/PUT** `/api/v1/users/profile` — Fetch and update user preferences/avatar.

## 2. Workspace & Document Management (/api/v1/workspaces & /api/v1/documents)
- **GET/POST** `/api/v1/workspaces` — List workspaces or create a new workspace.
- **GET/PUT/DELETE** `/api/v1/workspaces/{id}` — Workspace CRUD and member management.
- **GET/POST** `/api/v1/documents` — Fetch document list or create a document.
- **GET/PUT/DELETE** `/api/v1/documents/{id}` — Document CRUD.
- **GET** `/api/v1/documents/{id}/versions` — Fetch version history.

## 3. Tasks & Study Planner (/api/v1/tasks & /api/v1/planner)
- **GET/POST** `/api/v1/tasks` — Fetch Kanban tasks or create new task.
- **PUT/DELETE** `/api/v1/tasks/{id}` — Update task status, order position, or details.
- **POST** `/api/v1/planner/pomodoro` — Save a completed Pomodoro study session.

## 4. Spaced Repetition Flashcards & Quizzes (/api/v1/flashcards & /api/v1/quizzes)
- **GET/POST** `/api/v1/flashcards` — Fetch flashcards due for today or manually add cards.
- **POST** `/api/v1/flashcards/{id}/review` — Submit SRS review rating (`Again`, `Hard`, `Good`, `Easy`).
- **GET/POST** `/api/v1/quizzes` — Fetch quizzes or submit quiz attempt results.

## 5. Classroom, Channels & Lectures (/api/v1/classrooms)
- **GET/POST** `/api/v1/classrooms` — List classrooms or create classroom (Teacher only).
- **GET/POST** `/api/v1/classrooms/{id}/channels` — Manage classroom discussion channels.
- **GET/POST** `/api/v1/classrooms/{id}/lectures` — Upload or fetch video lectures.
- **GET/POST** `/api/v1/lectures/{id}/notes` — Fetch or create timestamped notes for video player.

## 6. AI Services, Vector Search & Knowledge Graph (/api/v1/ai)
- **POST** `/api/v1/ai/summarize` — Generate concise markdown summary of notes.
- **POST** `/api/v1/ai/generate-flashcards` — Auto-generate flashcards from document context.
- **POST** `/api/v1/ai/rag-query` — Context-aware AI chat querying user's notes via pgvector embeddings.
- **POST** `/api/v1/ai/process-pdf` — Trigger background job (Celery) to extract and chunk PDF.
- **GET** `/api/v1/graph/concepts` — Fetch concept nodes and relationships for Cytoscape.js.

---

## 7. Real-Time WebSocket Specifications

### Endpoint: `ws://domain/ws/v1/documents/{document_id}`
- **Events (Client → Server):**
  - `document:join` — Join collaborative editing session.
  - `document:update` — Send Yjs CRDT binary sync updates.
  - `cursor:move` — Broadcast user's active cursor location in document.
- **Events (Server → Client):**
  - `user:presence` — Sync list of online active users with avatar and cursor position.
  - `document:sync` — Broadcast Yjs CRDT delta updates to other connected peers.

### Endpoint: `ws://domain/ws/v1/chat/channels/{channel_id}`
- **Events:**
  - `message:send` — Send real-time chat message.
  - `message:typing` — Show "Akshit is typing..." state.
  - `message:received` — Broadcast incoming message to channel members.
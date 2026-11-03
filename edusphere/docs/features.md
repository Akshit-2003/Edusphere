# Core System Features

## 1. Core Modules
- **Authentication System:** Secure JWT-based auth with HTTP-only cookies, role validation, and password recovery.
- **Workspace & Document Engine:** A Notion-like block-based rich text editor supporting Markdown, media embeds, slash commands, and autosave.
- **Real-Time Collaboration:** Yjs and WebSocket powered multi-player editing with presence indicators and collision resolution.
- **Study Planner:** Kanban boards for task tracking, integrated calendar, and Pomodoro timer.
- **Spaced Repetition System (SRS):** Interactive flashcards with automated interval calculations based on user recall difficulty.
- **Classroom Hub:** Dedicated spaces for announcements, channel-based chat, and real-time messaging.

## 2. AI-Powered Features (The Differentiator)
- **Automated Content Generation:** Transforming unstructured notes into structured flashcards, summaries, and MCQs via OpenAI/Gemini APIs.
- **Semantic Search:** Vector embeddings (pgvector) to search concepts across all documents based on meaning, not just keywords.
- **Context-Aware RAG:** An AI assistant that answers queries strictly based on the user's uploaded materials and personal workspace notes.
- **PDF Pipeline:** Automated text extraction, chunking, and metadata tagging from uploaded PDF documents using Celery background workers.

## 3. Future Enhancements (Post-V1)
- React Native mobile application for on-the-go learning.
- Advanced Gamification (Badges, Leaderboards) to boost retention.
- Offline support and sync mechanisms for the document editor.
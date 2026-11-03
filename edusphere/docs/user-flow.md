# Primary User Workflows

## 1. Student Workflow (Learn & Collaborate)
1. **Onboarding:** User registers -> Verifies email -> Selects 'Student' role.
2. **Dashboard Entry:** Lands on the main dashboard showing upcoming tasks, flashcards due today, and recent notes.
3. **Classroom Integration:** Joins a specific classroom using an invite link or code.
4. **Content Consumption:** Watches a lecture video -> Types timestamped notes directly in the adjacent editor.
5. **AI Interaction:** Clicks "Generate Flashcards" on the notes -> System processes text -> Saves to SRS module.
6. **Revision Phase:** Uses the Flashcard UI to review concepts -> Takes an AI-generated quiz -> Views mastery score updating in the Knowledge Graph.

## 2. Teacher Workflow (Manage & Distribute)
1. **Setup:** Logs in -> Creates a new "Workspace/Classroom" (e.g., Database Management Systems).
2. **Material Upload:** Uploads syllabus PDFs and lecture videos.
3. **Background Processing:** System automatically chunks the PDF and extracts key concepts for the semantic search engine.
4. **Communication:** Posts an announcement in the `#general` channel.
5. **Monitoring:** Opens the Analytics Dashboard to see average quiz scores and identify weak topics across the student batch.

## 3. Real-Time Collaboration Flow (Shared)
1. User A opens a document inside a shared workspace.
2. User B joins the same document.
3. WebSocket connection establishes presence (🟢 User B joined).
4. Both users edit different blocks simultaneously; Yjs CRDT handles merging without conflicts.
5. Changes are persisted to the PostgreSQL database in real-time.
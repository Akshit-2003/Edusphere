# UI/UX Architecture & Screen Map

## 1. Global Application Shell (App Layout)
The main application will follow a persistent Sidebar + Top Navigation layout.

- **Sidebar (Collapsible):** Contains all primary navigation links. Active states highlighted with subtle background shifts (glassmorphism in dark mode).
- **Top Navbar:** Contains Breadcrumbs (e.g., `Workspace / DBMS / Lecture 1`), Global Search bar (Cmd+K / Ctrl+K), Notification Bell, and User Avatar dropdown.
- **Main Content Area:** The central canvas where dynamic routing renders specific pages.

---

## 2. Dashboard Layout (The Control Center)
The dashboard provides a bird's-eye view of the student's active day.

```text
┌─────────────────────────────────────────────────────────────┐
│ ☰  [Cmd+K Global Search...]                 🔔  [User Profile]│
├──────────────┬──────────────────────────────────────────────┤
│ 📂 Workspace │  Welcome back, Akshit! 👋                    │
│ 📝 Notes     │                                              │
│ 📅 Planner   │  [Today's Tasks - Kanban Mini]               │
│ 🧠 Flashcards│  - Complete API Auth (High)                  │
│ 🏫 Classroom │  - Review DBMS Flashcards (Med)              │
│ 💬 Chat      │                                              │
│ 🤖 AI Assist │  [Study Progress Chart]  [Flashcards Due: 12]│
│ ⚙️ Settings  │                                              │
│              │  [Recent Notes]          [Upcoming Classes]  │
│              │  - React Hooks           - System Design     │
│              │  - TCP Handshake         - 3:00 PM Today     │
└──────────────┴──────────────────────────────────────────────┘
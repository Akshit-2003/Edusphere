# Edusphere: System Requirements Specification

## 1. Project Objective
Edusphere is a comprehensive, AI-powered learning and collaboration ecosystem. It bridges the gap between active learning, document management, and real-time collaboration. The platform aims to provide a centralized workspace where students can consume content, collaborate in real-time, manage study schedules, and utilize AI for context-aware assistance and automated assessments.

## 2. Target Users
- **Students / Self-Learners:** Individuals looking for an integrated workspace to take notes, track tasks, and prepare for exams using spaced repetition and AI-generated quizzes.
- **Educators / Teachers:** Professionals who need to distribute course materials, upload video lectures, and monitor student progress in a closed, interactive environment.
- **Institutions:** Small to medium educational organizations requiring a scalable learning management infrastructure.

## 3. User Roles & Permissions
The system operates on a strictly separated Role-Based Access Control (RBAC) architecture:

### 3.1. Admin
- Has universal system access.
- Monitors overall platform health, user metrics, and AI token consumption.
- Capable of resolving critical workspace conflicts and managing global settings.

### 3.2. Teacher (Moderator/Creator)
- Can create and manage Classrooms/Workspaces.
- Uploads resources (PDFs, Videos) and triggers background processing for lecture indexing.
- Cannot alter system configurations but has full CRUD authority over their assigned classrooms.
- Monitors aggregated student analytics.

### 3.3. Student (End User)
- Can join classrooms via invites.
- Has a private workspace for personal notes, kanban boards, and flashcards.
- Interacts with AI for personalized summaries, quizzes, and Retrieval-Augmented Generation (RAG) based on their own documents.
- Participates in real-time document collaboration and classroom channels.
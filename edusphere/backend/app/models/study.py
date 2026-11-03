from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from app.core.database import Base
from app.models.user import get_ist_time


class UserProfile(Base):
    __tablename__ = "user_profiles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    daily_goal_hours = Column(Integer, default=2, nullable=False)
    avatar_url = Column(String, nullable=True)
    department = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    roll_number = Column(String, nullable=True)
    cgpa = Column(String, nullable=True)
    target_goal = Column(String, nullable=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    preferences = Column(JSON, default=dict, nullable=False)
    updated_at = Column(DateTime, default=get_ist_time, onupdate=get_ist_time)


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="", nullable=False)
    folder = Column(String, default="General", nullable=False)
    is_starred = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)
    updated_at = Column(DateTime, default=get_ist_time, onupdate=get_ist_time)


class DocumentShare(Base):
    __tablename__ = "document_shares"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    permission = Column(String, default="edit", nullable=False)
    created_at = Column(DateTime, default=get_ist_time)


class StudyTask(Base):
    __tablename__ = "study_tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String, nullable=True)
    priority = Column(String, default="medium", nullable=False)
    status = Column(String, default="todo", nullable=False, index=True)
    due_at = Column(DateTime, nullable=True)
    estimate_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=get_ist_time)
    updated_at = Column(DateTime, default=get_ist_time, onupdate=get_ist_time)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    starts_at = Column(DateTime, nullable=False, index=True)
    ends_at = Column(DateTime, nullable=True)
    event_type = Column(String, default="study", nullable=False)
    color = Column(String, default="#4f46e5", nullable=False)
    created_at = Column(DateTime, default=get_ist_time)


class StudySession(Base):
    __tablename__ = "study_sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    focus_type = Column(String, default="focus", nullable=False)
    completed_at = Column(DateTime, default=get_ist_time)


class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    subject = Column(String, nullable=True)
    next_review_at = Column(DateTime, default=get_ist_time, index=True)
    review_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    questions = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=get_ist_time)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    answers = Column(JSON, nullable=False, default=list)
    score = Column(Integer, nullable=False)
    attempted_at = Column(DateTime, default=get_ist_time)


class ClassroomChannel(Base):
    __tablename__ = "classroom_channels"
    id = Column(Integer, primary_key=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)


class ClassroomMessage(Base):
    __tablename__ = "classroom_messages"
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("classroom_channels.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_ist_time)


class Concept(Base):
    __tablename__ = "concepts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="concept", nullable=False)


class ConceptRelationship(Base):
    __tablename__ = "concept_relationships"
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    target_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    relationship_type = Column(String, default="related_to", nullable=False)


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=get_ist_time, index=True)

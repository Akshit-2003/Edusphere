from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class ORMModel(BaseModel):
    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    bio: Optional[str] = None
    daily_goal_hours: Optional[int] = Field(default=None, ge=1, le=24)
    department: Optional[str] = Field(default=None, max_length=160)
    semester: Optional[str] = Field(default=None, max_length=80)
    roll_number: Optional[str] = Field(default=None, max_length=80)
    cgpa: Optional[str] = Field(default=None, max_length=40)
    target_goal: Optional[str] = Field(default=None, max_length=160)
    onboarding_completed: Optional[bool] = None
    preferences: Optional[dict[str, bool]] = None
    avatar_url: Optional[str] = Field(default=None, max_length=1_500_000)


class ProfileResponse(ORMModel):
    user_id: int
    full_name: str
    email: str
    bio: Optional[str]
    daily_goal_hours: int
    department: Optional[str]
    semester: Optional[str]
    roll_number: Optional[str]
    cgpa: Optional[str]
    target_goal: Optional[str]
    onboarding_completed: bool
    preferences: dict[str, bool]
    avatar_url: Optional[str]


class DocumentCreate(BaseModel):
    owner_id: int
    title: str = Field(min_length=1, max_length=250)
    content: str = ""
    folder: str = "General"
    workspace_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    content: Optional[str] = None
    folder: Optional[str] = None
    is_starred: Optional[bool] = None


class DocumentResponse(ORMModel):
    id: int
    owner_id: int
    workspace_id: Optional[int]
    title: str
    content: str
    folder: str
    is_starred: bool
    created_at: datetime
    updated_at: datetime


class DocumentShareCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    permission: str = Field(default="edit", pattern="^(view|edit)$")


class DocumentShareResponse(ORMModel):
    id: int
    document_id: int
    email: str
    permission: str
    created_at: datetime


class TaskCreate(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    subject: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    status: str = Field(default="todo", pattern="^(todo|inprogress|review|done)$")
    due_at: Optional[datetime] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=1)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    description: Optional[str] = None
    subject: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(default=None, pattern="^(todo|inprogress|review|done)$")
    due_at: Optional[datetime] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=1)


class TaskResponse(ORMModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    subject: Optional[str]
    priority: str
    status: str
    due_at: Optional[datetime]
    estimate_minutes: Optional[int]


class EventCreate(BaseModel):
    user_id: int
    title: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    event_type: str = "study"
    color: str = "#4f46e5"


class EventResponse(ORMModel):
    id: int
    user_id: int
    title: str
    starts_at: datetime
    ends_at: Optional[datetime]
    event_type: str
    color: str


class SessionCreate(BaseModel):
    user_id: int
    duration_minutes: int = Field(ge=1, le=1440)
    focus_type: str = "focus"


class SessionResponse(ORMModel):
    id: int
    user_id: int
    duration_minutes: int
    focus_type: str
    completed_at: datetime


class FlashcardCreate(BaseModel):
    user_id: int
    front: str
    back: str
    subject: Optional[str] = None
    document_id: Optional[int] = None


class FlashcardResponse(ORMModel):
    id: int
    user_id: int
    document_id: Optional[int]
    front: str
    back: str
    subject: Optional[str]
    next_review_at: datetime
    review_count: int


class FlashcardReview(BaseModel):
    rating: str = Field(pattern="^(again|hard|good|easy)$")


class QuizCreate(BaseModel):
    user_id: int
    title: str
    subject: Optional[str] = None
    questions: list[dict[str, Any]]


class QuizResponse(ORMModel):
    id: int
    user_id: int
    title: str
    subject: Optional[str]
    questions: list[dict[str, Any]]


class QuizAttemptCreate(BaseModel):
    user_id: int
    answers: list[int]
    score: int = Field(ge=0)


class ChannelCreate(BaseModel):
    name: str


class ChannelResponse(ORMModel):
    id: int
    classroom_id: int
    name: str


class MessageCreate(BaseModel):
    sender_id: int
    content: str = Field(min_length=1, max_length=5000)


class MessageResponse(ORMModel):
    id: int
    channel_id: int
    sender_id: int
    content: str
    created_at: datetime


class ConceptCreate(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = None
    category: str = "concept"


class ConceptResponse(ORMModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    category: str


class AssistantMessageCreate(BaseModel):
    user_id: int
    content: str = Field(min_length=1, max_length=5000)


class AssistantMessageResponse(ORMModel):
    id: int
    user_id: int
    role: str
    content: str
    created_at: datetime

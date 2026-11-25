from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


# India does not use daylight-saving time, so a fixed standard-library offset
# is more reliable on Windows deployments that do not include the tzdata package.
IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def database_datetime(value: datetime | None) -> datetime | None:
    """Store user-selected datetimes as naive IST values for TIMESTAMP columns.

    The existing database schema intentionally uses ``TIMESTAMP WITHOUT TIME
    ZONE``. Browser ISO values include ``Z`` and are therefore timezone-aware;
    asyncpg rejects those values unless they are normalised first.
    """
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(IST).replace(tzinfo=None)


class ORMModel(BaseModel):
    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[str] = Field(default=None, max_length=320)
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

    @field_validator('email')
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower()
        if '@' not in normalized or normalized.startswith('@') or normalized.endswith('@'):
            raise ValueError('Please provide a valid email address.')
        return normalized


class ProfileResponse(ORMModel):
    user_id: int
    full_name: str
    email: str
    email_verified: bool
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


class DocumentPresenceUpdate(BaseModel):
    user_id: int = Field(gt=0)
    session_id: str = Field(min_length=8, max_length=80)
    is_editing: bool = False


class DocumentCollaboratorResponse(BaseModel):
    user_id: int
    full_name: str
    avatar_url: Optional[str] = None
    is_editing: bool
    last_active_at: datetime


class TaskCreate(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    subject: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    status: str = Field(default="todo", pattern="^(todo|inprogress|review|done)$")
    due_at: Optional[datetime] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=1)

    @field_validator("due_at")
    @classmethod
    def normalize_due_at(cls, value: datetime | None) -> datetime | None:
        return database_datetime(value)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    description: Optional[str] = None
    subject: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    status: Optional[str] = Field(default=None, pattern="^(todo|inprogress|review|done)$")
    due_at: Optional[datetime] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=1)

    @field_validator("due_at")
    @classmethod
    def normalize_due_at(cls, value: datetime | None) -> datetime | None:
        return database_datetime(value)


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
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_event_datetime(cls, value: datetime | None) -> datetime | None:
        return database_datetime(value)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    event_type: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_event_datetime(cls, value: datetime | None) -> datetime | None:
        return database_datetime(value)


class EventResponse(ORMModel):
    id: int
    user_id: int
    title: str
    starts_at: datetime
    ends_at: Optional[datetime]
    event_type: str
    color: str
    priority: str


class SessionCreate(BaseModel):
    user_id: int
    task_id: Optional[int] = None
    duration_minutes: int = Field(ge=1, le=1440)
    focus_type: str = "focus"


class SessionResponse(ORMModel):
    id: int
    user_id: int
    task_id: Optional[int]
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


class ConceptRelationshipCreate(BaseModel):
    user_id: int = Field(gt=0)
    source_id: int = Field(gt=0)
    target_id: int = Field(gt=0)
    relationship_type: str = Field(default="related_to", min_length=2, max_length=80)


class AssistantConversationCreate(BaseModel):
    user_id: int = Field(gt=0)
    title: str = Field(default="New study chat", min_length=1, max_length=160)


class AssistantConversationUpdate(BaseModel):
    user_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=160)


class AssistantConversationResponse(ORMModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime


class AssistantMessageCreate(BaseModel):
    user_id: int = Field(gt=0)
    content: str = Field(min_length=1, max_length=5000)
    conversation_id: Optional[int] = Field(default=None, gt=0)
    document_ids: list[int] = Field(default_factory=list, max_length=8)
    subject: Optional[str] = Field(default=None, max_length=120)
    mode: Optional[str] = Field(default=None, max_length=40)


class AssistantMessageResponse(ORMModel):
    id: int
    user_id: int
    conversation_id: Optional[int]
    role: str
    content: str
    context_items: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


class AssistantActionRequest(BaseModel):
    user_id: int = Field(gt=0)
    assistant_message_id: int = Field(gt=0)

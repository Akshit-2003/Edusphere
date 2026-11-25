from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ClassroomCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    section: Optional[str] = Field(default=None, max_length=80)
    creator_id: int = Field(gt=0)


class ClassroomJoin(BaseModel):
    class_code: str = Field(min_length=6, max_length=6)
    user_id: int = Field(gt=0)

    @field_validator("class_code")
    @classmethod
    def normalize_class_code(cls, value: str) -> str:
        normalized = ''.join(value.upper().split())
        if len(normalized) != 6 or not normalized.isalnum():
            raise ValueError("Enter a valid 6-character class code.")
        return normalized


class ClassroomResponse(BaseModel):
    id: int
    name: str
    section: Optional[str]
    owner_id: int
    class_code: str
    membership_role: str
    member_count: int


class ClassroomMemberResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    joined_at: datetime


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    classroom_id: int = Field(gt=0)
    actor_id: int = Field(gt=0)


class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    classroom_id: int

    class Config:
        from_attributes = True

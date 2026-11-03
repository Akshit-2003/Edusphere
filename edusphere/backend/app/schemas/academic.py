from typing import Optional

from pydantic import BaseModel


class ClassroomCreate(BaseModel):
    name: str
    section: Optional[str] = None
    teacher_id: int


class ClassroomResponse(BaseModel):
    id: int
    name: str
    section: Optional[str]
    teacher_id: int

    class Config:
        from_attributes = True

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    classroom_id: int

class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    classroom_id: int

    class Config:
        from_attributes = True
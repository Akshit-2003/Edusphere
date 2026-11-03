# app/schemas/task.py
from pydantic import BaseModel
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"  # By default task 'todo' status mein rahega
    workspace_id: int     # Yeh task kis workspace ka hai

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    workspace_id: int

    class Config:
        from_attributes = True
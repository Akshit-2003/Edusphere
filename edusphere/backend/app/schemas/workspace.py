# app/schemas/workspace.py
from pydantic import BaseModel
from typing import Optional

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: int  # Abhi testing ke liye hum user ki ID yahan se bhejenge

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int

    class Config:
        from_attributes = True
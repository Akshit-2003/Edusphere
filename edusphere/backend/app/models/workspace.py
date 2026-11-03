# app/models/workspace.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import get_ist_time

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id")) # Jis user ne banaya hai
    created_at = Column(DateTime, default=get_ist_time)

    # Relationship
    tasks = relationship("Task", back_populates="workspace")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(String, default="todo") # Options: todo, in_progress, done
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    created_at = Column(DateTime, default=get_ist_time)

    # Relationship
    workspace = relationship("Workspace", back_populates="tasks")
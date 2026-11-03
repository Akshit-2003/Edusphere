# app/api/task.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.workspace import Task
from app.schemas.task import TaskCreate, TaskResponse

router = APIRouter()

# 1. Naya Task banane ka API
@router.post("/tasks/", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    new_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        workspace_id=task.workspace_id
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

# 2. Saare Tasks dekhne ka API
@router.get("/tasks/")
async def get_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task))
    return result.scalars().all()
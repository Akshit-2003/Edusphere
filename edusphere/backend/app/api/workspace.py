# app/api/workspace.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse

router = APIRouter()

# 1. Naya Workspace banane ka API (POST)
@router.post("/workspaces/", response_model=WorkspaceResponse)
async def create_workspace(workspace: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    new_workspace = Workspace(
        name=workspace.name,
        description=workspace.description,
        owner_id=workspace.owner_id
    )
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    return new_workspace

# 2. Saare Workspaces dekhne ka API (GET)
@router.get("/workspaces/")
async def get_workspaces(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workspace))
    return result.scalars().all()
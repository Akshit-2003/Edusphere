# app/api/academic.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.academic import Classroom
from app.schemas.academic import ClassroomCreate, ClassroomResponse
from app.models.academic import Classroom, Course 
from app.schemas.academic import ClassroomCreate, ClassroomResponse, CourseCreate, CourseResponse
from app.models.user import User
router = APIRouter()

# 1. Naya Classroom banane ka API
@router.post("/classrooms/", response_model=ClassroomResponse)
async def create_classroom(classroom: ClassroomCreate, db: AsyncSession = Depends(get_db)):
    if not await db.get(User, classroom.teacher_id):
        raise HTTPException(status_code=404, detail="Teacher account was not found.")
    new_classroom = Classroom(
        name=classroom.name,
        section=classroom.section,
        teacher_id=classroom.teacher_id
    )
    db.add(new_classroom)
    await db.commit()
    await db.refresh(new_classroom)
    return new_classroom

# 2. Saare Classrooms dekhne ka API
@router.get("/classrooms/")
async def get_classrooms(user_id: int | None = Query(default=None), db: AsyncSession = Depends(get_db)):
    statement = select(Classroom).order_by(Classroom.created_at.desc())
    if user_id is not None:
        statement = statement.where(Classroom.teacher_id == user_id)
    result = await db.execute(statement)
    return result.scalars().all()
# app/api/academic.py ke sabse neeche yeh naye APIs add kar do:

# 3. Naya Course banane ka API
@router.post("/courses/", response_model=CourseResponse)
async def create_course(course: CourseCreate, db: AsyncSession = Depends(get_db)):
    if not await db.get(Classroom, course.classroom_id):
        raise HTTPException(status_code=404, detail="Classroom not found.")
    new_course = Course(
        title=course.title,
        description=course.description,
        classroom_id=course.classroom_id
    )
    db.add(new_course)
    await db.commit()
    await db.refresh(new_course)
    return new_course

# 4. Saare Courses dekhne ka API
@router.get("/courses/")
async def get_courses(classroom_id: int | None = Query(default=None), db: AsyncSession = Depends(get_db)):
    statement = select(Course).order_by(Course.created_at.desc())
    if classroom_id is not None:
        statement = statement.where(Course.classroom_id == classroom_id)
    result = await db.execute(statement)
    return result.scalars().all()

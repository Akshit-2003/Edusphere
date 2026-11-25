import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.academic import Classroom, ClassroomMember, Course
from app.models.user import User
from app.schemas.academic import (
    ClassroomCreate,
    ClassroomJoin,
    ClassroomMemberResponse,
    ClassroomResponse,
    CourseCreate,
    CourseResponse,
)

router = APIRouter()
CLASS_CODE_ALPHABET = string.ascii_uppercase + string.digits


async def get_user_or_404(user_id: int, db: AsyncSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account was not found.")
    return user


async def generate_class_code(db: AsyncSession) -> str:
    """Generate a concise, collision-checked classroom code."""
    for _ in range(24):
        code = ''.join(secrets.choice(CLASS_CODE_ALPHABET) for _ in range(6))
        existing = (await db.execute(select(Classroom.id).where(Classroom.class_code == code))).scalar_one_or_none()
        if existing is None:
            return code
    raise HTTPException(status_code=503, detail="Could not generate a classroom code. Please try again.")


async def membership_for(classroom_id: int, user_id: int, db: AsyncSession) -> ClassroomMember | None:
    result = await db.execute(
        select(ClassroomMember).where(
            ClassroomMember.classroom_id == classroom_id,
            ClassroomMember.user_id == user_id,
        )
    )
    return result.scalars().first()


async def require_classroom_access(classroom: Classroom, user_id: int, db: AsyncSession) -> ClassroomMember | None:
    membership = await membership_for(classroom.id, user_id, db)
    if classroom.teacher_id != user_id and not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this classroom.")
    return membership


def response_for(classroom: Classroom, membership_role: str, member_count: int) -> ClassroomResponse:
    return ClassroomResponse(
        id=classroom.id,
        name=classroom.name,
        section=classroom.section,
        owner_id=classroom.teacher_id,
        class_code=classroom.class_code,
        membership_role=membership_role,
        member_count=member_count,
    )


@router.post('/classrooms/', response_model=ClassroomResponse, status_code=201)
async def create_classroom(payload: ClassroomCreate, db: AsyncSession = Depends(get_db)):
    """Any signed-in user can create a classroom without changing their global role."""
    await get_user_or_404(payload.creator_id, db)
    classroom = Classroom(
        name=payload.name.strip(),
        section=payload.section.strip() if payload.section else None,
        class_code=await generate_class_code(db),
        teacher_id=payload.creator_id,
    )
    db.add(classroom)
    await db.flush()
    db.add(ClassroomMember(classroom_id=classroom.id, user_id=payload.creator_id, role='owner'))
    await db.commit()
    await db.refresh(classroom)
    return response_for(classroom, 'owner', 1)


@router.get('/classrooms/', response_model=list[ClassroomResponse])
async def get_classrooms(user_id: int = Query(gt=0), db: AsyncSession = Depends(get_db)):
    """Return classrooms the current user owns or has joined, never all classrooms."""
    await get_user_or_404(user_id, db)
    member_count = (
        select(func.count(ClassroomMember.id))
        .where(ClassroomMember.classroom_id == Classroom.id)
        .correlate(Classroom)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Classroom, ClassroomMember.role, member_count.label('member_count'))
        .outerjoin(
            ClassroomMember,
            and_(ClassroomMember.classroom_id == Classroom.id, ClassroomMember.user_id == user_id),
        )
        .where(or_(Classroom.teacher_id == user_id, ClassroomMember.user_id == user_id))
        .order_by(Classroom.created_at.desc())
    )
    rows = result.all()
    return [response_for(classroom, role or ('owner' if classroom.teacher_id == user_id else 'student'), count) for classroom, role, count in rows]


@router.post('/classrooms/join', response_model=ClassroomResponse)
async def join_classroom(payload: ClassroomJoin, db: AsyncSession = Depends(get_db)):
    """Enroll a user through an existing code; duplicate joins are idempotent."""
    await get_user_or_404(payload.user_id, db)
    result = await db.execute(select(Classroom).where(Classroom.class_code == payload.class_code))
    classroom = result.scalars().first()
    if not classroom:
        raise HTTPException(status_code=404, detail="No classroom was found for that class code.")

    membership = await membership_for(classroom.id, payload.user_id, db)
    if not membership:
        membership = ClassroomMember(
            classroom_id=classroom.id,
            user_id=payload.user_id,
            role='owner' if classroom.teacher_id == payload.user_id else 'student',
        )
        db.add(membership)
        await db.commit()
        await db.refresh(membership)

    count = await db.scalar(select(func.count(ClassroomMember.id)).where(ClassroomMember.classroom_id == classroom.id))
    return response_for(classroom, membership.role, count or 0)


@router.get('/classrooms/{classroom_id}/members', response_model=list[ClassroomMemberResponse])
async def list_classroom_members(
    classroom_id: int,
    user_id: int = Query(gt=0),
    db: AsyncSession = Depends(get_db),
):
    classroom = await db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    await require_classroom_access(classroom, user_id, db)
    result = await db.execute(
        select(ClassroomMember, User)
        .join(User, User.id == ClassroomMember.user_id)
        .where(ClassroomMember.classroom_id == classroom_id)
        .order_by(ClassroomMember.role.desc(), ClassroomMember.joined_at)
    )
    return [
        ClassroomMemberResponse(
            user_id=member.user_id,
            full_name=user.full_name,
            email=user.email,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, user in result.all()
    ]


@router.post('/courses/', response_model=CourseResponse, status_code=201)
async def create_course(payload: CourseCreate, db: AsyncSession = Depends(get_db)):
    classroom = await db.get(Classroom, payload.classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    membership = await require_classroom_access(classroom, payload.actor_id, db)
    if classroom.teacher_id != payload.actor_id and (not membership or membership.role != 'owner'):
        raise HTTPException(status_code=403, detail="Only the classroom owner can add courses.")
    course = Course(title=payload.title.strip(), description=payload.description.strip() if payload.description else None, classroom_id=classroom.id)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get('/courses/', response_model=list[CourseResponse])
async def get_courses(
    classroom_id: int = Query(gt=0),
    user_id: int = Query(gt=0),
    db: AsyncSession = Depends(get_db),
):
    classroom = await db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    await require_classroom_access(classroom, user_id, db)
    result = await db.execute(select(Course).where(Course.classroom_id == classroom_id).order_by(Course.created_at.desc()))
    return result.scalars().all()

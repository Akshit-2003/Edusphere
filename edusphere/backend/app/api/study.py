import json
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.user import User
from app.models.study import (AssistantMessage, CalendarEvent, ClassroomChannel, ClassroomMessage, Concept,
    Document, DocumentShare, Flashcard, Quiz, QuizAttempt, StudySession, StudyTask, UserProfile)
from app.schemas.study import (AssistantMessageCreate, AssistantMessageResponse, ChannelCreate, ChannelResponse, ConceptCreate, ConceptResponse,
    DocumentCreate, DocumentResponse, DocumentShareCreate, DocumentShareResponse, DocumentUpdate, EventCreate, EventResponse,
    FlashcardCreate, FlashcardResponse, FlashcardReview, MessageCreate, MessageResponse,
    ProfileResponse, ProfileUpdate, QuizAttemptCreate, QuizCreate, QuizResponse, SessionCreate,
    SessionResponse, TaskCreate, TaskResponse, TaskUpdate)
from app.models.user import get_ist_time

router = APIRouter()


async def get_user_or_404(user_id: int, db: AsyncSession) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.get('/profiles/{user_id}', response_model=ProfileResponse)
async def get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await get_user_or_404(user_id, db)
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalars().first()
    return ProfileResponse(user_id=user.id, full_name=user.full_name, email=user.email,
                           bio=profile.bio if profile else None,
                           daily_goal_hours=profile.daily_goal_hours if profile else 2,
                           department=profile.department if profile else None,
                           semester=profile.semester if profile else None,
                           roll_number=profile.roll_number if profile else None,
                           cgpa=profile.cgpa if profile else None,
                           target_goal=profile.target_goal if profile else None,
                           onboarding_completed=profile.onboarding_completed if profile else False,
                           preferences=profile.preferences if profile and profile.preferences else {},
                           avatar_url=profile.avatar_url if profile else None)


@router.put('/profiles/{user_id}', response_model=ProfileResponse)
async def update_profile(user_id: int, payload: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    user = await get_user_or_404(user_id, db)
    if payload.full_name is not None:
        user.full_name = payload.full_name
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalars().first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.daily_goal_hours is not None:
        profile.daily_goal_hours = payload.daily_goal_hours
    for field in ('department', 'semester', 'roll_number', 'cgpa', 'target_goal', 'onboarding_completed'):
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)
    if payload.preferences is not None:
        profile.preferences = payload.preferences
    if payload.avatar_url is not None:
        profile.avatar_url = payload.avatar_url
    await db.commit()
    return await get_profile(user_id, db)


@router.get('/assistant/messages/', response_model=list[AssistantMessageResponse])
async def list_assistant_messages(user_id: int, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(user_id, db)
    result = await db.execute(
        select(AssistantMessage)
        .where(AssistantMessage.user_id == user_id)
        .order_by(AssistantMessage.created_at)
    )
    return result.scalars().all()


@router.post('/assistant/messages/')
async def create_assistant_message(payload: AssistantMessageCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    message = AssistantMessage(user_id=payload.user_id, role='user', content=payload.content.strip())
    db.add(message)
    await db.flush()

    document_count = (await db.execute(
        select(func.count(Document.id)).where(Document.owner_id == payload.user_id)
    )).scalar_one()
    reply = AssistantMessage(
        user_id=payload.user_id,
        role='assistant',
        content=(
            f"I saved your question to this study session. You currently have {document_count} "
            f"document{'s' if document_count != 1 else ''} in your workspace. "
            "Use your notes, flashcards, and planner together to turn this into a focused study task."
        ),
    )
    db.add(reply)
    await db.commit()
    await db.refresh(message)
    await db.refresh(reply)
    return {'user_message': message, 'assistant_message': reply}


@router.get('/documents/', response_model=list[DocumentResponse])
async def list_documents(user_id: int, search: str | None = None, db: AsyncSession = Depends(get_db)):
    statement = select(Document).where(Document.owner_id == user_id)
    if search:
        pattern = f'%{search.strip()}%'
        statement = statement.where(or_(Document.title.ilike(pattern), Document.content.ilike(pattern)))
    result = await db.execute(statement.order_by(Document.updated_at.desc()))
    return result.scalars().all()


@router.post('/documents/', response_model=DocumentResponse, status_code=201)
async def create_document(payload: DocumentCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.owner_id, db)
    document = Document(**payload.model_dump())
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


@router.get('/documents/{document_id}', response_model=DocumentResponse)
async def get_document(document_id: int, db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    return document


@router.put('/documents/{document_id}', response_model=DocumentResponse)
async def update_document(document_id: int, payload: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(document, field, value)
    await db.commit()
    await db.refresh(document)
    return document


@router.delete('/documents/{document_id}', status_code=204)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    await db.execute(delete(DocumentShare).where(DocumentShare.document_id == document_id))
    await db.delete(document)
    await db.commit()


@router.get('/documents/{document_id}/shares', response_model=list[DocumentShareResponse])
async def list_document_shares(document_id: int, db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    result = await db.execute(
        select(DocumentShare)
        .where(DocumentShare.document_id == document_id)
        .order_by(DocumentShare.created_at)
    )
    return result.scalars().all()


@router.post('/documents/{document_id}/shares', response_model=DocumentShareResponse, status_code=201)
async def create_document_share(document_id: int, payload: DocumentShareCreate, db: AsyncSession = Depends(get_db)):
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    email = payload.email.strip().lower()
    if '@' not in email or email.startswith('@') or email.endswith('@'):
        raise HTTPException(status_code=422, detail='Enter a valid email address.')
    existing = (await db.execute(
        select(DocumentShare).where(DocumentShare.document_id == document_id, DocumentShare.email == email)
    )).scalars().first()
    if existing:
        existing.permission = payload.permission
        await db.commit()
        await db.refresh(existing)
        return existing
    share = DocumentShare(document_id=document_id, email=email, permission=payload.permission)
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return share


@router.delete('/documents/{document_id}/shares/{share_id}', status_code=204)
async def delete_document_share(document_id: int, share_id: int, db: AsyncSession = Depends(get_db)):
    share = await db.get(DocumentShare, share_id)
    if not share or share.document_id != document_id:
        raise HTTPException(status_code=404, detail='Share invitation not found.')
    await db.delete(share)
    await db.commit()


@router.get('/study-tasks/', response_model=list[TaskResponse])
async def list_study_tasks(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudyTask).where(StudyTask.user_id == user_id).order_by(StudyTask.created_at.desc()))
    return result.scalars().all()


@router.post('/study-tasks/', response_model=TaskResponse, status_code=201)
async def create_study_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    task = StudyTask(**payload.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.put('/study-tasks/{task_id}', response_model=TaskResponse)
async def update_study_task(task_id: int, payload: TaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(StudyTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail='Task not found.')
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


@router.delete('/study-tasks/{task_id}', status_code=204)
async def delete_study_task(task_id: int, db: AsyncSession = Depends(get_db)):
    task = await db.get(StudyTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail='Task not found.')
    await db.delete(task)
    await db.commit()


@router.get('/events/', response_model=list[EventResponse])
async def list_events(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == user_id).order_by(CalendarEvent.starts_at))
    return result.scalars().all()


@router.post('/events/', response_model=EventResponse, status_code=201)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    event = CalendarEvent(**payload.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get('/sessions/', response_model=list[SessionResponse])
async def list_sessions(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudySession).where(StudySession.user_id == user_id).order_by(StudySession.completed_at.desc()))
    return result.scalars().all()


@router.post('/sessions/', response_model=SessionResponse, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    session = StudySession(**payload.model_dump())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get('/flashcards/', response_model=list[FlashcardResponse])
async def list_flashcards(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Flashcard).where(Flashcard.user_id == user_id).order_by(Flashcard.next_review_at))
    return result.scalars().all()


@router.post('/flashcards/', response_model=FlashcardResponse, status_code=201)
async def create_flashcard(payload: FlashcardCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    card = Flashcard(**payload.model_dump())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.post('/flashcards/{card_id}/review', response_model=FlashcardResponse)
async def review_flashcard(card_id: int, payload: FlashcardReview, db: AsyncSession = Depends(get_db)):
    card = await db.get(Flashcard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail='Flashcard not found.')
    intervals = {'again': 0, 'hard': 1, 'good': 3, 'easy': 7}
    card.review_count += 1
    card.next_review_at = get_ist_time() + timedelta(days=intervals[payload.rating])
    await db.commit()
    await db.refresh(card)
    return card


@router.get('/quizzes/', response_model=list[QuizResponse])
async def list_quizzes(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Quiz).where(Quiz.user_id == user_id).order_by(Quiz.created_at.desc()))
    return result.scalars().all()


@router.post('/quizzes/', response_model=QuizResponse, status_code=201)
async def create_quiz(payload: QuizCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    quiz = Quiz(**payload.model_dump())
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return quiz


@router.post('/quizzes/{quiz_id}/attempts')
async def create_quiz_attempt(quiz_id: int, payload: QuizAttemptCreate, db: AsyncSession = Depends(get_db)):
    quiz = await db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail='Quiz not found.')
    attempt = QuizAttempt(quiz_id=quiz_id, **payload.model_dump())
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return {'id': attempt.id, 'score': attempt.score, 'attempted_at': attempt.attempted_at}


@router.get('/classrooms/{classroom_id}/channels', response_model=list[ChannelResponse])
async def list_channels(classroom_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClassroomChannel).where(ClassroomChannel.classroom_id == classroom_id))
    return result.scalars().all()


@router.post('/classrooms/{classroom_id}/channels', response_model=ChannelResponse, status_code=201)
async def create_channel(classroom_id: int, payload: ChannelCreate, db: AsyncSession = Depends(get_db)):
    channel = ClassroomChannel(classroom_id=classroom_id, name=payload.name)
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.get('/channels/{channel_id}/messages', response_model=list[MessageResponse])
async def list_messages(channel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ClassroomMessage).where(ClassroomMessage.channel_id == channel_id).order_by(ClassroomMessage.created_at))
    return result.scalars().all()


@router.post('/channels/{channel_id}/messages', response_model=MessageResponse, status_code=201)
async def create_message(channel_id: int, payload: MessageCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.sender_id, db)
    message = ClassroomMessage(channel_id=channel_id, **payload.model_dump())
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get('/concepts/', response_model=list[ConceptResponse])
async def list_concepts(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Concept).where(Concept.user_id == user_id).order_by(Concept.name))
    return result.scalars().all()


@router.post('/concepts/', response_model=ConceptResponse, status_code=201)
async def create_concept(payload: ConceptCreate, db: AsyncSession = Depends(get_db)):
    concept = Concept(**payload.model_dump())
    db.add(concept)
    await db.commit()
    await db.refresh(concept)
    return concept


@router.get('/dashboard/{user_id}')
async def dashboard(user_id: int, db: AsyncSession = Depends(get_db)):
    now = get_ist_time()

    # All dashboard data is assembled by PostgreSQL in one request. This keeps
    # remote database latency from delaying the page once per individual card.
    focus_minutes_query = (
        select(func.coalesce(func.sum(StudySession.duration_minutes), 0))
        .where(StudySession.user_id == user_id)
        .scalar_subquery()
    )
    card_count_query = (
        select(func.count(Flashcard.id))
        .where(Flashcard.user_id == user_id)
        .scalar_subquery()
    )
    due_flashcards_query = (
        select(func.count(Flashcard.id))
        .where(Flashcard.user_id == user_id, Flashcard.next_review_at <= now)
        .scalar_subquery()
    )
    # Each aggregate is deliberately limited before it is turned into JSON.
    # Earlier versions aggregated every task, document and focus session, then
    # sorted them in Python. That made a dashboard with a long history slow to
    # open even though the UI only displays a small recent subset.
    open_task_rows = (
        select(
            StudyTask.id, StudyTask.title, StudyTask.subject, StudyTask.priority,
            StudyTask.status, StudyTask.due_at,
        )
        .where(StudyTask.user_id == user_id, StudyTask.status != 'done')
        .order_by(StudyTask.due_at.asc().nulls_last(), StudyTask.updated_at.desc())
        .limit(5)
        .subquery()
    )
    open_tasks_query = (
        select(func.json_agg(func.json_build_object(
            'id', open_task_rows.c.id,
            'title', open_task_rows.c.title,
            'subject', open_task_rows.c.subject,
            'priority', open_task_rows.c.priority,
            'status', open_task_rows.c.status,
            'due_at', open_task_rows.c.due_at,
        )))
        .select_from(open_task_rows)
        .scalar_subquery()
    )
    task_total_query = select(func.count(StudyTask.id)).where(StudyTask.user_id == user_id).scalar_subquery()
    completed_task_count_query = (
        select(func.count(StudyTask.id))
        .where(StudyTask.user_id == user_id, StudyTask.status == 'done')
        .scalar_subquery()
    )
    completed_task_rows = (
        select(StudyTask.title, StudyTask.updated_at)
        .where(StudyTask.user_id == user_id, StudyTask.status == 'done')
        .order_by(StudyTask.updated_at.desc())
        .limit(4)
        .subquery()
    )
    completed_tasks_query = (
        select(func.json_agg(func.json_build_object(
            'title', completed_task_rows.c.title,
            'updated_at', completed_task_rows.c.updated_at,
        )))
        .select_from(completed_task_rows)
        .scalar_subquery()
    )
    document_rows = (
        select(Document.id, Document.title, Document.folder, Document.updated_at)
        .where(Document.owner_id == user_id)
        .order_by(Document.updated_at.desc())
        .limit(3)
        .subquery()
    )
    documents_query = (
        select(func.json_agg(func.json_build_object(
            'id', document_rows.c.id,
            'title', document_rows.c.title,
            'folder', document_rows.c.folder,
            'updated_at', document_rows.c.updated_at,
        )))
        .select_from(document_rows)
        .scalar_subquery()
    )
    session_rows = (
        select(StudySession.duration_minutes, StudySession.focus_type, StudySession.completed_at)
        .where(StudySession.user_id == user_id)
        .order_by(StudySession.completed_at.desc())
        .limit(3)
        .subquery()
    )
    sessions_query = (
        select(func.json_agg(func.json_build_object(
            'duration_minutes', session_rows.c.duration_minutes,
            'focus_type', session_rows.c.focus_type,
            'completed_at', session_rows.c.completed_at,
        )))
        .select_from(session_rows)
        .scalar_subquery()
    )
    study_dates_query = (
        select(func.json_agg(func.distinct(func.date(StudySession.completed_at))))
        .where(StudySession.user_id == user_id)
        .scalar_subquery()
    )
    event_rows = (
        select(CalendarEvent.id, CalendarEvent.title, CalendarEvent.starts_at, CalendarEvent.event_type)
        .where(CalendarEvent.user_id == user_id, CalendarEvent.starts_at >= now)
        .order_by(CalendarEvent.starts_at)
        .limit(5)
        .subquery()
    )
    events_query = (
        select(func.json_agg(func.json_build_object(
            'id', event_rows.c.id,
            'title', event_rows.c.title,
            'starts_at', event_rows.c.starts_at,
            'event_type', event_rows.c.event_type,
        )))
        .select_from(event_rows)
        .scalar_subquery()
    )
    workspace_rows = (
        select(
            func.coalesce(Document.folder, 'General').label('title'),
            func.count(Document.id).label('documents'),
            func.max(Document.updated_at).label('updated_at'),
        )
        .where(Document.owner_id == user_id)
        .group_by(Document.folder)
        .order_by(func.max(Document.updated_at).desc())
        .limit(4)
        .subquery()
    )
    workspaces_query = (
        select(func.json_agg(func.json_build_object(
            'title', workspace_rows.c.title,
            'documents', workspace_rows.c.documents,
            'updated_at', workspace_rows.c.updated_at,
        )))
        .select_from(workspace_rows)
        .scalar_subquery()
    )
    summary = (await db.execute(
        select(
            User.full_name,
            focus_minutes_query.label('focus_minutes'),
            card_count_query.label('card_count'),
            due_flashcards_query.label('due_flashcards'),
            open_tasks_query.label('tasks'),
            task_total_query.label('tasks_total'),
            completed_task_count_query.label('tasks_completed'),
            completed_tasks_query.label('completed_tasks'),
            events_query.label('upcoming_events'),
            documents_query.label('documents'),
            workspaces_query.label('workspaces'),
            sessions_query.label('sessions'),
            study_dates_query.label('study_dates'),
        ).where(User.id == user_id)
    )).mappings().one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail='User not found.')

    def json_rows(value):
        if not value:
            return []
        return json.loads(value) if isinstance(value, str) else value

    open_tasks = json_rows(summary['tasks'])
    events = json_rows(summary['upcoming_events'])
    recent_documents = json_rows(summary['documents'])
    recent_sessions = json_rows(summary['sessions'])
    completed_tasks = json_rows(summary['completed_tasks'])
    workspaces = json_rows(summary['workspaces'])

    study_dates = {
        value if isinstance(value, date) else datetime.fromisoformat(str(value).replace('Z', '+00:00')).date()
        for value in json_rows(summary['study_dates'])
        if value is not None
    }
    streak_date = now.date()
    if streak_date not in study_dates:
        streak_date -= timedelta(days=1)
    study_streak = 0
    while streak_date in study_dates:
        study_streak += 1
        streak_date -= timedelta(days=1)

    activity = [
        {
            'action': f"Updated note: {document['title']}",
            'occurred_at': document['updated_at'],
            'type': 'document',
        }
        for document in recent_documents
    ]
    activity.extend(
        {
            'action': f"Completed a {session['duration_minutes']}-minute {session['focus_type']} session",
            'occurred_at': session['completed_at'],
            'type': 'focus',
        }
        for session in recent_sessions
    )
    activity.extend(
        {
            'action': f"Completed task: {task['title']}",
            'occurred_at': task['updated_at'],
            'type': 'task',
        }
        for task in completed_tasks
    )
    activity.sort(key=lambda item: item['occurred_at'] or '', reverse=True)

    return {
        'full_name': summary['full_name'],
        'study_streak': study_streak,
        'tasks_completed': summary['tasks_completed'],
        'tasks_total': summary['tasks_total'],
        'focus_minutes': summary['focus_minutes'],
        'flashcards': summary['card_count'],
        'flashcards_due': summary['due_flashcards'],
        'tasks': open_tasks,
        'upcoming_events': events,
        'recent_documents': recent_documents,
        'workspaces': workspaces,
        'recent_activity': activity[:4],
    }


@router.get('/analytics/{user_id}')
async def analytics(user_id: int, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(user_id, db)
    sessions = (await db.execute(select(StudySession).where(StudySession.user_id == user_id).order_by(StudySession.completed_at))).scalars().all()
    tasks = (await db.execute(select(StudyTask).where(StudyTask.user_id == user_id))).scalars().all()
    cards = (await db.execute(select(Flashcard).where(Flashcard.user_id == user_id))).scalars().all()
    attempts = (await db.execute(select(QuizAttempt).where(QuizAttempt.user_id == user_id))).scalars().all()
    today = get_ist_time().date()
    focus_by_day = []
    for days_ago in range(6, -1, -1):
        day = today - timedelta(days=days_ago)
        minutes = sum(session.duration_minutes for session in sessions if session.completed_at and session.completed_at.date() == day)
        focus_by_day.append({'day': day.strftime('%a'), 'minutes': minutes, 'hours': round(minutes / 60, 1)})

    subject_totals: dict[str, dict[str, int]] = {}
    for task in tasks:
        subject = task.subject or 'General'
        totals = subject_totals.setdefault(subject, {'total': 0, 'completed': 0, 'cards': 0})
        totals['total'] += 1
        totals['completed'] += task.status == 'done'
    for card in cards:
        subject = card.subject or 'General'
        totals = subject_totals.setdefault(subject, {'total': 0, 'completed': 0, 'cards': 0})
        totals['cards'] += 1
    subject_progress = [
        {
            'subject': subject,
            'score': round((values['completed'] / values['total']) * 100) if values['total'] else 0,
            'tasks_total': values['total'],
            'tasks_completed': values['completed'],
            'cards': values['cards'],
        }
        for subject, values in subject_totals.items()
    ]
    subject_progress.sort(key=lambda item: item['score'], reverse=True)
    quiz_accuracy = round(sum(min(100, attempt.score) for attempt in attempts) / len(attempts)) if attempts else 0
    return {
        'focus_minutes': sum(session.duration_minutes for session in sessions),
        'sessions': len(sessions),
        'tasks_completed': sum(task.status == 'done' for task in tasks),
        'tasks_total': len(tasks),
        'flashcards': len(cards),
        'quiz_accuracy': quiz_accuracy,
        'focus_by_day': focus_by_day,
        'subject_progress': subject_progress,
    }


@router.get('/search/')
async def search(user_id: int, q: str = Query(min_length=1), db: AsyncSession = Depends(get_db)):
    await get_user_or_404(user_id, db)
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail='Enter a search term.')
    pattern = f'%{query}%'
    documents = (await db.execute(select(Document).where(Document.owner_id == user_id, or_(Document.title.ilike(pattern), Document.content.ilike(pattern))))).scalars().all()
    tasks = (await db.execute(select(StudyTask).where(StudyTask.user_id == user_id, or_(StudyTask.title.ilike(pattern), StudyTask.description.ilike(pattern))))).scalars().all()
    cards = (await db.execute(select(Flashcard).where(Flashcard.user_id == user_id, or_(Flashcard.front.ilike(pattern), Flashcard.back.ilike(pattern))))).scalars().all()
    quizzes = (await db.execute(select(Quiz).where(Quiz.user_id == user_id, Quiz.title.ilike(pattern)))).scalars().all()
    concepts = (await db.execute(select(Concept).where(Concept.user_id == user_id, or_(Concept.name.ilike(pattern), Concept.description.ilike(pattern))))).scalars().all()
    events = (await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == user_id, CalendarEvent.title.ilike(pattern)))).scalars().all()
    return {
        'results': ([{'id': item.id, 'type': 'notes', 'title': item.title, 'snippet': item.content[:160]} for item in documents]
                    + [{'id': item.id, 'type': 'tasks', 'title': item.title, 'snippet': item.description or ''} for item in tasks]
                    + [{'id': item.id, 'type': 'flashcards', 'title': item.front, 'snippet': item.back[:160]} for item in cards]
                    + [{'id': item.id, 'type': 'quizzes', 'title': item.title, 'snippet': item.subject or 'Study quiz'} for item in quizzes]
                    + [{'id': item.id, 'type': 'concepts', 'title': item.name, 'snippet': item.description or 'Knowledge concept'} for item in concepts]
                    + [{'id': item.id, 'type': 'events', 'title': item.title, 'snippet': f'{item.event_type.title()} event'} for item in events])
    }

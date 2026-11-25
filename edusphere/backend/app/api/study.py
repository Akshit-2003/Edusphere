import json
import re
from io import BytesIO
from pathlib import Path
from collections import Counter
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pypdf import PdfReader
from sqlalchemy import delete, func, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.user import User
from app.models.study import (AssistantConversation, AssistantMessage, CalendarEvent, ClassroomChannel, ClassroomMessage, Concept, ConceptRelationship,
    Document, DocumentPresence, DocumentShare, Flashcard, Quiz, QuizAttempt, StudySession, StudyTask, UserProfile)
from app.schemas.study import (AssistantActionRequest, AssistantConversationCreate, AssistantConversationResponse, AssistantConversationUpdate, AssistantMessageCreate, AssistantMessageResponse, ChannelCreate, ChannelResponse, ConceptCreate, ConceptRelationshipCreate, ConceptResponse,
    DocumentCollaboratorResponse, DocumentCreate, DocumentPresenceUpdate, DocumentResponse, DocumentShareCreate, DocumentShareResponse, DocumentUpdate, EventCreate, EventResponse, EventUpdate,
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
    return ProfileResponse(user_id=user.id, full_name=user.full_name, email=user.email, email_verified=user.email_verified,
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
    if payload.email is not None and payload.email != user.email:
        existing_email = (await db.execute(
            select(User).where(func.lower(User.email) == payload.email.lower(), User.id != user_id)
        )).scalars().first()
        if existing_email:
            raise HTTPException(status_code=409, detail='An account with this email already exists.')
        # A changed address must be verified again before it can be used for a
        # future sign-in. Any OTP for the old address is invalidated here.
        user.email = payload.email
        user.email_verified = False
        user.verification_otp_hash = None
        user.verification_otp_expiry = None
        user.verification_otp_sent_at = None
        user.verification_otp_attempts = 0
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


def assistant_context_items(documents: list[Document]) -> list[dict[str, object]]:
    """Return small, safe context descriptors stored with each chat message."""
    return [
        {
            'document_id': document.id,
            'title': document.title,
            'kind': 'PDF' if document.folder.lower() == 'pdf imports' else 'Note',
        }
        for document in documents
    ]


def study_sentences(text: str, limit: int = 5) -> list[str]:
    compact = re.sub(r'\s+', ' ', text).strip()
    return [
        sentence.strip()
        for sentence in re.split(r'(?<=[.!?])\s+', compact)
        if len(sentence.strip()) >= 30
    ][:limit]


def assistant_reply(prompt: str, documents: list[Document], subject: str | None, mode: str | None) -> str:
    """Produce a useful, source-grounded study response without inventing private note content.

    The assistant deliberately quotes its selected workspace context in short,
    reviewable chunks. A hosted model can later replace this deterministic
    generator while preserving the same persisted conversation contract.
    """
    topic = (subject or '').strip() or (documents[0].title if documents else 'this topic')
    source_titles = ', '.join(document.title for document in documents)
    excerpts = [sentence for document in documents for sentence in study_sentences(document.content, limit=4)]
    if not excerpts:
        excerpts = study_sentences(prompt, limit=3)

    evidence = '\n'.join(f'- {sentence}' for sentence in excerpts[:4])
    context_line = f"Based on your selected material: **{source_titles}**." if source_titles else 'No workspace source was selected, so this is a focused study scaffold.'
    normalized_mode = (mode or '').lower()

    if normalized_mode == 'summary':
        return f"## Summary — {topic}\n\n{context_line}\n\n### Main takeaways\n{evidence or '- Start by identifying the definition, process, and examples for this topic.'}\n\n### Review next\n1. Restate each takeaway in your own words.\n2. Link it to one worked example.\n3. Test yourself without looking at the source."
    if normalized_mode == 'explain':
        return f"## Step-by-step explanation — {topic}\n\n{context_line}\n\n1. **Start with the core idea.** Define {topic} in one sentence.\n2. **Break it into parts.** Identify the terms, sequence, or components in your material.\n3. **Connect cause and effect.** Ask what changes when each part is applied.\n4. **Check with an example.** Explain one example aloud without reading.\n\n### Evidence from your material\n{evidence or '- Add a note or PDF as context for source-specific examples.'}"
    if normalized_mode == 'flashcards':
        return f"## Flashcard set — {topic}\n\n{context_line}\n\n{evidence or '- Add a workspace note to generate source-grounded cards.'}\n\nUse **Create flashcards** below to save revision cards directly to your deck."
    if normalized_mode == 'quiz':
        return f"## Practice plan — {topic}\n\n{context_line}\n\n### Test yourself\n1. What is the central definition or purpose?\n2. Which steps or components must appear in order?\n3. What is a realistic example or exception?\n\n### Study evidence\n{evidence or '- Select a note or PDF, then generate a practice quiz from it.'}\n\nUse **Create quiz** below to add a self-test to Quiz practice."
    if normalized_mode == 'roadmap':
        return f"## Study roadmap — {topic}\n\n{context_line}\n\n1. **Understand:** Read the source once and write a one-sentence definition.\n2. **Practice:** Turn the key ideas into active-recall questions.\n3. **Review:** Revisit the weak points after a focused session.\n\n### Priority material\n{evidence or '- Attach course material so the roadmap can be tied to your notes.'}\n\nUse **Create roadmap tasks** below to add this plan to your Study Planner."

    return f"## Study help — {topic}\n\n{context_line}\n\n### A focused answer\nYour question: *{prompt.strip()}*\n\n{evidence or 'Start by selecting a workspace note, imported PDF, or a subject. I will use it as study context for your next question.'}\n\n### Best next step\nTurn the points above into retrieval questions, then use a short focus session to practise recalling them without reopening the source."


async def get_assistant_conversation_or_404(conversation_id: int, user_id: int, db: AsyncSession) -> AssistantConversation:
    conversation = await db.get(AssistantConversation, conversation_id)
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(status_code=404, detail='Study chat not found.')
    return conversation


async def move_legacy_assistant_messages(user_id: int, db: AsyncSession) -> None:
    """Keep the original single chat visible after the session migration."""
    legacy = (await db.execute(
        select(AssistantMessage.id)
        .where(AssistantMessage.user_id == user_id, AssistantMessage.conversation_id.is_(None))
        .limit(1)
    )).scalar_one_or_none()
    if legacy is None:
        return
    conversation = AssistantConversation(user_id=user_id, title='Earlier study chat')
    db.add(conversation)
    await db.flush()
    await db.execute(
        AssistantMessage.__table__.update()
        .where(AssistantMessage.user_id == user_id, AssistantMessage.conversation_id.is_(None))
        .values(conversation_id=conversation.id)
    )


@router.get('/assistant/conversations/', response_model=list[AssistantConversationResponse])
async def list_assistant_conversations(user_id: int, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(user_id, db)
    await move_legacy_assistant_messages(user_id, db)
    await db.commit()
    result = await db.execute(
        select(AssistantConversation)
        .where(AssistantConversation.user_id == user_id)
        .order_by(AssistantConversation.updated_at.desc())
    )
    return result.scalars().all()


@router.post('/assistant/conversations/', response_model=AssistantConversationResponse, status_code=201)
async def create_assistant_conversation(payload: AssistantConversationCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    conversation = AssistantConversation(user_id=payload.user_id, title=payload.title.strip())
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.patch('/assistant/conversations/{conversation_id}', response_model=AssistantConversationResponse)
async def rename_assistant_conversation(conversation_id: int, payload: AssistantConversationUpdate, db: AsyncSession = Depends(get_db)):
    conversation = await get_assistant_conversation_or_404(conversation_id, payload.user_id, db)
    conversation.title = payload.title.strip()
    conversation.updated_at = get_ist_time()
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.delete('/assistant/conversations/{conversation_id}', status_code=204)
async def delete_assistant_conversation(conversation_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    conversation = await get_assistant_conversation_or_404(conversation_id, user_id, db)
    await db.execute(delete(AssistantMessage).where(AssistantMessage.conversation_id == conversation.id))
    await db.delete(conversation)
    await db.commit()


@router.get('/assistant/conversations/{conversation_id}/messages/', response_model=list[AssistantMessageResponse])
async def list_conversation_messages(conversation_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    await get_assistant_conversation_or_404(conversation_id, user_id, db)
    result = await db.execute(
        select(AssistantMessage)
        .where(AssistantMessage.user_id == user_id, AssistantMessage.conversation_id == conversation_id)
        .order_by(AssistantMessage.created_at)
    )
    return result.scalars().all()


@router.get('/assistant/messages/', response_model=list[AssistantMessageResponse], include_in_schema=False)
async def list_assistant_messages(user_id: int, db: AsyncSession = Depends(get_db)):
    """Compatibility endpoint for earlier clients; new clients use conversations."""
    await get_user_or_404(user_id, db)
    result = await db.execute(
        select(AssistantMessage).where(AssistantMessage.user_id == user_id).order_by(AssistantMessage.created_at)
    )
    return result.scalars().all()


@router.post('/assistant/messages/')
async def create_assistant_message(payload: AssistantMessageCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    conversation = None
    if payload.conversation_id:
        conversation = await get_assistant_conversation_or_404(payload.conversation_id, payload.user_id, db)
    else:
        conversation = AssistantConversation(user_id=payload.user_id, title=payload.content.strip()[:56] or 'New study chat')
        db.add(conversation)
        await db.flush()

    document_ids = list(dict.fromkeys(payload.document_ids))
    documents: list[Document] = []
    if document_ids:
        result = await db.execute(select(Document).where(Document.owner_id == payload.user_id, Document.id.in_(document_ids)))
        documents = result.scalars().all()
        if len(documents) != len(document_ids):
            raise HTTPException(status_code=404, detail='One or more selected workspace sources were not found.')

    context_items = assistant_context_items(documents)
    message = AssistantMessage(
        user_id=payload.user_id,
        conversation_id=conversation.id,
        role='user',
        content=payload.content.strip(),
        context_items=context_items,
    )
    db.add(message)
    reply = AssistantMessage(
        user_id=payload.user_id,
        conversation_id=conversation.id,
        role='assistant',
        content=assistant_reply(payload.content, documents, payload.subject, payload.mode),
        context_items=context_items,
    )
    conversation.updated_at = get_ist_time()
    if conversation.title == 'New study chat':
        conversation.title = payload.content.strip()[:56] or conversation.title
    db.add(reply)
    await db.commit()
    await db.refresh(message)
    await db.refresh(reply)
    await db.refresh(conversation)
    return {'conversation': conversation, 'user_message': message, 'assistant_message': reply}


async def get_assistant_reply_for_action(payload: AssistantActionRequest, db: AsyncSession) -> AssistantMessage:
    await get_user_or_404(payload.user_id, db)
    message = await db.get(AssistantMessage, payload.assistant_message_id)
    if not message or message.user_id != payload.user_id or message.role != 'assistant':
        raise HTTPException(status_code=404, detail='The selected assistant response was not found.')
    return message


def action_subject(message: AssistantMessage) -> str:
    items = message.context_items or []
    first = items[0] if items else {}
    return str(first.get('title') or 'AI study session')[:120]


@router.post('/assistant/actions/flashcards')
async def create_flashcards_from_assistant(payload: AssistantActionRequest, db: AsyncSession = Depends(get_db)):
    message = await get_assistant_reply_for_action(payload, db)
    sentences = study_sentences(message.content, limit=5) or [message.content[:360]]
    subject = action_subject(message)
    cards = []
    for index, sentence in enumerate(sentences, start=1):
        card = Flashcard(
            user_id=payload.user_id,
            front=f'{subject}: key idea {index}',
            back=sentence,
            subject=subject,
        )
        db.add(card)
        cards.append(card)
    await db.commit()
    return {'message': f'{len(cards)} flashcards added to your revision deck.', 'created_count': len(cards)}


@router.post('/assistant/actions/quiz')
async def create_quiz_from_assistant(payload: AssistantActionRequest, db: AsyncSession = Depends(get_db)):
    message = await get_assistant_reply_for_action(payload, db)
    subject = action_subject(message)
    facts = study_sentences(message.content, limit=5) or [message.content[:220]]
    questions = []
    distractors = ['A detail not supported by the selected material', 'An unrelated study strategy', 'A term from a different topic']
    for index, fact in enumerate(facts, start=1):
        correct_index = index % 4
        options = distractors.copy()
        options.insert(correct_index, fact)
        questions.append({
            'q': f'Which statement best matches key point {index} from {subject}?',
            'opts': options,
            'correct': correct_index,
        })
    quiz = Quiz(user_id=payload.user_id, title=f'{subject} — AI practice quiz', subject=subject, questions=questions)
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return {'message': 'Practice quiz created and ready in Quiz practice.', 'quiz_id': quiz.id, 'question_count': len(questions)}


@router.post('/assistant/actions/roadmap')
async def create_roadmap_from_assistant(payload: AssistantActionRequest, db: AsyncSession = Depends(get_db)):
    message = await get_assistant_reply_for_action(payload, db)
    subject = action_subject(message)
    evidence = study_sentences(message.content, limit=3)
    titles = [
        f'Understand {subject}',
        f'Practise active recall for {subject}',
        f'Review and self-test {subject}',
    ]
    tasks = []
    for index, title in enumerate(titles):
        task = StudyTask(
            user_id=payload.user_id,
            title=title[:250],
            description=evidence[index] if index < len(evidence) else 'Created from your AI study roadmap.',
            subject=subject,
            priority='medium',
            status='todo',
            estimate_minutes=30,
        )
        db.add(task)
        tasks.append(task)
    await db.commit()
    return {'message': f'{len(tasks)} roadmap tasks added to your Study Planner.', 'created_count': len(tasks)}


@router.post('/assistant/actions/note')
async def save_assistant_response_as_note(payload: AssistantActionRequest, db: AsyncSession = Depends(get_db)):
    message = await get_assistant_reply_for_action(payload, db)
    subject = action_subject(message)
    note = Document(
        owner_id=payload.user_id,
        title=f'AI notes — {subject}'[:250],
        content=f'# AI study notes — {subject}\n\n{message.content}',
        folder='AI Notes',
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {'message': 'Explanation saved to your workspace notes.', 'document_id': note.id, 'title': note.title}


MAX_PDF_IMPORT_BYTES = 15 * 1024 * 1024
PDF_STOP_WORDS = {'about', 'after', 'also', 'and', 'are', 'been', 'being', 'between', 'can', 'chapter', 'document', 'each', 'for', 'from', 'have', 'into', 'more', 'not', 'of', 'on', 'or', 'that', 'the', 'their', 'there', 'these', 'this', 'through', 'using', 'was', 'were', 'with', 'your'}


def compact_pdf_summary(text: str) -> str:
    sentences = [sentence.strip() for sentence in re.split(r'(?<=[.!?])\s+', text) if len(sentence.strip()) > 30]
    summary = ' '.join(sentences[:4])
    return summary[:900].rstrip() or 'The PDF was imported successfully. Open the workspace note to review its extracted content.'


def extract_pdf_concepts(text: str) -> list[str]:
    words = [word.lower() for word in re.findall(r"[A-Za-z][A-Za-z-]{3,}", text)]
    counts = Counter(word for word in words if word not in PDF_STOP_WORDS)
    return [word.title() for word, _ in counts.most_common(6)]


@router.post('/pdf/import')
async def import_pdf(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    generate_summary: bool = Form(True),
    generate_flashcards: bool = Form(False),
    save_as_note: bool = Form(True),
    db: AsyncSession = Depends(get_db),
):
    """Validate, parse, and turn a PDF into user-scoped study material."""
    await get_user_or_404(user_id, db)
    filename = file.filename or 'Imported PDF.pdf'
    if not filename.lower().endswith('.pdf') or file.content_type not in {None, '', 'application/pdf', 'application/octet-stream'}:
        raise HTTPException(status_code=415, detail='Please upload a valid PDF file.')
    content = await file.read(MAX_PDF_IMPORT_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail='The selected PDF is empty.')
    if len(content) > MAX_PDF_IMPORT_BYTES:
        raise HTTPException(status_code=413, detail='Choose a PDF smaller than 15 MB.')
    if not content.startswith(b'%PDF-'):
        raise HTTPException(status_code=415, detail='This file does not have a valid PDF signature.')
    try:
        reader = PdfReader(BytesIO(content))
        if len(reader.pages) > 120:
            raise HTTPException(status_code=422, detail='Please import a PDF with 120 pages or fewer.')
        extracted_text = '\n\n'.join((page.extract_text() or '').strip() for page in reader.pages).strip()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=422, detail='This PDF could not be read. It may be password-protected or image-only.') from error
    if not extracted_text:
        raise HTTPException(status_code=422, detail='No selectable text was found in this PDF. Try a text-based PDF.')

    title = Path(filename).stem.strip() or 'Imported study document'
    extracted_text = extracted_text[:80_000]
    summary = compact_pdf_summary(extracted_text) if generate_summary else ''
    concepts = extract_pdf_concepts(extracted_text)
    document = None
    if save_as_note:
        note_sections = [f'# {title}', f'Imported from {filename}']
        if summary:
            note_sections.extend(['## AI Summary', summary])
        if concepts:
            note_sections.extend(['## Key Concepts', ', '.join(concepts)])
        note_sections.extend(['## Extracted Content', extracted_text])
        document = Document(owner_id=user_id, title=title, content='\n\n'.join(note_sections), folder='PDF Imports')
        db.add(document)
        await db.flush()

    created_flashcards = []
    if generate_flashcards:
        source_sentences = [sentence.strip() for sentence in re.split(r'(?<=[.!?])\s+', extracted_text) if 30 <= len(sentence.strip()) <= 360]
        for index, sentence in enumerate(source_sentences[:5], start=1):
            card = Flashcard(
                user_id=user_id,
                document_id=document.id if document else None,
                front=f'Key point {index}: what should you remember from {title}?',
                back=sentence,
                subject=concepts[0] if concepts else 'PDF Import',
            )
            db.add(card)
            created_flashcards.append(card)
    for concept_name in concepts[:4]:
        existing = (await db.execute(select(Concept).where(Concept.user_id == user_id, func.lower(Concept.name) == concept_name.lower()))).scalars().first()
        if not existing:
            db.add(Concept(user_id=user_id, name=concept_name, description=f'Imported from {title}', category='PDF Import'))
    await db.commit()
    if document:
        await db.refresh(document)
    return {
        'document_id': document.id if document else None,
        'document_title': document.title if document else title,
        'page_count': len(reader.pages),
        'extracted_characters': len(extracted_text),
        'summary': summary,
        'key_concepts': concepts,
        'flashcards_created': len(created_flashcards),
        'preview': extracted_text[:700],
    }


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
    await db.execute(delete(DocumentPresence).where(DocumentPresence.document_id == document_id))
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


PRESENCE_TTL = timedelta(seconds=12)


@router.put('/documents/{document_id}/presence', status_code=204)
async def update_document_presence(document_id: int, payload: DocumentPresenceUpdate, db: AsyncSession = Depends(get_db)):
    """Record one browser session's current document presence and edit state."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')
    await get_user_or_404(payload.user_id, db)

    now = get_ist_time()
    # Heartbeats can overlap when a user starts typing as an interval tick is
    # in flight. PostgreSQL's upsert keeps that normal browser behavior safe.
    heartbeat = pg_insert(DocumentPresence).values(
        document_id=document_id,
        user_id=payload.user_id,
        session_id=payload.session_id,
        is_editing=payload.is_editing,
        last_active_at=now,
    ).on_conflict_do_update(
        constraint='uq_document_presence_session',
        set_={'is_editing': payload.is_editing, 'last_active_at': now},
    )
    await db.execute(heartbeat)
    await db.commit()


@router.get('/documents/{document_id}/collaborators', response_model=list[DocumentCollaboratorResponse])
async def list_document_collaborators(document_id: int, db: AsyncSession = Depends(get_db)):
    """Return users whose document session heartbeat is still active."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=404, detail='Document not found.')

    active_since = get_ist_time() - PRESENCE_TTL
    await db.execute(
        delete(DocumentPresence).where(
            DocumentPresence.document_id == document_id,
            DocumentPresence.last_active_at < active_since,
        )
    )
    await db.commit()

    result = await db.execute(
        select(DocumentPresence, User, UserProfile)
        .join(User, User.id == DocumentPresence.user_id)
        .outerjoin(UserProfile, UserProfile.user_id == User.id)
        .where(
            DocumentPresence.document_id == document_id,
            DocumentPresence.last_active_at >= active_since,
        )
        .order_by(DocumentPresence.last_active_at.desc())
    )

    # A user can have the same document open in more than one tab. The header
    # represents that person once, while preserving an editing status if any
    # of their live sessions is editing.
    active_users: dict[int, DocumentCollaboratorResponse] = {}
    for presence, user, profile in result.all():
        current = active_users.get(user.id)
        if current:
            current.is_editing = current.is_editing or presence.is_editing
            continue
        active_users[user.id] = DocumentCollaboratorResponse(
            user_id=user.id,
            full_name=user.full_name,
            avatar_url=profile.avatar_url if profile else None,
            is_editing=presence.is_editing,
            last_active_at=presence.last_active_at,
        )
    return list(active_users.values())


@router.delete('/documents/{document_id}/presence', status_code=204)
async def leave_document_presence(
    document_id: int,
    user_id: int = Query(gt=0),
    session_id: str = Query(min_length=8, max_length=80),
    db: AsyncSession = Depends(get_db),
):
    """Remove only the closing browser session; other tabs remain active."""
    await db.execute(
        delete(DocumentPresence).where(
            DocumentPresence.document_id == document_id,
            DocumentPresence.user_id == user_id,
            DocumentPresence.session_id == session_id,
        )
    )
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


@router.get('/calendar-events/', response_model=list[EventResponse])
@router.get('/events/', response_model=list[EventResponse], include_in_schema=False)
async def list_events(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.user_id == user_id).order_by(CalendarEvent.starts_at))
    return result.scalars().all()


@router.post('/calendar-events/', response_model=EventResponse, status_code=201)
@router.post('/events/', response_model=EventResponse, status_code=201, include_in_schema=False)
async def create_event(payload: EventCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    event = CalendarEvent(**payload.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put('/calendar-events/{event_id}', response_model=EventResponse)
@router.put('/events/{event_id}', response_model=EventResponse, include_in_schema=False)
async def update_event(event_id: int, payload: EventUpdate, db: AsyncSession = Depends(get_db)):
    event = await db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Calendar event not found.')
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete('/calendar-events/{event_id}', status_code=204)
@router.delete('/events/{event_id}', status_code=204, include_in_schema=False)
async def delete_event(event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(CalendarEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail='Calendar event not found.')
    await db.delete(event)
    await db.commit()


@router.get('/sessions/', response_model=list[SessionResponse])
async def list_sessions(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudySession).where(StudySession.user_id == user_id).order_by(StudySession.completed_at.desc()))
    return result.scalars().all()


@router.post('/sessions/', response_model=SessionResponse, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    await get_user_or_404(payload.user_id, db)
    if payload.task_id is not None:
        task = await db.get(StudyTask, payload.task_id)
        if not task or task.user_id != payload.user_id:
            raise HTTPException(status_code=404, detail='The selected study task was not found.')
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


@router.get('/knowledge-graph/')
async def get_knowledge_graph(user_id: int, db: AsyncSession = Depends(get_db)):
    """Return a user-scoped concept graph with real study artefact links."""
    await get_user_or_404(user_id, db)
    concepts = (await db.execute(select(Concept).where(Concept.user_id == user_id).order_by(Concept.name))).scalars().all()
    concept_ids = [concept.id for concept in concepts]
    if not concept_ids:
        return {'nodes': [], 'edges': [], 'categories': []}

    relationships = (await db.execute(
        select(ConceptRelationship).where(
            ConceptRelationship.source_id.in_(concept_ids),
            ConceptRelationship.target_id.in_(concept_ids),
        )
    )).scalars().all()
    documents = (await db.execute(select(Document).where(Document.owner_id == user_id))).scalars().all()
    flashcards = (await db.execute(select(Flashcard).where(Flashcard.user_id == user_id))).scalars().all()
    tasks = (await db.execute(select(StudyTask).where(StudyTask.user_id == user_id))).scalars().all()

    def matches_concept(text: str | None, name: str) -> bool:
        return bool(text and name.lower() in text.lower())

    nodes: list[dict] = []
    edges: list[dict] = []
    seen_artifacts: set[str] = set()
    for concept in concepts:
        linked_notes = [
            {'id': document.id, 'title': document.title}
            for document in documents
            if matches_concept(document.title, concept.name) or matches_concept(document.content, concept.name)
        ]
        linked_cards = [
            {'id': card.id, 'front': card.front}
            for card in flashcards
            if matches_concept(card.front, concept.name) or matches_concept(card.back, concept.name) or matches_concept(card.subject, concept.name)
        ]
        linked_tasks = [
            {'id': task.id, 'title': task.title, 'status': task.status}
            for task in tasks
            if matches_concept(task.title, concept.name) or matches_concept(task.description, concept.name) or matches_concept(task.subject, concept.name)
        ]
        completed_tasks = sum(task['status'] == 'done' for task in linked_tasks)
        mastery = min(100, len(linked_notes) * 22 + len(linked_cards) * 10 + completed_tasks * 25)
        concept_id = f'concept:{concept.id}'
        nodes.append({
            'id': concept_id,
            'entity_id': concept.id,
            'node_type': 'concept',
            'label': concept.name,
            'description': concept.description,
            'category': concept.category,
            'mastery': mastery,
            'linked_notes': linked_notes,
            'linked_flashcards': linked_cards,
            'linked_tasks': linked_tasks,
        })
        for note in linked_notes:
            artifact_id = f'note:{note["id"]}'
            if artifact_id not in seen_artifacts:
                seen_artifacts.add(artifact_id)
                nodes.append({'id': artifact_id, 'entity_id': note['id'], 'node_type': 'note', 'label': note['title'], 'description': 'Workspace note', 'category': 'Notes', 'mastery': 0, 'linked_notes': [], 'linked_flashcards': [], 'linked_tasks': []})
            edges.append({'id': f'{concept_id}-{artifact_id}', 'source': concept_id, 'target': artifact_id, 'relationship_type': 'note'})
        for card in linked_cards:
            artifact_id = f'flashcard:{card["id"]}'
            if artifact_id not in seen_artifacts:
                seen_artifacts.add(artifact_id)
                nodes.append({'id': artifact_id, 'entity_id': card['id'], 'node_type': 'flashcard', 'label': card['front'], 'description': 'Linked flashcard', 'category': 'Flashcards', 'mastery': 0, 'linked_notes': [], 'linked_flashcards': [], 'linked_tasks': []})
            edges.append({'id': f'{concept_id}-{artifact_id}', 'source': concept_id, 'target': artifact_id, 'relationship_type': 'flashcard'})
        for task in linked_tasks:
            artifact_id = f'task:{task["id"]}'
            if artifact_id not in seen_artifacts:
                seen_artifacts.add(artifact_id)
                nodes.append({'id': artifact_id, 'entity_id': task['id'], 'node_type': 'task', 'label': task['title'], 'description': f"Task status: {task['status']}", 'category': 'Tasks', 'mastery': 0, 'linked_notes': [], 'linked_flashcards': [], 'linked_tasks': []})
            edges.append({'id': f'{concept_id}-{artifact_id}', 'source': concept_id, 'target': artifact_id, 'relationship_type': 'task'})

    edges.extend({
        'id': f'concept:{relationship.source_id}-concept:{relationship.target_id}-{relationship.id}',
        'source': f'concept:{relationship.source_id}',
        'target': f'concept:{relationship.target_id}',
        'relationship_type': relationship.relationship_type,
    } for relationship in relationships)
    return {'nodes': nodes, 'edges': edges, 'categories': sorted({node['category'] for node in nodes})}


@router.post('/knowledge-graph/relationships', status_code=201)
async def create_concept_relationship(payload: ConceptRelationshipCreate, db: AsyncSession = Depends(get_db)):
    """Create an account-scoped connection between two concepts."""
    if payload.source_id == payload.target_id:
        raise HTTPException(status_code=422, detail='Choose two different concepts to create a connection.')
    source = await db.get(Concept, payload.source_id)
    target = await db.get(Concept, payload.target_id)
    if not source or not target or source.user_id != payload.user_id or target.user_id != payload.user_id:
        raise HTTPException(status_code=404, detail='Both concepts must belong to your account.')
    relationship_type = payload.relationship_type.strip()
    existing = (await db.execute(
        select(ConceptRelationship).where(
            ConceptRelationship.source_id == payload.source_id,
            ConceptRelationship.target_id == payload.target_id,
            ConceptRelationship.relationship_type == relationship_type,
        )
    )).scalars().first()
    if existing:
        return {'id': existing.id, 'source': existing.source_id, 'target': existing.target_id, 'relationship_type': existing.relationship_type}
    relationship = ConceptRelationship(source_id=payload.source_id, target_id=payload.target_id, relationship_type=relationship_type)
    db.add(relationship)
    await db.commit()
    await db.refresh(relationship)
    return {'id': relationship.id, 'source': relationship.source_id, 'target': relationship.target_id, 'relationship_type': relationship.relationship_type}


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

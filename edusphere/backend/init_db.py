import asyncio
from app.core.database import Base, engine
from app.models.user import Role, User


async def recreate_tables():
  async with engine.begin() as conn:
    print('Saari purani tables CASCADE ke sath delete ho rahi hain...')
    # PostgreSQL ke liye CASCADE use karke saari dependent tables drop kar rahe hain
    await conn.execute(
        __import__('sqlalchemy').text(
            'DROP TABLE IF EXISTS classroom_messages, quiz_attempts,'
            ' flashcards, concepts, quizzes, study_sessions, calendar_events,'
            ' study_tasks, documents, user_profiles, classrooms, workspaces,'
            ' users, roles CASCADE;'
        )
    )

    print('Nayi tables columns ke sath ban rahi hain...')
    await conn.run_sync(Base.metadata.create_all)

  print('Database successfully update aur recreate ho gaya hai!')


if __name__ == '__main__':
  asyncio.run(recreate_tables())
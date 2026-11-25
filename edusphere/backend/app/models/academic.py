# app/models/academic.py
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import get_ist_time

# 1. CLASSROOMS TABLE
class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g., "B.Tech CS 3rd Year"
    section = Column(String, nullable=True) # e.g., "Section A"
    class_code = Column(String(6), unique=True, index=True, nullable=False)
    
    # Ek teacher (user) is classroom ko banayega/manage karega
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=get_ist_time)

    # Relationship: Ek classroom mein bohot saare courses ho sakte hain
    courses = relationship("Course", back_populates="classroom")
    members = relationship("ClassroomMember", back_populates="classroom", cascade="all, delete-orphan")


class ClassroomMember(Base):
    """Classroom-scoped memberships; this never changes a user's global role."""
    __tablename__ = "classroom_members"
    __table_args__ = (UniqueConstraint("classroom_id", "user_id", name="uq_classroom_member"),)

    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="student")
    joined_at = Column(DateTime, default=get_ist_time, nullable=False)

    classroom = relationship("Classroom", back_populates="members")


# 2. COURSES TABLE
class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True) # e.g., "Data Structures", "Networking"
    description = Column(String, nullable=True)
    
    # Yeh course kis classroom ka hissa hai
    classroom_id = Column(Integer, ForeignKey("classrooms.id"))
    created_at = Column(DateTime, default=get_ist_time)

    # Relationship setup
    classroom = relationship("Classroom", back_populates="courses")

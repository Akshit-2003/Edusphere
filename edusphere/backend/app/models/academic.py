# app/models/academic.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import get_ist_time

# 1. CLASSROOMS TABLE
class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g., "B.Tech CS 3rd Year"
    section = Column(String, nullable=True) # e.g., "Section A"
    
    # Ek teacher (user) is classroom ko banayega/manage karega
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=get_ist_time)

    # Relationship: Ek classroom mein bohot saare courses ho sakte hain
    courses = relationship("Course", back_populates="classroom")


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
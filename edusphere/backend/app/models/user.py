from datetime import datetime
from app.core.database import Base  # <-- Yahan import path change hua hai
import pytz
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


def get_ist_time():
  return datetime.now(pytz.timezone('Asia/Kolkata')).replace(tzinfo=None)


class Role(Base):
  __tablename__ = 'roles'

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, unique=True, index=True)
  users = relationship('User', back_populates='role')


class User(Base):
  __tablename__ = 'users'

  id = Column(Integer, primary_key=True, index=True)
  full_name = Column(String, index=True)
  email = Column(String, unique=True, index=True)
  hashed_password = Column(String)
  is_active = Column(Boolean, default=True)

  role_id = Column(Integer, ForeignKey('roles.id'))
  created_at = Column(DateTime, default=get_ist_time)

  # 👇 Yeh do naye columns add kar diye gaye hain:
  reset_token = Column(String, nullable=True)
  reset_token_expiry = Column(DateTime, nullable=True)
  email_verified = Column(Boolean, default=False, nullable=False)
  verification_otp_hash = Column(String, nullable=True)
  verification_otp_expiry = Column(DateTime, nullable=True)
  verification_otp_sent_at = Column(DateTime, nullable=True)
  verification_otp_attempts = Column(Integer, default=0, nullable=False)

  role = relationship('Role', back_populates='users')

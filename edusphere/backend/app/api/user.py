import asyncio
from datetime import datetime, timedelta
from email.message import EmailMessage
import hashlib
import hmac
import logging
import os
import secrets
import smtplib
from app.core.email import send_otp_email
from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.models.user import Role, User
from app.schemas.user import (
    ForgotPasswordRequest,  # Yeh schema aapko schemas/user.py mein add karna hoga
    EmailVerificationOtpRequest,
    EmailVerificationRequest,
    LoginRequest,
    PasswordUpdateRequest,
    ResetPasswordRequest,  # Yeh schema bhi add karna hoga
    RoleCreate,
    RoleResponse,
    SignupRequest,
    UserCreate,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)
OTP_LIFETIME_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

# Password Encrypt karne ka setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
  return pwd_context.hash(password)


def hash_otp(code: str) -> str:
  return hashlib.sha256(code.encode("utf-8")).hexdigest()

def send_otp_email_sync(recipient: str, code: str) -> str:
    """Deliver by SMTP when configured; falls back to console log if SMTP authentication fails."""
    host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER") or os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")

    if not host or not smtp_user or not password:
        logger.warning("SMTP is not fully configured. Development OTP for %s: %s", recipient, code)
        return "console"

    try:
        message = EmailMessage()
        message["Subject"] = "Your EduSphere verification code"
        from_name = os.getenv("EMAILS_FROM_NAME", "EduSphere")
        message["From"] = f"{from_name} <{smtp_user}>"
        message["To"] = recipient
        message.set_content(
            f"Your EduSphere verification code is {code}. It expires in {OTP_LIFETIME_MINUTES} minutes. "
            "Do not share this code with anyone."
        )
        
        port = int(os.getenv("SMTP_PORT", "587"))
        use_tls = os.getenv("SMTP_USE_TLS", "true").lower() not in {"0", "false", "no"}

        with smtplib.SMTP(host, port, timeout=15) as client:
            if use_tls:
                client.starttls()
            client.login(smtp_user, password)
            client.send_message(message)
        return "email"
    except Exception as e:
        # SMTP fail hone par code crash nahi hoga, terminal par OTP mil jayega!
        logger.error(f"SMTP Error: {e}. Falling back to console OTP.")
        print(f"\n==================== [FALLBACK OTP] ====================")
        print(f"To: {recipient} | Code: {code}")
        print(f"=======================================================\n")
        return "console"


async def issue_verification_otp(user: User, db: AsyncSession, *, enforce_cooldown: bool = True) -> str:
  now = datetime.utcnow()
  if (
      enforce_cooldown
      and user.verification_otp_sent_at
      and (now - user.verification_otp_sent_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS
  ):
    raise HTTPException(
        status_code=429,
        detail=f"Please wait {OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another code.",
    )

  code = f"{secrets.randbelow(1_000_000):06d}"
  try:
    delivery = await asyncio.to_thread(send_otp_email_sync, user.email, code)
  except Exception as error:
    logger.exception("Could not send verification email for %s", user.id)
    raise HTTPException(status_code=503, detail="Unable to send the verification code. Please try again later.") from error

  user.verification_otp_hash = hash_otp(code)
  user.verification_otp_expiry = now + timedelta(minutes=OTP_LIFETIME_MINUTES)
  user.verification_otp_sent_at = now
  user.verification_otp_attempts = 0
  await db.commit()
  return delivery


async def get_or_create_role(name: str, db: AsyncSession) -> Role:
  result = await db.execute(select(Role).where(Role.name == name))
  role = result.scalars().first()
  if role:
    return role
  role = Role(name=name)
  db.add(role)
  await db.flush()
  return role


# --- ROLES APIS ---
@router.post("/roles/", response_model=RoleResponse)
async def create_role(role: RoleCreate, db: AsyncSession = Depends(get_db)):
  new_role = Role(name=role.name)
  db.add(new_role)
  await db.commit()
  await db.refresh(new_role)
  return new_role


@router.get("/roles/")
async def get_roles(db: AsyncSession = Depends(get_db)):
  result = await db.execute(select(Role))
  return result.scalars().all()


# --- USERS APIS ---
@router.post("/users/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
  result = await db.execute(select(User).where(User.email == user.email))
  existing_user = result.scalars().first()

  if existing_user:
    raise HTTPException(status_code=400, detail="Yeh email already registered hai!")

  hashed_pwd = get_password_hash(user.password)

  new_user = User(
      full_name=user.full_name,
      email=user.email,
      hashed_password=hashed_pwd,
      role_id=user.role_id,
      email_verified=False,
  )

  db.add(new_user)
  await db.commit()
  await db.refresh(new_user)

  return new_user

@router.post("/signup", status_code=201)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )

    role = await get_or_create_role(payload.role.title(), db)
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role_id=role.id,
        email_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # OTP generate karwao
    await issue_verification_otp(user, db, enforce_cooldown=False)
    
    # User object mat bhejo, sirf message bhejo taaki frontend verify page par le jaye
    return {
        "message": "Account created successfully. Please verify your email.",
        "email": user.email
    }


@router.post("/login", response_model=UserResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
  result = await db.execute(select(User).where(User.email == payload.email))
  user = result.scalars().first()
  if not user or not pwd_context.verify(payload.password, user.hashed_password):
    raise HTTPException(status_code=401, detail="Invalid email or password.")
  if not user.is_active:
    raise HTTPException(status_code=403, detail="This account is inactive.")
  if not user.email_verified:
    raise HTTPException(status_code=403, detail="Please verify your email address with the OTP we sent.")
  return user

# --- CURRENT USER / DASHBOARD PROFILE API ---


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    email: str, db: AsyncSession = Depends(get_db)
):
  # Filhal email ke base par user fetch kar rahe hain (baad mein isme JWT Token authentication laga lenge)
  result = await db.execute(select(User).where(User.email == email))
  user = result.scalars().first()
  if not user:
    raise HTTPException(status_code=404, detail="User nahi mila.")
  return user


@router.put("/users/{user_id}/password")
async def update_password(
    user_id: int, payload: PasswordUpdateRequest, db: AsyncSession = Depends(get_db)
):
  user = await db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found.")
  if not pwd_context.verify(payload.current_password, user.hashed_password):
    raise HTTPException(status_code=400, detail="Your current password is incorrect.")
  if pwd_context.verify(payload.new_password, user.hashed_password):
    raise HTTPException(status_code=400, detail="Choose a password that is different from your current password.")

  user.hashed_password = get_password_hash(payload.new_password)
  await db.commit()
  return {"message": "Password updated successfully."}

@router.post("/email-verification/resend")
async def resend_email_verification_otp(
    payload: EmailVerificationRequest, db: AsyncSession = Depends(get_db)
):
    print(f"DEBUG RESEND -> Request aayi hai email ke liye: {payload.email}")
    
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    
    if not user:
        print("DEBUG RESEND -> User database mein nahi mila!")
        raise HTTPException(status_code=404, detail="User not found.")
        
    print(f"DEBUG RESEND -> User mil gaya. Email verified status: {user.email_verified}")

    if user.email_verified:
        return {"message": "Email is already verified.", "delivery": "none"}

    delivery = await issue_verification_otp(user, db)
    print(f"DEBUG RESEND -> New OTP generated and delivered via: {delivery}")
    
    return {"message": "Verification code sent. It expires in 10 minutes.", "delivery": delivery}

@router.post("/email-verification/verify")
async def verify_email_otp(
    payload: EmailVerificationOtpRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    
    if user.email_verified:
        return {"message": "Email already verified. Please log in."}
        
    if not user.verification_otp_hash or not user.verification_otp_expiry:
        raise HTTPException(status_code=400, detail="Request a new verification code first.")
    if user.verification_otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This verification code has expired. Request a new one.")
    if user.verification_otp_attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Request a new verification code.")
    if not hmac.compare_digest(user.verification_otp_hash, hash_otp(payload.code)):
        user.verification_otp_attempts += 1
        await db.commit()
        remaining = OTP_MAX_ATTEMPTS - user.verification_otp_attempts
        raise HTTPException(status_code=400, detail=f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")

    # Mark as verified, clear OTP fields, but DO NOT return the user object (so it doesn't auto-login)
    user.email_verified = True
    user.verification_otp_hash = None
    user.verification_otp_expiry = None
    user.verification_otp_sent_at = None
    user.verification_otp_attempts = 0
    await db.commit()

    return {"message": "Email verified successfully! Please log in to your account."}

# --- FORGOT & RESET PASSWORD APIS (ASYNC FIXED) ---


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
  result = await db.execute(select(User).where(User.email == payload.email))
  user = result.scalars().first()

  if not user:
    return {
        "message": (
            "Agar yeh email registered hai, toh reset instructions bhej di"
            " gayi hain."
        )
    }

  # Secure token generate karein
  token = secrets.token_urlsafe(32)
  user.reset_token = token
  user.reset_token_expiry = datetime.utcnow() + timedelta(minutes=15)
  await db.commit()

  print(f"Reset Link Token for {user.email}: {token}")
  return {
      "message": "Password reset instructions sent to email.",
      "token": token,
  }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
  result = await db.execute(
      select(User).where(User.reset_token == payload.token)
  )
  user = result.scalars().first()

  if (
      not user
      or not user.reset_token_expiry
      or user.reset_token_expiry < datetime.utcnow()
  ):
    raise HTTPException(
        status_code=400, detail="Invalid or expired password reset token"
    )

  user.hashed_password = get_password_hash(payload.new_password)
  user.reset_token = None
  user.reset_token_expiry = None
  await db.commit()

  return {"message": "Password successfully reset ho gaya hai."}

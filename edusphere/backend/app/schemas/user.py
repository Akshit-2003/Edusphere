from pydantic import BaseModel, Field, field_validator


def validate_email(value: str) -> str:
  normalized = value.strip().lower()
  if (
      "@" not in normalized
      or normalized.startswith("@")
      or normalized.endswith("@")
  ):
    raise ValueError("Please provide a valid email address.")
  return normalized


# Yeh check karega ki naya Role banate waqt frontend ne 'name' bheja ya nahi
class RoleCreate(BaseModel):
  name: str


# Yeh decide karega ki database se wapas kya data bhejna hai
class RoleResponse(BaseModel):
  id: int
  name: str

  class Config:
    from_attributes = True


class UserCreate(BaseModel):
  full_name: str
  email: str
  password: str = Field(min_length=8)
  role_id: int  # User kaunsa role select kar raha hai (e.g., 1 for Student)

  _validate_email = field_validator("email")(validate_email)


class SignupRequest(BaseModel):
  full_name: str = Field(min_length=2, max_length=120)
  email: str
  password: str = Field(min_length=8)
  role: str = Field(pattern="^(student|teacher)$")

  _validate_email = field_validator("email")(validate_email)


class LoginRequest(BaseModel):
  email: str
  password: str

  _validate_email = field_validator("email")(validate_email)


class UserResponse(BaseModel):
  id: int
  full_name: str
  email: str
  is_active: bool
  email_verified: bool
  role_id: int

  class Config:
    from_attributes = True


# --- FORGOT & RESET PASSWORD SCHEMAS ---
class ForgotPasswordRequest(BaseModel):
  email: str
  _validate_email = field_validator("email")(validate_email)


class ResetPasswordRequest(BaseModel):
  token: str
  new_password: str = Field(min_length=8)


class PasswordUpdateRequest(BaseModel):
  current_password: str
  new_password: str = Field(min_length=8)


class EmailVerificationRequest(BaseModel):
  email: str
  _validate_email = field_validator("email")(validate_email)


class EmailVerificationOtpRequest(EmailVerificationRequest):
  code: str = Field(pattern=r"^\d{6}$")

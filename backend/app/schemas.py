from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class SessionCreateRequest(BaseModel):
    mode: str = Field(min_length=2, max_length=64)
    audio_type: str = Field(min_length=2, max_length=64)
    bpm: float = 0.0
    peak_count: int = 0
    duration_seconds: float = 0.0
    mood: str | None = Field(None, min_length=2, max_length=64)
    started_at: datetime | None = None
    notes: str | None = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    mode: str
    audio_type: str
    bpm: float
    peak_count: int
    duration_seconds: float
    mood: str | None
    started_at: datetime
    notes: str | None


class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    preferred_mode: str
    color_theme: str


class SessionStatsResponse(BaseModel):
    total_sessions: int
    avg_bpm: float
    avg_peak_count: float
    avg_duration_seconds: float
    most_common_mood: str | None
    most_common_audio_type: str | None
    most_common_mode: str | None


class SettingsUpdateRequest(BaseModel):
    preferred_mode: str = Field(min_length=2, max_length=64)
    color_theme: str = Field(min_length=2, max_length=64)

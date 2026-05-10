from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.metrics import AUDIO_ANALYSIS_EVENTS
from app.models import Session, User
from app.schemas import SessionCreateRequest, SessionResponse, SessionStatsResponse

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionResponse:
    started_at = payload.started_at or datetime.now(UTC)
    session = Session(
        user_id=user.id,
        mode=payload.mode,
        audio_type=payload.audio_type,
        bpm=payload.bpm,
        peak_count=payload.peak_count,
        duration_seconds=payload.duration_seconds,
        mood=payload.mood,
        started_at=started_at,
        notes=payload.notes,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    AUDIO_ANALYSIS_EVENTS.labels(event_type=payload.mode).inc()
    return SessionResponse.model_validate(session)


@router.get("/stats", response_model=SessionStatsResponse)
async def get_session_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SessionStatsResponse:
    result = await db.execute(
        select(Session).where(Session.user_id == user.id)
    )
    sessions = result.scalars().all()
    
    if not sessions:
        return SessionStatsResponse(
            total_sessions=0,
            avg_bpm=0.0,
            avg_peak_count=0.0,
            avg_duration_seconds=0.0,
            most_common_mood=None,
            most_common_audio_type=None,
            most_common_mode=None,
        )
    
    avg_bpm = sum(s.bpm for s in sessions) / len(sessions)
    avg_peak_count = sum(s.peak_count for s in sessions) / len(sessions)
    avg_duration_seconds = sum(s.duration_seconds for s in sessions) / len(sessions)
    
    # Find most common values
    moods = [s.mood for s in sessions if s.mood]
    audio_types = [s.audio_type for s in sessions]
    modes = [s.mode for s in sessions]
    
    most_common_mood = max(set(moods), key=moods.count) if moods else None
    most_common_audio_type = max(set(audio_types), key=audio_types.count) if audio_types else None
    most_common_mode = max(set(modes), key=modes.count) if modes else None
    
    return SessionStatsResponse(
        total_sessions=len(sessions),
        avg_bpm=round(avg_bpm, 2),
        avg_peak_count=round(avg_peak_count, 2),
        avg_duration_seconds=round(avg_duration_seconds, 2),
        most_common_mood=most_common_mood,
        most_common_audio_type=most_common_audio_type,
        most_common_mode=most_common_mode,
    )


@router.get("", response_model=list[SessionResponse])
async def get_user_sessions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SessionResponse]:
    result = await db.execute(
        select(Session).where(Session.user_id == user.id).order_by(desc(Session.started_at)).limit(100)
    )
    sessions = result.scalars().all()
    return [SessionResponse.model_validate(item) for item in sessions]

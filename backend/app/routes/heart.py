from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.heart import Heart, MAX_HEARTS, HEART_REGEN_HOURS
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/hearts", tags=["hearts"])


class HeartSchema(BaseModel):
    user_id: int
    heart_count: int
    seconds_until_next_heart: int | None = None

    class Config:
        from_attributes = True


def _apply_passive_regen(heart: Heart) -> None:
    """
    رشد زمانی غیرفعال: هر HEART_REGEN_HOURS ساعت، یک قلب اضافه میشه
    تا سقف MAX_HEARTS. این تابع فقط heart_count و last_heart_update رو
    آپدیت می‌کنه، commit با caller هست.
    """
    if heart.heart_count >= MAX_HEARTS:
        heart.last_heart_update = None
        return

    now = datetime.now(timezone.utc)

    if heart.last_heart_update is None:
        # اولین باریه که قلب کم شده، از همین لحظه شمارش شروع میشه
        heart.last_heart_update = now
        return

    elapsed = now - heart.last_heart_update
    regen_interval = timedelta(hours=HEART_REGEN_HOURS)

    if elapsed < regen_interval:
        return

    hearts_to_add = int(elapsed / regen_interval)
    heart.heart_count = min(MAX_HEARTS, heart.heart_count + hearts_to_add)

    if heart.heart_count >= MAX_HEARTS:
        heart.last_heart_update = None
    else:
        # باقیمانده‌ی زمان رو نگه می‌داریم تا شمارش از صفر شروع نشه
        heart.last_heart_update = now - (elapsed % regen_interval)


def _seconds_until_next_heart(heart: Heart) -> int | None:
    if heart.heart_count >= MAX_HEARTS or heart.last_heart_update is None:
        return None

    regen_interval = timedelta(hours=HEART_REGEN_HOURS)
    elapsed = datetime.now(timezone.utc) - heart.last_heart_update
    remaining = regen_interval - elapsed

    return max(0, int(remaining.total_seconds()))


def _get_or_create_heart(db: Session, user_id: int) -> Heart:
    heart = db.query(Heart).filter(Heart.user_id == user_id).first()
    if not heart:
        heart = Heart(user_id=user_id, heart_count=MAX_HEARTS)
        db.add(heart)
        db.commit()
        db.refresh(heart)
    return heart


@router.get("/me", response_model=HeartSchema)
def get_my_hearts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    heart = _get_or_create_heart(db, current_user.id)

    _apply_passive_regen(heart)
    db.commit()
    db.refresh(heart)

    return HeartSchema(
        user_id=heart.user_id,
        heart_count=heart.heart_count,
        seconds_until_next_heart=_seconds_until_next_heart(heart)
    )


@router.post("/decrease")
def decrease_heart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    heart = _get_or_create_heart(db, current_user.id)
    _apply_passive_regen(heart)

    if heart.heart_count <= 0:
        db.commit()
        raise HTTPException(status_code=400, detail="No hearts left")

    heart.heart_count -= 1

    # اگه این اولین قلبیه که از سقف کم میشه، شمارش رشد زمانی رو شروع کن
    if heart.last_heart_update is None:
        heart.last_heart_update = datetime.now(timezone.utc)

    db.commit()
    db.refresh(heart)

    return {
        "message": "Heart decreased",
        "remaining": heart.heart_count,
        "seconds_until_next_heart": _seconds_until_next_heart(heart)
    }
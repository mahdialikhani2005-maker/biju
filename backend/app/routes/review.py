import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.word import LearnedWord, Word
from app.models.heart import Heart, MAX_HEARTS, REVIEW_REWARD_HOURS
from app.models.user import User
from app.core.deps import get_current_user
from app.routes.heart import _get_or_create_heart, _apply_passive_regen

router = APIRouter(prefix="/review", tags=["review"])

REVIEW_BATCH_SIZE = 20


class ReviewWordOut(BaseModel):
    word_id: int
    term: str
    translation: str


class ReviewSubmitRequest(BaseModel):
    word_ids: list[int]  # کلماتی که تو این بچ مرور شدن (درست یا غلط فرقی نداره)


@router.get("/words", response_model=list[ReviewWordOut])
def get_review_words(
    course_slug: str,
    count: int = REVIEW_BATCH_SIZE,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    learned = (
        db.query(LearnedWord)
        .join(Word, Word.id == LearnedWord.word_id)
        .filter(
            LearnedWord.user_id == current_user.id,
            Word.course_slug == course_slug
        )
        .all()
    )

    if not learned:
        return []

    # اولویت با کلماتی که یا هنوز مرور نشدن یا دیرتر مرور شدن
    # (never-reviewed اول، بعد قدیمی‌ترین last_reviewed_at)
    def sort_key(lw: LearnedWord):
        return (lw.last_reviewed_at is not None, lw.last_reviewed_at or datetime.min)

    learned_sorted = sorted(learned, key=sort_key)

    # از بین N تا "نیازمندترین" کلمه، رندوم انتخاب می‌کنیم تا هم اولویت
    # رعایت بشه هم هر بار دقیقاً یک ترتیب ثابت نباشه
    pool_size = min(len(learned_sorted), max(count * 2, count))
    pool = learned_sorted[:pool_size]

    chosen = random.sample(pool, k=min(count, len(pool)))

    word_ids = [lw.word_id for lw in chosen]
    words = db.query(Word).filter(Word.id.in_(word_ids)).all()
    words_by_id = {w.id: w for w in words}

    return [
        ReviewWordOut(
            word_id=w.id,
            term=w.term,
            translation=w.translation
        )
        for w in (words_by_id[wid] for wid in word_ids if wid in words_by_id)
    ]


@router.post("/submit")
def submit_review(
    data: ReviewSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)

    # آپدیت آمار مرور برای هر کلمه (جواب غلط هم باشه، مرور شدن ثبت میشه؛
    # قلب هیچ‌وقت اینجا کم نمیشه)
    (
        db.query(LearnedWord)
        .filter(
            LearnedWord.user_id == current_user.id,
            LearnedWord.word_id.in_(data.word_ids)
        )
        .update(
            {
                LearnedWord.last_reviewed_at: now,
                LearnedWord.review_count: LearnedWord.review_count + 1
            },
            synchronize_session=False
        )
    )

    heart = _get_or_create_heart(db, current_user.id)
    _apply_passive_regen(heart)

    hearts_earned = 0
    reward_interval = timedelta(hours=REVIEW_REWARD_HOURS)

    can_earn = (
        heart.last_review_reward_at is None
        or (now - heart.last_review_reward_at) >= reward_interval
    )

    if can_earn and len(data.word_ids) >= REVIEW_BATCH_SIZE:
        if heart.heart_count < MAX_HEARTS:
            heart.heart_count += 1
        heart.last_review_reward_at = now
        hearts_earned = 1

    db.commit()
    db.refresh(heart)

    return {
        "hearts_earned": hearts_earned,
        "heart_count": heart.heart_count
    }


@router.get("/status")
def review_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    heart = _get_or_create_heart(db, current_user.id)
    reward_interval = timedelta(hours=REVIEW_REWARD_HOURS)

    if heart.last_review_reward_at is None:
        return {"can_earn_heart": True, "seconds_until_next_reward": 0}

    elapsed = datetime.now(timezone.utc) - heart.last_review_reward_at
    remaining = reward_interval - elapsed

    if remaining.total_seconds() <= 0:
        return {"can_earn_heart": True, "seconds_until_next_reward": 0}

    return {
        "can_earn_heart": False,
        "seconds_until_next_reward": int(remaining.total_seconds())
    }
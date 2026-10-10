from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.progress import Progress
from app.models.word import LearnedWord, Word
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


class XPRequest(BaseModel):
    lesson_slug: str
    amount: int


@router.post("/xp")
def add_xp(
    data: XPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.lesson_slug == data.lesson_slug
    ).first()

    if not progress:
        progress = Progress(
            user_id=current_user.id,
            lesson_slug=data.lesson_slug,
            xp=0,
            score=0,
            status="in_progress"
        )
        db.add(progress)

    progress.xp += data.amount

    db.commit()
    db.refresh(progress)

    return {"xp": progress.xp}


# مجموع XP کاربر از تمام درس‌ها با هم (برای نمایش بالای صفحه)
@router.get("/xp/total")
def get_total_xp(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(func.sum(Progress.xp)).filter(
        Progress.user_id == current_user.id
    ).scalar()

    return {"total_xp": total or 0}


class WordIn(BaseModel):
    term: str
    translation: str


class LessonCompleteRequest(BaseModel):
    course_slug: str
    lesson_slug: str
    words: list[WordIn] = []  # کلماتی که تو این درس (از intro.js) معرفی شدن


# مارک کردن یک درس به عنوان تموم‌شده + ثبت کلمات یادگرفته‌شده برای مرور.
# کلمات نیازی به seed از قبل ندارن: همینجا اگه وجود نداشته باشن ساخته میشن
# (upsert روی course_slug+term)، بعد به‌عنوان یادگرفته‌ی کاربر ثبت میشن.
@router.post("/lesson-complete")
def complete_lesson(
    data: LessonCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.lesson_slug == data.lesson_slug
    ).first()

    if not progress:
        progress = Progress(
            user_id=current_user.id,
            lesson_slug=data.lesson_slug,
            xp=0,
            score=0,
            status="completed"
        )
        db.add(progress)
    else:
        progress.status = "completed"

    new_words_count = 0

    for w in data.words:
        word = db.query(Word).filter(
            Word.course_slug == data.course_slug,
            Word.term == w.term
        ).first()

        if not word:
            word = Word(
                course_slug=data.course_slug,
                term=w.term,
                translation=w.translation
            )
            db.add(word)
            db.flush()  # تا word.id قبل از commit در دسترس باشه

        already_learned = db.query(LearnedWord).filter(
            LearnedWord.user_id == current_user.id,
            LearnedWord.word_id == word.id
        ).first()

        if not already_learned:
            db.add(LearnedWord(user_id=current_user.id, word_id=word.id))
            new_words_count += 1

    db.commit()
    db.refresh(progress)

    return {
        "status": progress.status,
        "new_words_learned": new_words_count
    }
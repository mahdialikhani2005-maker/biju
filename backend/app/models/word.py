from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Word(Base):
    """
    بانک کلمات. هر کلمه به یک دوره (course_slug) و اختیاراً یک درس خاص
    وصل میشه. این جدول مستقل از کاربره - یعنی برای همه‌ی کاربرها مشترکه.
    """
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)

    course_slug = Column(String(50), nullable=False, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)

    term = Column(String(255), nullable=False)
    translation = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("course_slug", "term", name="uq_course_term"),
    )


class LearnedWord(Base):
    """
    رابطه‌ی کاربر <-> کلمه‌ای که یاد گرفته. هسته‌ی اصلی سیستم مرور.
    هر (user_id, word_id) فقط یک بار ثبت میشه (idempotent).
    """
    __tablename__ = "learned_words"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    word_id = Column(Integer, ForeignKey("words.id"), nullable=False)

    learned_at = Column(DateTime(timezone=True), server_default=func.now())

    # برای اولویت‌بندی مرور: کلماتی که دیرتر مرور شدن یا کمتر مرور شدن
    # اولویت بالاتری برای انتخاب رندوم بعدی دارن
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_count = Column(Integer, default=0, nullable=False)

    word = relationship("Word")

    __table_args__ = (
        UniqueConstraint("user_id", "word_id", name="uq_user_word"),
    )
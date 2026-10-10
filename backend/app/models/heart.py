from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

# ثابت‌های سیستم قلب
MAX_HEARTS = 5
HEART_REGEN_HOURS = 4          # رشد زمانی غیرفعال (مثل دوولینگو)
REVIEW_REWARD_HOURS = 12       # فاصله‌ی لازم بین دو جایزه‌ی قلب از طریق مرور


class Heart(Base):
    __tablename__ = "hearts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    heart_count = Column(Integer, default=5, nullable=False)

    # آخرین باری که رشد زمانیِ غیرفعال (passive regen) قلب رو محاسبه کردیم
    last_heart_update = Column(DateTime(timezone=True), nullable=True)

    # آخرین باری که کاربر از طریق مرور، یک قلب هدیه گرفت
    last_review_reward_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    user = relationship("User", back_populates="heart")
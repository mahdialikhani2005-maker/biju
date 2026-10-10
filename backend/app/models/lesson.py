from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)

    # مال کدوم دوره است: "english", "french", "german", ...
    # قبلاً این فیلد وجود نداشت و لازم بود اضافه بشه
    course_slug = Column(String(50), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
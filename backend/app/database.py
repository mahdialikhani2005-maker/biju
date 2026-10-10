from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# قبلاً اینجا "sqlite:///./app.db" هارد-کد شده بود و اصلاً settings.DATABASE_URL
# خونده نمی‌شد. رو Render (پلن رایگان)، دیسک سرور بین ری‌استارت‌ها/دیپلوی‌ها
# پاک میشه، پس هر بار سرور می‌خوابید/بیدار می‌شد، این فایل SQLite از صفر
# ساخته می‌شد و همه‌ی کاربرها (و توکن‌هایی که گوشی نگه داشته بود) نامعتبر
# می‌شدن -> همون ۴۰۱ که می‌دیدیم.
DATABASE_URL = settings.DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # این آرگومان فقط برای SQLite لازمه (برای تست لوکال)
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
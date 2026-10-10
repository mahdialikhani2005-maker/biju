# وارد کردن کلاس‌های لازم از کتابخانه pydantic_settings
from pydantic_settings import BaseSettings, SettingsConfigDict


# تعریف کلاس تنظیمات برنامه که از BaseSettings ارث می‌برد
class Settings(BaseSettings):
    """
    کلاس تنظیمات برنامه که متغیرهای محیطی و فایل .env را بارگذاری می‌کند.
    """

    # تنظیمات پایه‌ای برنامه
    APP_NAME: str = "LangApp Backend"  # نام برنامه
    APP_ENV: str = "development"      # محیط اجرای برنامه (e.g., development, production, staging)
    DEBUG: bool = True                # فعال/غیرفعال کردن حالت دیباگ

    # تنظیمات اتصال به دیتابیس (این مقدار باید از طریق متغیر محیطی یا فایل .env تامین شود)
    DATABASE_URL: str

    # تنظیمات مربوط به توکن JWT
    JWT_SECRET_KEY: str               # کلید مخفی برای امضای توکن JWT
    JWT_ALGORITHM: str = "HS256"      # الگوریتم امضای توکن JWT
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # زمان انقضای توکن دسترسی (بر حسب دقیقه)

    # پیکربندی مدل تنظیمات
    # env_file=".env": مشخص می‌کند که تنظیمات باید از فایل .env بارگذاری شوند.
    # extra="ignore": نادیده گرفتن هرگونه متغیر اضافی در فایل .env یا متغیرهای محیطی که در کلاس تعریف نشده‌اند.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# ایجاد یک نمونه (instance) از کلاس Settings برای دسترسی به تنظیمات
settings = Settings()

# حالا می‌توانید به تنظیمات از طریق `settings.VARIABLE_NAME` دسترسی پیدا کنید.
# مثال: print(settings.DATABASE_URL)

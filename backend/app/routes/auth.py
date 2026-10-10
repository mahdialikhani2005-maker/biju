import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token


router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str
    username: str
    phone_number: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class GuestRequest(BaseModel):
    # شناسه‌ی گوشی (مثلاً Android ID) — اختیاریه چون کلاینت‌های قدیمی‌تر
    # ممکنه اصلاً نفرستنش؛ در اون صورت رفتار قبلی (guest تازه) ادامه پیدا می‌کنه
    device_id: str | None = None


def _issue_token_response(user: User, message: str) -> dict:
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "message": message,
        "access_token": access_token,
        "token_type": "bearer",
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role
    }


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً انتخاب شده است")

    existing_phone = db.query(User).filter(User.phone_number == data.phone_number).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="این شماره موبایل قبلاً ثبت شده است")

    try:
        new_user = User(
            full_name=data.full_name,
            username=data.username,
            phone_number=data.phone_number,
            password_hash=hash_password(data.password),
            role="user"
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return _issue_token_response(new_user, "registered")

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="خطا در ثبت اطلاعات")


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == data.username).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="نام کاربری یا رمز عبور اشتباه است")

    return _issue_token_response(user, "logged in")


# ساخت (یا برگردوندن) اکانت مهمان.
# اگه device_id فرستاده بشه و قبلاً یه guest با همین device_id ساخته شده
# باشه، همون کاربر قدیمی (با دل/XP واقعیش) برگردونده میشه — نه یه ۵-دل
# تازه. این جلوی سوءاستفاده‌ی «پاک کردن دیتای اپ = دل بی‌نهایت» رو می‌گیره.
@router.post("/guest")
def create_guest(data: GuestRequest | None = None, db: Session = Depends(get_db)):
    device_id = data.device_id if data else None

    if device_id:
        existing = db.query(User).filter(
            User.device_id == device_id,
            User.role == "guest"
        ).first()
        if existing:
            return _issue_token_response(existing, "guest resumed")

    guest_suffix = uuid.uuid4().hex[:10]

    new_user = User(
        full_name="کاربر مهمان",
        username=f"guest_{guest_suffix}",
        phone_number=f"guest_{guest_suffix}",
        password_hash=hash_password(uuid.uuid4().hex),  # رمز تصادفی، هیچ‌وقت به کاربر نشون داده نمیشه
        role="guest",
        device_id=device_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return _issue_token_response(new_user, "guest created")
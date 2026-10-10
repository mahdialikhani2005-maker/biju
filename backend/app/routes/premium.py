from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.premium import Premium
from app.core.deps import get_current_user

router = APIRouter(prefix="/premium", tags=["premium"])


PLANS = {
    "premium_30d": 30,
    "premium_90d": 90,
    "premium_180d": 180,
    "premium_365d": 365
}


class PremiumPurchaseRequest(BaseModel):
    plan: str


@router.post("/buy")
def buy_premium(
    data: PremiumPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # ------------------------------------------------------------
    # نکته‌ی مهم برای بعداً: اینجا هنوز پرداخت واقعی چک نمیشه.
    # وقتی درگاه پرداخت رو وصل کردی، این تابع باید فقط از طریق
    # callback/webhook تایید‌شده‌ی درگاه صدا زده بشه، نه مستقیم
    # از فرانت‌اند/اپ. الان فقط برای تسته.
    # ------------------------------------------------------------

    days = PLANS[data.plan]

    premium = db.query(Premium).filter(Premium.user_id == current_user.id).first()

    if not premium:
        premium = Premium(
            user_id=current_user.id,
            is_active=True,
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=days)
        )
        db.add(premium)

    else:
        premium.is_active = True
        premium.start_date = datetime.utcnow()
        premium.end_date = datetime.utcnow() + timedelta(days=days)

    db.commit()
    db.refresh(premium)

    return {
        "status": "premium activated",
        "expires_on": premium.end_date
    }
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine, Base

from app.models import user, heart, progress, premium, subscription, lesson, word

from app.routes import auth
from app.routes import progress as progress_routes
from app.routes import heart as heart_routes
from app.routes import premium as premium_routes
from app.routes import review as review_routes


# ساخت جداول دیتابیس
Base.metadata.create_all(bind=engine)


# مسیرها
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # E:\biju
FRONTEND_DIR = BASE_DIR / "frontend"


app = FastAPI(title="Language Learning App API", debug=True)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(progress_routes.router, prefix="/api")
app.include_router(heart_routes.router, prefix="/api")
app.include_router(premium_routes.router, prefix="/api")
app.include_router(review_routes.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


# mount فایل‌های فرانت‌اند
if FRONTEND_DIR.exists():
    app.mount("/Lessons", StaticFiles(directory=str(FRONTEND_DIR / "Lessons")), name="lessons")
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


# صفحه‌ی اصلی
@app.get("/")
async def serve_home():
    for name in ["index.html", "home.html"]:
        f = FRONTEND_DIR / name
        if f.exists():
            return FileResponse(str(f))
    return {"detail": "index.html not found"}


# فایل‌های ریشه‌ی frontend (html, js, css)
@app.get("/{file_name}")
async def serve_root(file_name: str):
    f = FRONTEND_DIR / file_name
    if f.exists():
        return FileResponse(str(f))
    return {"detail": "Not Found"}


# فایل‌های داخل پوشه‌های frontend
@app.get("/{folder}/{file_path:path}")
async def serve_folder(folder: str, file_path: str):
    f = FRONTEND_DIR / folder / file_path
    if f.exists():
        return FileResponse(str(f))
    return {"detail": "not found"}
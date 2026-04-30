import os
import logging
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base, safe_migrate
import models
from auth import hash_password, verify_password, create_access_token
import schemas
from routers import orders, insights, export, currency
from routers.import_excel import router as import_router
from routers.chatbot import router as chatbot_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PO Automation API", version="2.0.0")

_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router,   prefix="/orders",   tags=["orders"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(export.router,   prefix="/export",   tags=["export"])
app.include_router(currency.router, prefix="/api/currency", tags=["currency"])
app.include_router(import_router,   prefix="/api",      tags=["import"])
app.include_router(chatbot_router,  prefix="/ai",       tags=["ai"])


@app.on_event("startup")
async def startup_event():
    try:
        Base.metadata.create_all(bind=engine)
        safe_migrate(engine)
        logger.info("Database tables verified and migrated.")
    except Exception as exc:
        logger.error(f"Database startup error: {exc}")


@app.get("/")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/auth/register", response_model=schemas.Token, tags=["auth"])
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(user_data.password)
    user = models.User(email=user_data.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login", response_model=schemas.Token, tags=["auth"])
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

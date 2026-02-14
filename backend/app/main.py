import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth, workspace, contacts, conversations,
    bookings, services, forms, inventory,
    staff, dashboard, public, integrations
)
from app.routers import calendar as calendar_router
from app.services.scheduler_service import scheduler_service
from app.routers import ai


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Scheduler
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 CareOps starting up...")
    
    # Start background scheduler
    scheduler.add_job(
        scheduler_service.run_booking_reminders,
        'interval', minutes=15, id='booking_reminders'
    )
    scheduler.add_job(
        scheduler_service.run_overdue_form_check,
        'interval', minutes=30, id='overdue_forms'
    )
    scheduler.add_job(
        scheduler_service.run_missed_message_check,
        'interval', minutes=10, id='missed_messages'
    )
    scheduler.start()
    logger.info("📋 Background scheduler started")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("👋 CareOps shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unified Operations Platform for Service Businesses",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(workspace.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(bookings.router)
app.include_router(services.router)
app.include_router(forms.router)
app.include_router(inventory.router)
app.include_router(staff.router)
app.include_router(dashboard.router)
app.include_router(public.router)
app.include_router(integrations.router)
app.include_router(calendar_router.router)
app.include_router(ai.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "app": settings.APP_NAME}
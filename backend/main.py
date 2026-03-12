import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import highlights, auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="NeuralRead API", version="2.0.0")

# Configure CORS
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173"
)
origins = [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(highlights.router, prefix="/api/v1", tags=["highlights"])

@app.get("/")
async def root():
    return {"status": "ok", "service": "NeuralRead API", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "NeuralRead API", "version": "2.0.0"}

@app.on_event("startup")
async def startup_event():
    """Log environment state on startup for debugging deploys."""
    logger.info("NeuralRead API v2.0 starting...")
    logger.info(f"OPENAI_API_KEY present: {bool(os.getenv('OPENAI_API_KEY'))}")
    logger.info(f"SUPABASE_URL present: {bool(os.getenv('SUPABASE_URL'))}")
    logger.info("NLP engine: TF-IDF + Position + GPT-4o-mini")

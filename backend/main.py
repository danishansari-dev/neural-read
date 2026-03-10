from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import nltk
import os
from routers import highlights, auth

# Download required NLTK data on startup
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt_tab', quiet=True)
    nltk.download('stopwords', quiet=True)
except Exception as e:
    print(f"Warning: Failed to download NLTK data: {e}")

app = FastAPI(title="NeuralRead API")

# Configure CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = allowed_origins_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(highlights.router, prefix="/api/v1", tags=["highlights"])

@app.get("/")
async def root():
    return {"status": "ok", "service": "NeuralRead API"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "NeuralRead API"}

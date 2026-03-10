from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import nltk
from routers import highlights, auth

# Download required NLTK data on startup
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

app = FastAPI(title="NeuralRead API")

# Configure CORS
origins = [
    "chrome-extension://*", # Allow any chrome extension for local dev
    "http://localhost:5173", # Vite dev server
    "*" # Fallback for dev
]

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

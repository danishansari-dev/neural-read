from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from services.nlp import extract_highlights
from services.embeddings import get_embedding, find_similar
from services.supabase_client import supabase

router = APIRouter()

class ExtractRequest(BaseModel):
    url: str
    text: str
    title: Optional[str] = ""
    metadata: Optional[dict] = {}
    use_gpt: Optional[bool] = True

class HighlightSave(BaseModel):
    sentence: str
    source_url: str
    source_title: str
    salience_score: float

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract and verify user from JWT Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        # Verify JWT via Supabase Auth
        res = supabase.auth.get_user(token)
        if not res or not res.user:
           raise HTTPException(status_code=401, detail="Invalid token")
        return res.user
    except Exception as e:
         raise HTTPException(status_code=401, detail=str(e))

@router.post("/extract")
async def extract(request: ExtractRequest):
    """Run text through NLP pipeline to extract highlights."""
    try:
        # Call NLP Service v3
        highlight_data = extract_highlights(
            request.text, 
            title=request.title, 
            url=request.url,
            metadata=request.metadata,
            use_gpt=request.use_gpt
        )
        return {"highlights": highlight_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
async def save_highlight(highlight: HighlightSave, user = Depends(get_current_user)):
    """Save a highlight, generate its embedding, and identify connections."""
    try:
        # 1. Get embedding
        embedding = get_embedding(highlight.sentence)
        
        # 2. Save highlight to DB
        data = {
            "user_id": user.id,
            "sentence": highlight.sentence,
            "source_url": highlight.source_url,
            "source_title": highlight.source_title,
            "salience_score": highlight.salience_score,
            "embedding": embedding
        }
        res = supabase.table("highlights").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save highlight")
            
        saved_hl = res.data[0]
        
        # 3. Find structural connections based on embedding similarity
        similar = find_similar(embedding, user.id)
        connections_created = 0
        
        for sim in similar:
             if sim['id'] != saved_hl['id']: # Ensure we don't connect a thought to itself
                 conn_data = {
                     "user_id": user.id,
                     "highlight_a": saved_hl['id'],
                     "highlight_b": sim['id'],
                     "similarity_score": sim['similarity']
                 }
                 supabase.table("connections").insert(conn_data).execute()
                 connections_created += 1
                 
        return {
            "status": "success", 
            "highlight": saved_hl, 
            "connections_created": connections_created
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/highlights")
async def get_all_highlights(user = Depends(get_current_user)):
    """Get all highlights for the authenticated user."""
    try:
        res = supabase.table("highlights").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/connections")
async def get_connections(user = Depends(get_current_user)):
    """Get all strong connections for the authenticated user."""
    try:
        res = supabase.table("connections").select("*").eq("user_id", user.id).gte("similarity_score", 0.82).execute()
        return res.data
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

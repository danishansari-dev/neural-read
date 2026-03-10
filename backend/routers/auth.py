from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from services.supabase_client import supabase

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate with Supabase using email/password."""
    try:
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        if not res.session:
             raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"access_token": res.session.access_token, "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me")
async def get_me(authorization: Optional[str] = Header(None)):
    """Verify JWT and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    
    try:
        res = supabase.auth.get_user(token)
        if not res or not res.user:
           raise HTTPException(status_code=401, detail="Invalid token")
        return {"user": res.user}
    except Exception as e:
         raise HTTPException(status_code=401, detail=str(e))

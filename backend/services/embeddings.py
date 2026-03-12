import os
from openai import OpenAI
from .supabase_client import supabase

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)

def get_embedding(text: str) -> list[float]:
    """
    Calls OpenAI to get the text-embedding-3-small vector (1536 dims).
    """
    client = get_openai_client()
    if not client:
        raise Exception("OpenAI client not initialized (missing API key)")

    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def find_similar(embedding: list[float], user_id: str, threshold: float = 0.82) -> list[dict]:
    """
    Calls the Supabase RPC function to find similar highlights for this user.
    """
    response = supabase.rpc(
        "find_similar_highlights",
        {
            "query_embedding": embedding,
            "match_user_id": user_id,
            "threshold": threshold,
            "match_count": 5
        }
    ).execute()
    
    return response.data if response.data else []

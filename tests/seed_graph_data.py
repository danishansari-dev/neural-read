import os
import sys
import asyncio
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from services.supabase_client import get_supabase
from services.embeddings import get_embedding

async def seed_data():
    print("Starting database seeding for Knowledge Graph test data...")
    supabase = get_supabase()
    
    # We need a user ID. Let's try to grab one or just insert without if RLS allows anon (RLS might require auth).
    # Since this is a test script, we might just bypass RLS if using the service_role key.
    # The .env should have the SUPABASE_SERVICE_KEY which bypasses RLS!
    
    # Dummy sentences about AI
    dummy_data = [
        {"url": "https://example.com/ai-1", "title": "History of AI", "sentence": "Artificial intelligence began with the cybernetics movement in the 1940s."},
        {"url": "https://example.com/ai-1", "title": "History of AI", "sentence": "The Dartmouth conference in 1956 is widely considered the birth of AI as a field."},
        {"url": "https://example.com/ai-2", "title": "Modern Machine Learning", "sentence": "Deep learning revolutionized AI by using neural networks with many layers."},
        {"url": "https://example.com/ai-3", "title": "NLP Breakthroughs", "sentence": "Transformers became the dominant architecture for natural language processing tasks after 2017."},
        {"url": "https://example.com/ai-4", "title": "Future of AG", "sentence": "Artificial general intelligence remains a long-term theoretical goal for many researchers."},
    ]
    
    print("Generating embeddings and inserting highlights...")
    inserted_highlights = []
    
    for item in dummy_data:
        # Generate dummy embedding (1536 dims of small random/zero data) just to satisfy the vector requirement
        # Or call the actual openai endpoint if the key is valid. Let's try actual.
        try:
            vector = await get_embedding(item["sentence"])
        except Exception as e:
            print(f"Embedding failed (using mock 1536-dim vector): {e}")
            vector = [0.01] * 1536  # Mock vector for text-embedding-3-small
            
        data, count = supabase.table("highlights").insert({
            # Skip user_id if we want it to be null, or provide a dummy UUID
            "user_id": "00000000-0000-0000-0000-000000000000",
            "url": item["url"],
            "title": item["title"],
            "sentence": item["sentence"],
            "embedding": vector
        }).execute()
        
        if data and len(data[1]) > 0:
            inserted_highlights.append(data[1][0])
            print(f"Inserted: {item['sentence'][:30]}...")
            
    if len(inserted_highlights) >= 2:
        print("Creating dummy connections between highlights...")
        # Link 1 to 2
        supabase.table("connections").insert({
            "source_highlight_id": inserted_highlights[0]["id"],
            "target_highlight_id": inserted_highlights[1]["id"],
            "similarity_score": 0.85
        }).execute()
        # Link 2 to 3
        supabase.table("connections").insert({
            "source_highlight_id": inserted_highlights[1]["id"],
            "target_highlight_id": inserted_highlights[2]["id"],
            "similarity_score": 0.72
        }).execute()
        # Link 3 to 4
        supabase.table("connections").insert({
            "source_highlight_id": inserted_highlights[2]["id"],
            "target_highlight_id": inserted_highlights[3]["id"],
            "similarity_score": 0.91
        }).execute()
        
    print("Completed seeding test data.")

if __name__ == "__main__":
    asyncio.run(seed_data())

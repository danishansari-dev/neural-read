import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load backend/.env
load_dotenv()

url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

# Initialize Supabase Admin client
supabase: Client = create_client(url, key)

def test_connection():
    """Test function to verify Supabase connectivity."""
    try:
        # Simple read from auth.users (requires service key) or public table
        # We will test against the 'highlights' table created later
        res = supabase.table("highlights").select("id").limit(1).execute()
        print("Supabase connection successful!")
        return True
    except Exception as e:
        print(f"Supabase connection failed: {e}")
        return False

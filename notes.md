Terminal 1 — Backend:
cd neural-read/backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000

Terminal 2 — Dashboard:
cd neural-read/dashboard
npm run dev

Confirm both are running:
- Backend → **http://localhost:8000/docs** should show Swagger UI
- Dashboard → **http://localhost:5173** should show your React app


Python backend

venv\Scripts\activate
pip install -r requirements.txt
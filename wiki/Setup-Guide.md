# Setup Guide

Get NeuralRead running locally in under 10 minutes.

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Git**
- **Chrome** browser (for the extension)
- A [Supabase](https://supabase.com) project with pgvector enabled
- An [OpenAI API key](https://platform.openai.com/api-keys)

## 1. Clone the Repository

```bash
git clone https://github.com/danishansari-dev/neural-read.git
cd neural-read
```

## 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Create `backend/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=sk-your-openai-api-key
ALLOWED_ORIGINS=http://localhost:5173
```

> **Note:** Use the `service_role` key (not the `anon` key) for the backend, since it needs to bypass RLS for server-side operations.

### Start the backend

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## 3. Dashboard Setup

```bash
cd ../dashboard
npm install
```

### Create `dashboard/.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:8000
```

### Start the dashboard

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## 4. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top-right corner)
3. Click **Load Unpacked**
4. Select the `extension/` folder from the cloned repo
5. The NeuralRead icon (✦) should appear in your toolbar

> **Important:** For local development, the extension's `config.js` points to the production backend by default. You may want to temporarily change `BACKEND_URL` to `http://localhost:8000` during development.

## 5. Verify Everything Works

| Component | URL | Expected Response |
|-----------|-----|-------------------|
| Backend Health | http://localhost:8000/health | `{"status":"ok","service":"NeuralRead API"}` |
| Backend Root | http://localhost:8000/ | `{"status":"ok","service":"NeuralRead API"}` |
| API Docs | http://localhost:8000/docs | Swagger UI |
| Dashboard | http://localhost:5173/login | Login page |
| Extension | Click toolbar icon | Popup with toggle + auth |

## 6. Test the Full Flow

1. Navigate to any article (e.g., a Wikipedia page)
2. The extension should show "✦ Analyzing..." badge
3. After 1-2 seconds, important sentences should be highlighted in yellow
4. Log in via the popup (Google OAuth or email/password)
5. Highlights will now be saved to your Supabase database
6. Visit the dashboard to see your Knowledge Vault and Knowledge Graph
# NeuralRead
[![Wiki](https://img.shields.io/badge/Wiki-Documentation-blue?logo=github)](https://github.com/danishansari-dev/neural-read/wiki)

NeuralRead is a Chrome browser extension + SaaS platform that auto-highlights important sentences on webpages and builds a personal knowledge graph.

## 📚 Documentation
Full documentation is available in the [NeuralRead Wiki](https://github.com/danishansari-dev/neural-read/wiki):
- [Setup Guide](https://github.com/danishansari-dev/neural-read/wiki/Setup-Guide)
- [Architecture](https://github.com/danishansari-dev/neural-read/wiki/Architecture)
- [API Reference](https://github.com/danishansari-dev/neural-read/wiki/API-Reference)
- [Deployment](https://github.com/danishansari-dev/neural-read/wiki/Deployment)

## Architecture & Tech Stack

- **Chrome Extension**: Manifest V3, Vanilla JS, content scripts. Automatically parses pages, communicates with the backend, and injects beautiful highlights directly onto the DOM with a floating metrics badge.
- **Backend**: FastAPI (Python 3.11), supabase-py, openai SDK. Implements a robust TextRank/LSA NLP pipeline utilizing the `sumy` library for generating salient summaries of any article.
- **Database**: Supabase (PostgreSQL + pgvector). Stores neural highlights alongside high-dimensional embedding vectors to query similarity connections dynamically.
- **Frontend Dashboard**: React 18 + Vite, Supabase JS client. A beautiful, immersive dark-mode web application implementing glassmorphism, responsive sidebar navigation, interactive vector searches, and a fully interactive gravity-based D3 Knowledge Graph visualization.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.11+
- Supabase Project & Credentials
- OpenAI API Key

### Backend Setup
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate` (or `.\.venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. Configure `.env` with Supabase and OpenAI tokens.
6. `uvicorn main:app --reload` (Runs on `localhost:8000`)

### Dashboard Setup
1. `cd dashboard`
2. `npm install`
3. Configure `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. `npm run dev` (Runs on `localhost:5173`)

### Chrome Extension Setup
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `neural-read/extension` folder.
5. Setup complete.

## Testing
This repository contains a full testing suite located in the `tests` directory mimicking extension connections and layout workflows powered by Playwright.

```bash
cd tests
pip install playwright
playwright install
python connected_test.py
python test_dashboard.py
```
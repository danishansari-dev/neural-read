# Deployment Guide

NeuralRead is deployed across three platforms:
- **Dashboard** → Vercel
- **Backend** → Railway
- **Extension** → Chrome Web Store (manual upload)

## Dashboard → Vercel

### Auto-deploy (CI/CD)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the dashboard on every push to `main` that touches files in `dashboard/**`.

**Workflow steps:**
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm install`)
4. Build (`npm run build`) with Supabase env vars from GitHub Secrets
5. Deploy to Vercel using `amondnet/vercel-action@v25`

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_BACKEND_URL` | Railway backend URL |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### Manual Deploy

```bash
cd dashboard
npm run build
npx vercel --prod
```

### Environment Variables on Vercel

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_BACKEND_URL` | Railway backend URL |

---

## Backend → Railway

### Auto-deploy

Railway is configured to auto-deploy on every push to `main`. The backend uses a `Procfile` for startup configuration.

### Procfile

```
web: gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

### Dependencies

Key Python packages (from `requirements.txt`):

| Package | Version | Purpose |
|---------|---------|--------|
| `fastapi` | 0.111.0 | Web framework |
| `uvicorn` | 0.29.0 | ASGI server |
| `gunicorn` | 22.0.0 | Production process manager |
| `supabase` | 2.4.2 | Supabase Python client |
| `openai` | 1.30.1 | Embeddings via `text-embedding-3-small` |
| `sumy` | 0.11.0 | LSA text summarization |
| `nltk` | 3.8.1 | NLP tokenization |
| `pydantic` | 2.7.1 | Request/response validation |
| `httpx` | 0.27.0 | HTTP client |
| `python-jose` | 3.3.0 | JWT handling |
| `python-dotenv` | 1.0.1 | Environment variable loading |

### Environment Variables on Railway

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (bypasses RLS) |
| `OPENAI_API_KEY` | OpenAI API key for embeddings |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

### Health Check

```bash
curl https://neural-read-backend-production.up.railway.app/health
# → {"status":"ok","service":"NeuralRead API"}
```

---

## Extension → Chrome Web Store

### Package for Distribution

1. Ensure `config.js` points to production URLs
2. Zip the `extension/` folder:

```bash
cd extension
zip -r ../neural-read-extension.zip . -x '*.DS_Store'
```

3. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Click **New Item** → upload the `.zip`
5. Fill in store listing details (description, screenshots, icons)
6. Submit for review

### Updating the Extension

1. Increment `version` in `manifest.json`
2. Re-zip and upload to Chrome Developer Dashboard
3. Submit update for review

---

## Production URLs

| Service | URL |
|---------|-----|
| Dashboard | https://neural-read-dashboard.vercel.app |
| Backend API | https://neural-read-backend-production.up.railway.app |
| API Docs | https://neural-read-backend-production.up.railway.app/docs |
| Supabase | https://jvonssuacpucoxnwodlp.supabase.co |
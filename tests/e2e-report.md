# NeuralRead E2E Test Report

**Date:** 2026-03-10  
**Environment:** Windows 10, Python 3.11 + Node.js 18+  

---

## 1. Article Scraping (Firecrawl MCP)

| # | Source | URL | Status |
|---|--------|-----|--------|
| 1 | TechCrunch | `https://techcrunch.com/2026/03/09/electric-air-taxis-are-about-to-take-flight-in-26-states/` | ✅ Scraped |
| 2 | BBC News | `https://www.bbc.com/news/articles/ckg8wvz427vo` | ✅ Scraped |
| 3 | Dev.to | `https://dev.to/gabrielemastrapasqua/building-a-text-to-speech-engine-in-pure-c-59h4` | ✅ Scraped |

All 3 articles scraped via Firecrawl MCP → `tests/e2e-articles.json`.

---

## 2. Backend Verification (Live)

| Step | Endpoint | Result |
|------|----------|--------|
| GET `/` | Health check | ✅ `{"status": "ok", "service": "NeuralRead API"}` |
| GET `/docs` | Swagger UI | ✅ 200 OK — API documentation visible |
| POST `/api/v1/extract` | NLP extraction | ✅ 200 OK — returns 3 highlights |

### Extract Response (3 highlights):
```json
{
  "highlights": [
    {"sentence": "Machine learning models can now process data faster than humans.", "score": 0.2},
    {"sentence": "Neural networks have achieved superhuman performance on many benchmarks.", "score": 0.2},
    {"sentence": "Deep learning requires large amounts of training data.", "score": 0.2}
  ]
}
```

---

## 3. Dashboard Verification (Live)

| Step | Page | Result |
|------|------|--------|
| `http://localhost:5173` | Home | ✅ Renders login page (auth guard redirect) |
| `http://localhost:5173/login` | Login | ✅ Email & password fields + "Sign In / Register" button |
| `http://localhost:5173/graph` | Graph | ✅ Redirects to `/login` (correct auth behavior) |

- **No console errors** (only expected React Router future flag warnings)
- **No blank screens** — glassmorphism dark UI renders correctly

---

## 4. Source Code Audit (Prompt 12)

| Issue | File | Status | Notes |
|-------|------|--------|-------|
| A: CORS | `backend/main.py` | ✅ OK | `localhost:5173` and `chrome-extension://*` configured |
| B: Supabase Client | `dashboard/src/lib/supabase.js` | ✅ OK | Uses `import.meta.env.VITE_SUPABASE_URL` |
| C: Extension Token | `extension/background.js` | ✅ OK | Reads `TOKEN_KEY` from `chrome.storage.local`, `Bearer` header |
| D: Graph Fallback | `dashboard/src/pages/Graph.jsx` | ✅ OK | `MOCK_DATA` fallback for empty/error states |
| E: Dashboard .env | `dashboard/.env` | ✅ OK | Both keys have `VITE_` prefix |

**No fixes required** — all implementations are correct.

---

## Summary

| Component | Previous | Current | Notes |
|-----------|----------|---------|-------|
| Firecrawl Scraping | ✅ PASS | ✅ PASS | 3/3 articles |
| Backend Health | ❌ BLOCKED | ✅ PASS | `{"status": "ok"}` |
| Swagger UI | ❌ BLOCKED | ✅ PASS | Full API docs rendered |
| POST /extract | ❌ BLOCKED | ✅ PASS | 3 highlights returned |
| Dashboard Home | ❌ BLOCKED | ✅ PASS | Login page renders |
| Dashboard Login | ❌ BLOCKED | ✅ PASS | Form with email/password |
| Graph Page | ❌ BLOCKED | ✅ PASS | Auth redirect works |
| CORS Config | — | ✅ OK | No fix needed |
| Supabase Client | — | ✅ OK | No fix needed |
| Extension Token | — | ✅ OK | No fix needed |
| Graph Fallback | — | ✅ OK | No fix needed |

### Test Artifacts

- `tests/e2e-articles.json` — Scraped article data
- `tests/run_e2e_journey.py` — Playwright E2E test script
- `tests/e2e-report.md` — This report

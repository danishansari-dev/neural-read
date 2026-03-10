# Architecture

## System Overview

NeuralRead follows a three-tier architecture:

1. **Chrome Extension** — Content script runs on every webpage, extracts article text, and applies visual highlights
2. **FastAPI Backend** — Processes text through NLP pipeline, generates embeddings, manages data persistence
3. **React Dashboard** — Displays saved highlights (Vault) and visualizes knowledge connections (Graph)

All three components communicate through REST APIs. The extension talks to the backend directly; the dashboard reads from Supabase using the JS client.

## Extension Flow

```
┌─ User visits any webpage ─────────────────────────────────┐
│                                                            │
│  1. content.js waits for DOM ready + 1s delay              │
│  2. extractArticleText() scrapes <p> tags                  │
│  3. Retry up to 3× for JS-rendered pages (2s intervals)    │
│  4. Checks chrome.storage if NeuralRead is enabled         │
│  5. Shows "✦ Analyzing..." badge                           │
│  6. Sends text to background.js via chrome.runtime         │
│                                                            │
│  background.js:                                            │
│  7. POST /api/v1/extract with { text, url, title }         │
│  8. Backend returns top 3 sentences with scores            │
│  9. If authenticated, POST /api/v1/save in background      │
│  10. Sends sentences back to content.js                    │
│                                                            │
│  content.js:                                               │
│  11. highlightSentencesInDOM() using window.find()         │
│  12. Wraps matches in <mark class="nr-highlight">          │
│  13. Updates badge: "✦ 3 highlights"                       │
│                                                            │
│  Fallback (if backend unreachable):                        │
│  14. fallbackLocalScoring() runs heuristic in-browser      │
│  15. Scores by sentence length, numbers, keyword density   │
│  16. Badge shows "✦ 3 highlights (local)"                  │
└────────────────────────────────────────────────────────────┘
```

## NLP Pipeline

The backend uses **sumy's LSA (Latent Semantic Analysis) summarizer** to identify the most important sentences:

```
Input: Raw article text (from extension)
  │
  ▼
PlaintextParser + Tokenizer("english")
  │
  ▼
LsaSummarizer with English stemmer + stop words
  │
  ▼
Top 3 sentences by LSA salience
  │
  ▼
Combined scoring: LSA rank + heuristics
  • Length bonus: 100-200 chars → +0.5
  • Number presence → +0.5
  • LSA position boost: 1st → +0.3, 2nd → +0.2, 3rd → +0.1
  │
  ▼
Output: [{ sentence, score }, ...]
```

**Fallback logic:** If Sumy fails (missing NLTK data, extremely short input), the backend falls back to splitting on `". "` and scoring by simple heuristics (sentence length + digit presence).

## Embedding & Knowledge Graph Pipeline

```
Highlight saved via /api/v1/save
  │
  ▼
OpenAI text-embedding-3-small
  → 1536-dimensional vector
  │
  ▼
Stored in Supabase highlights.embedding (pgvector)
  │
  ▼
find_similar_highlights() RPC function
  → Cosine similarity via <=> operator
  → Threshold: 0.82
  → Top 5 matches
  │
  ▼
Connections stored in connections table
  { highlight_a, highlight_b, similarity_score }
  │
  ▼
Dashboard Graph.jsx renders via D3.js
  → Force-directed layout
  → Draggable nodes
  → Link width = similarity strength
```

## Authentication Flow

NeuralRead supports two authentication methods:

### 1. Google OAuth (Primary)

```
Extension popup
  → "Sign in with Google" button
  → Opens dashboard /login in new tab
  → Supabase Google OAuth flow
  → Redirect back to /vault
  → Vault.jsx stores token in localStorage
  → background.js detects dashboard tab load
  → chrome.scripting.executeScript reads localStorage
  → Token stored in chrome.storage.local
  → Popup polls every 2s, detects token, updates UI
```

### 2. Email/Password (Alternative)

```
Extension popup
  → User enters email + password
  → popup.js POST /api/v1/auth/login
  → Backend calls supabase.auth.sign_in_with_password
  → Returns { access_token, user }
  → Token stored in chrome.storage.local
  → Popup updates to connected state
```

## CORS Configuration

The backend uses FastAPI's CORSMiddleware. Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated). Default: `http://localhost:5173`.

Production origins include the Vercel dashboard URL and the Chrome extension origin.
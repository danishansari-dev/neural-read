# Chrome Extension Guide

The NeuralRead Chrome extension is built on **Manifest V3** using vanilla JavaScript.

## Files

| File | Purpose |
|------|--------|
| `manifest.json` | MV3 configuration — permissions, content scripts, service worker |
| `content.js` | Injected on every webpage — extracts text, applies highlights |
| `background.js` | Service worker — relays API calls, handles auth token bridge |
| `popup.html` | Extension popup UI — toggle + auth forms |
| `popup.js` | Popup logic — toggle state, Google OAuth, email login |
| `config.js` | Global `CONFIG` object with URLs and keys |
| `styles.css` | Highlight styles (`.nr-highlight` class + badge) |
| `icon16/48/128.png` | Extension icons at different sizes |

## CONFIG Object

```js
const CONFIG = {
  BACKEND_URL: 'https://neural-read-backend-production.up.railway.app',
  DASHBOARD_URL: 'https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app',
  ENABLED_KEY: 'nr_enabled',    // chrome.storage key for on/off toggle
  TOKEN_KEY: 'nr_token',        // chrome.storage key for auth JWT
  MAX_HIGHLIGHTS: 3             // Max sentences to highlight per page
};
```

`config.js` is loaded as a plain global object (not ES module) so it can be shared across:
- `content.js` — via manifest `content_scripts` injection
- `background.js` — via `importScripts('config.js')`
- `popup.html` — via `<script src="config.js">` tag

## How Highlighting Works

### 1. Text Extraction (`extractArticleText`)
- Selects all `<p>` tags on the page
- Filters out paragraphs shorter than 50 characters (metadata, footers)
- If fewer than 3 paragraphs found, tries fallback selectors:
  - `article p`, `main p`, `.mw-parser-output p` (Wikipedia)
  - `[class*="ArticleBody"] p` (Britannica)
  - Various other article-specific selectors

### 2. Smart Initialization with Retry
- Waits 1–1.5s after DOM ready for JS rendering
- If no text found, retries up to 3 times with 2s delays
- Handles JS-rendered pages (SPAs, Britannica, etc.)

### 3. Backend NLP Processing
- Sends extracted text to `POST /api/v1/extract`
- Backend runs LSA summarization → returns top 3 sentences
- If backend is unreachable, falls back to local heuristic scoring

### 4. DOM Highlighting (`highlightSentencesInDOM`)
- Uses `window.find()` to locate sentences in the DOM
- Wraps matches in `<mark class="nr-highlight">`
- If `surroundContents()` fails (cross-node sentences), falls back to `wrapRangeTextNodes()` which wraps individual text nodes

### 5. Local Fallback Scoring
If the backend is unreachable:
- Splits text on `". "` boundaries
- Scores by: sentence length (100-200 chars = +3), digit presence (+2), keyword density (×5)
- Highlights top 3 by score
- Badge shows "✦ N highlights (local)"

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves auth token and enabled/disabled toggle in `chrome.storage.local` |
| `activeTab` | Reads current page content for text extraction |
| `scripting` | Injects token-reader script into dashboard tab for OAuth bridge |
| `tabs` | Detects when dashboard tab loads to trigger auth token capture |

## Host Permissions

| Pattern | Purpose |
|---|---|
| `https://neural-read-dashboard-*.vercel.app/*` | Allows `chrome.scripting.executeScript` on dashboard for token bridge |
| `https://neural-read-backend-production.up.railway.app/*` | Allows fetch requests to backend API |

## Excluded Domains

The content script does **not** run on:
- `http://localhost/*` — prevents highlighting the dev dashboard
- `https://localhost/*`, `http://127.0.0.1/*` — local development
- Dashboard Vercel URL — prevents highlighting the production dashboard UI

Additionally, `content.js` has a runtime check against excluded hosts.

## Auth Token Bridge

The extension needs the Supabase JWT token to save highlights. Since Google OAuth happens in the dashboard (not the extension), a bridge mechanism transfers the token:

1. User clicks "Sign in with Google" in popup → opens dashboard `/login`
2. Google OAuth completes → redirects to `/vault`
3. `Vault.jsx` stores token in `localStorage` (`nr_token`)
4. `background.js` detects dashboard tab via `chrome.tabs.onUpdated`
5. `chrome.scripting.executeScript` reads `localStorage.getItem('nr_token')`
6. Retries up to 5 times (2s apart) if token isn't available yet
7. Token stored in `chrome.storage.local` for extension use
8. `popup.js` polls every 2s, detects token, updates UI to connected state
# Contributing to NeuralRead

Thank you for your interest in contributing! NeuralRead is an open-source project and we welcome contributions of all kinds.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/neural-read.git
   cd neural-read
   ```
3. Follow the [Setup Guide](Setup-Guide.md) to get everything running
4. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
5. Make your changes
6. **Push** and open a Pull Request:
   ```bash
   git push origin feat/your-feature-name
   ```

## Project Structure

```
neural-read/
├── extension/              Chrome MV3 extension
│   ├── manifest.json       Extension configuration
│   ├── content.js          Content script (text extraction + highlighting)
│   ├── background.js       Service worker (API relay + auth bridge)
│   ├── popup.html/js       Popup UI (toggle + login)
│   ├── config.js           Global configuration object
│   └── styles.css          Highlight styles
├── backend/                FastAPI Python API
│   ├── main.py             App entrypoint + CORS setup
│   ├── routers/
│   │   ├── highlights.py   NLP + highlight CRUD endpoints
│   │   └── auth.py         Authentication endpoints
│   ├── services/
│   │   ├── nlp.py          LSA summarizer (sumy)
│   │   ├── embeddings.py   OpenAI embedding generation
│   │   └── supabase_client.py  Supabase client singleton
│   └── requirements.txt    Python dependencies
├── dashboard/              React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── Vault.jsx   Knowledge Vault (saved highlights)
│       │   └── Graph.jsx   Knowledge Graph (D3.js visualization)
│       └── lib/
│           ├── supabase.js  Supabase client config
│           └── api.js       Backend API helpers
├── .github/
│   └── workflows/
│       └── deploy.yml      CI/CD for dashboard → Vercel
└── README.md
```

## Areas That Need Help

- [ ] 🦊 **Firefox extension port** — Adapt MV3 extension for Firefox
- [ ] 🤖 **Better NLP models** — Replace sumy LSA with transformer-based summarization
- [ ] 📤 **Export highlights** — Export to Notion, Obsidian, or Markdown
- [ ] 📱 **Mobile app** — React Native companion app
- [ ] 🔌 **Offline mode** — Cache highlights locally when offline
- [ ] 🎨 **Highlight customization** — Let users choose highlight colors
- [ ] 📊 **Reading analytics** — Track reading time, articles per day
- [ ] 🔍 **Full-text search** — Search across all saved highlights
- [ ] 🏷️ **Tagging system** — Manual tags for organizing highlights

## Code Style

### Python (Backend)
- Follow **PEP 8** conventions
- Use `async/await` for all FastAPI routes
- Add docstrings to functions
- Use type hints

### JavaScript (Extension)
- **ES6+** syntax (const/let, arrow functions, template literals)
- No jQuery — vanilla JS only
- JSDoc comments for all functions
- Use `chrome.storage.local`, never `localStorage` in extension code

### React (Dashboard)
- **Functional components** + hooks only (no class components)
- Keep components focused and reusable
- Use Supabase JS client for data fetching

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/description` | `feat/firefox-port` |
| Bug fix | `fix/description` | `fix/highlight-overlap` |
| Docs | `docs/description` | `docs/api-examples` |
| Refactor | `refactor/description` | `refactor/nlp-pipeline` |

## Reporting Bugs

Open a [GitHub Issue](https://github.com/danishansari-dev/neural-read/issues) with:

1. **Steps to reproduce** — what you did
2. **Expected behavior** — what you thought would happen
3. **Actual behavior** — what actually happened
4. **Environment** — Browser version, OS, extension version
5. **Screenshots** — if applicable, especially for UI bugs

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Write a clear description of what changed and why
- Test your changes locally before submitting
- Update documentation if you're adding new features
- Ensure no secrets or API keys are committed

---

*Questions? Open a Discussion or reach out via GitHub Issues.*
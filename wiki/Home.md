# NeuralRead 🧠

> **Auto-highlight important sentences on any webpage. Build your personal knowledge graph.**

## What is NeuralRead?

NeuralRead is a Chrome browser extension and SaaS platform that brings intelligent reading assistance to the web. When you visit any article or webpage, NeuralRead automatically extracts and highlights the most important sentences using advanced NLP (Latent Semantic Analysis), letting you absorb key information at a glance.

Beyond just highlighting, NeuralRead builds a **personal knowledge graph** from everything you read. Every highlighted sentence is embedded as a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model, and similar ideas across different articles are automatically connected using cosine similarity. The result is a beautiful, interactive force-directed graph that reveals hidden connections across your reading history.

The platform consists of three components: a Chrome MV3 extension that runs on every webpage, a FastAPI backend that handles NLP processing and embedding generation, and a React dashboard where you can explore your Knowledge Vault and Knowledge Graph.

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────────┐
│  Chrome Extension   │────────▶│    FastAPI Backend       │
│  (Manifest V3)      │  REST   │    (Python 3.11)         │
│                     │◀────────│                          │
│  • content.js       │         │  • /api/v1/extract       │
│  • background.js    │         │  • /api/v1/save          │
│  • popup.js         │         │  • /api/v1/highlights    │
└─────────────────────┘         │  • /api/v1/connections   │
                                │  • /api/v1/auth/login    │
                                │  • /api/v1/auth/me       │
                                └──────────┬──────────────┘
                                           │
                                           ▼
                                ┌─────────────────────────┐
                                │   Supabase (PostgreSQL)  │
                                │   + pgvector extension   │
                                │                          │
                                │  • highlights table      │
                                │  • connections table     │
                                │  • vector embeddings     │
                                └──────────▲──────────────┘
                                           │
┌─────────────────────┐                    │
│   React Dashboard   │────────────────────┘
│   (Vite + D3.js)    │  Supabase JS Client
│                     │
│  • Knowledge Vault  │
│  • Knowledge Graph  │
│  • Google OAuth     │
└─────────────────────┘
```

## Quick Links

| Page | Description |
|------|-------------|
| [[Setup Guide|Setup-Guide]] | Run locally in 10 min |
| [[Architecture|Architecture]] | System design deep dive |
| [[API Reference|API-Reference]] | All 7 backend endpoints |
| [[Extension Guide|Extension-Guide]] | How the extension works |
| [[Database Schema|Database-Schema]] | Tables + pgvector setup |
| [[Deployment|Deployment]] | Vercel + Railway deploy guide |
| [[Contributing|Contributing]] | How to contribute |

## Live URLs

| Service | URL |
|---------|-----|
| Dashboard | https://neural-read-dashboard.vercel.app |
| Backend API | https://neural-read-backend-production.up.railway.app |
| API Docs (Swagger) | https://neural-read-backend-production.up.railway.app/docs |
| Supabase Project | https://jvonssuacpucoxnwodlp.supabase.co |

---

*Built with ❤️ using FastAPI, Supabase, React, and D3.js*

# NeuralRead Deployment Report
**Date**: March 11, 2026
**Status**: Partial Automation / Manual Required

## 1. Dashboard (Vercel)
- **Status**: Deployed
- **URL**: [https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app](https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app)
- **Repo Link**: `danishansari-dev/neural-read`
- **Notes**: Vercel manual deploy via CLI succeeded. GitHub Actions trigger `vite build` but face root directory execution issues that need Vercel project configuration on the dashboard.

### Tests
- `/login` rendered NeuralRead UI (see `deploy-01-login.png`)
- `/vault` correctly redirects unauthenticated users to `/login` (see `deploy-02-vault.png`)
- `/graph` correctly redirects to `/login` (see `deploy-03-graph.png`)

## 2. API Backend (Render)
- **Status**: Manual Action Required
- **Instructions**: The user must deploy the FastAPI backend manually to Render using the existing setup. Ensure to set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, and `ALLOWED_ORIGINS` in Render's environment settings.

## 3. Chrome Extension
- **Status**: Configured for Production
- **Host Permissions**: Added `https://*.vercel.app/*` to manifest.
- **Backend Sync**: Connected to Render Backend API URL (`https://neural-read-api.onrender.com`).
- **Dashboard Sync**: Connected to Vercel UI (`https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app`).

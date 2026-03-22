# Monitoring Web App Plan (Netlify)

## Recommended Tech Stack
- Frontend: React + TypeScript + Vite
- UI: Existing Tailwind UI from desktop app
- Data fetching: native fetch (current), can upgrade to TanStack Query later
- Deploy: Netlify (static hosting)
- API: Existing Go backend deployed separately (public HTTPS endpoint)

Reasoning:
- Reuses your current code and UI components.
- Fastest path to production without rewriting the app.
- Easy environment switch between desktop/local and online monitoring.

## Current Status
- API calls are centralized in src/config/api.ts
- Monitoring mode is ready with VITE_ENABLE_POS=false
- POS tab/page is hidden in monitoring mode
- Netlify config is added in netlify.toml

## How To Run Monitoring Mode Locally
1. Use .env.monitoring:
   - VITE_API_BASE_URL=https://your-api-domain.com
   - VITE_ENABLE_POS=false
2. Run:
   - npm run dev:monitoring

## How To Build For Netlify
1. Ensure .env.monitoring has your production API URL.
2. Build:
   - npm run build:web
3. Netlify will publish from dist/.

## Netlify Settings
- Build command: npm run build:web
- Publish directory: dist
- SPA redirects already set in netlify.toml

## Scope Included
- Products
- Stock masuk
- Transactions history
- Reports
- User/staff management
- Category/unit management
- Account settings

## Scope Excluded
- POS checkout flow (intentionally hidden for monitoring web app)

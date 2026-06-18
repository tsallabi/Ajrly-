# Deployment integration notes (for the coordinator)

This file describes the deployment surface added by the DevOps track and what the
coordinator must wire up. Full step-by-step lives in
[`deploy-cloudflare.md`](./deploy-cloudflare.md).

## Files added (DevOps-owned)

| File | Purpose |
| --- | --- |
| `wrangler.toml` | Cloudflare Pages project config (`name="ajrly-os"`, output dir `.`). |
| `_headers` | Edge security headers + CSP; long immutable cache for `/assets/*`. |
| `_redirects` | SPA fallback `/*  /index.html  200`. |
| `.gitignore` | Ignores `node_modules`, `.env*`, `.wrangler`, `dist`, logs. |
| `.github/workflows/deploy.yml` | CI deploy to Cloudflare Pages on push / manual. |
| `docs/deploy-cloudflare.md` | Operator runbook (3 deploy flows + domain + Functions). |

These do **not** touch `index.html`, `assets/`, `functions/`, `README.md`,
`netlify.toml`, or `data.js`.

## What the coordinator must do

1. **Create the Cloudflare Pages project** named `ajrly-os` via either the
   Dashboard Git-connect flow or `npx wrangler pages deploy . --project-name=ajrly-os`.
2. **Add CI secrets** in GitHub (only needed for the Actions flow):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. **Add Function env vars/secrets** in the Pages project settings if/when the
   `/functions` track ships Supabase-backed endpoints (e.g. `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. **(Optional) Custom domain** `os.ajrly.ly` — CNAME → `ajrly-os.pages.dev`.

## Test locally

```bash
# Serve the static app + any /functions exactly as Cloudflare Pages would:
npx wrangler pages dev .
```

Then open the printed `http://localhost:8788` URL. Verify:

- The app loads and hash routes (`#/...`) work.
- A hard refresh on a deep route still loads `index.html` (SPA fallback).
- Google Fonts load (CSP allows `fonts.googleapis.com` / `fonts.gstatic.com`).
- Browser console shows **no CSP violations**; if a new external origin is added
  later, update `script-src` / `connect-src` / `style-src` in `_headers`.

## Coordination notes

- The `/functions` directory is owned by another track. Nothing here creates
  Function code — Pages auto-detects it. `nodejs_compat` is pre-enabled.
- The CSP in `_headers` already allows `esm.sh`, `cdn.jsdelivr.net`, and
  `*.supabase.co` (Supabase loads via esm.sh). If the Supabase project URL is on
  a custom domain, add it to `connect-src`.
- Netlify parity is preserved via the existing `netlify.toml` + `_redirects`.

# Deploying Ajrly OS to Cloudflare Pages

Ajrly OS is a **dependency-free static single-page app** (vanilla ES modules, no
build step). It is served directly from the **repository root** (`index.html` +
`/assets`). Routing is **hash-based** (`#/route`), so the SPA fallback never has
to rewrite URLs the router cares about — it only catches deep-link refreshes.

There are three supported ways to deploy. Pick **one**.

- [A. Dashboard Git-connect (recommended for first launch)](#a-dashboard-git-connect)
- [B. Wrangler CLI (one-off / manual)](#b-wrangler-cli)
- [C. GitHub Actions (CI / automatic)](#c-github-actions)

---

## A. Dashboard Git-connect

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize Cloudflare for the GitHub org/repo and select the **Ajrly-** repository.
3. Choose the production branch (e.g. `claude/spreadsheet-system-redesign-c5bi2r`, or `main` once merged).
4. **Build settings** — this is the important part:
   - **Framework preset:** `None`
   - **Build command:** *(leave EMPTY)*
   - **Build output directory:** `/` (you can also enter `.`)
   - **Root directory:** *(leave as repo root)*
5. Click **Save and Deploy**. Cloudflare uploads the repo as-is and serves it from the edge.

`wrangler.toml`, `_headers`, and `_redirects` in the repo root are picked up
automatically — no extra dashboard configuration needed for headers/redirects.

---

## B. Wrangler CLI

For a manual / one-off deploy from your machine (no Git connection required):

```bash
# From the repo root:
npx wrangler pages deploy . --project-name=ajrly-os
```

First run will prompt you to log in (`npx wrangler login`) and, if the project
does not exist yet, to create it. The `.` tells Wrangler to upload the repo root.

Local preview (serves the app + Functions exactly as Pages would):

```bash
npx wrangler pages dev .
```

---

## C. GitHub Actions

A workflow is committed at `.github/workflows/deploy.yml`. It deploys on every
push to `claude/spreadsheet-system-redesign-c5bi2r` and on manual
**workflow_dispatch**. It runs **no build step**.

### Required repository secrets

In GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token** → use the **"Edit Cloudflare Workers"** template (or a custom token with **Account → Cloudflare Pages → Edit**). |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → **Workers & Pages** → right sidebar **Account ID** (also in any zone's Overview). |

`GITHUB_TOKEN` is provided automatically by Actions — no setup needed. It is used
to post the deployment status/preview URL back to the commit.

---

## Custom domain (os.ajrly.ly)

1. In the Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter `os.ajrly.ly`.
3. If `ajrly.ly` is already on Cloudflare DNS, the record is created for you.
   Otherwise add a DNS record at your DNS provider:

   | Type | Name | Target |
   | --- | --- | --- |
   | CNAME | `os` | `ajrly-os.pages.dev` |

4. Cloudflare provisions a TLS certificate automatically. Allow a few minutes.

The default `*.pages.dev` URL (e.g. `https://ajrly-os.pages.dev`) keeps working
alongside the custom domain.

---

## Pages Functions & environment variables

- Any code placed in the **`/functions`** directory at the repo root is
  **auto-detected** and deployed as Pages Functions — no config required. File
  paths map to routes (e.g. `functions/api/hello.js` → `/api/hello`). The
  `_redirects` SPA rule does **not** shadow these: Functions and real static
  files are matched first.
- `nodejs_compat` is already enabled in `wrangler.toml` for Functions that need
  Node built-ins.
- Set **secrets / environment variables** for Functions in the dashboard:
  **Pages project** → **Settings** → **Environment variables / Secrets**, scoped
  to **Production** and/or **Preview**. Typical entries for this app:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
  - Do **not** commit these. `.env` files are gitignored.
  - For local Function dev, create a `.dev.vars` file (also gitignored) and run
    `npx wrangler pages dev .`.

---

## Cloudflare Pages vs Netlify

| Capability | Cloudflare Pages | Netlify |
| --- | --- | --- |
| Static hosting (no build) | Yes | Yes |
| Global edge network | 300+ PoPs (Cloudflare) | Netlify Edge (fewer PoPs) |
| Free-tier bandwidth | Unlimited | 100 GB/mo |
| Free-tier builds/deploys | 500 builds/mo | 300 build-min/mo |
| Serverless functions | Pages Functions (Workers runtime) | Netlify Functions (AWS Lambda) |
| Scheduled jobs | Cron Triggers (built-in) | Scheduled Functions |
| Edge data | D1 (SQLite), KV, R2, Durable Objects | Limited (Blobs) |
| Headers / redirects files | `_headers` / `_redirects` | `_redirects` / `netlify.toml` |

**Recommendation: Cloudflare Pages (primary).** Reasons:

- **Global edge** — content served from Cloudflare's 300+ locations with very low
  latency, well suited for the MENA / Libya audience.
- **Generous free tier** — unlimited bandwidth and ample deploys.
- **Integrated platform** — Pages Functions, **Cron Triggers**, and edge data
  stores (**D1 / KV / R2**) live in the same runtime, so the rental backend can
  grow without leaving the platform.

Netlify is kept as a parity target (`netlify.toml` + `_redirects`) for redundancy.

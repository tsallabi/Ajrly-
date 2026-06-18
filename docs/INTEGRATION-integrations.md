# Integrations & Automation

The Integrations module (`assets/js/modules/integrations.js`) and the optional
Cloudflare Pages Functions under `functions/api/` provide owner outreach,
owner import, and channel testing. **Everything degrades gracefully with zero
backend** — the Functions are optional enhancements only.

Navigate to the page via the **🔗 Integrations** nav item (`#/integrations`).

---

## What each piece does

### Module page (`assets/js/modules/integrations.js`)

Three cards:

1. **⏰ Contact Due** — lists owners whose `lastContact` is empty or older than
   a threshold (default **14 days**, editable inline). Each row gives:
   - a **WhatsApp** button → `https://wa.me/<digits>?text=<bilingual greeting>`
   - an **Email** button → `mailto:<email>?subject=...&body=...`
   - a **Mark contacted today** button → sets `lastContact = today` and bumps
     the owner's `stage` one step (recruitment → communication → content → active).

   The greeting/subject are localized (Arabic when the app is in AR, English otherwise).

2. **📥 Import Owners** — three input methods feeding one pipeline
   (parse → column map → preview → dedupe → import):
   - **CSV file upload** — parsed client-side (no libraries). Handles quoted
     fields, embedded commas/newlines, doubled-quote escapes, and CRLF.
   - **Paste table** — textarea; delimiter auto-sniffed (Tab vs comma).
   - **Fetch from ajrly.ly** — `GET /api/import-owners`; on success the returned
     rows flow into the same preview/import pipeline. If the endpoint is not
     deployed/reachable, a graceful toast tells the user to use CSV/paste.

   Columns are **auto-detected** from headers (English + Arabic aliases) with a
   manual **column-mapping** UI to override. Rows are **deduped** against existing
   owners by phone (digits-only) or email (case-insensitive), and within the
   batch itself. Import calls `db.addOwner` for each new row and toasts the count.

3. **🔌 Channels** — config status cards for WhatsApp and Email.
   - "Configured" is a **UI hint** derived from `window.AJRLY_CONFIG` flags or
     `localStorage` keys (`ajrly_wa_configured`, `ajrly_email_configured`). The
     real secrets live server-side.
   - **Test connection** POSTs a `{test:true}` payload to `/api/whatsapp` or
     `/api/notify-email` and reports success / `501 not configured` / failure
     without throwing.

### Cloudflare Pages Functions (`functions/api/`)

Plain ES modules using the Workers runtime (`context.env`, `Response`). All
return JSON, include CORS headers, and handle `OPTIONS` preflight.

| File | Method | Purpose |
|------|--------|---------|
| `whatsapp.js` | `POST /api/whatsapp` | Send via WhatsApp Cloud API. `{to, message}`. Returns `501 {configured:false}` if secrets missing. |
| `notify-email.js` | `POST /api/notify-email` | Send via an email API (Resend example). `{to, subject, html}`. Returns `501` if not configured. |
| `import-owners.js` | `GET/POST /api/import-owners` | Returns a sample owner array; placeholder for a future ajrly.ly integration. |

---

## Required environment variables (Cloudflare Pages secrets)

Set under **Pages project → Settings → Environment variables** (mark as secret).
**No secrets are ever hardcoded** — Functions read only from `context.env`.

| Variable | Used by | Required? | Notes |
|----------|---------|-----------|-------|
| `WHATSAPP_TOKEN` | `whatsapp.js` | for live WhatsApp send | WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_ID` | `whatsapp.js` | for live WhatsApp send | WhatsApp Business phone number ID |
| `EMAIL_API_KEY` | `notify-email.js` | for live email send | Provider key (e.g. Resend `re_...`) |
| `EMAIL_FROM` | `notify-email.js` | optional | Verified sender, e.g. `Ajrly <team@ajrly.ly>` |
| `AJRLY_API_TOKEN` | `import-owners.js` | optional | Bearer token for the future ajrly.ly owners API |

If a required var is missing, the endpoint returns **HTTP 501** and the UI falls
back to the direct `wa.me` / `mailto` links.

> `wrangler.toml` already sets `compatibility_flags = ["nodejs_compat"]` and the
> `/functions` directory is auto-detected by Cloudflare Pages — no extra config.

---

## How wa.me / mailto work offline (zero backend)

These are plain hyperlinks built entirely in the browser:

- **WhatsApp:** `https://wa.me/<digits>?text=<url-encoded message>` opens
  WhatsApp (app or web) with the message prefilled. The phone is reduced to
  digits only (`+`, spaces, dashes stripped).
- **Email:** `mailto:<addr>?subject=...&body=...` opens the default mail client.

No server, API key, or network call to our own backend is involved — they work
even when the Pages Functions are not deployed. The Functions only add the
ability to send **automatically/server-side** (see Cron below).

---

## CSV / paste format expected

First row = headers (auto-detected). Recognized columns (English or Arabic):

```
name, phone, email, listings, stage, notes
```

Example CSV:

```csv
name,phone,email,listings,stage,notes
Mohammed Al-Senussi,+218 91 234 5678,m.senussi@example.ly,3,recruitment,VIP owner
Fatima Bin Ali,+218 92 765 4321,fatima@example.ly,1,communication,
```

Notes:
- Quote any field containing a comma, quote, or newline: `"Tripoli, Libya"`.
  Escape a literal quote by doubling it: `"He said ""hi"""`.
- `stage` accepts `recruitment | communication | content | active` (or Arabic
  equivalents `استقطاب | تواصل | محتوى | نشط`); anything else defaults to
  `recruitment`.
- A row needs at least one of name / phone / email to be imported.
- If no recognizable header is found, columns are mapped **positionally** in the
  order above; use the mapping dropdowns to correct.
- **Paste table** accepts the same columns separated by **Tab or comma**
  (handy for pasting straight from Google Sheets / Excel).

---

## Cron Trigger idea — scheduled owner reminders

The same logic the UI runs (find owners overdue for contact) can run on a
schedule so reminders go out automatically:

1. Add a **Cron Trigger** (Workers/Pages) e.g. `0 8 * * 1` (Mondays 08:00).
2. In the scheduled handler, load the owner list, compute the overdue set
   (mirror `daysSince(lastContact) >= threshold`), and for each owner call the
   WhatsApp Cloud API (or email API) directly — reuse the request shapes in
   `functions/api/whatsapp.js` / `notify-email.js`.
3. Persist owners somewhere durable first (e.g. Supabase, already in the CSP /
   schema) since the current app stores them in `localStorage` per-browser.

Example `wrangler.toml` snippet (for a dedicated Worker, not the Pages site):

```toml
[triggers]
crons = ["0 8 * * 1"]
```

---

## Coordinator wiring

- **No CSS link required.** The module reuses existing classes from
  `assets/css/styles.css` (`.card`, `.toolbar`, `.field`, `.table-wrap`,
  `.btn*`, `.badge*`, `.tag`, `.empty`, `.grid`, `.cards-*`, `.input`,
  `.row-actions`). No `assets/css/integrations.css` was added.
- **Module auto-registers.** `assets/js/app.js` already imports
  `./modules/integrations.js`, which calls `registerModule(...)`. No app.js edit
  needed.
- **CSP already allows it.** `connect-src 'self'` in `_headers` permits the
  same-origin `fetch('/api/...')` calls. `wa.me` / `mailto` are navigations, not
  `connect-src`, so they are unaffected.
- **Optional:** set `window.AJRLY_CONFIG = { whatsapp:true, email:true }` (e.g.
  via an inline script) to flip the Channels cards to "Configured" in the UI.

# Ajrly OS — Cloud Architecture (contract / single source of truth)

This document is the **contract** every workstream builds against. Do not diverge
without updating it. Stack: **Cloudflare Pages + Pages Functions + D1 + KV +
Durable Objects**. The static SPA stays no-build.

## Golden rule — never break local mode
The app currently runs on `localStorage`. Cloud is **additive**:
- Client calls `GET /api/health`. If it returns `{ ok:true }` → **cloud mode**.
  Otherwise → **local mode** (today's behaviour). The app must always boot.
- Cloud data is mirrored into the existing in-memory `db` cache so all current
  (synchronous) views keep working unchanged. Mutations are optimistic +
  write-through to the API; realtime/poll refreshes the cache then re-renders.

## Bindings (wrangler.toml + Pages dashboard)
- `DB`  → D1 database `ajrly`
- `KV`  → KV namespace `AJRLY_KV` (sessions + cache)
- `PRESENCE` → Durable Object namespace, class `PresenceRoom`
- Secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`,
  `EMAIL_API_KEY`, `SESSION_SECRET`.

## Auth & sessions
- Passwords: PBKDF2/SHA-256 + per-user salt (Web Crypto in the Function).
- Session token (random) stored in **KV** with TTL (e.g. 30d), key
  `sess:<token>` → `{ userId }`. Sent as `Set-Cookie: ajrly_sess=<token>;
  HttpOnly; Secure; SameSite=Lax; Path=/`.
- Every protected Function resolves the session → user → role, server-side.
- First registered user becomes `admin`.

### Roles & capabilities (enforced server-side AND in UI)
| role | manageUsers | write | assign | del | monitorOthers |
|------|:--:|:--:|:--:|:--:|:--:|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ (set monitor_level) |
| manager | – | ✓ | ✓ | ✓ | view only |
| member | – | ✓ | – | – | – |
| viewer | – | – | – | – | – |

## REST API (Pages Functions under `/functions/api/...`)
JSON in/out. Errors: `{ error: "code" }` + proper HTTP status. All list/CRUD
endpoints require a valid session.

```
GET    /api/health                      -> { ok:true, ts }
POST   /api/auth/register               { name,email,password } -> { user } (+cookie)
POST   /api/auth/login                  { email,password } -> { user } (+cookie)
POST   /api/auth/logout                 -> { ok:true }
GET    /api/auth/me                     -> { user } | 401

GET    /api/users                       -> { users:[...] }            (admin/manager)
POST   /api/users                       { name,email,password,role } (admin)
PATCH  /api/users/:id                   { role?,active?,monitor_level?,name? } (admin)
DELETE /api/users/:id                   (admin)

GET    /api/tasks | POST /api/tasks | PATCH /api/tasks/:id | DELETE /api/tasks/:id
GET    /api/content | POST | PATCH /:id | DELETE /:id
GET    /api/owners  | POST | PATCH /:id | DELETE /:id
GET    /api/sync                        -> { tasks, content, owners, users, ts }  (one-shot cache fill)

-- Customer service --
GET    /api/tickets | POST /api/tickets | PATCH /api/tickets/:id
GET    /api/tickets/:id/messages | POST /api/tickets/:id/messages
POST   /api/intake                      (PUBLIC) website form -> creates ticket
POST   /api/webhooks/whatsapp           (PUBLIC) GET=verify, POST=inbound -> ticket/message
POST   /api/webhooks/email              (PUBLIC) email-to-ticket

-- Presence / realtime (Durable Object) --
GET    /api/realtime                    Upgrade: websocket  (auth via cookie)
```

## Presence protocol (Durable Object `PresenceRoom`)
One global room. Client opens WS after login and sends a **heartbeat** every 30s.
Privacy-respecting: we send only an `active` boolean derived from
mousemove/keydown/scroll/click in the last 30s — **never coordinates, keystrokes
or screenshots**.

```
client -> { type:"hb", active:true|false, taskId?:string }
client -> { type:"focus"|"blur" }
server -> { type:"presence", users:[ {userId,status,currentTask,activeMinutes} ] }   (broadcast on change, ~5s)
server -> { type:"notify", body, link }                                              (assignment, new ticket…)
```
- `status`: online (active hb < 60s), idle (hb but inactive), offline (no hb 90s).
- DO accumulates `active_minutes_day` and periodically flushes presence +
  `activity_log` rows to D1 (for performance metrics & monitoring).

## Employee monitoring
- **Standard (default, everyone):** online/idle/offline, active-minutes/day,
  current task, completion & on-time rates, avg customer response time.
- **Extended (admin sets `monitor_level='extended'` on a specific user):**
  finer `activity_log` sampling (active/idle timeline, focus/blur, per-app-section
  time). Still **no keystroke/coordinate/screenshot capture.** When a user is in
  extended mode the client shows a one-time **consent + disclosure** notice
  (required for EU/GDPR — the admin/owner is in Ireland).

## Performance metrics (per employee)
completionRate, onTimeRate, tasksPerDay, activeMinutes, avgFirstResponse (CS),
ticketsResolved, "Ajrly Score" = weighted blend. Computed from `tasks`,
`tickets`, `activity_log`, `presence`.

## Customer Service
Unified ticket inbox. Intake channels: website form (`/api/intake`), WhatsApp
Cloud API webhook, email-to-ticket, live chat (WS via the DO). SLA timers:
first-response & resolution; turn red when breached.

---

## Workstream file ownership (no overlaps)
- **WS-A Auth+Core API+Client driver:** `functions/api/health.js`,
  `functions/api/auth/*`, `functions/api/users/*`, `functions/api/tasks*`,
  `functions/api/content*`, `functions/api/owners*`, `functions/api/sync.js`,
  `functions/_lib/*` (db, auth, response helpers), `assets/js/cloud.js`
  (driver + cache sync), and a small hook in `assets/js/data.js` to use the
  driver when cloud is available. **Owns the shared `functions/_lib`.**
- **WS-B Presence+Ops Room:** `functions/api/realtime.js` + DO class
  `functions/_do/PresenceRoom.js`, `assets/js/presence.js` (client heartbeat),
  `assets/js/modules/team.js` (Live Ops Room + monitoring escalation UI).
- **WS-C Customer Service:** `functions/api/tickets*`, `functions/api/intake.js`,
  `functions/api/webhooks/*`, `assets/js/modules/support.js` (CS Inbox),
  public intake form page.
- **WS-D Performance:** extend `assets/js/modules/analytics.js` with a
  per-employee performance tab reading `/api/sync` + activity.

Shared/coordinator-owned (do NOT edit in agents): `assets/js/app.js`,
`assets/js/i18n.js`, `assets/js/registry.js`, `index.html`, `assets/css/styles.css`,
`wrangler.toml`, `db/schema.sql`, this doc.

## Provisioning (owner runs once)
```bash
# 1) create resources
npx wrangler d1 create ajrly
npx wrangler kv namespace create AJRLY_KV
# 2) put the returned ids into wrangler.toml bindings
# 3) load schema
npx wrangler d1 execute ajrly --remote --file=db/schema.sql
# 4) set secrets (Pages project → Settings → Variables & Secrets), e.g.
#    SESSION_SECRET, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, EMAIL_API_KEY
# 5) bind DB / KV / PRESENCE in the Pages project settings, then redeploy
```
Until provisioning is done, `/api/*` returns errors and the app stays in local mode.

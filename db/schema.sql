-- ============================================================
-- Ajrly OS — Cloud schema (Cloudflare D1 / SQLite)
-- Apply with:  wrangler d1 execute ajrly --file=db/schema.sql
-- Safe to re-run (IF NOT EXISTS).
-- ============================================================

-- ---- Users / team ----
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  pass_hash     TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',      -- admin|manager|member|viewer
  active        INTEGER NOT NULL DEFAULT 1,
  monitor_level TEXT NOT NULL DEFAULT 'standard',    -- standard|extended (admin-set)
  tz            TEXT DEFAULT 'Africa/Tripoli',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ---- Tasks ----
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  priority    TEXT DEFAULT 'Medium',                 -- High|Medium|Low
  status      TEXT DEFAULT 'pending',                -- pending|progress|complete|overdue|closed
  assigned_by TEXT,
  delegate_to TEXT,
  due_date    TEXT,
  date        TEXT,
  duration    TEXT,
  notes       TEXT,
  created_by  TEXT,
  owner_id    TEXT,                                  -- linked property owner (optional)
  owner_name  TEXT,
  contact_method TEXT,                               -- whatsapp|phone|email
  time_log    TEXT,                                  -- JSON array of {start,end,seconds,by} work sessions
  timer_start TEXT,                                  -- ISO timestamp while a timer is running (else empty)
  repeat      TEXT,                                  -- none|daily (recurring)
  series_id   TEXT,                                  -- links recurring daily instances
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(delegate_to, assigned_by);

-- ---- Content ----
CREATE TABLE IF NOT EXISTS content (
  id          TEXT PRIMARY KEY,
  day         TEXT,
  date        TEXT,
  goal        TEXT,
  platform    TEXT,                                  -- JSON array string
  pillar      TEXT,
  type        TEXT,
  description TEXT,
  hook        TEXT,
  caption     TEXT,
  time        TEXT,
  budget      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Owners (CRM) ----
CREATE TABLE IF NOT EXISTS owners (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  gender       TEXT,                                 -- male|female
  phone        TEXT,
  email        TEXT,
  city         TEXT,
  listings     TEXT,
  signed_up    TEXT,                                 -- date the owner signed up
  last_contact TEXT,
  social       TEXT,                                 -- social media profile link / handle
  stage        TEXT DEFAULT 'registered',            -- registered|potential (contacted/pending are derived from last_contact)
  priority     INTEGER DEFAULT 0,
  community    INTEGER DEFAULT 0,                     -- community member flag
  contact_log  TEXT,                                 -- JSON array of {date,summary,next,by}
  notes        TEXT,
  status       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Finance (expenses + income) ----
CREATE TABLE IF NOT EXISTS finance (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL DEFAULT 'expense',   -- expense|income
  name            TEXT,
  date            TEXT,
  amount          TEXT,
  currency        TEXT DEFAULT 'LYD',                -- LYD|USD|EUR|EGP
  rate            TEXT,                              -- manual exchange rate to USD (USD per 1 unit)
  category        TEXT,
  description     TEXT,
  attachment      TEXT,                              -- data URL of receipt (image/pdf)
  attachment_name TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_finance_kind ON finance(kind, date);

-- ---- Owner content calendar (posts + editable dropdown options/links) ----
CREATE TABLE IF NOT EXISTS content_posts (
  id              TEXT PRIMARY KEY,
  day             TEXT,
  date            TEXT,
  goal            TEXT,
  post_to         TEXT,
  idea            TEXT,
  type            TEXT,
  caption         TEXT,
  pub_time        TEXT,
  attachment      TEXT,                              -- data URL or link to the asset
  attachment_name TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS content_opts (
  id         TEXT PRIMARY KEY,
  field      TEXT,                                   -- goal|postTo|idea|type|link
  value      TEXT,                                   -- option text (or link label)
  url        TEXT,                                   -- link URL (for field='link')
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---- Activity days (per-user attendance for the monthly calendar) ----
CREATE TABLE IF NOT EXISTS activity_days (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  user_name  TEXT,
  day        TEXT,                                   -- YYYY-MM-DD the user was active
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user_day ON activity_days(user_id, day);

-- ---- Business Assets (named folders + files stored in R2) ----
CREATE TABLE IF NOT EXISTS asset_folders (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  folder_id   TEXT,
  name        TEXT,
  url         TEXT,                                  -- link to the file (e.g. Google Drive)
  type        TEXT,                                  -- optional hint (image/pdf/video/…)
  size        INTEGER,
  r2_key      TEXT,                                  -- (legacy) object key if stored in R2
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_folder ON assets(folder_id);

-- ---- Customer Service tickets ----
CREATE TABLE IF NOT EXISTS tickets (
  id               TEXT PRIMARY KEY,
  subject          TEXT,
  customer_name    TEXT,
  customer_contact TEXT,                             -- phone/email/chat id
  channel          TEXT DEFAULT 'form',              -- form|whatsapp|email|chat
  status           TEXT DEFAULT 'open',              -- open|pending|resolved|closed
  priority         TEXT DEFAULT 'Medium',
  assignee         TEXT,                             -- user id
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  first_response_at TEXT,
  resolved_at      TEXT,
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL,
  sender     TEXT NOT NULL,                          -- customer|agent
  agent_id   TEXT,
  body       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_msgs_ticket ON ticket_messages(ticket_id);

-- ---- Presence (current snapshot; live state lives in the Durable Object) ----
CREATE TABLE IF NOT EXISTS presence (
  user_id            TEXT PRIMARY KEY,
  status             TEXT DEFAULT 'offline',         -- online|idle|offline
  current_task       TEXT,
  last_seen          TEXT,
  active_minutes_day INTEGER DEFAULT 0,
  day                TEXT
);

-- ---- Activity log (perf metrics + extended monitoring) ----
CREATE TABLE IF NOT EXISTS activity_log (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ts      TEXT NOT NULL DEFAULT (datetime('now')),
  kind    TEXT NOT NULL,                             -- active|idle|login|logout|task_done|ticket_reply|focus|blur
  meta    TEXT                                       -- JSON (optional; extended monitoring detail)
);
CREATE INDEX IF NOT EXISTS idx_activity_user_ts ON activity_log(user_id, ts);

-- ---- Notifications ----
CREATE TABLE IF NOT EXISTS notifications (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  body    TEXT,
  link    TEXT,
  read    INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);

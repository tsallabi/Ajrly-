/* ============================================================
   Ajrly OS — Cloud schema bootstrap (self-healing)
   ------------------------------------------------------------
   The single source of truth for the D1 schema, as idempotent
   CREATE ... IF NOT EXISTS statements. `ensureSchema(env)` runs them
   once per Worker isolate (so the FIRST request after any deploy
   auto-creates any missing table/index). This prevents the class of
   bug where a new feature's table was never migrated and every write
   silently failed server-side — the table is now created on demand.

   Keep this in sync with db/schema.sql.
   ============================================================ */

export const SCHEMA_STATEMENTS = [
  // users / team
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', active INTEGER NOT NULL DEFAULT 1, monitor_level TEXT NOT NULL DEFAULT 'standard', tz TEXT DEFAULT 'Africa/Tripoli', created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  // tasks
  "CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, priority TEXT DEFAULT 'Medium', status TEXT DEFAULT 'pending', assigned_by TEXT, delegate_to TEXT, due_date TEXT, date TEXT, duration TEXT, notes TEXT, created_by TEXT, owner_id TEXT, owner_name TEXT, contact_method TEXT, time_log TEXT, timer_start TEXT, repeat TEXT, series_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(delegate_to, assigned_by)",
  // content
  "CREATE TABLE IF NOT EXISTS content (id TEXT PRIMARY KEY, day TEXT, date TEXT, goal TEXT, platform TEXT, pillar TEXT, type TEXT, description TEXT, hook TEXT, caption TEXT, time TEXT, budget TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  // owners
  "CREATE TABLE IF NOT EXISTS owners (id TEXT PRIMARY KEY, name TEXT, gender TEXT, phone TEXT, email TEXT, city TEXT, listings TEXT, signed_up TEXT, last_contact TEXT, social TEXT, stage TEXT DEFAULT 'registered', priority INTEGER DEFAULT 0, community INTEGER DEFAULT 0, contact_log TEXT, notes TEXT, status TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  // finance
  "CREATE TABLE IF NOT EXISTS finance (id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'expense', name TEXT, date TEXT, amount TEXT, currency TEXT DEFAULT 'LYD', rate TEXT, category TEXT, paid_to TEXT, description TEXT, attachment TEXT, attachment_name TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_finance_kind ON finance(kind, date)",
  // owner content calendar
  "CREATE TABLE IF NOT EXISTS content_posts (id TEXT PRIMARY KEY, day TEXT, date TEXT, goal TEXT, post_to TEXT, idea TEXT, type TEXT, caption TEXT, pub_time TEXT, attachment TEXT, attachment_name TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS content_opts (id TEXT PRIMARY KEY, field TEXT, value TEXT, url TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  // notebook pages (flippable pages with text + inline images)
  "CREATE TABLE IF NOT EXISTS notebook (id TEXT PRIMARY KEY, title TEXT, date TEXT, body TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  // collaborations (company outreach pipeline)
  "CREATE TABLE IF NOT EXISTS collaborations (id TEXT PRIMARY KEY, company_name TEXT, company_location TEXT, owner_name TEXT, company_email TEXT, company_phone TEXT, owner_phone TEXT, details TEXT, replied INTEGER DEFAULT 0, stage TEXT DEFAULT 'contacted', offer_type TEXT, offer_amount TEXT, offer_unit TEXT, offer_valid_type TEXT, offer_valid_until TEXT, agreed_at TEXT, rejected_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  // activity days (attendance)
  "CREATE TABLE IF NOT EXISTS activity_days (id TEXT PRIMARY KEY, user_id TEXT, user_name TEXT, day TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_activity_user_day ON activity_days(user_id, day)",
  // business assets
  "CREATE TABLE IF NOT EXISTS asset_folders (id TEXT PRIMARY KEY, name TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, folder_id TEXT, name TEXT, url TEXT, type TEXT, size INTEGER, r2_key TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_assets_folder ON assets(folder_id)",
  // tickets
  "CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, subject TEXT, customer_name TEXT, customer_contact TEXT, channel TEXT DEFAULT 'form', status TEXT DEFAULT 'open', priority TEXT DEFAULT 'Medium', assignee TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), first_response_at TEXT, resolved_at TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)",
  "CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee)",
  "CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, sender TEXT NOT NULL, agent_id TEXT, body TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_msgs_ticket ON ticket_messages(ticket_id)",
  // presence snapshot
  "CREATE TABLE IF NOT EXISTS presence (user_id TEXT PRIMARY KEY, status TEXT DEFAULT 'offline', current_task TEXT, last_seen TEXT, active_minutes_day INTEGER DEFAULT 0, day TEXT)",
  // activity log
  "CREATE TABLE IF NOT EXISTS activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ts TEXT NOT NULL DEFAULT (datetime('now')), kind TEXT NOT NULL, meta TEXT)",
  "CREATE INDEX IF NOT EXISTS idx_activity_user_ts ON activity_log(user_id, ts)",
  // notifications
  "CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, body TEXT, link TEXT, read INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))",
  "CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read)",
];

/* Column migrations for tables created BEFORE a column was added. CREATE TABLE
   IF NOT EXISTS never alters an existing table, so an older `tasks`/`owners`
   table can be missing newer columns (e.g. time_log, timer_start) — which made
   timer data silently fail to persist. SQLite has no "ADD COLUMN IF NOT EXISTS",
   so these throw when the column already exists; ensureSchema ignores per-
   statement errors, making them effectively idempotent. */
export const SCHEMA_ALTERS = [
  // tasks — fields added after the original table
  "ALTER TABLE tasks ADD COLUMN created_by TEXT",
  "ALTER TABLE tasks ADD COLUMN owner_id TEXT",
  "ALTER TABLE tasks ADD COLUMN owner_name TEXT",
  "ALTER TABLE tasks ADD COLUMN contact_method TEXT",
  "ALTER TABLE tasks ADD COLUMN time_log TEXT",
  "ALTER TABLE tasks ADD COLUMN timer_start TEXT",
  "ALTER TABLE tasks ADD COLUMN repeat TEXT",
  "ALTER TABLE tasks ADD COLUMN series_id TEXT",
  // owners — fields added after the original table
  "ALTER TABLE owners ADD COLUMN social TEXT",
  "ALTER TABLE owners ADD COLUMN community INTEGER DEFAULT 0",
  "ALTER TABLE owners ADD COLUMN contact_log TEXT",
  // finance — paid_to / rate added later
  "ALTER TABLE finance ADD COLUMN paid_to TEXT",
  "ALTER TABLE finance ADD COLUMN rate TEXT",
];

/* Run the schema once per isolate. Cached as a promise so concurrent
   first-requests don't double-run. Uses env.DB directly (NOT the db.js
   helpers) to avoid recursion. Per-statement errors are ignored so one
   bad statement can't block the rest. No-op when D1 isn't bound. */
let _ensured = null;
export function ensureSchema(env) {
  if (!env || !env.DB) return Promise.resolve(false);
  if (_ensured) return _ensured;
  _ensured = (async () => {
    for (const sql of SCHEMA_STATEMENTS) {
      try { await env.DB.prepare(sql).run(); } catch (_) { /* ignore individual */ }
    }
    // add any columns missing from pre-existing tables (errors = already there)
    for (const sql of SCHEMA_ALTERS) {
      try { await env.DB.prepare(sql).run(); } catch (_) { /* column exists → ignore */ }
    }
    return true;
  })();
  return _ensured;
}

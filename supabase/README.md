# Ajrly OS — Supabase backend

Optional Postgres backend for Ajrly OS. The app works fully on
`localStorage` without it; configuring Supabase adds auth, roles, and
shared/synced data.

## Files (run in this order)

| File           | Purpose                                                   |
|----------------|-----------------------------------------------------------|
| `schema.sql`   | Tables, enums, triggers, indexes. Run **first**.          |
| `policies.sql` | Enables RLS and defines role-based access. Run **second**. |
| `seed.sql`     | Inserts the 7 demo tasks + 6 content posts. Optional.     |

## Quick start

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor** and run each file in order: `schema.sql`,
   `policies.sql`, `seed.sql`.
3. In **Project Settings → API**, copy the **Project URL** and the
   **anon public** key.
4. Open the Ajrly app, go to the **Account** page, paste both values,
   and save. (Or set `window.AJRLY_CONFIG = { url, anonKey }` in
   `index.html`.)
5. Create a user in **Authentication → Users**. A `profiles` row is
   created automatically with role `member`. Promote to `admin` /
   `manager` by editing `profiles.role` in the Table editor.

## Schema overview

- `profiles` — one row per `auth.users` user. Holds `full_name` and
  `role` (`admin` / `manager` / `member` / `viewer`). Auto-created by a
  trigger on signup.
- `tasks` — mirrors the Task shape; enums for `priority` and `status`.
- `content_posts` — mirrors the Content shape; `platform` is `text[]`.
- `owners` — mirrors the Owner shape; enum `stage` for the CRM pipeline.

All write tables carry `created_by uuid` (for member-level RLS) plus
`created_at` / `updated_at` (auto-maintained by triggers).

## Role model (enforced by RLS)

| Role     | Read | Write                                                        |
|----------|------|-------------------------------------------------------------|
| admin    | all  | full insert/update/delete on everything                     |
| manager  | all  | full insert/update/delete on everything                     |
| member   | all  | insert; update/delete own rows (`created_by`) and, for tasks, rows where `assigned_by`/`delegate_to` = their name |
| viewer   | all  | none                                                         |

`current_role()` and `current_full_name()` are `SECURITY DEFINER`
helpers used by the policies.

## Security

- The **anon key is public** — it is meant to ship in the browser.
- RLS policies are the real access guard; keep them enabled.
- **Never** expose the `service_role` key in client code.

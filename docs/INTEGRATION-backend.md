# Backend integration — Supabase (optional)

This document is for the **coordinator** wiring the optional Supabase
backend into Ajrly OS. The backend is fully optional and degrades
gracefully: with nothing configured, the app runs exactly as before on
`localStorage`.

## What was added (backend agent's files)

```
supabase/schema.sql            Postgres tables, enums, triggers, indexes
supabase/policies.sql          RLS + role-based access policies
supabase/seed.sql              7 tasks + 6 content posts seed
supabase/README.md             Setup runbook
assets/js/supabaseClient.js    Lazy client: getSupabase(), isConfigured(), saveConfig()...
assets/js/auth.js              signIn/signOut/getSession/currentUser/getRole/onChange...
assets/js/dataRemote.js        dbRemote: async mirror of the db API (Supabase-backed)
assets/js/modules/account.js   Account page (setup / login / profile + team)
.env.example                   Documented env vars
```

None of the shared files (`index.html`, `app.js`, `data.js`, `i18n.js`,
`registry.js`, `styles.css`, `README.md`, `netlify.toml`) were modified.

## Setting up the Supabase project

1. Create a project at <https://supabase.com>.
2. SQL Editor → run, in order: `schema.sql`, `policies.sql`, `seed.sql`.
3. Settings → API → copy **Project URL** and **anon public** key.
4. Create users (Authentication → Users). Each gets a `profiles` row
   automatically (role `member`). Edit `profiles.role` to promote to
   `admin` / `manager`, or set `viewer`.

## Configuring the app (no code needed)

Two ways, in priority order:

1. **In `index.html`** (if you choose to add it), before the app module:
   ```html
   <script>
     window.AJRLY_CONFIG = {
       url: "https://YOUR-ref.supabase.co",
       anonKey: "your-anon-public-key",
     };
   </script>
   ```
2. **In-app**, via the **Account** page — paste URL + anon key; they are
   saved to `localStorage` (`ajrly_sb_url` / `ajrly_sb_key`).

The Account module (`modules/account.js`) is self-registering and needs
no wiring — it already appears in the nav. It shows the setup card when
unconfigured, a login form when configured-but-logged-out, and the
profile + team panel when signed in.

## Role model

| Role     | Read | Write                                                  |
|----------|------|--------------------------------------------------------|
| admin    | all  | everything                                             |
| manager  | all  | everything                                             |
| member   | all  | own rows; tasks assigned/delegated to their name       |
| viewer   | all  | nothing                                                |

Enforced server-side by RLS in `policies.sql`.

## Wiring data to the remote backend (OPTIONAL)

The app currently calls the synchronous `db` from `data.js`. To move
reads/writes to Supabase, use the **async** mirror `dbRemote` from
`dataRemote.js`. It exposes the same operations as Promises and maps
`snake_case` ↔ `camelCase` automatically:

```js
import dbRemote, { isConfigured } from "./dataRemote.js";

// Tasks
await dbRemote.listTasks();              // -> Task[]
await dbRemote.addTask(task);            // -> Task
await dbRemote.updateTask(id, patch);    // -> Task
await dbRemote.removeTask(id);           // -> true

// content_posts: listContent/addContent/updateContent/removeContent
// owners:        listOwners/addOwner/updateOwner/removeOwner
await dbRemote.loadAll();                // -> { tasks, content, owners }
```

### Recommended pattern: hydrate-then-cache

Because `app.js` renders synchronously off `db.tasks` / `db.content` /
`db.owners`, the lowest-risk integration keeps `db` as the live store and
syncs it from Supabase, **without modifying `app.js` or `data.js`**:

1. On load, if `isConfigured()` and a session exists, call
   `dbRemote.loadAll()` and seed the local store. `data.js` does not
   expose a setter, so the simplest approach is to add a tiny
   coordinator shim module (your file, not the backend agent's) that:
   - imports `{ db }` from `data.js` and `dbRemote` from `dataRemote.js`,
   - replaces the local arrays in place, e.g.
     `db.tasks.splice(0, db.tasks.length, ...remote.tasks)`,
   - then calls `window.AjrlyOS.render()`.
2. On each mutation, mirror the call to `dbRemote` (fire-and-forget or
   awaited) so the change is persisted remotely too. You can wrap
   `db.addTask` etc. from the shim, since they are plain object methods.

This keeps the synchronous render path intact and avoids touching
protected files. If you prefer a full async rewrite of the data path,
swap callers to `dbRemote` directly and `await` them.

### Reacting to auth

`auth.onChange(cb)` fires on sign-in/out. The Account page already
re-renders on auth change. If you add the hydrate shim, also call your
loader inside this callback so data refreshes when a user signs in.

## Security notes

- The **anon key is public** and meant to ship in the browser. Do not
  treat it as a secret.
- **RLS is the guard.** Keep `policies.sql` applied; without RLS the
  anon key would expose all data.
- **Never** put the `service_role` key in client code, `AJRLY_CONFIG`,
  or `index.html`. Keep it server-side only (see `.env.example`).

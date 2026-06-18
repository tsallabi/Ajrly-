-- ============================================================
-- Ajrly OS — Row Level Security (RLS) policies
-- Run this AFTER schema.sql.
--
-- Role model (stored in profiles.role):
--   admin   => full read + write on everything
--   manager => full read + write on everything
--   member  => read everything; write rows they own
--              (created_by = auth.uid()) OR rows assigned to /
--              delegated to their profile full_name
--   viewer  => read only
--
-- The anon/public key is safe to ship to the browser: these
-- policies are the real guard. NEVER expose the service_role key.
-- ============================================================

-- ---------- Helper: current user's role (SECURITY DEFINER) ----------
-- SECURITY DEFINER so it can read profiles regardless of the caller's
-- own RLS, avoiding recursive policy evaluation.
create or replace function current_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- Helper: current user's display name ----------
create or replace function current_full_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select full_name from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- profiles
-- ============================================================
alter table profiles enable row level security;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated
  using (true);

-- A user may update their own profile (but the role column should be
-- managed by an admin; tighten further if you expose role editing).
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins & managers may manage any profile (e.g. assign roles).
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles
  for all to authenticated
  using (public.current_role() in ('admin', 'manager'))
  with check (public.current_role() in ('admin', 'manager'));

-- ============================================================
-- tasks
-- ============================================================
alter table tasks enable row level security;

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks
  for select to authenticated
  using (true);

-- admin & manager: full write
drop policy if exists tasks_write_mgr on tasks;
create policy tasks_write_mgr on tasks
  for all to authenticated
  using (public.current_role() in ('admin', 'manager'))
  with check (public.current_role() in ('admin', 'manager'));

-- member: insert anything (created_by stamped to self)
drop policy if exists tasks_insert_member on tasks;
create policy tasks_insert_member on tasks
  for insert to authenticated
  with check (
    public.current_role() = 'member'
    and (created_by = auth.uid() or created_by is null)
  );

-- member: update rows they own or are assigned/delegated to
drop policy if exists tasks_update_member on tasks;
create policy tasks_update_member on tasks
  for update to authenticated
  using (
    public.current_role() = 'member'
    and (
      created_by = auth.uid()
      or assigned_by = public.current_full_name()
      or delegate_to = public.current_full_name()
    )
  )
  with check (public.current_role() = 'member');

-- member: delete rows they own or are assigned/delegated to
drop policy if exists tasks_delete_member on tasks;
create policy tasks_delete_member on tasks
  for delete to authenticated
  using (
    public.current_role() = 'member'
    and (
      created_by = auth.uid()
      or assigned_by = public.current_full_name()
      or delegate_to = public.current_full_name()
    )
  );

-- ============================================================
-- content_posts
-- ============================================================
alter table content_posts enable row level security;

drop policy if exists content_select on content_posts;
create policy content_select on content_posts
  for select to authenticated
  using (true);

drop policy if exists content_write_mgr on content_posts;
create policy content_write_mgr on content_posts
  for all to authenticated
  using (public.current_role() in ('admin', 'manager'))
  with check (public.current_role() in ('admin', 'manager'));

drop policy if exists content_insert_member on content_posts;
create policy content_insert_member on content_posts
  for insert to authenticated
  with check (
    public.current_role() = 'member'
    and (created_by = auth.uid() or created_by is null)
  );

drop policy if exists content_update_member on content_posts;
create policy content_update_member on content_posts
  for update to authenticated
  using (public.current_role() = 'member' and created_by = auth.uid())
  with check (public.current_role() = 'member');

drop policy if exists content_delete_member on content_posts;
create policy content_delete_member on content_posts
  for delete to authenticated
  using (public.current_role() = 'member' and created_by = auth.uid());

-- ============================================================
-- owners
-- ============================================================
alter table owners enable row level security;

drop policy if exists owners_select on owners;
create policy owners_select on owners
  for select to authenticated
  using (true);

drop policy if exists owners_write_mgr on owners;
create policy owners_write_mgr on owners
  for all to authenticated
  using (public.current_role() in ('admin', 'manager'))
  with check (public.current_role() in ('admin', 'manager'));

drop policy if exists owners_insert_member on owners;
create policy owners_insert_member on owners
  for insert to authenticated
  with check (
    public.current_role() = 'member'
    and (created_by = auth.uid() or created_by is null)
  );

drop policy if exists owners_update_member on owners;
create policy owners_update_member on owners
  for update to authenticated
  using (public.current_role() = 'member' and created_by = auth.uid())
  with check (public.current_role() = 'member');

drop policy if exists owners_delete_member on owners;
create policy owners_delete_member on owners
  for delete to authenticated
  using (public.current_role() = 'member' and created_by = auth.uid());

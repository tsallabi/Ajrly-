/* ============================================================
   Ajrly OS — Auth helpers (Supabase, optional)
   Every function is null-safe / no-op when Supabase is not
   configured, so the rest of the app never has to branch.
   ============================================================ */

import { getSupabase, isConfigured } from "./supabaseClient.js";

export { isConfigured };

/**
 * Sign in with email + password.
 * @returns {Promise<{data:any, error:({message:string}|null)}>}
 */
export async function signIn(email, password) {
  const sb = await getSupabase();
  if (!sb) return { data: null, error: { message: "Supabase is not configured." } };
  const { data, error } = await sb.auth.signInWithPassword({
    email: (email || "").trim(),
    password: password || "",
  });
  return { data, error };
}

/** Sign the current user out. No-op when unconfigured. */
export async function signOut() {
  const sb = await getSupabase();
  if (!sb) return { error: null };
  const { error } = await sb.auth.signOut();
  return { error };
}

/** Current session object, or null. */
export async function getSession() {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data ? data.session : null;
}

/** Current authenticated user, or null. */
export async function currentUser() {
  const session = await getSession();
  return session ? session.user : null;
}

/**
 * The signed-in user's profile (id, full_name, role) or null.
 * Reads the `profiles` table.
 */
export async function getProfile() {
  const sb = await getSupabase();
  if (!sb) return null;
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data;
}

/** The signed-in user's role ('admin'|'manager'|'member'|'viewer') or null. */
export async function getRole() {
  const profile = await getProfile();
  return profile ? profile.role : null;
}

/** True if the current role may write (admin or manager). */
export async function canManage() {
  const role = await getRole();
  return role === "admin" || role === "manager";
}

/**
 * List all profiles (team). Visible to any authenticated user per RLS,
 * but callers typically gate the UI to admin/manager.
 */
export async function listProfiles() {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

/**
 * Subscribe to auth state changes.
 * @param {(event:string, session:any)=>void} cb
 * @returns {Function} unsubscribe (no-op when unconfigured)
 */
export function onChange(cb) {
  let unsubscribe = () => {};
  // getSupabase() is async (lazy lib load); wire up once ready, but return
  // a synchronous unsubscribe handle immediately.
  getSupabase().then((sb) => {
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      try { cb(event, session); } catch (e) { /* ignore */ }
    });
    unsubscribe = () => {
      try { data.subscription.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }).catch(() => {});
  return () => unsubscribe();
}

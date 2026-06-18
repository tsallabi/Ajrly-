/* ============================================================
   Ajrly OS — Supabase client (lazy, optional)
   No build step: imports the official client from esm.sh.

   Configuration is read from (in priority order):
     1. window.AJRLY_CONFIG = { url, anonKey }   (set in index.html)
     2. localStorage 'ajrly_sb_url' / 'ajrly_sb_key' (set via Account page)

   If neither is present the app degrades gracefully: getSupabase()
   returns null and the app keeps running on localStorage.
   ============================================================ */

/* The Supabase client library is loaded LAZILY (dynamic import) only when a
   user has actually configured a backend. This keeps the app's initial load
   instant, fully offline-capable, and free of any network dependency. */
let _createClient = null;
async function ensureLib() {
  if (!_createClient) {
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    _createClient = mod.createClient;
  }
  return _createClient;
}

const LS_URL = "ajrly_sb_url";
const LS_KEY = "ajrly_sb_key";

let _client = null;       // cached client
let _signature = null;    // url+key used to build the cached client

/** Read config from window or localStorage. Returns {url, anonKey} or nulls. */
export function getConfig() {
  const cfg = (typeof window !== "undefined" && window.AJRLY_CONFIG) || {};
  let url = cfg.url || "";
  let anonKey = cfg.anonKey || "";
  if ((!url || !anonKey) && typeof localStorage !== "undefined") {
    url = url || localStorage.getItem(LS_URL) || "";
    anonKey = anonKey || localStorage.getItem(LS_KEY) || "";
  }
  return { url: url.trim(), anonKey: anonKey.trim() };
}

/** True when both a URL and anon key are available. */
export function isConfigured() {
  const { url, anonKey } = getConfig();
  return Boolean(url && anonKey);
}

/** Persist config entered through the Account page. */
export function saveConfig(url, anonKey) {
  try {
    localStorage.setItem(LS_URL, (url || "").trim());
    localStorage.setItem(LS_KEY, (anonKey || "").trim());
  } catch (e) { /* ignore quota / private mode */ }
  // Force the client to be rebuilt on next access.
  _client = null;
  _signature = null;
}

/** Remove stored config (does not touch window.AJRLY_CONFIG). */
export function clearConfig() {
  try {
    localStorage.removeItem(LS_URL);
    localStorage.removeItem(LS_KEY);
  } catch (e) { /* ignore */ }
  _client = null;
  _signature = null;
}

/**
 * Lazily create (and cache) the Supabase client.
 * @returns {import("https://esm.sh/@supabase/supabase-js@2").SupabaseClient | null}
 */
export async function getSupabase() {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;

  const sig = url + "|" + anonKey;
  if (_client && _signature === sig) return _client;

  try {
    const createClient = await ensureLib();
    _client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "ajrly_sb_auth",
      },
    });
    _signature = sig;
    return _client;
  } catch (e) {
    console.error("[Ajrly] Failed to create Supabase client:", e);
    _client = null;
    _signature = null;
    return null;
  }
}

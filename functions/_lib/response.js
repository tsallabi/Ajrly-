/* ============================================================
   Ajrly OS — Cloud API: JSON Response helpers (WS-A, shared _lib)
   Web APIs only. All helpers return a Response with JSON body and
   Content-Type: application/json. CORS headers are same-origin safe
   (the SPA and the API are served from the same Pages project, so a
   permissive CORS header here is harmless and keeps tooling happy).
   ============================================================ */

export const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

/* Success / arbitrary payload. `init` may add status + extra headers
   (e.g. a Set-Cookie). Header values in init override defaults. */
export function json(data, init = {}) {
  const { status = 200, headers = {} } = init;
  return new Response(JSON.stringify(data == null ? {} : data), {
    status,
    headers: { ...HEADERS, ...headers },
  });
}

/* Client error: { error: code } with a status (default 400). */
export function bad(code, status = 400) {
  return json({ error: String(code || "bad_request") }, { status });
}

/* 401 — no/invalid session. */
export function unauthorized() {
  return json({ error: "unauthorized" }, { status: 401 });
}

/* 403 — authenticated but not permitted. */
export function forbidden() {
  return json({ error: "forbidden" }, { status: 403 });
}

/* 500 — never leak internals to the client; log server-side. */
export function serverError(e) {
  try { console.error("[api] server_error", e && (e.stack || e.message || e)); } catch (_) {}
  return json({ error: "server_error" }, { status: 500 });
}

/* CORS preflight helper. */
export function noContent() {
  return new Response(null, { status: 204, headers: HEADERS });
}

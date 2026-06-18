/* ============================================================
   Ajrly OS — Cloud API: CRUD endpoint factory (WS-A, _lib)
   Builds onRequest* handlers for a resource with server-side role
   enforcement per the contract:
     GET    -> any authenticated user
     POST   -> write   (+ assign if it sets an assignment field)
     PATCH  -> write   (+ assign if it sets an assignment field)
     DELETE -> del
   ============================================================ */

import { json, bad, unauthorized, forbidden, serverError, noContent } from "./response.js";
import { getUser, can } from "./auth.js";
import {
  listResource, createResource, updateResource, deleteResource,
} from "./resource.js";

/* Build the collection handlers (GET list, POST create). */
export function collection(cfg, opts = {}) {
  const assignKeys = opts.assignKeys || []; // keys that count as "assign"
  const required = opts.required || [];     // keys required on create

  return {
    onRequestOptions() { return noContent(); },

    async onRequestGet(context) {
      try {
        const me = await getUser(context.request, context.env);
        if (!me) return unauthorized();
        const rows = await listResource(context.env, cfg);
        return json({ [cfg.table]: rows });
      } catch (e) { return serverError(e); }
    },

    async onRequestPost(context) {
      try {
        const me = await getUser(context.request, context.env);
        if (!me) return unauthorized();
        if (!can(me, "write")) return forbidden();

        let body;
        try { body = await context.request.json(); } catch (_) { return bad("invalid_json"); }
        for (const k of required) {
          if (!String(body[k] || "").trim()) return bad("missing");
        }
        if (assignsSomething(body, assignKeys) && !can(me, "assign")) return forbidden();

        const row = await createResource(context.env, cfg, body);
        return json({ item: row }, { status: 201 });
      } catch (e) { return serverError(e); }
    },
  };
}

/* Build the item handlers (PATCH update, DELETE remove). */
export function item(cfg, opts = {}) {
  const assignKeys = opts.assignKeys || [];

  return {
    onRequestOptions() { return noContent(); },

    async onRequestPatch(context) {
      try {
        const me = await getUser(context.request, context.env);
        if (!me) return unauthorized();
        if (!can(me, "write")) return forbidden();

        let body;
        try { body = await context.request.json(); } catch (_) { return bad("invalid_json"); }
        if (assignsSomething(body, assignKeys) && !can(me, "assign")) return forbidden();

        const row = await updateResource(context.env, cfg, context.params.id, body);
        if (!row) return bad("notfound", 404);
        return json({ item: row });
      } catch (e) { return serverError(e); }
    },

    async onRequestDelete(context) {
      try {
        const me = await getUser(context.request, context.env);
        if (!me) return unauthorized();
        if (!can(me, "del")) return forbidden();
        const ok = await deleteResource(context.env, cfg, context.params.id);
        if (!ok) return bad("notfound", 404);
        return json({ ok: true });
      } catch (e) { return serverError(e); }
    },
  };
}

function assignsSomething(body, keys) {
  for (const k of keys) {
    if (body[k] !== undefined && String(body[k] || "").trim() !== "") return true;
  }
  return false;
}

/* /api/assets  GET (list all asset metadata) */
import { json, unauthorized, serverError, noContent } from "../../_lib/response.js";
import { getUser } from "../../_lib/auth.js";
import { listResource, ASSETS } from "../../_lib/resource.js";

export function onRequestOptions() { return noContent(); }

export async function onRequestGet(context) {
  try {
    const me = await getUser(context.request, context.env);
    if (!me) return unauthorized();
    const rows = await listResource(context.env, ASSETS);
    return json({ assets: rows });
  } catch (e) { return serverError(e); }
}

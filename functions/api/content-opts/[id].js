/* /api/content-opts/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { CONTENT_OPTS } from "../../_lib/resource.js";

const h = item(CONTENT_OPTS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

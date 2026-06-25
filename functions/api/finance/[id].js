/* /api/finance/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { FINANCE } from "../../_lib/resource.js";

const h = item(FINANCE, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

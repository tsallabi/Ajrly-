/* /api/owners/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { OWNERS } from "../../_lib/resource.js";

const h = item(OWNERS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

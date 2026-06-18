/* /api/content/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { CONTENT } from "../../_lib/resource.js";

const h = item(CONTENT, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

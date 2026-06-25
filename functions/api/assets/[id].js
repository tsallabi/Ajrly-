/* /api/assets/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { ASSETS } from "../../_lib/resource.js";

const h = item(ASSETS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

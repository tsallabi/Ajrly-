/* /api/collaborations/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { COLLABS } from "../../_lib/resource.js";

const h = item(COLLABS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

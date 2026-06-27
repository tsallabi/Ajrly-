/* /api/notebook/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { NOTEBOOK } from "../../_lib/resource.js";

const h = item(NOTEBOOK, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

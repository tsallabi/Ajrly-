/* /api/budgets/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { BUDGETS } from "../../_lib/resource.js";

const h = item(BUDGETS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

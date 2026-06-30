/* /api/goals/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { GOALS } from "../../_lib/resource.js";

const h = item(GOALS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

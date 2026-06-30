/* /api/city-targets/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { CITY_TARGETS } from "../../_lib/resource.js";

const h = item(CITY_TARGETS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

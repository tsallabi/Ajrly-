/* /api/property-types/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { PROPERTY_TYPES } from "../../_lib/resource.js";

const h = item(PROPERTY_TYPES, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

/* /api/content-posts/:id  PATCH (write) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { CONTENT_POSTS } from "../../_lib/resource.js";

const h = item(CONTENT_POSTS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

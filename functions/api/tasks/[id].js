/* /api/tasks/:id  PATCH (write; assign if delegateTo set) | DELETE (del) */
import { item } from "../../_lib/crud.js";
import { TASKS } from "../../_lib/resource.js";

const h = item(TASKS, { assignKeys: ["delegateTo"] });
export const onRequestOptions = h.onRequestOptions;
export const onRequestPatch = h.onRequestPatch;
export const onRequestDelete = h.onRequestDelete;

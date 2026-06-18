/* /api/tasks  GET (list) | POST (create, write; assign if delegateTo set) */
import { collection } from "../../_lib/crud.js";
import { TASKS } from "../../_lib/resource.js";

const h = collection(TASKS, { required: ["title"], assignKeys: ["delegateTo"] });
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

/* /api/goals  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { GOALS } from "../../_lib/resource.js";

const h = collection(GOALS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

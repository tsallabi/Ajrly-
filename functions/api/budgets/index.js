/* /api/budgets  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { BUDGETS } from "../../_lib/resource.js";

const h = collection(BUDGETS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

/* /api/finance  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { FINANCE } from "../../_lib/resource.js";

const h = collection(FINANCE, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

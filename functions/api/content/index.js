/* /api/content  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { CONTENT } from "../../_lib/resource.js";

const h = collection(CONTENT, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

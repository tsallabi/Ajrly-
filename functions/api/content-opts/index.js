/* /api/content-opts  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { CONTENT_OPTS } from "../../_lib/resource.js";

const h = collection(CONTENT_OPTS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

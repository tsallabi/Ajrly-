/* /api/content-posts  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { CONTENT_POSTS } from "../../_lib/resource.js";

const h = collection(CONTENT_POSTS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

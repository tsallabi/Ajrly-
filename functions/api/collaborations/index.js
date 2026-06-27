/* /api/collaborations  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { COLLABS } from "../../_lib/resource.js";

const h = collection(COLLABS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

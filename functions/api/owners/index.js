/* /api/owners  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { OWNERS } from "../../_lib/resource.js";

const h = collection(OWNERS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

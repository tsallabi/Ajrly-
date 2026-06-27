/* /api/notebook  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { NOTEBOOK } from "../../_lib/resource.js";

const h = collection(NOTEBOOK, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

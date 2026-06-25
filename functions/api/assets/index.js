/* /api/assets  GET (list) | POST (create link, write) */
import { collection } from "../../_lib/crud.js";
import { ASSETS } from "../../_lib/resource.js";

const h = collection(ASSETS, { required: ["name"] });
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

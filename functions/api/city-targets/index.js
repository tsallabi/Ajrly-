/* /api/city-targets  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { CITY_TARGETS } from "../../_lib/resource.js";

const h = collection(CITY_TARGETS, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

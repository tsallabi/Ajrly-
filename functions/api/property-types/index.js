/* /api/property-types  GET (list) | POST (create, write) */
import { collection } from "../../_lib/crud.js";
import { PROPERTY_TYPES } from "../../_lib/resource.js";

const h = collection(PROPERTY_TYPES, {});
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

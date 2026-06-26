/* /api/activity  GET (list) | POST (record an active day, write) */
import { collection } from "../../_lib/crud.js";
import { ACTIVITY } from "../../_lib/resource.js";

const h = collection(ACTIVITY, { required: ["day"] });
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

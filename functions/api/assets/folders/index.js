/* /api/assets/folders  GET (list) | POST (create, write) */
import { collection } from "../../../_lib/crud.js";
import { ASSET_FOLDERS } from "../../../_lib/resource.js";

const h = collection(ASSET_FOLDERS, { required: ["name"] });
export const onRequestOptions = h.onRequestOptions;
export const onRequestGet = h.onRequestGet;
export const onRequestPost = h.onRequestPost;

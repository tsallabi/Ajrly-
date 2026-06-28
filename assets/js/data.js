/* ============================================================
   Ajrly OS — Data layer (seed + localStorage persistence)
   Seed data is extracted from the original Google Sheet.
   ============================================================ */

const STORE_KEY = "ajrly_os_v1";

/* ---- Seed: Tasks (from the sheet's task tabs) ---- */
const seedTasks = [
  { id: "t1", title: "Write article about how to attract more customers to your link", priority: "High", description: "Highlight the correct way to use the platform/link", assignedBy: "Asel", date: "2026-06-14", dueDate: "2026-06-16", status: "complete", delegateTo: "", duration: "", notes: "" },
  { id: "t2", title: "Offer carpet cleaning service @ 10% OFF", priority: "Medium", description: "Offer a carpet cleaning service to highlight the importance of cleanliness and high quality services", assignedBy: "", date: "2026-06-14", dueDate: "", status: "pending", delegateTo: "", duration: "", notes: "" },
  { id: "t3", title: "Fill Sheet Information", priority: "Medium", description: "Add property owner names, phone, email from the ajrly website.", assignedBy: "Kenda", date: "2026-06-14", dueDate: "2026-06-21", status: "pending", delegateTo: "", duration: "", notes: "" },
  { id: "t4", title: "Create a Content Plan for WhatsApp Owner Channel/Community", priority: "High", description: "Using the sheet write out posts, pick where the content will be posted and assign posting dates and times.", assignedBy: "Kenda", date: "2026-06-14", dueDate: "2026-06-16", status: "overdue", delegateTo: "", duration: "", notes: "" },
  { id: "t5", title: "Competitor Analysis - Owner Systems", priority: "High", description: "Compare Top 4 Competitor Owner system, commissions, interface, customer service etc.", assignedBy: "Kenda", date: "2026-06-15", dueDate: "2026-06-21", status: "pending", delegateTo: "", duration: "", notes: "" },
  { id: "t6", title: "Plan Content Pillars", priority: "Low", description: "Explain type of content associated with each content pillar.", assignedBy: "", date: "2026-06-15", dueDate: "2026-06-15", status: "complete", delegateTo: "", duration: "00:30", notes: "" },
  { id: "t7", title: "Facebook Comments", priority: "Low", description: "Reply to all pending facebook comments", assignedBy: "", date: "2026-06-15", dueDate: "2026-06-21", status: "closed", delegateTo: "Raneem", duration: "", notes: "" },
];

/* ---- Seed: Content calendar (from جدول المحتوى) ---- */
const seedContent = [
  { id: "c1", day: "Tuesday", date: "2026-06-16", goal: "Property Discovery & Inspiration", platform: ["Instagram", "Facebook"], pillar: "Property Discovery", type: "Carousel", description: "", hook: "", caption: "", time: "", budget: "" },
  { id: "c2", day: "Tuesday", date: "2026-06-16", goal: "Community Building", platform: ["Instagram", "Facebook"], pillar: "Ask Ajrly", type: "Story", description: "Question Story Box.", hook: "", caption: "أسأل أجرلي !", time: "", budget: "" },
  { id: "c3", day: "Wednesday", date: "2026-06-17", goal: "Trust & Credibility", platform: ["Instagram", "Facebook"], pillar: "Brand Story & Trust", type: "Single Graphic", description: "How deposits work in Ajrly.", hook: "", caption: "", time: "", budget: "" },
  { id: "c4", day: "Thursday", date: "2026-06-18", goal: "Community Building", platform: ["Instagram", "Facebook", "WhatsApp"], pillar: "Building Community", type: "Story", description: "Jummah Prayer Reminder", hook: "", caption: "بايت في الاستراحة ؟ افتح خريطه قوقل و دور اقرب جامع ليك !", time: "21:00", budget: "" },
  { id: "c5", day: "Friday", date: "2026-06-19", goal: "Education & Value", platform: ["Facebook", "Instagram"], pillar: "Rental Etiquette & Experience", type: "Single Graphic", description: "Educate renters about small gestures they can do to ensure the property is clean before they leave.", hook: "", caption: "", time: "", budget: "" },
  { id: "c6", day: "Sunday", date: "2026-06-21", goal: "Education & Value", platform: ["Instagram", "Facebook"], pillar: "Education", type: "Carousel", description: "Red flags to be aware of in property ads.", hook: "", caption: "", time: "", budget: "" },
];

/* ---- Seed: Property owners CRM (schema ready, starts empty per sheet) ---- */
const seedOwners = [];

/* ---- Seed: Finance (expenses + income), starts empty ---- */
const seedFinance = [];

/* ---- Seed: Business Assets (folders + link items), starts empty ---- */
const seedAssetFolders = [];
const seedAssets = [];

/* ---- Seed: Activity days (per-user attendance), starts empty ---- */
const seedActivity = [];

/* ---- Seed: Owner content calendar (posts + editable dropdown options) ---- */
const seedContentPosts = [];
const seedContentOpts = [];

/* ---- Seed: Notebook pages (flippable pages with text/images) ---- */
const seedNotebook = [];

/* ---- Seed: Collaborations (company outreach pipeline) ---- */
const seedCollabs = [];

/* ---- Seed: Budgets (campaign/dev budget planning with cost line-items) ---- */
const seedBudgets = [];

/* ---- Static reference: Content pillars (from Pillar matrix) ---- */
export const PILLARS = [
  { name: "Property Discovery", sub: "Core Product", icon: "🔍", purpose: "Help renters discover properties and inspire bookings." },
  { name: "Property Owners", sub: "Supply Growth", icon: "🤝", purpose: "Attract and educate property owners." },
  { name: "Brand Story & Trust", sub: "Credibility", icon: "💬", purpose: "Build emotional connection and credibility." },
  { name: "Ask Ajrly", sub: "Community Engagement", icon: "❓", purpose: "Create conversation and make Ajrly approachable." },
  { name: "Rental Etiquette & Experience", sub: "Experience", icon: "✨", purpose: "Improve renter behaviour and experience." },
  { name: "Professional Standards", sub: "Before & After", icon: "🧹", purpose: "Show Ajrly's quality difference." },
  { name: "Local Travel & Lifestyle", sub: "Lifestyle", icon: "🌍", purpose: "Sell the experience, not only the property." },
  { name: "Building Community", sub: "Belonging", icon: "🫂", purpose: "Create belonging around Ajrly." },
  { name: "Education", sub: "Rental Knowledge", icon: "🎓", purpose: "Position Ajrly as an expert." },
  { name: "Fun & Brand Personality", sub: "Personality", icon: "🎉", purpose: "Keep the brand human and engaging." },
];

export const CORE_VALUES = ["Simplicity", "Professionalism", "Reliability", "Transparency", "Partnership", "Inclusion", "Practicality", "Connection"];
export const GOALS = ["Community Building", "Education & Value", "Property Discovery & Inspiration", "Trust & Credibility"];
export const TEAM = ["Asel", "Kenda", "Raneem", "Tarek"];
export const STATUSES = ["pending", "progress", "complete", "overdue", "closed"];

/* Owner pipeline tabs:
   Registered ← Contacted ← Pending contact ← Potential (lead funnel) */
export const OWNER_STAGES = ["registered", "contacted", "pending", "potential"];

/* Ajrly platform links (from the original sheet) */
export const LINKS = [
  { label: "Web App", url: "https://app.ajr.ly", icon: "🖥️" },
  { label: "Website", url: "https://ajr.ly", icon: "🌐" },
  { label: "Google Play", url: "https://play.google.com/store/apps/details?id=com.ajrly.app", icon: "🤖" },
  { label: "App Store", url: "https://apps.apple.com/us/app/ajrly", icon: "🍎" },
  { label: "YouTube", url: "https://www.youtube.com/@theajrlyapp", icon: "▶️" },
];

/* ---- Store ---- */
const defaultState = () => ({ tasks: seedTasks, content: seedContent, owners: seedOwners, finance: seedFinance, assetFolders: seedAssetFolders, assets: seedAssets, activity: seedActivity, contentPosts: seedContentPosts, contentOpts: seedContentOpts, notebook: seedNotebook, collabs: seedCollabs, budgets: seedBudgets });

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) }; // merge so new keys (e.g. finance) default
  } catch (e) { /* ignore */ }
  return defaultState();
}

let _lastAutoBackup = 0;
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  // periodic safety snapshot (throttled) — survives cloud sync overwrites
  try {
    const now = Date.now();
    if (now - _lastAutoBackup > 180000) { _lastAutoBackup = now; pushBackup("autosave"); }
  } catch (_) { /* never let backup break a save */ }
}

/* ---- Local backups: timestamped snapshots in a SEPARATE key that cloud
   hydrate never reads or overwrites, so data can always be rolled back. ---- */
const BACKUP_KEY = "ajrly_os_backups";
const MAX_BACKUPS = 10;
function readBackups() {
  try { const r = localStorage.getItem(BACKUP_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}
function writeBackups(list) {
  let arr = list.slice(0, MAX_BACKUPS);
  while (arr.length) { // drop oldest until it fits the quota
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(arr)); return true; }
    catch (_) { arr = arr.slice(0, arr.length - 1); }
  }
  return false;
}
/* strip big data: URLs (receipts/attachments) from backups so the structured
   records always fit; full-fidelity copies come from Export instead. */
function stripHeavy(v) {
  if (Array.isArray(v)) return v.map(stripHeavy);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = stripHeavy(v[k]); return o; }
  if (typeof v === "string" && v.startsWith("data:") && v.length > 2000) return "";
  return v;
}
function pushBackup(reason) {
  let snap; try { snap = stripHeavy(JSON.parse(JSON.stringify(state))); } catch (_) { return false; }
  const counts = {
    finance: (snap.finance || []).length, tasks: (snap.tasks || []).length,
    owners: (snap.owners || []).length, content: (snap.content || []).length,
    contentPosts: (snap.contentPosts || []).length,
  };
  const list = readBackups();
  list.unshift({ ts: new Date().toISOString(), reason: reason || "auto", counts, data: snap });
  return writeBackups(list);
}

const uid = (p) => p + Math.random().toString(36).slice(2, 8);

/* Public API */
export const db = {
  get tasks() { return state.tasks; },
  get content() { return state.content; },
  get owners() { return state.owners; },

  addTask(t) { state.tasks.unshift({ ...t, id: uid("t") }); persist(); },
  updateTask(id, patch) { state.tasks = state.tasks.map(t => t.id === id ? { ...t, ...patch } : t); persist(); },
  removeTask(id) { state.tasks = state.tasks.filter(t => t.id !== id); persist(); },

  addContent(c) { state.content.push({ ...c, id: uid("c") }); persist(); },
  updateContent(id, patch) { state.content = state.content.map(c => c.id === id ? { ...c, ...patch } : c); persist(); },
  removeContent(id) { state.content = state.content.filter(c => c.id !== id); persist(); },

  addOwner(o) { state.owners.push({ ...o, id: uid("o") }); persist(); },
  updateOwner(id, patch) { state.owners = state.owners.map(o => o.id === id ? { ...o, ...patch } : o); persist(); },
  removeOwner(id) { state.owners = state.owners.filter(o => o.id !== id); persist(); },

  get finance() { return state.finance; },
  addFinance(f) { state.finance.unshift({ ...f, id: uid("f") }); persist(); },
  updateFinance(id, patch) { state.finance = state.finance.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeFinance(id) { state.finance = state.finance.filter(x => x.id !== id); persist(); },

  get assetFolders() { return state.assetFolders; },
  addAssetFolder(f) { state.assetFolders.unshift({ ...f, id: uid("af") }); persist(); },
  updateAssetFolder(id, patch) { state.assetFolders = state.assetFolders.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeAssetFolder(id) { state.assetFolders = state.assetFolders.filter(x => x.id !== id); state.assets = state.assets.filter(a => a.folderId !== id); persist(); },

  get assets() { return state.assets; },
  addAsset(a) { state.assets.unshift({ ...a, id: uid("as") }); persist(); },
  updateAsset(id, patch) { state.assets = state.assets.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeAsset(id) { state.assets = state.assets.filter(x => x.id !== id); persist(); },

  get activity() { return state.activity; },
  addActivity(a) { state.activity.unshift({ ...a, id: uid("ac") }); persist(); },

  get contentPosts() { return state.contentPosts; },
  addContentPost(p) { state.contentPosts.unshift({ ...p, id: uid("cp") }); persist(); },
  updateContentPost(id, patch) { state.contentPosts = state.contentPosts.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeContentPost(id) { state.contentPosts = state.contentPosts.filter(x => x.id !== id); persist(); },

  get contentOpts() { return state.contentOpts; },
  addContentOpt(o) { state.contentOpts.unshift({ ...o, id: uid("co") }); persist(); },
  updateContentOpt(id, patch) { state.contentOpts = state.contentOpts.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeContentOpt(id) { state.contentOpts = state.contentOpts.filter(x => x.id !== id); persist(); },

  get notebook() { return state.notebook; },
  addNotebookPage(p) { state.notebook.push({ ...p, id: uid("nb") }); persist(); },
  updateNotebookPage(id, patch) { state.notebook = state.notebook.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeNotebookPage(id) { state.notebook = state.notebook.filter(x => x.id !== id); persist(); },

  get collabs() { return state.collabs; },
  addCollab(c) { state.collabs.unshift({ ...c, id: uid("cl") }); persist(); },
  updateCollab(id, patch) { state.collabs = state.collabs.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeCollab(id) { state.collabs = state.collabs.filter(x => x.id !== id); persist(); },

  get budgets() { return state.budgets; },
  addBudget(b) { state.budgets.unshift({ ...b, id: uid("bg") }); persist(); },
  updateBudget(id, patch) { state.budgets = state.budgets.map(x => x.id === id ? { ...x, ...patch } : x); persist(); },
  removeBudget(id) { state.budgets = state.budgets.filter(x => x.id !== id); persist(); },

  reset() { state = defaultState(); persist(); },
  exportJSON() { return JSON.stringify(state, null, 2); },

  /* ---- backup / restore ---- */
  backup(reason) { return pushBackup(reason); },
  listBackups() { return readBackups().map(({ ts, reason, counts }) => ({ ts, reason, counts })); },
  restoreBackup(ts) {
    const e = readBackups().find(x => x.ts === ts);
    if (!e || !e.data) return { error: "notfound" };
    pushBackup("before-restore");
    state = { ...defaultState(), ...e.data };
    persist();
    return { ok: true };
  },
  importJSON(text) {
    let obj; try { obj = typeof text === "string" ? JSON.parse(text) : text; } catch (_) { return { error: "parse" }; }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { error: "parse" };
    pushBackup("before-import");
    state = { ...defaultState(), ...obj };
    persist();
    return { ok: true };
  },
};

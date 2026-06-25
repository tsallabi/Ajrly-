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
const defaultState = () => ({ tasks: seedTasks, content: seedContent, owners: seedOwners });

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return defaultState();
}

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
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

  reset() { state = defaultState(); persist(); },
  exportJSON() { return JSON.stringify(state, null, 2); },
};

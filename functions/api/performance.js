/* ============================================================
   Ajrly OS — Cloud API: Per-employee Performance (WS-D)
   GET /api/performance
   Auth required. admin/manager (monitorOthers) see ALL users;
   everyone else sees only themselves.

   For each visible user we compute, from D1:
     completionRate   % of that user's tasks that are complete
     onTimeRate       % of completed tasks finished on/before due date
     tasksPerDay      tasks completed in the last 14 days / 14
     tasksDone        tasks completed (all-time, within scope)
     activeMinutes    sum of presence.active_minutes_day + activity_log
                      "active" samples (last 14d) as a fallback
     avgFirstResponse avg minutes from ticket.created_at -> first_response_at
     ticketsResolved  tickets assigned to user with status resolved/closed
     ajrlyScore       documented weighted blend (0..100)

   Returns { users:[{id,name,role, ...metrics}], generatedAt }.

   Web APIs only (Cloudflare Pages Functions). No npm.
   ============================================================ */
import { all } from "../_lib/db.js";
import { json, unauthorized, serverError, noContent } from "../_lib/response.js";
import { getUser, can } from "../_lib/auth.js";

const DAY_MS = 86400000;
const WINDOW_DAYS = 14;

/* ---- date helpers (work with D1 "YYYY-MM-DD HH:MM:SS" or ISO) ---- */
function parseTs(s) {
  if (!s) return null;
  // D1 datetime('now') is space-separated UTC; normalise to ISO-ish.
  const iso = String(s).includes("T") ? String(s) : String(s).replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
function dateOnly(s) {
  if (!s) return null;
  return String(s).slice(0, 10);
}
function clampPct(n) {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/* ============================================================
   Ajrly Score — documented weighted blend (0..100)

   We combine quality, reliability, throughput, presence and CS:
     completionRate   30%   (did the work get done)
     onTimeRate       25%   (was it done on time)
     throughputScore  20%   (tasksPerDay vs a target of 2/day, capped 100)
     activityScore    15%   (activeMinutes/day vs a 6h=360min target, capped)
     responseScore    10%   (CS speed: 0min->100, 120min->0, linear)

   Sub-scores are each 0..100; the weighted sum is the final score.
   Users with no CS workload simply contribute 0 from responseScore but
   keep the other 90% — they are not penalised for not doing CS.
   ============================================================ */
const WEIGHTS = { completion: 0.30, onTime: 0.25, throughput: 0.20, activity: 0.15, response: 0.10 };
const THROUGHPUT_TARGET = 2;     // completed tasks/day == full marks
const ACTIVITY_TARGET = 360;     // active minutes/day == full marks
const RESPONSE_CEILING = 120;    // minutes; >= this == 0 marks

function computeAjrlyScore(m) {
  const throughputScore = clampPct((m.tasksPerDay / THROUGHPUT_TARGET) * 100);
  const activeMinPerDay = m.activeMinutes / WINDOW_DAYS;
  const activityScore = clampPct((activeMinPerDay / ACTIVITY_TARGET) * 100);
  const responseScore = m.avgFirstResponse == null
    ? 0
    : clampPct((1 - m.avgFirstResponse / RESPONSE_CEILING) * 100);
  const score =
    m.completionRate * WEIGHTS.completion +
    m.onTimeRate * WEIGHTS.onTime +
    throughputScore * WEIGHTS.throughput +
    activityScore * WEIGHTS.activity +
    responseScore * WEIGHTS.response;
  return clampPct(score);
}

/* A task "belongs" to a user if they are the delegate (worker) or,
   failing that, the assigner. We bucket by both names since the legacy
   schema uses names, not ids, for assigned_by / delegate_to. */
function buildMetrics(user, ctx) {
  const sinceMs = Date.now() - WINDOW_DAYS * DAY_MS;

  const myTasks = ctx.tasks.filter(t => taskTouches(t, user));
  const total = myTasks.length;
  const completed = myTasks.filter(t => t.status === "complete");
  const tasksDone = completed.length;
  const completionRate = total ? clampPct((tasksDone / total) * 100) : 0;

  // on-time: completed with a due date, finished on/before it. We use
  // updated_at (completion proxy) else date else dueDate.
  const completedWithDue = completed.filter(t => t.due_date);
  const onTime = completedWithDue.filter(t => {
    const ref = dateOnly(t.updated_at) || t.date || t.due_date;
    return ref <= dateOnly(t.due_date);
  }).length;
  const onTimeRate = completedWithDue.length ? clampPct((onTime / completedWithDue.length) * 100) : 0;

  // tasks completed in last 14d (by updated_at / date)
  const recentDone = completed.filter(t => {
    const d = parseTs(t.updated_at) || parseTs(t.date) || parseTs(t.due_date);
    return d && d.getTime() >= sinceMs;
  }).length;
  const tasksPerDay = Math.round((recentDone / WINDOW_DAYS) * 100) / 100;

  // presence snapshot (current day) + activity_log active samples (14d).
  const pres = ctx.presenceById.get(user.id);
  let activeMinutes = pres ? Number(pres.active_minutes_day || 0) : 0;
  const acts = ctx.activityById.get(user.id) || [];
  // each "active" sample ~= a heartbeat window; treat as ~1 min of signal.
  const activeSamples = acts.filter(a => a.kind === "active").length;
  activeMinutes += activeSamples;

  // CS: tickets assigned to this user (by id).
  const myTickets = ctx.tickets.filter(t => t.assignee === user.id);
  const resolved = myTickets.filter(t => t.status === "resolved" || t.status === "closed");
  const ticketsResolved = resolved.length;
  const responded = myTickets.filter(t => t.first_response_at && t.created_at);
  let avgFirstResponse = null;
  if (responded.length) {
    let sum = 0, n = 0;
    for (const t of responded) {
      const a = parseTs(t.created_at), b = parseTs(t.first_response_at);
      if (a && b && b >= a) { sum += (b - a) / 60000; n++; }
    }
    avgFirstResponse = n ? Math.round((sum / n) * 10) / 10 : null;
  }

  const base = {
    id: user.id, name: user.name, role: user.role,
    completionRate, onTimeRate, tasksPerDay, tasksDone,
    activeMinutes, avgFirstResponse, ticketsResolved,
    tasksTotal: total,
  };
  base.ajrlyScore = computeAjrlyScore(base);
  return base;
}

/* name-based ownership (legacy schema stores names in tasks). Match by
   user.name against assigned_by / delegate_to; ignore empties. */
function taskTouches(t, user) {
  const n = user.name;
  return (t.delegate_to && t.delegate_to === n) || (t.assigned_by && t.assigned_by === n);
}

export async function onRequestGet({ request, env }) {
  try {
    const me = await getUser(request, env);
    if (!me) return unauthorized();

    const seeAll = can(me, "monitorOthers");

    // Load the user set we will report on.
    const users = seeAll
      ? await all(env, "SELECT id,name,role FROM users WHERE active = 1 ORDER BY name")
      : [{ id: me.id, name: me.name, role: me.role }];

    // Bulk-load source data once, then compute per-user in memory.
    const sinceIso = new Date(Date.now() - WINDOW_DAYS * DAY_MS)
      .toISOString().slice(0, 19).replace("T", " ");

    const [tasks, tickets, presence, activity] = await Promise.all([
      all(env, "SELECT id,status,assigned_by,delegate_to,due_date,date,updated_at FROM tasks"),
      all(env, "SELECT id,assignee,status,created_at,first_response_at,resolved_at FROM tickets"),
      all(env, "SELECT user_id,active_minutes_day,day FROM presence"),
      all(env, "SELECT user_id,kind,ts FROM activity_log WHERE ts >= ?", sinceIso),
    ]);

    const presenceById = new Map();
    for (const p of presence) presenceById.set(p.user_id, p);
    const activityById = new Map();
    for (const a of activity) {
      if (!activityById.has(a.user_id)) activityById.set(a.user_id, []);
      activityById.get(a.user_id).push(a);
    }

    const ctx = { tasks, tickets, presenceById, activityById };
    const out = users.map(u => buildMetrics(u, ctx));
    out.sort((a, b) => b.ajrlyScore - a.ajrlyScore);

    return json({ users: out, generatedAt: new Date().toISOString() });
  } catch (e) {
    return serverError(e);
  }
}

export function onRequestOptions() {
  return noContent();
}

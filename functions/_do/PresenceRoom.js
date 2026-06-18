/* ============================================================
   Ajrly OS — PresenceRoom (Cloudflare Durable Object)  [WS-B]
   ------------------------------------------------------------
   One global room. Tracks live presence for every connected user
   and periodically flushes a snapshot to D1 (`presence`) plus
   coarse `activity_log` rows for performance metrics.

   Privacy by design:
     • We only ever store an `active` BOOLEAN derived client-side.
     • NEVER coordinates, keystrokes, screenshots or raw input.
     • Extended monitoring adds finer *timeline* rows (active/idle,
       focus/blur, section) — still no raw input capture.

   Protocol (see docs/CLOUD-ARCHITECTURE.md):
     client -> { type:"hb",   active:true|false, taskId?, section? }
     client -> { type:"focus" | "blur" }
     server -> { type:"presence", users:[ {userId,name,status,currentTask,activeMinutes} ] }
     server -> { type:"notify", body, link }
     server -> { type:"hello",  self:{userId,...}, users:[...] }   (on connect)

   Status rules:
     online  — last active heartbeat  < 60s
     idle    — heartbeat received but inactive (or active >60s ago)
     offline — no heartbeat for       > 90s
   ============================================================ */

const ONLINE_MS = 60_000;    // active hb younger than this => online
const OFFLINE_MS = 90_000;   // no hb at all for this long  => offline / drop
const ALARM_MS = 15_000;     // wake to flush + recompute + broadcast
const BROADCAST_THROTTLE_MS = 5_000;

const uid = () =>
  "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function today() {
  return new Date().toISOString().slice(0, 10);
}
function nowISO() {
  return new Date().toISOString();
}

export class PresenceRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    /* connectionId -> { ws, userId, name, role, monitor } */
    this.conns = new Map();

    /* userId -> live state.
       {
         name, role, monitor,
         status, currentTask, section,
         lastSeen,           // ms epoch of last hb of any kind
         lastActive,         // ms epoch of last ACTIVE hb
         activeMinutes,      // accumulated active minutes for `day`
         day,                // YYYY-MM-DD the counter belongs to
         lastTick,           // ms epoch we last credited active time
         conns               // Set<connectionId>
       } */
    this.users = new Map();

    this.lastBroadcast = 0;
    this.lastSnapshot = "";   // serialized snapshot to detect "on change"
    this.alarmArmed = false;
  }

  /* -------------------- fetch / upgrade -------------------- */
  async fetch(request) {
    const url = new URL(request.url);

    /* Internal broadcast hook (e.g. WS-C posts a notify for assignment).
       POST /notify { userId?, body, link }  -> fan-out a notify message. */
    if (request.method === "POST" && url.pathname.endsWith("/notify")) {
      let payload = {};
      try { payload = await request.json(); } catch (_) {}
      this.broadcastNotify(payload);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    /* Identity is resolved by the calling Function (cookie auth) and
       passed through as headers so the DO trusts only the edge. */
    const userId = request.headers.get("X-User-Id");
    if (!userId) return new Response("unauthorized", { status: 401 });
    const name = request.headers.get("X-User-Name") || userId;
    const role = request.headers.get("X-User-Role") || "member";
    const monitor = request.headers.get("X-User-Monitor") || "standard";

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const connId = uid();
    this.conns.set(connId, { ws: server, userId, name, role, monitor });
    this.onConnect(connId, { userId, name, role, monitor });

    server.addEventListener("message", (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch (_) { return; }
      this.onMessage(connId, msg);
    });
    const close = () => this.onClose(connId);
    server.addEventListener("close", close);
    server.addEventListener("error", close);

    await this.ensureAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  /* -------------------- connection lifecycle -------------------- */
  onConnect(connId, ident) {
    const { userId, name, role, monitor } = ident;
    let u = this.users.get(userId);
    const now = Date.now();
    if (!u) {
      u = {
        name, role, monitor,
        status: "online",
        currentTask: "",
        section: "",
        lastSeen: now,
        lastActive: now,
        activeMinutes: 0,
        day: today(),
        lastTick: now,
        conns: new Set(),
      };
      this.users.set(userId, u);
    } else {
      u.name = name; u.role = role; u.monitor = monitor;
      u.lastSeen = now;
    }
    u.conns.add(connId);

    this.logActivity(userId, "login", null);

    /* greet the new connection with the current roster + itself */
    this.send(connId, {
      type: "hello",
      self: { userId, name, role, monitor },
      users: this.roster(),
    });
    this.broadcastPresence(true);
  }

  onClose(connId) {
    const c = this.conns.get(connId);
    this.conns.delete(connId);
    if (!c) return;
    const u = this.users.get(c.userId);
    if (u) {
      u.conns.delete(connId);
      if (u.conns.size === 0) {
        // last tab closed → mark offline immediately
        u.status = "offline";
        u.lastSeen = Date.now();
        this.logActivity(c.userId, "logout", null);
      }
    }
    this.broadcastPresence(true);
  }

  /* -------------------- inbound messages -------------------- */
  onMessage(connId, msg) {
    const c = this.conns.get(connId);
    if (!c || !msg || typeof msg.type !== "string") return;
    const u = this.users.get(c.userId);
    if (!u) return;
    const now = Date.now();

    this.rollDay(u, c.userId);

    if (msg.type === "hb") {
      const active = !!msg.active;
      // accumulate active minutes since the last credited tick
      if (active) {
        if (u.lastActive && now - u.lastActive < ONLINE_MS * 2) {
          u.activeMinutes += (now - u.lastTick) / 60_000;
        }
        u.lastActive = now;
        u.lastTick = now;
      }
      u.lastSeen = now;
      if (typeof msg.taskId === "string") u.currentTask = msg.taskId.slice(0, 120);
      if (typeof msg.section === "string") u.section = msg.section.slice(0, 60);

      const prev = u.status;
      u.status = this.computeStatus(u, now);

      // extended monitoring: record fine active/idle timeline transitions
      if (u.monitor === "extended" && prev !== u.status &&
          (u.status === "online" || u.status === "idle")) {
        this.logActivity(c.userId, u.status === "online" ? "active" : "idle",
          { section: u.section || null });
      }
      this.broadcastPresence(prev !== u.status);
      return;
    }

    if (msg.type === "focus" || msg.type === "blur") {
      u.lastSeen = now;
      if (msg.type === "focus") { u.lastActive = now; u.lastTick = now; }
      // focus/blur is finer monitoring → extended only (privacy minimisation)
      if (u.monitor === "extended") {
        this.logActivity(c.userId, msg.type, { section: u.section || null });
      }
      const prev = u.status;
      u.status = this.computeStatus(u, now);
      this.broadcastPresence(prev !== u.status);
      return;
    }
  }

  /* -------------------- status + roster -------------------- */
  computeStatus(u, now) {
    if (u.conns.size === 0) return "offline";
    if (now - u.lastSeen > OFFLINE_MS) return "offline";
    if (u.lastActive && now - u.lastActive < ONLINE_MS) return "online";
    return "idle";
  }

  rollDay(u, userId) {
    const d = today();
    if (u.day !== d) {
      // flush the finished day before zeroing
      this.flushUser(userId, u).catch(() => {});
      u.day = d;
      u.activeMinutes = 0;
      u.lastTick = Date.now();
    }
  }

  roster() {
    const now = Date.now();
    const out = [];
    for (const [userId, u] of this.users) {
      const status = this.computeStatus(u, now);
      out.push({
        userId,
        name: u.name,
        status,
        currentTask: u.currentTask || "",
        section: u.section || "",
        activeMinutes: Math.round(u.activeMinutes),
        lastSeen: new Date(u.lastSeen).toISOString(),
      });
    }
    return out;
  }

  /* -------------------- broadcast -------------------- */
  broadcastPresence(changed) {
    const now = Date.now();
    const snap = JSON.stringify(this.roster());
    if (!changed && snap === this.lastSnapshot) return;
    if (now - this.lastBroadcast < BROADCAST_THROTTLE_MS && snap === this.lastSnapshot) return;
    // throttle: at most one presence broadcast per window, unless content changed
    if (now - this.lastBroadcast < BROADCAST_THROTTLE_MS && !changed) return;
    this.lastBroadcast = now;
    this.lastSnapshot = snap;
    const frame = JSON.stringify({ type: "presence", users: JSON.parse(snap) });
    for (const [, c] of this.conns) {
      try { c.ws.send(frame); } catch (_) {}
    }
  }

  broadcastNotify({ userId, body, link }) {
    const frame = JSON.stringify({ type: "notify", body: body || "", link: link || "" });
    for (const [, c] of this.conns) {
      if (userId && c.userId !== userId) continue;
      try { c.ws.send(frame); } catch (_) {}
    }
  }

  send(connId, obj) {
    const c = this.conns.get(connId);
    if (!c) return;
    try { c.ws.send(JSON.stringify(obj)); } catch (_) {}
  }

  /* -------------------- alarm: recompute + flush -------------------- */
  async ensureAlarm() {
    if (this.alarmArmed) return;
    try {
      const existing = await this.state.storage.getAlarm();
      if (existing == null) {
        await this.state.storage.setAlarm(Date.now() + ALARM_MS);
      }
      this.alarmArmed = true;
    } catch (_) {}
  }

  async alarm() {
    this.alarmArmed = false;
    const now = Date.now();

    // recompute statuses; drop long-dead users that have no connections
    let changed = false;
    for (const [userId, u] of this.users) {
      const prev = u.status;
      u.status = this.computeStatus(u, now);
      if (prev !== u.status) changed = true;
      if (u.conns.size === 0 && now - u.lastSeen > OFFLINE_MS * 4) {
        await this.flushUser(userId, u).catch(() => {});
        this.users.delete(userId);
        changed = true;
      }
    }

    await this.flushAll().catch(() => {});
    this.broadcastPresence(changed);

    // keep ticking as long as anyone is connected
    if (this.conns.size > 0 || this.users.size > 0) {
      try { await this.state.storage.setAlarm(now + ALARM_MS); this.alarmArmed = true; } catch (_) {}
    }
  }

  /* -------------------- D1 flush -------------------- */
  async flushAll() {
    if (!this.env || !this.env.DB) return;
    for (const [userId, u] of this.users) {
      await this.flushUser(userId, u).catch(() => {});
    }
  }

  async flushUser(userId, u) {
    const db = this.env && this.env.DB;
    if (!db) return;
    const status = this.computeStatus(u, Date.now());
    try {
      await db
        .prepare(
          `INSERT INTO presence (user_id,status,current_task,last_seen,active_minutes_day,day)
           VALUES (?1,?2,?3,?4,?5,?6)
           ON CONFLICT(user_id) DO UPDATE SET
             status=?2, current_task=?3, last_seen=?4, active_minutes_day=?5, day=?6`
        )
        .bind(
          userId,
          status,
          u.currentTask || "",
          new Date(u.lastSeen).toISOString(),
          Math.round(u.activeMinutes),
          u.day
        )
        .run();
    } catch (_) {}
  }

  /* activity_log rows. `kind` ∈ active|idle|login|logout|focus|blur|task_done...
     `meta` is optional JSON (section name etc) — never raw input. */
  async logActivity(userId, kind, meta) {
    const db = this.env && this.env.DB;
    if (!db) return;
    try {
      await db
        .prepare(`INSERT INTO activity_log (id,user_id,ts,kind,meta) VALUES (?1,?2,?3,?4,?5)`)
        .bind(uid(), userId, nowISO(), kind, meta ? JSON.stringify(meta) : null)
        .run();
    } catch (_) {}
  }
}

export default { PresenceRoom };

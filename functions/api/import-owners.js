/* ============================================================
   Ajrly OS — Cloudflare Pages Function: Import owners (STUB)
   Path: GET (or POST) /api/import-owners

   OPTIONAL enhancement / placeholder. Returns a small sample list
   of owners so the "Fetch from ajrly.ly" button in the Integrations
   page has something to import during development.

   In production, replace the sample with a real call to the ajrly.ly
   backend/API to pull the current owner list. The auth token hook is
   already wired:

   Optional Cloudflare Pages secret (Settings → Environment variables):
     AJRLY_API_TOKEN — bearer token for the future ajrly.ly owners API
   NEVER hardcode this. It is read from context.env only.

   Response shape (consumed by assets/js/modules/integrations.js):
     [{ name, phone, email, listings, stage, notes }, ...]
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequest(context) {
  const { env } = context;

  // ---- Future real integration (guarded; only runs if both are set) ----
  // const base = env.AJRLY_API_BASE;
  // if (env.AJRLY_API_TOKEN && base) {
  //   try {
  //     const res = await fetch(`${base}/owners`, {
  //       headers: { Authorization: `Bearer ${env.AJRLY_API_TOKEN}` },
  //     });
  //     if (res.ok) {
  //       const data = await res.json();
  //       // map the upstream shape → owner shape here, then:
  //       return json(data);
  //     }
  //   } catch (_) { /* fall through to sample below */ }
  // }

  // Reference the env hook so the intent is documented even while stubbed.
  const configured = !!env.AJRLY_API_TOKEN;

  // ---- Placeholder sample data ----
  const sample = [
    { name: "Mohammed Al-Senussi", phone: "+218 91 234 5678", email: "m.senussi@example.ly", listings: "3", stage: "recruitment", notes: "From ajrly.ly sample" },
    { name: "Fatima Bin Ali", phone: "+218 92 765 4321", email: "fatima.binali@example.ly", listings: "1", stage: "communication", notes: "From ajrly.ly sample" },
    { name: "Khaled Omar", phone: "+218 94 555 1212", email: "khaled.omar@example.ly", listings: "5", stage: "content", notes: "From ajrly.ly sample" },
  ];

  return json(configured ? sample : sample, 200);
}

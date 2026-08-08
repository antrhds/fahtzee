// Fahtzee's global games counter — a Cloudflare Worker.
//
// One number, incremented once per finished game. It stores nothing about who
// played, where they were, or what they scored: a single integer in KV.
//
//   GET  /   -> { "games": 1234 }          read the total
//   POST /   -> { "games": 1235 }          add 1, or { "n": 5 } for an offline backlog
//
// Deploy notes live in the repo README of this folder; the binding it expects is
// a KV namespace called COUNTER.
//
// Known limit: KV is read-then-write, so two games finishing in the same instant
// can lose a tick. At this game's scale that will effectively never happen, and
// the fix (a Durable Object) is far more machinery than one number deserves.

const ALLOWED_ORIGINS = [
  "https://antrhds.github.io",
  "http://localhost:8080", // handy when testing the built file locally
];

const KEY = "games";
const MAX_BATCH = 20; // one game, or a small queue flushed after playing offline

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });

    const read = async () => {
      const raw = await env.COUNTER.get(KEY);
      const n = parseInt(raw || "0", 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    if (request.method === "GET") {
      return json({ games: await read() });
    }

    if (request.method === "POST") {
      let n = 1;
      try {
        const body = await request.json();
        if (body && Number.isFinite(body.n)) n = Math.floor(body.n);
      } catch {
        // no body, or not JSON: treat it as a single game
      }
      n = Math.max(1, Math.min(MAX_BATCH, n));
      const total = (await read()) + n;
      await env.COUNTER.put(KEY, String(total));
      return json({ games: total });
    }

    return json({ error: "method not allowed" }, 405);
  },
};

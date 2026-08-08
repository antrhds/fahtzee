// Fahtzee persistence: match history, resumable games. All guarded, all optional.
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

const STATS_KEY = "fahtzee-history";
export const loadHistory = () =>
  safe(() => {
    const s = window.localStorage.getItem(STATS_KEY);
    return s ? JSON.parse(s) : [];
  }, []);
export const saveGameToHistory = (game) =>
  safe(() => {
    const h = loadHistory();
    h.unshift(game);
    window.localStorage.setItem(STATS_KEY, JSON.stringify(h.slice(0, 100)));
    return true;
  }, false);


// Lifetime tally: never expires, unlike the capped recent-games list
const TALLY_KEY = "fahtzee-tally";
const blankPlayer = () => ({ wins: 0, played: 0, best: 0, streak: 0 });

// Form: current run (+n won, -n lost) and the head to head ledger. Kept in its own
// pass so it can be rebuilt from history alone, without touching lifetime totals.
const tallyForm = (t, game) => {
  const results = game.results || [];
  const won = new Set(game.winners || []);
  results.forEach((r) => {
    const p = t.players[r.name];
    if (!p) return;
    if (won.has(r.name)) p.streak = p.streak > 0 ? p.streak + 1 : 1;
    else p.streak = p.streak < 0 ? p.streak - 1 : -1;
  });
  t.h2h = t.h2h || {};
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i], b = results[j];
      if (a.total === b.total) continue; // a dead heat settles nothing
      const winner = a.total > b.total ? a.name : b.name;
      const loser = a.total > b.total ? b.name : a.name;
      const row = (t.h2h[winner] = t.h2h[winner] || {});
      row[loser] = (row[loser] || 0) + 1;
    }
  }
};

const tallyAdd = (t, game) => {
  t.games++;
  game.results.forEach((r) => {
    const p = (t.players[r.name] = t.players[r.name] || blankPlayer());
    p.played++;
    p.best = Math.max(p.best, r.total);
  });
  game.winners.forEach((w) => { if (t.players[w]) t.players[w].wins++; });
  tallyForm(t, game);
};

export const loadTally = () =>
  safe(() => {
    const s = window.localStorage.getItem(TALLY_KEY);
    if (s) {
      const t = JSON.parse(s);
      t.players = t.players || {};
      // Tallies written before v2.7 have no streaks or head to head. Rebuild just
      // those two from whatever history survives; lifetime totals are left alone,
      // because history is capped and recounting them would lose games.
      if (!t.h2h) {
        t.h2h = {};
        Object.keys(t.players).forEach((n) => { t.players[n].streak = 0; });
        const past = loadHistory();
        for (let i = past.length - 1; i >= 0; i--) tallyForm(t, past[i]);
        window.localStorage.setItem(TALLY_KEY, JSON.stringify(t));
      }
      return t;
    }
    // First run after the update: seed the lifetime tally from surviving history
    const h = loadHistory();
    const t = { games: 0, players: {} };
    for (let i = h.length - 1; i >= 0; i--) tallyAdd(t, h[i]);
    window.localStorage.setItem(TALLY_KEY, JSON.stringify(t));
    return t;
  }, { games: 0, players: {} });

// Record a finished game: recent list (capped) + lifetime tally (forever)
export const recordGame = (game) =>
  safe(() => {
    const h = loadHistory();
    h.unshift(game);
    window.localStorage.setItem(STATS_KEY, JSON.stringify(h.slice(0, 30)));
    const t = loadTally();
    tallyAdd(t, game);
    window.localStorage.setItem(TALLY_KEY, JSON.stringify(t));
    queueGameTick();
    return true;
  }, false);

// ---------- Global games counter ----------
// One anonymous tick per finished game: no names, no scores, no identifiers.
// Ticks are queued locally so a game finished offline still counts later.
const TICKS_KEY = "fahtzee-pending-ticks";
const pendingTicks = () =>
  safe(() => parseInt(window.localStorage.getItem(TICKS_KEY) || "0", 10) || 0, 0);
const setPendingTicks = (n) =>
  safe(() => { window.localStorage.setItem(TICKS_KEY, String(Math.max(0, n))); return true; }, false);

export const queueGameTick = () => setPendingTicks(pendingTicks() + 1);

// Sends whatever is queued and returns the new global total, or null if the
// counter is switched off, there is nothing to send, or the network is away.
export const flushGameTicks = async (url) => {
  if (!url) return null;
  const queued = pendingTicks();
  if (queued < 1) return null;
  const sending = Math.min(queued, 20);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n: sending }),
      keepalive: true,
    });
    if (!res.ok) return null;
    const data = await res.json();
    setPendingTicks(queued - sending); // only clear what was accepted
    return typeof data.games === "number" ? data.games : null;
  } catch {
    return null; // still queued, try again next time
  }
};

export const fetchGameTotal = async (url) => {
  if (!url) return null;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.games === "number" ? data.games : null;
  } catch {
    return null;
  }
};

const GAME_KEY = "fahtzee-current-game";
export const saveCurrentGame = (state) =>
  safe(() => {
    window.localStorage.setItem(GAME_KEY, JSON.stringify({ v: 2, savedAt: Date.now(), ...state }));
    return true;
  }, false);
export const loadCurrentGame = () =>
  safe(() => {
    const s = window.localStorage.getItem(GAME_KEY);
    if (!s) return null;
    const g = JSON.parse(s);
    if (!g || g.v !== 2 || !Array.isArray(g.players) || g.players.length < 2) return null;
    return g;
  }, null);
export const clearCurrentGame = () =>
  safe(() => { window.localStorage.removeItem(GAME_KEY); return true; }, false);

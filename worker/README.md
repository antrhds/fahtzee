# The games counter

`counter.js` is a Cloudflare Worker holding one number: how many games of Fahtzee
have been finished, everywhere, ever. It stores nothing else — no names, no
scores, no identifiers.

```
GET  https://fahtzee-counter.antrhds.workers.dev   ->  {"games":1234}
POST https://fahtzee-counter.antrhds.workers.dev   ->  {"games":1235}
```

The app posts one tick per finished game and shows the total in the lobby.

---

## Deploy state

| Step | Done |
|---|---|
| 1. KV namespace `fahtzee` created | ✅ |
| 2. Worker `fahtzee-counter` created | ✅ |
| 3. Paste `counter.js` and deploy | ⬜ |
| 4. Binding `COUNTER` → `fahtzee` | ✅ |

Only step 3 is left. Do it on a laptop: replacing 70 lines in Cloudflare's editor
on a phone is genuinely unpleasant, which is how this got postponed once already.

## Step 3

1. Cloudflare dashboard → **Workers & Pages** → **fahtzee-counter** → **Edit code**
2. Select all, delete, paste the whole of `worker/counter.js` from this repo
3. **Deploy**
4. Open <https://fahtzee-counter.antrhds.workers.dev> — it should say `{"games":0}`

If it still says "Hello World!", the deploy did not take: press Deploy again.

## Then switch it on

`COUNTER_URL` in `src/constants.js` is an empty string, which turns the whole
feature off: no requests, no line in the lobby, nothing to go wrong. Once the
worker answers with `{"games":0}`, set it to the worker URL, rebuild, and release.

Until then the app behaves exactly as it did before the counter existed.

## Notes

- **Ticks survive being offline.** A finished game is queued in localStorage and
  sent on the next load with a network, so train games still count.
- **The endpoint is open.** Anyone who reads the bundle can find it and inflate
  the number. For a family dice game that is a shrug rather than a threat, but
  it is true, and no token in a public bundle would change it.
- **KV is read-then-write**, so two games finishing in the same instant could
  lose a tick. At this scale it will not happen, and the fix — a Durable Object —
  is far more machinery than one number deserves.
- **The service worker leaves this alone.** `sw.js` sends cross-origin GETs
  straight to the network, with an allowlist for the two Google Fonts hosts.
  Without that, a cached counter read would freeze the number forever.

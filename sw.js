// Fahtzee service worker v2.8
// Pages: network first WITH A TIMEOUT — fresh when the network is healthy,
// instant cached copy when it is slow or absent. Assets: cache first.
const CACHE = "fahtzee-v2-8";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];
const NETWORK_TIMEOUT_MS = 3500;

const fetchWithTimeout = (req, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(req).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const isPage = e.request.mode === "navigate" || e.request.destination === "document";

  if (isPage) {
    e.respondWith(
      fetchWithTimeout(e.request, NETWORK_TIMEOUT_MS)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((r) => r || caches.match("./index.html")).then((r) => r || fetch(e.request))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
    )
  );
});

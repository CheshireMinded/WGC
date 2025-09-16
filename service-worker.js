const CACHE = "wgc-v2"; // bump version to invalidate old caches!

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./icon-192.png",
  "./icon-512.png",
  // precache other HTML pages so they work offline:
  "./troop_swap_calculator.html",
  "./battle_results.html",
  "./control_point.html",
  "./known_enemies.html"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML navigations -> network-first, fallback to index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets -> cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

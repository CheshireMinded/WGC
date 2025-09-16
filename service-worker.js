const CACHE = "wgc-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./icon-192.png",
  "./icon-512.png",
  // Your other pages:
  "./battle_results.html",
  "./control_point.html",
  "./known_enemies.html"
];

// Precache core files
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// Clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// Network-first for navigations; cache-first for everything else
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // HTML navigations
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        // keep a fresh copy of index (app shell)
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./", copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match("./"))
    );
    return;
  }

  // Static assets
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

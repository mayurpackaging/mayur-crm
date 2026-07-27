// Mayur CRM — Service Worker
const CACHE = "mayur-crm-v1";
const STATIC = ["/", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Network first — always fresh data (Supabase calls)
  if (e.request.url.includes("supabase")) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

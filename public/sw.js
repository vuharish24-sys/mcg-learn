/* No-op service worker.
 * Some browsers/extensions request /sw.js. Do NOT unregister+navigate here —
 * that causes an infinite page reload loop.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

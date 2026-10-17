// Service worker minimal : rend l'application installable (PWA).
// Les données passent toujours par le réseau pour rester à jour.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

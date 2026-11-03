// M&M's · service worker: shows push notifications and opens the app when one is tapped.
// No caching: the app always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  const options = {
    body: data.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { url: data.url || "./" },
  };
  if (data.tag) { options.tag = data.tag; options.renotify = true; }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || "M&M's", options),
    self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve(),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of open) {
      if ("focus" in client) {
        if ("navigate" in client) { try { await client.navigate(url); } catch (e) { /* same page */ } }
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});

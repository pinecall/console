// Service worker for web push (apps/notify): shows notifications and opens the call on click.
// Deliberately caches nothing and intercepts no requests.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const notice = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(notice.title || "Pinecall", {
      body: notice.body || "",
      icon: "/pinecall-mark.png",
      // One notification per call; a newer one replaces it and alerts again.
      tag: notice.call || notice.kind || "pinecall",
      renotify: true,
      data: { call: notice.call || null, org: notice.org || null, world: notice.world || null },
    }),
  );
});

// Reuse an open console tab if any. `?org=` lets a tab signed into another org switch first
// (lib/from-a-notice.tsx). A notice of the other world opens at the other world's name, which
// this name's /.well-known/pinecall says; a tab of that name is not this worker's to reuse.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { call, org, world } = event.notification.data || {};
  const path = call ? `/calls/${encodeURIComponent(call)}${org ? `?org=${encodeURIComponent(org)}` : ""}` : "/";
  event.waitUntil(
    whereItOpens(world).then((origin) => {
      const to = `${origin}${path}`;
      if (origin !== self.location.origin) return self.clients.openWindow(to);
      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
        const tab = open.find((client) => new URL(client.url).origin === origin);
        // navigate() fails on tabs this worker doesn't control yet; fall back to a new window.
        if (tab) return tab.focus().then(() => tab.navigate(to)).catch(() => self.clients.openWindow(to));
        return self.clients.openWindow(to);
      });
    }),
  );
});

// This name's own origin unless the notice is the other world's and this name knows where that is.
async function whereItOpens(world) {
  const here = self.location.origin;
  if (!world) return here;
  try {
    const box = await (await fetch("/.well-known/pinecall")).json();
    return box.world && box.world !== world && box.elsewhere ? box.elsewhere.replace(/\/$/, "") : here;
  } catch {
    return here;
  }
}

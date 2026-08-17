// Service worker minimal : réception des notifications Web Push et clic
// dessus. Pas de mise en cache/offline ici — hors périmètre de la phase 3.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "Smart Bible Reader", body: "" };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Smart Bible Reader", {
      body: payload.body,
      icon: "/icon.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});

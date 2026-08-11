const ICON_URL =
    "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png";

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    let payload = {};
    try {
        payload = event.data ? event.data.json() : {};
    } catch (err) {
        payload = { title: "Thông báo mới", body: event.data ? event.data.text() : "" };
    }

    const title = payload.title || "CLB Cầu Lông BNB";
    const options = {
        body: payload.body || "",
        icon: ICON_URL,
        badge: ICON_URL,
        tag: payload.data?.type || payload.data?.session_id || undefined,
        renotify: true,
        vibrate: [100, 50, 100],
        data: payload.data || {},
        timestamp: Date.now(),
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const isAdmin = data.scope === "admin";
    let targetUrl = isAdmin ? "/admin" : "/";

    if (data.url) {
        targetUrl = data.url;
    } else if (data.session_id) {
        targetUrl = isAdmin
            ? `/admin/sessions/${data.session_id}`
            : `/sessions/${data.session_id}`;
    } else if (data.registration_id) {
        targetUrl = "/history";
    }

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if ("focus" in client) {
                        client.focus();
                        if ("navigate" in client) {
                            client.navigate(targetUrl);
                        }
                        return;
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            }),
    );
});

self.addEventListener("notificationclose", (event) => {
});

self.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
        self.registration.pushManager
            .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
            .catch((err) => {
                console.error("[sw.js] Không thể tự động resubscribe:", err);
            }),
    );
});
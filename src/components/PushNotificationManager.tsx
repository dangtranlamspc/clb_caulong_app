"use client";

import { useEffect, useState } from "react";
import { pushApi } from "@/lib/api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}

export function PushNotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        setPermission(Notification.permission);

        navigator.serviceWorker.register("/sw.js").then(async (reg) => {
            const existing = await reg.pushManager.getSubscription();
            setSubscribed(!!existing);
        });
    }, []);

    async function handleSubscribe() {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.register("/sw.js");
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") return;

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            await pushApi.subscribe(sub.toJSON() as any);
            setSubscribed(true);
        } finally {
            setLoading(false);
        }
    }

    if (typeof window !== "undefined" && !("serviceWorker" in navigator)) {
        return null;
    }

    if (permission === "granted" && subscribed) {
        return <p className="text-sm text-gray-500">Đã bật thông báo</p>;
    }

    if (permission === "denied") {
        return (
            <p className="text-xs text-gray-400">
                Bạn đã chặn thông báo. Vào cài đặt trình duyệt để bật lại.
            </p>
        );
    }

    return (
        <button
            onClick={handleSubscribe}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
            {loading ? "Đang bật..." : "Bật thông báo"}
        </button>
    );
}
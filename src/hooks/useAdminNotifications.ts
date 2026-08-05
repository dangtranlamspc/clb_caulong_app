"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { notificationsAdminApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

export interface AdminNotification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, any> | null;
    scope: "admin" | "member";
    is_read: boolean;
    created_at: string;
}

export function useAdminNotifications() {
    const userId = useAuthStore((s) => s.user?.id);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const toastEnabledRef = useRef(false);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            const [listRes, countRes] = await Promise.all([
                notificationsAdminApi.list(),
                notificationsAdminApi.unreadCount(),
            ]);
            setNotifications(listRes.data ?? []);
            setUnreadCount(countRes.data?.count ?? 0);
        } catch (err) {
            console.error("[useAdminNotifications] Lỗi tải thông báo:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);
    useEffect(() => {
        load().then(() => {
            setTimeout(() => { toastEnabledRef.current = true; }, 500);
        });
    }, [load]);

    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`admin-notifications:${userId}`)
            .on("broadcast", { event: "new_notification" }, ({ payload }) => {
                const notif = payload as AdminNotification;
                setNotifications((prev) => [notif, ...prev]);
                setUnreadCount((prev) => prev + 1);

                if (toastEnabledRef.current) {
                    toast(notif.title, {
                        icon: "🔔",
                        duration: 4000,
                    });
                }
            })
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const updated = payload.new as AdminNotification;
                    setNotifications((prev) => {
                        const exists = prev.some((n) => n.id === updated.id);
                        if (!exists) return prev;

                        const before = prev.find((n) => n.id === updated.id)!;
                        if (before.is_read !== updated.is_read) {
                            setUnreadCount((c) =>
                                updated.is_read ? Math.max(0, c - 1) : c + 1,
                            );
                        }

                        return prev.map((n) => (n.id === updated.id ? updated : n));
                    });
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const deletedId = (payload.old as any)?.id;
                    if (!deletedId) return;

                    setNotifications((prev) => {
                        const target = prev.find((n) => n.id === deletedId);
                        if (target && !target.is_read) {
                            setUnreadCount((c) => Math.max(0, c - 1));
                        }
                        return prev.filter((n) => n.id !== deletedId);
                    });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const markRead = useCallback(async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
            await notificationsAdminApi.markRead(id);
        } catch (err) {
            console.error("[useAdminNotifications] Lỗi đánh dấu đã đọc:", err);
            load();
        }
    }, [load]);

    const markAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try {
            await notificationsAdminApi.markAllRead();
        } catch (err) {
            console.error("[useAdminNotifications] Lỗi đánh dấu tất cả đã đọc:", err);
            load();
        }
    }, [load]);

    const remove = useCallback(async (id: string) => {
        const target = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (target && !target.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
            await notificationsAdminApi.delete(id);
        } catch (err) {
            console.error("[useAdminNotifications] Lỗi xoá thông báo:", err);
            load();
        }
    }, [notifications, load]);


    const deleteAll = useCallback(async () => {
        const prev = notifications;
        setNotifications([]);
        setUnreadCount(0);
        try {
            await notificationsAdminApi.deleteAll();
        } catch (err) {
            console.error("[useAdminNotifications] Lỗi xoá tất cả thông báo:", err);
            setNotifications(prev);
            load();
        }
    }, [notifications, load]);

    const markResolved = useCallback((id: string, action: "approved" | "rejected") => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id ? { ...n, data: { ...(n.data ?? {}), resolved: true, resolved_action: action } } : n,
            ),
        );
    }, []);

    return { notifications, unreadCount, loading, markRead, markAllRead, remove, markResolved, deleteAll, reload: load };
}
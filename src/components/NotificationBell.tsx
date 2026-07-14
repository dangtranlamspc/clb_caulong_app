'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, AlertCircle, Wallet, X, CalendarDays, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi, walletApi, registrationsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNotificationsRealtimeStore } from '@/store/notifications-realtime.store';

const TYPE_CFG: Record<string, { icon: any; cls: string; bg: string }> = {
    payment_added: { icon: Wallet, cls: 'text-blue-600', bg: 'bg-blue-50' },
    payment_confirmed: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    payment_rejected: { icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
    bill_issued: { icon: Wallet, cls: 'text-amber-600', bg: 'bg-amber-50' },
    added_to_session: { icon: CalendarDays, cls: 'text-blue-600', bg: 'bg-blue-50' },
    wallet_guest_confirm: { icon: Wallet, cls: 'text-amber-600', bg: 'bg-amber-50' },
};


export function NotificationBell() {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
    const [guestActionId, setGuestActionId] = useState<string | null>(null);
    const [guestHandled, setGuestHandled] = useState<Set<string>>(new Set());
    const channelRef = useRef<RealtimeChannel | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const guestChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: list }, { data: cnt }] = await Promise.all([
                notificationsApi.list({ limit: 30 }),
                notificationsApi.unreadCount(),
            ]);
            setItems(list ?? []);
            setUnread(cnt?.count ?? 0);

            const resolvedIds = new Set<string>(
                (list ?? [])
                    .filter((n: any) => n.data?.resolved)
                    .map((n: any) => n.id)
            );
            setGuestHandled(resolvedIds);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestConfirm = async (n: any, mode: 'grouped' | 'separate') => {
        const hostRegId = n.data?.host_registration_id;
        if (!hostRegId) return;
        setGuestActionId(n.id);
        try {
            await walletApi.confirmGuestPayment(hostRegId, mode);
            toast.success(
                mode === 'grouped'
                    ? 'Đã trừ ví cho khách đi cùng'
                    : 'Khách đi cùng sẽ tự thanh toán tiền mặt',
            );
            setGuestHandled(prev => new Set(prev).add(n.id));
            if (!n.is_read) markRead(n.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra');
        } finally {
            setGuestActionId(null);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        const pendingGuestNotifs = items.filter(n => {
            const isGuestConfirm = n.type === 'wallet_guest_confirm' || n.data?.type === 'wallet_guest_confirm';
            return isGuestConfirm && !guestHandled.has(n.id) && n.data?.session_id;
        });

        const neededSessionIds = new Set<string>(
            pendingGuestNotifs.map(n => n.data.session_id as string)
        );

        neededSessionIds.forEach(sessionId => {
            if (guestChannelsRef.current.has(sessionId)) return;

            const channel = supabase
                .channel(`session:${sessionId}`)
                .on('broadcast', { event: 'session_updated' }, ({ payload }) => {
                    const reason = payload?.reason;
                    if (reason !== 'guest_payment_confirmed' && reason !== 'guest_payment_auto_confirmed') return;

                    const affectedHostRegId = payload?.host_registration_id;
                    if (!affectedHostRegId) return;

                    setGuestHandled(prev => {
                        const next = new Set(prev);
                        items.forEach(n => {
                            const isGuestConfirm = n.type === 'wallet_guest_confirm' || n.data?.type === 'wallet_guest_confirm';
                            if (isGuestConfirm &&
                                n.data?.session_id === sessionId &&
                                n.data?.host_registration_id === affectedHostRegId) {
                                next.add(n.id);
                            }
                        });
                        return next;
                    });
                })
                .subscribe();

            guestChannelsRef.current.set(sessionId, channel);
        });

        guestChannelsRef.current.forEach((channel, sessionId) => {
            if (!neededSessionIds.has(sessionId)) {
                supabase.removeChannel(channel);
                guestChannelsRef.current.delete(sessionId);
            }
        });
    }, [items, guestHandled]);

    useEffect(() => {
        return () => {
            guestChannelsRef.current.forEach(channel => supabase.removeChannel(channel));
            guestChannelsRef.current.clear();
        };
    }, []);

    const lastNotification = useNotificationsRealtimeStore(s => s.lastNotification);
    useEffect(() => {
        if (!lastNotification) return;
        setItems(prev => [lastNotification, ...prev]);
        setUnread(c => c + 1);
        toast(lastNotification.title, { icon: '🔔' });
    }, [lastNotification]);

    const updatePanelPos = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPanelPos({
            top: rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right),
        });
    };

    const toggleOpen = () => {
        if (!open) updatePanelPos();
        setOpen(o => !o);
    };

    useEffect(() => {
        if (!open) return;
        const onClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current && !panelRef.current.contains(target) &&
                btnRef.current && !btnRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        window.addEventListener('resize', updatePanelPos);
        window.addEventListener('scroll', updatePanelPos, true);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            window.removeEventListener('resize', updatePanelPos);
            window.removeEventListener('scroll', updatePanelPos, true);
        };
    }, [open]);

    const markRead = async (id: string) => {
        setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnread(c => Math.max(0, c - 1));
        try { await notificationsApi.markRead(id); } catch { }
    };

    const markAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnread(0);
        try { await notificationsApi.markAllRead(); } catch { }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggleOpen}
                className="relative w-9 h-9 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            >
                <Bell className="w-4 h-4 text-gray-600" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={panelRef}
                    className="fixed w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[9999]"
                    style={{ top: panelPos.top, right: panelPos.right, animation: 'fadeSlideUp .2s ease both' }}
                >
                    <style>{`
                        @keyframes fadeSlideUp {
                            from { opacity: 0; transform: translateY(-6px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900">Thông báo</p>
                        <div className="flex items-center gap-2">
                            {unread > 0 && (
                                <button onClick={markAllRead} className="text-xs text-blue-600 font-medium">
                                    Đọc tất cả
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-sm">Chưa có thông báo nào</div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {items.map(n => {
                                    const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.payment_added;
                                    const Icon = cfg.icon;
                                    const isGuestConfirm = n.type === 'wallet_guest_confirm' || n.data?.type === 'wallet_guest_confirm';
                                    const alreadyHandled = guestHandled.has(n.id);

                                    return (
                                        <li
                                            key={n.id}
                                            onClick={() => !n.is_read && markRead(n.id)}
                                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${n.is_read ? 'bg-white' : 'bg-blue-50/40 hover:bg-blue-50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                                                <Icon className={`w-4 h-4 ${cfg.cls}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                                                <p className="text-[10px] text-gray-300 mt-1">
                                                    {format(new Date(n.created_at), 'dd/MM HH:mm', { locale: vi })}
                                                </p>

                                                {isGuestConfirm && !alreadyHandled && (
                                                    <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => handleGuestConfirm(n, 'grouped')}
                                                            disabled={guestActionId === n.id}
                                                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            {guestActionId === n.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Wallet className="w-3 h-3" />}
                                                            Gộp vào ví
                                                        </button>
                                                        <button
                                                            onClick={() => handleGuestConfirm(n, 'separate')}
                                                            disabled={guestActionId === n.id}
                                                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                                                        >
                                                            💵 Khách tự trả
                                                        </button>
                                                    </div>
                                                )}
                                                {isGuestConfirm && alreadyHandled && (
                                                    <p className="text-[11px] text-emerald-600 font-medium mt-1.5">✓ Đã xử lý</p>
                                                )}
                                            </div>
                                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
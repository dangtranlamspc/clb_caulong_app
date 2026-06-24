'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, AlertCircle, Wallet, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const TYPE_CFG: Record<string, { icon: any; cls: string; bg: string }> = {
    payment_added: { icon: Wallet, cls: 'text-blue-600', bg: 'bg-blue-50' },
    payment_confirmed: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    payment_rejected: { icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
};

export function NotificationBell() {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
    const channelRef = useRef<RealtimeChannel | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [{ data: list }, { data: cnt }] = await Promise.all([
                notificationsApi.list({ limit: 30 }),
                notificationsApi.unreadCount(),
            ]);
            setItems(list ?? []);
            setUnread(cnt?.count ?? 0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Lắng nghe thông báo mới theo thời gian thực
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on('broadcast', { event: 'new_notification' }, ({ payload }) => {
                setItems(prev => [payload, ...prev]);
                setUnread(c => c + 1);
                toast(payload.title, { icon: '🔔' });
            })
            .subscribe();
        channelRef.current = channel;
        return () => {
            if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
        };
    }, [user?.id]);

    // Tính vị trí panel dựa trên vị trí nút chuông (vì panel render qua portal ra body)
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

    // Đóng panel khi click ra ngoài (cả nút và panel, vì panel giờ ở ngoài DOM tree)
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
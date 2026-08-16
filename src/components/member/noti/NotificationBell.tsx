'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, AlertCircle, Wallet, X, CalendarDays, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { notificationsApi, registrationsApi, walletApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNotificationsRealtimeStore } from '@/store/notifications-realtime.store';
import { PenaltyPaymentModal } from '../payments/PenaltyPaymentModal';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import bellAnimation from '../../../../public/lottie/noti.json';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

const TYPE_CFG: Record<string, { icon: any; cls: string; bg: string }> = {
    payment_added: { icon: Wallet, cls: 'text-blue-600', bg: 'bg-blue-50' },
    shirt_order_payment_request: { icon: Wallet, cls: 'text-orange-600', bg: 'bg-orange-50' },
    shirt_order_registered_by_admin: { icon: Wallet, cls: 'text-orange-600', bg: 'bg-orange-50' },
    payment_confirmed: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    payment_rejected: { icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
    bill_issued: { icon: Wallet, cls: 'text-amber-600', bg: 'bg-amber-50' },
    added_to_session: { icon: CalendarDays, cls: 'text-blue-600', bg: 'bg-blue-50' },
    wallet_guest_confirm: { icon: Wallet, cls: 'text-amber-600', bg: 'bg-amber-50' },
    shirt_order_payment_rejected: { icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
    shirt_order_cancel_approved: { icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    shirt_order_cancel_rejected: { icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
    session_created: { icon: CalendarDays, cls: 'text-indigo-600', bg: 'bg-indigo-50' },
    member_declined_session: { icon: AlertCircle, cls: 'text-orange-500', bg: 'bg-orange-50' },
};

const SWIPE_THRESHOLD = -70;
const MAX_DRAG = -110;

function ConfirmDeleteAllModal({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleCancel = () => {
        setVisible(false);
        setTimeout(onCancel, 200);
    };

    const handleConfirm = () => {
        setVisible(false);
        setTimeout(onConfirm, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4 transition-opacity"
            style={{
                background: 'rgba(0,0,0,0.5)',
                opacity: visible ? 1 : 0,
                transitionDuration: '200ms',
            }}
            onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
            <div
                className="w-full max-w-xs bg-white rounded-2xl overflow-hidden transition-transform"
                style={{
                    transform: visible ? 'scale(1)' : 'scale(0.92)',
                    transitionDuration: '200ms',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">Xoá tất cả thông báo?</p>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        Hành động này không thể hoàn tác. Toàn bộ thông báo sẽ bị xoá vĩnh viễn.
                    </p>
                </div>
                <div className="flex border-t border-gray-100">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                    >
                        Xoá tất cả
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function NotificationItem({
    n,
    onRead,
    onDelete,
    onNavigateWalletTx,
    onNavigateShirtOrderHistory,
    guestActionId,
    guestHandled,
    onGuestConfirm,
    onPenaltyClick,
    joinActionId,
    joinedSessions,
    onJoinSession,
    respondAction,
    onRespondAdded,
}: {
    n: any;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
    onNavigateWalletTx: (n: any) => void;
    onNavigateShirtOrderHistory: (n: any) => void;
    guestActionId: string | null;
    guestHandled: Set<string>;
    onGuestConfirm: (n: any, mode: 'grouped' | 'separate') => void;
    onPenaltyClick: (n: any) => void;
    joinActionId: string | null;
    joinedSessions: Set<string>;
    onJoinSession: (n: any) => void;
    respondAction: { id: string; action: 'accept' | 'decline' } | null;
    onRespondAdded: (n: any, action: 'accept' | 'decline') => void;
}) {
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);

    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const movedRef = useRef(false);
    const draggingRef = useRef(false);
    const directionRef = useRef<'none' | 'horizontal' | 'vertical'>('none');

    useEffect(() => {
        const el = rowRef.current;
        if (!el) return;

        const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            startXRef.current = t.clientX;
            startYRef.current = t.clientY;
            movedRef.current = false;
            draggingRef.current = true;
            directionRef.current = 'none';
            setDragging(true);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!draggingRef.current) return;
            const t = e.touches[0];
            const dx = t.clientX - startXRef.current;
            const dy = t.clientY - startYRef.current;

            if (directionRef.current === 'none' && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
            }

            if (directionRef.current === 'horizontal') {
                e.preventDefault();
                if (Math.abs(dx) > 5) movedRef.current = true;
                setDragX(Math.min(0, Math.max(MAX_DRAG, dx)));
            }
        };

        const onTouchEnd = () => {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            setDragging(false);
            if (directionRef.current === 'horizontal') {
                setDragX(prev => {
                    if (prev <= SWIPE_THRESHOLD) {
                        onDelete(n.id);
                        return prev;
                    }
                    return 0;
                });
            }
            directionRef.current = 'none';
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        el.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [n.id, onDelete]);

    const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.payment_added;
    const Icon = cfg.icon;
    const isGuestConfirm = n.type === 'wallet_guest_confirm' || n.data?.type === 'wallet_guest_confirm';
    const alreadyHandled = guestHandled.has(n.id);

    const isPenaltyChoice = n.type === 'penalty_issued' && n.data?.payment_method === 'member_choice';
    const penaltyResolved = Boolean(n.data?.resolved);
    const penaltyCancelled = Boolean(n.data?.cancelled);

    const isSessionCreated = n.type === 'session_created';
    const alreadyJoined = joinedSessions.has(n.id);

    const isAddedConfirm =
        n.type === 'added_to_session' && n.data?.requires_response;
    const addedResolved = Boolean(n.data?.resolved);
    const addedOutcome = n.data?.outcome as 'accepted' | 'declined' | 'session_cancelled' | undefined;

    const hasWalletTx = Boolean(n.data?.wallet_reference_id);

    const isShirtOrderNavigable =
        n.type === 'shirt_order_payment_request' ||
        n.type === 'shirt_order_registered_by_admin';

    return (
        <li className="relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5">
                <Trash2 className="w-4 h-4 text-white" />
            </div>

            <div
                ref={rowRef}
                onClick={() => {
                    if (movedRef.current) return;
                    if (isShirtOrderNavigable) {
                        onNavigateShirtOrderHistory(n);
                        return;
                    }
                    if (hasWalletTx) {
                        onNavigateWalletTx(n);
                        return;
                    }
                    if (!n.is_read) onRead(n.id);
                }}
                style={{
                    transform: `translateX(${dragX}px)`,
                    transition: dragging ? 'none' : 'transform .2s ease',
                    touchAction: 'pan-y',
                }}
                className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer bg-white ${n.is_read ? '' : 'bg-blue-50/40 hover:bg-blue-50'}`}
            >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.cls}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>
                        {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>

                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-gray-300">
                            {format(new Date(n.created_at), 'dd/MM HH:mm', { locale: vi })}
                        </p>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 -m-1"
                            aria-label="Xoá thông báo"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {isGuestConfirm && !alreadyHandled && (
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => onGuestConfirm(n, 'grouped')}
                                disabled={guestActionId === n.id}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {guestActionId === n.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Wallet className="w-3 h-3" />}
                                Gộp vào ví
                            </button>
                            <button
                                onClick={() => onGuestConfirm(n, 'separate')}
                                disabled={guestActionId === n.id}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                                💵 Khách tự trả
                            </button>
                        </div>
                    )}
                    {isGuestConfirm && alreadyHandled && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1.5">
                            {n.data?.resolved_mode === 'separate'
                                ? '💵 Đã chọn: Khách tự trả'
                                : n.data?.resolved_mode === 'grouped' || n.data?.resolved_mode === 'auto'
                                    ? '💳 Đã gộp vào ví'
                                    : '✓ Đã xử lý'}
                        </p>
                    )}

                    {isAddedConfirm && !addedResolved && (
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => onRespondAdded(n, 'accept')}
                                disabled={respondAction?.id === n.id}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {respondAction && respondAction.id === n.id && respondAction.action === 'accept'
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <CheckCircle2 className="w-3 h-3" />}
                                Tham gia
                            </button>
                            <button
                                onClick={() => onRespondAdded(n, 'decline')}
                                disabled={respondAction?.id === n.id}
                                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                                {respondAction && respondAction.id === n.id && respondAction.action === 'decline' && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                )}
                                Bận rùi
                            </button>
                        </div>
                    )}
                    {isAddedConfirm && addedResolved && (
                        <p
                            className={`text-[11px] font-medium mt-1.5 ${addedOutcome === 'declined'
                                ? 'text-red-500'
                                : addedOutcome === 'session_cancelled'
                                    ? 'text-gray-400'
                                    : 'text-emerald-600'
                                }`}
                        >
                            {addedOutcome === 'declined'
                                ? '🚫 Bạn đã báo bận'
                                : addedOutcome === 'session_cancelled'
                                    ? '🚫 Buổi đã huỷ'
                                    : '✓ Đã xác nhận tham gia'}
                        </p>
                    )}

                    {isSessionCreated && !alreadyJoined && (
                        <div className="mt-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => onJoinSession(n)}
                                disabled={joinActionId === n.id}
                                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {joinActionId === n.id
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <CalendarDays className="w-3 h-3" />}
                                Tham gia ngay
                            </button>
                        </div>
                    )}

                    {isSessionCreated && alreadyJoined && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1.5">✓ Đã đăng ký</p>
                    )}

                    {isPenaltyChoice && !penaltyResolved && (
                        <div className="mt-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => onPenaltyClick(n)}
                                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
                            >
                                💳 Thanh toán ngay
                            </button>
                        </div>
                    )}

                    {isPenaltyChoice && penaltyResolved && penaltyCancelled && (
                        <p className="text-[11px] text-gray-400 font-medium mt-1.5">🚫 Admin đã huỷ</p>
                    )}

                    {isPenaltyChoice && penaltyResolved && !penaltyCancelled && (
                        <p className="text-[11px] text-emerald-600 font-medium mt-1.5">✓ Đã xử lý</p>
                    )}
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
            </div>
        </li>
    );
}

export function NotificationBell() {
    const router = useRouter();
    const userId = useAuthStore((s) => s.user?.id);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
    const [guestActionId, setGuestActionId] = useState<string | null>(null);
    const [guestHandled, setGuestHandled] = useState<Set<string>>(new Set());
    const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

    const [joinActionId, setJoinActionId] = useState<string | null>(null);
    const [joinedSessions, setJoinedSessions] = useState<Set<string>>(new Set());

    const [respondAction, setRespondAction] = useState<{ id: string; action: 'accept' | 'decline' } | null>(null);

    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    const [penaltyModalData, setPenaltyModalData] = useState<{
        id: string;
        amount: number;
        reason: string;
    } | null>(null);

    const guestChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

    const handleNavigateShirtOrderHistory = (n: any) => {
        const activityId = n.data?.activity_id;
        if (!activityId) return;
        if (!n.is_read) markRead(n.id);
        setOpen(false);
        router.push(`/events/${activityId}/history`);
    };

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

            const joinedIds = new Set<string>(
                (list ?? [])
                    .filter((n: any) => n.type === 'session_created' && n.data?.registered)
                    .map((n: any) => n.id)
            );
            setJoinedSessions(joinedIds);
        } finally {
            setLoading(false);
        }
    };

    const handleRespondAdded = async (n: any, action: 'accept' | 'decline') => {
        const registrationId = n.data?.registration_id;
        if (!registrationId) return;
        setRespondAction({ id: n.id, action });
        try {
            await registrationsApi.respond(registrationId, action);
            toast.success(
                action === 'accept'
                    ? 'Đã xác nhận tham gia buổi đánh'
                    : 'Đã báo bận, đăng ký của bạn đã được huỷ',
            );
            setItems(prev =>
                prev.map(item =>
                    item.id === n.id
                        ? { ...item, data: { ...item.data, resolved: true, outcome: action === 'accept' ? 'accepted' : 'declined' } }
                        : item,
                ),
            );
            if (!n.is_read) markRead(n.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra');
        } finally {
            setRespondAction(null);
        }
    };

    const handleJoinSession = async (n: any) => {
        const sessionId = n.data?.session_id;
        if (!sessionId) return;
        setJoinActionId(n.id);
        try {
            await registrationsApi.register({ session_id: sessionId });
            toast.success('Đã đăng ký buổi đánh, chờ admin duyệt nhé!');
            setJoinedSessions(prev => new Set(prev).add(n.id));
            if (!n.is_read) markRead(n.id);
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? '';
            if (msg.includes('đã đăng ký')) {
                setJoinedSessions(prev => new Set(prev).add(n.id));
                toast('Bạn đã đăng ký buổi này rồi', { icon: 'ℹ️' });
            } else {
                toast.error(msg || 'Đăng ký thất bại, vui lòng thử lại');
            }
        } finally {
            setJoinActionId(null);
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
            setItems(prev =>
                prev.map(item =>
                    item.id === n.id
                        ? { ...item, data: { ...item.data, resolved: true, resolved_mode: mode } }
                        : item,
                ),
            );
            if (!n.is_read) markRead(n.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra');
        } finally {
            setGuestActionId(null);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (!lottieRef.current) return;
        if (unread > 0 && !open) {
            lottieRef.current.play();
        } else {
            lottieRef.current.stop();
        }
    }, [unread, open]);


    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`member-notifications-updates:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const updated = payload.new as any;
                    setItems((prev) => {
                        const exists = prev.some((n) => n.id === updated.id);
                        if (!exists) return prev;

                        const before = prev.find((n) => n.id === updated.id)!;
                        if (before.is_read !== updated.is_read) {
                            setUnread((c) =>
                                updated.is_read ? Math.max(0, c - 1) : c + 1,
                            );
                        }

                        return prev.map((n) => (n.id === updated.id ? updated : n));
                    });
                },
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const deletedId = (payload.old as any)?.id;
                    if (!deletedId) return;

                    setItems((prev) => {
                        const target = prev.find((n) => n.id === deletedId);
                        if (target && !target.is_read) {
                            setUnread((c) => Math.max(0, c - 1));
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

    const lastNotifiedIdRef = useRef<string | null>(null);
    const lastNotification = useNotificationsRealtimeStore(s => s.lastNotification);

    useEffect(() => {
        if (!lastNotification) return;
        if (lastNotifiedIdRef.current === lastNotification.id) return;
        lastNotifiedIdRef.current = lastNotification.id;

        const relatedPenaltyId =
            lastNotification.type === 'penalty_rejected'
                ? lastNotification.data?.fund_transaction_id
                : null;

        setItems(prev => {
            const withNew = [lastNotification, ...prev];
            if (!relatedPenaltyId) return withNew;
            return withNew.map(n =>
                n.id !== lastNotification.id &&
                    n.type === 'penalty_issued' &&
                    n.data?.fund_transaction_id === relatedPenaltyId
                    ? { ...n, data: { ...n.data, resolved: true, cancelled: true } }
                    : n,
            );
        });
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

    const handleDelete = async (id: string) => {
        const target = items.find(i => i.id === id);
        setItems(prev => prev.filter(n => n.id !== id));
        if (target && !target.is_read) setUnread(c => Math.max(0, c - 1));
        try {
            await notificationsApi.delete(id);
        } catch {
            toast.error('Xoá thông báo thất bại');
            load();
        }
    };

    const handleDeleteAll = async () => {
        const prevItems = items;
        const prevUnread = unread;
        setItems([]);
        setUnread(0);
        try {
            await notificationsApi.deleteAll();
        } catch {
            toast.error('Xoá tất cả thông báo thất bại');
            setItems(prevItems);
            setUnread(prevUnread);
        }
    };

    const handleNavigateWalletTx = (n: any) => {
        const refId = n.data?.wallet_reference_id;
        if (!refId) return;
        if (!n.is_read) markRead(n.id);
        setOpen(false);
        router.push(`/wallet?tx_ref=${refId}`);
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={toggleOpen}
                title="Thông báo"
                className="relative w-16 h-16 flex items-center justify-center active:scale-95 transition-transform"
            >
                <Lottie
                    lottieRef={lottieRef}
                    animationData={bellAnimation}
                    autoplay={false}
                    loop={true}
                    style={{ width: 64, height: 64 }}
                />
                {unread > 0 && (
                    <span className="absolute top-3 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
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
                        <div className="flex items-center gap-3">
                            {unread > 0 && (
                                <button onClick={markAllRead} className="text-xs text-blue-600 font-medium">
                                    Đọc tất cả
                                </button>
                            )}
                            {items.length > 0 && (
                                <button onClick={() => setConfirmDeleteAllOpen(true)} className="text-xs text-red-500 font-medium">
                                    Xoá tất cả
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
                                {items.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        n={n}
                                        onRead={markRead}
                                        onDelete={handleDelete}
                                        onNavigateWalletTx={handleNavigateWalletTx}
                                        onNavigateShirtOrderHistory={handleNavigateShirtOrderHistory}
                                        guestActionId={guestActionId}
                                        guestHandled={guestHandled}
                                        onGuestConfirm={handleGuestConfirm}
                                        onPenaltyClick={(notif) => {
                                            setPenaltyModalData({
                                                id: notif.data.fund_transaction_id,
                                                amount: notif.data.amount,
                                                reason: notif.data.reason,
                                            });
                                            setOpen(false);
                                            if (!notif.is_read) markRead(notif.id);
                                        }}
                                        joinActionId={joinActionId}
                                        joinedSessions={joinedSessions}
                                        onJoinSession={handleJoinSession}
                                        respondAction={respondAction}
                                        onRespondAdded={handleRespondAdded}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {confirmDeleteAllOpen && (
                <ConfirmDeleteAllModal
                    onConfirm={() => {
                        setConfirmDeleteAllOpen(false);
                        handleDeleteAll();
                    }}
                    onCancel={() => setConfirmDeleteAllOpen(false)}
                />
            )}

            {penaltyModalData && (
                <PenaltyPaymentModal
                    penalty={penaltyModalData}
                    onClose={() => setPenaltyModalData(null)}
                    onSuccess={() => {
                        setItems(prev =>
                            prev.map(n =>
                                n.data?.fund_transaction_id === penaltyModalData.id
                                    ? { ...n, data: { ...n.data, resolved: true } }
                                    : n,
                            ),
                        );
                        setPenaltyModalData(null);
                    }}
                />
            )}
        </>
    );
}
"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Trash2, Loader2, CheckCircle2, XCircle, Phone, X, Wallet } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { walletAdminApi, registrationsAdminApi, matchesAdminApi, eventsAdminApi } from "@/lib/api";
import toast from "react-hot-toast";
import bellAnimation from "../../../../public/lottie/noti.json";
import { usePathname, useRouter } from "next/navigation";
import { fmt } from "@/lib/fund-constants";

function ResolvedBadge({ action }: { action?: "approved" | "rejected" | "cancelled" | "session_cancelled" }) {
    if (action === "session_cancelled") {
        return (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-gray-400">
                <XCircle className="w-3.5 h-3.5" />
                Buổi đã huỷ
            </div>
        );
    }
    if (action === "cancelled") {
        return (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-gray-400">
                <XCircle className="w-3.5 h-3.5" />
                Đã huỷ đăng ký
            </div>
        );
    }
    if (action === "rejected") {
        return (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-500">
                <XCircle className="w-3.5 h-3.5" />
                Đã từ chối
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã duyệt
        </div>
    );
}

function ShirtOrderPaymentModal({
    registrationIds,
    onClose,
    onResolved,
    onNavigate,
    onStale,
}: {
    registrationIds: string[];
    onClose: () => void;
    onResolved: (action: "approved" | "rejected") => void;
    onNavigate: (activityId: string) => void;
    onStale: () => void;
}) {

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        eventsAdminApi
            .getShirtOrderRegistrationsDetailBatch(registrationIds)
            .then(({ data }) => {
                if (cancelled) return;
                setDetail(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err?.response?.status === 404) {
                    setNotFound(true);
                    onStale();
                } else {
                    toast.error("Không tải được chi tiết đơn hàng");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [registrationIds]);

    const handleConfirm = async () => {
        setProcessing(true);
        try {
            await eventsAdminApi.confirmShirtOrderBatch(registrationIds);
            toast.success("Đã xác nhận thanh toán");
            onResolved("approved");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Xác nhận thất bại");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await eventsAdminApi.rejectShirtOrderBatch(registrationIds);
            toast.success("Đã từ chối yêu cầu thanh toán");
            onResolved("rejected");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại");
        } finally {
            setProcessing(false);
        }
    };

    const items: any[] = detail?.registrations ?? [];
    const first = items[0];
    const anyUnconfirmed = items.some((r) => r.payment_status !== "confirmed");

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget}
        >
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <p className="font-bold text-gray-900">
                        Chi tiết đơn đặt áo {items.length > 1 ? `(${items.length} sản phẩm)` : ""}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-400 gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                            Không tìm thấy đơn hàng
                        </p>
                    ) : (
                        <>
                            <div>
                                <p className="text-xs text-gray-400">
                                    {detail.activity?.emoji} {detail.activity?.title}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img src={first.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (first.users?.full_name ?? first.guest_full_name)?.[0]?.toUpperCase() ?? "?"
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {items.map((r) => (
                                    <div
                                        key={r.id}
                                        className="rounded-xl border border-gray-100 divide-y divide-gray-50 text-sm"
                                    >
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Loại áo</span>
                                            <span className="font-medium text-gray-800">{r.shirt_type_name}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Form / Size</span>
                                            <span className="font-medium text-gray-800">
                                                {r.gender === "nu" ? "Nữ" : "Nam"} · {r.size}
                                            </span>
                                        </div>
                                        {r.color_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-gray-500">Màu</span>
                                                <span className="font-medium text-gray-800">{r.color_name}</span>
                                            </div>
                                        )}
                                        {r.jersey_number && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-gray-500">Số áo</span>
                                                <span className="font-medium text-gray-800">{r.jersey_number}</span>
                                            </div>
                                        )}
                                        {r.print_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-gray-500">Tên in</span>
                                                <span className="font-medium text-gray-800">{r.print_name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Số lượng</span>
                                            <span className="font-medium text-gray-800">{r.quantity}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="font-semibold text-gray-700">Thành tiền</span>
                                            <span className="font-bold text-gray-900">{fmt(r.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between px-3 py-2 bg-gray-50 rounded-xl text-sm">
                                <span className="text-gray-500">Phương thức</span>
                                <span className="font-medium text-gray-800">
                                    {first.payment_method === "wallet"
                                        ? "Ví BNB"
                                        : first.payment_method === "transfer"
                                            ? "Chuyển khoản"
                                            : first.payment_method === "cash"
                                                ? "Tiền mặt"
                                                : "—"}
                                </span>
                            </div>

                            <div className="flex justify-between px-3 py-2.5 bg-red-50 rounded-xl">
                                <span className="font-semibold text-gray-700">Tổng cộng ({items.length} sản phẩm)</span>
                                <span className="font-bold text-red-600">{fmt(detail.total_amount)}</span>
                            </div>
                        </>
                    )}
                </div>

                {!notFound && items.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => onNavigate(detail.activity?.id)}
                            className="flex-1 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-semibold flex items-center justify-center"
                        >
                            Chi tiết
                        </button>

                        {anyUnconfirmed && (
                            <>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Từ chối
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={processing}
                                    className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Xác nhận ({items.length})
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

function ShirtOrderCancelModal({
    registrationIds,
    onClose,
    onResolved,
    onNavigate,
    onStale,
}: {
    registrationIds: string[];
    onClose: () => void;
    onResolved: (action: "approved" | "rejected") => void;
    onNavigate: (activityId: string) => void;
    onStale: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        eventsAdminApi
            .getShirtOrderRegistrationsDetailBatch(registrationIds)
            .then(({ data }) => {
                if (cancelled) return;
                setDetail(data);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err?.response?.status === 404) {
                    setNotFound(true);
                    onStale();
                } else {
                    toast.error("Không tải được chi tiết đơn hàng");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [registrationIds]);

    const handleApprove = async () => {
        if (!window.confirm("Duyệt huỷ đăng ký này? Nếu đã thanh toán bằng ví, tiền sẽ được hoàn lại tự động.")) return;
        setProcessing(true);
        try {
            await Promise.all(registrationIds.map((id) => eventsAdminApi.approveCancelRequest(id)));
            toast.success("Đã duyệt huỷ và hoàn tiền (nếu có)");
            onResolved("approved");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Duyệt huỷ thất bại");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await Promise.all(registrationIds.map((id) => eventsAdminApi.rejectCancelRequest(id)));
            toast.success("Đã từ chối yêu cầu huỷ");
            onResolved("rejected");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại");
        } finally {
            setProcessing(false);
        }
    };

    const items: any[] = detail?.registrations ?? [];
    const first = items[0];
    const anyPending = items.some((r) => r.cancel_requested_at);
    const willRefundWallet = items.some(
        (r) => r.payment_method === "wallet" && r.payment_status === "confirmed",
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget}
        >
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <p className="font-bold text-gray-900">
                        Yêu cầu huỷ đăng ký {items.length > 1 ? `(${items.length} sản phẩm)` : ""}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-gray-400 gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">Không tìm thấy đơn hàng</p>
                    ) : (
                        <>
                            <p className="text-xs text-gray-400">
                                {detail.activity?.emoji} {detail.activity?.title}
                            </p>

                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img src={first.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (first.users?.full_name ?? first.guest_full_name)?.[0]?.toUpperCase() ?? "?"
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {items.map((r) => (
                                    <div key={r.id} className="rounded-xl border border-gray-100 divide-y divide-gray-50 text-sm">
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Loại áo</span>
                                            <span className="font-medium text-gray-800">{r.shirt_type_name}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Form / Size</span>
                                            <span className="font-medium text-gray-800">
                                                {r.gender === "nu" ? "Nữ" : "Nam"} · {r.size}
                                            </span>
                                        </div>
                                        {r.color_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-gray-500">Màu</span>
                                                <span className="font-medium text-gray-800">{r.color_name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-gray-500">Số lượng</span>
                                            <span className="font-medium text-gray-800">{r.quantity}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="font-semibold text-gray-700">Thành tiền</span>
                                            <span className="font-bold text-gray-900">{fmt(r.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between px-3 py-2 bg-gray-50 rounded-xl text-sm">
                                <span className="text-gray-500">Phương thức đã dùng</span>
                                <span className="font-medium text-gray-800">
                                    {first.payment_method === "wallet"
                                        ? "Ví BNB"
                                        : first.payment_method === "transfer"
                                            ? "Chuyển khoản"
                                            : first.payment_method === "cash"
                                                ? "Tiền mặt"
                                                : "Chưa thanh toán"}
                                </span>
                            </div>

                            <div
                                className={`flex justify-between px-3 py-2.5 rounded-xl ${willRefundWallet ? "bg-blue-50" : "bg-gray-50"}`}
                            >
                                <span className="font-semibold text-gray-700">
                                    {willRefundWallet ? "Sẽ hoàn về Ví BNB" : "Tổng cộng"}
                                </span>
                                <span className={`font-bold ${willRefundWallet ? "text-blue-600" : "text-gray-700"}`}>
                                    {fmt(detail.total_amount)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {!notFound && items.length > 0 && anyPending && (
                    <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => onNavigate(detail.activity?.id)}
                            className="flex-1 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-semibold flex items-center justify-center"
                        >
                            Chi tiết
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={processing}
                            className="flex-1 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Từ chối
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={processing}
                            className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Duyệt huỷ
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}


export function AdminNotificationBell() {
    const router = useRouter();
    const pathname = usePathname();
    const { notifications, unreadCount, markRead, markResolved, markAllRead, remove, deleteAll, reload } = useAdminNotifications();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);

    const [shirtOrderModal, setShirtOrderModal] = useState<{
        notifId: string;
        registrationIds: string[];
    } | null>(null);

    const [shirtOrderCancelModal, setShirtOrderCancelModal] = useState<{
        notifId: string;
        registrationIds: string[];
    } | null>(null);


    const [navigatingToEvents, setNavigatingToEvents] = useState(false);

    const hasUnread = unreadCount > 0;

    useEffect(() => {
        if (navigatingToEvents && pathname === "/admin/events") {
            setNavigatingToEvents(false);
            setShirtOrderModal(null);
            setShirtOrderCancelModal(null);
        }
    }, [pathname, navigatingToEvents]);

    const handleNavigateFromShirtOrderModal = (activityId?: string) => {
        if (!activityId) return;
        setNavigatingToEvents(true);
        router.push(`/admin/events?openRegistrations=${activityId}`);
    };

    useEffect(() => {
        if (!lottieRef.current) return;
        if (hasUnread && !open) {
            lottieRef.current.play();
        } else {
            lottieRef.current.stop();
        }
    }, [hasUnread, open]);

    const toggleOpen = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen((v) => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const autoResolvedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const cancelledNotifs = notifications.filter(
            (n) => n.type === "shirt_order_pending_payment_cancelled" && !n.data?.resolved,
        );
        if (cancelledNotifs.length === 0) return;

        for (const cn of cancelledNotifs) {
            const cancelledIds: string[] = cn.data?.registration_ids ?? [];
            if (!cancelledIds.length) continue;

            const staleNotif = notifications.find((n) => {
                if (n.type !== "shirt_order_payment_pending") return false;
                if (n.data?.resolved) return false;
                if (autoResolvedRef.current.has(n.id)) return false;
                const ids: string[] = n.data?.registration_ids ?? [];
                return ids.some((id) => cancelledIds.includes(id));
            });

            if (staleNotif) {
                autoResolvedRef.current.add(staleNotif.id);
                markResolved(staleNotif.id, "rejected");
            }
        }
    }, [notifications, markResolved]);

    const handleDeleteAll = () => {
        if (notifications.length === 0) return;
        if (!window.confirm("Xoá tất cả thông báo? Hành động này không thể hoàn tác.")) return;
        deleteAll();
    };

    const handleOpenShirtOrderPayment = (notifId: string, registrationIds: string[]) => {
        markRead(notifId);
        setShirtOrderModal({ notifId, registrationIds });
    };

    const handleShirtOrderResolved = (action: "approved" | "rejected") => {
        if (shirtOrderModal) {
            markResolved(shirtOrderModal.notifId, action);
        }
        setShirtOrderModal(null);
    };

    const handleApproveMatch = async (notifId: string, matchId: string) => {
        setProcessingId(notifId);
        setProcessingAction("approve");
        try {
            await matchesAdminApi.approve(matchId);
            toast.success("Đã duyệt kết quả trận đấu");
            await markRead(notifId);
            markResolved(notifId, "approved");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Duyệt thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
            setProcessingAction(null);
        }
    };

    const handleRejectMatch = async (notifId: string, matchId: string) => {
        const reason = window.prompt("Nhập lý do từ chối:");
        if (!reason || !reason.trim()) return;
        setProcessingId(notifId);
        setProcessingAction("reject");
        try {
            await matchesAdminApi.reject(matchId, reason.trim());
            toast.success("Đã từ chối kết quả trận đấu");
            await markRead(notifId);
            markResolved(notifId, "rejected");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
            setProcessingAction(null);
        }
    };

    const handleApproveTopup = async (notifId: string, topupRequestId: string) => {
        setProcessingId(notifId);
        try {
            await walletAdminApi.approveTopup(topupRequestId);
            toast.success("Đã duyệt nạp tiền");
            await markRead(notifId);
            markResolved(notifId, "approved");
            reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Duyệt thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectTopup = async (notifId: string, topupRequestId: string) => {
        const reason = window.prompt("Nhập lý do từ chối:");
        if (!reason || !reason.trim()) return;
        setProcessingId(notifId);
        try {
            await walletAdminApi.rejectTopup(topupRequestId, reason.trim());
            toast.success("Đã từ chối yêu cầu");
            await markRead(notifId);
            markResolved(notifId, "rejected");
            reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveRegistration = async (notifId: string, registrationId: string) => {
        setProcessingId(notifId);
        try {
            await registrationsAdminApi.approveRegistration(registrationId);
            toast.success("Đã duyệt đăng ký");
            await markRead(notifId);
            reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Duyệt thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectRegistration = async (notifId: string, registrationId: string) => {
        if (!window.confirm("Từ chối đăng ký này? Đăng ký sẽ bị xoá.")) return;
        setProcessingId(notifId);
        try {
            await registrationsAdminApi.rejectRegistrationRequest(registrationId);
            toast.success("Đã từ chối đăng ký");
            await markRead(notifId);
            reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
        }
    };


    const handleOpenShirtOrderCancel = (notifId: string, registrationIds: string[]) => {
        markRead(notifId);
        setShirtOrderCancelModal({ notifId, registrationIds });
    };

    const handleShirtOrderCancelResolved = (action: "approved" | "rejected") => {
        if (shirtOrderCancelModal) {
            markResolved(shirtOrderCancelModal.notifId, action);
        }
        setShirtOrderCancelModal(null);
    };

    const handleRejectShirtOrderCancelDirect = async (notifId: string, ids: string[]) => {
        if (!window.confirm("Từ chối yêu cầu huỷ đăng ký đặt áo này?")) return;
        setProcessingId(notifId);
        setProcessingAction("reject");
        try {
            await Promise.all(ids.map((id) => eventsAdminApi.rejectCancelRequest(id)));
            toast.success("Đã từ chối yêu cầu huỷ");
            await markRead(notifId);
            markResolved(notifId, "rejected");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại");
        } finally {
            setProcessingId(null);
            setProcessingAction(null);
        }
    };

    const handleOpenFeedbackDetail = (
        notifId: string,
        feedbackUserId: string,
        phone?: string | null,
        fullName?: string | null,
    ) => {
        markRead(notifId);
        setOpen(false);
        const q = phone || fullName || "";
        const qs = new URLSearchParams({ openUser: feedbackUserId });
        if (q) qs.set("q", q);
        router.push(`/admin/feedback?${qs.toString()}`);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleOpen}
                title="Thông báo"
                className="relative w-16 h-16 flex items-center justify-center transition-transform active:scale-90"
            >
                <Lottie
                    lottieRef={lottieRef}
                    animationData={bellAnimation}
                    autoplay={false}
                    loop={true}
                    style={{ width: 64, height: 64 }}
                />
                {hasUnread && (
                    <span className="absolute top-3 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && typeof document !== "undefined" && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999]"
                    style={{ top: coords.top, right: coords.right }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900">Thông báo</p>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-xs font-semibold text-blue-600">
                                    Đã đọc tất cả
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleDeleteAll}
                                    title="Xoá tất cả"
                                    className="text-xs font-semibold text-red-500 flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xoá tất cả
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-6 text-xs text-gray-400 text-center">Chưa có thông báo nào</p>
                        ) : (
                            notifications.map((n) => {
                                const isTopupRequest = n.type === "wallet_topup_request";
                                const topupRequestId = n.data?.topup_request_id;

                                const isRegistrationPending = n.type === "registration_pending";
                                const registrationId = n.data?.registration_id;

                                const isMatchResultPending = n.type === "match_result_pending";
                                const matchId = n.data?.match_id;

                                const isShirtOrderInfo =
                                    n.type === "shirt_order_new_registration" ||
                                    n.type === "shirt_order_new_guest" ||
                                    n.type === "shirt_order_payment_wallet";

                                const isTournamentNewRegistration = n.type === "tournament_new_registration";
                                const tournamentNavPath = n.data?.path;

                                const isShirtOrderPendingCancelled =
                                    n.type === "shirt_order_pending_payment_cancelled";
                                const isShirtOrderCancelRequest = n.type === "shirt_order_cancel_request";
                                const shirtOrderCancelRegistrationIds: string[] =
                                    n.data?.registration_ids ??
                                    (n.data?.registration_id ? [n.data.registration_id] : []);
                                const shirtOrderCancelActivityId = n.data?.activity_id;

                                const isShirtOrderPaymentPending = n.type === "shirt_order_payment_pending";
                                const shirtOrderRegistrationIds: string[] =
                                    n.data?.registration_ids ??
                                    (n.data?.registration_id ? [n.data.registration_id] : []);
                                const shirtOrderActivityId = n.data?.activity_id;

                                const isFeedbackReceived = n.type === "feedback_received";
                                const feedbackUserId = n.data?.user_id;

                                const isResolved = n.data?.resolved === true;
                                const resolvedAction = n.data?.resolved_action as "approved" | "rejected" | undefined;
                                const isProcessing = processingId === n.id;
                                const isApproving = isProcessing && processingAction === "approve";
                                const isRejecting = isProcessing && processingAction === "reject";

                                return (
                                    <div
                                        key={n.id}
                                        className={`group relative flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? "bg-blue-50/50" : ""
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <button
                                                onClick={() => !n.is_read && markRead(n.id)}
                                                className="text-left w-full"
                                            >
                                                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line break-words">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {new Date(n.created_at).toLocaleString("vi-VN")}
                                                </p>
                                            </button>

                                            {isTopupRequest && topupRequestId && (
                                                isResolved ? (
                                                    <ResolvedBadge action={resolvedAction} />
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleApproveTopup(n.id, topupRequestId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isApproving && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectTopup(n.id, topupRequestId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isRegistrationPending && registrationId && (
                                                isResolved ? (
                                                    <ResolvedBadge action={resolvedAction} />
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleApproveRegistration(n.id, registrationId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isApproving && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRegistration(n.id, registrationId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isMatchResultPending && matchId && (
                                                isResolved ? (
                                                    <ResolvedBadge action={resolvedAction} />
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleApproveMatch(n.id, matchId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isApproving && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectMatch(n.id, matchId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isShirtOrderPaymentPending && shirtOrderRegistrationIds.length > 0 && (
                                                isResolved ? (
                                                    <ResolvedBadge action={resolvedAction} />
                                                ) : (
                                                    <div className="flex justify-end mt-2">
                                                        <button
                                                            onClick={() =>
                                                                handleOpenShirtOrderPayment(n.id, shirtOrderRegistrationIds)
                                                            }
                                                            className="flex items-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                                                        >
                                                            <Wallet className="w-3.5 h-3.5" />
                                                            Chi tiết{shirtOrderRegistrationIds.length > 1 ? ` (${shirtOrderRegistrationIds.length})` : ""}
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isShirtOrderCancelRequest && shirtOrderCancelRegistrationIds.length > 0 && (
                                                isResolved ? (
                                                    <ResolvedBadge action={resolvedAction} />
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => {
                                                                markRead(n.id);
                                                                setOpen(false);
                                                                setNavigatingToEvents(true);
                                                                router.push(`/admin/events?openRegistrations=${shirtOrderCancelActivityId}`);
                                                            }}
                                                            className="flex-1 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-semibold"
                                                        >
                                                            Chi tiết
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectShirtOrderCancelDirect(n.id, shirtOrderCancelRegistrationIds)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Từ chối
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenShirtOrderCancel(n.id, shirtOrderCancelRegistrationIds)}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold"
                                                        >
                                                            Xác nhận
                                                        </button>
                                                    </div>
                                                )
                                            )}


                                            {isShirtOrderInfo && shirtOrderActivityId && (
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => {
                                                            markRead(n.id);
                                                            setOpen(false);
                                                            window.location.href = `/admin/events?openRegistrations=${shirtOrderActivityId}`;
                                                        }}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            )}

                                            {isTournamentNewRegistration && tournamentNavPath && (
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() => {
                                                            markRead(n.id);
                                                            setOpen(false);
                                                            router.push(tournamentNavPath);
                                                        }}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            )}

                                            {isFeedbackReceived && feedbackUserId && (
                                                <div className="flex justify-end mt-2">
                                                    <button
                                                        onClick={() =>
                                                            handleOpenFeedbackDetail(
                                                                n.id,
                                                                feedbackUserId,
                                                                n.data?.phone,
                                                                n.data?.full_name,
                                                            )
                                                        }
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            )}

                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                remove(n.id);
                                            }}
                                            title="Xoá thông báo"
                                            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors self-start mt-0.5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>,
                document.body,
            )}

            {shirtOrderModal && (
                <ShirtOrderPaymentModal
                    registrationIds={shirtOrderModal.registrationIds}
                    onClose={() => setShirtOrderModal(null)}
                    onResolved={handleShirtOrderResolved}
                    onNavigate={handleNavigateFromShirtOrderModal}
                    onStale={() => {
                        remove(shirtOrderModal.notifId);
                        setShirtOrderModal(null);
                    }}
                />
            )}


            {shirtOrderCancelModal && (
                <ShirtOrderCancelModal
                    registrationIds={shirtOrderCancelModal.registrationIds}
                    onClose={() => setShirtOrderCancelModal(null)}
                    onResolved={handleShirtOrderCancelResolved}
                    onNavigate={handleNavigateFromShirtOrderModal}
                    onStale={() => {
                        remove(shirtOrderCancelModal.notifId);
                        setShirtOrderCancelModal(null);
                    }}
                />
            )}

            {navigatingToEvents && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999999] bg-white flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>,
                document.body,
            )}
        </>
    );
}
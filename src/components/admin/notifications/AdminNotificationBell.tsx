"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Trash2, Loader2, CheckCircle2, XCircle, Phone, X, Wallet, ChevronLeft } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { walletAdminApi, registrationsAdminApi, matchesAdminApi, eventsAdminApi, userDrinksAdminApi } from "@/lib/api";
import toast from "react-hot-toast";
import bellAnimation from "../../../../public/lottie/noti.json";
import { usePathname, useRouter } from "next/navigation";
import { fmt } from "@/lib/fund-constants";

const BTN = "flex-1 min-h-[44px] rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50";
const BTN_APPROVE = `${BTN} bg-emerald-500 hover:bg-emerald-600 border border-emerald-700 text-white`;
const BTN_REJECT = `${BTN} bg-[var(--surface)] hover:bg-[var(--danger-soft)] border border-red-400 text-[var(--danger)]`;
const BTN_INFO = `${BTN} bg-[var(--surface)] hover:bg-[var(--primary-soft)] border border-blue-400 text-[var(--primary)]`;

const BTN_SM = "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-[0.98] disabled:opacity-50";
const BTN_SM_APPROVE = `${BTN_SM} bg-emerald-500 hover:bg-emerald-600 border border-emerald-700 text-white`;
const BTN_SM_REJECT = `${BTN_SM} bg-[var(--surface)] hover:bg-[var(--danger-soft)] border border-red-400 text-[var(--danger)]`;
const BTN_SM_INFO = `${BTN_SM} bg-[var(--surface)] hover:bg-[var(--primary-soft)] border border-blue-400 text-[var(--primary)]`;

function ResolvedBadge({ action }: { action?: "approved" | "rejected" | "cancelled" | "session_cancelled" }) {
    const cfg =
        action === "session_cancelled" ? { t: "Buổi đã huỷ", cls: "bg-gray-500 border-gray-700", Icon: XCircle }
            : action === "cancelled" ? { t: "Đã huỷ đăng ký", cls: "bg-gray-500 border-gray-700", Icon: XCircle }
                : action === "rejected" ? { t: "Đã từ chối", cls: "bg-red-500 border-red-700", Icon: XCircle }
                    : { t: "Đã duyệt", cls: "bg-emerald-600 border-emerald-800", Icon: CheckCircle2 };
    return (
        <div className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full border text-xs font-semibold text-white shadow-sm ${cfg.cls}`}>
            <cfg.Icon className="w-3.5 h-3.5 text-white" />
            {cfg.t}
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
            <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                    <p className="font-bold text-[var(--text)]">
                        Chi tiết đơn đặt áo {items.length > 1 ? `(${items.length} sản phẩm)` : ""}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)]"
                    >
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-[var(--text-faint)] gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-[var(--text-faint)] text-center py-6">
                            Không tìm thấy đơn hàng
                        </p>
                    ) : (
                        <>
                            <div>
                                <p className="text-xs text-[var(--text-faint)]">
                                    {detail.activity?.emoji} {detail.activity?.title}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 bg-[var(--surface-muted)] rounded-xl p-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center font-semibold text-[var(--primary)] overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img src={first.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (first.users?.full_name ?? first.guest_full_name)?.[0]?.toUpperCase() ?? "?"
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-[var(--text)] truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-[var(--text-faint)] flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {items.map((r) => (
                                    <div
                                        key={r.id}
                                        className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] text-sm"
                                    >
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Loại áo</span>
                                            <span className="font-medium text-[var(--text)]">{r.shirt_type_name}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Form / Size</span>
                                            <span className="font-medium text-[var(--text)]">
                                                {r.gender === "nu" ? "Nữ" : "Nam"} · {r.size}
                                            </span>
                                        </div>
                                        {r.color_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-[var(--text-muted)]">Màu</span>
                                                <span className="font-medium text-[var(--text)]">{r.color_name}</span>
                                            </div>
                                        )}
                                        {r.jersey_number && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-[var(--text-muted)]">Số áo</span>
                                                <span className="font-medium text-[var(--text)]">{r.jersey_number}</span>
                                            </div>
                                        )}
                                        {r.print_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-[var(--text-muted)]">Tên in</span>
                                                <span className="font-medium text-[var(--text)]">{r.print_name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Số lượng</span>
                                            <span className="font-medium text-[var(--text)]">{r.quantity}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="font-semibold text-[var(--text)]">Thành tiền</span>
                                            <span className="font-bold text-[var(--text)]">{fmt(r.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between px-3 py-2 bg-[var(--surface-muted)] rounded-xl text-sm">
                                <span className="text-[var(--text-muted)]">Phương thức</span>
                                <span className="font-medium text-[var(--text)]">
                                    {first.payment_method === "wallet"
                                        ? "Ví BNB"
                                        : first.payment_method === "transfer"
                                            ? "Chuyển khoản"
                                            : first.payment_method === "cash"
                                                ? "Tiền mặt"
                                                : "—"}
                                </span>
                            </div>

                            <div className="flex justify-between px-3 py-2.5 bg-[var(--danger-soft)] rounded-xl">
                                <span className="font-semibold text-[var(--text)]">Tổng cộng ({items.length} sản phẩm)</span>
                                <span className="font-bold text-[var(--danger)]">{fmt(detail.total_amount)}</span>
                            </div>
                        </>
                    )}
                </div>

                {!notFound && items.length > 0 && (
                    <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
                        <button
                            onClick={() => onNavigate(detail.activity?.id)}
                            className="flex-1 py-2 rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] text-[var(--primary)] hover:bg-[var(--primary-soft)] text-sm font-semibold flex items-center justify-center"
                        >
                            Chi tiết
                        </button>

                        {anyUnconfirmed && (
                            <>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="flex-1 py-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] hover:bg-[var(--danger-soft)] text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
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
            <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                    <p className="font-bold text-[var(--text)]">
                        Yêu cầu huỷ đăng ký {items.length > 1 ? `(${items.length} sản phẩm)` : ""}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)]"
                    >
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-[var(--text-faint)] gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-[var(--text-faint)] text-center py-6">Không tìm thấy đơn hàng</p>
                    ) : (
                        <>
                            <p className="text-xs text-[var(--text-faint)]">
                                {detail.activity?.emoji} {detail.activity?.title}
                            </p>

                            <div className="flex items-center gap-3 bg-[var(--surface-muted)] rounded-xl p-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center font-semibold text-[var(--primary)] overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img src={first.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (first.users?.full_name ?? first.guest_full_name)?.[0]?.toUpperCase() ?? "?"
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-[var(--text)] truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-[var(--text-faint)] flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {items.map((r) => (
                                    <div key={r.id} className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] text-sm">
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Loại áo</span>
                                            <span className="font-medium text-[var(--text)]">{r.shirt_type_name}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Form / Size</span>
                                            <span className="font-medium text-[var(--text)]">
                                                {r.gender === "nu" ? "Nữ" : "Nam"} · {r.size}
                                            </span>
                                        </div>
                                        {r.color_name && (
                                            <div className="flex justify-between px-3 py-2">
                                                <span className="text-[var(--text-muted)]">Màu</span>
                                                <span className="font-medium text-[var(--text)]">{r.color_name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="text-[var(--text-muted)]">Số lượng</span>
                                            <span className="font-medium text-[var(--text)]">{r.quantity}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2">
                                            <span className="font-semibold text-[var(--text)]">Thành tiền</span>
                                            <span className="font-bold text-[var(--text)]">{fmt(r.total_amount)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between px-3 py-2 bg-[var(--surface-muted)] rounded-xl text-sm">
                                <span className="text-[var(--text-muted)]">Phương thức đã dùng</span>
                                <span className="font-medium text-[var(--text)]">
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
                                className={`flex justify-between px-3 py-2.5 rounded-xl ${willRefundWallet ? "bg-[var(--primary-soft)]" : "bg-[var(--surface-muted)]"}`}
                            >
                                <span className="font-semibold text-[var(--text)]">
                                    {willRefundWallet ? "Sẽ hoàn về Ví BNB" : "Tổng cộng"}
                                </span>
                                <span className={`font-bold ${willRefundWallet ? "text-[var(--primary)]" : "text-[var(--text)]"}`}>
                                    {fmt(detail.total_amount)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {!notFound && items.length > 0 && anyPending && (
                    <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--border)] flex-shrink-0">
                        <button
                            onClick={() => onNavigate(detail.activity?.id)}
                            className="flex-1 py-2 rounded-lg border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] text-[var(--primary)] hover:bg-[var(--primary-soft)] text-sm font-semibold flex items-center justify-center"
                        >
                            Chi tiết
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={processing}
                            className="flex-1 py-2 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] hover:bg-[var(--danger-soft)] text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
    const [rendered, setRendered] = useState(false);
    const [shown, setShown] = useState(false);

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

    useEffect(() => {
        if (open) {
            setRendered(true);
            const id = requestAnimationFrame(() =>
                requestAnimationFrame(() => setShown(true)),
            );
            return () => cancelAnimationFrame(id);
        }
        setShown(false);
        const t = setTimeout(() => setRendered(false), 400);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!rendered) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [rendered]);

    const toggleOpen = () => setOpen((v) => !v);

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


    const handleApproveDrinkRequest = async (notifId: string, requestId: string) => {
        setProcessingId(notifId);
        setProcessingAction("approve");
        try {
            await userDrinksAdminApi.approveRequest(requestId);
            toast.success("Đã duyệt yêu cầu thêm nước");
            await markRead(notifId);
            markResolved(notifId, "approved");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Duyệt thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
            setProcessingAction(null);
        }
    };

    const handleRejectDrinkRequest = async (notifId: string, requestId: string) => {
        const reason = window.prompt("Nhập lý do từ chối (không bắt buộc):") ?? undefined;
        setProcessingId(notifId);
        setProcessingAction("reject");
        try {
            await userDrinksAdminApi.rejectRequest(requestId, reason?.trim() || undefined);
            toast.success("Đã từ chối yêu cầu thêm nước");
            await markRead(notifId);
            markResolved(notifId, "rejected");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Từ chối thất bại, vui lòng thử lại");
        } finally {
            setProcessingId(null);
            setProcessingAction(null);
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

            {rendered && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999]">
                    <div
                        onClick={() => setOpen(false)}
                        className={`hidden sm:block absolute inset-0 bg-black/30 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
                    />

                    <div
                        ref={dropdownRef}
                        className={`absolute inset-y-0 right-0 w-full sm:w-[420px] flex flex-col bg-[var(--surface)] sm:border-l sm:border-[var(--border)] sm:shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${shown ? "translate-x-0" : "translate-x-full"}`}
                    >
                        <div
                            className="flex items-center justify-between gap-2 px-3 pb-2 border-b border-[var(--border)] flex-shrink-0"
                            style={{
                                paddingTop: "env(safe-area-inset-top, 0px)",
                                minHeight: "calc(env(safe-area-inset-top, 0px) + 72px)",
                            }}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    onClick={() => setOpen(false)}
                                    aria-label="Đóng"
                                    className="w-9 h-9 flex-shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center shadow-[0_3px_8px_-1px_rgba(15,23,42,0.22),0_1px_3px_rgba(15,23,42,0.10)] active:scale-95 active:shadow-sm transition"
                                >
                                    <ChevronLeft className="w-5 h-5 text-[var(--text)]" />
                                </button>
                                <p className="text-xl font-bold text-[var(--text)] truncate">Thông báo</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 border border-blue-800 text-white text-sm font-semibold whitespace-nowrap shadow-sm active:scale-95 transition"
                                    >
                                        Đọc tất cả
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleDeleteAll}
                                        title="Xoá tất cả"
                                        className="px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 border border-red-700 text-white text-sm font-semibold whitespace-nowrap flex items-center gap-1 shadow-sm active:scale-95 transition"
                                    >
                                        <Trash2 className="w-4 h-4 text-white" />
                                        Xoá tất cả
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            className="flex-1 min-h-0 overflow-y-auto bg-[var(--surface-muted)] p-3 pb-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
                        >
                            {notifications.length === 0 ? (
                                <p className="px-4 py-10 text-sm text-[var(--text-faint)] text-center">Chưa có thông báo nào</p>
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

                                    const isDrinkRequestPending = n.type === "drink_request_pending";
                                    const drinkRequestId = n.data?.request_id;

                                    const isResolved = n.data?.resolved === true;
                                    const resolvedAction = n.data?.resolved_action as "approved" | "rejected" | undefined;
                                    const isProcessing = processingId === n.id;
                                    const isApproving = isProcessing && processingAction === "approve";
                                    const isRejecting = isProcessing && processingAction === "reject";

                                    return (
                                        <div
                                            key={n.id}
                                            className={`relative flex items-center gap-3 pl-5 pr-3 py-4 rounded-2xl border overflow-hidden transition-colors ${!n.is_read
                                                ? "bg-[var(--primary-soft)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)] shadow-[0_6px_16px_-4px_rgba(15,23,42,0.14),0_2px_4px_rgba(15,23,42,0.06)]"
                                                : "bg-[var(--surface-muted)] border-[var(--border)] shadow-[0_2px_6px_-2px_rgba(15,23,42,0.06)]"
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <button
                                                    onClick={() => !n.is_read && markRead(n.id)}
                                                    className="text-left w-full"
                                                >
                                                    <p className={`text-[15px] font-bold ${n.is_read ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                                                        {n.title}
                                                    </p>
                                                    <p className={`text-sm mt-1 whitespace-pre-line break-words ${n.is_read ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]"}`}>
                                                        {n.message}
                                                    </p>
                                                    <p className={`text-xs mt-1.5 ${n.is_read ? "text-[var(--text-faint)]" : "text-[var(--text-muted)]"}`}>
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
                                                                className={BTN_APPROVE}
                                                            >
                                                                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Duyệt
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectTopup(n.id, topupRequestId)}
                                                                disabled={isProcessing}
                                                                className={BTN_REJECT}
                                                            >
                                                                {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Từ chối
                                                            </button>
                                                        </div>
                                                    )
                                                )}

                                                {isRegistrationPending && registrationId && (
                                                    isResolved ? (
                                                        <ResolvedBadge action={resolvedAction} />
                                                    ) : (
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <button
                                                                onClick={() => handleApproveRegistration(n.id, registrationId)}
                                                                disabled={isProcessing}
                                                                className={BTN_APPROVE}
                                                            >
                                                                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Duyệt
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectRegistration(n.id, registrationId)}
                                                                disabled={isProcessing}
                                                                className={BTN_REJECT}
                                                            >
                                                                {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
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
                                                                className={BTN_SM_APPROVE}
                                                            >
                                                                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Duyệt
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectMatch(n.id, matchId)}
                                                                disabled={isProcessing}
                                                                className={BTN_SM_REJECT}
                                                            >
                                                                {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
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
                                                                className={BTN_INFO}
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
                                                                className={BTN_SM_INFO}
                                                            >
                                                                Chi tiết
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectShirtOrderCancelDirect(n.id, shirtOrderCancelRegistrationIds)}
                                                                disabled={isProcessing}
                                                                className={BTN_SM_REJECT}
                                                            >
                                                                {isRejecting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                Từ chối
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenShirtOrderCancel(n.id, shirtOrderCancelRegistrationIds)}
                                                                className={BTN_SM_APPROVE}
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
                                                            className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)] hover:underline"
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
                                                            className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)] hover:underline"
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
                                                            className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)] hover:underline"
                                                        >
                                                            Chi tiết
                                                        </button>
                                                    </div>
                                                )}

                                                {isDrinkRequestPending && drinkRequestId && (
                                                    isResolved ? (
                                                        <ResolvedBadge action={resolvedAction} />
                                                    ) : (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleApproveDrinkRequest(n.id, drinkRequestId)}
                                                                disabled={isProcessing}
                                                                className={BTN_SM_APPROVE}
                                                            >
                                                                {isApproving && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Duyệt
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectDrinkRequest(n.id, drinkRequestId)}
                                                                disabled={isProcessing}
                                                                className={BTN_SM_REJECT}
                                                            >
                                                                {isRejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                Từ chối
                                                            </button>
                                                        </div>
                                                    )
                                                )}

                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    remove(n.id);
                                                }}
                                                title="Xoá thông báo"
                                                aria-label="Xoá thông báo"
                                                className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition self-center"
                                            >
                                                <Trash2 className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
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
                <div className="fixed inset-0 z-[9999999] bg-[var(--surface)] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[var(--success)] animate-spin" />
                </div>,
                document.body,
            )}
        </>
    );
}
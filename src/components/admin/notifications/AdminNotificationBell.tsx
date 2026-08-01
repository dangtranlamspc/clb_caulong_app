"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { walletAdminApi, registrationsAdminApi } from "@/lib/api";
import toast from "react-hot-toast";
import bellAnimation from "../../../../public/lottie/noti.json";

export function AdminNotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead, remove, deleteAll, reload } = useAdminNotifications();
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const hasUnread = unreadCount > 0;

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

    const handleDeleteAll = () => {
        if (notifications.length === 0) return;
        if (!window.confirm("Xoá tất cả thông báo? Hành động này không thể hoàn tác.")) return;
        deleteAll();
    };

    const handleApproveTopup = async (notifId: string, topupRequestId: string) => {
        setProcessingId(notifId);
        try {
            await walletAdminApi.approveTopup(topupRequestId);
            toast.success("Đã duyệt nạp tiền");
            await markRead(notifId);
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
                    <span
                        className="absolute text-red-500 text-xs font-bold flex items-center justify-center"
                        style={{ top: 10, right: 8 }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
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
                                    Đánh dấu tất cả đã đọc
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

                                const isResolved = n.data?.resolved === true;
                                const isProcessing = processingId === n.id;

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
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {new Date(n.created_at).toLocaleString("vi-VN")}
                                                </p>
                                            </button>

                                            {isTopupRequest && topupRequestId && (
                                                isResolved ? (
                                                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Đã xử lý
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleApproveTopup(n.id, topupRequestId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Xác nhận
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectTopup(n.id, topupRequestId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            {isRegistrationPending && registrationId && (
                                                isResolved ? (
                                                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Đã xử lý
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleApproveRegistration(n.id, registrationId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                                                        >
                                                            {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRegistration(n.id, registrationId)}
                                                            disabled={isProcessing}
                                                            className="flex-1 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold disabled:opacity-50"
                                                        >
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
        </>
    );
}
"use client";
import { useEffect, useState, useCallback } from "react";
import { X, Loader2, Check, XCircle, Inbox, Landmark, Wallet2, CheckCheck, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { fundApi } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
    phat: "Phạt",
    dong_gop: "Đóng góp",
    tai_tro: "Tài trợ",
    mua_sam: "Mua sắm",
    tiec_team: "Tiệc / Team",
    chi_khac: "Chi phí khác",
};

const METHOD_LABELS: Record<string, string> = {
    bank_transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

type RejectKind = "request" | "confirmation" | "penalty";

interface ApproveFundRequestsSheetProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ApproveFundRequestsSheet({
    open,
    onClose,
    onSuccess,
}: ApproveFundRequestsSheetProps) {
    const [sheetVisible, setSheetVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [confirmations, setConfirmations] = useState<any[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);
    const [approvingAll, setApprovingAll] = useState(false);

    const [penaltyConfirmations, setPenaltyConfirmations] = useState<any[]>([]);

    // --- Reject reason modal state ---
    const [mode, setMode] = useState<"sheet" | "reason">("sheet");
    const [reasonVisible, setReasonVisible] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<{ id: string; kind: RejectKind; label: string } | null>(null);
    const [reason, setReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        return Promise.all([
            fundApi.listTransactions({ status: "pending", limit: 50, page: 1 }),
            fundApi.listPendingConfirmations({ limit: 50, page: 1 }),
            fundApi.getPendingPenaltyConfirmations(),
        ])
            .then(([reqRes, confRes, penaltyRes]) => {
                const reqData = (reqRes.data.data ?? []).filter(
                    (tx: any) => tx.payment_method !== "member_choice",
                );
                setRequests(reqData);
                const confData = (confRes.data.data ?? []).filter(
                    (tx: any) => tx.category !== "phat",
                );
                setConfirmations(confData);

                setPenaltyConfirmations(penaltyRes.data.data ?? []);
            })
            .catch(() => toast.error("Không tải được danh sách yêu cầu"))
            .finally(() => setLoading(false));
    }, []);

    const closeIfLastOne = (prevTotal: number) => {
        if (prevTotal <= 1) {
            setTimeout(() => handleClose(), 400);
        }
    };

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
            load();
        } else {
            setSheetVisible(false);
            setMode("sheet");
            setReasonVisible(false);
            setRejectTarget(null);
        }
    }, [open, load]);

    const handleClose = () => {
        setSheetVisible(false);
        setReasonVisible(false);
        setTimeout(onClose, 250);
    };

    // --- Approve handlers (giữ nguyên) ---
    const handleApprove = async (id: string) => {
        const prevTotal = requests.length + confirmations.length + penaltyConfirmations.length;
        setActingId(id);
        try {
            await fundApi.approve(id);
            toast.success("Đã duyệt giao dịch");
            setRequests((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
            closeIfLastOne(prevTotal);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleConfirmContribution = async (id: string) => {
        const prevTotal = requests.length + confirmations.length + penaltyConfirmations.length;
        setActingId(id);
        try {
            await fundApi.confirmContribution(id);
            toast.success("Đã xác nhận thanh toán");
            setConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
            closeIfLastOne(prevTotal);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xác nhận thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleConfirmPenalty = async (id: string) => {
        const prevTotal = requests.length + confirmations.length + penaltyConfirmations.length;
        setActingId(id);
        try {
            await fundApi.confirmPenaltyPayment(id);
            toast.success("Đã xác nhận thanh toán phạt");
            setPenaltyConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
            closeIfLastOne(prevTotal);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xác nhận thất bại");
        } finally {
            setActingId(null);
        }
    };

    // --- Reject flow: mở modal lý do thay vì window.prompt ---
    const openReject = (id: string, kind: RejectKind, label: string) => {
        setRejectTarget({ id, kind, label });
        setReason("");
        setSheetVisible(false); // trượt sheet duyệt xuống
        setTimeout(() => {
            setMode("reason");
            requestAnimationFrame(() => requestAnimationFrame(() => setReasonVisible(true)));
        }, 250);
    };

    const cancelReject = () => {
        setReasonVisible(false); // trượt modal lý do xuống
        setTimeout(() => {
            setMode("sheet");
            setRejectTarget(null);
            requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
        }, 250);
    };

    const submitReject = async () => {
        if (!reason.trim() || !rejectTarget) return;
        const prevTotal = requests.length + confirmations.length + penaltyConfirmations.length;
        setRejecting(true);
        try {
            if (rejectTarget.kind === "request") {
                await fundApi.reject(rejectTarget.id, reason.trim());
                setRequests((prev) => prev.filter((i) => i.id !== rejectTarget.id));
            } else if (rejectTarget.kind === "confirmation") {
                await fundApi.rejectContribution(rejectTarget.id, reason.trim());
                setConfirmations((prev) => prev.filter((i) => i.id !== rejectTarget.id));
            } else {
                await fundApi.rejectPenaltyPayment(rejectTarget.id, reason.trim());
                setPenaltyConfirmations((prev) => prev.filter((i) => i.id !== rejectTarget.id));
            }

            toast.success("Đã từ chối");
            onSuccess?.();

            setReasonVisible(false); // trượt modal lý do xuống
            setTimeout(() => {
                setMode("sheet");
                setRejectTarget(null);
                if (prevTotal <= 1) {
                    handleClose();
                } else {
                    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
                }
            }, 250);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
        } finally {
            setRejecting(false);
        }
    };

    const handleApproveAll = async () => {
        if (totalCount === 0 || approvingAll) return;
        setApprovingAll(true);

        const confIds = confirmations.map((c) => c.id);
        const reqIds = requests.map((r) => r.id);
        const penIds = penaltyConfirmations.map((p) => p.id);

        const results = await Promise.allSettled([
            ...confIds.map((id) => fundApi.confirmContribution(id)),
            ...reqIds.map((id) => fundApi.approve(id)),
            ...penIds.map((id) => fundApi.confirmPenaltyPayment(id)),
        ]);

        const failedCount = results.filter((r) => r.status === "rejected").length;
        const successCount = results.length - failedCount;

        if (successCount > 0) {
            toast.success(`Đã duyệt ${successCount} yêu cầu`);
        }
        if (failedCount > 0) {
            toast.error(`${failedCount} yêu cầu duyệt thất bại`);
        }

        onSuccess?.();
        setApprovingAll(false);

        if (failedCount === 0) {
            setTimeout(() => handleClose(), 400);
        } else {
            load();
        }
    };

    if (!open) return null;

    const totalCount = requests.length + confirmations.length + penaltyConfirmations.length;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: (sheetVisible || reasonVisible) ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                transition: "background .3s",
            }}
        >
            {/* ============ SHEET DUYỆT ============ */}
            {mode === "sheet" && (
                <div
                    className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
                    style={{
                        transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
                        transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                        paddingBottom: "env(safe-area-inset-bottom)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900">
                            Duyệt yêu cầu quỹ {totalCount > 0 && `(${totalCount})`}
                        </span>
                        <div className="flex items-center gap-2">
                            {totalCount > 0 && (
                                <button
                                    onClick={handleApproveAll}
                                    disabled={approvingAll || actingId !== null}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                                >
                                    {approvingAll ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <CheckCheck className="w-3.5 h-3.5" />
                                    )}
                                    Duyệt tất cả
                                </button>
                            )}
                            <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-4 space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : totalCount === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Inbox className="w-8 h-8 mb-2" />
                                <p className="text-sm">Không có yêu cầu nào chờ duyệt</p>
                            </div>
                        ) : (
                            <>
                                {confirmations.length > 0 && (
                                    <div>
                                        <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-amber-600 uppercase tracking-wide">
                                            Chờ xác nhận thanh toán ({confirmations.length})
                                        </p>
                                        <div className="divide-y divide-gray-50">
                                            {confirmations.map((tx) => (
                                                <div key={tx.id} className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900">{tx.title}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {CATEGORY_LABELS[tx.category] ?? tx.category} · {tx.deducted_member?.full_name ?? "—"}
                                                            </p>
                                                            <p className="text-[11px] text-gray-300 mt-0.5">
                                                                {new Date(tx.created_at).toLocaleString("vi-VN")}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                {tx.actual_payment_method === "cash" ? (
                                                                    <Wallet2 className="w-3 h-3 text-emerald-500" />
                                                                ) : (
                                                                    <Landmark className="w-3 h-3 text-blue-500" />
                                                                )}
                                                                <span className="text-[11px] font-medium text-gray-500">
                                                                    {METHOD_LABELS[tx.actual_payment_method] ?? tx.actual_payment_method}
                                                                </span>
                                                            </div>
                                                            {tx.payment_proof_url && (
                                                                <a
                                                                    href={tx.payment_proof_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[11px] text-blue-600 underline mt-1 inline-block"
                                                                >
                                                                    Xem minh chứng
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-bold whitespace-nowrap flex-shrink-0 text-emerald-600">
                                                            +{fmt(tx.amount)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-3">
                                                        <button
                                                            onClick={() => handleConfirmContribution(tx.id)}
                                                            disabled={actingId === tx.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            {actingId === tx.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                            Xác nhận
                                                        </button>
                                                        <button
                                                            onClick={() => openReject(tx.id, "confirmation", tx.title)}
                                                            disabled={actingId === tx.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {requests.length > 0 && (
                                    <div>
                                        <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                                            Yêu cầu giao dịch ({requests.length})
                                        </p>
                                        <div className="divide-y divide-gray-50">
                                            {requests.map((tx) => (
                                                <div key={tx.id} className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900">{tx.title}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {CATEGORY_LABELS[tx.category] ?? tx.category} · {tx.created_by_user?.full_name ?? "—"}
                                                            </p>
                                                            <p className="text-[11px] text-gray-300 mt-0.5">
                                                                {new Date(tx.created_at).toLocaleString("vi-VN")}
                                                            </p>
                                                            {tx.description && (
                                                                <p className="text-xs text-gray-500 mt-1.5">{tx.description}</p>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm font-bold whitespace-nowrap flex-shrink-0 ${tx.type === "thu" ? "text-emerald-600" : "text-red-500"}`}>
                                                            {tx.type === "thu" ? "+" : "-"}{fmt(tx.amount)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-3">
                                                        <button
                                                            onClick={() => handleApprove(tx.id)}
                                                            disabled={actingId === tx.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            {actingId === tx.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                            Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => openReject(tx.id, "request", tx.title)}
                                                            disabled={actingId === tx.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {penaltyConfirmations.length > 0 && (
                                    <div>
                                        <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-red-500 uppercase tracking-wide">
                                            Phạt chờ xác nhận thanh toán ({penaltyConfirmations.length})
                                        </p>
                                        <div className="divide-y divide-gray-50">
                                            {penaltyConfirmations.map((p) => (
                                                <div key={p.id} className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {p.deducted_member?.full_name ?? "—"}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {p.description || p.title}
                                                                {p.session?.title ? ` · ${p.session.title}` : ""}
                                                            </p>
                                                            <p className="text-[11px] text-gray-300 mt-0.5">
                                                                {new Date(p.created_at).toLocaleString("vi-VN")}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-1.5">
                                                                {p.actual_payment_method === "cash" ? (
                                                                    <Wallet2 className="w-3 h-3 text-emerald-500" />
                                                                ) : (
                                                                    <Landmark className="w-3 h-3 text-blue-500" />
                                                                )}
                                                                <span className="text-[11px] font-medium text-gray-500">
                                                                    {METHOD_LABELS[p.actual_payment_method] ?? p.actual_payment_method}
                                                                    {p.payment_reference ? ` · ${p.payment_reference}` : ""}
                                                                </span>
                                                            </div>
                                                            {p.payment_proof_url && (
                                                                <a
                                                                    href={p.payment_proof_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[11px] text-blue-600 underline mt-1 inline-block"
                                                                >
                                                                    Xem minh chứng
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-bold whitespace-nowrap flex-shrink-0 text-red-500">
                                                            {fmt(p.amount)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-3">
                                                        <button
                                                            onClick={() => handleConfirmPenalty(p.id)}
                                                            disabled={actingId === p.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            {actingId === p.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Check className="w-3.5 h-3.5" />
                                                            )}
                                                            Xác nhận
                                                        </button>
                                                        <button
                                                            onClick={() => openReject(p.id, "penalty", p.title)}
                                                            disabled={actingId === p.id || approvingAll}
                                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div >
            )
            }

            {/* ============ MODAL NHẬP LÝ DO TỪ CHỐI ============ */}
            {
                mode === "reason" && rejectTarget && (
                    <div
                        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl flex flex-col"
                        style={{
                            transform: reasonVisible ? "translateY(0)" : "translateY(100%)",
                            transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                            paddingBottom: "env(safe-area-inset-bottom)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                            <button
                                onClick={cancelReject}
                                disabled={rejecting}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            <span className="text-sm font-semibold text-gray-900">Lý do từ chối</span>
                        </div>

                        <div className="p-4 space-y-3">
                            <p className="text-xs text-gray-400 truncate">{rejectTarget.label}</p>
                            <textarea
                                autoFocus
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                placeholder="Nhập lý do từ chối..."
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 resize-none"
                            />

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={cancelReject}
                                    disabled={rejecting}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 disabled:opacity-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={submitReject}
                                    disabled={rejecting || !reason.trim()}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
                                >
                                    {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Xác nhận từ chối
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
"use client";
import { useEffect, useState, useCallback } from "react";
import { X, Loader2, Check, XCircle, Inbox, Landmark, Wallet2 } from "lucide-react";
import toast from "react-hot-toast";
import { fundApi, penaltiesApi } from "@/lib/api";

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
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [confirmations, setConfirmations] = useState<any[]>([]);
    const [actingId, setActingId] = useState<string | null>(null);

    const [penaltyConfirmations, setPenaltyConfirmations] = useState<any[]>([]);

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
                setConfirmations(confRes.data.data ?? []);
                setPenaltyConfirmations(penaltyRes.data.data ?? []);
            })
            .catch(() => toast.error("Không tải được danh sách yêu cầu"))
            .finally(() => setLoading(false));
    }, []);

    const handleConfirmPenalty = async (id: string) => {
        setActingId(id);
        try {
            await fundApi.confirmPenaltyPayment(id);
            toast.success("Đã xác nhận thanh toán phạt");
            setPenaltyConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xác nhận thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleRejectPenalty = async (id: string) => {
        const reason = window.prompt("Lý do từ chối:");
        if (!reason?.trim()) return;
        setActingId(id);
        try {
            await fundApi.rejectPenaltyPayment(id, reason.trim());
            toast.success("Đã từ chối thanh toán phạt");
            setPenaltyConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
        } finally {
            setActingId(null);
        }
    };


    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
            load();
        } else {
            setVisible(false);
        }
    }, [open, load]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 250);
    };

    const handleApprove = async (id: string) => {
        setActingId(id);
        try {
            await fundApi.approve(id);
            toast.success("Đã duyệt giao dịch");
            setRequests((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt("Lý do từ chối:");
        if (!reason?.trim()) return;
        setActingId(id);
        try {
            await fundApi.reject(id, reason.trim());
            toast.success("Đã từ chối giao dịch");
            setRequests((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleConfirmContribution = async (id: string) => {
        setActingId(id);
        try {
            await fundApi.confirmContribution(id);
            toast.success("Đã xác nhận thanh toán");
            setConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xác nhận thất bại");
        } finally {
            setActingId(null);
        }
    };

    const handleRejectContribution = async (id: string) => {
        const reason = window.prompt("Lý do từ chối:");
        if (!reason?.trim()) return;
        setActingId(id);
        try {
            await fundApi.rejectContribution(id, reason.trim());
            toast.success("Đã từ chối thanh toán");
            setConfirmations((prev) => prev.filter((i) => i.id !== id));
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
        } finally {
            setActingId(null);
        }
    };

    if (!open) return null;

    const totalCount = requests.length + confirmations.length + penaltyConfirmations.length;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                transition: "background .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                        Duyệt yêu cầu quỹ {totalCount > 0 && `(${totalCount})`}
                    </span>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
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
                                                                {tx.payment_reference ? ` · ${tx.payment_reference}` : ""}
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
                                                        disabled={actingId === tx.id}
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
                                                        onClick={() => handleRejectContribution(tx.id)}
                                                        disabled={actingId === tx.id}
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
                                                        disabled={actingId === tx.id}
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
                                                        onClick={() => handleReject(tx.id)}
                                                        disabled={actingId === tx.id}
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
                                                        <p className="text-sm font-semibold text-gray-900">{p.reason}</p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {p.users?.full_name ?? "—"}
                                                            {p.sessions?.title ? ` · ${p.sessions.title}` : ""}
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
                                                        disabled={actingId === p.id}
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
                                                        onClick={() => handleRejectPenalty(p.id)}
                                                        disabled={actingId === p.id}
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
            </div>


        </div >
    );
}
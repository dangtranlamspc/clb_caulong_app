"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Wallet, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { walletAdminApi } from "@/lib/api";

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export default function WalletAdminDepositsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("pending");
    const [actionId, setActionId] = useState<string | null>(null);
    const [showReject, setShowReject] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [viewingBillUrl, setViewingBillUrl] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await walletAdminApi.listTopupRequests({ status: status || undefined });
            setRequests(data.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = async (id: string) => {
        setActionId(id);
        try {
            await walletAdminApi.approveTopup(id);
            toast.success("Đã duyệt nạp tiền");
            fetchRequests();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
        } finally {
            setActionId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = rejectReason[id]?.trim();
        if (!reason) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }
        setActionId(id);
        try {
            await walletAdminApi.rejectTopup(id, reason);
            toast.success("Đã từ chối");
            setShowReject(null);
            fetchRequests();
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Yêu cầu nạp tiền Ví</h1>
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
                {[["pending", "Chờ duyệt"], ["approved", "Đã duyệt"], ["rejected", "Từ chối"], ["", "Tất cả"]].map(
                    ([val, lbl]) => (
                        <button
                            key={val}
                            onClick={() => setStatus(val)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${status === val ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                                }`}
                        >
                            {lbl}
                        </button>
                    ),
                )}
            </div>

            <div className="space-y-3">
                {loading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)
                ) : requests.length === 0 ? (
                    <div className="card py-16 text-center text-gray-400">
                        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>Không có yêu cầu nào</p>
                    </div>
                ) : (
                    requests.map((r) => {
                        const busy = actionId === r.id;
                        return (
                            <div key={r.id} className="card space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0 overflow-hidden">
                                            {r.users?.avatar_url ? (
                                                <img src={r.users.avatar_url} alt={r.users?.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                r.users?.full_name?.[0]?.toUpperCase() ?? "?"
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{r.users?.full_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {r.users?.phone} · {format(new Date(r.created_at), "dd/MM HH:mm", { locale: vi })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-blue-600 whitespace-nowrap">{fmt(r.amount)}</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                                        {r.payment_method === "cash" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}
                                    </span>
                                    {r.payment_reference && (
                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{r.payment_reference}</span>
                                    )}
                                    {r.payment_proof_url && (
                                        <button
                                            onClick={() => setViewingBillUrl(r.payment_proof_url)}
                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Xem bill
                                        </button>
                                    )}
                                </div>
                                {r.note && <p className="text-xs text-gray-400 italic">{r.note}</p>}

                                {r.status === "pending" && showReject !== r.id && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(r.id)}
                                            disabled={busy}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                                        </button>
                                        <button
                                            onClick={() => setShowReject(r.id)}
                                            disabled={busy}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg disabled:opacity-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                                        </button>
                                    </div>
                                )}

                                {r.status !== "pending" && (
                                    <span
                                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                                            }`}
                                    >
                                        {r.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {r.status === "approved" ? "Đã duyệt" : `Từ chối: ${r.reject_reason}`}
                                    </span>
                                )}

                                {showReject === r.id && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={rejectReason[r.id] ?? ""}
                                            onChange={(e) => setRejectReason((n) => ({ ...n, [r.id]: e.target.value }))}
                                            className="input-field text-sm flex-1"
                                            placeholder="Lý do từ chối"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleReject(r.id)}
                                            disabled={busy}
                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg disabled:opacity-50"
                                        >
                                            Xác nhận
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {viewingBillUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setViewingBillUrl(null)}
                >
                    <img
                        src={viewingBillUrl}
                        alt="Bill"
                        className="max-w-lg w-full max-h-[80vh] object-contain rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ShieldAlert, Clock, MoreHorizontal, Wallet, Loader2, X } from "lucide-react";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n || 0) + "đ";
}


const STATUS_STYLES: Record<string, string> = {
    awaiting_choice: "bg-[var(--warning-soft)] text-[var(--warning)]",
    submitted: "bg-[var(--primary-soft)] text-[var(--primary)]",
    confirmed: "bg-[var(--success-soft)] text-[var(--success)]",
    rejected: "bg-[var(--danger-soft)] text-[var(--danger)]",
};
const STATUS_LABELS: Record<string, string> = {
    awaiting_choice: "Chờ chọn thanh toán",
    submitted: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Từ chối",
};

const PAYMENT_METHOD_STYLES: Record<string, string> = {
    wallet: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
    bank_transfer: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
    cash: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
    wallet: "Ví BNB",
    bank_transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
    if (!method) return null;
    const label = PAYMENT_METHOD_LABELS[method];
    if (!label) return null;
    const cls = PAYMENT_METHOD_STYLES[method];

    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cls}`}
        >
            {method === "wallet" ? (
                <Wallet className="w-2.5 h-2.5" />
            ) : method === "bank_transfer" ? (
                "🏦"
            ) : (
                "💵"
            )}
            {label}
        </span>
    );
}

export interface SessionPenaltiesCardHandle {
    refresh: () => void;
}

const SessionPenaltiesCard = forwardRef<SessionPenaltiesCardHandle, { sessionId: string }>(
    function SessionPenaltiesCard({ sessionId }, ref) {
        const [data, setData] = useState<any>(null);
        const [loading, setLoading] = useState(true);
        const [removingId, setRemovingId] = useState<string | null>(null);

        const fetchSeqRef = useRef(0);
        const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const fetchData = async (silent = false) => {
            if (!sessionId) return;
            const mySeq = ++fetchSeqRef.current;
            if (!silent) setLoading(true);
            try {
                const { data: res } = await fundApi.getPenaltiesBySession(sessionId);
                if (mySeq !== fetchSeqRef.current) return;
                setData(res);
            } catch (err) {
                console.error("[SessionPenaltiesCard] Lỗi tải dữ liệu phạt:", err);
            } finally {
                if (mySeq === fetchSeqRef.current) setLoading(false);
            }
        };

        const scheduleRefetch = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchData(true);
            }, 250);
        };
        useImperativeHandle(ref, () => ({
            refresh: () => fetchData(true),
        }));

        useEffect(() => {
            fetchData();
        }, [sessionId]);

        useEffect(() => {
            if (!sessionId) return;
            const channel = supabase
                .channel(`session-penalties:${sessionId}`)
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "fund_transactions", filter: `session_id=eq.${sessionId}` },
                    (payload) => {
                        console.log("[SessionPenaltiesCard] realtime event:", payload);
                        scheduleRefetch();
                    },
                )
                .subscribe((status, err) => {
                    console.log("[SessionPenaltiesCard] subscribe status:", status, err);
                });

            return () => {
                supabase.removeChannel(channel);
                if (debounceRef.current) clearTimeout(debounceRef.current);
            };
        }, [sessionId]);

        const handleRemove = async (penalty: any) => {
            const isRefund = penalty.payment_status === "confirmed";
            const confirmMsg = isRefund
                ? `Huỷ khoản phạt của ${penalty.deducted_member?.full_name ?? "thành viên"}? Số tiền sẽ được hoàn lại vào ví.`
                : `Xoá khoản phạt của ${penalty.deducted_member?.full_name ?? "thành viên"}? Khoản này chưa/không còn trừ tiền nên sẽ xoá thẳng, không hoàn ví.`;

            if (!window.confirm(confirmMsg)) return;
            setRemovingId(penalty.id);
            try {
                await fundApi.removePenalty(penalty.id);
                toast.success(isRefund ? "Đã huỷ khoản phạt" : "Đã xoá khoản phạt");
                fetchData(true);
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Thao tác thất bại");
            } finally {
                setRemovingId(null);
            }
        };

        if (loading) return <div className="h-24 bg-[var(--surface-muted)] animate-pulse rounded-2xl" />;
        if (!data || (data.data ?? []).length === 0) return null;

        return (
            <div className="card !p-0 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                    <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide">
                        Khoản phạt trong buổi này
                    </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {data.data.map((p: any) => {
                        const isRemoving = removingId === p.id;
                        const isRefund = p.payment_status === "confirmed";
                        return (
                            <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                                <ShieldAlert className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--text)] truncate">
                                        {p.deducted_member?.full_name}
                                    </p>
                                    <p className="text-xs text-[var(--text-faint)] truncate">
                                        {p.description || p.title}
                                    </p>
                                    {p.payment_status === "confirmed" && (
                                        <div className="mt-1">
                                            <PaymentMethodBadge method={p.actual_payment_method} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-semibold">{fmt(p.amount)}</p>
                                    <span
                                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[p.payment_status] ?? "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}
                                    >
                                        {STATUS_LABELS[p.payment_status] ?? p.payment_status}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(p)}
                                    disabled={isRemoving}
                                    title={isRefund ? "Huỷ khoản phạt (hoàn ví)" : "Xoá khoản phạt"}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 ${isRefund ? "bg-red-500 hover:bg-red-600" : "bg-gray-400 hover:bg-gray-500"}`}
                                >
                                    {isRemoving ? (
                                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    )}
                                    <span className="hidden sm:inline">{isRefund ? "Huỷ" : "Xoá"}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                        Tổng cộng
                    </span>
                    <span className="text-sm font-bold text-[var(--danger)]">
                        {fmt(data.summary?.confirmed_amount ?? 0)}
                    </span>
                </div>
            </div>
        );
    },
);

export default SessionPenaltiesCard;
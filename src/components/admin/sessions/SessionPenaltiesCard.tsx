"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldAlert, Clock, MoreHorizontal, Wallet, Loader2, X } from "lucide-react";
import { penaltiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n || 0) + "đ";
}
const TYPE_LABELS: Record<string, string> = {
    late_early: "Đi trễ / về sớm",
    special: "Trường hợp đặc biệt",
    other: "Khác",
};
const TYPE_ICONS: Record<string, any> = {
    late_early: Clock,
    special: ShieldAlert,
    other: MoreHorizontal,
};
const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Từ chối",
};

const PAYMENT_METHOD_STYLES: Record<string, string> = {
    wallet: "bg-sky-50 text-sky-700 border-sky-200",
    bank_transfer: "bg-indigo-50 text-indigo-700 border-indigo-200",
    cash: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

export default function SessionPenaltiesCard({
    sessionId,
}: {
    sessionId: string;
}) {
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
            const { data: res } = await penaltiesApi.getBySession(sessionId);
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

    useEffect(() => {
        fetchData();
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        const channel = supabase
            .channel(`session-penalties:${sessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "penalties",
                    filter: `session_id=eq.${sessionId}`,
                },
                () => scheduleRefetch(),
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [sessionId]);

    const handleRemove = async (penaltyId: string, memberName: string) => {
        if (!window.confirm(`Huỷ khoản phạt của ${memberName}?`)) return;
        setRemovingId(penaltyId);
        try {
            await penaltiesApi.remove(penaltyId);
            toast.success("Đã huỷ khoản phạt");
            fetchData(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Huỷ thất bại");
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) return <div className="h-24 bg-gray-100 animate-pulse rounded-2xl" />;
    if (!data || (data.data ?? []).length === 0) return null;

    return (
        <div className="card !p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Khoản phạt trong buổi này
                </p>
            </div>
            <div className="divide-y divide-gray-100">
                {data.data.map((p: any) => {
                    const Icon = TYPE_ICONS[p.type] ?? MoreHorizontal;
                    const isRemoving = removingId === p.id;
                    return (
                        <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                            <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {p.users?.full_name}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {TYPE_LABELS[p.type]} · {p.reason}
                                </p>
                                {p.payment_status === "confirmed" && (
                                    <div className="mt-1">
                                        <PaymentMethodBadge
                                            method={p.actual_payment_method}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold">{fmt(p.amount)}</p>
                                <span
                                    className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[p.payment_status]}`}
                                >
                                    {STATUS_LABELS[p.payment_status]}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(p.id, p.users?.full_name ?? "thành viên")}
                                disabled={isRemoving}
                                title="Huỷ khoản phạt"
                                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40"
                            >
                                {isRemoving ? (
                                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                ) : (
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                )}
                                <span className="hidden sm:inline">Huỷ</span>
                            </button>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                <span className="text-xs font-semibold text-gray-500">
                    Tổng cộng
                </span>
                <span className="text-sm font-bold text-red-500">
                    {fmt(data.summary?.confirmed_amount ?? 0)}
                </span>
            </div>
        </div>
    );
}
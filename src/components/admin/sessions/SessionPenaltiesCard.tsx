"use client";
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { ShieldAlert, Wallet, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { CARD, Chip, TONE_ICON, formatVnd as fmt, type Tone } from "./session-ui";

const STATUS_TONE: Record<string, Tone> = {
    awaiting_choice: "warning",
    submitted: "primary",
    confirmed: "success",
    rejected: "danger",
};
const STATUS_LABELS: Record<string, string> = {
    awaiting_choice: "Chờ chọn thanh toán",
    submitted: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Từ chối",
};

const METHOD_TONE: Record<string, Tone> = {
    wallet: "primary",
    bank_transfer: "primary",
    cash: "success",
};
const METHOD_LABELS: Record<string, string> = {
    wallet: "Ví BNB",
    bank_transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

function PaymentMethodBadge({ method }: { method: string | null | undefined }) {
    if (!method) return null;
    const label = METHOD_LABELS[method];
    if (!label) return null;
    return (
        <Chip
            tone={METHOD_TONE[method]}
            icon={
                method === "wallet" ? (
                    <Wallet className="h-3 w-3" />
                ) : method === "bank_transfer" ? (
                    <span aria-hidden>🏦</span>
                ) : (
                    <span aria-hidden>💵</span>
                )
            }
        >
            {label}
        </Chip>
    );
}

export interface SessionPenaltiesCardHandle {
    refresh: () => void;
}

const SessionPenaltiesCard = forwardRef<
    SessionPenaltiesCardHandle,
    { sessionId: string }
>(function SessionPenaltiesCard({ sessionId }, ref) {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    table: "fund_transactions",
                    filter: `session_id=eq.${sessionId}`,
                },
                () => scheduleRefetch(),
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const handleRemove = async (penalty: any) => {
        const isRefund = penalty.payment_status === "confirmed";
        const who = penalty.deducted_member?.full_name ?? "thành viên";
        const confirmMsg = isRefund
            ? `Huỷ khoản phạt của ${who}? Số tiền sẽ được hoàn lại vào ví.`
            : `Xoá khoản phạt của ${who}? Khoản này chưa/không còn trừ tiền nên sẽ xoá thẳng, không hoàn ví.`;

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

    if (loading || !data || (data.data ?? []).length === 0) return null;

    const list: any[] = data.data;

    return (
        <section className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_ICON.danger}`}
                    >
                        <ShieldAlert className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-[var(--text)]">
                            Khoản phạt trong buổi này
                        </h2>
                        <p className="text-xs text-[var(--text-faint)]">{list.length} khoản</p>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xs text-[var(--text-faint)]">Đã xác nhận</p>
                    <p className="text-sm font-bold tabular-nums text-[var(--danger)]">
                        {fmt(data.summary?.confirmed_amount ?? 0)}
                    </p>
                </div>
            </div>

            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {list.map((p: any) => {
                    const isRemoving = removingId === p.id;
                    const isRefund = p.payment_status === "confirmed";
                    return (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--text)]">
                                    {p.deducted_member?.full_name}
                                </p>
                                <p className="truncate text-xs text-[var(--text-faint)]">
                                    {p.description || p.title}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <Chip tone={STATUS_TONE[p.payment_status] ?? "neutral"}>
                                        {STATUS_LABELS[p.payment_status] ?? p.payment_status}
                                    </Chip>
                                    {isRefund && (
                                        <PaymentMethodBadge method={p.actual_payment_method} />
                                    )}
                                </div>
                            </div>

                            <p className="shrink-0 text-sm font-bold tabular-nums text-[var(--text)]">
                                {fmt(p.amount)}
                            </p>

                            <button
                                type="button"
                                onClick={() => handleRemove(p)}
                                disabled={isRemoving}
                                aria-label={isRefund ? "Huỷ khoản phạt và hoàn ví" : "Xoá khoản phạt"}
                                title={isRefund ? "Huỷ khoản phạt (hoàn ví)" : "Xoá khoản phạt"}
                                className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:opacity-40 sm:px-3 ${isRefund
                                    ? "bg-[var(--danger-soft)] text-[var(--danger)] hover:brightness-95"
                                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--border-strong)]"
                                    }`}
                            >
                                {isRemoving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">{isRefund ? "Huỷ" : "Xoá"}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
});

export default SessionPenaltiesCard;
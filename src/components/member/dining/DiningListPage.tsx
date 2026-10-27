"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, CalendarDays, MapPin, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningApi } from "@/lib/api";
import { DINING_STATUS, PAY_STATUS } from "@/lib/dining";
import { CARD, Chip, formatVnd } from "@/components/admin/sessions/session-ui";

export default function MemberDiningPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        diningApi.my()
            .then(({ data }) => setRows(data ?? []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-4 pb-24 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push("/")}
                    aria-label="Quay lại"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] active:scale-95"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text)]">
                    <UtensilsCrossed className="h-5 w-5 text-pink-500" /> Ăn uống
                </h1>
            </div>

            {loading ? (
                <div className={`${CARD} h-28 animate-pulse bg-[var(--surface-muted)]`} />
            ) : rows.length === 0 ? (
                <div className={`${CARD} px-6 py-12 text-center text-sm text-[var(--text-faint)]`}>
                    Bạn chưa tham gia buổi ăn uống nào
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map((r) => {
                        const e = r.event;
                        const es = DINING_STATUS[e.status] ?? DINING_STATUS.open;
                        const ps = PAY_STATUS[r.payment_status] ?? PAY_STATUS.pending;
                        const billed = e.status !== "open" && r.amount != null;
                        const needPay = e.status === "billed" && (r.payment_status === "pending" || r.payment_status === "submitted");
                        return (
                            <button
                                key={r.id}
                                onClick={() => router.push(`/dining/${e.id}`)}
                                className={`${CARD} block w-full p-4 text-left transition-colors hover:bg-[var(--surface-hover)] active:scale-[0.99]`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-[15px] font-semibold text-[var(--text)]">{e.title}</p>
                                    <Chip tone={es.tone}>{es.label}</Chip>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {format(new Date(e.event_date), "EEE dd/MM HH:mm", { locale: vi })}
                                    </span>
                                    {e.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" /> {e.location}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    {billed ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold tabular-nums text-[var(--text)]">
                                                {formatVnd(Number(r.amount))}
                                            </span>
                                            <Chip tone={ps.tone}>{ps.label}</Chip>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[var(--text-faint)]">Chưa chia tiền</span>
                                    )}
                                    <span className="flex items-center gap-0.5 text-xs font-semibold text-[var(--primary)]">
                                        {needPay ? "Thanh toán" : "Chi tiết"} <ChevronRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
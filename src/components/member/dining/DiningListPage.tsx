"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    UtensilsCrossed, CalendarDays, MapPin, ChevronRight, ArrowLeft, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { DINING_STATUS, PAY_STATUS } from "@/lib/dining";
import { CARD, Chip, formatVnd } from "@/components/admin/sessions/session-ui";

export default function MemberDiningPage() {
    const router = useRouter();
    const [rows, setRows] = useState<any[]>([]);
    const [openEvents, setOpenEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const loadAll = async () => {
        try {
            const [mine, open] = await Promise.all([diningApi.my(), diningApi.open()]);
            setRows(mine.data ?? []);
            setOpenEvents(open.data ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    // Tự cập nhật khi admin duyệt / từ chối / chia tiền
    useEffect(() => {
        const ch = supabase
            .channel("dining-member-list")
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_participants" }, () => loadAll())
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_events" }, () => loadAll())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    const handleRegister = async (eid: string) => {
        setBusyId(eid);
        try {
            const { data } = await diningApi.register(eid);
            toast.success(data?.message ?? "Đã gửi đăng ký");
            await loadAll();
        } catch { } finally {
            setBusyId(null);
        }
    };

    // Chỉ hiện ở khối đăng ký những buổi mình chưa có dòng nào
    const registrable = openEvents.filter((e) => !e.my_status);

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

            {registrable.length > 0 && (
                <section className="space-y-2">
                    <h2 className="px-1 text-sm font-semibold text-[var(--text)]">Đang mở đăng ký</h2>
                    {registrable.map((e) => (
                        <div key={e.id} className={`${CARD} flex items-center gap-3 p-4`}>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold text-[var(--text)]">{e.title}</p>
                                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                    {format(new Date(e.event_date), "EEE dd/MM HH:mm", { locale: vi })}
                                    {e.location ? ` · ${e.location}` : ""}
                                </p>
                            </div>
                            <button
                                disabled={busyId === e.id}
                                onClick={() => handleRegister(e.id)}
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {busyId === e.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Đăng ký
                            </button>
                        </div>
                    ))}
                </section>
            )}

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
                        const pendingApproval = r.approval_status === "pending";
                        const rejectedApproval = r.approval_status === "rejected";
                        const approved = !pendingApproval && !rejectedApproval;
                        const billed = e.status !== "open" && r.amount != null;
                        const needPay =
                            approved &&
                            e.status === "billed" &&
                            (r.payment_status === "pending" || r.payment_status === "submitted");

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
                                    {pendingApproval ? (
                                        <Chip tone="warning">Chờ admin duyệt</Chip>
                                    ) : rejectedApproval ? (
                                        <Chip tone="danger">Bị từ chối</Chip>
                                    ) : billed ? (
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
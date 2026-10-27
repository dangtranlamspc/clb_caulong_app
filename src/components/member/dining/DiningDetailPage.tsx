"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, CalendarDays, MapPin, Users, Loader2, Wallet, Landmark, Banknote, CheckCircle2, Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { DINING_STATUS, PAY_STATUS, METHOD_LABEL, pName } from "@/lib/dining";
import { Avatar, CARD, Chip, formatVnd } from "@/components/admin/sessions/session-ui";

type Method = "wallet" | "bank_transfer" | "cash";

const OPTS: { v: Method; label: string; icon: any }[] = [
    { v: "wallet", label: "Ví BNB", icon: Wallet },
    { v: "bank_transfer", label: "Chuyển khoản", icon: Landmark },
    { v: "cash", label: "Tiền mặt", icon: Banknote },
];

export default function MemberDiningDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [ev, setEv] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<Method | null>(null);
    const [ref, setRef] = useState("");
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try {
            const { data } = await diningApi.get(id);
            setEv(data);
        } catch {
            router.replace("/dining");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, [id]);

    useEffect(() => {
        const ch = supabase
            .channel(`dining-member:${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_participants", filter: `event_id=eq.${id}` }, () => load())
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_events", filter: `id=eq.${id}` }, () => load())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [id]);

    const mine = ev?.my_participant;

    useEffect(() => {
        if (!mine) return;
        if (mine.payment_method === "bank_transfer" || mine.payment_method === "cash") {
            setMethod((prev) => prev ?? mine.payment_method);
        }
        if (mine.payment_reference) setRef((prev) => prev || mine.payment_reference);
    }, [mine?.id, mine?.payment_method]);

    if (loading) return <div className={`${CARD} h-48 animate-pulse bg-[var(--surface-muted)] mt-[calc(env(safe-area-inset-top)+0.75rem)]`} />;
    if (!ev || !mine) return null;

    const st = DINING_STATUS[ev.status] ?? DINING_STATUS.open;
    const ps = PAY_STATUS[mine.payment_status] ?? PAY_STATUS.pending;
    const parts: any[] = ev.participants ?? [];
    const billed = ev.status === "billed";
    const canPay = billed && (mine.payment_status === "pending" || mine.payment_status === "submitted");
    const submitted = mine.payment_status === "submitted";
    const amount = Number(mine.amount ?? 0);

    const handlePay = async () => {
        if (!method) return toast.error("Chọn phương thức thanh toán");
        if (method === "bank_transfer" && !ref.trim()) return toast.error("Nhập mã tham chiếu chuyển khoản");

        if (method === "wallet" && !confirm(`Trừ ${formatVnd(amount)} từ ví BNB của bạn?`)) return;

        setBusy(true);
        try {
            if (method === "wallet") {
                await diningApi.payWallet(mine.id);
                toast.success("Đã thanh toán bằng ví BNB");
            } else {
                await diningApi.submitPayment(mine.id, {
                    method,
                    payment_reference: method === "bank_transfer" ? ref.trim() : undefined,
                });
                toast.success("Đã gửi, vui lòng chờ admin xác nhận");
            }
            await load();
        } catch { } finally { setBusy(false); }
    };

    return (
        <div className="space-y-4 pb-24 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <button
                onClick={() => router.push("/dining")}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text)] active:opacity-70"
            >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
                    <ArrowLeft className="h-4 w-4" />
                </span>
            </button>

            {/* Thông tin buổi */}
            <section className={`${CARD} p-5`}>
                <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-bold text-[var(--text)]">{ev.title}</h1>
                    <Chip tone={st.tone}>{st.label}</Chip>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(ev.event_date), "EEEE, dd/MM/yyyy HH:mm", { locale: vi })}
                    </span>
                    {ev.location && (
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {ev.location}</span>
                    )}
                </div>
                {ev.note && <p className="mt-2 text-sm italic text-[var(--text-faint)]">{ev.note}</p>}
            </section>

            {/* Phần của tôi */}
            <section className={`${CARD} space-y-4 p-5`}>
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Phần của bạn</h2>
                    {ev.status !== "open" && <Chip tone={ps.tone}>{ps.label}</Chip>}
                </div>

                {ev.status === "open" ? (
                    <p className="rounded-xl bg-[var(--surface-muted)] px-4 py-5 text-center text-sm text-[var(--text-faint)]">
                        Admin chưa chia tiền. Bạn sẽ nhận thông báo khi có hóa đơn.
                    </p>
                ) : (
                    <>
                        <div className="flex items-end justify-between">
                            <span className="text-sm text-[var(--text-muted)]">Số tiền cần trả</span>
                            <span className="text-2xl font-black tabular-nums text-[var(--text)]">{formatVnd(amount)}</span>
                        </div>

                        {mine.payment_status === "confirmed" && (
                            <div className="flex items-center gap-2 rounded-xl bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                Đã thanh toán{mine.payment_method ? ` bằng ${METHOD_LABEL[mine.payment_method]}` : ""}
                            </div>
                        )}

                        {mine.payment_status === "processing" && (
                            <div className="flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-sm text-[var(--primary)]">
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Đang xử lý thanh toán...
                            </div>
                        )}

                        {submitted && (
                            <div className="flex items-center gap-2 rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-sm text-[var(--primary)]">
                                <Clock className="h-4 w-4 shrink-0" />
                                Bạn đã báo {METHOD_LABEL[mine.payment_method]}, đang chờ admin xác nhận.
                            </div>
                        )}

                        {canPay && (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                                    {submitted ? "Đổi phương thức thanh toán" : "Chọn cách thanh toán"}
                                </p>

                                <div className="grid grid-cols-3 gap-2">
                                    {OPTS.map(({ v, label, icon: Icon }) => {
                                        const on = method === v;
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setMethod(v)}
                                                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all active:scale-95 ${on
                                                    ? "border-blue-600 bg-[var(--primary-soft)] text-[var(--primary)]"
                                                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
                                                    }`}
                                            >
                                                <Icon className="h-5 w-5" /> {label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {method === "wallet" && (
                                    <p className="text-xs text-[var(--text-faint)]">Số tiền sẽ được trừ thẳng vào ví BNB của bạn.</p>
                                )}
                                {method === "bank_transfer" && (
                                    <input
                                        value={ref}
                                        onChange={(e) => setRef(e.target.value)}
                                        className="input-field w-full text-sm"
                                        placeholder="Mã tham chiếu / nội dung chuyển khoản"
                                    />
                                )}
                                {method === "cash" && (
                                    <p className="text-xs text-[var(--text-faint)]">Đưa tiền mặt trực tiếp cho admin, admin sẽ xác nhận sau.</p>
                                )}

                                <button
                                    disabled={busy || !method}
                                    onClick={handlePay}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                                >
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {method === "wallet" ? "Thanh toán bằng ví" : "Gửi xác nhận thanh toán"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Mọi người */}
            <section className="space-y-2">
                <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-[var(--text)]">
                    <Users className="h-4 w-4" /> Người tham gia ({parts.length})
                </h2>
                <div className={`${CARD} divide-y divide-[var(--border)]`}>
                    {parts.map((p) => {
                        const s = PAY_STATUS[p.payment_status] ?? PAY_STATUS.pending;
                        return (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                                <Avatar url={p.users?.avatar_url} name={pName(p)} size={32} />
                                <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
                                    {pName(p)}
                                    {p.id === mine.id && <span className="ml-1 text-xs text-[var(--text-faint)]">(bạn)</span>}
                                </p>
                                {ev.status !== "open" && <Chip tone={s.tone}>{s.label}</Chip>}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, CalendarDays, MapPin, Users, UserPlus, Search, Trash2,
    Loader2, Divide, RotateCcw, CheckCircle2, Send, Wallet, Banknote,
    Landmark,
    Receipt,
    Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningAdminApi, membersAdminApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { DINING_STATUS, PAY_STATUS, METHOD_LABEL, pName } from "@/lib/dining";
import {
    Avatar, CARD, Chip, ModalShell, ModalHeader, ModalBody, ModalFooter, formatVnd,
} from "@/components/admin/sessions/session-ui";
import { MoneyInput } from "@/components/admin/dining/fields";
import { buildGuestReceipt } from "@/lib/guest-receipt";

const BTN: Record<string, string> = {
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    red: "bg-red-500 text-white hover:bg-red-600",
    gray: "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
};

type SettleMode = "wallet" | "bank_transfer" | "cash";

const METHOD_OPTS: { v: SettleMode; label: string; icon: any; memberOnly?: boolean }[] = [
    { v: "wallet", label: "Trừ ví BNB", icon: Wallet, memberOnly: true },
    { v: "bank_transfer", label: "Chuyển khoản", icon: Landmark },
    { v: "cash", label: "Tiền mặt", icon: Banknote },
];

const fmtNum = (n: number) => (n ? n.toLocaleString("vi-VN") : "");
const parseNum = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    return d ? parseInt(d, 10) : 0;
};

export default function AdminDiningDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [ev, setEv] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState("");
    const billInit = useRef(false);
    const [busy, setBusy] = useState<string | null>(null);

    // ── state "gửi hóa đơn" (chỉ dùng khi buổi đang open) ──
    const [amounts, setAmounts] = useState<Record<string, number>>({});
    const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
    const [modes, setModes] = useState<Record<string, SettleMode | undefined>>({});

    const [showAdd, setShowAdd] = useState(false);
    const [tab, setTab] = useState<"member" | "guest">("member");
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<any[]>([]);
    const [guestName, setGuestName] = useState("");
    const [showDelete, setShowDelete] = useState(false);
    const [showReopen, setShowReopen] = useState(false);

    const handleDeleteEvent = async () => {
        setBusy("delete");
        try {
            const { data } = await diningAdminApi.delete(id);
            toast.success(data?.message ?? "Đã xóa buổi ăn uống");
            router.push("/admin/dining");
        } catch {
            setBusy(null);
            setShowDelete(false);
        }
    };

    const handleReopen = async () => {
        setBusy("reopen");
        try {
            const { data } = await diningAdminApi.reopen(id);
            toast.success(data?.message ?? "Đã mở lại");
            await load();
        } catch { } finally {
            setBusy(null);
            setShowReopen(false);
        }
    };

    const load = async () => {
        try {
            const { data } = await diningAdminApi.get(id);
            setEv(data);
            if (!billInit.current) {
                setBill(Number(data.total_bill) > 0 ? String(Math.round(Number(data.total_bill))) : "");
                billInit.current = true;
            }
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, [id]);

    useEffect(() => {
        if (!ev) return;
        const list: any[] = ev.participants ?? [];
        const idSet = new Set(list.map((p) => p.id));
        setAmounts((prev) => Object.fromEntries(list.map((p) => [p.id, prev[p.id] ?? 0])));
        setLockedIds((prev) => new Set([...prev].filter((i) => idSet.has(i))));
        setModes((prev) =>
            Object.fromEntries(list.map((p) => [p.id, prev[p.id] ?? (p.is_guest ? "cash" : undefined)])),
        );
    }, [ev]);

    useEffect(() => {
        const ch = supabase
            .channel(`dining-admin:${id}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_participants", filter: `event_id=eq.${id}` }, () => load())
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_events", filter: `id=eq.${id}` }, () => load())
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [id]);

    useEffect(() => {
        if (!showAdd || tab !== "member") return;
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(search.trim());
                setResults(data ?? []);
            } finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [search, showAdd, tab]);

    const run = async (key: string, fn: () => Promise<any>, ok: string) => {
        setBusy(key);
        try { await fn(); toast.success(ok); await load(); } catch { } finally { setBusy(null); }
    };

    const closeAdd = () => {
        setShowAdd(false); setSearch(""); setResults([]); setSelected([]); setGuestName(""); setTab("member");
    };

    const handleAdd = async () => {
        setBusy("add");
        try {
            await diningAdminApi.addParticipants(
                id,
                tab === "member" ? { user_ids: selected.map((m) => m.id) } : { guest_full_name: guestName.trim() },
            );
            toast.success("Đã thêm người tham gia");
            closeAdd();
            await load();
        } catch { } finally { setBusy(null); }
    };

    if (loading) return <div className={`${CARD} mx-auto h-48 max-w-3xl animate-pulse bg-[var(--surface-muted)]`} />;
    if (!ev) return null;

    const parts: any[] = ev.participants ?? [];
    const n = parts.length;
    const st = DINING_STATUS[ev.status] ?? DINING_STATUS.open;
    const isOpen = ev.status === "open";
    const total = Number(bill) || 0;
    const existingIds = new Set(parts.map((p) => p.user_id).filter(Boolean));
    const collected = parts.filter((p) => p.payment_status === "confirmed")
        .reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const walletPaid = parts.filter(
        (p) => p.payment_status === "confirmed" && p.payment_method === "wallet",
    );
    const walletPaidTotal = walletPaid.reduce((s, p) => s + Number(p.amount ?? 0), 0);

    const paidCount = parts.filter((p) => p.payment_status === "confirmed").length;
    const otherPaidCount = paidCount - walletPaid.length;


    const sumAmounts = parts.reduce((s, p) => s + (amounts[p.id] ?? 0), 0);
    const diff = total - sumAmounts;
    const canSend = isOpen && n > 0 && total > 0 && diff === 0;

    const handleSplitEqually = () => {
        if (n === 0) return toast.error("Chưa có ai tham gia để chia tiền");
        if (total <= 0) return toast.error("Hãy nhập tổng bill trước khi chia");
        const base = Math.floor(total / n);
        let remainder = total - base * n;
        const next: Record<string, number> = {};
        parts.forEach((p) => {
            const extra = remainder > 0 ? 1 : 0;
            if (remainder > 0) remainder -= 1;
            next[p.id] = base + extra;
        });
        setAmounts(next);
        setLockedIds(new Set());
        toast.success(`Đã chia đều ${formatVnd(total)} cho ${n} người`);
    };

    /* ── sửa tay 1 người: khóa người đó, phần còn lại chia đều cho người chưa khóa ── */
    const handleAmountChange = (pid: string, value: number) => {
        const newLocked = new Set(lockedIds);
        newLocked.add(pid);
        const next = { ...amounts, [pid]: value };

        const lockedSum = parts.reduce((s, p) => (newLocked.has(p.id) ? s + (next[p.id] ?? 0) : s), 0);
        const unlocked = parts.filter((p) => !newLocked.has(p.id));
        if (unlocked.length > 0) {
            const remaining = Math.max(0, total - lockedSum);
            const base = Math.floor(remaining / unlocked.length);
            let rem = remaining - base * unlocked.length;
            unlocked.forEach((p) => {
                const extra = rem > 0 ? 1 : 0;
                if (rem > 0) rem -= 1;
                next[p.id] = base + extra;
            });
        }
        setLockedIds(newLocked);
        setAmounts(next);
    };

    const toggleMode = (pid: string, m: SettleMode, isGuest: boolean) =>
        setModes((prev) => ({ ...prev, [pid]: prev[pid] === m && !isGuest ? undefined : m }));

    /* ── gửi hóa đơn ── */
    const handleIssueBill = async () => {
        const walletCount = parts.filter((p) => modes[p.id] === "wallet").length;
        const msg =
            `Gửi hóa đơn ${formatVnd(total)} cho ${n} người?` +
            (walletCount ? `\n${walletCount} người sẽ bị trừ thẳng ví BNB.` : "");
        if (!confirm(msg)) return;

        setBusy("issue");
        try {
            const { data } = await diningAdminApi.issueBill(id, {
                total_bill: total,
                amounts: parts.map((p) => ({
                    participant_id: p.id,
                    amount: amounts[p.id] ?? 0,
                    settle_method: modes[p.id],
                })),
            });
            if (data?.failed?.length) {
                const names = data.failed
                    .map((f: any) => pName(parts.find((p) => p.id === f.participant_id) ?? {}))
                    .join(", ");
                toast.error(`Đã gửi hóa đơn, nhưng xử lý tự động thất bại cho: ${names}`, { duration: 6000 });
            } else {
                toast.success("Đã gửi hóa đơn");
            }
            await load();
        } catch { } finally { setBusy(null); }
    };

    const sendReceipt = async (p: any) => {
        if (busy) return;
        setBusy(`rc:${p.id}`);
        try {
            const amount = Number(p.amount ?? 0);
            const { blob, fileName } = await buildGuestReceipt({
                reg: {
                    id: p.id,
                    is_guest: true,
                    user_id: null,
                    guest_full_name: p.guest_full_name,
                    payment_method: p.payment_method ?? "cash",
                    payment_status: p.payment_status,
                    amount_override: amount,
                    base_amount: amount,
                    other_fee_amount: 0,
                    other_fee_note: null,
                    users: null,
                },
                session: {
                    id: ev.id,
                    title: ev.title,
                    scheduled_at: ev.event_date,
                    location: ev.location,
                },
                hostName: undefined,
                groupedGuests: [],
                variant: "dining",
            });

            const file = new File([blob], fileName, { type: "image/png" });

            if (
                typeof navigator !== "undefined" &&
                (navigator as any).canShare?.({ files: [file] })
            ) {
                await (navigator as any).share({
                    files: [file],
                    title: `Biên lai: ${ev.title}`,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast.success("Đã tải ảnh biên lai xuống");
            }
        } catch (err: any) {
            if (err?.name !== "AbortError") {
                console.error("[sendReceipt]", err);
                toast.error("Tạo ảnh biên lai thất bại");
            }
        } finally {
            setBusy(null);
        }
    };

    const Btn = ({ k, tone, onClick, children }: { k: string; tone: string; onClick: () => void; children: ReactNode }) => (
        <button
            disabled={busy !== null}
            onClick={onClick}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${BTN[tone]}`}
        >
            {busy === k && <Loader2 className="h-3 w-3 animate-spin" />}
            {children}
        </button>
    );

    return (
        <div className="mx-auto max-w-3xl space-y-4 pb-24">
            <button
                onClick={() => router.push("/admin/dining")}
                className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
                <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>

            {/* Thông tin */}
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
                <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--danger-soft)] px-3 text-xs font-semibold text-[var(--danger)]"
                >
                    <Trash2 className="h-4 w-4" /> Xóa buổi
                </button>
            </section>

            {!isOpen && (
                <section className={`${CARD} space-y-3 p-5`}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-muted)]">
                            Đã thu <strong className="text-[var(--text)]">{formatVnd(collected)}</strong> / {formatVnd(Number(ev.total_bill))}
                        </span>
                        <Btn k="reopen" tone="gray" onClick={() => setShowReopen(true)}>
                            <RotateCcw className="h-3 w-3" /> Mở lại
                        </Btn>
                    </div>
                </section>
            )}

            <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                        <Users className="h-4 w-4" /> Người tham gia ({n})
                    </h2>
                    {isOpen && (
                        <button
                            onClick={() => setShowAdd(true)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                            <UserPlus className="h-4 w-4" /> Thêm người
                        </button>
                    )}
                </div>

                {n === 0 && (
                    <div className={`${CARD} px-6 py-10 text-center text-sm text-[var(--text-faint)]`}>
                        Chưa có ai, bấm "Thêm người" để bắt đầu
                    </div>
                )}

                {isOpen && n > 0 && (
                    <div className={`${CARD} divide-y divide-[var(--border)]`}>
                        {parts.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                                <Avatar url={p.users?.avatar_url} name={pName(p)} size={32} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-[var(--text)]">{pName(p)}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{p.is_guest ? "Khách" : "Thành viên"}</p>
                                </div>
                                <button
                                    aria-label="Xóa"
                                    disabled={busy !== null}
                                    onClick={() => run(`rm:${p.id}`, () => diningAdminApi.removeParticipant(p.id), "Đã xóa")}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)] disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {!isOpen && parts.map((p) => {
                    const ps = PAY_STATUS[p.payment_status] ?? PAY_STATUS.pending;
                    const isGuest = p.is_guest;
                    const unpaid = p.payment_status === "pending";
                    const submitted = p.payment_status === "submitted";
                    const billed = ev.status === "billed";
                    return (
                        <div key={p.id} className={`${CARD} p-4`}>
                            <div className="flex items-start gap-3">
                                <Avatar url={p.users?.avatar_url} name={pName(p)} size={40} className="self-start" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="truncate text-[15px] font-semibold text-[var(--text)]">{pName(p)}</p>
                                        <p className="shrink-0 text-base font-bold tabular-nums text-[var(--text)]">
                                            {p.amount != null ? formatVnd(Number(p.amount)) : "—"}
                                        </p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{isGuest ? "Khách" : "Thành viên"}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <Chip tone={ps.tone}>{ps.label}</Chip>
                                        {p.payment_method && <Chip>{METHOD_LABEL[p.payment_method]}</Chip>}
                                    </div>
                                </div>
                            </div>

                            {billed && (unpaid || submitted) && (
                                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                                    {submitted && (
                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary)]">
                                            <span>
                                                {isGuest ? "Khách" : "Thành viên"} đã báo <strong>{METHOD_LABEL[p.payment_method]}</strong>
                                            </span>
                                            <button
                                                disabled={busy !== null}
                                                onClick={() => run(`rej:${p.id}`, () => diningAdminApi.rejectSubmission(p.id), "Đã từ chối")}
                                                className="font-semibold text-[var(--danger)] disabled:opacity-50"
                                            >
                                                Từ chối
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {isGuest && (
                                            <Btn k={`rc:${p.id}`} tone="gray" onClick={() => sendReceipt(p)}>
                                                <Share2 className="h-3 w-3" /> Biên lai
                                            </Btn>
                                        )}

                                        {(p.payment_method === "bank_transfer" || p.payment_method === "cash") ? (
                                            <Btn
                                                k={`ok:${p.id}`}
                                                tone="green"
                                                onClick={() => run(`ok:${p.id}`, () => diningAdminApi.settle(p.id, p.payment_method), "Đã thu tiền")}
                                            >
                                                ✅ Đã thu tiền
                                            </Btn>
                                        ) : (
                                            <>
                                                <Btn k={`b:${p.id}`} tone="gray"
                                                    onClick={() => run(`b:${p.id}`, () => diningAdminApi.settle(p.id, "bank_transfer"), "Đã xác nhận chuyển khoản")}>
                                                    🏦 Đã nhận CK
                                                </Btn>
                                                <Btn k={`c:${p.id}`} tone="green"
                                                    onClick={() => run(`c:${p.id}`, () => diningAdminApi.settle(p.id, "cash"), "Đã nhận tiền mặt")}>
                                                    💵 Đã nhận tiền mặt
                                                </Btn>
                                            </>
                                        )}

                                        {!isGuest && (
                                            <Btn
                                                k={`w:${p.id}`}
                                                tone="blue"
                                                onClick={() => {
                                                    if (confirm(`Trừ ${formatVnd(Number(p.amount))} từ ví của ${pName(p)}?`)) {
                                                        run(`w:${p.id}`, () => diningAdminApi.settle(p.id, "wallet"), "Đã trừ ví");
                                                    }
                                                }}
                                            >
                                                💳 Trừ ví BNB
                                            </Btn>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </section>

            {isOpen && (
                <section className={`${CARD} space-y-4 p-5`}>
                    <h2 className="text-sm font-semibold text-[var(--text)]">Hóa đơn</h2>

                    {n === 0 ? (
                        <p className="rounded-xl bg-[var(--surface-muted)] px-4 py-6 text-center text-sm text-[var(--text-faint)]">
                            Thêm người tham gia trước để chia tiền
                        </p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-[var(--text-muted)]">Tổng bill (đ)</label>
                                <MoneyInput className="w-full" value={bill} onChange={setBill} />
                                <button
                                    disabled={busy !== null || total <= 0}
                                    onClick={handleSplitEqually}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Divide className="h-4 w-4" />
                                    {total > 0 ? `Chia đều (~${formatVnd(Math.floor(total / n))}/người)` : "Chia đều"}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">
                                    Số tiền từng người phải trả
                                </p>
                                {parts.map((p) => {
                                    const isGuest = p.is_guest;
                                    const mode = modes[p.id];
                                    const locked = lockedIds.has(p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            className={`space-y-2 rounded-xl border p-3 transition-colors ${mode === "wallet"
                                                ? "border-blue-500/40 bg-[var(--primary-soft)]"
                                                : mode === "cash"
                                                    ? "border-emerald-500/40 bg-[var(--success-soft)]"
                                                    : "border-[var(--border)] bg-[var(--surface-muted)]"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Avatar url={p.users?.avatar_url} name={pName(p)} size={28} />
                                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">
                                                    {pName(p)}
                                                    {isGuest && <span className="ml-1 text-xs font-normal text-[var(--text-faint)]">(khách)</span>}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={fmtNum(amounts[p.id] ?? 0)}
                                                    onChange={(e) => handleAmountChange(p.id, parseNum(e.target.value))}
                                                    className={`input-field flex-1 text-right text-sm ${locked ? "font-semibold" : ""}`}
                                                    placeholder="0"
                                                />
                                                <span className="text-xs text-[var(--text-faint)]">đ</span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {METHOD_OPTS.filter((o) => !(o.memberOnly && isGuest)).map(({ v, label, icon: Icon }) => {
                                                    const on = mode === v;
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => toggleMode(p.id, v, isGuest)}
                                                            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border-2 px-3 text-xs font-semibold transition-all ${on
                                                                ? v === "wallet"
                                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                                    : "border-emerald-600 bg-emerald-600 text-white"
                                                                : "border-[var(--border)] text-[var(--text-faint)] hover:border-[var(--border-strong)]"
                                                                }`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5" /> {label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[11px] text-[var(--text-faint)]">
                                                {mode === "wallet"
                                                    ? "Trừ thẳng ví khi gửi hóa đơn"
                                                    : mode
                                                        ? isGuest
                                                            ? "Gửi biên lai cho khách, xác nhận sau"
                                                            : "Gửi thông báo cho member, xác nhận sau"
                                                        : "Chỉ gửi thông báo, member tự thanh toán"}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="space-y-3 border-t border-[var(--border)] pt-3">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Tổng cộng</span>
                                    <span className={diff === 0 && total > 0 ? "text-[var(--primary)]" : "text-[var(--warning)]"}>
                                        {formatVnd(sumAmounts)} / {formatVnd(total)}
                                    </span>
                                </div>

                                {total > 0 && diff !== 0 && (
                                    <p className="text-xs text-[var(--warning)]">
                                        {diff > 0
                                            ? `Còn thiếu ${formatVnd(diff)} so với tổng bill.`
                                            : `Đang dư ${formatVnd(-diff)} so với tổng bill.`}{" "}
                                        Bấm "Chia đều" hoặc chỉnh lại số tiền từng người.
                                    </p>
                                )}

                                {parts.some((p) => modes[p.id] === "wallet") && (
                                    <div className="flex items-center gap-2 rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary)]">
                                        <Wallet className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            {parts.filter((p) => modes[p.id] === "wallet").length} thành viên sẽ bị trừ thẳng ví BNB — tổng{" "}
                                            {formatVnd(
                                                parts.filter((p) => modes[p.id] === "wallet")
                                                    .reduce((s, p) => s + (amounts[p.id] ?? 0), 0),
                                            )}
                                        </span>
                                    </div>
                                )}

                                <button
                                    disabled={busy !== null || !canSend}
                                    onClick={handleIssueBill}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green-500 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                                >
                                    {busy === "issue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    Gửi hóa đơn
                                </button>
                            </div>
                        </>
                    )}
                </section>
            )}

            {showAdd && (
                <ModalShell onClose={closeAdd} dismissible={false}>
                    {(close) => (
                        <>
                            <ModalHeader icon={<UserPlus className="h-4 w-4" />} tone="primary" title="Thêm người tham gia" onClose={close} />
                            <div className="mx-5 mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">
                                {([["member", "Thành viên"], ["guest", "Khách"]] as const).map(([v, l]) => (
                                    <button
                                        key={v} type="button" onClick={() => setTab(v)}
                                        className={`rounded-lg py-2 text-sm font-medium transition-all ${tab === v ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-faint)]"
                                            }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>

                            <ModalBody className="space-y-3">
                                {tab === "member" ? (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                                            <input
                                                value={search} onChange={(e) => setSearch(e.target.value)}
                                                className="input-field pl-9" placeholder="Tìm theo tên hoặc số điện thoại..."
                                            />
                                        </div>
                                        {selected.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {selected.map((m) => (
                                                    <Chip key={m.id} tone="primary">{m.full_name}</Chip>
                                                ))}
                                            </div>
                                        )}
                                        <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)]">
                                            {searching ? (
                                                <p className="py-4 text-center text-sm text-[var(--text-faint)]">Đang tìm...</p>
                                            ) : results.length === 0 ? (
                                                <p className="py-4 text-center text-sm text-[var(--text-faint)]">Không tìm thấy</p>
                                            ) : (
                                                <ul className="divide-y divide-[var(--border)]">
                                                    {results.map((m) => {
                                                        const already = existingIds.has(m.id);
                                                        const on = selected.some((x) => x.id === m.id);
                                                        return (
                                                            <li key={m.id}>
                                                                <button
                                                                    type="button" disabled={already}
                                                                    onClick={() => setSelected((prev) => on ? prev.filter((x) => x.id !== m.id) : [...prev, m])}
                                                                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-40 ${on ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-hover)]"
                                                                        }`}
                                                                >
                                                                    <Avatar url={m.avatar_url} name={m.full_name} size={32} />
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-medium text-[var(--text)]">{m.full_name}</p>
                                                                        <p className="text-xs text-[var(--text-faint)]">{already ? "Đã trong danh sách" : m.phone}</p>
                                                                    </div>
                                                                    {on && <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <input
                                        value={guestName} onChange={(e) => setGuestName(e.target.value)}
                                        className="input-field" placeholder="Tên khách (không có tài khoản)"
                                    />
                                )}
                            </ModalBody>

                            <ModalFooter>
                                <button onClick={close} className="btn-secondary text-sm">Hủy</button>
                                <button
                                    onClick={handleAdd}
                                    disabled={busy === "add" || (tab === "member" ? selected.length === 0 : !guestName.trim())}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Thêm{tab === "member" && selected.length > 1 ? ` (${selected.length})` : ""}
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalShell>
            )}

            {showDelete && (
                <ModalShell size="sm" onClose={() => setShowDelete(false)}>
                    {(close) => (
                        <>
                            <ModalHeader
                                icon={<Trash2 className="h-4 w-4" />}
                                tone="danger"
                                title="Xóa buổi ăn uống?"
                                onClose={close}
                            />
                            <ModalBody>
                                <p className="text-sm text-[var(--text-muted)]">
                                    Xóa buổi <strong className="text-[var(--text)]">"{ev.title}"</strong> và toàn bộ
                                    danh sách {n} người tham gia? Hành động này không thể hoàn tác.
                                </p>
                                {walletPaid.length > 0 && (
                                    <p className="mt-3 rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary)]">
                                        {walletPaid.length} thành viên đã thanh toán bằng ví BNB sẽ được hoàn lại tổng{" "}
                                        <strong>{formatVnd(walletPaidTotal)}</strong>.
                                    </p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <button onClick={close} className="btn-secondary text-sm">Hủy</button>
                                <button
                                    onClick={handleDeleteEvent}
                                    disabled={busy === "delete"}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                    {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận xóa
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalShell>
            )}

            {showReopen && (
                <ModalShell size="sm" onClose={() => setShowReopen(false)}>
                    {(close) => (
                        <>
                            <ModalHeader
                                icon={<RotateCcw className="h-4 w-4" />}
                                tone="primary"
                                title="Mở lại buổi?"
                                onClose={close}
                            />
                            <ModalBody className="space-y-3">
                                <p className="text-sm text-[var(--text-muted)]">
                                    Số tiền đã chia cho{" "}
                                    <strong className="text-[var(--text)]">{n} người</strong> sẽ bị xóa
                                    để bạn chia lại từ đầu.
                                </p>

                                {walletPaid.length > 0 && (
                                    <p className="rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-xs text-[var(--primary)]">
                                        {walletPaid.length} thành viên đã trả bằng ví BNB sẽ được hoàn lại tổng{" "}
                                        <strong>{formatVnd(walletPaidTotal)}</strong>.
                                    </p>
                                )}

                                {otherPaidCount > 0 && (
                                    <p className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
                                        {otherPaidCount} người đã trả chuyển khoản/tiền mặt sẽ bị đặt lại về
                                        chưa thanh toán. Hệ thống không hoàn tiền cho các khoản này, bạn tự xử lý
                                        ngoài đời.
                                    </p>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <button onClick={close} className="btn-secondary text-sm">Hủy</button>
                                <button
                                    onClick={handleReopen}
                                    disabled={busy === "reopen"}
                                    className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {busy === "reopen" && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Xác nhận mở lại
                                </button>
                            </ModalFooter>
                        </>
                    )}
                </ModalShell>
            )}
        </div>
    );
}
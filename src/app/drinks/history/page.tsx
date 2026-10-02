"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ArrowDownLeft,
    Gift,
    Minus,
    Plus,
    Building2,
    GlassWater,
} from "lucide-react";
import { userDrinksApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

type HistoryRow = {
    id: string;
    quantity: number;
    type: "admin_grant" | "admin_deduct" | "gift" | "self_add" | "self_deduct" | "to_club";
    note?: string;
    created_at: string;
    from_user_id?: string;
    to_user_id?: string;
    drinks?: { name: string };
    from_user?: { full_name: string };
    to_user?: { full_name: string };
    performed_by_user?: { full_name: string };
};

const TYPE_LABEL: Record<string, string> = {
    admin_grant: "Admin tặng",
    admin_deduct: "Admin trừ",
    gift: "Tặng nhau",
    self_add: "Tự cộng",
    self_deduct: "Tự trừ",
    to_club: "Gửi về CLB",
};

const TYPE_STYLE: Record<
    string,
    { badge: string; icon: any; iconBg: string; iconColor: string; sign: "+" | "-" }
> = {
    admin_grant: { badge: "bg-[var(--success-soft)] text-[var(--success)]", icon: Gift, iconBg: "bg-[var(--success-soft)]", iconColor: "text-[var(--success)]", sign: "+" },
    admin_deduct: { badge: "bg-[var(--danger-soft)] text-[var(--danger)]", icon: Minus, iconBg: "bg-[var(--danger-soft)]", iconColor: "text-[var(--danger)]", sign: "-" },
    gift: { badge: "bg-[var(--primary-soft)] text-[var(--primary)]", icon: Gift, iconBg: "bg-[var(--primary-soft)]", iconColor: "text-[var(--primary)]", sign: "+" },
    self_add: { badge: "bg-teal-100 text-teal-700", icon: Plus, iconBg: "bg-teal-50", iconColor: "text-teal-600", sign: "+" },
    self_deduct: { badge: "bg-[var(--warning-soft)] text-[var(--warning)]", icon: Minus, iconBg: "bg-[var(--warning-soft)]", iconColor: "text-[var(--warning)]", sign: "-" },
    to_club: { badge: "bg-[var(--warning-soft)] text-[var(--warning)]", icon: Building2, iconBg: "bg-[var(--warning-soft)]", iconColor: "text-[var(--warning)]", sign: "-" },
};

export default function DrinkHistoryPage() {
    const { user } = useAuthStore();
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksApi.getMyHistory({ page, limit: 15 });
            setRows(data.data ?? []);
            setTotalPages(data.meta?.total_pages || 1);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const describeAction = (r: HistoryRow) => {
        if (r.type === "gift") {
            const isReceiver = r.to_user_id === user?.id;
            if (isReceiver) return `${r.from_user?.full_name ?? "?"} → Bạn`;
            return `Bạn → ${r.to_user?.full_name ?? "?"}`;
        }
        if (r.type === "admin_grant") return "Admin đã tặng cho bạn";
        if (r.type === "admin_deduct") return "Admin đã trừ của bạn";
        if (r.type === "self_add") return "Bạn tự cộng vào kho";
        if (r.type === "self_deduct") return "Bạn tự trừ khỏi kho";
        if (r.type === "to_club") return "Bạn gửi về kho CLB";
        return "";
    };

    const getSign = (r: HistoryRow): "+" | "-" => {
        if (r.type === "gift") return r.to_user_id === user?.id ? "+" : "-";
        return TYPE_STYLE[r.type]?.sign ?? "+";
    };

    return (
        <div className="mx-auto max-w-md space-y-4 p-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
            <div className="flex items-center gap-2">
                <Link href="/drinks/my" className="flex-shrink-0 rounded-lg p-2 hover:bg-[var(--surface-hover)]">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-[var(--text)]">Lịch sử nước của tôi</h1>
                    <p className="text-sm text-[var(--text-muted)]">Toàn bộ giao dịch liên quan đến kho nước của bạn</p>
                </div>
            </div>

            <div className="space-y-2.5">
                {loading && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-10 text-center text-sm text-[var(--text-faint)]">
                        Đang tải...
                    </div>
                )}

                {!loading && rows.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] py-10 text-center">
                        <GlassWater className="h-8 w-8 text-[var(--text-faint)]" />
                        <p className="text-sm text-[var(--text-faint)]">Chưa có giao dịch nào</p>
                    </div>
                )}

                {rows.map((r) => {
                    const style = TYPE_STYLE[r.type] ?? {
                        badge: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                        icon: ArrowDownLeft,
                        iconBg: "bg-[var(--surface-muted)]",
                        iconColor: "text-[var(--text-muted)]",
                    };
                    const Icon = style.icon;
                    const sign = getSign(r);

                    return (
                        <div
                            key={r.id}
                            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm"
                        >
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
                                <Icon className={`h-5 w-5 ${style.iconColor}`} />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    {/* <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>
                    {TYPE_LABEL[r.type] ?? r.type}
                </span> */}
                                    <span className="flex-shrink-0 text-[11px] text-[var(--text-faint)]">
                                        {new Date(r.created_at).toLocaleString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>

                                <p className="truncate text-sm font-medium text-[var(--text)]">{describeAction(r)}</p>

                                <div className="flex items-center justify-between">
                                    <span className="truncate text-sm text-[var(--text-muted)]">{r.drinks?.name}</span>
                                    <span
                                        className={`flex-shrink-0 text-sm font-bold ${sign === "+" ? "text-[var(--success)]" : "text-[var(--danger)]"
                                            }`}
                                    >
                                        {sign}{r.quantity}
                                    </span>
                                </div>

                                {r.note && (
                                    <p className="truncate rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-faint)]">
                                        {r.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-[var(--text-muted)]">Trang {page}/{totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
}
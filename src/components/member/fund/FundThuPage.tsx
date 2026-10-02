"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
    fmt, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, THU_CATEGORIES,
} from "@/lib/fund-constants";

const MONTH_NAMES_VI = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export default function FundThuPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [category, setCategory] = useState<string>("");
    const [page, setPage] = useState(1);
    const [txs, setTxs] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ page: 1, total_pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const load = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        return fundApi
            .listTransactions({
                type: "thu",
                category: (category || undefined) as any,
                month, year, status: "approved",
                page, limit: 15,
            })
            .then(({ data }) => {
                setTxs(data.data ?? []);
                setMeta(data.meta ?? { page: 1, total_pages: 1, total: 0 });
            })
            .finally(() => setLoading(false));
    }, [month, year, category, page]);

    useEffect(() => { load(); }, [load]);

    // Realtime: tự refresh khi admin tạo/duyệt/hủy giao dịch quỹ
    useEffect(() => {
        let debounceRef: ReturnType<typeof setTimeout> | null = null;
        const channel = supabase
            .channel("fund-thu-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fund_transactions" },
                () => {
                    if (debounceRef) clearTimeout(debounceRef);
                    debounceRef = setTimeout(() => load(true), 250);
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
            if (debounceRef) clearTimeout(debounceRef);
        };
    }, [load]);

    const changeMonth = (delta: number) => {
        let m = month + delta, y = year;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        setMonth(m); setYear(y); setPage(1);
    };

    const totalThu = txs.reduce((s, t) => s + Number(t.amount), 0);

    return (
        <div className="min-h-screen bg-[var(--surface-muted)]">
            {/* Header */}
            <div
                className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] backdrop-blur-sm border-b border-[var(--border)]"
                style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
                    <Link href="/fund" className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0">
                        <ArrowLeft className="w-4.5 h-4.5 text-[var(--text-muted)]" />
                    </Link>
                    <h1 className="text-base font-bold text-[var(--text)]">Nguồn thu</h1>
                    <div className="w-9 h-9 flex-shrink-0" />
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-4 space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface-hover)]">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-[var(--text)] w-24 text-center">
                        {MONTH_NAMES_VI[month - 1]}/{year}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg text-[var(--text-faint)] hover:bg-[var(--surface-hover)]">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-[var(--success-soft)] border border-[color-mix(in_srgb,var(--success)_30%,transparent)] rounded-2xl p-4 text-center">
                    <p className="text-xs text-[var(--success)]/70 mb-1">Tổng thu (trang này)</p>
                    <p className="text-xl font-black text-[var(--success)]">+{fmt(totalThu)}</p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                    {[{ val: "", label: "Tất cả" }, ...THU_CATEGORIES.map((c) => ({ val: c, label: CATEGORY_LABELS[c] }))].map((o) => (
                        <button
                            key={o.val || "all"}
                            onClick={() => { setCategory(o.val); setPage(1); }}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${category === o.val ? "bg-emerald-600 text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]"}`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
                        </div>
                    ) : txs.length === 0 ? (
                        <p className="px-4 py-14 text-xs text-[var(--text-faint)] text-center">Không có giao dịch nào</p>
                    ) : (
                        txs.map((tx) => {
                            const Icon = CATEGORY_ICONS[tx.category] ?? MoreHorizontal;
                            const color = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS.chi_khac;
                            return (
                                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${color.ic}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.title}</p>
                                        <p className="text-[11px] text-[var(--text-faint)]">
                                            {CATEGORY_LABELS[tx.category]} · {new Date(tx.created_at).toLocaleString("vi-VN", {
                                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--success)] whitespace-nowrap">+{fmt(tx.amount)}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {meta.total_pages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40"
                        >
                            Trước
                        </button>
                        <span className="text-xs text-[var(--text-faint)]">{meta.page}/{meta.total_pages}</span>
                        <button
                            disabled={page >= meta.total_pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface)] border border-[var(--border)] disabled:opacity-40"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
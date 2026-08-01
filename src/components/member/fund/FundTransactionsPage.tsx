"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, X, MoreHorizontal,
} from "lucide-react";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
    fmt, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS,
    THU_CATEGORIES, CHI_CATEGORIES,
} from "@/lib/fund-constants";

const MONTH_NAMES_VI = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export default function FundTransactionsPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [typeFilter, setTypeFilter] = useState<"" | "thu" | "chi">("");
    const [category, setCategory] = useState<string>("");
    const [page, setPage] = useState(1);
    const [txs, setTxs] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ page: 1, total_pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const [categorySheetOpen, setCategorySheetOpen] = useState(false);
    const [categorySheetVisible, setCategorySheetVisible] = useState(false);

    const load = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        return fundApi
            .listTransactions({
                type: (typeFilter || undefined) as any,
                category: (category || undefined) as any,
                month, year, status: "approved",
                page, limit: 15,
            })
            .then(({ data }) => {
                setTxs(data.data ?? []);
                setMeta(data.meta ?? { page: 1, total_pages: 1, total: 0 });
            })
            .finally(() => setLoading(false));
    }, [month, year, typeFilter, category, page]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let debounceRef: ReturnType<typeof setTimeout> | null = null;
        const channel = supabase
            .channel("fund-transactions-realtime")
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

    const totalThu = txs.filter((t) => t.type === "thu").reduce((s, t) => s + Number(t.amount), 0);
    const totalChi = txs.filter((t) => t.type === "chi").reduce((s, t) => s + Number(t.amount), 0);

    // Danh mục hiện ra tùy theo loại đang lọc
    const availableCategories =
        typeFilter === "thu" ? THU_CATEGORIES
            : typeFilter === "chi" ? CHI_CATEGORIES
                : [...THU_CATEGORIES, ...CHI_CATEGORIES];

    const handleTypeChange = (val: "" | "thu" | "chi") => {
        setTypeFilter(val);
        setCategory("");
        setPage(1);
    };

    const openCategorySheet = () => {
        setCategorySheetOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setCategorySheetVisible(true)));
    };
    const closeCategorySheet = () => {
        setCategorySheetVisible(false);
        setTimeout(() => setCategorySheetOpen(false), 300);
    };

    const selectCategory = (val: string) => {
        setCategory(val);
        setPage(1);
        closeCategorySheet();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div
                className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100"
                style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
                    <Link href="/fund" className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <ArrowLeft className="w-4.5 h-4.5 text-gray-600" />
                    </Link>
                    <h1 className="text-base font-bold text-gray-900">Lịch sử giao dịch</h1>
                    <div className="w-9 h-9 flex-shrink-0" />
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-4 space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 w-24 text-center">
                        {MONTH_NAMES_VI[month - 1]}/{year}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
                        <p className="text-[11px] text-emerald-600/70 mb-0.5">Tổng thu</p>
                        <p className="text-base font-black text-emerald-600">+{fmt(totalThu)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-center">
                        <p className="text-[11px] text-red-500/70 mb-0.5">Tổng chi</p>
                        <p className="text-base font-black text-red-500">-{fmt(totalChi)}</p>
                    </div>
                </div>

                {/* Loại giao dịch */}
                <div className="flex items-center gap-2">
                    {[
                        { val: "", label: "Tất cả" },
                        { val: "thu", label: "Thu" },
                        { val: "chi", label: "Chi" },
                    ].map((o) => (
                        <button
                            key={o.val || "all"}
                            onClick={() => handleTypeChange(o.val as "" | "thu" | "chi")}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${typeFilter === o.val ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500"}`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                {/* Danh mục — dropdown mở modal */}
                <button
                    onClick={openCategorySheet}
                    className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-left"
                >
                    <span className="flex items-center gap-2 min-w-0">
                        {category ? (
                            <>
                                {(() => {
                                    const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
                                    const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.chi_khac;
                                    return (
                                        <span className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-3.5 h-3.5 ${color.ic}`} />
                                        </span>
                                    );
                                })()}
                                <span className="text-sm font-semibold text-gray-800 truncate">
                                    {CATEGORY_LABELS[category]}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm font-semibold text-gray-500">Tất cả danh mục</span>
                        )}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
                        </div>
                    ) : txs.length === 0 ? (
                        <p className="px-4 py-14 text-xs text-gray-400 text-center">Không có giao dịch nào</p>
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
                                        <p className="text-sm font-semibold text-gray-900 truncate">{tx.title}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {CATEGORY_LABELS[tx.category]} · {new Date(tx.created_at).toLocaleString("vi-VN", {
                                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ${tx.type === "thu" ? "text-emerald-600" : "text-red-500"}`}>
                                        {tx.type === "thu" ? "+" : "-"}{fmt(tx.amount)}
                                    </span>
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
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 disabled:opacity-40"
                        >
                            Trước
                        </button>
                        <span className="text-xs text-gray-400">{meta.page}/{meta.total_pages}</span>
                        <button
                            disabled={page >= meta.total_pages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 disabled:opacity-40"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>

            {/* Category filter modal (bottom sheet) */}
            {categorySheetOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-end justify-center"
                    style={{
                        background: categorySheetVisible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                        transition: "background .3s",
                    }}
                    onClick={(e) => e.target === e.currentTarget && closeCategorySheet()}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-t-2xl"
                        style={{
                            transform: categorySheetVisible ? "translateY(0)" : "translateY(100%)",
                            transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                            paddingBottom: "env(safe-area-inset-bottom)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900">Chọn danh mục</span>
                            <button onClick={closeCategorySheet} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1">
                            <button
                                onClick={() => selectCategory("")}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${category === "" ? "bg-gray-800 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                            >
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${category === "" ? "bg-white/20" : "bg-gray-100"}`}>
                                    <MoreHorizontal className={`w-4 h-4 ${category === "" ? "text-white" : "text-gray-400"}`} />
                                </span>
                                Tất cả danh mục
                            </button>

                            {availableCategories.map((c) => {
                                const Icon = CATEGORY_ICONS[c] ?? MoreHorizontal;
                                const color = CATEGORY_COLORS[c] ?? CATEGORY_COLORS.chi_khac;
                                const active = category === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => selectCategory(c)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-gray-800 text-white" : "text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-white/20" : color.bg}`}>
                                            <Icon className={`w-4 h-4 ${active ? "text-white" : color.ic}`} />
                                        </span>
                                        {CATEGORY_LABELS[c]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
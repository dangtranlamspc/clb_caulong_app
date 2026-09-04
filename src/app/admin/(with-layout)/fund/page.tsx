"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
    Wallet, Eye, EyeOff, Plus, HandCoins, Hourglass, ArrowUp, ArrowDown,
    Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight,
    ChevronDown, X, Users, Gift, ShoppingCart, PartyPopper, MoreHorizontal,
    AlertTriangle, Loader2, Check, XCircle, Trash2, TrendingUp, TrendingDown,
    Calendar, Sparkles, Coins, UserCircle2,
    RotateCcw, Landmark, Banknote
} from "lucide-react";
import toast from "react-hot-toast";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import AddFundTransactionModal from "@/components/admin/funds/AddFundTransactionModal";
import ApproveFundRequestsSheet from "@/components/admin/funds/ApproveFundRequestsSheet";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { createPortal } from "react-dom";

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

const PAYMENT_METHOD_BADGE: Record<string, { label: string; icon: any; cls: string }> = {
    wallet: { label: "Ví BnB", icon: Wallet, cls: "bg-blue-600 text-white shadow-sm shadow-blue-200" },
    bank_transfer: { label: "Chuyển khoản", icon: Landmark, cls: "bg-indigo-600 text-white shadow-sm shadow-indigo-200" },
    cash: { label: "Tiền mặt", icon: Banknote, cls: "bg-emerald-600 text-white shadow-sm shadow-emerald-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
    phat: "Phạt",
    dong_gop: "Đóng góp",
    tai_tro: "Tài trợ",
    mua_sam: "Mua sắm",
    tiec_team: "Tiệc / Team",
    chi_khac: "Chi phí khác",
};

const CATEGORY_ICONS: Record<string, any> = {
    phat: AlertTriangle,
    dong_gop: Users,
    tai_tro: Gift,
    mua_sam: ShoppingCart,
    tiec_team: PartyPopper,
    chi_khac: MoreHorizontal,
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    pending: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700" },
    approved: { label: "Đã duyệt", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700" },
    reversed: { label: "Đã huỷ", cls: "bg-gray-100 text-gray-500" },
};

const MONTH_NAMES_VI = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function CategoryIcon({ category, type }: { category: string; type: "thu" | "chi" }) {
    const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
    const bg = type === "thu" ? "bg-emerald-100" : "bg-red-100";
    const text = type === "thu" ? "text-emerald-600" : "text-red-500";
    return (
        <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${text}`} />
        </div>
    );
}

function FundSourceBadge({ tx }: { tx: any }) {
    if (tx.type !== "thu") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-slate-100 text-slate-600">
                <Wallet className="w-3 h-3" />
                Quỹ BnB
            </span>
        );
    }

    if (!tx.deducted_member?.full_name) {
        return <span className="text-gray-300 text-xs">—</span>;
    }

    if (!tx.actual_payment_method) {
        return (
            <div className="flex flex-col gap-1 items-center text-center">
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">
                    {tx.deducted_member.full_name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-600">
                    Chờ TV chọn PT
                </span>
            </div>
        );
    }

    const method = PAYMENT_METHOD_BADGE[tx.actual_payment_method] ?? PAYMENT_METHOD_BADGE.wallet;
    const Icon = method.icon;

    return (
        <div className="flex flex-col gap-1 items-center text-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${method.cls}`}>
                <Icon className="w-3.5 h-3.5" />
                {method.label}
            </span>
        </div>
    );
}

export default function FundManagementPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [showBalance, setShowBalance] = useState(true);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);

    const [summary, setSummary] = useState<any>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    const [pendingTotal, setPendingTotal] = useState(0);

    const [txs, setTxs] = useState<any[]>([]);
    const [loadingTxs, setLoadingTxs] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<any>({ page: 1, total_pages: 1 });

    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [filterSheetVisible, setFilterSheetVisible] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [actingId, setActingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const [showAddModal, setShowAddModal] = useState(false);
    const [showApproveSheet, setShowApproveSheet] = useState(false);

    const openMenuAt = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 6, left: rect.right - 160 });
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const loadSummary = useCallback((silent = false) => {
        if (!silent) setLoadingSummary(true);
        return fundApi
            .getSummary(month, year)
            .then(({ data }) => setSummary(data))
            .finally(() => setLoadingSummary(false));
    }, [month, year]);

    const loadTxs = useCallback(
        (silent = false) => {
            if (!silent) setLoadingTxs(true);
            return fundApi
                .listTransactions({
                    month, year, page, limit: 10,
                    search: search.trim() || undefined,
                    type: (typeFilter || undefined) as any,
                    category: (categoryFilter || undefined) as any,
                    status: (statusFilter || undefined) as any,
                })
                .then(({ data }) => {
                    setTxs(data.data ?? []);
                    setMeta(data.meta ?? { page: 1, total_pages: 1 });
                })
                .finally(() => setLoadingTxs(false));
        },
        [month, year, page, search, typeFilter, categoryFilter, statusFilter],
    );


    const loadPendingTotal = useCallback(() => {
        return Promise.all([
            fundApi.listTransactions({ status: "pending", limit: 100, page: 1 }),
            fundApi.listPendingConfirmations({ limit: 100, page: 1 }),
            fundApi.getPendingPenaltyConfirmations(),
        ])
            .then(([reqRes, confRes, penaltyRes]) => {
                const requestCount = (reqRes.data.data ?? []).filter(
                    (tx: any) => tx.payment_method !== "member_choice",
                ).length;
                const confCount = (confRes.data.data ?? []).filter(
                    (tx: any) => tx.category !== "phat",
                ).length;
                const penaltyCount = (penaltyRes.data.data ?? []).length;
                setPendingTotal(requestCount + confCount + penaltyCount);
            })
    }, []);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { loadTxs(); }, [loadTxs]);
    useEffect(() => { loadPendingTotal(); }, [loadPendingTotal]);

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setPage(1), 400);
    };

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        const channel = supabase
            .channel("fund-transactions-page")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fund_transactions" },
                () => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        loadSummary(true);
                        loadTxs(true);
                        loadPendingTotal();
                    }, 250);
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [loadSummary, loadTxs, loadPendingTotal]);

    const changeMonth = (delta: number) => {
        let m = month + delta;
        let y = year;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        setMonth(m); setYear(y); setPage(1);
    };

    const openFilterSheet = () => {
        setFilterSheetOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setFilterSheetVisible(true)));
    };
    const closeFilterSheet = () => {
        setFilterSheetVisible(false);
        setTimeout(() => setFilterSheetOpen(false), 300);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await fundApi.exportReport(month, year);
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = `quy-clb-${year}-${month}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Xuất báo cáo thất bại");
        } finally {
            setExporting(false);
        }
    };

    const handleApprove = async (id: string) => {
        setActingId(id); setOpenMenuId(null);
        try {
            await fundApi.approve(id);
            toast.success("Đã duyệt giao dịch");
            loadSummary(true); loadTxs(true); loadPendingTotal();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
        } finally { setActingId(null); }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt("Lý do từ chối:");
        if (!reason?.trim()) return;
        setActingId(id); setOpenMenuId(null);
        try {
            await fundApi.reject(id, reason.trim());
            toast.success("Đã từ chối giao dịch");
            loadSummary(true); loadTxs(true); loadPendingTotal();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
        } finally { setActingId(null); }
    };

    const handleDelete = async (tx: any) => {
        if (!window.confirm(`Xóa giao dịch "${tx.title}" (${fmt(tx.amount)})? Không thể hoàn tác.`)) return;
        setActingId(tx.id); setOpenMenuId(null);
        try {
            await fundApi.remove(tx.id);
            toast.success("Đã xóa giao dịch");
            loadSummary(true); loadTxs(true); loadPendingTotal();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xóa thất bại");
        } finally { setActingId(null); }
    };

    const handleCancel = async (tx: any) => {
        const confirmMsg =
            tx.category === "phat"
                ? `Hủy khoản phạt "${tx.title}" (${fmt(tx.amount)})? Số tiền sẽ được hoàn lại vào ví thành viên.`
                : tx.type === "chi"
                    ? `Hủy giao dịch chi "${tx.title}" (${fmt(tx.amount)})? Số tiền sẽ được hoàn lại vào quỹ.`
                    : `Hủy giao dịch "${tx.title}" (${fmt(tx.amount)})?`;
        if (!window.confirm(confirmMsg)) return;

        setActingId(tx.id);
        setOpenMenuId(null);
        try {
            await fundApi.cancel(tx.id);
            toast.success("Đã hủy giao dịch");
            loadSummary(true);
            loadTxs(true);
            loadPendingTotal();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Hủy giao dịch thất bại");
        } finally {
            setActingId(null);
        }
    };

    const pendingCount = pendingTotal;


    const isAwaitingMemberChoice = (tx: any) =>
        tx.status === "pending" &&
        tx.payment_method === "member_choice" &&
        tx.payment_status !== "rejected";


    const monthBtnRef = useRef<HTMLButtonElement | null>(null);
    const [monthPickerPos, setMonthPickerPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    const toggleMonthPicker = () => {
        if (!monthPickerOpen && monthBtnRef.current) {
            const rect = monthBtnRef.current.getBoundingClientRect();
            setMonthPickerPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setMonthPickerOpen((v) => !v);
    };

    return (
        <div className="max-w-[1680px] mx-auto space-y-4 pb-8 px-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Quản lý quỹ</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Theo dõi và quản lý thu chi của câu lạc bộ
                    </p>
                </div>

                <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar w-full sm:w-auto">
                    <div className="relative flex-shrink-0">
                        <button
                            ref={monthBtnRef}
                            onClick={toggleMonthPicker}
                            className="flex items-center gap-1.5 sm:gap-2 bg-white border border-gray-200 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:border-gray-300 whitespace-nowrap"
                        >
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            {MONTH_NAMES_VI[month - 1]}/{year}
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${monthPickerOpen ? "rotate-180" : ""}`} />
                        </button>

                        {monthPickerOpen && typeof document !== "undefined" && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setMonthPickerOpen(false)} />
                                <div
                                    style={{ position: "fixed", top: monthPickerPos.top, right: monthPickerPos.right }}
                                    className="z-[9999] w-56 bg-white border border-gray-100 rounded-xl shadow-lg p-3"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-semibold text-gray-700">
                                            {MONTH_NAMES_VI[month - 1]}/{year}
                                        </span>
                                        <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {MONTH_NAMES_VI.map((m, idx) => (
                                            <button
                                                key={m}
                                                onClick={() => { setMonth(idx + 1); setPage(1); setMonthPickerOpen(false); }}
                                                className={`py-1.5 rounded-lg text-[11px] font-semibold ${month === idx + 1 ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                                            >
                                                {idx + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>,
                            document.body,
                        )}
                    </div>

                    <button
                        onClick={openFilterSheet}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 hover:border-gray-300 whitespace-nowrap flex-shrink-0"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Bộ lọc
                        {(typeFilter || categoryFilter || statusFilter) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-3 items-stretch">
                {/* Balance card */}
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5 flex items-center justify-between gap-4 overflow-hidden relative">
                    <Sparkles className="w-4 h-4 text-blue-300 absolute top-4 right-28 hidden sm:block" />
                    <Sparkles className="w-3 h-3 text-blue-200 absolute top-9 right-40 hidden sm:block" />

                    <div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                            Số dư hiện tại
                            <button onClick={() => setShowBalance((v) => !v)} className="text-gray-300 hover:text-gray-500">
                                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {loadingSummary ? (
                            <div className="h-8 w-40 bg-blue-100/60 rounded-lg animate-pulse" />
                        ) : (
                            <p className="text-2xl sm:text-3xl font-black text-blue-700">
                                {showBalance ? fmt(summary?.balance ?? 0) : "••••••••"}
                            </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">
                            {summary?.updated_at
                                ? `Cập nhật lần cuối: ${new Date(summary.updated_at).toLocaleString("vi-VN")}`
                                : ""}
                        </p>
                    </div>

                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                        <Wallet className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                            <Coins className="w-3.5 h-3.5 text-amber-800" />
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 py-3.5 transition-colors text-left"
                >
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight">Thêm giao dịch</p>
                        <p className="text-[11px] text-blue-100 leading-tight">Thu / Chi quỹ</p>
                    </div>
                </button>

                <button
                    onClick={() => setShowApproveSheet(true)}
                    className="relative flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl px-4 py-3.5 transition-colors text-left"
                >
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                        <HandCoins className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm leading-tight">Duyệt yêu cầu</p>
                        <p className="text-[11px] text-amber-50 leading-tight">
                            {pendingCount > 0 ? `${pendingCount} yêu cầu chờ duyệt` : "Không có yêu cầu"}
                        </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/80 flex-shrink-0" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center">
                            <Hourglass className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-400">Chờ duyệt</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{pendingCount}</p>
                    <p className="text-[10px] text-gray-400">Yêu cầu</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-400">Thu hôm nay</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">+{fmt(summary?.thu_hom_nay ?? 0)}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                            <ArrowDown className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-400">Chi hôm nay</span>
                    </div>
                    <p className="text-lg font-bold text-red-500">-{fmt(summary?.chi_hom_nay ?? 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px] gap-4 items-start">
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 flex-shrink-0">Lịch sử giao dịch</p>


                        <div className="hidden lg:flex items-center gap-2">
                            <CustomSelect
                                value={statusFilter}
                                onChange={(val) => { setStatusFilter(val); setPage(1); }}
                                options={[
                                    { value: "", label: "Tất cả trạng thái" },
                                    { value: "pending", label: "Chờ duyệt" },
                                    { value: "approved", label: "Đã duyệt" },
                                    { value: "rejected", label: "Từ chối" },
                                    { value: "reversed", label: "Đã huỷ" },
                                ]}
                                placeholder="Trạng thái"
                                triggerClassName="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 w-36"
                            />
                            <div className="relative w-40 sm:w-56">
                                <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Tìm kiếm giao dịch..."
                                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>
                    </div>

                    {loadingTxs ? (
                        <div className="p-4 space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : txs.length === 0 ? (
                        <p className="px-4 py-14 text-sm text-gray-400 text-center">
                            Không có giao dịch nào trong tháng này
                        </p>
                    ) : (
                        <>
                            <div className="hidden xl:block overflow-x-auto">
                                <table className="w-full min-w-[880px] text-sm table-fixed">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                                            <th className="px-2 py-2.5 font-medium whitespace-nowrap w-10 text-center">#</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-56">Nội dung</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-28 text-center">Thời gian</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-16 text-center">Loại</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-32 text-center">Nguồn tiền</th>
                                            <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-24">Số tiền</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-28 text-center">Người TH</th>
                                            <th className="px-3 py-2.5 font-medium whitespace-nowrap w-20 text-center">Trạng thái</th>
                                            <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap w-20">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txs.map((tx, idx) => {
                                            const st = STATUS_CFG[tx.status] ?? STATUS_CFG.approved;
                                            return (
                                                <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 text-gray-400 text-center">{(page - 1) * 10 + idx + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <CategoryIcon category={tx.category} type={tx.type} />
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-gray-900 truncate max-w-[300px]">{tx.title}</p>
                                                                <p className="text-xs text-gray-400 truncate max-w-[170px]">
                                                                    {CATEGORY_LABELS[tx.category] ?? tx.category}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs text-center">
                                                        {new Date(tx.created_at).toLocaleString("vi-VN", {
                                                            day: "2-digit", month: "2-digit", year: "numeric",
                                                            hour: "2-digit", minute: "2-digit",
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tx.type === "thu" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                                                            {tx.type === "thu" ? "Thu" : "Chi"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <FundSourceBadge tx={tx} />
                                                    </td>
                                                    <td className={`px-4 py-3 text-center font-bold whitespace-nowrap ${tx.type === "thu" ? "text-emerald-600" : "text-red-500"}`}>
                                                        {tx.type === "thu" ? "+" : "-"}{fmt(tx.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-center">
                                                        {tx.created_by_user?.full_name ?? "—"}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.cls}`}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center relative">
                                                        {isAwaitingMemberChoice(tx) ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-600 bg-amber-50">
                                                                Chờ TV thanh toán
                                                            </span>
                                                        ) : tx.status === "approved" ? (
                                                            <button
                                                                onClick={() => handleCancel(tx)}
                                                                disabled={actingId === tx.id}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                            >
                                                                {actingId === tx.id ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                                )}
                                                                Huỷ
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={(e) => openMenuAt(e, tx.id)}
                                                                    disabled={actingId === tx.id}
                                                                    className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100"
                                                                >
                                                                    {actingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                                                                </button>
                                                                {openMenuId === tx.id && typeof window !== "undefined" && createPortal(
                                                                    <>
                                                                        <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                                                                        <div
                                                                            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
                                                                            className="w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-[9999]"
                                                                        >
                                                                            {tx.status === "pending" && (
                                                                                <>
                                                                                    <button onClick={() => handleApprove(tx.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50">
                                                                                        <Check className="w-3.5 h-3.5" /> Duyệt
                                                                                    </button>
                                                                                    <button onClick={() => handleReject(tx.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                                                                                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                            {tx.status !== "approved" && (
                                                                                <button onClick={() => handleDelete(tx)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">
                                                                                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </>,
                                                                    document.body,
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="xl:hidden px-3 py-3 space-y-3">
                                {txs.map((tx) => {
                                    const st = STATUS_CFG[tx.status] ?? STATUS_CFG.approved;
                                    const isPending = tx.status === "pending";
                                    const isApproved = tx.status === "approved";
                                    const canDelete = tx.status !== "approved";
                                    return (
                                        <div
                                            key={tx.id}
                                            className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-200/60 px-4 py-3.5 flex items-center gap-3"
                                        >
                                            <CategoryIcon category={tx.category} type={tx.type} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 line-clamp-2 leading-snug">{tx.title}</p>
                                                <p className="text-xs text-gray-400 truncate mt-0.5">
                                                    {new Date(tx.created_at).toLocaleDateString("vi-VN")} · {CATEGORY_LABELS[tx.category] ?? tx.category}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                    {tx.status !== "approved" && (
                                                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>
                                                            {st.label}
                                                        </span>
                                                    )}
                                                    {tx.type === "thu" && <FundSourceBadge tx={tx} />}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`text-sm font-bold whitespace-nowrap ${tx.type === "thu" ? "text-emerald-600" : "text-red-500"}`}>
                                                    {tx.type === "thu" ? "+" : "-"}{fmt(tx.amount)}
                                                </p>
                                            </div>

                                            {isAwaitingMemberChoice(tx) ? (
                                                <span className="flex-shrink-0 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap">
                                                    Chờ TV
                                                </span>
                                            ) : isApproved ? (
                                                <button
                                                    onClick={() => handleCancel(tx)}
                                                    disabled={actingId === tx.id}
                                                    className="flex-shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                    title="Huỷ giao dịch"
                                                >
                                                    {actingId === tx.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RotateCcw className="w-4 h-4" />
                                                    )}
                                                </button>
                                            ) : (
                                                (isPending || canDelete) && (
                                                    <div className="relative flex-shrink-0">
                                                        <button
                                                            onClick={(e) => openMenuAt(e, tx.id)}
                                                            disabled={actingId === tx.id}
                                                            className="p-1.5 rounded-lg text-gray-300"
                                                        >
                                                            {actingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                                                        </button>
                                                        {openMenuId === tx.id && typeof window !== "undefined" && createPortal(
                                                            <>
                                                                <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenuId(null)} />
                                                                <div
                                                                    style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
                                                                    className="w-36 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-[9999]"
                                                                >
                                                                    {isPending && (
                                                                        <>
                                                                            <button onClick={() => handleApprove(tx.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600">
                                                                                <Check className="w-3.5 h-3.5" /> Duyệt
                                                                            </button>
                                                                            <button onClick={() => handleReject(tx.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500">
                                                                                <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {canDelete && (
                                                                        <button onClick={() => handleDelete(tx)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
                                                                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>,
                                                            document.body,
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {meta.total_pages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <span className="text-xs text-gray-400">{meta.page}/{meta.total_pages}</span>
                            <button
                                disabled={page >= meta.total_pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>

                <div className="hidden xl:block space-y-4">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tổng quan trong tháng</p>
                        {loadingSummary ? (
                            <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
                        ) : (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1.5 text-gray-500">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Tổng thu
                                    </span>
                                    <span className="font-bold text-emerald-600">
                                        +{fmt(summary?.month_overview?.total_thu ?? 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-1.5 text-gray-500">
                                        <TrendingDown className="w-3.5 h-3.5 text-red-400" /> Tổng chi
                                    </span>
                                    <span className="font-bold text-red-500">
                                        -{fmt(summary?.month_overview?.total_chi ?? 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-50">
                                    <span className="text-gray-500">Số dư đầu tháng</span>
                                    <span className="font-semibold text-gray-700">
                                        {fmt(summary?.month_overview?.start_balance ?? 0)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Số dư cuối tháng</span>
                                    <span className="font-semibold text-gray-700">
                                        {fmt(summary?.month_overview?.end_balance ?? 0)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Danh mục thường dùng</p>
                        {loadingSummary ? (
                            <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
                        ) : (summary?.category_breakdown ?? []).length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                        ) : (
                            <div className="space-y-2">
                                {summary.category_breakdown.map((c: any) => {
                                    const Icon = CATEGORY_ICONS[c.category] ?? MoreHorizontal;
                                    const positive = c.amount >= 0;
                                    return (
                                        <div key={c.category} className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${positive ? "bg-emerald-50" : "bg-red-50"}`}>
                                                <Icon className={`w-3.5 h-3.5 ${positive ? "text-emerald-500" : "text-red-400"}`} />
                                            </div>
                                            <span className="text-xs text-gray-500 flex-1">{c.label}</span>
                                            <span className={`text-xs font-bold ${positive ? "text-emerald-600" : "text-red-500"}`}>
                                                {positive ? "+" : ""}{fmt(c.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <a href="#" className="flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 pt-2 border-t border-gray-50">
                            Xem báo cáo chi tiết <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </div>
            {filterSheetOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
                    style={{
                        background: filterSheetVisible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                        transition: "background .3s",
                    }}
                    onClick={(e) => e.target === e.currentTarget && closeFilterSheet()}
                >
                    <div
                        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl"
                        style={{
                            transform: filterSheetVisible ? "translateY(0)" : "translateY(100%)",
                            transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                            paddingBottom: "env(safe-area-inset-bottom)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900">Bộ lọc</span>
                            <button onClick={closeFilterSheet} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Loại giao dịch</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { val: "", label: "Tất cả" },
                                        { val: "thu", label: "Thu" },
                                        { val: "chi", label: "Chi" },
                                    ].map((o) => (
                                        <button
                                            key={o.val || "all"}
                                            onClick={() => { setTypeFilter(o.val); setPage(1); }}
                                            className={`py-2 rounded-lg text-xs font-semibold ${typeFilter === o.val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Danh mục</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ val: "", label: "Tất cả" }, ...Object.entries(CATEGORY_LABELS).map(([val, label]) => ({ val, label }))].map((o) => (
                                        <button
                                            key={o.val || "all_cat"}
                                            onClick={() => { setCategoryFilter(o.val); setPage(1); }}
                                            className={`py-2 rounded-lg text-xs font-semibold ${categoryFilter === o.val ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-2">Trạng thái</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { val: "", label: "Tất cả" },
                                        { val: "pending", label: "Chờ duyệt" },
                                        { val: "approved", label: "Đã duyệt" },
                                        { val: "rejected", label: "Từ chối" },
                                        { val: "reversed", label: "Đã huỷ" },
                                    ].map((o) => (
                                        <button
                                            key={o.val || "all_status"}
                                            onClick={() => { setStatusFilter(o.val); setPage(1); }}
                                            className={`py-2 rounded-lg text-xs font-semibold ${statusFilter === o.val ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-4 pb-4 pt-1">
                            <button onClick={closeFilterSheet} className="w-full py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700">
                                Xong
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setShowAddModal(true)}
                className="lg:hidden fixed bottom-6 right-5 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-300/50 flex items-center justify-center z-30"
                aria-label="Thêm giao dịch"
            >
                <Plus className="w-6 h-6" />
            </button>

            <AddFundTransactionModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    loadSummary(true);
                    loadTxs(true);
                    loadPendingTotal();
                }}
            />

            <ApproveFundRequestsSheet
                open={showApproveSheet}
                onClose={() => setShowApproveSheet(false)}
                onSuccess={() => {
                    loadSummary(true);
                    loadTxs(true);
                    loadPendingTotal();
                }}
            />
        </div>
    );
}
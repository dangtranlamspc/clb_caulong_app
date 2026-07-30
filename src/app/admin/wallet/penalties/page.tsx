"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Wallet,
    RefreshCcw,
    Check,
    X as XIcon,
    Clock,
    ShieldAlert,
    MoreHorizontal,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { penaltiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

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
const STATUS_LABELS: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    rejected: "Từ chối",
};
const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
};
const METHOD_LABELS: Record<string, string> = {
    wallet: "Ví",
    bank_transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

type TabKey = "overview" | "list";

export default function PenaltiesFundPage() {
    const router = useRouter();
    const [tab, setTab] = useState<TabKey>("overview");

    // Tổng quan
    const [summary, setSummary] = useState<any>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    // Danh sách
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [typeFilter, setTypeFilter] = useState<string>("");
    const [list, setList] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ page: 1, total_pages: 1 });
    const [loadingList, setLoadingList] = useState(true);
    const [page, setPage] = useState(1);
    const [actingId, setActingId] = useState<string | null>(null);

    const loadSummary = useCallback((silent = false) => {
        if (!silent) setLoadingSummary(true);
        return penaltiesApi
            .getFundSummary()
            .then(({ data }) => setSummary(data))
            .finally(() => setLoadingSummary(false));
    }, []);

    const loadList = useCallback(
        (silent = false) => {
            if (!silent) setLoadingList(true);
            return penaltiesApi
                .listAdmin({
                    page,
                    limit: 15,
                    payment_status: statusFilter || undefined,
                    type: typeFilter || undefined,
                })
                .then(({ data }) => {
                    setList(data.data ?? []);
                    setMeta(data.meta ?? { page: 1, total_pages: 1 });
                })
                .finally(() => setLoadingList(false));
        },
        [page, statusFilter, typeFilter],
    );

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        if (tab === "list") loadList();
    }, [tab, loadList]);

    const refreshAll = (silent = false) => {
        loadSummary(silent);
        if (tab === "list") loadList(silent);
    };

    // ── Realtime: tự cập nhật khi có bất kỳ thay đổi nào ở bảng penalties ──
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tabRef = useRef(tab);
    tabRef.current = tab;

    useEffect(() => {
        const channel = supabase
            .channel("penalties-fund-page")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "penalties" },
                () => {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => {
                        loadSummary(true);
                        if (tabRef.current === "list") loadList(true);
                    }, 250);
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadSummary, loadList]);

    const handleConfirm = async (id: string) => {
        setActingId(id);
        try {
            await penaltiesApi.confirmPayment(id);
            toast.success("Đã xác nhận khoản phạt");
            refreshAll();
        } finally {
            setActingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = window.prompt("Lý do từ chối:");
        if (!reason || !reason.trim()) return;
        setActingId(id);
        try {
            await penaltiesApi.rejectPayment(id, reason.trim());
            toast.success("Đã từ chối yêu cầu thanh toán");
            refreshAll();
        } finally {
            setActingId(null);
        }
    };

    const handleRetryWallet = async (id: string) => {
        setActingId(id);
        try {
            await penaltiesApi.retryWallet(id);
            toast.success("Đã trừ ví thành công");
            refreshAll();
        } finally {
            setActingId(null);
        }
    };

    const handleDelete = async (p: any) => {
        if (
            !window.confirm(
                `Xóa khoản phạt "${p.reason}" của ${p.users?.full_name ?? "?"} (${fmt(
                    p.amount,
                )})? Hành động này không thể hoàn tác.`,
            )
        )
            return;
        setActingId(p.id);
        try {
            await penaltiesApi.remove(p.id);
            toast.success("Đã xóa khoản phạt");
            refreshAll();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ?? "Xóa khoản phạt thất bại",
            );
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                        <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Quỹ phạt</h1>
                </div>
                <button
                    onClick={() => refreshAll()}
                    className="ml-auto p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                    title="Làm mới"
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                {[
                    { key: "overview", label: "Tổng quan" },
                    { key: "list", label: "Danh sách khoản phạt" },
                ].map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as TabKey)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.key
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "overview" && (
                <>
                    {loadingSummary || !summary ? (
                        <div className="h-40 bg-gray-100 animate-pulse rounded-2xl" />
                    ) : (
                        <>
                            <div className="card space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    Tổng quỹ (đã xác nhận)
                                </p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {fmt(summary.total_fund)}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {(["late_early", "special", "other"] as const).map((t) => {
                                    const Icon = TYPE_ICONS[t];
                                    return (
                                        <div key={t} className="card !p-3 space-y-1 text-center">
                                            <div className="w-8 h-8 mx-auto rounded-lg bg-gray-50 flex items-center justify-center">
                                                <Icon className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-tight">
                                                {TYPE_LABELS[t]}
                                            </p>
                                            <p className="text-sm font-bold text-gray-800">
                                                {fmt(summary.by_type?.[t] ?? 0)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="card !p-0 overflow-hidden">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-4 pb-2">
                                    Lịch sử thu (đã xác nhận)
                                </p>
                                <div className="divide-y divide-gray-100">
                                    {(summary.contributors ?? []).length === 0 && (
                                        <p className="px-4 py-6 text-sm text-gray-400 text-center">
                                            Chưa có khoản phạt nào được xác nhận
                                        </p>
                                    )}
                                    {(summary.contributors ?? []).map((c: any) => (
                                        <div
                                            key={c.penalty_id}
                                            className="px-4 py-3 flex items-center gap-3"
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                                {(() => {
                                                    const Icon = TYPE_ICONS[c.type] ?? MoreHorizontal;
                                                    return <Icon className="w-4 h-4 text-gray-400" />;
                                                })()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {c.full_name ?? "(đã xóa)"}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {c.reason}
                                                    {c.session_title ? ` · ${c.session_title}` : ""}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-red-500">
                                                    +{fmt(c.amount)}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(c.created_at).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {tab === "list" && (
                <>
                    <div className="flex flex-wrap gap-2">
                        {["", "pending", "confirmed", "rejected"].map((s) => (
                            <button
                                key={s || "all"}
                                onClick={() => {
                                    setStatusFilter(s);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                {s ? STATUS_LABELS[s] : "Tất cả trạng thái"}
                            </button>
                        ))}
                        <span className="w-px bg-gray-200 mx-1" />
                        {["", "late_early", "special", "other"].map((t) => (
                            <button
                                key={t || "all_type"}
                                onClick={() => {
                                    setTypeFilter(t);
                                    setPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${typeFilter === t
                                    ? "bg-gray-800 text-white"
                                    : "bg-gray-100 text-gray-500"
                                    }`}
                            >
                                {t ? TYPE_LABELS[t] : "Tất cả loại"}
                            </button>
                        ))}
                    </div>

                    {loadingList ? (
                        <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
                    ) : (
                        <div className="card !p-0 overflow-hidden divide-y divide-gray-100">
                            {list.length === 0 && (
                                <p className="px-4 py-8 text-sm text-gray-400 text-center">
                                    Không có khoản phạt nào
                                </p>
                            )}
                            {list.map((p) => {
                                const Icon = TYPE_ICONS[p.type] ?? MoreHorizontal;
                                const needsConfirm =
                                    p.payment_status === "pending" &&
                                    p.actual_payment_method &&
                                    p.actual_payment_method !== "wallet";
                                const needsRetryWallet =
                                    p.payment_status === "pending" &&
                                    p.payment_method === "wallet" &&
                                    !p.actual_payment_method;
                                const canDelete = p.payment_status !== "confirmed";

                                return (
                                    <div key={p.id} className="px-4 py-3 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                                                <Icon className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {p.users?.full_name ?? "(đã xóa)"}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {TYPE_LABELS[p.type]} · {p.reason}
                                                    {p.sessions?.title ? ` · ${p.sessions.title}` : ""}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {fmt(p.amount)}
                                                </p>
                                                <span
                                                    className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[p.payment_status]}`}
                                                >
                                                    {STATUS_LABELS[p.payment_status]}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    disabled={actingId === p.id}
                                                    onClick={() => handleDelete(p)}
                                                    title="Xóa khoản phạt"
                                                    className="ml-1 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {p.actual_payment_method && (
                                            <p className="text-[11px] text-gray-400 pl-12">
                                                Phương thức:{" "}
                                                <span className="font-medium text-gray-600">
                                                    {METHOD_LABELS[p.actual_payment_method]}
                                                </span>
                                            </p>
                                        )}

                                        {(needsConfirm || needsRetryWallet) && (
                                            <div className="flex gap-2 pl-12">
                                                {needsConfirm && (
                                                    <>
                                                        <button
                                                            disabled={actingId === p.id}
                                                            onClick={() => handleConfirm(p.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Xác nhận
                                                        </button>
                                                        <button
                                                            disabled={actingId === p.id}
                                                            onClick={() => handleReject(p.id)}
                                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold disabled:opacity-50"
                                                        >
                                                            <XIcon className="w-3.5 h-3.5" /> Từ chối
                                                        </button>
                                                    </>
                                                )}
                                                {needsRetryWallet && (
                                                    <button
                                                        disabled={actingId === p.id}
                                                        onClick={() => handleRetryWallet(p.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                                                    >
                                                        <Wallet className="w-3.5 h-3.5" /> Thử trừ ví lại
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {meta.total_pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <span className="text-xs text-gray-400">
                                {meta.page}/{meta.total_pages}
                            </span>
                            <button
                                disabled={page >= meta.total_pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
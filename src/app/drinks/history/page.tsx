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
    admin_grant: { badge: "bg-emerald-100 text-emerald-700", icon: Gift, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", sign: "+" },
    admin_deduct: { badge: "bg-red-100 text-red-700", icon: Minus, iconBg: "bg-red-50", iconColor: "text-red-600", sign: "-" },
    gift: { badge: "bg-blue-100 text-blue-700", icon: Gift, iconBg: "bg-blue-50", iconColor: "text-blue-600", sign: "+" },
    self_add: { badge: "bg-teal-100 text-teal-700", icon: Plus, iconBg: "bg-teal-50", iconColor: "text-teal-600", sign: "+" },
    self_deduct: { badge: "bg-orange-100 text-orange-700", icon: Minus, iconBg: "bg-orange-50", iconColor: "text-orange-600", sign: "-" },
    to_club: { badge: "bg-amber-100 text-amber-700", icon: Building2, iconBg: "bg-amber-50", iconColor: "text-amber-600", sign: "-" },
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
                <Link href="/drinks/my" className="flex-shrink-0 rounded-lg p-2 hover:bg-gray-100">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Lịch sử nước của tôi</h1>
                    <p className="text-sm text-gray-500">Toàn bộ giao dịch liên quan đến kho nước của bạn</p>
                </div>
            </div>

            <div className="space-y-2.5">
                {loading && (
                    <div className="rounded-2xl border border-gray-100 bg-white py-10 text-center text-sm text-gray-400">
                        Đang tải...
                    </div>
                )}

                {!loading && rows.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white py-10 text-center">
                        <GlassWater className="h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-400">Chưa có giao dịch nào</p>
                    </div>
                )}

                {rows.map((r) => {
                    const style = TYPE_STYLE[r.type] ?? {
                        badge: "bg-gray-100 text-gray-600",
                        icon: ArrowDownLeft,
                        iconBg: "bg-gray-50",
                        iconColor: "text-gray-500",
                    };
                    const Icon = style.icon;
                    const sign = getSign(r);

                    return (
                        <div
                            key={r.id}
                            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm"
                        >
                            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
                                <Icon className={`h-5 w-5 ${style.iconColor}`} />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    {/* <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}>
                    {TYPE_LABEL[r.type] ?? r.type}
                </span> */}
                                    <span className="flex-shrink-0 text-[11px] text-gray-400">
                                        {new Date(r.created_at).toLocaleString("vi-VN", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>

                                <p className="truncate text-sm font-medium text-gray-800">{describeAction(r)}</p>

                                <div className="flex items-center justify-between">
                                    <span className="truncate text-sm text-gray-500">{r.drinks?.name}</span>
                                    <span
                                        className={`flex-shrink-0 text-sm font-bold ${sign === "+" ? "text-emerald-600" : "text-red-500"
                                            }`}
                                    >
                                        {sign}{r.quantity}
                                    </span>
                                </div>

                                {r.note && (
                                    <p className="truncate rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-400">
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
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
}
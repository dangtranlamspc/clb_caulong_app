"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { GlassWater, TrendingUp, Users, Package, History, Search, Plus, Minus, X, UserPlus, Trash2, ClipboardList, Check } from "lucide-react";
import toast from "react-hot-toast";
import { userDrinksAdminApi, drinksAdminApi, membersAdminApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

type Drink = { id: string; name: string; price: number; image_url?: string };

type MemberRow = {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
    total_quantity: number;
    drinks: { drink_id: string; name: string; quantity: number; image_url?: string | null }[];
};

type Stats = {
    total_members_owning: number;
    total_quantity: number;
    total_value: number;
    total_transactions: number;
    transactions_this_month: number;
};

type DrinkBreakdown = {
    drink_id: string;
    name: string;
    image_url?: string;
    price?: number;
    total_quantity: number;
    member_count: number;
};

type DrinkOwnerRow = {
    user_id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
    quantity: number;
};

type HistoryRow = {
    id: string;
    quantity: number;
    type: "admin_grant" | "admin_deduct" | "gift";
    note?: string;
    created_at: string;
    drinks?: { name: string };
    from_user?: { full_name: string };
    to_user?: { full_name: string };
    performed_by_user?: { full_name: string };
};

type SearchedUser = { id: string; full_name: string; phone?: string; avatar_url?: string };

const formatNumber = (n: number) => n.toLocaleString("vi-VN");
const formatCurrency = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const TYPE_LABEL: Record<string, string> = {
    admin_grant: "Admin tặng",
    admin_deduct: "Admin trừ",
    gift: "Tặng nhau",
    self_add: "Tự cộng",
    self_deduct: "Tự trừ",
    to_club: "Gửi về CLB",
    admin_transfer: "Admin chuyển",
};

const TYPE_COLOR: Record<string, string> = {
    admin_grant: "bg-emerald-100 text-emerald-700",
    admin_deduct: "bg-red-100 text-red-700",
    gift: "bg-blue-100 text-blue-700",
    self_add: "bg-teal-100 text-teal-700",
    self_deduct: "bg-orange-100 text-orange-700",
    to_club: "bg-amber-100 text-amber-700",
    admin_transfer: "bg-purple-100 text-purple-700",
};

export default function DrinksOverviewPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [adjustTarget, setAdjustTarget] = useState<MemberRow | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [grantOpen, setGrantOpen] = useState(false);
    const [requestsOpen, setRequestsOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const [breakdown, setBreakdown] = useState<DrinkBreakdown[]>([]);
    const [loadingBreakdown, setLoadingBreakdown] = useState(true);
    const [drinkMembersTarget, setDrinkMembersTarget] = useState<DrinkBreakdown | null>(null);

    const [totalMembersOpen, setTotalMembersOpen] = useState(false);
    const [totalQuantityOpen, setTotalQuantityOpen] = useState(false);

    const loadBreakdown = useCallback(async () => {
        setLoadingBreakdown(true);
        try {
            const { data } = await userDrinksAdminApi.getDrinksBreakdown();
            setBreakdown(data);
        } catch {
        } finally {
            setLoadingBreakdown(false);
        }
    }, []);

    const loadStats = useCallback(async () => {
        try {
            const { data } = await userDrinksAdminApi.getOverviewStats();
            setStats(data);
        } catch { }
    }, []);

    const loadPendingCount = useCallback(async () => {
        try {
            const { data } = await userDrinksAdminApi.getPendingRequestsCount();
            setPendingCount(data.count);
        } catch { }
    }, []);

    const loadMembers = useCallback(async () => {
        setLoadingMembers(true);
        try {
            const { data } = await userDrinksAdminApi.getOverviewMembers({
                search: search || undefined,
                page,
                limit: 20,
            });
            setMembers(data.data);
            setTotalPages(data.meta.total_pages || 1);
        } catch {
        } finally {
            setLoadingMembers(false);
        }
    }, [search, page]);

    useEffect(() => { loadStats(); }, [loadStats]);
    useEffect(() => { loadMembers(); }, [loadMembers]);
    useEffect(() => { loadPendingCount(); }, [loadPendingCount]);
    useEffect(() => { loadBreakdown(); }, [loadBreakdown]);

    useEffect(() => {
        const channel = supabase
            .channel(`drink-requests:admin`)
            .on("broadcast", { event: "requests_updated" }, () => {
                loadPendingCount();
                loadMembers();
                loadStats();
                loadBreakdown();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const refreshAll = () => {
        loadStats();
        loadMembers();
        loadPendingCount();
        loadBreakdown();
    };

    return (
        <div className="space-y-5 pb-8">
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={Users}
                    label="Thành viên sở hữu"
                    value={stats ? formatNumber(stats.total_members_owning) : "—"}
                    color="bg-sky-500"
                    onClick={() => setTotalMembersOpen(true)}
                />
                <StatCard
                    icon={Package}
                    label="Tổng số lượng nước"
                    value={stats ? formatNumber(stats.total_quantity) : "—"}
                    color="bg-emerald-500"
                    onClick={() => setTotalQuantityOpen(true)}
                />
            </div>

            <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Theo từng loại nước đang lưu hành</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {loadingBreakdown && breakdown.length === 0 && (
                        <div className="col-span-full text-center py-6 text-gray-400 text-sm">Đang tải...</div>
                    )}
                    {!loadingBreakdown && breakdown.length === 0 && (
                        <div className="col-span-full text-center py-6 text-gray-400 text-sm">Chưa có nước nào đang lưu hành</div>
                    )}
                    {breakdown.map((b) => (
                        <DrinkBreakdownCard key={b.drink_id} drink={b} onClick={() => setDrinkMembersTarget(b)} />
                    ))}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                        placeholder="Tìm theo tên, SĐT..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:flex-wrap sm:justify-end">
                    <button
                        onClick={() => setGrantOpen(true)}
                        className="w-1/2 sm:w-auto ml-auto sm:ml-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 shadow-sm order-1 sm:order-3"
                    >
                        <UserPlus className="w-4 h-4" />
                        Thêm nước
                    </button>

                    <div className="flex gap-2 order-2 sm:contents">
                        <button
                            onClick={() => setRequestsOpen(true)}
                            className="relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Yêu cầu chờ duyệt
                            {pendingCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setHistoryOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <History className="w-4 h-4" />
                            Lịch sử giao dịch
                        </button>
                    </div>
                </div>
            </div>

            <div className="sm:bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden">
                <div className="sm:hidden p-3 space-y-3">
                    {loadingMembers && (
                        <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                    )}
                    {!loadingMembers && members.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Chưa có thành viên nào sở hữu nước</div>
                    )}
                    {members.map((m) => (
                        <div key={m.user_id} className="p-4 space-y-3 rounded-2xl border border-gray-100 shadow-md bg-white">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {m.avatar_url ? (
                                        <img src={m.avatar_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs flex-shrink-0">
                                            {m.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                                        {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-400">Tổng SL</p>
                                    <p className="font-bold text-sky-600 text-lg">{formatNumber(m.total_quantity)}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {m.drinks.map((d) => (
                                    <div key={d.drink_id} className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-sky-50 text-sky-700">
                                        <div className="w-14 h-18 rounded-lg bg-white border border-sky-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {d.image_url ? (
                                                <img src={d.image_url} alt={d.name} className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <GlassWater className="w-5 h-5 text-sky-400" />
                                            )}
                                        </div>
                                        <div className="leading-tight">
                                            <p className="text-xs font-semibold">{d.name}</p>
                                            <p className="text-[11px] text-sky-500">SL: {d.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center">
                                <button
                                    onClick={() => setAdjustTarget(m)}
                                    className="px-8 py-3 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600"
                                >
                                    Điều chỉnh
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Thành viên</th>
                                <th className="text-left px-4 py-3 font-semibold">Đang sở hữu</th>
                                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Tổng SL</th>
                                <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingMembers && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                            )}
                            {!loadingMembers && members.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Chưa có thành viên nào sở hữu nước</td></tr>
                            )}
                            {members.map((m) => (
                                <tr key={m.user_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                            {m.avatar_url ? (
                                                <img src={m.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs flex-shrink-0">
                                                    {m.full_name?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900">{m.full_name}</p>
                                                {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-nowrap gap-2">
                                            {m.drinks.map((d) => (
                                                <div key={d.drink_id} className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 flex-shrink-0">
                                                    <div className="w-14 h-20 rounded-lg bg-white border border-sky-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        {d.image_url ? (
                                                            <img src={d.image_url} alt={d.name} className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <GlassWater className="w-5 h-5 text-sky-400" />
                                                        )}
                                                    </div>
                                                    <div className="leading-tight whitespace-nowrap">
                                                        <p className="text-xs font-semibold">{d.name}</p>
                                                        <p className="text-[11px] text-sky-500">SL: {d.quantity}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatNumber(m.total_quantity)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => setAdjustTarget(m)}
                                            className="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600"
                                        >
                                            Điều chỉnh
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Trước</button>
                        <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Sau</button>
                    </div>
                )}
            </div>

            {adjustTarget && createPortal(
                <AdjustDrinkModal
                    member={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={() => { setAdjustTarget(null); refreshAll(); }}
                />,
                document.body
            )}

            {grantOpen && createPortal(
                <GrantDrinkModal
                    onClose={() => setGrantOpen(false)}
                    onSuccess={() => { setGrantOpen(false); refreshAll(); }}
                />,
                document.body
            )}

            {historyOpen && createPortal(
                <HistoryModal onClose={() => setHistoryOpen(false)} />,
                document.body
            )}

            {requestsOpen && createPortal(
                <RequestsModal onClose={() => setRequestsOpen(false)} onChanged={refreshAll} />,
                document.body
            )}

            {drinkMembersTarget && createPortal(
                <DrinkMembersModal
                    drink={drinkMembersTarget}
                    onClose={() => setDrinkMembersTarget(null)}
                />,
                document.body
            )}

            {totalMembersOpen && createPortal(
                <TotalMembersModal onClose={() => setTotalMembersOpen(false)} />,
                document.body
            )}

            {totalQuantityOpen && createPortal(
                <TotalQuantityModal
                    breakdown={breakdown}
                    onClose={() => setTotalQuantityOpen(false)}
                    onSelectDrink={(d) => { setTotalQuantityOpen(false); setDrinkMembersTarget(d); }}
                />,
                document.body
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: string; color: string; onClick?: () => void }) {
    const clickable = !!onClick;
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${clickable ? "cursor-pointer hover:border-sky-300 hover:shadow-md transition-all" : ""
                }`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{label}</p>
                <p className="text-base font-bold text-gray-900 truncate">{value}</p>
            </div>
        </div>
    );
}

function DrinkBreakdownCard({ drink, onClick }: { drink: DrinkBreakdown; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 text-left hover:border-sky-300 hover:shadow-md transition-all"
        >
            <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {drink.image_url ? (
                    <img src={drink.image_url} alt={drink.name} className="w-full h-full object-contain p-1" />
                ) : (
                    <GlassWater className="w-5 h-5 text-sky-400" />
                )}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{drink.name}</p>
                <p className="text-base font-bold text-sky-600">{formatNumber(drink.total_quantity)}</p>
                <p className="text-[11px] text-gray-400">{formatNumber(drink.member_count)} thành viên</p>
            </div>
        </button>
    );
}

function DrinkMembersModal({ drink, onClose }: { drink: DrinkBreakdown; onClose: () => void }) {
    const [rows, setRows] = useState<DrinkOwnerRow[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksAdminApi.getMembersOwningDrink(drink.drink_id, {
                search: search || undefined,
                page,
                limit: 20,
            });
            setRows(data.data);
            setTotalPages(data.meta.total_pages || 1);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [drink.drink_id, search, page]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {drink.image_url ? (
                                <img src={drink.image_url} className="w-full h-full object-contain p-1" alt="" />
                            ) : (
                                <GlassWater className="w-4 h-4 text-sky-400" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{drink.name}</h3>
                            <p className="text-xs text-gray-400">
                                {formatNumber(drink.total_quantity)} chai · {formatNumber(drink.member_count)} thành viên
                            </p>
                        </div>
                    </div>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                            placeholder="Tìm theo tên, SĐT..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {loading && (
                        <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                    )}
                    {!loading && rows.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Không có thành viên nào sở hữu</div>
                    )}
                    {!loading && rows.map((r) => (
                        <div key={r.user_id} className="p-4 flex items-center gap-3">
                            {r.avatar_url ? (
                                <img src={r.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs flex-shrink-0">
                                    {r.full_name?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{r.full_name}</p>
                                {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400">Sở hữu</p>
                                <p className="font-bold text-gray-900">{r.quantity}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100 flex-shrink-0">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Trước</button>
                        <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Sau</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function TotalMembersModal({ onClose }: { onClose: () => void }) {
    const [rows, setRows] = useState<MemberRow[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksAdminApi.getOverviewMembers({
                search: search || undefined,
                page,
                limit: 20,
            });
            setRows(data.data);
            setTotalPages(data.meta.total_pages || 1);
        } catch {
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900">Thành viên sở hữu nước</h3>
                        <p className="text-xs text-gray-400">Danh sách toàn bộ thành viên đang có nước trong kho</p>
                    </div>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                            placeholder="Tìm theo tên, SĐT..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-100">
                    {loading && (
                        <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                    )}
                    {!loading && rows.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Không tìm thấy thành viên</div>
                    )}
                    {!loading && rows.map((m) => (
                        <div key={m.user_id} className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {m.avatar_url ? (
                                        <img src={m.avatar_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs flex-shrink-0">
                                            {m.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                                        {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-gray-400">Tổng SL</p>
                                    <p className="font-bold text-sky-600 text-lg">{formatNumber(m.total_quantity)}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {m.drinks.map((d) => (
                                    <span key={d.drink_id} className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-semibold">
                                        {d.name}: {d.quantity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100 flex-shrink-0">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Trước</button>
                        <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Sau</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function TotalQuantityModal({
    breakdown,
    onClose,
    onSelectDrink,
}: {
    breakdown: DrinkBreakdown[];
    onClose: () => void;
    onSelectDrink: (d: DrinkBreakdown) => void;
}) {
    const [closing, setClosing] = useState(false);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const grandTotal = breakdown.reduce((s, b) => s + b.total_quantity, 0);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900">Tổng số lượng nước</h3>
                        <p className="text-xs text-gray-400">{formatNumber(grandTotal)} chai đang lưu hành, theo từng loại</p>
                    </div>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-100">
                    {breakdown.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Chưa có nước nào đang lưu hành</div>
                    )}
                    {breakdown.map((b) => (
                        <button
                            key={b.drink_id}
                            onClick={() => onSelectDrink(b)}
                            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left"
                        >
                            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {b.image_url ? (
                                    <img src={b.image_url} alt={b.name} className="w-full h-full object-contain p-1" />
                                ) : (
                                    <GlassWater className="w-5 h-5 text-sky-400" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                                <p className="text-xs text-gray-400">{formatNumber(b.member_count)} thành viên sở hữu</p>
                            </div>
                            <p className="text-base font-bold text-sky-600 flex-shrink-0">{formatNumber(b.total_quantity)}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GrantDrinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [closing, setClosing] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        drinksAdminApi.list(false).then(({ data }) => setDrinks(data));
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(query.trim());
                setResults(data);
            } catch {
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    const requestClose = () => {   // ⬅️ thêm
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const selectedDrinks = drinks
        .map((d) => ({ drink: d, quantity: Number(amounts[d.id]) || 0 }))
        .filter((x) => x.quantity > 0);

    const handleSubmit = async () => {
        if (!selectedUser) return toast.error("Vui lòng chọn thành viên");
        if (selectedDrinks.length === 0) return toast.error("Vui lòng nhập số lượng ít nhất 1 loại nước");

        setSubmitting(true);
        try {
            for (const { drink, quantity } of selectedDrinks) {
                await userDrinksAdminApi.grant(selectedUser.id, {
                    drink_id: drink.id,
                    quantity,
                    note: note || undefined,
                });
            }
            toast.success(`Đã tặng nước cho ${selectedUser.full_name}`);
            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-bold text-gray-900">Thêm nước cho thành viên</h3>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5 overflow-y-auto pr-0.5 no-scrollbar">
                    <div>
                        <label className="text-xs font-semibold text-gray-500">Thành viên</label>
                        {selectedUser ? (
                            <div className="mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl border border-sky-200 bg-sky-50">
                                <div className="flex items-center gap-2.5">
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs">
                                            {selectedUser.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{selectedUser.full_name}</p>
                                        {selectedUser.phone && <p className="text-xs text-gray-400">{selectedUser.phone}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedUser(null); setQuery(""); }}
                                    className="text-xs font-semibold text-sky-600 hover:underline"
                                >
                                    Đổi
                                </button>
                            </div>
                        ) : (
                            <div className="relative mt-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Nhập tên hoặc SĐT thành viên..."
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                                {(searching || results.length > 0) && (
                                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto no-scrollbar rounded-xl border border-gray-200 bg-white shadow-lg">
                                        {searching && (
                                            <div className="px-3 py-2.5 text-xs text-gray-400">Đang tìm...</div>
                                        )}
                                        {!searching && results.length === 0 && query.trim().length >= 2 && (
                                            <div className="px-3 py-2.5 text-xs text-gray-400">Không tìm thấy thành viên</div>
                                        )}
                                        {!searching && results.map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => { setSelectedUser(u); setResults([]); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left"
                                            >
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                                                        {u.full_name?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                                                    {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Loại nước &amp; số lượng</label>
                        <div className="mt-1.5 space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                            {drinks.length === 0 && (
                                <p className="text-xs text-gray-400 py-2">Đang tải danh sách nước...</p>
                            )}
                            {drinks.map((d) => (
                                <div
                                    key={d.id}
                                    className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5"
                                >
                                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                        {d.image_url ? (
                                            <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <GlassWater className="h-4 w-4 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-gray-800">{d.name}</p>
                                        <p className="text-[11px] text-gray-400">{formatCurrency(d.price)}</p>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={amounts[d.id] ?? ""}
                                        onChange={(e) => setAmounts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                        className="w-16 flex-shrink-0 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-sky-400 focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Ghi chú (tuỳ chọn)</label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            placeholder="VD: Thưởng thi đấu tốt"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !selectedUser || selectedDrinks.length === 0}
                        className="w-full py-3 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60"
                    >
                        {submitting ? "Đang xử lý..." : "Xác nhận tặng"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AdjustDrinkModal({ member, onClose, onSuccess }: { member: MemberRow; onClose: () => void; onSuccess: () => void }) {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [action, setAction] = useState<"grant" | "deduct" | "transfer">("grant");
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [closing, setClosing] = useState(false);

    const [transferQuery, setTransferQuery] = useState("");
    const [transferResults, setTransferResults] = useState<SearchedUser[]>([]);
    const [transferSearching, setTransferSearching] = useState(false);
    const [transferTarget, setTransferTarget] = useState<SearchedUser | null>(null);
    const transferDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        drinksAdminApi.list(false).then(({ data }) => setDrinks(data));
    }, []);

    useEffect(() => {
        if (transferDebounceRef.current) clearTimeout(transferDebounceRef.current);
        if (!transferQuery.trim() || transferQuery.trim().length < 2) {
            setTransferResults([]);
            return;
        }
        transferDebounceRef.current = setTimeout(async () => {
            setTransferSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(transferQuery.trim());
                setTransferResults((data as SearchedUser[]).filter((u) => u.id !== member.user_id));
            } catch {
            } finally {
                setTransferSearching(false);
            }
        }, 300);
        return () => { if (transferDebounceRef.current) clearTimeout(transferDebounceRef.current); };
    }, [transferQuery, member.user_id]);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const ownedMap = new Map(member.drinks.map((d) => [d.drink_id, d.quantity]));

    const visibleDrinks =
        action === "deduct" || action === "transfer"
            ? drinks.filter((d) => (ownedMap.get(d.id) ?? 0) > 0)
            : drinks;

    const selectedDrinks = visibleDrinks
        .map((d) => ({ drink: d, quantity: Number(amounts[d.id]) || 0, owned: ownedMap.get(d.id) ?? 0 }))
        .filter((x) => x.quantity > 0);

    const invalidQuantity =
        (action === "deduct" || action === "transfer") &&
        selectedDrinks.some((x) => x.quantity > x.owned);

    const switchAction = (a: "grant" | "deduct" | "transfer") => {
        if (a === action) return;
        setAction(a);
        setAmounts({});
    };

    const handleSubmit = async () => {
        if (selectedDrinks.length === 0) return toast.error("Vui lòng nhập số lượng ít nhất 1 loại nước");
        if (invalidQuantity) return toast.error("Có loại nước vượt quá số lượng đang sở hữu");
        if (action === "transfer" && !transferTarget) return toast.error("Vui lòng chọn thành viên nhận");

        setSubmitting(true);
        try {
            for (const { drink, quantity } of selectedDrinks) {
                const payload = { drink_id: drink.id, quantity, note: note || undefined };
                if (action === "grant") {
                    await userDrinksAdminApi.grant(member.user_id, payload);
                } else if (action === "deduct") {
                    await userDrinksAdminApi.deduct(member.user_id, payload);
                } else {
                    await userDrinksAdminApi.transfer(member.user_id, {
                        ...payload,
                        to_user_id: transferTarget!.id,
                    });
                }
            }
            toast.success(
                action === "grant"
                    ? "Đã tặng nước cho thành viên"
                    : action === "deduct"
                        ? "Đã trừ nước của thành viên"
                        : `Đã chuyển nước sang ${transferTarget?.full_name}`,
            );
            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    const submitDisabled =
        submitting ||
        selectedDrinks.length === 0 ||
        invalidQuantity ||
        (action === "transfer" && !transferTarget);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                @keyframes tabContentIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                .tab-content-in { animation: tabContentIn 0.18s ease-out both; }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[92vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-bold text-gray-900">Điều chỉnh nước — {member.full_name}</h3>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto pr-0.5 no-scrollbar">
                    <div className="grid grid-cols-3 gap-2 mb-3.5">
                        <button
                            onClick={() => switchAction("grant")}
                            className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors duration-150 ${action === "grant" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 text-gray-600"}`}
                        >
                            <Plus className="w-3.5 h-3.5" /> Tặng thêm
                        </button>
                        <button
                            onClick={() => switchAction("deduct")}
                            className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors duration-150 ${action === "deduct" ? "bg-red-500 border-red-500 text-white" : "border-gray-200 text-gray-600"}`}
                        >
                            <Minus className="w-3.5 h-3.5" /> Trừ bớt
                        </button>
                        <button
                            onClick={() => switchAction("transfer")}
                            className={`flex items-center justify-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors duration-150 ${action === "transfer" ? "bg-sky-500 border-sky-500 text-white" : "border-gray-200 text-gray-600"}`}
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Chuyển nước
                        </button>
                    </div>

                    <div key={action} className="space-y-3.5 tab-content-in">
                        {action === "transfer" && (
                            <div>
                                <label className="text-xs font-semibold text-gray-500">Chuyển đến thành viên</label>
                                {transferTarget ? (
                                    <div className="mt-1 flex items-center justify-between px-3 py-2.5 rounded-xl border border-sky-200 bg-sky-50">
                                        <div className="flex items-center gap-2.5">
                                            {transferTarget.avatar_url ? (
                                                <img src={transferTarget.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs">
                                                    {transferTarget.full_name?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{transferTarget.full_name}</p>
                                                {transferTarget.phone && <p className="text-xs text-gray-400">{transferTarget.phone}</p>}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setTransferTarget(null); setTransferQuery(""); }}
                                            className="text-xs font-semibold text-sky-600 hover:underline"
                                        >
                                            Đổi
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative mt-1">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            value={transferQuery}
                                            onChange={(e) => setTransferQuery(e.target.value)}
                                            placeholder="Nhập tên hoặc SĐT thành viên nhận..."
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                                        />
                                        {(transferSearching || transferResults.length > 0) && (
                                            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                                                {transferSearching && (
                                                    <div className="px-3 py-2.5 text-xs text-gray-400">Đang tìm...</div>
                                                )}
                                                {!transferSearching && transferResults.length === 0 && transferQuery.trim().length >= 2 && (
                                                    <div className="px-3 py-2.5 text-xs text-gray-400">Không tìm thấy thành viên</div>
                                                )}
                                                {!transferSearching && transferResults.map((u) => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => { setTransferTarget(u); setTransferResults([]); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left"
                                                    >
                                                        {u.avatar_url ? (
                                                            <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                                                                {u.full_name?.[0]?.toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                                                            {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-semibold text-gray-500">Loại nước &amp; số lượng</label>
                            <div className="mt-1.5 space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                                {drinks.length === 0 && (
                                    <p className="text-xs text-gray-400 py-2">Đang tải danh sách nước...</p>
                                )}
                                {drinks.length > 0 && visibleDrinks.length === 0 && (
                                    <p className="text-xs text-gray-400 py-2">
                                        {action === "transfer"
                                            ? "Thành viên chưa sở hữu loại nước nào để chuyển."
                                            : "Thành viên chưa sở hữu loại nước nào để trừ."}
                                    </p>
                                )}
                                {visibleDrinks.map((d) => {
                                    const owned = ownedMap.get(d.id) ?? 0;
                                    const qty = Number(amounts[d.id]) || 0;
                                    const exceeds = (action === "deduct" || action === "transfer") && qty > owned;
                                    return (
                                        <div
                                            key={d.id}
                                            className={`flex items-center gap-3 rounded-xl border p-2.5 ${exceeds ? "border-red-300 bg-red-50" : "border-gray-100"
                                                }`}
                                        >
                                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                {d.image_url ? (
                                                    <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center">
                                                        <GlassWater className="h-4 w-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-gray-800">{d.name}</p>
                                                <p className="text-[11px] text-gray-400">
                                                    {action === "deduct" || action === "transfer"
                                                        ? `Đang sở hữu: ${owned}`
                                                        : formatCurrency(d.price)}
                                                </p>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder="0"
                                                value={amounts[d.id] ?? ""}
                                                onChange={(e) => setAmounts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                                className={`w-16 flex-shrink-0 rounded-lg border px-2 py-1.5 text-center text-sm focus:outline-none ${exceeds
                                                    ? "border-red-300 focus:border-red-400"
                                                    : "border-gray-200 focus:border-sky-400"
                                                    }`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500">Ghi chú (tuỳ chọn)</label>
                            <input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                                placeholder="VD: Thưởng thi đấu tốt"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitDisabled}
                            className={`w-full py-3 rounded-xl font-semibold text-white ${action === "grant"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : action === "deduct"
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-sky-500 hover:bg-sky-600"
                                } disabled:opacity-60`}
                        >
                            {submitting
                                ? "Đang xử lý..."
                                : action === "grant"
                                    ? "Xác nhận tặng"
                                    : action === "deduct"
                                        ? "Xác nhận trừ"
                                        : "Xác nhận chuyển"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnimatedCheckbox({
    checked,
    onChange,
    className = "",
}: {
    checked: boolean;
    onChange: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            aria-checked={checked}
            role="checkbox"
            className={`relative w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center
                transition-all duration-200 ease-out active:scale-75
                ${checked ? "bg-sky-500 border-sky-500 scale-100" : "bg-white border-gray-300 hover:border-sky-400 scale-100"}
                ${className}`}
        >
            <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`w-3 h-3 transition-all duration-200 ease-out ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
                    }`}
            >
                <path
                    d="M5 13l4 4L19 7"
                    stroke="white"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={20}
                    strokeDashoffset={checked ? 0 : 20}
                    style={{ transition: "stroke-dashoffset 0.25s ease-out 0.05s" }}
                />
            </svg>
        </button>
    );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
    return (
        <div className={`rounded-md bg-gray-200 relative overflow-hidden ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
}

function HistoryRowSkeletonMobile() {
    return (
        <div className="p-4 flex gap-3">
            <div className="flex-shrink-0 self-center">
                <SkeletonBlock className="w-[18px] h-[18px] rounded-md" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <SkeletonBlock className="h-5 w-20 rounded-full" />
                    <SkeletonBlock className="h-3 w-24" />
                </div>
                <SkeletonBlock className="h-4 w-40" />
                <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-3.5 w-24" />
                    <SkeletonBlock className="h-3.5 w-10" />
                </div>
            </div>
        </div>
    );
}

function HistoryRowSkeletonDesktop() {
    return (
        <tr>
            <td className="px-4 py-2.5"><SkeletonBlock className="w-[18px] h-[18px] rounded-md" /></td>
            <td className="px-4 py-2.5"><SkeletonBlock className="h-3.5 w-28" /></td>
            <td className="px-4 py-2.5"><SkeletonBlock className="h-5 w-56" /></td>
            <td className="px-4 py-2.5"><SkeletonBlock className="h-3.5 w-20" /></td>
            <td className="px-4 py-2.5 text-right"><SkeletonBlock className="h-3.5 w-8 ml-auto" /></td>
            <td className="px-4 py-2.5 text-right"><SkeletonBlock className="h-6 w-14 ml-auto rounded-lg" /></td>
        </tr>
    );
}

function ConfirmDeleteHistoryModal({
    count,
    deleting,
    onConfirm,
    onCancel,
}: {
    count: number;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleCancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleCancel = () => {
        setVisible(false);
        setTimeout(onCancel, 180);
    };

    return (
        <div
            className={`fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
                }`}
            onMouseDown={(e) => e.target === e.currentTarget && handleCancel()}
        >
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
                    }`}
            >
                <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        Xoá {count > 1 ? `${count} giao dịch` : "giao dịch này"}?
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        Hành động này không thể hoàn tác.
                    </p>
                </div>
                <div className="flex border-t border-gray-100">
                    <button
                        onClick={handleCancel}
                        disabled={deleting}
                        className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100 disabled:opacity-50"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        {deleting ? "Đang xoá..." : "Xoá"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [type, setType] = useState<string>("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [closing, setClosing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: "one"; id: string } | { type: "selected" } | null>(null);
    const hasLoadedOnce = useRef(false);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const load = useCallback(async () => {
        setFetching(true);
        try {
            const { data } = await userDrinksAdminApi.getOverviewHistory({ page, limit: 15, type: type || undefined });
            setRows(data.data);
            setTotalPages(data.meta.total_pages || 1);
            setSelected(new Set());
        } finally {
            setFetching(false);
            setInitialLoading(false);
            hasLoadedOnce.current = true;
        }
    }, [page, type]);

    useEffect(() => { load(); }, [load]);

    const describeAction = (r: HistoryRow) => {
        if (r.type === "gift") return `${r.from_user?.full_name ?? "?"} tặng ${r.to_user?.full_name ?? "?"}`;
        if (r.type === "admin_grant") return `Admin tặng ${r.to_user?.full_name ?? "?"}`;
        if (r.type === "admin_deduct") return `Admin trừ của ${r.from_user?.full_name ?? "?"}`;
        if (r.type === "self_add") return `${r.to_user?.full_name ?? "?"} tự cộng`;
        if (r.type === "self_deduct") return `${r.from_user?.full_name ?? "?"} tự trừ`;
        if (r.type === "to_club") return `${r.from_user?.full_name ?? "?"} gửi về kho CLB`;
        if (r.type === "admin_transfer") return `Admin chuyển từ ${r.from_user?.full_name ?? "?"} sang ${r.to_user?.full_name ?? "?"}`;
        return "—";
    };

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(rows.map((r) => r.id)));
        }
    };

    const deleteOne = (id: string) => {
        setConfirmDelete({ type: "one", id });
    };

    const deleteSelected = () => {
        if (selected.size === 0) return;
        setConfirmDelete({ type: "selected" });
    };

    const confirmDeleteCount = confirmDelete?.type === "selected" ? selected.size : 1;

    const performDelete = async () => {
        if (!confirmDelete) return;
        const ids = confirmDelete.type === "one" ? [confirmDelete.id] : Array.from(selected);
        setConfirmDelete(null);
        setDeleting(true);
        try {
            await userDrinksAdminApi.deleteOverviewHistory(ids);
            toast.success(`Đã xoá ${ids.length} giao dịch`);
            load();
        } catch {
        } finally {
            setDeleting(false);
        }
    };

    const TYPE_OPTIONS = [
        { value: "", label: "Tất cả" },
        { value: "admin_grant", label: "Admin tặng" },
        { value: "admin_deduct", label: "Admin trừ" },
        { value: "gift", label: "Tặng nhau" },
    ];

    const skeletonCount = 8;
    const showSkeleton = initialLoading && !hasLoadedOnce.current;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                @keyframes deleteBtnIn {
                    from { opacity: 0; transform: translateX(8px) scale(0.9); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes rowFadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .history-fade-in {
                    animation: rowFadeIn 0.25s ease-out both;
                }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Lịch sử giao dịch nước</h3>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                    <div className="w-48">
                        <CustomSelect
                            value={type}
                            onChange={(v) => { setPage(1); setType(v); }}
                            options={TYPE_OPTIONS}
                            triggerClassName="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 text-left"
                        />
                    </div>

                    {selected.size > 0 && (
                        <button
                            onClick={deleteSelected}
                            disabled={deleting}
                            style={{ animation: "deleteBtnIn 0.2s ease-out" }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-red-600 border-2 border-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                            Xoá đã chọn ({selected.size})
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div
                        className="sm:hidden divide-y divide-gray-100 transition-opacity duration-200"
                        style={{ opacity: fetching && !showSkeleton ? 0.45 : 1 }}
                    >
                        {showSkeleton && Array.from({ length: skeletonCount }).map((_, i) => (
                            <HistoryRowSkeletonMobile key={i} />
                        ))}
                        {!showSkeleton && rows.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Chưa có giao dịch nào</div>
                        )}
                        {!showSkeleton && rows.map((r, i) => (
                            <div
                                key={r.id}
                                className="p-4 flex gap-3 history-fade-in"
                                style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}
                            >
                                <div className="flex-shrink-0 self-center">
                                    <AnimatedCheckbox checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLOR[r.type]}`}>
                                            {TYPE_LABEL[r.type]}
                                        </span>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {new Date(r.created_at).toLocaleString("vi-VN")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{describeAction(r)}</p>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{r.drinks?.name}</span>
                                        <span className="font-semibold text-gray-900">SL: {r.quantity}</span>
                                    </div>
                                    {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => deleteOne(r.id)}
                                            disabled={deleting}
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-red-600 border-2 border-red-800 hover:bg-red-700 disabled:opacity-40"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-white" />
                                            Xoá
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <table className="hidden sm:table w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="w-10 px-4 py-2.5">
                                    <AnimatedCheckbox checked={allSelected} onChange={toggleAll} />
                                </th>
                                <th className="text-left px-4 py-2.5 font-semibold">Thời gian</th>
                                <th className="text-left px-4 py-2.5 font-semibold">Hành động</th>
                                <th className="text-left px-4 py-2.5 font-semibold">Loại nước</th>
                                <th className="text-right px-4 py-2.5 font-semibold">SL</th>
                                <th className="text-right px-4 py-2.5 font-semibold whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody
                            className="divide-y divide-gray-100 transition-opacity duration-200"
                            style={{ opacity: fetching && !showSkeleton ? 0.45 : 1 }}
                        >
                            {showSkeleton && Array.from({ length: skeletonCount }).map((_, i) => (
                                <HistoryRowSkeletonDesktop key={i} />
                            ))}
                            {!showSkeleton && rows.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có giao dịch nào</td></tr>
                            )}
                            {!showSkeleton && rows.map((r, i) => (
                                <tr
                                    key={r.id}
                                    className={`history-fade-in transition-colors ${selected.has(r.id) ? "bg-sky-50/60" : ""}`}
                                    style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}
                                >
                                    <td className="px-4 py-2.5">
                                        <AnimatedCheckbox checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                                        {new Date(r.created_at).toLocaleString("vi-VN")}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-1.5 ${TYPE_COLOR[r.type]}`}>
                                            {TYPE_LABEL[r.type]}
                                        </span>
                                        <span className="text-gray-700">{describeAction(r)}</span>
                                        {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-700">{r.drinks?.name}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold">{r.quantity}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            onClick={() => deleteOne(r.id)}
                                            disabled={deleting}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 border-2 border-red-800 hover:bg-red-700 transition-colors disabled:opacity-40"
                                            title="Xoá giao dịch"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-white" />
                                            Xoá
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Trước</button>
                        <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Sau</button>
                    </div>
                )}
            </div>

            {confirmDelete && createPortal(
                <ConfirmDeleteHistoryModal
                    count={confirmDeleteCount}
                    deleting={deleting}
                    onConfirm={performDelete}
                    onCancel={() => setConfirmDelete(null)}
                />,
                document.body
            )}
        </div>
    );
}


type DrinkRequestRow = {
    id: string;
    user_id: string;
    quantity: number;
    note?: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    reviewed_at?: string;
    reject_reason?: string;
    drinks?: { name: string; image_url?: string; price?: number };
    users?: { full_name: string; avatar_url?: string; phone?: string };
};

function RequestsModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
    const [rows, setRows] = useState<DrinkRequestRow[]>([]);
    const [status, setStatus] = useState<string>("pending");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [initialLoading, setInitialLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);
    const hasLoadedOnce = useRef(false);

    const requestClose = () => {
        setClosing(true);
        setTimeout(onClose, 180);
    };

    const load = useCallback(async () => {
        setFetching(true);
        try {
            const { data } = await userDrinksAdminApi.getRequests({ status, page, limit: 15 });
            setRows(data.data);
            setTotalPages(data.meta.total_pages || 1);
        } finally {
            setFetching(false);
            setInitialLoading(false);
            hasLoadedOnce.current = true;
        }
    }, [status, page]);

    useEffect(() => { load(); }, [load]);

    const approve = async (id: string) => {
        setProcessingId(id);
        try {
            await userDrinksAdminApi.approveRequest(id);
            toast.success("Đã duyệt yêu cầu");
            load();
            onChanged();
        } catch {
        } finally {
            setProcessingId(null);
        }
    };

    const reject = async (id: string) => {
        const reason = prompt("Lý do từ chối (không bắt buộc):") || undefined;
        setProcessingId(id);
        try {
            await userDrinksAdminApi.rejectRequest(id, reason);
            toast.success("Đã từ chối yêu cầu");
            load();
            onChanged();
        } catch {
        } finally {
            setProcessingId(null);
        }
    };

    const STATUS_OPTIONS = [
        { value: "pending", label: "Chờ duyệt" },
        { value: "approved", label: "Đã duyệt" },
        { value: "rejected", label: "Đã từ chối" },
        { value: "all", label: "Tất cả" },
    ];

    const STATUS_BADGE: Record<string, string> = {
        pending: "bg-amber-100 text-amber-700",
        approved: "bg-emerald-100 text-emerald-700",
        rejected: "bg-red-100 text-red-700",
    };
    const STATUS_LABEL: Record<string, string> = {
        pending: "Chờ duyệt",
        approved: "Đã duyệt",
        rejected: "Từ chối",
    };

    const showSkeleton = initialLoading && !hasLoadedOnce.current;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <style>{`
                @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalBackdropOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalPanelIn {
                    from { opacity: 0; transform: translateY(14px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modalPanelOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(10px) scale(0.97); }
                }
                .modal-backdrop-in { animation: modalBackdropIn 0.18s ease-out both; }
                .modal-backdrop-out { animation: modalBackdropOut 0.15s ease-in both; }
                .modal-panel-in { animation: modalPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .modal-panel-out { animation: modalPanelOut 0.15s ease-in both; }
                @keyframes shimmer { 100% { transform: translateX(100%); } }
                @keyframes rowFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .req-fade-in { animation: rowFadeIn 0.25s ease-out both; }
            `}</style>
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
                onClick={requestClose}
            />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col ${closing ? "modal-panel-out" : "modal-panel-in"
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Yêu cầu tự thêm nước</h3>
                    <button onClick={requestClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="w-48">
                        <CustomSelect
                            value={status}
                            onChange={(v) => { setPage(1); setStatus(v); }}
                            options={STATUS_OPTIONS}
                            triggerClassName="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 text-left"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ opacity: fetching && !showSkeleton ? 0.45 : 1, transition: "opacity 0.2s" }}>
                    {showSkeleton && Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 flex items-center gap-3">
                            <SkeletonBlock className="w-10 h-10 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <SkeletonBlock className="h-4 w-40" />
                                <SkeletonBlock className="h-3 w-24" />
                            </div>
                            <SkeletonBlock className="h-8 w-20 rounded-lg" />
                        </div>
                    ))}

                    {!showSkeleton && rows.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Không có yêu cầu nào</div>
                    )}

                    {!showSkeleton && rows.map((r, i) => (
                        <div key={r.id} className="p-4 flex items-center gap-3 req-fade-in" style={{ animationDelay: `${Math.min(i, 10) * 20}ms` }}>
                            {r.users?.avatar_url ? (
                                <img src={r.users.avatar_url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs flex-shrink-0">
                                    {r.users?.full_name?.[0]?.toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm">{r.users?.full_name}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                                        {STATUS_LABEL[r.status]}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Muốn thêm <span className="font-semibold text-gray-700">{r.quantity}</span> {r.drinks?.name}
                                </p>
                                {r.note && <p className="text-xs text-gray-400 mt-0.5">Ghi chú: {r.note}</p>}
                                {r.status === "rejected" && r.reject_reason && (
                                    <p className="text-xs text-red-500 mt-0.5">Lý do từ chối: {r.reject_reason}</p>
                                )}
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    {new Date(r.created_at).toLocaleString("vi-VN")}
                                </p>
                            </div>
                            {r.status === "pending" && (
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => approve(r.id)}
                                        disabled={processingId === r.id}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Duyệt
                                    </button>
                                    <button
                                        onClick={() => reject(r.id)}
                                        disabled={processingId === r.id}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 border-2 border-red-800 hover:bg-red-700 disabled:opacity-40"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Từ chối
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Trước</button>
                        <span className="text-sm text-gray-500">Trang {page}/{totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 disabled:opacity-40">Sau</button>
                    </div>
                )}
            </div>
        </div>
    );
}
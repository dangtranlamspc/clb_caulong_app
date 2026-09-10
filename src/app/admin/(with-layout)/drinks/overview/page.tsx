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
};

const TYPE_COLOR: Record<string, string> = {
    admin_grant: "bg-emerald-100 text-emerald-700",
    admin_deduct: "bg-red-100 text-red-700",
    gift: "bg-blue-100 text-blue-700",
    self_add: "bg-teal-100 text-teal-700",
    self_deduct: "bg-orange-100 text-orange-700",
    to_club: "bg-amber-100 text-amber-700",
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

    useEffect(() => {
        const channel = supabase
            .channel(`drink-requests:admin`)
            .on("broadcast", { event: "requests_updated" }, () => {
                loadPendingCount();
                loadMembers();
                loadStats();
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
    };

    return (
        <div className="space-y-5 pb-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon={Users} label="Thành viên sở hữu" value={stats ? formatNumber(stats.total_members_owning) : "—"} color="bg-sky-500" />
                <StatCard icon={Package} label="Tổng số lượng nước" value={stats ? formatNumber(stats.total_quantity) : "—"} color="bg-emerald-500" />
                <StatCard icon={TrendingUp} label="Giá trị đang lưu hành" value={stats ? formatCurrency(stats.total_value) : "—"} color="bg-amber-500" />
                <StatCard icon={History} label="Tổng giao dịch" value={stats ? formatNumber(stats.total_transactions) : "—"} color="bg-violet-500" />
                <StatCard icon={History} label="Giao dịch tháng này" value={stats ? formatNumber(stats.transactions_this_month) : "—"} color="bg-rose-500" />
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
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setRequestsOpen(true)}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
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
                        onClick={() => setGrantOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Thêm nước
                    </button>
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <History className="w-4 h-4" />
                        Lịch sử giao dịch
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* ─── Mobile: card list ─── */}
                <div className="sm:hidden divide-y divide-gray-100">
                    {loadingMembers && (
                        <div className="text-center py-10 text-gray-400 text-sm">Đang tải...</div>
                    )}
                    {!loadingMembers && members.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm">Chưa có thành viên nào sở hữu nước</div>
                    )}
                    {members.map((m) => (
                        <div key={m.user_id} className="p-4 space-y-3">
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
                                    <p className="font-bold text-gray-900">{formatNumber(m.total_quantity)}</p>
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

                            <button
                                onClick={() => setAdjustTarget(m)}
                                className="w-full py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600"
                            >
                                Điều chỉnh
                            </button>
                        </div>
                    ))}
                </div>

                {/* ─── Desktop / tablet: table ─── */}
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

            {adjustTarget && (
                <AdjustDrinkModal
                    member={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={() => { setAdjustTarget(null); refreshAll(); }}
                />
            )}

            {grantOpen && (
                <GrantDrinkModal
                    onClose={() => setGrantOpen(false)}
                    onSuccess={() => { setGrantOpen(false); refreshAll(); }}
                />
            )}

            {historyOpen && createPortal(
                <HistoryModal onClose={() => setHistoryOpen(false)} />,
                document.body
            )}

            {requestsOpen && createPortal(
                <RequestsModal onClose={() => setRequestsOpen(false)} onChanged={refreshAll} />,
                document.body
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
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

function GrantDrinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-bold text-gray-900">Thêm nước cho thành viên</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5 overflow-y-auto pr-0.5">
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
                                    <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
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
                        <div className="mt-1.5 space-y-2 max-h-64 overflow-y-auto">
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
    const [action, setAction] = useState<"grant" | "deduct">("grant");
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        drinksAdminApi.list(false).then(({ data }) => setDrinks(data));
    }, []);

    const ownedMap = new Map(member.drinks.map((d) => [d.drink_id, d.quantity]));

    const visibleDrinks =
        action === "deduct" ? drinks.filter((d) => (ownedMap.get(d.id) ?? 0) > 0) : drinks;

    const selectedDrinks = visibleDrinks
        .map((d) => ({ drink: d, quantity: Number(amounts[d.id]) || 0, owned: ownedMap.get(d.id) ?? 0 }))
        .filter((x) => x.quantity > 0);

    const invalidDeduct = action === "deduct" && selectedDrinks.some((x) => x.quantity > x.owned);

    const handleSubmit = async () => {
        if (selectedDrinks.length === 0) return toast.error("Vui lòng nhập số lượng ít nhất 1 loại nước");
        if (invalidDeduct) return toast.error("Có loại nước bị trừ vượt quá số lượng đang sở hữu");

        setSubmitting(true);
        try {
            for (const { drink, quantity } of selectedDrinks) {
                const payload = { drink_id: drink.id, quantity, note: note || undefined };
                if (action === "grant") {
                    await userDrinksAdminApi.grant(member.user_id, payload);
                } else {
                    await userDrinksAdminApi.deduct(member.user_id, payload);
                }
            }
            toast.success(action === "grant" ? "Đã tặng nước cho thành viên" : "Đã trừ nước của thành viên");
            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="font-bold text-gray-900">Điều chỉnh nước — {member.full_name}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5 overflow-y-auto pr-0.5">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setAction("grant")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold ${action === "grant" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 text-gray-600"}`}
                        >
                            <Plus className="w-4 h-4" /> Tặng thêm
                        </button>
                        <button
                            onClick={() => setAction("deduct")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-semibold ${action === "deduct" ? "bg-red-500 border-red-500 text-white" : "border-gray-200 text-gray-600"}`}
                        >
                            <Minus className="w-4 h-4" /> Trừ bớt
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Loại nước &amp; số lượng</label>
                        <div className="mt-1.5 space-y-2 max-h-64 overflow-y-auto">
                            {drinks.length === 0 && (
                                <p className="text-xs text-gray-400 py-2">Đang tải danh sách nước...</p>
                            )}
                            {drinks.length > 0 && visibleDrinks.length === 0 && (
                                <p className="text-xs text-gray-400 py-2">Thành viên chưa sở hữu loại nước nào để trừ.</p>
                            )}
                            {visibleDrinks.map((d) => {
                                const owned = ownedMap.get(d.id) ?? 0;
                                const qty = Number(amounts[d.id]) || 0;
                                const exceeds = action === "deduct" && qty > owned;
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
                                                {action === "deduct" ? `Đang sở hữu: ${owned}` : formatCurrency(d.price)}
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
                        disabled={submitting || selectedDrinks.length === 0 || invalidDeduct}
                        className={`w-full py-3 rounded-xl font-semibold text-white ${action === "grant" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} disabled:opacity-60`}
                    >
                        {submitting ? "Đang xử lý..." : action === "grant" ? "Xác nhận tặng" : "Xác nhận trừ"}
                    </button>
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

function HistoryModal({ onClose }: { onClose: () => void }) {
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [type, setType] = useState<string>("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const hasLoadedOnce = useRef(false);

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

    const deleteOne = async (id: string) => {
        if (!confirm("Xoá giao dịch này khỏi lịch sử?")) return;
        setDeleting(true);
        try {
            await userDrinksAdminApi.deleteOverviewHistory([id]);
            toast.success("Đã xoá giao dịch");
            load();
        } catch {
        } finally {
            setDeleting(false);
        }
    };

    const deleteSelected = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Xoá ${selected.size} giao dịch đã chọn?`)) return;
        setDeleting(true);
        try {
            await userDrinksAdminApi.deleteOverviewHistory(Array.from(selected));
            toast.success(`Đã xoá ${selected.size} giao dịch`);
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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Lịch sử giao dịch nước</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
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
                    {/* Mobile: card list */}
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
    const hasLoadedOnce = useRef(false);

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
                @keyframes shimmer { 100% { transform: translateX(100%); } }
                @keyframes rowFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .req-fade-in { animation: rowFadeIn 0.25s ease-out both; }
            `}</style>
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Yêu cầu tự thêm nước</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
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
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { GlassWater, TrendingUp, Users, Package, History, Search, Plus, Minus, X, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { userDrinksAdminApi, drinksAdminApi, membersAdminApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

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
};

const TYPE_COLOR: Record<string, string> = {
    admin_grant: "bg-emerald-100 text-emerald-700",
    admin_deduct: "bg-red-100 text-red-700",
    gift: "bg-blue-100 text-blue-700",
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

    const loadStats = useCallback(async () => {
        try {
            const { data } = await userDrinksAdminApi.getOverviewStats();
            setStats(data);
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

    const refreshAll = () => {
        loadStats();
        loadMembers();
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
                <div className="flex gap-2">
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

            {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)} />}
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

// ─── Modal: Thêm nước cho 1 thành viên bất kỳ (tìm kiếm trước, chọn xong mới tặng) ───
function GrantDrinkModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [drinkId, setDrinkId] = useState("");
    const [quantity, setQuantity] = useState<number | "">("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        drinksAdminApi.list(false).then(({ data }) => {
            setDrinks(data);
            if (data.length > 0) setDrinkId(data[0].id);
        });
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

    const handleSubmit = async () => {
        if (!selectedUser) return toast.error("Vui lòng chọn thành viên");
        if (!drinkId) return toast.error("Vui lòng chọn loại nước");
        if (!quantity || quantity <= 0) return toast.error("Số lượng phải lớn hơn 0");

        setSubmitting(true);
        try {
            await userDrinksAdminApi.grant(selectedUser.id, {
                drink_id: drinkId,
                quantity: Number(quantity),
                note: note || undefined,
            });
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
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Thêm nước cho thành viên</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5">
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
                        <label className="text-xs font-semibold text-gray-500">Loại nước</label>
                        <div className="mt-1">
                            <CustomSelect
                                value={drinkId}
                                onChange={setDrinkId}
                                options={drinks.map((d) => ({ value: d.id, label: d.name, imageUrl: d.image_url ?? null }))}
                                placeholder="-- Chọn loại nước --"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Số lượng</label>
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            placeholder="Nhập số lượng"
                        />
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
                        disabled={submitting || !selectedUser}
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
    const [drinkId, setDrinkId] = useState("");
    const [quantity, setQuantity] = useState<number | "">("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        drinksAdminApi.list(false).then(({ data }) => {
            setDrinks(data);
            if (data.length > 0) setDrinkId(data[0].id);
        });
    }, []);

    const currentOwned = member.drinks.find((d) => d.drink_id === drinkId)?.quantity ?? 0;

    const handleSubmit = async () => {
        if (!drinkId) return toast.error("Vui lòng chọn loại nước");
        if (!quantity || quantity <= 0) return toast.error("Số lượng phải lớn hơn 0");
        if (action === "deduct" && quantity > currentOwned) {
            return toast.error("Số lượng trừ vượt quá số lượng đang sở hữu");
        }

        setSubmitting(true);
        try {
            const payload = { drink_id: drinkId, quantity: Number(quantity), note: note || undefined };
            if (action === "grant") {
                await userDrinksAdminApi.grant(member.user_id, payload);
                toast.success("Đã tặng nước cho thành viên");
            } else {
                await userDrinksAdminApi.deduct(member.user_id, payload);
                toast.success("Đã trừ nước của thành viên");
            }
            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Điều chỉnh nước — {member.full_name}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3.5">
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
                        <label className="text-xs font-semibold text-gray-500">Loại nước</label>
                        <div className="mt-1">
                            <CustomSelect
                                value={drinkId}
                                onChange={setDrinkId}
                                options={drinks.map((d) => ({ value: d.id, label: d.name, imageUrl: d.image_url ?? null }))}
                                placeholder="-- Chọn loại nước --"
                            />
                        </div>
                        {action === "deduct" && (
                            <p className="text-xs text-gray-400 mt-1">Đang sở hữu: {currentOwned}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Số lượng</label>
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            placeholder="Nhập số lượng"
                        />
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
                        disabled={submitting}
                        className={`w-full py-3 rounded-xl font-semibold text-white ${action === "grant" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} disabled:opacity-60`}
                    >
                        {submitting ? "Đang xử lý..." : action === "grant" ? "Xác nhận tặng" : "Xác nhận trừ"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [type, setType] = useState<string>("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksAdminApi.getOverviewHistory({ page, limit: 15, type: type || undefined });
            setRows(data.data);
            setTotalPages(data.meta.total_pages || 1);
        } finally {
            setLoading(false);
        }
    }, [page, type]);

    useEffect(() => { load(); }, [load]);

    const describeAction = (r: HistoryRow) => {
        if (r.type === "gift") return `${r.from_user?.full_name ?? "?"} tặng ${r.to_user?.full_name ?? "?"}`;
        if (r.type === "admin_grant") return `${r.performed_by_user?.full_name ?? "Admin"} tặng ${r.to_user?.full_name ?? "?"}`;
        return `${r.performed_by_user?.full_name ?? "Admin"} trừ của ${r.to_user?.full_name ?? "?"}`;
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Lịch sử giao dịch nước</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
                    {[
                        { v: "", label: "Tất cả" },
                        { v: "admin_grant", label: "Admin tặng" },
                        { v: "admin_deduct", label: "Admin trừ" },
                        { v: "gift", label: "Tặng nhau" },
                    ].map((t) => (
                        <button
                            key={t.v}
                            onClick={() => { setPage(1); setType(t.v); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${type === t.v ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Mobile: card list */}
                    <div className="sm:hidden divide-y divide-gray-100">
                        {loading && (
                            <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
                        )}
                        {!loading && rows.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">Chưa có giao dịch nào</div>
                        )}
                        {rows.map((r) => (
                            <div key={r.id} className="p-4 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLOR[r.type]}`}>
                                        {TYPE_LABEL[r.type]}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(r.created_at).toLocaleString("vi-VN")}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700">{describeAction(r)}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">{r.drinks?.name}</span>
                                    <span className="font-semibold text-gray-900">SL: {r.quantity}</span>
                                </div>
                                {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <table className="hidden sm:table w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="text-left px-4 py-2.5 font-semibold">Thời gian</th>
                                <th className="text-left px-4 py-2.5 font-semibold">Hành động</th>
                                <th className="text-left px-4 py-2.5 font-semibold">Loại nước</th>
                                <th className="text-right px-4 py-2.5 font-semibold">SL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                            )}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Chưa có giao dịch nào</td></tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id}>
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
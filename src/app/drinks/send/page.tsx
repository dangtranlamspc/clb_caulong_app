"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { GlassWater, Search, Send, Building2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { userDrinksApi, usersApi } from "@/lib/api";

type InventoryItem = {
    drink_id: string;
    quantity: number;
    drinks: { id: string; name: string; price: number; image_url?: string | null };
};

type SearchedUser = { id: string; full_name: string; phone?: string; avatar_url?: string };

export default function SendDrinksPage() {
    const [tab, setTab] = useState<"member" | "club">("member");
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [drinkId, setDrinkId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadInventory = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksApi.getMyInventory();
            setInventory(data ?? []);
            if (data?.length > 0) setDrinkId((prev) => prev || data[0].drink_id);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadInventory(); }, [loadInventory]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await usersApi.searchMembers(query.trim());
                setResults(data ?? []);
            } catch {
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    const owned = inventory.find((i) => i.drink_id === drinkId)?.quantity ?? 0;

    const resetForm = () => {
        setQuantity("");
        setNote("");
        setSelectedUser(null);
        setQuery("");
    };

    const handleSendToMember = async () => {
        if (!selectedUser) return toast.error("Vui lòng chọn người nhận");
        if (!drinkId) return toast.error("Vui lòng chọn loại nước");
        const qty = Number(quantity);
        if (!quantity || qty <= 0) return toast.error("Số lượng phải lớn hơn 0");
        if (qty > owned) return toast.error("Số lượng vượt quá số bạn đang sở hữu");

        setSubmitting(true);
        try {
            await userDrinksApi.gift({
                drink_id: drinkId,
                to_user_id: selectedUser.id,
                quantity: qty,
                note: note || undefined,
            });
            toast.success(`Đã gửi nước cho ${selectedUser.full_name}`);
            resetForm();
            loadInventory();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendToClub = async () => {
        if (!drinkId) return toast.error("Vui lòng chọn loại nước");
        const qty = Number(quantity);
        if (!quantity || qty <= 0) return toast.error("Số lượng phải lớn hơn 0");
        if (qty > owned) return toast.error("Số lượng vượt quá số bạn đang sở hữu");

        setSubmitting(true);
        try {
            await userDrinksApi.sendToClub({
                drink_id: drinkId,
                quantity: qty,
                note: note || undefined,
            });
            toast.success("Đã gửi nước về kho CLB");
            resetForm();
            loadInventory();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-md space-y-5 p-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
            <div className="flex items-center gap-2">
                <Link href="/drinks/my" className="rounded-lg p-2 hover:bg-gray-100 flex-shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Gửi nước</h1>
                    <p className="text-sm text-gray-500">
                        Gửi nước bạn đang sở hữu cho người khác hoặc trả về kho CLB.
                    </p>
                </div>
            </div>

            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                {[
                    { v: "member", label: "Gửi đến người khác" },
                    { v: "club", label: "Gửi đến BnB" },
                ].map((t) => (
                    <button
                        key={t.v}
                        onClick={() => { setTab(t.v as any); resetForm(); }}
                        className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === t.v ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
                    Đang tải...
                </div>
            ) : inventory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Bạn chưa sở hữu loại nước nào để gửi.
                </div>
            ) : (
                <div className="space-y-3.5 rounded-2xl border border-gray-100 bg-white p-4">
                    {tab === "member" && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500">Người nhận</label>
                            {selectedUser ? (
                                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        {selectedUser.avatar_url ? (
                                            <img src={selectedUser.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                                        ) : (
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-200 text-xs font-bold text-cyan-700">
                                                {selectedUser.full_name?.[0]?.toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{selectedUser.full_name}</p>
                                            {selectedUser.phone && <p className="text-xs text-gray-400">{selectedUser.phone}</p>}
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedUser(null); setQuery(""); }} className="text-xs font-semibold text-cyan-600 hover:underline">
                                        Đổi
                                    </button>
                                </div>
                            ) : (
                                <div className="relative mt-1.5">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Nhập tên hoặc SĐT thành viên..."
                                        className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    />
                                    {(searching || results.length > 0) && (
                                        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                                            {searching && <div className="px-3 py-2.5 text-xs text-gray-400">Đang tìm...</div>}
                                            {!searching && results.length === 0 && query.trim().length >= 2 && (
                                                <div className="px-3 py-2.5 text-xs text-gray-400">Không tìm thấy thành viên</div>
                                            )}
                                            {!searching && results.map((u) => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => { setSelectedUser(u); setResults([]); }}
                                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50"
                                                >
                                                    {u.avatar_url ? (
                                                        <img src={u.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-600">
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

                    {tab === "club" && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                            <Building2 className="h-4 w-4 flex-shrink-0" />
                            Nước sẽ được cộng thẳng vào kho chung của CLB, không hoàn lại.
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Loại nước</label>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                            {inventory.map((item) => (
                                <button
                                    key={item.drink_id}
                                    onClick={() => setDrinkId(item.drink_id)}
                                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${drinkId === item.drink_id ? "border-cyan-500 bg-cyan-50" : "border-gray-200"
                                        }`}
                                >
                                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                                        {item.drinks.image_url ? (
                                            <img src={item.drinks.image_url} alt={item.drinks.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <GlassWater className="h-5 w-5 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="line-clamp-2 text-[11px] font-medium text-gray-700">{item.drinks.name}</p>
                                    <p className="text-[10px] text-gray-400">Còn: {item.quantity}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">
                            Số lượng {drinkId && <span className="text-gray-400">(đang sở hữu: {owned})</span>}
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={owned}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                            placeholder="Nhập số lượng"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Ghi chú (tuỳ chọn)</label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                            placeholder="VD: Cảm ơn bạn đã giúp đỡ"
                        />
                    </div>

                    <button
                        onClick={tab === "member" ? handleSendToMember : handleSendToClub}
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                    >
                        <Send className="h-4 w-4" />
                        {submitting ? "Đang gửi..." : "Xác nhận gửi"}
                    </button>
                </div>
            )}
        </div>
    );
}
"use client";
import { useEffect, useState } from "react";
import { X, Plus, Minus, GlassWater } from "lucide-react";
import toast from "react-hot-toast";
import { userDrinksAdminApi, drinksAdminApi } from "@/lib/api";

type Drink = { id: string; name: string; price: number };
type OwnedDrink = { drink_id: string; quantity: number; drinks: { id: string; name: string } };

export function AdjustUserDrinkModal({
    userId,
    userName,
    onClose,
    onSuccess,
}: {
    userId: string;
    userName: string;
    onClose: () => void;
    onSuccess?: () => void;
}) {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [owned, setOwned] = useState<OwnedDrink[]>([]);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<"grant" | "deduct">("grant");
    const [drinkId, setDrinkId] = useState("");
    const [quantity, setQuantity] = useState<number | "">("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [drinksRes, ownedRes] = await Promise.all([
                drinksAdminApi.list(false),
                userDrinksAdminApi.getInventory(userId),
            ]);
            setDrinks(drinksRes.data);
            setOwned(ownedRes.data);
            if (drinksRes.data.length > 0 && !drinkId) setDrinkId(drinksRes.data[0].id);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [userId]);

    const currentOwned = owned.find((o) => o.drink_id === drinkId)?.quantity ?? 0;

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
                await userDrinksAdminApi.grant(userId, payload);
                toast.success("Đã tặng nước cho thành viên");
            } else {
                await userDrinksAdminApi.deduct(userId, payload);
                toast.success("Đã trừ nước của thành viên");
            }
            setQuantity("");
            setNote("");
            await loadData();
            onSuccess?.();
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
                    <h3 className="font-bold text-gray-900">Điều chỉnh nước — {userName}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-gray-400 text-sm">Đang tải...</div>
                ) : (
                    <div className="space-y-3.5">
                        {owned.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1.5">Đang sở hữu</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {owned.map((o) => (
                                        <span key={o.drink_id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium">
                                            <GlassWater className="w-3 h-3" />
                                            {o.drinks?.name} × {o.quantity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

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
                            <select
                                value={drinkId}
                                onChange={(e) => setDrinkId(e.target.value)}
                                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                            >
                                {drinks.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
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
                )}
            </div>
        </div>
    );
}
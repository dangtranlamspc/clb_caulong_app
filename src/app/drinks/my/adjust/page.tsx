"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { GlassWater, Plus, X, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { userDrinksApi, drinksApi } from "@/lib/api";
import { createPortal } from "react-dom";

type InventoryItem = {
    drink_id: string;
    quantity: number;
    drinks: { id: string; name: string; price: number; image_url?: string | null };
};

type CatalogDrink = { id: string; name: string; price: number; image_url?: string | null };

const formatVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

export default function AdjustMyDrinksPage() {
    const [tab, setTab] = useState<"deduct" | "add">("deduct");
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [catalog, setCatalog] = useState<CatalogDrink[]>([]);
    const [loading, setLoading] = useState(true);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [showAddDrinkModal, setShowAddDrinkModal] = useState(false);

    const loadInventory = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await userDrinksApi.getMyInventory();
            setInventory(data ?? []);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInventory();
        drinksApi.list().then(({ data }) => setCatalog(data ?? [])).catch(() => { });
    }, [loadInventory]);

    const handleSelfDeduct = async (drinkId: string, owned: number) => {
        const raw = amounts[drinkId];
        const qty = Number(raw);
        if (!raw || qty <= 0) return toast.error("Nhập số lượng cần trừ");
        if (qty > owned) return toast.error("Số lượng vượt quá số bạn đang sở hữu");

        setSubmittingId(drinkId);
        try {
            await userDrinksApi.selfDeduct({
                drink_id: drinkId,
                quantity: qty,
                note: notes[drinkId]?.trim() || undefined,
            });
            toast.success(`Đã trừ ${qty} nước khỏi kho của bạn`);
            setAmounts((prev) => ({ ...prev, [drinkId]: "" }));
            setNotes((prev) => ({ ...prev, [drinkId]: "" }));
            loadInventory();
        } catch {
        } finally {
            setSubmittingId(null);
        }
    };

    const handleSelfAdd = async (drinkId: string) => {
        const raw = amounts[drinkId];
        const qty = Number(raw);
        if (!raw || qty <= 0) return toast.error("Nhập số lượng cần cộng");

        setSubmittingId(drinkId);
        try {
            await userDrinksApi.selfAdd({
                drink_id: drinkId,
                quantity: qty,
                note: notes[drinkId]?.trim() || undefined,
            });
            toast.success(`Đã cộng ${qty} nước vào kho của bạn`);
            setAmounts((prev) => ({ ...prev, [drinkId]: "" }));
            setNotes((prev) => ({ ...prev, [drinkId]: "" }));
            loadInventory();
        } catch {
        } finally {
            setSubmittingId(null);
        }
    };

    const ownedIds = new Set(inventory.map((i) => i.drink_id));
    const addableCatalog = catalog.filter((d) => !ownedIds.has(d.id));

    return (
        <div className="mx-auto max-w-md space-y-5 p-4">
            <div className="flex items-center gap-2">
                <Link href="/drinks/my" className="rounded-lg p-2 hover:bg-gray-100">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Điều chỉnh kho nước</h1>
                    <p className="text-sm text-gray-500">Tự cập nhật số lượng nước bạn đang sở hữu.</p>
                </div>
            </div>

            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                {[
                    { v: "deduct", label: "Tự trừ nước" },
                    { v: "add", label: "Tự cộng nước" },
                ].map((t) => (
                    <button
                        key={t.v}
                        onClick={() => setTab(t.v as any)}
                        className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === t.v ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
                    Đang tải...
                </div>
            )}

            {!loading && inventory.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
                    Bạn chưa sở hữu loại nước nào.
                    {tab === "add" && ' Bấm "Thêm nước" bên dưới để bắt đầu.'}
                </div>
            )}

            {!loading && inventory.length > 0 && (
                <div className="space-y-3">
                    {inventory.map((item) => (
                        <div
                            key={item.drink_id}
                            className="space-y-2.5 rounded-2xl border border-gray-100 bg-white p-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                    {item.drinks.image_url ? (
                                        <img src={item.drinks.image_url} alt={item.drinks.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <GlassWater className="h-5 w-5 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900">{item.drinks.name}</p>
                                    <p className="text-xs text-gray-400">
                                        Đang sở hữu: <span className="font-medium text-gray-600">{item.quantity}</span>
                                    </p>
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="SL"
                                    value={amounts[item.drink_id] ?? ""}
                                    onChange={(e) => setAmounts((prev) => ({ ...prev, [item.drink_id]: e.target.value }))}
                                    className="w-16 rounded-lg border border-gray-200 px-2 py-2 text-center text-sm focus:border-cyan-500 focus:outline-none"
                                />
                                {tab === "deduct" ? (
                                    <button
                                        onClick={() => handleSelfDeduct(item.drink_id, item.quantity)}
                                        disabled={submittingId === item.drink_id}
                                        className="flex-shrink-0 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                                    >
                                        Trừ
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSelfAdd(item.drink_id)}
                                        disabled={submittingId === item.drink_id}
                                        className="flex-shrink-0 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                                    >
                                        Cộng
                                    </button>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Ghi chú (tuỳ chọn)..."
                                value={notes[item.drink_id] ?? ""}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [item.drink_id]: e.target.value }))}
                                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                    ))}
                </div>
            )}

            {tab === "add" && (
                <button
                    onClick={() => setShowAddDrinkModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-300 bg-cyan-50 py-3 text-sm font-semibold text-cyan-600 hover:bg-cyan-100"
                >
                    <Plus className="h-4 w-4" /> Thêm nước
                </button>
            )}

            {showAddDrinkModal && createPortal(
                <AddNewDrinkModal
                    options={addableCatalog}
                    onClose={() => setShowAddDrinkModal(false)}
                    onSuccess={() => {
                        setShowAddDrinkModal(false);
                        loadInventory();
                    }}
                />,
                document.body
            )}
        </div>
    );
}

function AddNewDrinkModal({
    options,
    onClose,
    onSuccess,
}: {
    options: CatalogDrink[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [drinkId, setDrinkId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!drinkId) return toast.error("Vui lòng chọn loại nước");
        const qty = Number(quantity);
        if (!quantity || qty <= 0) return toast.error("Số lượng phải lớn hơn 0");

        setSubmitting(true);
        try {
            await userDrinksApi.selfAdd({
                drink_id: drinkId,
                quantity: qty,
                note: note.trim() || undefined,
            });
            toast.success("Đã thêm loại nước mới vào kho của bạn");
            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Thêm loại nước mới</h3>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {options.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">
                        Bạn đã sở hữu tất cả các loại nước trong danh mục.
                    </p>
                ) : (
                    <div className="space-y-3.5">
                        <div>
                            <label className="text-xs font-semibold text-gray-500">Chọn loại nước</label>
                            <div className="mt-1.5 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                                {options.map((d) => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDrinkId(d.id)}
                                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${drinkId === d.id ? "border-cyan-500 bg-cyan-50" : "border-gray-200"
                                            }`}
                                    >
                                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                                            {d.image_url ? (
                                                <img src={d.image_url} alt={d.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <GlassWater className="h-5 w-5 text-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="line-clamp-2 text-[11px] font-medium text-gray-700">{d.name}</p>
                                        <p className="text-[10px] text-gray-400">{formatVND(d.price)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500">Số lượng</label>
                            <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                placeholder="Nhập số lượng"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500">Ghi chú (tuỳ chọn)</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                placeholder="VD: Mua thêm để dự trữ"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !drinkId}
                            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                        >
                            {submitting ? "Đang xử lý..." : "Xác nhận thêm"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
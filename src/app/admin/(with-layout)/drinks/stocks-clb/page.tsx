"use client";

import { useEffect, useState } from "react";
import { GlassWater, PackagePlus, PackageMinus, X } from "lucide-react";
import toast from "react-hot-toast";
import { clubDrinksAdminApi } from "@/lib/api";

type ClubStockItem = {
    drink_id: string;
    quantity: number;
    updated_at: string;
    drinks: { id: string; name: string; price: number; image_url?: string | null };
};

function formatVND(amount: number) {
    return amount.toLocaleString("vi-VN") + " đ";
}

export default function ClubDrinkStockPage() {
    const [stock, setStock] = useState<ClubStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [adjustTarget, setAdjustTarget] = useState<ClubStockItem | null>(null);

    const loadStock = async () => {
        setLoading(true);
        try {
            const { data } = await clubDrinksAdminApi.getStock();
            setStock(data ?? []);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStock();
    }, []);

    const totalQuantity = stock.reduce((s, i) => s + i.quantity, 0);
    const totalValue = stock.reduce((s, i) => s + i.quantity * (i.drinks?.price ?? 0), 0);

    return (
        <div className="mx-auto max-w-5xl space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Kho nước CLB</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Số lượng nước thành viên đã gửi trả về kho chung của CLB.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Tổng số lượng</p>
                    <p className="mt-0.5 text-lg font-black text-slate-900">{totalQuantity}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-400">Tổng giá trị</p>
                    <p className="mt-0.5 text-lg font-black text-emerald-600">{formatVND(totalValue)}</p>
                </div>
            </div>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                    Đang tải...
                </div>
            )}

            {!loading && stock.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
                    <GlassWater className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-400">
                        Chưa có nước nào được gửi về kho CLB.
                    </p>
                </div>
            )}

            {!loading && stock.length > 0 && (
                <>
                    {/* Mobile: card list */}
                    <div className="space-y-3 sm:hidden">
                        {stock.map((item) => (
                            <div
                                key={item.drink_id}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                            >
                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    {item.drinks.image_url ? (
                                        <img
                                            src={item.drinks.image_url}
                                            alt={item.drinks.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <GlassWater className="h-5 w-5 text-slate-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-800">{item.drinks.name}</p>
                                    <p className="text-xs text-slate-400">{formatVND(item.drinks.price)}</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs text-slate-400">Tồn kho</p>
                                    <p className="text-base font-black text-slate-900">{item.quantity}</p>
                                </div>
                                <button
                                    onClick={() => setAdjustTarget(item)}
                                    className="flex-shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-white active:bg-sky-600"
                                >
                                    Điều chỉnh
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nước</th>
                                    <th className="px-4 py-3 font-medium">Giá</th>
                                    <th className="px-4 py-3 font-medium">Tồn kho CLB</th>
                                    <th className="px-4 py-3 font-medium">Cập nhật lúc</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stock.map((item) => (
                                    <tr key={item.drink_id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {item.drinks.image_url ? (
                                                        <img
                                                            src={item.drinks.image_url}
                                                            alt={item.drinks.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <GlassWater className="h-4 w-4 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-800">{item.drinks.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{formatVND(item.drinks.price)}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-slate-800">{item.quantity}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-400">
                                            {new Date(item.updated_at).toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setAdjustTarget(item)}
                                                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600"
                                            >
                                                Điều chỉnh
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {adjustTarget && (
                <AdjustClubStockModal
                    item={adjustTarget}
                    onClose={() => setAdjustTarget(null)}
                    onSuccess={() => {
                        setAdjustTarget(null);
                        loadStock();
                    }}
                />
            )}
        </div>
    );
}

function AdjustClubStockModal({
    item,
    onClose,
    onSuccess,
}: {
    item: ClubStockItem;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [action, setAction] = useState<"restock" | "consume">("restock");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const qty = Number(amount) || 0;
    const invalidConsume = action === "consume" && qty > item.quantity;

    const handleSubmit = async () => {
        if (!amount || qty <= 0) return toast.error("Nhập số lượng hợp lệ");
        if (invalidConsume) return toast.error("Số lượng vượt quá tồn kho CLB hiện có");

        setSubmitting(true);
        try {
            if (action === "restock") {
                await clubDrinksAdminApi.restock({ drink_id: item.drink_id, quantity: qty, note: note || undefined });
                toast.success(`Đã nhập thêm ${qty} vào kho CLB`);
            } else {
                await clubDrinksAdminApi.consume({ drink_id: item.drink_id, quantity: qty, note: note || undefined });
                toast.success(`Đã xuất ${qty} khỏi kho CLB`);
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
            <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Điều chỉnh — {item.drinks.name}</h3>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-400"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3.5">
                    <p className="text-xs text-gray-400">
                        Tồn kho CLB hiện tại: <span className="font-semibold text-gray-700">{item.quantity}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setAction("restock")}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold ${action === "restock"
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-gray-200 text-gray-600"
                                }`}
                        >
                            <PackagePlus className="h-4 w-4" /> Nhập kho
                        </button>
                        <button
                            onClick={() => setAction("consume")}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold ${action === "consume"
                                ? "border-red-500 bg-red-500 text-white"
                                : "border-gray-200 text-gray-600"
                                }`}
                        >
                            <PackageMinus className="h-4 w-4" /> Xuất kho
                        </button>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Số lượng</label>
                        <input
                            type="number"
                            min={1}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${invalidConsume ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-sky-400"
                                }`}
                            placeholder="Nhập số lượng"
                        />
                        {invalidConsume && (
                            <p className="mt-1 text-xs text-red-500">Vượt quá tồn kho CLB hiện có</p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-gray-500">Ghi chú (tuỳ chọn)</label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                            placeholder="VD: Mua bổ sung, dùng cho sự kiện..."
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || invalidConsume}
                        className={`w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60 ${action === "restock" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                            }`}
                    >
                        {submitting ? "Đang xử lý..." : action === "restock" ? "Xác nhận nhập kho" : "Xác nhận xuất kho"}
                    </button>
                </div>
            </div>
        </div>
    );
}
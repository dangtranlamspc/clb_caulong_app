"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { GlassWater, SlidersHorizontal, Send, History, ArrowLeft } from "lucide-react";
import { userDrinksApi } from "@/lib/api";

type InventoryItem = {
    drink_id: string;
    quantity: number;
    drinks: { id: string; name: string; price: number; image_url?: string | null };
};

const formatVND = (n: number) => n.toLocaleString("vi-VN") + " đ";

export default function MyDrinksPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);

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
    }, [loadInventory]);

    const totalQuantity = inventory.reduce((s, i) => s + i.quantity, 0);
    const totalValue = inventory.reduce((s, i) => s + i.quantity * (i.drinks?.price ?? 0), 0);

    return (
        <div className="mx-auto max-w-md space-y-5 p-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Link href="/" className="rounded-lg p-2 hover:bg-gray-100 flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Kho nước của tôi</h1>
                        <p className="text-sm text-gray-500">Số lượng nước bạn đang sở hữu.</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <Link
                        href="/drinks/history"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                        <History className="h-3.5 w-3.5" /> Lịch sử
                    </Link>
                    <Link
                        href="/drinks/send"
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                        <Send className="h-3.5 w-3.5" /> Gửi nước
                    </Link>
                    <Link
                        href="/drinks/my/adjust"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-2 py-2.5 text-xs font-semibold text-white hover:bg-cyan-700"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Điều chỉnh
                    </Link>
                </div>
            </div>

            {!loading && inventory.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
                        <p className="text-xs text-gray-400">Tổng số lượng</p>
                        <p className="mt-0.5 text-lg font-black text-gray-900">{totalQuantity}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
                        <p className="text-xs text-gray-400">Tổng giá trị</p>
                        <p className="mt-0.5 text-lg font-black text-emerald-600">{formatVND(totalValue)}</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400">
                    Đang tải...
                </div>
            )}

            {!loading && inventory.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400 space-y-3">
                    <p>Bạn chưa sở hữu loại nước nào.</p>
                    <Link
                        href="/drinks/my/adjust"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Điều chỉnh kho
                    </Link>
                </div>
            )}

            {!loading && inventory.length > 0 && (
                <div className="space-y-3">
                    {inventory.map((item) => (
                        <div
                            key={item.drink_id}
                            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3"
                        >
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
                                <p className="text-xs text-gray-400">{formatVND(item.drinks.price)}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <p className="text-xs text-gray-400">Đang sở hữu</p>
                                <p className="text-base font-black text-gray-900">{item.quantity}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
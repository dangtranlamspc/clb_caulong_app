"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X, Trash2, Pencil } from "lucide-react";
import { drinksAdminApi } from "@/lib/api";
import { createPortal } from "react-dom";

type Drink = {
    id: string;
    name: string;
    image_url: string | null;
    price: number;
    quantity: number;
    is_active: boolean;
};

function formatVND(amount: number) {
    return amount.toLocaleString("vi-VN") + " đ";
}

function formatNumberInput(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("vi-VN");
}

function parseNumberInput(raw: string): string {
    return raw.replace(/\D/g, "");
}

const ANIM_MS = 250;

export default function AdminDrinksManager() {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [closing, setClosing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [restockAmount, setRestockAmount] = useState<Record<string, string>>({});

    const loadDrinks = async () => {
        setLoading(true);
        try {
            const { data } = await drinksAdminApi.list(true);
            setDrinks(data);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDrinks();
    }, []);

    useEffect(() => {
        if (modalOpen) {
            setMounted(true);
            setClosing(false);
        } else if (mounted) {
            setClosing(true);
            const t = setTimeout(() => {
                setMounted(false);
                setClosing(false);
            }, ANIM_MS);
            return () => clearTimeout(t);
        }
    }, [modalOpen]);

    const openModal = () => {
        setEditingId(null);
        resetForm();
        setModalOpen(true);
    };
    const openEditModal = (drink: Drink) => {
        setEditingId(drink.id);
        setName(drink.name);
        setPrice(String(drink.price));
        setQuantity(String(drink.quantity));
        setFile(null);
        setPreview(drink.image_url ?? null);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setPreview(f ? URL.createObjectURL(f) : null);
    };

    const resetForm = () => {
        setName("");
        setPrice("");
        setQuantity("");
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error("Vui lòng nhập tên nước");
        if (price === "" || Number(price) < 0) return toast.error("Vui lòng nhập giá tiền hợp lệ");

        setSubmitting(true);
        try {
            if (editingId) {
                await drinksAdminApi.update(editingId, {
                    name: name.trim(),
                    price: Number(price),
                    quantity: quantity ? Number(quantity) : 0,
                    file: file ?? undefined,
                });
                toast.success("Đã cập nhật loại nước");
            } else {
                await drinksAdminApi.create({
                    name: name.trim(),
                    price: Number(price),
                    quantity: quantity ? Number(quantity) : 0,
                    file: file ?? undefined,
                });
                toast.success("Đã thêm loại nước mới");
            }
            resetForm();
            closeModal();
            loadDrinks();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    const handleRestock = async (id: string) => {
        const raw = restockAmount[id];
        const amount = Number(raw);
        if (!raw || amount <= 0) return toast.error("Nhập số lượng cần nhập kho");

        try {
            await drinksAdminApi.restock(id, amount);
            toast.success(`Đã nhập thêm ${amount} vào kho`);
            setRestockAmount((prev) => ({ ...prev, [id]: "" }));
            loadDrinks();
        } catch {
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            await drinksAdminApi.toggleActive(id);
            loadDrinks();
        } catch {
        }
    };

    const handleDelete = async (id: string, drinkName: string) => {
        if (!confirm(`Xóa loại nước "${drinkName}"? Hành động này không thể hoàn tác.`)) return;
        try {
            await drinksAdminApi.delete(id);
            toast.success("Đã xóa loại nước");
            loadDrinks();
        } catch {
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Kho nước</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Theo dõi giá bán và số lượng tồn kho từng loại nước.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-2.5 text-sm font-medium text-white transition active:bg-cyan-700 sm:px-4 sm:py-2"
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm nước</span>
                </button>
            </div>

            {loading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                    Đang tải...
                </div>
            )}

            {!loading && drinks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                    Chưa có loại nước nào. Bấm "Thêm nước" để tạo loại đầu tiên.
                </div>
            )}

            {!loading && drinks.length > 0 && (
                <>
                    <div className="space-y-3 sm:hidden">
                        {drinks.map((drink) => (
                            <div
                                key={drink.id}
                                className={`rounded-2xl border border-slate-200 bg-white p-4 ${!drink.is_active ? "opacity-50" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                        {drink.image_url && (
                                            <img
                                                src={drink.image_url}
                                                alt={drink.name}
                                                className="h-full w-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">{drink.name}</p>
                                        <p className="text-sm text-slate-500">{formatVND(drink.price)}</p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(drink.id)}
                                        className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${drink.is_active
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {drink.is_active ? "Đang bán" : "Đã ẩn"}
                                    </button>
                                </div>

                                <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">
                                            Tồn kho:{" "}
                                            <span
                                                className={
                                                    drink.quantity <= 5
                                                        ? "font-semibold text-amber-600"
                                                        : "font-semibold text-slate-700"
                                                }
                                            >
                                                {drink.quantity}
                                            </span>
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEditModal(drink)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100"
                                                aria-label={`Sửa ${drink.name}`}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(drink.id, drink.name)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                                                aria-label={`Xóa ${drink.name}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            placeholder="Số lượng nhập"
                                            value={restockAmount[drink.id] ?? ""}
                                            onChange={(e) =>
                                                setRestockAmount((prev) => ({ ...prev, [drink.id]: e.target.value }))
                                            }
                                            className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => handleRestock(drink.id)}
                                            className="flex-shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 active:bg-slate-200"
                                        >
                                            Nhập kho
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nước</th>
                                    <th className="px-4 py-3 font-medium">Giá</th>
                                    <th className="px-4 py-3 font-medium">Tồn kho</th>
                                    <th className="px-4 py-3 font-medium">Nhập thêm</th>
                                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {drinks.map((drink) => (
                                    <tr key={drink.id} className={!drink.is_active ? "opacity-50" : ""}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {drink.image_url && (
                                                        <img
                                                            src={drink.image_url}
                                                            alt={drink.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-800">{drink.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{formatVND(drink.price)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    drink.quantity <= 5
                                                        ? "font-medium text-amber-600"
                                                        : "font-medium text-slate-700"
                                                }
                                            >
                                                {drink.quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    placeholder="SL"
                                                    value={restockAmount[drink.id] ?? ""}
                                                    onChange={(e) =>
                                                        setRestockAmount((prev) => ({ ...prev, [drink.id]: e.target.value }))
                                                    }
                                                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-cyan-500 focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => handleRestock(drink.id)}
                                                    className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                                >
                                                    Nhập kho
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleToggleActive(drink.id)}
                                                className={
                                                    drink.is_active
                                                        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"
                                                        : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                                                }
                                            >
                                                {drink.is_active ? "Đang bán" : "Đã ẩn"}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => openEditModal(drink)}
                                                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(drink.id, drink.name)}
                                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {mounted && createPortal(
                <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
                    <div
                        className={`absolute inset-0 bg-black/50 ${closing ? "animate-fade-out" : "animate-fade-in"}`}
                        onClick={closeModal}
                    />

                    <div
                        className={`relative w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl ${closing ? "animate-sheet-out sm:animate-modal-out" : "animate-sheet-in sm:animate-modal-in"
                            }`}
                        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-gray-100 bg-white px-5 py-4">
                            <h2 className="text-base font-bold text-gray-900">
                                {editingId ? "Sửa loại nước" : "Thêm loại nước"}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
                            <div className="flex flex-col items-center gap-2">
                                <label
                                    htmlFor="drink-image"
                                    className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-cyan-400 hover:text-cyan-500"
                                >
                                    {preview ? (
                                        <img src={preview} alt="Xem trước" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="px-2 text-center text-xs">Chọn ảnh</span>
                                    )}
                                </label>
                                <input
                                    id="drink-image"
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Tên nước</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ví dụ: Aquafina 500ml"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Giá tiền (đ)</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatNumberInput(price)}
                                        onChange={(e) => setPrice(parseNumberInput(e.target.value))}
                                        placeholder="10.000"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Số lượng ban đầu
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatNumberInput(quantity)}
                                        onChange={(e) => setQuantity(parseNumberInput(e.target.value))}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
                            >
                                {submitting
                                    ? (editingId ? "Đang lưu..." : "Đang thêm...")
                                    : (editingId ? "Lưu thay đổi" : "Thêm loại nước")}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fade-out {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                .animate-fade-out {
                    animation: fade-out 0.2s ease-out forwards;
                }

                /* bottom sheet trên mobile */
                @keyframes sheet-in {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes sheet-out {
                    from { transform: translateY(0); }
                    to { transform: translateY(100%); }
                }
                .animate-sheet-in {
                    animation: sheet-in 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
                }
                .animate-sheet-out {
                    animation: sheet-out 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
                }

                /* modal căn giữa trên desktop */
                @keyframes modal-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes modal-out {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(12px) scale(0.97); }
                }
                @media (min-width: 640px) {
                    .sm\\:animate-modal-in {
                        animation: modal-in 0.2s ease-out forwards;
                    }
                    .sm\\:animate-modal-out {
                        animation: modal-out 0.2s ease-out forwards;
                    }
                }
            `}</style>
        </div>
    );
}
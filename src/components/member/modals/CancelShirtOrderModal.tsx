"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Trash2, Minus, Plus } from "lucide-react";
import { fmt } from "@/utils/utils";
import { activitiesApi } from "@/lib/api";
import toast from "react-hot-toast";

export function CancelShirtOrderModal({
    activityId,
    registrations,
    shirtTypes,
    onClose,
    onDone,
}: {
    activityId: string;
    registrations: any[];
    shirtTypes: any[];
    onClose: () => void;
    onDone: () => void;
}) {
    const [qtyMap, setQtyMap] = useState<Record<string, number>>(
        Object.fromEntries(registrations.map((r) => [r.id, r.quantity ?? 1])),
    );

    const [modeMap, setModeMap] = useState<Record<string, "all" | "partial">>(
        Object.fromEntries(registrations.map((r) => [r.id, "all"])),
    );
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancellingAll, setCancellingAll] = useState(false);
    const [items, setItems] = useState(registrations);

    const priceOf = (r: any) => {
        const t = shirtTypes.find((x) => x.id === r.shirt_type_id);
        return t?.price_per_shirt ?? 0;
    };

    const setQty = (regId: string, qty: number, max: number) => {
        setQtyMap((prev) => ({ ...prev, [regId]: Math.min(Math.max(1, qty), max) }));
    };

    const setMode = (regId: string, mode: "all" | "partial", maxQty: number) => {
        setModeMap((prev) => ({ ...prev, [regId]: mode }));
        if (mode === "partial") {
            setQtyMap((prev) => ({
                ...prev,
                [regId]: prev[regId] >= maxQty ? Math.max(1, maxQty - 1) : prev[regId],
            }));
        } else {
            setQtyMap((prev) => ({ ...prev, [regId]: maxQty }));
        }
    };

    const handleCancelItem = async (
        r: any,
        forcedMode?: "all" | "partial",
        forcedQty?: number,
    ) => {
        const maxQty = r.quantity ?? 1;
        const mode = forcedMode ?? modeMap[r.id] ?? "all";
        const selectedQty = mode === "all" ? maxQty : (forcedQty ?? qtyMap[r.id] ?? maxQty);
        const isPaid = r.payment_status === "confirmed";
        setCancellingId(r.id);
        try {
            if (selectedQty >= maxQty) {
                await activitiesApi.cancelRegistration(activityId, r.id);
            } else {
                await activitiesApi.cancelShirtOrderQuantity(activityId, r.id, selectedQty);
            }
            toast.success(
                isPaid
                    ? `Đã gửi yêu cầu huỷ ${selectedQty}/${maxQty} áo, chờ admin xác nhận`
                    : "Đã huỷ",
            );
            setItems((prev) => prev.filter((x) => x.id !== r.id || selectedQty < maxQty));
            onDone();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Huỷ thất bại");
        } finally {
            setCancellingId(null);
        }
    };

    const handleCancelAll = async () => {
        if (!confirm("Huỷ toàn bộ đơn đặt áo của bạn ở hoạt động này?")) return;
        setCancellingAll(true);
        try {
            await activitiesApi.cancelRegistration(activityId);
            toast.success("Đã gửi yêu cầu huỷ toàn bộ đơn");
            onDone();
            onClose();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Huỷ thất bại");
        } finally {
            setCancellingAll(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={(e) => e.target === e.currentTarget && !cancellingAll && onClose()}
        >
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-shrink-0">
                    <h2 className="font-bold text-gray-900">Huỷ đơn đặt áo</h2>
                    <button
                        onClick={onClose}
                        disabled={cancellingAll}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-50"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {items.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Không còn sản phẩm nào</p>
                    ) : (
                        items.map((r) => {
                            const maxQty = r.quantity ?? 1;
                            const isPaid = r.payment_status === "confirmed";
                            const type = shirtTypes.find((t) => t.id === r.shirt_type_id);
                            const isCancelling = cancellingId === r.id;
                            const mode = modeMap[r.id] ?? "all";
                            const selectedQty = qtyMap[r.id] ?? maxQty;
                            const canChoosePartial = maxQty > 1;

                            return (
                                <div key={r.id} className="border border-gray-100 rounded-xl p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {type?.name ?? "—"}
                                                {r.color_name ? ` · ${r.color_name}` : ""}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {r.gender === "nu" ? "Nữ" : "Nam"} · Size {r.size} · {fmt(priceOf(r))}/áo
                                            </p>
                                            {isPaid && (
                                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">
                                                    Đã thanh toán — chỉ huỷ toàn bộ
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 flex-shrink-0">Còn {maxQty} áo</span>
                                    </div>

                                    {canChoosePartial ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setMode(r.id, "all", maxQty);
                                                        handleCancelItem(r, "all", maxQty);
                                                    }}
                                                    disabled={isCancelling}
                                                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 flex items-center justify-center gap-1.5"
                                                >
                                                    {isCancelling && mode === "all" && (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    )}
                                                    Huỷ hết ({maxQty} áo)
                                                </button>
                                                <button
                                                    onClick={() => setMode(r.id, "partial", maxQty)}
                                                    disabled={isCancelling}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${mode === "partial"
                                                        ? "bg-red-50 border-red-200 text-red-600"
                                                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    Huỷ một phần
                                                </button>
                                            </div>

                                            {mode === "partial" && (
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-1.5 py-1">
                                                        <button
                                                            onClick={() => setQty(r.id, selectedQty - 1, maxQty - 1)}
                                                            disabled={isCancelling}
                                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-6 text-center text-sm font-semibold">{selectedQty}</span>
                                                        <button
                                                            onClick={() => setQty(r.id, selectedQty + 1, maxQty - 1)}
                                                            disabled={isCancelling}
                                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center disabled:opacity-50"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => handleCancelItem(r, "partial", selectedQty)}
                                                        disabled={isCancelling}
                                                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-1.5 disabled:opacity-50 ml-auto"
                                                    >
                                                        {isCancelling ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                        {isPaid ? `Gửi yêu cầu huỷ ${selectedQty} áo` : `Huỷ ${selectedQty} áo`}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={() => handleCancelItem(r, "all", maxQty)}
                                                disabled={isCancelling}
                                                className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {isCancelling ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                {isPaid ? "Gửi yêu cầu huỷ hết" : "Xác nhận huỷ hết"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {items.length > 0 && (
                    <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={handleCancelAll}
                            disabled={cancellingAll}
                            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {cancellingAll && <Loader2 className="w-4 h-4 animate-spin" />}
                            Huỷ tất cả
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
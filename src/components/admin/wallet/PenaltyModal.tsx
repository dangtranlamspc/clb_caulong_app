"use client";
import { useEffect, useState } from "react";
import { X, AlertTriangle, Clock, ShieldAlert, MoreHorizontal, Wallet, Landmark } from "lucide-react";
import toast from "react-hot-toast";
import { fundApi } from "@/lib/api";

type PenaltyType = "late_early" | "special" | "other";
type PaymentMethodChoice = "wallet" | "member_choice";

const DEFAULT_AMOUNTS: Record<Exclude<PenaltyType, "other">, number> = {
    late_early: 10000,
    special: 50000,
};

const TYPE_OPTIONS: {
    value: PenaltyType;
    label: string;
    icon: any;
}[] = [
        { value: "late_early", label: "Đi trễ / về sớm", icon: Clock },
        { value: "special", label: "Trường hợp đặc biệt", icon: ShieldAlert },
        { value: "other", label: "Khác", icon: MoreHorizontal },
    ];

function formatNumberInput(n: number): string {
    if (!n) return "";
    return n.toLocaleString("vi-VN");
}
function parseNumberInput(raw: string): number {
    const digits = raw.replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : 0;
}

interface PenaltyModalProps {
    open: boolean;
    onClose: () => void;
    sessionId?: string;
    memberId: string;
    memberName: string;
    onSuccess?: () => void;
}

export default function PenaltyModal({
    open,
    onClose,
    sessionId,
    memberId,
    memberName,
    onSuccess,
}: PenaltyModalProps) {
    const [type, setType] = useState<PenaltyType | null>(null);
    const [amount, setAmount] = useState(0);
    const [reason, setReason] = useState("");
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethodChoice>("wallet");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setType(null);
            setAmount(0);
            setReason("");
            setPaymentMethod("wallet");
        }
    }, [open]);

    if (!open) return null;

    const handlePickType = (t: PenaltyType) => {
        setType(t);
        if (t === "other") {
            setAmount(0);
        } else {
            setAmount(DEFAULT_AMOUNTS[t]);
        }
        setReason("");
    };

    const fieldsDisabled = type === null;

    const canSubmit =
        type !== null && amount > 0 && reason.trim().length >= 3 && !submitting;

    const handleSubmit = async () => {
        if (!canSubmit || !type) return;
        setSubmitting(true);
        try {
            const typeLabel =
                TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Khác";

            await fundApi.createPenalty({
                session_id: sessionId,
                deduct_from_member_id: memberId,
                penalty_type: type,
                amount,
                title: `Phạt ${typeLabel} - ${memberName}`,
                description: reason.trim(),
                payment_method: paymentMethod,
            });
            toast.success(`Đã tạo khoản phạt cho ${memberName}`);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Tạo khoản phạt thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Tạo khoản phạt</h2>
                            <p className="text-xs text-gray-400 truncate max-w-[220px]">
                                {memberName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">
                        Loại phạt
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
                            const active = type === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handlePickType(value)}
                                    className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 text-[11px] font-medium leading-tight text-center transition-colors ${active
                                        ? "border-red-400 bg-red-50 text-red-600"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Số tiền phạt
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        disabled={fieldsDisabled}
                        value={formatNumberInput(amount)}
                        onChange={(e) => setAmount(parseNumberInput(e.target.value))}
                        placeholder={fieldsDisabled ? "Chọn loại phạt trước" : "0"}
                        className="input-field w-full disabled:bg-gray-50 disabled:text-gray-300"
                    />
                    {type && type !== "other" && (
                        <p className="text-[11px] text-gray-400 mt-1">
                            Mặc định {DEFAULT_AMOUNTS[type].toLocaleString("vi-VN")}đ — có thể chỉnh lại nếu cần.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Lý do phạt
                    </label>
                    <textarea
                        disabled={fieldsDisabled}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={
                            fieldsDisabled ? "Chọn loại phạt trước" : "Nhập lý do cụ thể..."
                        }
                        rows={2}
                        className="input-field w-full resize-none disabled:bg-gray-50 disabled:text-gray-300"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">
                        Cách thanh toán
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("wallet")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${paymentMethod === "wallet"
                                ? "border-blue-400 bg-blue-50 text-blue-600"
                                : "border-gray-200 text-gray-500"
                                }`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Trừ ví ngay
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("member_choice")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${paymentMethod === "member_choice"
                                ? "border-blue-400 bg-blue-50 text-blue-600"
                                : "border-gray-200 text-gray-500"
                                }`}
                        >
                            <Landmark className="w-3.5 h-3.5" /> Member tự chọn
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                        {paymentMethod === "wallet"
                            ? "Trừ thẳng vào ví của thành viên và lưu lịch sử ngay."
                            : "Thành viên sẽ tự chọn ví / chuyển khoản / tiền mặt để thanh toán."}
                    </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                    >
                        {submitting ? "Đang tạo..." : "Tạo khoản phạt"}
                    </button>
                </div>
            </div>
        </div>
    );
}
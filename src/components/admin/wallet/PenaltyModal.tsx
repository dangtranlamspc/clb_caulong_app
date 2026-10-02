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

const TRANSITION_MS = 220;

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

    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setType(null);
            setAmount(0);
            setReason("");
            setPaymentMethod("wallet");

            setMounted(true);
            const raf = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(raf);
        } else {
            setVisible(false);
            const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
            return () => clearTimeout(timeout);
        }
    }, [open]);

    if (!mounted) return null;

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
        <div
            className={`fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 px-3 pb-3 sm:p-4 transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"
                }`}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full sm:max-w-md bg-[var(--surface)] rounded-3xl sm:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto transition-all duration-200 ease-out ${visible
                    ? "translate-y-0 sm:scale-100 opacity-100"
                    : "translate-y-6 sm:translate-y-0 sm:scale-95 opacity-0"
                    }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-[var(--danger-soft)] flex items-center justify-center">
                            <AlertTriangle className="w-4.5 h-4.5 text-[var(--danger)]" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[var(--text)]">Tạo khoản phạt</h2>
                            <p className="text-xs text-[var(--text-faint)] truncate max-w-[220px]">
                                {memberName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-faint)]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
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
                                        ? "border-red-400 bg-[var(--danger-soft)] text-[var(--danger)]"
                                        : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
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
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                        Số tiền phạt
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        disabled={fieldsDisabled}
                        value={formatNumberInput(amount)}
                        onChange={(e) => setAmount(parseNumberInput(e.target.value))}
                        placeholder={fieldsDisabled ? "Chọn loại phạt trước" : "0"}
                        className="input-field w-full disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-faint)]"
                    />
                    {type && type !== "other" && (
                        <p className="text-[11px] text-[var(--text-faint)] mt-1">
                            Mặc định {DEFAULT_AMOUNTS[type].toLocaleString("vi-VN")}đ — có thể chỉnh lại nếu cần.
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
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
                        className="input-field w-full resize-none disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-faint)]"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                        Cách thanh toán
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("wallet")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${paymentMethod === "wallet"
                                ? "border-blue-400 bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "border-[var(--border)] text-[var(--text-muted)]"
                                }`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Trừ ví ngay
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod("member_choice")}
                            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${paymentMethod === "member_choice"
                                ? "border-blue-400 bg-[var(--primary-soft)] text-[var(--primary)]"
                                : "border-[var(--border)] text-[var(--text-muted)]"
                                }`}
                        >
                            <Landmark className="w-3.5 h-3.5" /> Member tự chọn
                        </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-faint)] mt-1.5">
                        {paymentMethod === "wallet"
                            ? "Trừ thẳng vào ví của thành viên và lưu lịch sử ngay."
                            : "Thành viên sẽ tự chọn ví / chuyển khoản / tiền mặt để thanh toán."}
                    </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
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
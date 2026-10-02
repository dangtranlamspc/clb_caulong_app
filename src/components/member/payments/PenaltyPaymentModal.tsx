"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X as XIcon, Wallet, Copy, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { fundApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

const BANK_DISPLAY_NAMES: Record<string, string> = {
    MB: "MB Bank",
    VCB: "Vietcombank",
    TCB: "Techcombank",
    ACB: "ACB",
    BIDV: "BIDV",
    VTB: "VietinBank",
    TPB: "TPBank",
    STB: "Sacombank",
    VPB: "VPBank",
    MSB: "MSB",
};

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

function slugName(name: string) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

export function PenaltyPaymentModal({
    penalty,
    onClose,
    onSuccess,
}: {
    penalty: { id: string; amount: number; reason: string };
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { user } = useAuthStore();
    const [method, setMethod] = useState<"choose" | "wallet" | "transfer" | "cash">("choose");
    const [submitting, setSubmitting] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 250);
    };

    const ref = `PHAT ${penalty.id.slice(0, 8).toUpperCase()} ${slugName(user?.full_name ?? "")}`;
    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
    const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${penalty.amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

    const handleWallet = async () => {
        setSubmitting(true);
        try {
            await fundApi.submitPenaltyPayment(penalty.id, { method: "wallet" });
            toast.success("Đã trừ ví thành công!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Trừ ví thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmTransfer = async () => {
        setSubmitting(true);
        try {
            await fundApi.submitPenaltyPayment(penalty.id, {
                method: "bank_transfer",
                payment_reference: ref,
            });
            toast.success("Đã ghi nhận, chờ admin xác nhận!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Gửi thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCash = async () => {
        setSubmitting(true);
        try {
            await fundApi.submitPenaltyPayment(penalty.id, { method: "cash" });
            toast.success("Đã thông báo admin, vui lòng nộp tiền trực tiếp!");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Gửi thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(ref);
        toast.success("Đã copy nội dung chuyển khoản");
    };

    const handleSaveQr = async () => {
        try {
            const res = await fetch(qr);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vietqr-${ref}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Không thể lưu ảnh, vui lòng chụp màn hình");
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 transition-opacity"
            style={{
                opacity: visible ? 1 : 0,
                transitionDuration: "250ms",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto transition-transform ease-out"
                style={{
                    transform: visible
                        ? "translateY(0) scale(1)"
                        : "translateY(100%) scale(1)",
                    transitionDuration: "280ms",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <div>
                        <p className="text-sm font-bold text-[var(--text)]">Thanh toán khoản phạt</p>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5 truncate max-w-[220px]">{penalty.reason}</p>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-faint)]">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between bg-[var(--danger-soft)] rounded-xl px-4 py-3">
                        <span className="text-sm text-[var(--text-muted)]">Số tiền cần trả</span>
                        <span className="text-lg font-black text-[var(--danger)]">{fmt(penalty.amount)}</span>
                    </div>

                    {method === "choose" && (
                        <div className="space-y-3">
                            <button
                                onClick={() => setMethod("wallet")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-5 h-5 text-[var(--primary)]" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">Ví BNB</p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">Trừ thẳng vào số dư ví — xác nhận ngay lập tức</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setMethod("transfer")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">🏦</div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">Chuyển khoản</p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">Quét QR VietQR, gửi ảnh bill xác nhận</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setMethod("cash")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-soft)] transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center text-xl">💵</div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">Tiền mặt</p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">Thông báo admin, nộp tiền trực tiếp</p>
                                </div>
                            </button>
                            <p className="text-[11px] text-[var(--text-faint)] text-center pt-1">
                                Nếu không chọn trong 24h, hệ thống sẽ tự động trừ ví.
                            </p>
                        </div>
                    )}

                    {method === "wallet" && (
                        <div className="space-y-4">
                            <div className="bg-[var(--primary-soft)] rounded-xl p-4">
                                <p className="text-sm font-semibold text-[var(--primary)] mb-1 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                                </p>
                                <p className="text-xs text-[var(--primary)]">Số dư ví sẽ bị trừ ngay lập tức.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                    Quay lại
                                </button>
                                <button
                                    onClick={handleWallet}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Xác nhận trừ ví
                                </button>
                            </div>
                        </div>
                    )}

                    {method === "transfer" && (
                        <div className="space-y-4">
                            <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2">
                                <p className="text-xs text-[var(--text-faint)]">Quét mã QR để thanh toán</p>
                                <img src={qr} alt="VietQR" className="w-48 h-48 object-contain" />
                            </div>
                            <div className="bg-[var(--surface-muted)] rounded-xl divide-y divide-[var(--border)] text-sm overflow-hidden">
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-[var(--text-muted)]">Ngân hàng</span>
                                    <span className="font-semibold text-[var(--text)]">{bankDisplayName}</span>
                                </div>
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-[var(--text-muted)]">Số tài khoản</span>
                                    <span className="font-semibold text-[var(--text)]">{bankAccount}</span>
                                </div>
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-[var(--text-muted)]">Số tiền</span>
                                    <span className="font-bold text-[var(--danger)]">{fmt(penalty.amount)}</span>
                                </div>
                                <div className="px-4 py-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--text-muted)]">Nội dung CK</span>
                                        <span className="font-mono font-semibold text-[var(--text)]">{ref}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)]">
                                    <Copy className="w-3.5 h-3.5" /> Sao chép
                                </button>
                                <button onClick={handleSaveQr} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)]">
                                    <Download className="w-3.5 h-3.5" /> Lưu QR
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                    Quay lại
                                </button>
                                <button
                                    onClick={handleConfirmTransfer}
                                    disabled={submitting}
                                    className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Tôi đã chuyển khoản
                                </button>
                            </div>
                        </div>
                    )}

                    {method === "cash" && (
                        <div className="space-y-4">
                            <div className="bg-[var(--success-soft)] rounded-xl p-4">
                                <p className="text-sm font-semibold text-[var(--success)] mb-1">💵 Thanh toán tiền mặt</p>
                                <p className="text-xs text-[var(--success)]">Admin sẽ xác nhận sau khi nhận tiền trực tiếp.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                    Quay lại
                                </button>
                                <button
                                    onClick={handleCash}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Thông báo admin
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
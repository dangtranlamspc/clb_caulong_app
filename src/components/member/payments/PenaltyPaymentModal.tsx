"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X as XIcon, Wallet, Copy, Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { penaltiesApi } from "@/lib/api";
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

    const ref = `PHAT ${penalty.id.slice(0, 8).toUpperCase()} ${slugName(user?.full_name ?? "")}`;
    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
    const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${penalty.amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

    const handleWallet = async () => {
        setSubmitting(true);
        try {
            await penaltiesApi.submitMemberPayment(penalty.id, { method: "wallet" });
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
            await penaltiesApi.submitMemberPayment(penalty.id, {
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
            await penaltiesApi.submitMemberPayment(penalty.id, { method: "cash" });
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
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Thanh toán khoản phạt</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{penalty.reason}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                        <span className="text-sm text-gray-600">Số tiền cần trả</span>
                        <span className="text-lg font-black text-red-600">{fmt(penalty.amount)}</span>
                    </div>

                    {method === "choose" && (
                        <div className="space-y-3">
                            <button
                                onClick={() => setMethod("wallet")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Ví BNB</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Trừ thẳng vào số dư ví — xác nhận ngay lập tức</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setMethod("transfer")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-xl">🏦</div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Chuyển khoản</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Quét QR VietQR, gửi ảnh bill xác nhận</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setMethod("cash")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-xl">💵</div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Tiền mặt</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Thông báo admin, nộp tiền trực tiếp</p>
                                </div>
                            </button>
                            <p className="text-[11px] text-gray-400 text-center pt-1">
                                Nếu không chọn trong 24h, hệ thống sẽ tự động trừ ví.
                            </p>
                        </div>
                    )}

                    {method === "wallet" && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                                </p>
                                <p className="text-xs text-blue-600">Số dư ví sẽ bị trừ ngay lập tức.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
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
                            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                                <p className="text-xs text-gray-400">Quét mã QR để thanh toán</p>
                                <img src={qr} alt="VietQR" className="w-48 h-48 object-contain" />
                            </div>
                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 text-sm overflow-hidden">
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-gray-500">Ngân hàng</span>
                                    <span className="font-semibold text-gray-900">{bankDisplayName}</span>
                                </div>
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-gray-500">Số tài khoản</span>
                                    <span className="font-semibold text-gray-900">{bankAccount}</span>
                                </div>
                                <div className="flex justify-between px-4 py-2.5">
                                    <span className="text-gray-500">Số tiền</span>
                                    <span className="font-bold text-red-600">{fmt(penalty.amount)}</span>
                                </div>
                                <div className="px-4 py-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Nội dung CK</span>
                                        <span className="font-mono font-semibold text-gray-900">{ref}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                                    <Copy className="w-3.5 h-3.5" /> Sao chép
                                </button>
                                <button onClick={handleSaveQr} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700">
                                    <Download className="w-3.5 h-3.5" /> Lưu QR
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
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
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-green-800 mb-1">💵 Thanh toán tiền mặt</p>
                                <p className="text-xs text-green-600">Admin sẽ xác nhận sau khi nhận tiền trực tiếp.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
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
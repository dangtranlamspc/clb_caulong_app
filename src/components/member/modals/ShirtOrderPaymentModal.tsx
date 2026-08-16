"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Wallet, Landmark, Banknote, X, Loader2, Copy, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { fmt } from "@/utils/utils";
import { BANK_DISPLAY_NAMES } from "@/constants/constants";

type Method = "wallet" | "transfer" | "cash";
type Step = "choose" | "detail";

function removeVietnameseTones(str: string): string {
    return (str ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .toUpperCase();
}

export function ShirtOrderPaymentModal({
    registrations,
    shirtTypes,
    memberName,
    onSubmit,
    onClose,
}: {
    registrations: any[];
    shirtTypes: any[];
    memberName?: string;
    onSubmit: (method: Method, paymentReference?: string) => Promise<void>;
    onClose: () => void;
}) {
    const [method, setMethod] = useState<Method | null>(null);
    const [step, setStep] = useState<Step>("choose");
    const [submitting, setSubmitting] = useState(false);

    const priceOf = (r: any) => {
        const t = shirtTypes.find((x) => x.id === r.shirt_type_id);
        return (t?.price_per_shirt ?? 0) * (r.quantity ?? 1);
    };
    const total = registrations.reduce((s, r) => s + priceOf(r), 0);

    const OPTIONS = [
        { value: "wallet" as const, label: "Ví BNB", desc: "Trừ ngay vào ví", icon: Wallet, cls: "text-blue-600 bg-blue-50" },
        { value: "transfer" as const, label: "Chuyển khoản", desc: "Quét QR, admin xác nhận sau", icon: Landmark, cls: "text-sky-600 bg-sky-50" },
        { value: "cash" as const, label: "Tiền mặt", desc: "Đưa tiền trực tiếp, admin xác nhận sau", icon: Banknote, cls: "text-emerald-600 bg-emerald-50" },
    ];

    const goNext = () => {
        if (!method) return;
        setStep("detail");
    };

    const backToChoose = () => setStep("choose");

    const handleSubmit = async (paymentReference?: string) => {
        if (!method) return;
        setSubmitting(true);
        try {
            await onSubmit(method, paymentReference);
        } finally {
            setSubmitting(false);
        }
    };

    const OrderDetailList = () => (
        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 max-h-52 overflow-y-auto scrollbar-hide">
            {registrations.map((r: any) => {
                const t = shirtTypes.find((x: any) => x.id === r.shirt_type_id);
                return (
                    <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs">
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                                {t?.name ?? "—"}
                                {r.color_name ? ` · ${r.color_name}` : ""}
                            </p>
                            <p className="text-gray-400 mt-0.5">
                                {r.gender === "nu" ? "Nữ" : "Nam"} · Size {r.size} × {r.quantity ?? 1}
                                {r.jersey_number ? ` · Số ${r.jersey_number}` : ""}
                                {r.print_name ? ` · Tên "${r.print_name}"` : ""}
                            </p>
                        </div>
                        <span className="font-semibold text-gray-700 flex-shrink-0">
                            {fmt(priceOf(r))}
                        </span>
                    </div>
                );
            })}
        </div>
    );

    const buildTransferRef = () => {
        const nameSlug = removeVietnameseTones(memberName || "THANH VIEN");

        const typeNames = Array.from(
            new Set(
                registrations.map((r) => {
                    const t = shirtTypes.find((x: any) => x.id === r.shirt_type_id);
                    return t?.name ?? "";
                }),
            ),
        ).filter(Boolean);
        const typeSlug = removeVietnameseTones(typeNames[0] || "AO");

        let ref = `DATAO ${nameSlug} ${typeSlug}`.replace(/\s+/g, " ").trim();
        if (ref.length > 50) ref = ref.slice(0, 50).trim();
        return ref;
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header cố định, không scroll */}
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                        {step === "detail" && (
                            <button
                                onClick={backToChoose}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4 text-gray-500" />
                            </button>
                        )}
                        <h2 className="font-bold text-gray-900">
                            {step === "choose" ? "Chọn phương thức thanh toán" : "Chi tiết đơn hàng"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Nội dung scroll, ẩn scrollbar */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                        <span className="text-xs text-gray-500">Tổng thanh toán</span>
                        <span className="text-base font-bold text-gray-900">{fmt(total)}</span>
                    </div>

                    {step === "choose" && (
                        <>
                            <div className="space-y-2">
                                {OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setMethod(opt.value)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-colors ${method === opt.value ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${opt.cls}`}>
                                            <opt.icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                                            <p className="text-xs text-gray-400">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={goNext}
                                disabled={!method}
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                Tiếp tục
                            </button>
                        </>
                    )}

                    {step === "detail" && method === "wallet" && (
                        <div className="space-y-4">
                            <OrderDetailList />
                            <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                                </p>
                                <p className="text-xs text-blue-600">
                                    Số dư ví sẽ bị trừ ngay {fmt(total)} cho {registrations.length} sản phẩm.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Xác nhận trừ ví
                            </button>
                        </div>
                    )}

                    {step === "detail" && method === "transfer" && (() => {
                        const ref = buildTransferRef();
                        const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                        const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
                        const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
                        const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
                        const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(
                            ref,
                        )}&accountName=${encodeURIComponent(bankAccountName)}`;

                        return (
                            <div className="space-y-4">
                                <OrderDetailList />

                                <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                                    <p className="text-xs text-gray-400">Quét mã QR để chuyển khoản</p>
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
                                        <span className="font-bold text-red-600">{fmt(total)}</span>
                                    </div>
                                    <div className="px-4 py-2.5 flex justify-between">
                                        <span className="text-gray-500">Nội dung CK</span>
                                        <span className="font-mono font-semibold text-gray-900">{ref}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(ref);
                                        toast.success("Đã copy nội dung chuyển khoản");
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Sao chép nội dung
                                </button>

                                <button
                                    onClick={() => handleSubmit(ref)}
                                    disabled={submitting}
                                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Tôi đã chuyển khoản
                                </button>
                            </div>
                        );
                    })()}

                    {step === "detail" && method === "cash" && (
                        <div className="space-y-4">
                            <OrderDetailList />
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-green-800 mb-1">💵 Thanh toán tiền mặt</p>
                                <p className="text-xs text-green-600">
                                    Admin sẽ xác nhận sau khi nhận đủ {fmt(total)} tiền mặt cho {registrations.length} sản phẩm.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSubmit()}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Thông báo admin
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
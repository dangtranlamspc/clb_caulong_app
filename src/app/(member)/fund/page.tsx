"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Eye, EyeOff, Wallet, ArrowUp, ArrowDown, Receipt,
    AlertTriangle, Users, Gift, ShoppingCart, PartyPopper, MoreHorizontal,
    ChevronRight, Sparkles, Coins,
    CheckCircle2,
    Loader2,
    X,
    Plus,
    Calendar,
    ChevronLeft,
} from "lucide-react";
import { fundApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

const CATEGORY_LABELS: Record<string, string> = {
    phat: "Tiền phạt",
    dong_gop: "Đóng góp",
    tai_tro: "Tài trợ",
    mua_sam: "Mua sắm",
    tiec_team: "Tiệc Team",
    chi_khac: "Chi khác",
};

const CATEGORY_ICONS: Record<string, any> = {
    phat: AlertTriangle,
    dong_gop: Users,
    tai_tro: Gift,
    mua_sam: ShoppingCart,
    tiec_team: PartyPopper,
    chi_khac: MoreHorizontal,
};

const CATEGORY_COLORS: Record<string, { bg: string; ic: string }> = {
    phat: { bg: "bg-[var(--warning-soft)]", ic: "text-[var(--warning)]" },
    dong_gop: { bg: "bg-[var(--success-soft)]", ic: "text-[var(--success)]" },
    tai_tro: { bg: "bg-[var(--primary-soft)]", ic: "text-[var(--primary)]" },
    mua_sam: { bg: "bg-[var(--purple-soft)]", ic: "text-[var(--purple)]" },
    tiec_team: { bg: "bg-[var(--warning-soft)]", ic: "text-[var(--warning)]" },
    chi_khac: { bg: "bg-[var(--surface-muted)]", ic: "text-[var(--text-muted)]" },
};

type FundTxCategory = "phat" | "dong_gop" | "tai_tro" | "mua_sam" | "tiec_team" | "chi_khac";

const WITHDRAW_CATEGORIES: { value: FundTxCategory; label: string }[] = [
    { value: "mua_sam", label: "Mua sắm" },
    { value: "tiec_team", label: "Tiệc Team" },
    { value: "chi_khac", label: "Chi khác" },
];


function RequestWithdrawModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const [category, setCategory] = useState<FundTxCategory>("mua_sam");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const parsedAmount = Number(amount.replace(/\D/g, ""));

    const handleSubmit = async () => {
        setError(null);

        if (!title.trim()) {
            setError("Vui lòng nhập nội dung khoản chi");
            return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
            setError("Vui lòng nhập số tiền hợp lệ");
            return;
        }

        setSubmitting(true);
        try {
            await fundApi.requestTransaction({
                type: "chi",
                category,
                title: title.trim(),
                description: description.trim() || undefined,
                amount: parsedAmount,
            });
            onSuccess();
            setSuccess("Đã gửi yêu cầu rút quỹ, chờ admin duyệt");
            setTimeout(handleClose, 1400);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Gửi yêu cầu thất bại, vui lòng thử lại");
        } finally {
            setSubmitting(false);
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
                transition: "opacity 200ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-sm bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(24px)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--danger-soft)] flex items-center justify-center">
                            <ArrowDown className="w-4.5 h-4.5 text-[var(--danger)]" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[var(--text)]">Yêu cầu rút quỹ</p>
                            <p className="text-[11px] text-[var(--text-faint)]">Gửi yêu cầu chi, admin sẽ xét duyệt</p>
                        </div>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center text-center py-6">
                            <CheckCircle2 className="w-12 h-12 text-[var(--success)] mb-3" />
                            <p className="font-bold text-[var(--text)]">{success}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Loại chi</label>
                                <div className="flex gap-2">
                                    {WITHDRAW_CATEGORIES.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setCategory(c.value)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${category === c.value
                                                ? "bg-red-500 text-white border-red-500"
                                                : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                                                }`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Nội dung</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ví dụ: Mua ống cầu tháng 8"
                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[var(--danger)]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Số tiền (đ)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={amount ? new Intl.NumberFormat("vi-VN").format(Number(amount.replace(/\D/g, ""))) : ""}
                                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                                    placeholder="0"
                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[var(--danger)]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Ghi chú (không bắt buộc)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Lý do chi, chứng từ liên quan..."
                                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[var(--danger)] resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-3 py-2">{error}</p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Gửi yêu cầu
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}


const CONTRIBUTE_CATEGORIES: { value: string; label: string }[] = [
    { value: "dong_gop", label: "Đóng góp" },
    { value: "tai_tro", label: "Tài trợ" },
];


function ContributeModal({
    onClose,
    onNext,
}: {
    onClose: () => void;
    onNext: (data: { category: string; title: string; description: string; amount: number }) => void;
}) {
    const [visible, setVisible] = useState(false);
    const [category, setCategory] = useState<string>("dong_gop");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const parsedAmount = Number(amount.replace(/\D/g, ""));

    const handleNext = () => {
        setError(null);

        if (!title.trim()) {
            setError("Vui lòng nhập nội dung đóng góp");
            return;
        }
        if (!parsedAmount || parsedAmount <= 0) {
            setError("Vui lòng nhập số tiền hợp lệ");
            return;
        }

        onNext({
            category,
            title: title.trim(),
            description: description.trim(),
            amount: parsedAmount,
        });
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
                transition: "opacity 200ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-sm bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(24px)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center">
                            <Wallet className="w-4.5 h-4.5 text-[var(--primary)]" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[var(--text)]">Góp quỹ</p>
                            <p className="text-[11px] text-[var(--text-faint)]">Nhập thông tin rồi chọn cách thanh toán</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Loại đóng góp</label>
                            <div className="flex gap-2">
                                {CONTRIBUTE_CATEGORIES.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCategory(c.value)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${category === c.value
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                                            }`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Nội dung</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ví dụ: Ủng hộ quỹ CLB tháng 8"
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] focus:border-[var(--primary)]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Số tiền (đ)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={amount ? new Intl.NumberFormat("vi-VN").format(Number(amount.replace(/\D/g, ""))) : ""}
                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                                placeholder="0"
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] focus:border-[var(--primary)]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Ghi chú (không bắt buộc)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Thêm ghi chú nếu cần..."
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] focus:border-[var(--primary)] resize-none"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-3 py-2">{error}</p>
                        )}

                        <button
                            onClick={handleNext}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2"
                        >
                            Thanh toán
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ContributionMethodModal({
    data,
    onClose,
    onSuccess,
}: {
    data: { category: string; title: string; description: string; amount: number };
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const [method, setMethod] = useState<"choose" | "wallet" | "transfer" | "cash">("choose");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const ref = `GOPQUY ${Date.now().toString(36).toUpperCase()}`;
    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${data.amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

    const submit = async (payMethod: "wallet" | "bank_transfer" | "cash") => {
        setError(null);
        setSubmitting(true);
        try {
            await fundApi.contributeSelf({
                category: data.category as any,
                title: data.title,
                description: data.description || undefined,
                amount: data.amount,
                method: payMethod,
                payment_reference: payMethod === "bank_transfer" ? ref : undefined,
            });
            onSuccess();
            setSuccess(
                payMethod === "wallet"
                    ? "Đã góp quỹ thành công"
                    : "Đã gửi yêu cầu góp quỹ, chờ admin xác nhận",
            );
            setTimeout(handleClose, 1400);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Thao tác thất bại, vui lòng thử lại");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(ref);
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform 280ms cubic-bezier(0.32,0.72,0,1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <div>
                        <p className="text-sm font-bold text-[var(--text)]">Chọn phương thức góp quỹ</p>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5 truncate max-w-[220px]">{data.title}</p>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-faint)]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between bg-[var(--primary-soft)] rounded-xl px-4 py-3">
                        <span className="text-sm text-[var(--text-muted)]">Số tiền góp quỹ</span>
                        <span className="text-lg font-black text-[var(--primary)]">{fmt(data.amount)}</span>
                    </div>

                    {success ? (
                        <div className="flex flex-col items-center text-center py-6">
                            <CheckCircle2 className="w-12 h-12 text-[var(--success)] mb-3" />
                            <p className="font-bold text-[var(--text)]">{success}</p>
                        </div>
                    ) : (
                        <>
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
                                            <p className="text-xs text-[var(--text-faint)] mt-0.5">Trừ ví ngay — quỹ được cộng ngay lập tức</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setMethod("transfer")}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">🏦</div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text)]">Chuyển khoản</p>
                                            <p className="text-xs text-[var(--text-faint)] mt-0.5">Quét QR, admin xác nhận rồi mới cộng quỹ</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setMethod("cash")}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-soft)] transition-colors text-left"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center text-xl">💵</div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text)]">Tiền mặt</p>
                                            <p className="text-xs text-[var(--text-faint)] mt-0.5">Admin xác nhận sau khi nhận tiền trực tiếp</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {method === "wallet" && (
                                <div className="space-y-4">
                                    <div className="bg-[var(--primary-soft)] rounded-xl p-4">
                                        <p className="text-sm font-semibold text-[var(--primary)] mb-1 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" /> Góp quỹ bằng Ví BNB
                                        </p>
                                        <p className="text-xs text-[var(--primary)]">Ví sẽ bị trừ và quỹ được cộng ngay lập tức, không cần admin xác nhận.</p>
                                    </div>
                                    {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-3 py-2">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                            Quay lại
                                        </button>
                                        <button
                                            onClick={() => submit("wallet")}
                                            disabled={submitting}
                                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                                        >
                                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Góp quỹ
                                        </button>
                                    </div>
                                </div>
                            )}

                            {method === "transfer" && (
                                <div className="space-y-4">
                                    <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2">
                                        <p className="text-xs text-[var(--text-faint)]">Quét mã QR để chuyển khoản</p>
                                        <img src={qr} alt="VietQR" className="w-48 h-48 object-contain" />
                                    </div>
                                    <div className="bg-[var(--surface-muted)] rounded-xl divide-y divide-[var(--border)] text-sm overflow-hidden">
                                        <div className="flex justify-between px-4 py-2.5">
                                            <span className="text-[var(--text-muted)]">Số tiền</span>
                                            <span className="font-bold text-[var(--primary)]">{fmt(data.amount)}</span>
                                        </div>
                                        <div className="px-4 py-2.5 flex justify-between">
                                            <span className="text-[var(--text-muted)]">Nội dung CK</span>
                                            <span className="font-mono font-semibold text-[var(--text)]">{ref}</span>
                                        </div>
                                    </div>
                                    <button onClick={handleCopy} className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)]">
                                        Sao chép nội dung
                                    </button>
                                    {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-3 py-2">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                            Quay lại
                                        </button>
                                        <button
                                            onClick={() => submit("bank_transfer")}
                                            disabled={submitting}
                                            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                                        >
                                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi yêu cầu góp quỹ
                                        </button>
                                    </div>
                                </div>
                            )}

                            {method === "cash" && (
                                <div className="space-y-4">
                                    <div className="bg-[var(--success-soft)] rounded-xl p-4">
                                        <p className="text-sm font-semibold text-[var(--success)] mb-1">💵 Góp quỹ tiền mặt</p>
                                        <p className="text-xs text-[var(--success)]">Admin sẽ xác nhận sau khi nhận tiền trực tiếp, quỹ sẽ được cộng sau khi xác nhận.</p>
                                    </div>
                                    {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger-soft)] rounded-lg px-3 py-2">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={() => setMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                                            Quay lại
                                        </button>
                                        <button
                                            onClick={() => submit("cash")}
                                            disabled={submitting}
                                            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                        >
                                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi yêu cầu góp quỹ
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function MonthYearFilterModal({
    month,
    year,
    onClose,
    onApply,
}: {
    month: number;
    year: number;
    onClose: () => void;
    onApply: (month: number, year: number) => void;
}) {
    const [visible, setVisible] = useState(false);
    const [selMonth, setSelMonth] = useState(month);
    const [selYear, setSelYear] = useState(year);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const handleApply = () => {
        onApply(selMonth, selYear);
        handleClose();
    };

    const monthLabels = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
                transition: "opacity 200ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-sm bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(24px)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>

                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center">
                            <Calendar className="w-4.5 h-4.5 text-[var(--primary)]" />
                        </div>
                        <div>
                            <p className="text-base font-bold text-[var(--text)]">Chọn tháng xem quỹ</p>
                            <p className="text-[11px] text-[var(--text-faint)]">Lọc số dư và giao dịch theo tháng</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-4 bg-[var(--surface-muted)] rounded-xl px-3 py-2">
                        <button
                            onClick={() => setSelYear((y) => y - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface)]"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-[var(--text)]">Năm {selYear}</span>
                        <button
                            onClick={() => setSelYear((y) => y + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface)]"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {monthLabels.map((label, i) => {
                            const m = i + 1;
                            const isActive = m === selMonth;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setSelMonth(m)}
                                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${isActive
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleApply}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold"
                    >
                        Xem tháng {selMonth}/{selYear}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}


export default function FundPage() {
    const [showBalance, setShowBalance] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContribute, setShowContribute] = useState(false);
    const [contributeDraft, setContributeDraft] = useState<{ category: string; title: string; description: string; amount: number } | null>(null);
    const [showWithdrawRequest, setShowWithdrawRequest] = useState(false);

    const [filterMonth, setFilterMonth] = useState(() => new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const load = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        return Promise.all([
            fundApi.getSummary(filterMonth, filterYear),
            fundApi.listTransactions({ month: filterMonth, year: filterYear, status: "approved", limit: 200, page: 1 }),
        ])
            .then(([sumRes, txRes]) => {
                setSummary(sumRes.data);
                setTxs(txRes.data.data ?? []);
            })
            .finally(() => setLoading(false));
    }, [filterMonth, filterYear]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        let debounceRef: ReturnType<typeof setTimeout> | null = null;
        const channel = supabase
            .channel("fund-page-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "fund_transactions" },
                () => {
                    if (debounceRef) clearTimeout(debounceRef);
                    debounceRef = setTimeout(() => load(true), 250);
                },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "club_fund" },
                () => {
                    if (debounceRef) clearTimeout(debounceRef);
                    debounceRef = setTimeout(() => load(true), 250);
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
            if (debounceRef) clearTimeout(debounceRef);
        };
    }, [load]);

    const thuTxs = [...txs]
        .filter((t) => t.type === "thu")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const chiTxs = [...txs]
        .filter((t) => t.type === "chi")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recentThu = thuTxs.slice(0, 3);
    const recentChi = chiTxs.slice(0, 3);

    const recentTxs = [...txs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <div className="max-w-md mx-auto space-y-5 pb-8 px-3">
            <div className="flex items-center justify-between px-1 pt-2 gap-2">
                <h1 className="text-base font-bold text-[var(--text)] flex-shrink-0">Quỹ chung</h1>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                        onClick={() => setShowMonthPicker(true)}
                        className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold px-2.5 py-2 rounded-xl active:scale-95 transition-transform"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        {filterMonth}/{filterYear}
                    </button>
                    <button
                        onClick={() => setShowWithdrawRequest(true)}
                        className="flex items-center gap-1.5 bg-[var(--surface)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                        Rút quỹ
                    </button>
                    <button
                        onClick={() => setShowContribute(true)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm shadow-blue-200 active:scale-95 transition-transform"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Góp quỹ
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-3xl p-5 flex items-center justify-between gap-4 relative overflow-hidden">
                <Sparkles className="w-4 h-4 text-blue-300 absolute top-4 right-24" />
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] mb-1">
                        Số dư hiện tại
                        <button onClick={() => setShowBalance((v) => !v)} className="text-[var(--text-faint)] hover:text-[var(--text-muted)]">
                            {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                    {loading ? (
                        <div className="h-8 w-36 bg-[var(--primary-soft)] rounded-lg animate-pulse" />
                    ) : (
                        <p className="text-2xl font-black text-[var(--primary)]">
                            {showBalance ? fmt(summary?.balance ?? 0) : "••••••••"}
                        </p>
                    )}
                    <p className="text-[11px] text-[var(--text-faint)] mt-1">
                        {summary?.updated_at
                            ? `Cập nhật lần cuối: ${new Date(summary.updated_at).toLocaleString("vi-VN")}`
                            : ""}
                    </p>
                </div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                    <Wallet className="w-8 h-8 text-white" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                        <Coins className="w-3.5 h-3.5 text-[var(--warning)]" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-1 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[var(--success-soft)] flex items-center justify-center">
                        <ArrowUp className="w-3.5 h-3.5 text-[var(--success)]" />
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)]">Thu T{filterMonth}/{filterYear}</p>
                    <p className="text-sm font-bold text-[var(--success)]">
                        +{fmt(summary?.month_overview?.total_thu ?? 0)}
                    </p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-1 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[var(--danger-soft)] flex items-center justify-center">
                        <ArrowDown className="w-3.5 h-3.5 text-[var(--danger)]" />
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)]">Chi T{filterMonth}/{filterYear}</p>
                    <p className="text-sm font-bold text-[var(--danger)]">
                        -{fmt(summary?.month_overview?.total_chi ?? 0)}
                    </p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-1 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                        <Receipt className="w-3.5 h-3.5 text-[var(--primary)]" />
                    </div>
                    <p className="text-[10px] text-[var(--text-faint)]">Giao dịch</p>
                    <p className="text-sm font-bold text-[var(--text)]">{txs.length}</p>
                </div>
            </div>

            <section>
                <div className="flex items-center justify-between mb-2 px-0.5">
                    <h3 className="text-sm font-bold text-[var(--text)]">Nguồn thu</h3>
                    <Link href="/fund/thu" className="text-xs font-semibold text-[var(--primary)]">
                        Xem tất cả
                    </Link>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] shadow-sm">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
                        </div>
                    ) : recentThu.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-[var(--text-faint)] text-center">Chưa có khoản thu nào</p>
                    ) : (
                        recentThu.map((tx) => {
                            const Icon = CATEGORY_ICONS[tx.category] ?? MoreHorizontal;
                            const color = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS.chi_khac;
                            return (
                                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${color.ic}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.title}</p>
                                        <p className="text-[11px] text-[var(--text-faint)]">
                                            {CATEGORY_LABELS[tx.category]} · {new Date(tx.created_at).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--success)] whitespace-nowrap">+{fmt(tx.amount)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-2 px-0.5">
                    <h3 className="text-sm font-bold text-[var(--text)]">Khoản chi</h3>
                    <Link href="/fund/chi" className="text-xs font-semibold text-[var(--primary)]">
                        Xem tất cả
                    </Link>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] shadow-sm">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
                        </div>
                    ) : recentChi.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-[var(--text-faint)] text-center">Chưa có khoản chi nào</p>
                    ) : (
                        recentChi.map((tx) => {
                            const Icon = CATEGORY_ICONS[tx.category] ?? MoreHorizontal;
                            const color = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS.chi_khac;
                            return (
                                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${color.ic}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.title}</p>
                                        <p className="text-[11px] text-[var(--text-faint)]">
                                            {CATEGORY_LABELS[tx.category]} · {new Date(tx.created_at).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--danger)] whitespace-nowrap">-{fmt(tx.amount)}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-2 px-0.5">
                    <h3 className="text-sm font-bold text-[var(--text)]">Lịch sử giao dịch</h3>
                    <Link href="/fund/transactions" className="text-xs font-semibold text-[var(--primary)]">
                        Xem tất cả
                    </Link>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] shadow-sm">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
                        </div>
                    ) : recentTxs.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-[var(--text-faint)] text-center">Chưa có giao dịch nào</p>
                    ) : (
                        recentTxs.map((tx) => {
                            const Icon = CATEGORY_ICONS[tx.category] ?? MoreHorizontal;
                            const color = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS.chi_khac;
                            return (
                                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`w-4 h-4 ${color.ic}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text)] truncate">{tx.title}</p>
                                        <p className="text-[11px] text-[var(--text-faint)]">
                                            {new Date(tx.created_at).toLocaleString("vi-VN", {
                                                day: "2-digit", month: "2-digit", year: "numeric",
                                                hour: "2-digit", minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    <span className={`text-sm font-bold whitespace-nowrap ${tx.type === "thu" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                        {tx.type === "thu" ? "+" : "-"}{fmt(tx.amount)}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" />
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {showContribute && (
                <ContributeModal
                    onClose={() => setShowContribute(false)}
                    onNext={(data) => {
                        setShowContribute(false);
                        setContributeDraft(data);
                    }}
                />
            )}

            {contributeDraft && (
                <ContributionMethodModal
                    data={contributeDraft}
                    onClose={() => setContributeDraft(null)}
                    onSuccess={() => load(true)}
                />
            )}

            {showWithdrawRequest && (
                <RequestWithdrawModal
                    onClose={() => setShowWithdrawRequest(false)}
                    onSuccess={() => load(true)}
                />
            )}

            {showMonthPicker && (
                <MonthYearFilterModal
                    month={filterMonth}
                    year={filterYear}
                    onClose={() => setShowMonthPicker(false)}
                    onApply={(m, y) => {
                        setFilterMonth(m);
                        setFilterYear(y);
                    }}
                />
            )}
        </div>
    );
}
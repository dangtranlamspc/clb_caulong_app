"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Trash2,
    Plus,
    Minus,
    Copy,
    CheckCircle2,
    XCircle,
    Loader2,
    UploadCloud,
    Info,
    ChevronLeft,
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { guestShirtOrderApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { createPortal } from "react-dom";

const SHIPPING_FEE = 20000;
const FREE_SHIP_THRESHOLD = 500000;

const FORM_OPTIONS = [
    { value: "nam", label: "Nam" },
    { value: "nu", label: "Nữ" },
    { value: "oversize", label: "Oversize" },
];

const GENDER_OPTIONS = [
    { value: "nam", label: "Nam" },
    { value: "nu", label: "Nữ" },
];

const LEVEL_OPTIONS = [
    { value: "A", label: "A" },
    { value: "B+", label: "B+" },
    { value: "B", label: "B" },
    { value: "C", label: "C" },
];

type CartItem = {
    localId: string;
    shirt_type_id: string;
    color_id?: string;
    gender: "nam" | "nu" | "oversize";
    size: string;
    quantity: number;
    jersey_number?: string;
    print_name?: string;
};

function emptyItem(): CartItem {
    return {
        localId: crypto.randomUUID(),
        shirt_type_id: "",
        color_id: undefined,
        gender: "nam",
        size: "",
        quantity: 1,
        jersey_number: "",
        print_name: "",
    };
}

function formatCurrency(n: number) {
    return `${n.toLocaleString("vi-VN")}đ`;
}

function imgSrc(img: any): string | null {
    if (!img) return null;
    return typeof img === "string" ? img : img.url;
}

export const COLOR_SWATCH_MAP: Record<string, string> = {
    "xanh dương": "#2563eb",
    "xanh nước biển": "#1d4ed8",
    "xanh navy": "#1e3a8a",
    "xanh lá cây": "#16a34a",
    "xanh lá": "#16a34a",
    "xanh ngọc": "#0d9488",
    "xanh": "#2563eb",
    "trắng": "#ffffff",
    "đen": "#111827",
    "đỏ": "#dc2626",
    "vàng": "#eab308",
    "cam": "#f97316",
    "tím": "#9333ea",
    "hồng": "#ec4899",
    "xám": "#9ca3af",
    "nâu": "#92400e",
    "be": "#d6c7a1",
    "bạc": "#c0c0c0",
};

function getColorHex(name?: string): string | null {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    const keys = Object.keys(COLOR_SWATCH_MAP).sort(
        (a, b) => b.length - a.length,
    );
    const match = keys.find((k) => normalized.includes(k));
    return match ? COLOR_SWATCH_MAP[match] : null;
}

function getTypeImage(type: any, colorId?: string): string | null {
    if (!type) return null;
    const colors: any[] = type.colors ?? [];
    const color = colorId
        ? colors.find((c: any) => c.id === colorId)
        : colors[0];
    const img = color?.images?.[0] ?? colors[0]?.images?.[0];
    return imgSrc(img);
}

const STEP_LABELS = [
    "Chọn sản phẩm",
    "Thông tin & tuỳ chọn",
    "Xác nhận",
    "Thanh toán",
];

function Stepper({ currentStep }: { currentStep: number }) {
    return (
        <>
            <div className="sm:hidden">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {currentStep}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                            {STEP_LABELS[currentStep - 1]}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                        Bước {currentStep}/{STEP_LABELS.length}
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                        style={{
                            width: `${(currentStep / STEP_LABELS.length) * 100}%`,
                        }}
                    />
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-1">
                {STEP_LABELS.map((s, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum === currentStep;
                    const isDone = stepNum < currentStep;
                    return (
                        <div key={s} className="flex items-center gap-2 flex-shrink-0">
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive
                                    ? "bg-blue-600 text-white"
                                    : isDone
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-gray-100 text-gray-400"
                                    }`}
                            >
                                <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isActive
                                        ? "bg-white text-blue-600"
                                        : isDone
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-200"
                                        }`}
                                >
                                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                                </span>
                                {s}
                            </div>
                            {i < STEP_LABELS.length - 1 && (
                                <div
                                    className={`w-6 h-px flex-shrink-0 ${isDone ? "bg-blue-200" : "bg-gray-200"
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function ImageLightbox({
    src,
    onClose,
}: {
    src: string;
    onClose: () => void;
}) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    return (
        <div
            className={`fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 lightbox-backdrop ${closing ? "lightbox-backdrop-out" : "lightbox-backdrop-in"
                }`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
                ✕
            </button>
            <img
                src={src}
                alt=""
                className={`max-w-full max-h-[90vh] object-contain rounded-lg lightbox-image ${closing ? "lightbox-image-out" : "lightbox-image-in"
                    }`}
            />

            <style jsx>{`
                .lightbox-backdrop-in {
                    animation: backdropIn 0.2s ease-out;
                }
                .lightbox-backdrop-out {
                    animation: backdropOut 0.2s ease-in forwards;
                }
                .lightbox-image-in {
                    animation: imageIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .lightbox-image-out {
                    animation: imageOut 0.2s ease-in forwards;
                }
                @keyframes backdropIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes backdropOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
                @keyframes imageIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes imageOut {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                }
            `}</style>
        </div>
    );
}

export default function GuestShirtOrderPage({
    activityId,
}: {
    activityId: string;
}) {
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<any>(null);

    const [step, setStep] = useState(1);

    const [buyerName, setBuyerName] = useState("");
    const [buyerPhone, setBuyerPhone] = useState("");
    const [buyerGender, setBuyerGender] = useState("nam");
    const [buyerLevel, setBuyerLevel] = useState("B+");
    const [buyerNickname, setBuyerNickname] = useState("");
    const [notes, setNotes] = useState("");

    const [cart, setCart] = useState<CartItem[]>([]);
    const [current, setCurrent] = useState<CartItem>(emptyItem());

    const [checking, setChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<
        { number: string; available: boolean } | null
    >(null);

    const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash">(
        "transfer",
    );
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [uploadingProof, setUploadingProof] = useState(false);

    const [agree, setAgree] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    useEffect(() => {
        if (!activityId) return;
        setLoading(true);
        guestShirtOrderApi
            .getActivity(activityId)
            .then(({ data }) => setActivity(data))
            .catch(() => toast.error("Không tìm thấy hoạt động đặt áo này"))
            .finally(() => setLoading(false));
    }, [activityId]);

    const shirtTypes: any[] = activity?.detail?.shirt_types ?? [];
    const selectedType = shirtTypes.find((t) => t.id === current.shirt_type_id);

    useEffect(() => {
        if (shirtTypes.length && !current.shirt_type_id) {
            const firstType = shirtTypes[0];
            setCurrent((c) => ({
                ...c,
                shirt_type_id: firstType.id,
                color_id: firstType.colors?.[0]?.id,
            }));
        }
    }, [shirtTypes.length]);

    const availableSizes: string[] = useMemo(() => {
        if (!selectedType) return [];
        return selectedType.available_sizes?.[current.gender] ?? [];
    }, [selectedType, current.gender]);

    const daysLeft = activity?.deadline
        ? differenceInCalendarDays(new Date(activity.deadline), new Date())
        : null;

    const priceFor = (item: CartItem) => {
        const type = shirtTypes.find((t) => t.id === item.shirt_type_id);
        return (type?.price_per_shirt ?? 0) * item.quantity;
    };

    const subtotal = useMemo(
        () => cart.reduce((sum, i) => sum + priceFor(i), 0),
        [cart, shirtTypes],
    );
    const shippingFee = subtotal >= FREE_SHIP_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
    const total = subtotal + shippingFee;

    const resetCurrentItem = () => {
        setCurrent(emptyItem());
        setCheckResult(null);
    };

    const validateCurrentItem = (): string | null => {
        if (!current.shirt_type_id) return "Vui lòng chọn mẫu áo";
        if (!current.size) return "Vui lòng chọn size áo";
        if (!current.quantity || current.quantity < 1)
            return "Số lượng không hợp lệ";
        return null;
    };

    const canProceedStep1 =
        !!current.shirt_type_id &&
        (!selectedType?.colors?.length || !!current.color_id);

    const handleRemoveFromCart = (localId: string) => {
        setCart((prev) => prev.filter((i) => i.localId !== localId));
    };

    const handleCheckJerseyNumber = async () => {
        if (!current.jersey_number?.trim()) {
            toast.error("Vui lòng nhập số áo cần kiểm tra");
            return;
        }
        setChecking(true);
        setCheckResult(null);
        try {
            const { data } = await guestShirtOrderApi.checkJerseyNumber(
                activityId,
                current.jersey_number.trim(),
            );
            setCheckResult(data);
        } catch {
        } finally {
            setChecking(false);
        }
    };

    const handleGetNickname = () => {
        if (!buyerNickname.trim()) {
            toast.error("Vui lòng nhập nickname trước");
            return;
        }
        setCurrent((c) => ({ ...c, print_name: buyerNickname }));
    };

    const handleProofChange = async (file: File | null) => {
        setProofFile(file);
        if (!file) {
            setProofPreview(null);
            return;
        }
        setProofPreview(URL.createObjectURL(file));
    };

    const validateStep2 = (): boolean => {
        if (!buyerName.trim() || !buyerPhone.trim()) {
            toast.error("Vui lòng nhập họ tên và số điện thoại");
            return false;
        }
        const err = validateCurrentItem();
        if (err) {
            toast.error(err);
            return false;
        }
        return true;
    };

    const handleContinueToReview = () => {
        if (!validateStep2()) return;
        setCart((prev) => [...prev, current]);
        resetCurrentItem();
        setStep(3);
    };

    const handleAddAnotherFromStep2 = () => {
        if (!validateStep2()) return;
        setCart((prev) => [...prev, current]);
        resetCurrentItem();
        toast.success("Đã thêm áo vào đơn hàng");
        setStep(1);
    };

    const handleGoToPayment = () => {
        if (cart.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 áo");
            return;
        }
        setStep(4);
    };

    const buildFinalCart = (): CartItem[] => {
        const err = validateCurrentItem();
        if (!err) {
            const alreadyQueued = cart.length > 0 && !current.shirt_type_id;
            if (!alreadyQueued) {
                return [...cart, current];
            }
        }
        return cart;
    };

    const handleSubmit = async () => {
        if (!buyerName.trim() || !buyerPhone.trim()) {
            toast.error("Vui lòng nhập họ tên và số điện thoại");
            return;
        }
        const finalCart = buildFinalCart();
        if (finalCart.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 áo");
            return;
        }
        if (!agree) {
            toast.error("Vui lòng xác nhận đã kiểm tra thông tin đơn hàng");
            return;
        }

        setSubmitting(true);
        try {
            let paymentProofUrl: string | undefined;
            if (paymentMethod === "transfer" && proofFile) {
                setUploadingProof(true);
                const { data } = await guestShirtOrderApi.uploadPaymentProof(
                    proofFile,
                );
                paymentProofUrl = data.url;
                setUploadingProof(false);
            }

            const { data } = await guestShirtOrderApi.submitOrder(activityId, {
                guest_full_name: buyerName,
                guest_phone: buyerPhone,
                guest_gender: buyerGender,
                guest_skill_level: buyerLevel,
                guest_nickname: buyerNickname,
                notes,
                payment_method: paymentMethod,
                payment_proof_url: paymentProofUrl,
                items: finalCart.map((i) => ({
                    shirt_type_id: i.shirt_type_id,
                    color_id: i.color_id,
                    gender: i.gender,
                    size: i.size,
                    quantity: i.quantity,
                    jersey_number: i.jersey_number || undefined,
                    print_name: i.print_name || undefined,
                })),
            });

            setSubmitted(data);
            toast.success("Đặt áo thành công!");
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!activity) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
                Không tìm thấy hoạt động đặt áo này.
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center space-y-4">
                    <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                    <h1 className="text-xl font-bold text-gray-900">
                        Đặt áo thành công!
                    </h1>
                    <p className="text-sm text-gray-500">
                        Cảm ơn {buyerName} đã đặt áo cho "{activity.title}". BTC sẽ liên hệ
                        xác nhận trong thời gian sớm nhất.
                    </p>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-left space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Tổng tiền</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(submitted.total_amount)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Số lượng áo</span>
                            <span className="font-semibold text-gray-900">
                                {submitted.registrations?.length ?? 0}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Phương thức</span>
                            <span className="font-semibold text-gray-900">
                                {paymentMethod === "transfer" ? "Chuyển khoản" : "Tiền mặt"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const bankInfo = activity.detail?.bank_info;
    const qrUrl =
        bankInfo?.bank_code && bankInfo?.account_number
            ? `https://img.vietqr.io/image/${bankInfo.bank_code}-${bankInfo.account_number
            }-compact2.png?amount=${total}&addInfo=${encodeURIComponent(
                `DATAOA ${activityId.slice(0, 8).toUpperCase()}`,
            )}`
            : null;

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {activity.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-gray-500">
                        {activity.deadline && (
                            <span>
                                Hạn chốt:{" "}
                                {format(new Date(activity.deadline), "dd/MM/yyyy", {
                                    locale: vi,
                                })}
                            </span>
                        )}
                        {daysLeft !== null && daysLeft >= 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                                Còn {daysLeft} ngày
                            </span>
                        )}
                        {daysLeft !== null && daysLeft < 0 && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                                Đã hết hạn đặt áo
                            </span>
                        )}
                    </div>
                </div>

                <Stepper currentStep={step} />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                    <div className="space-y-5 min-w-0">
                        {step === 1 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h2 className="font-bold text-gray-900 mb-3">
                                    1. Chọn mẫu áo
                                </h2>

                                <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5">
                                    {shirtTypes.map((t) => {
                                        const activeTab = current.shirt_type_id === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() =>
                                                    setCurrent((c) => ({
                                                        ...c,
                                                        shirt_type_id: t.id,
                                                        color_id: t.colors?.[0]?.id,
                                                        size: "",
                                                    }))
                                                }
                                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap tab-btn ${activeTab
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 tab-btn-active"
                                                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                    }`}
                                            >
                                                {t.name}
                                            </button>
                                        );
                                    })}
                                </div>

                                <style jsx>{`
                                    .tab-btn {
                                        transition: background-color 0.25s ease, color 0.25s ease,
                                            box-shadow 0.25s ease, transform 0.2s ease;
                                    }
                                    .tab-btn:active {
                                        transform: scale(0.96);
                                    }
                                    .tab-btn-active {
                                        animation: tabPop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
                                    }
                                    @keyframes tabPop {
                                        0% {
                                            transform: scale(0.92);
                                        }
                                        60% {
                                            transform: scale(1.04);
                                        }
                                        100% {
                                            transform: scale(1);
                                        }
                                    }
                                `}</style>

                                {selectedType && (
                                    <div className="flex flex-col-reverse sm:flex-row gap-5">
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">
                                                    {selectedType.name}
                                                </p>
                                                <p className="text-blue-600 font-bold">
                                                    {formatCurrency(selectedType.price_per_shirt ?? 0)}
                                                </p>
                                            </div>

                                            {selectedType.colors?.length > 0 && (
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        Màu sắc
                                                    </p>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        {selectedType.colors.map((c: any) => {
                                                            const hex = getColorHex(c.name);
                                                            const isSelected = current.color_id === c.id;
                                                            return (
                                                                <button
                                                                    key={c.id}
                                                                    onClick={() =>
                                                                        setCurrent((cur) => ({
                                                                            ...cur,
                                                                            color_id: c.id,
                                                                        }))
                                                                    }
                                                                    title={c.name}
                                                                    className="flex flex-col items-center gap-1.5"
                                                                >
                                                                    <span
                                                                        className={`color-dot relative w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-sm ${isSelected
                                                                            ? "border-blue-500 color-dot-pop"
                                                                            : "border-gray-200"
                                                                            }`}
                                                                        style={{
                                                                            background: hex ?? "#e5e7eb",
                                                                        }}
                                                                    >
                                                                        {isSelected && (
                                                                            <CheckCircle2
                                                                                className="w-4 h-4 drop-shadow"
                                                                                style={{
                                                                                    color:
                                                                                        hex === "#ffffff"
                                                                                            ? "#2563eb"
                                                                                            : "#ffffff",
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className={`text-[11px] max-w-[64px] truncate ${isSelected
                                                                            ? "text-blue-600 font-semibold"
                                                                            : "text-gray-500"
                                                                            }`}
                                                                    >
                                                                        {c.name}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className="w-full sm:w-[420px] aspect-[16/10] rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-zoom-in"
                                            onClick={() =>
                                                getTypeImage(selectedType, current.color_id) &&
                                                setLightboxOpen(true)
                                            }
                                        >
                                            {getTypeImage(selectedType, current.color_id) ? (
                                                <img
                                                    src={
                                                        getTypeImage(
                                                            selectedType,
                                                            current.color_id,
                                                        ) as string
                                                    }
                                                    className="w-full h-full object-contain"
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="text-5xl">👕</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!canProceedStep1}
                                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Tiếp tục
                                    </button>
                                </div>

                                <style jsx>{`
                                    .color-dot-pop {
                                        animation: colorPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                                    }
                                    @keyframes colorPop {
                                        0% {
                                            transform: scale(0.8);
                                        }
                                        55% {
                                            transform: scale(1.18);
                                        }
                                        100% {
                                            transform: scale(1);
                                        }
                                    }
                                `}</style>
                            </div>
                        )}

                        {/* STEP 2 — Thông tin đặt áo */}
                        {step === 2 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="font-bold text-gray-900">
                                        2. Thông tin đặt áo
                                    </h2>
                                </div>

                                {selectedType && (
                                    <div className="flex items-center gap-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                                            {getTypeImage(selectedType, current.color_id) ? (
                                                <img
                                                    src={
                                                        getTypeImage(
                                                            selectedType,
                                                            current.color_id,
                                                        ) as string
                                                    }
                                                    className="w-full h-full object-contain"
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="text-3xl">👕</span>
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-gray-900">
                                                {selectedType.name}
                                            </p>
                                            <p className="text-blue-600 font-bold text-xs">
                                                {formatCurrency(selectedType.price_per_shirt ?? 0)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Người mua
                                        </label>
                                        <input
                                            className="input-field"
                                            placeholder="Họ và tên"
                                            value={buyerName}
                                            onChange={(e) => setBuyerName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            SĐT
                                        </label>
                                        <input
                                            className="input-field"
                                            placeholder="09xxxxxxxx"
                                            value={buyerPhone}
                                            onChange={(e) => setBuyerPhone(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Giới tính
                                        </label>
                                        <CustomSelect
                                            value={buyerGender}
                                            onChange={setBuyerGender}
                                            options={GENDER_OPTIONS}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Trình
                                        </label>
                                        <CustomSelect
                                            value={buyerLevel}
                                            onChange={setBuyerLevel}
                                            options={LEVEL_OPTIONS}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Nickname
                                        </label>
                                        <input
                                            className="input-field"
                                            placeholder="Nickname CLB"
                                            value={buyerNickname}
                                            onChange={(e) => setBuyerNickname(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Form áo
                                        </label>
                                        <div className="flex items-center gap-4 h-[42px]">
                                            {FORM_OPTIONS.filter(
                                                (o) =>
                                                    selectedType?.available_sizes?.[o.value]?.length >
                                                    0,
                                            ).map((o) => (
                                                <label
                                                    key={o.value}
                                                    className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="form"
                                                        checked={current.gender === o.value}
                                                        onChange={() =>
                                                            setCurrent((c) => ({
                                                                ...c,
                                                                gender: o.value as any,
                                                                size: "",
                                                            }))
                                                        }
                                                        className="accent-blue-600"
                                                    />
                                                    {o.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Size áo
                                        </label>
                                        <CustomSelect
                                            value={current.size}
                                            onChange={(v) => setCurrent((c) => ({ ...c, size: v }))}
                                            options={availableSizes.map((s) => ({
                                                value: s,
                                                label: s,
                                            }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Tên in sau lưng
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                className="input-field"
                                                placeholder="Tên in áo"
                                                value={current.print_name}
                                                onChange={(e) =>
                                                    setCurrent((c) => ({
                                                        ...c,
                                                        print_name: e.target.value,
                                                    }))
                                                }
                                            />
                                            <button
                                                onClick={handleGetNickname}
                                                className="px-3 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold whitespace-nowrap hover:bg-blue-50 transition-colors"
                                            >
                                                Lấy nickname
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Số áo
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                className="input-field"
                                                placeholder="VD: 08"
                                                value={current.jersey_number}
                                                onChange={(e) => {
                                                    setCurrent((c) => ({
                                                        ...c,
                                                        jersey_number: e.target.value,
                                                    }));
                                                    setCheckResult(null);
                                                }}
                                            />
                                            <button
                                                onClick={handleCheckJerseyNumber}
                                                disabled={checking}
                                                className="px-3 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold whitespace-nowrap hover:bg-blue-50 transition-colors disabled:opacity-50"
                                            >
                                                {checking ? "..." : "Kiểm tra"}
                                            </button>
                                        </div>
                                        {checkResult && (
                                            <p
                                                className={`text-xs mt-1.5 flex items-center gap-1 ${checkResult.available
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                                    }`}
                                            >
                                                {checkResult.available ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <XCircle className="w-3.5 h-3.5" />
                                                )}
                                                {checkResult.available
                                                    ? "Số áo này chưa có ai sử dụng"
                                                    : "Số áo này đã có người sử dụng"}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                            Số lượng
                                        </label>
                                        <div className="flex items-center gap-2 h-[42px]">
                                            <button
                                                onClick={() =>
                                                    setCurrent((c) => ({
                                                        ...c,
                                                        quantity: Math.max(1, c.quantity - 1),
                                                    }))
                                                }
                                                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-8 text-center font-semibold">
                                                {current.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setCurrent((c) => ({
                                                        ...c,
                                                        quantity: c.quantity + 1,
                                                    }))
                                                }
                                                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                        Ghi chú cho đơn hàng (nếu có)
                                    </label>
                                    <textarea
                                        rows={3}
                                        maxLength={300}
                                        className="input-field w-full resize-none"
                                        placeholder="Nhập ghi chú của bạn..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                    <p className="text-[11px] text-gray-300 text-right mt-1">
                                        {notes.length}/300
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                                    <button
                                        onClick={handleAddAnotherFromStep2}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Thêm sản phẩm khác
                                    </button>
                                    <button
                                        onClick={handleContinueToReview}
                                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                                    >
                                        Tiếp tục
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 — Xác nhận */}
                        {step === 3 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="font-bold text-gray-900">
                                        3. Xác nhận sản phẩm đặt áo
                                    </h2>
                                </div>

                                <div className="space-y-2">
                                    {cart.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-6">
                                            Chưa có áo nào trong đơn.
                                        </p>
                                    )}
                                    {cart.map((item) => {
                                        const type = shirtTypes.find(
                                            (t) => t.id === item.shirt_type_id,
                                        );
                                        const color = type?.colors?.find(
                                            (c: any) => c.id === item.color_id,
                                        );
                                        return (
                                            <div
                                                key={item.localId}
                                                className="flex items-start gap-3 bg-gray-50 rounded-xl p-3"
                                            >
                                                <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {getTypeImage(type, item.color_id) ? (
                                                        <img
                                                            src={
                                                                getTypeImage(type, item.color_id) as string
                                                            }
                                                            className="w-full h-full object-cover"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <span className="text-2xl">👕</span>
                                                    )}
                                                </div>
                                                <div className="text-xs space-y-0.5 flex-1">
                                                    <p className="font-semibold text-gray-900 text-sm">
                                                        {type?.name}
                                                        {color?.name ? ` - ${color.name}` : ""}
                                                    </p>
                                                    <p className="text-gray-500">
                                                        {item.gender === "nam"
                                                            ? "Nam"
                                                            : item.gender === "nu"
                                                                ? "Nữ"
                                                                : "Oversize"}{" "}
                                                        - Size {item.size}
                                                    </p>
                                                    {item.print_name && (
                                                        <p className="text-gray-500">
                                                            Tên in: {item.print_name}
                                                        </p>
                                                    )}
                                                    {item.jersey_number && (
                                                        <p className="text-gray-500">
                                                            Số áo: {item.jersey_number}
                                                        </p>
                                                    )}
                                                    <p className="text-gray-500">
                                                        Số lượng: {item.quantity}
                                                    </p>
                                                    <p className="text-blue-600 font-bold">
                                                        {formatCurrency(priceFor(item))}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveFromCart(item.localId)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Chọn thêm áo
                                </button>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleGoToPayment}
                                        disabled={cart.length === 0}
                                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Tiếp tục thanh toán
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <h2 className="font-bold text-gray-900">4. Thanh toán</h2>
                                </div>

                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setPaymentMethod("transfer")}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${paymentMethod === "transfer"
                                            ? "bg-white shadow-sm text-blue-600"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Chuyển khoản
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod("cash")}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${paymentMethod === "cash"
                                            ? "bg-white shadow-sm text-blue-600"
                                            : "text-gray-500"
                                            }`}
                                    >
                                        Tiền mặt
                                    </button>
                                </div>

                                {paymentMethod === "transfer" && bankInfo && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                            {bankInfo.bank_name ?? "Ngân hàng"}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Số tài khoản</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        bankInfo.account_number,
                                                    );
                                                    toast.success("Đã sao chép");
                                                }}
                                                className="flex items-center gap-1 font-semibold text-gray-900"
                                            >
                                                {bankInfo.account_number}
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Tên tài khoản</span>
                                            <span className="font-semibold text-gray-900">
                                                {bankInfo.account_name}
                                            </span>
                                        </div>
                                        {qrUrl && (
                                            <div className="flex justify-center py-2">
                                                <img
                                                    src={qrUrl}
                                                    alt="QR chuyển khoản"
                                                    className="w-44 h-44 rounded-lg border border-gray-100"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-500">Nội dung CK</span>
                                            <button
                                                onClick={() => {
                                                    const ref = `DATAOA ${activityId
                                                        .slice(0, 8)
                                                        .toUpperCase()}`;
                                                    navigator.clipboard.writeText(ref);
                                                    toast.success("Đã sao chép");
                                                }}
                                                className="flex items-center gap-1 font-semibold text-gray-900"
                                            >
                                                DATAOA {activityId.slice(0, 8).toUpperCase()}
                                                <Copy className="w-3 h-3 text-gray-400" />
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-gray-400">
                                            Vui lòng nhập đúng nội dung để được xác nhận thanh toán
                                            nhanh nhất
                                        </p>

                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 mb-1.5">
                                                Ảnh chuyển khoản
                                            </p>
                                            <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-5 cursor-pointer hover:border-blue-300 transition-colors">
                                                {proofPreview ? (
                                                    <img
                                                        src={proofPreview}
                                                        className="max-h-32 rounded-lg"
                                                        alt=""
                                                    />
                                                ) : (
                                                    <>
                                                        <UploadCloud className="w-6 h-6 text-gray-300" />
                                                        <span className="text-xs text-gray-400">
                                                            Tải lên ảnh chuyển khoản
                                                        </span>
                                                        <span className="text-[10px] text-gray-300">
                                                            JPG, PNG tối đa 5MB
                                                        </span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        handleProofChange(e.target.files?.[0] ?? null)
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === "transfer" && !bankInfo && (
                                    <p className="text-xs text-gray-400">
                                        BTC chưa cấu hình thông tin chuyển khoản cho hoạt động
                                        này. Vui lòng liên hệ BTC hoặc chọn thanh toán tiền mặt.
                                    </p>
                                )}

                                {paymentMethod === "cash" && (
                                    <p className="text-xs text-gray-400">
                                        Bạn sẽ thanh toán trực tiếp bằng tiền mặt khi nhận áo.
                                        BTC sẽ liên hệ xác nhận đơn hàng.
                                    </p>
                                )}

                                <label className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                                    <input
                                        type="checkbox"
                                        checked={agree}
                                        onChange={(e) => setAgree(e.target.checked)}
                                        className="accent-blue-600"
                                    />
                                    Tôi đã kiểm tra kỹ thông tin đơn hàng
                                </label>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || uploadingProof}
                                    className="w-full px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 disabled:opacity-50 transition-colors"
                                >
                                    {submitting || uploadingProof
                                        ? "Đang xử lý..."
                                        : "Xác nhận đặt áo"}
                                </button>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 mt-2">
                                    <div className="text-xs text-gray-500 pt-4">
                                        Cần hỗ trợ? Liên hệ BTC qua Zalo hoặc SĐT:{" "}
                                        {bankInfo?.support_phone ?? "—"}
                                    </div>
                                    <div className="text-xs text-gray-500 pt-4">
                                        Thời gian hỗ trợ: 8:00 - 22:00 (Tất cả các ngày)
                                    </div>
                                    <div className="text-xs text-gray-500 pt-4">
                                        Lưu ý: Đơn đã xác nhận thanh toán sẽ không thể sửa
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <h3 className="font-bold text-gray-900 mb-3">Đơn hàng của bạn</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {cart.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">
                                        Chưa có áo nào trong đơn.
                                    </p>
                                )}
                                {cart.map((item) => {
                                    const type = shirtTypes.find(
                                        (t) => t.id === item.shirt_type_id,
                                    );
                                    return (
                                        <div
                                            key={item.localId}
                                            className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl p-3"
                                        >
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-semibold text-gray-900">
                                                    {type?.name}
                                                </p>
                                                <p className="text-gray-500">
                                                    {item.gender === "nam"
                                                        ? "Nam"
                                                        : item.gender === "nu"
                                                            ? "Nữ"
                                                            : "Oversize"}{" "}
                                                    - {item.size}
                                                </p>
                                                <p className="text-gray-500">
                                                    Số lượng: {item.quantity}
                                                </p>
                                                <p className="text-blue-600 font-bold">
                                                    {formatCurrency(priceFor(item))}
                                                </p>
                                            </div>
                                            {step === 3 && (
                                                <button
                                                    onClick={() => handleRemoveFromCart(item.localId)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                            <h3 className="font-bold text-gray-900 mb-1">
                                Tóm tắt đơn hàng
                            </h3>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tạm tính</span>
                                <span className="text-gray-800">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">In tên (miễn phí)</span>
                                <span className="text-gray-800">0đ</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">In số (miễn phí)</span>
                                <span className="text-gray-800">0đ</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Phí vận chuyển</span>
                                <span className="text-gray-800">
                                    {formatCurrency(shippingFee)}
                                </span>
                            </div>
                            <hr className="border-gray-100" />
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-900">Tổng cộng</span>
                                <span className="text-lg font-bold text-red-500">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                            {shippingFee > 0 && (
                                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Miễn phí ship cho đơn hàng từ{" "}
                                    {formatCurrency(FREE_SHIP_THRESHOLD)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {lightboxOpen &&
                    getTypeImage(selectedType, current.color_id) && createPortal(
                        <ImageLightbox
                            src={getTypeImage(selectedType, current.color_id) as string}
                            onClose={() => setLightboxOpen(false)}
                        />,
                        document.body,
                    )}
            </div>
        </div>
    );
}
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
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { guestShirtOrderApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

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

function Stepper() {
    const steps = [
        "Chọn sản phẩm",
        "Thông tin & tuỳ chọn",
        "Thanh toán",
        "Xác nhận",
    ];
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-shrink-0">
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${i === 0
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-400"
                            }`}
                    >
                        <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i === 0 ? "bg-white text-blue-600" : "bg-gray-200"
                                }`}
                        >
                            {i + 1}
                        </span>
                        {s}
                    </div>
                    {i < steps.length - 1 && (
                        <div className="w-6 h-px bg-gray-200 flex-shrink-0" />
                    )}
                </div>
            ))}
        </div>
    );
}

function ImageLightbox({
    src,
    onClose,
}: {
    src: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
                ✕
            </button>
            <img
                src={src}
                alt=""
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
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

    const handleAddToCart = () => {
        const err = validateCurrentItem();
        if (err) {
            toast.error(err);
            return;
        }
        setCart((prev) => [...prev, current]);
        toast.success("Đã thêm áo vào đơn hàng");
        resetCurrentItem();
    };

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

                <Stepper />

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                    {/* LEFT */}
                    <div className="space-y-5 min-w-0">
                        {/* 1. Chọn mẫu áo */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h2 className="font-bold text-gray-900 mb-3">1. Chọn mẫu áo</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {shirtTypes.map((t) => (
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
                                        className={`relative rounded-xl border-2 p-3 text-left transition-colors ${current.shirt_type_id === t.id
                                            ? "border-blue-500 bg-blue-50/40"
                                            : "border-gray-100 hover:border-gray-200"
                                            }`}
                                    >
                                        {current.shirt_type_id === t.id && (
                                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        <div className="aspect-square rounded-lg bg-gray-50 mb-2 overflow-hidden flex items-center justify-center">
                                            {getTypeImage(t) ? (
                                                <img
                                                    src={getTypeImage(t) as string}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                            ) : (
                                                <span className="text-3xl">👕</span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {t.name}
                                        </p>
                                        <p className="text-sm text-blue-600 font-bold">
                                            {formatCurrency(t.price_per_shirt ?? 0)}
                                        </p>
                                        {t.colors?.length > 0 && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {t.colors.length} màu
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {selectedType?.colors?.length > 0 && (
                                <div className="mt-4">
                                    {getTypeImage(selectedType, current.color_id) && (
                                        <button
                                            type="button"
                                            onClick={() => setLightboxOpen(true)}
                                            className="w-full aspect-[4/3] max-h-72 rounded-xl bg-gray-50 overflow-hidden mb-3 flex items-center justify-center border border-gray-100 cursor-zoom-in hover:opacity-95 transition-opacity"
                                        >
                                            <img
                                                src={
                                                    getTypeImage(
                                                        selectedType,
                                                        current.color_id,
                                                    ) as string
                                                }
                                                alt=""
                                                className="w-full h-full object-contain"
                                            />
                                        </button>
                                    )}
                                    <p className="text-sm text-gray-500 mb-2">
                                        Màu sắc: {selectedType.name}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {selectedType.colors.map((c: any) => {
                                            const hex = getColorHex(c.name);
                                            const thumb = imgSrc(c.images?.[0]);
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() =>
                                                        setCurrent((cur) => ({ ...cur, color_id: c.id }))
                                                    }
                                                    title={c.name}
                                                    className={`flex flex-col items-center gap-1 group`}
                                                >
                                                    <span
                                                        className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-gray-50 ${current.color_id === c.id
                                                            ? "border-blue-500"
                                                            : "border-gray-200 group-hover:border-gray-300"
                                                            }`}
                                                    >
                                                        {thumb ? (
                                                            <img
                                                                src={thumb}
                                                                alt={c.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : hex ? (
                                                            <span
                                                                className="w-full h-full"
                                                                style={{ background: hex }}
                                                            />
                                                        ) : (
                                                            <span className="text-lg">👕</span>
                                                        )}
                                                        {current.color_id === c.id && (
                                                            <span className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                                                <CheckCircle2 className="w-4 h-4 text-blue-600 drop-shadow" />
                                                            </span>
                                                        )}
                                                        {hex && thumb && (
                                                            <span
                                                                className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-white"
                                                                style={{ background: hex }}
                                                                title={c.name}
                                                            />
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`text-[11px] max-w-[56px] truncate ${current.color_id === c.id
                                                            ? "text-blue-600 font-semibold"
                                                            : "text-gray-500"
                                                            }`}
                                                    >
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Thông tin đặt áo */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                            <h2 className="font-bold text-gray-900">2. Thông tin đặt áo</h2>

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
                                        Mẫu áo
                                    </label>
                                    <CustomSelect
                                        value={current.shirt_type_id}
                                        onChange={(v) =>
                                            setCurrent((c) => {
                                                const nt = shirtTypes.find((t) => t.id === v);
                                                return {
                                                    ...c,
                                                    shirt_type_id: v,
                                                    color_id: nt?.colors?.[0]?.id,
                                                    size: "",
                                                };
                                            })
                                        }
                                        options={shirtTypes.map((t) => ({
                                            value: t.id,
                                            label: t.name,
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                        Form áo
                                    </label>
                                    <div className="flex items-center gap-4 h-[42px]">
                                        {FORM_OPTIONS.filter(
                                            (o) =>
                                                selectedType?.available_sizes?.[o.value]?.length > 0,
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
                                                setCurrent((c) => ({ ...c, quantity: c.quantity + 1 }))
                                            }
                                            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Thêm áo khác
                            </button>

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
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="space-y-4">
                        {/* Order summary */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <h3 className="font-bold text-gray-900 mb-3">Đơn hàng của bạn</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {cart.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">
                                        Chưa có áo nào trong đơn. Điền thông tin bên trái rồi bấm
                                        "Thêm áo khác", hoặc bấm Xác nhận để đặt áo hiện tại.
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
                                onClick={() => {
                                    const err = validateCurrentItem();
                                    if (err) {
                                        toast.error(err);
                                        return;
                                    }
                                    handleAddToCart();
                                }}
                                className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm khác
                            </button>
                        </div>

                        {/* Totals */}
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

                        {/* Payment */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                            <h3 className="font-bold text-gray-900">Thanh toán</h3>
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
                                    BTC chưa cấu hình thông tin chuyển khoản cho hoạt động này.
                                    Vui lòng liên hệ BTC hoặc chọn thanh toán tiền mặt.
                                </p>
                            )}

                            {paymentMethod === "cash" && (
                                <p className="text-xs text-gray-400">
                                    Bạn sẽ thanh toán trực tiếp bằng tiền mặt khi nhận áo. BTC
                                    sẽ liên hệ xác nhận đơn hàng.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
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
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 disabled:opacity-50 transition-colors"
                    >
                        {submitting || uploadingProof
                            ? "Đang xử lý..."
                            : "Xác nhận đặt áo"}
                    </button>
                </div>

                {/* Support footer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-4">
                        Cần hỗ trợ? Liên hệ BTC qua Zalo hoặc SĐT: {bankInfo?.support_phone ?? "—"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-4">
                        Thời gian hỗ trợ: 8:00 - 22:00 (Tất cả các ngày)
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-4">
                        Lưu ý: Đơn đã xác nhận thanh toán sẽ không thể sửa
                    </div>
                </div>
                {lightboxOpen &&
                    getTypeImage(selectedType, current.color_id) && (
                        <ImageLightbox
                            src={getTypeImage(selectedType, current.color_id) as string}
                            onClose={() => setLightboxOpen(false)}
                        />
                    )}
            </div>
        </div>
    );
}
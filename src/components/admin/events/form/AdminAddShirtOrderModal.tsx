
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    Loader2,
    Search,
    UserPlus,
    X,
    Wallet,
    Landmark,
    Banknote,
    ZoomIn,
    ShoppingCart,
    Trash2,
    Plus,
    ArrowLeft,
} from "lucide-react";
import { eventsAdminApi, membersAdminApi } from "@/lib/api";
import { notifyWalletChanged } from "@/lib/wallet-events";

const COLOR_SWATCH_MAP: Record<string, string> = {
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

function getSwatchColor(name?: string): string | null {
    if (!name) return null;
    const normalized = name.trim().toLowerCase();
    if (COLOR_SWATCH_MAP[normalized]) return COLOR_SWATCH_MAP[normalized];
    const matchedKey = Object.keys(COLOR_SWATCH_MAP)
        .filter((key) => normalized.includes(key))
        .sort((a, b) => b.length - a.length)[0];
    return matchedKey ? COLOR_SWATCH_MAP[matchedKey] : null;
}

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

type Mode = "member" | "guest";
type PaymentChoice = "none" | "wallet" | "transfer" | "cash";

interface CartItem {
    cart_id: string;
    shirt_type_id: string;
    shirt_type_name: string;
    color_id?: string;
    color_name?: string;
    gender: "nam" | "nu";
    size: string;
    quantity: number;
    jersey_number?: string;
    print_name?: string;
    unit_price: number;
}

interface AdminAddShirtOrderModalProps {
    activityId: string;
    activity: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AdminAddShirtOrderModal({
    activityId,
    activity,
    onSuccess,
    onCancel,
}: AdminAddShirtOrderModalProps) {
    const shirtTypes: any[] = activity?.detail?.shirt_types ?? [];

    const [mode, setMode] = useState<Mode>("member");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");

    const [shirtTypeId, setShirtTypeId] = useState(shirtTypes[0]?.id ?? "");
    const [colorId, setColorId] = useState<string | null>(
        shirtTypes[0]?.colors?.[0]?.id ?? null,
    );
    const [gender, setGender] = useState<"nam" | "nu">("nam");
    const [size, setSize] = useState("");
    const [quantity, setQuantity] = useState<number | "">(1);
    const [jerseyNumber, setJerseyNumber] = useState("");
    const [printName, setPrintName] = useState("");

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxVisible, setLightboxVisible] = useState(false);

    // ── Giỏ hàng (bên phải) ──
    const [cart, setCart] = useState<CartItem[]>([]);

    // ── Hiển thị/animation cột giỏ hàng ──
    const [cartPanelMounted, setCartPanelMounted] = useState(false);
    const [cartPanelVisible, setCartPanelVisible] = useState(false);

    // ── Bước thanh toán ──
    const [step, setStep] = useState<"build" | "payment">("build");
    const [payment, setPayment] = useState<PaymentChoice>("none");
    const [submitting, setSubmitting] = useState(false);

    const selectedType = shirtTypes.find((t: any) => t.id === shirtTypeId);
    const colors: any[] = selectedType?.colors ?? [];
    const selectedColor =
        colors.find((c: any) => c.id === colorId) ?? colors[0] ?? null;

    const imgSrc = (img: any) => (img ? (typeof img === "string" ? img : img.url) : null);
    const colorImage = imgSrc(selectedColor?.images?.[0]);

    const sizes: string[] = selectedType?.available_sizes?.[gender] ?? [];
    const price = selectedType?.price_per_shirt ?? 0;
    const lineTotal = price * (Number(quantity) || 0);

    useEffect(() => {
        setSize("");
        setColorId(selectedType?.colors?.[0]?.id ?? null);
    }, [shirtTypeId, gender]);

    useEffect(() => {
        if (mode === "guest" && payment === "wallet") setPayment("none");
        if (mode === "member" && payment === "cash") setPayment("none");
    }, [mode]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(query.trim());
                setResults(data ?? []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        if (cart.length > 0) {
            setCartPanelMounted(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setCartPanelVisible(true)));
        } else {
            setCartPanelVisible(false);
            const t = setTimeout(() => setCartPanelMounted(false), 300);
            return () => clearTimeout(t);
        }
    }, [cart.length]);

    const personLabel = mode === "member" ? selectedMember?.full_name : guestName.trim();
    const hasPerson = mode === "member" ? !!selectedMember : !!guestName.trim();

    const canAddToCart = !!shirtTypeId && !!size && hasPerson;

    const openLightbox = () => {
        if (!colorImage) return;
        setLightboxOpen(true);
        requestAnimationFrame(() => setLightboxVisible(true));
    };
    const closeLightbox = () => {
        setLightboxVisible(false);
        setTimeout(() => setLightboxOpen(false), 200);
    };

    const handleAddToCart = () => {
        if (!hasPerson) {
            toast.error(
                mode === "member" ? "Vui lòng chọn thành viên trước" : "Vui lòng nhập họ tên khách trước",
            );
            return;
        }
        if (!shirtTypeId || !size) {
            toast.error("Vui lòng chọn loại áo và size");
            return;
        }

        const newQty = Number(quantity) || 1;
        const jersey = jerseyNumber.trim() || undefined;
        const print = printName.trim() || undefined;

        setCart((prev) => {
            const existingIdx = prev.findIndex(
                (c) =>
                    c.shirt_type_id === shirtTypeId &&
                    c.color_id === (colorId ?? undefined) &&
                    c.gender === gender &&
                    c.size === size &&
                    c.jersey_number === jersey &&
                    c.print_name === print,
            );

            if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    quantity: updated[existingIdx].quantity + newQty,
                };
                return updated;
            }

            const item: CartItem = {
                cart_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                shirt_type_id: shirtTypeId,
                shirt_type_name: selectedType?.name ?? "—",
                color_id: colorId ?? undefined,
                color_name: selectedColor?.name,
                gender,
                size,
                quantity: newQty,
                jersey_number: jersey,
                print_name: print,
                unit_price: price,
            };
            return [...prev, item];
        });

        toast.success("Đã thêm vào đơn");
        setSize("");
        setQuantity(1);
        setJerseyNumber("");
        setPrintName("");
    };

    const removeCartItem = (cartId: string) => {
        setCart((prev) => prev.filter((c) => c.cart_id !== cartId));
    };

    const cartTotal = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);

    const goToPayment = () => {
        if (cart.length === 0) {
            toast.error("Giỏ hàng đang trống");
            return;
        }
        if (!hasPerson) {
            toast.error(
                mode === "member" ? "Vui lòng chọn thành viên" : "Vui lòng nhập họ tên khách",
            );
            return;
        }
        setStep("payment");
    };

    const backToBuild = () => setStep("build");

    const handleSubmitOrder = async () => {
        if (submitting) return;
        setSubmitting(true);

        try {
            await eventsAdminApi.adminAddShirtOrderRegistrationBatch(activityId, {
                user_id: mode === "member" ? selectedMember?.id : undefined,
                guest_full_name: mode === "guest" ? guestName.trim() : undefined,
                guest_phone: mode === "guest" ? guestPhone.trim() || undefined : undefined,
                items: cart.map((item) => ({
                    shirt_type_id: item.shirt_type_id,
                    color_id: item.color_id,
                    gender: item.gender,
                    size: item.size,
                    quantity: item.quantity,
                    jersey_number: item.jersey_number,
                    print_name: item.print_name,
                })),
                payment_method: payment === "none" ? undefined : payment,
            });

            toast.success(`Đã thêm ${cart.length} sản phẩm vào đơn hàng`);

            if (payment === "wallet") {
                notifyWalletChanged();
            }

            onSuccess();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    const groupedCart = useMemo(() => {
        type CartGroup = {
            key: string;
            shirt_type_name: string;
            color_name?: string;
            gender: "nam" | "nu";
            size: string;
            items: CartItem[];
        };
        const groups = new Map<string, CartGroup>();

        for (const item of cart) {
            const key = `${item.shirt_type_id}|${item.color_id ?? ""}|${item.gender}|${item.size}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    shirt_type_name: item.shirt_type_name,
                    color_name: item.color_name,
                    gender: item.gender,
                    size: item.size,
                    items: [],
                });
            }
            groups.get(key)!.items.push(item);
        }
        return Array.from(groups.values());
    }, [cart]);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between pr-8 mb-5">
                <div className="flex items-center gap-2">
                    {step === "payment" && (
                        <button
                            type="button"
                            onClick={backToBuild}
                            className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-[var(--primary)]" />
                            {step === "build" ? "Thêm đăng ký" : "Chọn phương thức thanh toán"}
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                            {activity?.emoji} {activity?.title}
                        </p>
                    </div>
                </div>
            </div>

            {step === "build" ? (
                <div
                    className={`grid grid-cols-1 gap-6 transition-[grid-template-columns] duration-300 ease-out ${cartPanelMounted ? "lg:grid-cols-[1fr_360px]" : ""
                        }`}
                >
                    <div
                        className={`space-y-5 min-w-0 transition-all duration-300 ${!cartPanelMounted ? "max-w-2xl mx-auto w-full" : ""
                            }`}
                    >
                        <div className="grid grid-cols-2 gap-2 bg-[var(--surface-muted)] rounded-xl p-1">
                            <button
                                type="button"
                                onClick={() => setMode("member")}
                                className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "member" ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
                                    }`}
                            >
                                Thành viên CLB
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("guest")}
                                className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "guest" ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
                                    }`}
                            >
                                Khách
                            </button>
                        </div>

                        {mode === "member" ? (
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-[var(--text-muted)]">
                                    Tìm thành viên
                                </label>
                                {selectedMember ? (
                                    <div className="flex items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] px-3 py-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center font-semibold text-[var(--primary)] overflow-hidden flex-shrink-0">
                                                {selectedMember.avatar_url ? (
                                                    <img
                                                        src={selectedMember.avatar_url}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    selectedMember.full_name?.[0]
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[var(--text)] truncate">
                                                    {selectedMember.full_name}
                                                </p>
                                                {selectedMember.phone && (
                                                    <p className="text-xs text-[var(--text-muted)]">{selectedMember.phone}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedMember(null);
                                                setQuery("");
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-[var(--primary-soft)] text-[var(--primary)] flex-shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Nhập tên hoặc SĐT..."
                                            className="input-field pl-9"
                                        />
                                        {(searching || results.length > 0) && query && (
                                            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                                                {searching ? (
                                                    <div className="flex items-center justify-center py-4 text-[var(--text-faint)] text-sm gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm...
                                                    </div>
                                                ) : (
                                                    results.map((m: any) => (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedMember(m);
                                                                setResults([]);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--surface-hover)] text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center font-semibold text-[var(--text-muted)] overflow-hidden flex-shrink-0">
                                                                {m.avatar_url ? (
                                                                    <img
                                                                        src={m.avatar_url}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    m.full_name?.[0]
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-[var(--text)] truncate">
                                                                    {m.full_name}
                                                                </p>
                                                                {m.phone && (
                                                                    <p className="text-xs text-[var(--text-faint)]">{m.phone}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                                        Họ tên khách
                                    </label>
                                    <input
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Nguyễn Văn A"
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                                        SĐT (tuỳ chọn)
                                    </label>
                                    <input
                                        value={guestPhone}
                                        onChange={(e) => setGuestPhone(e.target.value)}
                                        placeholder="09xxxxxxxx"
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="h-px bg-[var(--surface-muted)]" />

                        {/* ── Loại áo ── */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                Loại áo
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {shirtTypes.map((t: any) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setShirtTypeId(t.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${shirtTypeId === t.id
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                            }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Màu sắc: ảnh lớn + swatch nhỏ gọn ── */}
                        {colors.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                                    Màu sắc {selectedColor && <span className="text-[var(--text-faint)] font-normal">— {selectedColor.name}</span>}
                                </label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={openLightbox}
                                        disabled={!colorImage}
                                        className="relative w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] flex-shrink-0 group disabled:cursor-default"
                                    >
                                        {colorImage ? (
                                            <>
                                                <img
                                                    src={colorImage}
                                                    alt={selectedColor?.name ?? ""}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="w-full h-full flex items-center justify-center text-xs text-[var(--text-faint)]">
                                                Không có ảnh
                                            </span>
                                        )}
                                    </button>

                                    <div className="flex flex-wrap content-start gap-2.5">
                                        {colors.map((c: any) => {
                                            const swatchColor = getSwatchColor(c.name);
                                            const isActive = colorId === c.id;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setColorId(c.id)}
                                                    className="flex flex-col items-center gap-1 w-12"
                                                >
                                                    <span
                                                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${isActive
                                                            ? "ring-2 ring-blue-500 ring-offset-2 scale-105"
                                                            : "ring-1 ring-gray-200 hover:ring-gray-300"
                                                            }`}
                                                        style={{
                                                            backgroundColor: swatchColor ?? "#e5e7eb",
                                                            border: swatchColor === "#ffffff" ? "1px solid #e5e7eb" : "none",
                                                        }}
                                                    >
                                                        {!swatchColor && (
                                                            <span className="text-[9px] font-semibold text-[var(--text-faint)]">?</span>
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-medium text-center leading-tight truncate w-full ${isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                                                            }`}
                                                    >
                                                        {c.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Giới tính + Số lượng (số lượng ngắn lại) ── */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                    Giới tính
                                </label>
                                <div className="flex gap-2">
                                    {(["nam", "nu"] as const).map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGender(g)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${gender === g
                                                ? g === "nu"
                                                    ? "bg-pink-600 text-white border-pink-600"
                                                    : "bg-blue-600 text-white border-blue-600"
                                                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                                }`}
                                        >
                                            {g === "nu" ? "Nữ" : "Nam"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="w-20 flex-shrink-0">
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                    SL
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setQuantity(val === "" ? "" : Number(val));
                                    }}
                                    onBlur={() => {
                                        if (quantity === "" || (quantity as number) < 1) setQuantity(1);
                                    }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="input-field text-center px-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                Size
                            </label>
                            {sizes.length === 0 ? (
                                <p className="text-sm text-[var(--text-faint)]">
                                    Chưa có size cho {gender === "nu" ? "Nữ" : "Nam"} ở loại áo này
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setSize(s)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${size === s
                                                ? "bg-gray-900 text-white border-gray-900"
                                                : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Số áo + Tên in ── */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                                    Số áo (tuỳ chọn)
                                </label>
                                <input
                                    value={jerseyNumber}
                                    onChange={(e) => setJerseyNumber(e.target.value)}
                                    maxLength={10}
                                    placeholder="VD: 09"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                                    Tên in trên áo (tuỳ chọn)
                                </label>
                                <input
                                    value={printName}
                                    onChange={(e) => setPrintName(e.target.value)}
                                    maxLength={50}
                                    placeholder="VD: MINH"
                                    className="input-field"
                                />
                            </div>
                        </div>

                        {price > 0 && (
                            <div className="flex items-center justify-between bg-[var(--surface-muted)] rounded-xl px-4 py-2.5 text-sm">
                                <span className="text-[var(--text-muted)]">Thành tiền sản phẩm này</span>
                                <span className="font-semibold text-[var(--text)]">{fmt(lineTotal)}</span>
                            </div>
                        )}

                        {!hasPerson && (
                            <p className="text-xs text-[var(--warning)] text-center -mt-2">
                                Vui lòng {mode === "member" ? "chọn thành viên" : "nhập tên khách"} trước khi thêm sản phẩm
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={!canAddToCart}
                            className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Thêm vào đơn
                        </button>

                        {!cartPanelMounted && (
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                >
                                    Huỷ
                                </button>
                            </div>
                        )}
                    </div>

                    {cartPanelMounted && (
                        <div
                            className={`flex flex-col lg:border-l lg:border-[var(--border)] lg:pl-6 transition-all duration-300 ease-out ${cartPanelVisible
                                ? "opacity-100 translate-y-0 lg:translate-x-0"
                                : "opacity-0 translate-y-3 lg:translate-y-0 lg:translate-x-4"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <ShoppingCart className="w-4 h-4 text-[var(--text-faint)]" />
                                <h3 className="text-sm font-bold text-[var(--text)]">
                                    Đơn hàng ({cart.length})
                                </h3>
                            </div>

                            {personLabel && (
                                <div className="text-xs text-[var(--text-muted)] mb-3 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] px-3 py-2">
                                    Đăng ký cho: <span className="font-semibold">{personLabel}</span>
                                </div>
                            )}

                            <div className="flex-1 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                                {groupedCart.map((group) => {
                                    const groupQty = group.items.reduce((s, it) => s + it.quantity, 0);
                                    const groupTotal = group.items.reduce(
                                        (s, it) => s + it.unit_price * it.quantity,
                                        0,
                                    );
                                    return (
                                        <div key={group.key} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                                                        {group.shirt_type_name}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {group.color_name ? `${group.color_name} · ` : ""}
                                                        {group.gender === "nu" ? "Nữ" : "Nam"} · Size {group.size} · SL {groupQty}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-semibold text-[var(--text)] flex-shrink-0">
                                                    {fmt(groupTotal)}
                                                </span>
                                            </div>

                                            <div className="space-y-1.5 pt-1.5 border-t border-[var(--border)]">
                                                {group.items.map((item) => (
                                                    <div
                                                        key={item.cart_id}
                                                        className="flex items-center justify-between gap-2 text-xs"
                                                    >
                                                        <span className="text-[var(--text-muted)] truncate">
                                                            {item.jersey_number || item.print_name ? (
                                                                <>
                                                                    {item.jersey_number && `Số ${item.jersey_number}`}
                                                                    {item.jersey_number && item.print_name && " · "}
                                                                    {item.print_name && `Tên "${item.print_name}"`}
                                                                    {" · SL "}
                                                                    {item.quantity}
                                                                </>
                                                            ) : (
                                                                `Không ghi số/tên · SL ${item.quantity}`
                                                            )}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCartItem(item.cart_id)}
                                                            className="p-1 -m-1 text-[var(--text-faint)] hover:text-[var(--danger)] flex-shrink-0"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Tổng cộng</span>
                                    <span className="text-xl font-bold text-[var(--text)]">{fmt(cartTotal)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                    >
                                        Huỷ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={goToPayment}
                                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                                    >
                                        Thanh toán
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ══════════ BƯỚC THANH TOÁN ══════════ */
                <div className="max-w-md mx-auto space-y-5">
                    <div className="rounded-xl bg-[var(--surface-muted)] p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Đăng ký cho</span>
                            <span className="font-semibold text-[var(--text)]">{personLabel}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Số sản phẩm</span>
                            <span className="font-semibold text-[var(--text)]">{cart.length}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                            <span className="text-sm text-[var(--text-muted)]">Tổng tiền</span>
                            <span className="text-lg font-bold text-[var(--text)]">{fmt(cartTotal)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                            Phương thức thanh toán
                        </label>

                        {mode === "member" ? (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPayment("wallet")}
                                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "wallet"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                        }`}
                                >
                                    <Wallet className="w-3.5 h-3.5" /> Trừ ví BNB
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayment("none")}
                                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "none"
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                        }`}
                                >
                                    Member tự chọn
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPayment("none")}
                                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "none"
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                        }`}
                                >
                                    Chưa thanh toán
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayment("cash")}
                                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "cash"
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                                        }`}
                                >
                                    <Banknote className="w-3.5 h-3.5" /> Tiền mặt
                                </button>
                            </div>
                        )}

                        {payment === "wallet" && mode === "member" && (
                            <p className="text-xs text-[var(--primary)] mt-2">
                                Số dư ví của thành viên sẽ bị trừ ngay cho toàn bộ đơn và ghi lại lịch sử giao dịch.
                            </p>
                        )}
                        {payment === "none" && mode === "member" && (
                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Đơn sẽ ở trạng thái chờ, thành viên tự vào app chọn Ví BNB / Chuyển khoản / Tiền mặt để thanh toán.
                            </p>
                        )}
                        {payment === "cash" && mode === "guest" && (
                            <p className="text-xs text-[var(--success)] mt-2">
                                Đơn sẽ ở trạng thái chờ xác nhận, vào bảng đăng ký và bấm "Xác nhận" khi đã nhận đủ tiền mặt.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={backToBuild}
                            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                        >
                            Quay lại
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitOrder}
                            disabled={submitting}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận đơn hàng
                        </button>
                    </div>
                </div>
            )}

            {lightboxOpen && colorImage && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
                    style={{
                        background: lightboxVisible ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0)",
                        transition: "background .2s ease",
                    }}
                    onClick={closeLightbox}
                >
                    <button
                        type="button"
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[color-mix(in_srgb,var(--surface)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--surface)_20%,transparent)] flex items-center justify-center text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={colorImage}
                        alt={selectedColor?.name ?? ""}
                        className="max-w-full max-h-full rounded-xl shadow-2xl"
                        style={{
                            transform: lightboxVisible ? "scale(1)" : "scale(0.92)",
                            opacity: lightboxVisible ? 1 : 0,
                            transition:
                                "transform .2s cubic-bezier(.34,1.56,.64,1), opacity .18s ease",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  BarChart3,
  Gift,
  Shirt,
  Trophy,
  Flame,
  Copy,
  Wallet,
  XIcon,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi, profileApi } from "@/lib/api";
import { createPortal } from "react-dom";

const TYPE_META: Record<string, { icon: any; label: string }> = {
  shirt_order: { icon: Shirt, label: "Đặt áo nhóm" },
  tournament: { icon: Trophy, label: "Giải nội bộ" },
  birthday: { icon: Gift, label: "Sinh nhật thành viên" },
  offline_event: { icon: Flame, label: "Offline / Giao lưu" },
  poll: { icon: BarChart3, label: "Bình chọn" },
};

function TournamentHeroCard({ activity }: { activity: any }) {
  return (
    <div className="rounded-[28px] overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-200/60">
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/40 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
          {activity.cover_image_url ? (
            <img
              src={activity.cover_image_url}
              className="w-full h-full object-cover"
            />
          ) : (
            (activity.emoji ?? "🏆")
          )}
        </div>
        <div className="min-w-0 pt-0.5">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-white bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
            Giải đấu chính thức
          </span>
          <p className="text-lg font-black leading-tight text-white truncate mt-1.5">
            {activity.title}
          </p>
        </div>
      </div>

      {(activity.event_date || activity.location) && (
        <div className="border-t border-white/20 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/85 bg-black/5">
          {activity.event_date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(
                new Date(activity.event_date),
                "EEEE, dd/MM/yyyy · HH:mm",
                { locale: vi },
              )}
            </span>
          )}
          {activity.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {activity.location}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<any>(null);
  const [myStatus, setMyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const fetchAll = async () => {
    try {
      const [{ data: a }, { data: s }] = await Promise.all([
        activitiesApi.get(id),
        activitiesApi.getMyStatus(id),
      ]);
      setActivity(a);
      setMyStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);



  const handleBack = () => {
    sessionStorage.setItem("activity:return-tab", "events");
    router.push("/activity");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FA]">
        <div
          className="sticky top-0 z-30"
          style={{
            background: "rgba(244,246,250,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            paddingTop: "env(safe-area-inset-top)",
          }}
        >
          <div className="max-w-lg lg:max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
          </div>
        </div>

        <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
          <div className="bg-white rounded-2xl h-40 animate-pulse" />
          <div className="bg-white rounded-2xl h-56 animate-pulse" />
        </div>
      </div>
    );
  }
  if (!activity) return null;

  const meta = TYPE_META[activity.type];
  const Icon = meta?.icon ?? CalendarDays;

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div
        className="sticky top-0 z-30"
        style={{
          background: "rgba(244,246,250,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="max-w-lg lg:max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-900 truncate flex-1">
            {activity.title}
          </h1>
          {activity.type === "shirt_order" && (
            <div
              id="shirt-cart-slot-desktop"
              className="hidden lg:flex items-center flex-shrink-0"
            />
          )}
        </div>
      </div>

      <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {activity.type === "tournament" ? (
          <TournamentHeroCard activity={activity} />
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                {activity.cover_image_url ? (
                  <img
                    src={activity.cover_image_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (activity.emoji ?? "📌")
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Icon className="w-3 h-3" /> {meta?.label}
                </p>
                <p className="font-bold text-gray-900 truncate">
                  {activity.title}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-gray-600 border-t border-gray-50 pt-3">
              {(activity.event_date || activity.deadline) && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>
                    {activity.deadline ? "Deadline: " : "Ngày diễn ra: "}
                    {format(
                      new Date(activity.deadline ?? activity.event_date),
                      "EEEE, dd/MM/yyyy HH:mm",
                      { locale: vi },
                    )}
                  </span>
                </div>
              )}
              {activity.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{activity.location}</span>
                </div>
              )}
            </div>

            {activity.description && (
              <p className="text-sm text-gray-500 border-t border-gray-50 pt-3 whitespace-pre-line">
                {activity.description}
              </p>
            )}
          </div>
        )}

        {activity.type === "shirt_order" && (
          <ShirtOrderSection
            activity={activity}
            myStatus={myStatus}
            onChanged={fetchAll}
          />
        )}
        {activity.type === "tournament" && (
          <TournamentSection
            activity={activity}
            myStatus={myStatus}
            onChanged={fetchAll}
          />
        )}
        {activity.type === "offline_event" && (
          <OfflineEventSection
            activity={activity}
            myStatus={myStatus}
            onChanged={fetchAll}
          />
        )}
        {activity.type === "poll" && (
          <PollSection
            activity={activity}
            myStatus={myStatus}
            onChanged={fetchAll}
          />
        )}
        {activity.type === "birthday" && (
          <BirthdaySection myStatus={myStatus} />
        )}
      </div>
    </div>
  );
}

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

function colorSwatchFromName(name?: string) {
  if (!name) return "#9ca3af";
  const lower = name.toLowerCase();
  const keys = Object.keys(COLOR_SWATCH_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return COLOR_SWATCH_MAP[key];
  }
  return "#9ca3af";
}

function ShirtOrderSection({ activity, myStatus, onChanged }: any) {
  const shirtTypes: any[] = activity.detail?.shirt_types ?? [];
  const myRegistrations: any[] = myStatus?.my_registrations ?? [];
  const canRegister = activity.status === "open";
  const [desktopCartSlot, setDesktopCartSlot] = useState<HTMLElement | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    setDesktopCartSlot(document.getElementById("shirt-cart-slot-desktop"));
  }, []);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    shirtTypes[0]?.id ?? null,
  );
  const selectedType = shirtTypes.find((t) => t.id === selectedTypeId) ?? shirtTypes[0];

  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    selectedType?.colors?.[0]?.id ?? null,
  );

  const [selectedGender, setSelectedGender] = useState<"nam" | "nu">("nam");

  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  const [showPayPanel, setShowPayPanel] = useState(false);
  const [payPanelVisible, setPayPanelVisible] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);

  const [cartOpen, setCartOpen] = useState(false);

  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [confirmPanelVisible, setConfirmPanelVisible] = useState(false);
  const [payMethod, setPayMethod] = useState<"choose" | "wallet" | "transfer" | "cash">("choose");

  const [submittingPay, setSubmittingPay] = useState(false);

  const TRANSITION_MS = 280;

  type CartItem = {
    cart_id: string;
    shirt_type_id: string;
    shirt_type_name: string;
    color_id?: string | null;
    color_name?: string | null;
    image?: string | null;
    gender: "nam" | "nu";
    size: string;
    quantity: number;
    unit_price: number;
  };



  const regsForTypeGender = myRegistrations.filter(
    (r: any) => r.shirt_type_id === selectedType?.id && r.gender === selectedGender,
  );

  const lockedSizes = new Set(
    regsForTypeGender
      .filter((r: any) => r.payment_status === "confirmed" || !!r.payment_reference)
      .map((r: any) => r.size),
  );

  const openCart = () => {
    setCartOpen(true);
    requestAnimationFrame(() => setCartVisible(true));
  };

  const closeCart = () => {
    setCartVisible(false);
    setTimeout(() => setCartOpen(false), 250);
  };

  const cartSizesForCurrent = new Set(
    cart
      .filter(
        (c) =>
          c.shirt_type_id === selectedType?.id &&
          c.gender === selectedGender &&
          c.color_id === selectedColorId,
      )
      .map((c) => c.size),
  );

  useEffect(() => {
    setSizeQuantities({});
    setSelectedColorId(selectedType?.colors?.[0]?.id ?? null);
  }, [selectedType?.id, selectedGender]);

  const activeColor =
    (selectedType?.colors ?? []).find((c: any) => c.id === selectedColorId) ??
    selectedType?.colors?.[0];

  const activeColorImage = (() => {
    const img = activeColor?.images?.[0];
    return img ? (typeof img === "string" ? img : img.url) : null;
  })();

  const namSizes: string[] = selectedType?.available_sizes?.nam ?? [];
  const nuSizes: string[] = selectedType?.available_sizes?.nu ?? [];
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  const sortSizes = (arr: string[]) =>
    [...arr].sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  const sizesForGender = sortSizes(selectedGender === "nam" ? namSizes : nuSizes);

  const toggleSize = (s: string) => {
    if (lockedSizes.has(s)) return;
    setSizeQuantities((prev) => {
      const next = { ...prev };
      if (next[s] != null) {
        delete next[s];
      } else {
        next[s] = 1;
      }
      return next;
    });
  };

  const changeQty = (s: string, delta: number) => {
    setSizeQuantities((prev) => {
      const current = prev[s] ?? 1;
      const nextQty = Math.max(1, current + delta);
      return { ...prev, [s]: nextQty };
    });
  };

  const selectedSizeList = Object.keys(sizeQuantities);

  const handlePlaceOrder = async () => {
    if (!selectedType) return;
    if (selectedSizeList.length === 0) return toast.error("Vui lòng chọn ít nhất 1 size");

    setPlacingOrder(true);
    try {
      for (const s of selectedSizeList) {
        await activitiesApi.registerShirtOrder(activity.id, {
          shirt_type_id: selectedType.id,
          color_id: activeColor?.id ?? undefined,
          gender: selectedGender,
          size: s,
          quantity: sizeQuantities[s] < 1 ? 1 : sizeQuantities[s],
        });
      }
      toast.success(`Đã đặt hàng ${selectedSizeList.length} sản phẩm`);
      setSizeQuantities({});
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đặt hàng thất bại, vui lòng thử lại");
    } finally {
      setPlacingOrder(false);
    }
  };

  const changeCartQty = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cart_id === cartId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cart_id !== cartId));
  };

  const cartTotal = cart.reduce((s, item) => s + item.unit_price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    try {
      for (const item of cart) {
        await activitiesApi.registerShirtOrder(activity.id, {
          shirt_type_id: item.shirt_type_id,
          color_id: item.color_id ?? undefined,
          gender: item.gender,
          size: item.size,
          quantity: item.quantity,
        });
      }
      toast.success(`Đã đặt hàng ${cart.length} sản phẩm`);
      setCart([]);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đặt hàng thất bại, vui lòng thử lại");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCancel = async (reg: any) => {
    if (!confirm("Xoá sản phẩm này khỏi đơn hàng?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id, reg.id);
      toast.success("Đã xoá khỏi đơn hàng");
      onChanged();
    } catch { }
  };

  const openLightbox = (src: string) => {
    setLightboxSrc(src);
    requestAnimationFrame(() => setLightboxVisible(true));
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
    setTimeout(() => setLightboxSrc(null), 200);
  };

  const openCombinedPay = () => {
    closeCart();
    setTimeout(() => {
      setShowPayPanel(true);
      requestAnimationFrame(() => setPayPanelVisible(true));
    }, TRANSITION_MS);
  };

  const closePayPanel = () => {
    setPayPanelVisible(false);
    setTimeout(() => setShowPayPanel(false), TRANSITION_MS);
  };

  const selectPayMethod = (method: "wallet" | "transfer" | "cash") => {
    setPayPanelVisible(false);
    setTimeout(() => {
      setShowPayPanel(false);
      setPayMethod(method);
      setShowConfirmPanel(true);
      requestAnimationFrame(() => setConfirmPanelVisible(true));
    }, TRANSITION_MS);
  };

  const closeConfirmPanel = () => {
    setConfirmPanelVisible(false);
    setTimeout(() => setShowConfirmPanel(false), TRANSITION_MS);
  };

  const backToChooseMethod = () => {
    setConfirmPanelVisible(false);
    setTimeout(() => {
      setShowConfirmPanel(false);
      setShowPayPanel(true);
      requestAnimationFrame(() => setPayPanelVisible(true));
    }, TRANSITION_MS);
  };


  const priceOf = (r: any) => {
    const t = shirtTypes.find((x) => x.id === r.shirt_type_id);
    return (t?.price_per_shirt ?? 0) * (r.quantity ?? 1);
  };

  const subtotal = myRegistrations.reduce((s: number, r: any) => s + priceOf(r), 0);
  const grandTotal = cartTotal + subtotal;

  const unpaidRegs = myRegistrations.filter(
    (r: any) => r.payment_status !== "confirmed" && !r.payment_reference && priceOf(r) > 0,
  );
  const unpaidTotal = unpaidRegs.reduce((s: number, r: any) => s + priceOf(r), 0);



  const handlePayWalletAll = async () => {
    if (unpaidRegs.length === 0) return;
    setSubmittingPay(true);
    try {
      for (const reg of unpaidRegs) {
        await activitiesApi.payShirtOrder(activity.id, { registration_id: reg.id, method: "wallet" });
      }
      toast.success(`Đã thanh toán ${fmt(unpaidTotal)} từ ví cho ${unpaidRegs.length} sản phẩm`);
      closeConfirmPanel();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleConfirmTransferredAll = async (ref: string) => {
    if (unpaidRegs.length === 0) return;
    setSubmittingPay(true);
    try {
      for (const reg of unpaidRegs) {
        await activitiesApi.payShirtOrder(activity.id, { registration_id: reg.id, method: "transfer", payment_reference: ref });
      }
      toast.success("Đã ghi nhận chuyển khoản, chờ admin xác nhận!");
      closeConfirmPanel();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleRequestCashAll = async () => {
    if (unpaidRegs.length === 0) return;
    setSubmittingPay(true);
    try {
      for (const reg of unpaidRegs) {
        await activitiesApi.payShirtOrder(activity.id, { registration_id: reg.id, method: "cash" });
      }
      toast.success("Đã thông báo admin!");
      closeConfirmPanel();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  if (shirtTypes.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm text-center text-gray-400 text-sm">
        Chưa có loại áo nào được cấu hình
      </div>
    );
  }

  const totalCartCount = cart.length + myRegistrations.length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">1. Chọn mẫu áo</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {shirtTypes.map((type) => {
            const images: string[] = (type.colors ?? []).flatMap((c: any) =>
              (c.images ?? []).map((img: any) => (typeof img === "string" ? img : img.url)),
            );
            const active = selectedType?.id === type.id;
            const alreadyInCartOrOrder =
              cart.some((c) => c.shirt_type_id === type.id) ||
              myRegistrations.some((r: any) => r.shirt_type_id === type.id);
            const previewSrc = active ? (activeColorImage ?? images[0]) : images[0];

            return (
              <div
                key={type.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTypeId(type.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedTypeId(type.id)}
                className={`relative text-left rounded-2xl border-2 p-2 w-[104px] sm:w-[140px] lg:w-[160px] flex-shrink-0 transition-colors cursor-pointer ${active ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"
                  }`}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center z-10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                {alreadyInCartOrOrder && (
                  <span className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded-full z-10">
                    Đã chọn
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (previewSrc) openLightbox(previewSrc);
                  }}
                  className="w-full aspect-square rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center mb-2"
                >
                  {previewSrc ? (
                    <img src={previewSrc} className="w-full h-full object-cover" />
                  ) : (
                    <Shirt className="w-7 h-7 text-gray-300" />
                  )}
                </button>

                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{type.name}</p>
                {(type.price_per_shirt ?? 0) > 0 && (
                  <p className="text-[11px] sm:text-sm font-medium text-blue-600 mt-0.5">
                    {fmt(type.price_per_shirt)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {(selectedType?.colors ?? []).length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-2">Màu sắc</p>
            <div className="flex flex-wrap gap-3">
              {(selectedType.colors ?? []).map((c: any) => {
                const isActive = activeColor?.id === c.id;
                const swatch = colorSwatchFromName(c.name);
                const isLightSwatch =
                  swatch.toLowerCase() === "#ffffff" || swatch.toLowerCase() === "#eab308";

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColorId(c.id)}
                    className="flex flex-col items-center gap-1"
                    title={c.name}
                  >
                    <span
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                        }`}
                      style={{
                        backgroundColor: swatch,
                        boxShadow:
                          swatch.toLowerCase() === "#ffffff"
                            ? "inset 0 0 0 1px rgba(0,0,0,0.08)"
                            : undefined,
                      }}
                    >
                      {isActive && (
                        <CheckCircle2
                          className={`w-4 h-4 ${isLightSwatch ? "text-gray-700" : "text-white"}`}
                        />
                      )}
                    </span>
                    <span className="text-[10px] text-gray-500 max-w-[64px] truncate">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900">2. Thông tin đặt áo</h3>

        {!canRegister && regsForTypeGender.length === 0 && cart.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Đã đóng đăng ký</p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Giới tính
              </label>
              <div className="flex gap-2">
                {(["nam", "nu"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGender(g)}
                    disabled={!canRegister}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selectedGender === g
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200"
                      }`}
                  >
                    {g === "nam" ? "Nam" : "Nữ"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Size áo (có thể chọn nhiều size)
              </label>
              {sizesForGender.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Chưa có size nào được cấu hình cho giới tính này
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sizesForGender.map((s) => {
                    const isLocked = lockedSizes.has(s);
                    const isInCart = cartSizesForCurrent.has(s);
                    const isSelected = sizeQuantities[s] != null;
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSize(s)}
                        disabled={isLocked || !canRegister}
                        className={`relative w-11 h-11 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                          ? "bg-blue-600 text-white border-blue-600"
                          : isLocked
                            ? "bg-blue-50 text-blue-400 border-blue-100"
                            : isInCart
                              ? "bg-amber-50 text-amber-500 border-amber-200"
                              : "bg-white text-gray-600 border-gray-200"
                          }`}
                      >
                        {s}
                        {isLocked && (
                          <CheckCircle2 className="w-3 h-3 text-blue-400 absolute -top-1 -right-1 bg-white rounded-full" />
                        )}
                        {isInCart && !isLocked && (
                          <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-amber-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            +
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {lockedSizes.size > 0 && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Size có dấu ✓ đã thanh toán / chờ xác nhận, không thể đổi.
                </p>
              )}
              {cartSizesForCurrent.size > 0 && (
                <p className="text-[11px] text-amber-500 mt-1">
                  Size có dấu + đã có trong giỏ hàng (chưa gửi đơn).
                </p>
              )}
            </div>

            {/* Danh sách size đang chọn + số lượng từng size */}
            {selectedSizeList.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500">
                  Số lượng theo từng size
                </label>
                {sortSizes(selectedSizeList).map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2"
                  >
                    <span className="text-sm font-semibold text-gray-800">Size {s}</span>
                    <div className="inline-flex items-center rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => changeQty(s, -1)}
                        disabled={!canRegister}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-semibold">
                        {sizeQuantities[s]}
                      </span>
                      <button
                        onClick={() => changeQty(s, 1)}
                        disabled={!canRegister}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canRegister && (
              <button
                onClick={handlePlaceOrder}
                disabled={selectedSizeList.length === 0 || placingOrder}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {placingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                Đặt hàng
              </button>
            )}
          </>
        )}
      </div>

      {totalCartCount > 0 && (
        <button
          onClick={openCart}
          className="fixed z-40 bottom-[calc(env(safe-area-inset-bottom)+20px)] right-5 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-300/50 flex items-center justify-center text-white transition-transform active:scale-95 lg:hidden"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {totalCartCount}
          </span>
        </button>
      )}

      {totalCartCount > 0 &&
        desktopCartSlot &&
        createPortal(
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Giỏ hàng
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalCartCount}
            </span>
          </button>,
          desktopCartSlot,
        )}


      {cartOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99998] flex flex-col justify-end transition-opacity duration-300 ease-out ${cartVisible ? "opacity-100" : "opacity-0"
              }`}
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={(e) => e.target === e.currentTarget && closeCart()}
          >
            <div
              className={`w-full bg-white rounded-t-2xl transition-transform duration-300 ease-out ${cartVisible ? "translate-y-0" : "translate-y-full"
                }`}
              style={{
                maxHeight: "88vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-3 bg-white z-10">
                <p className="text-base font-bold text-gray-900">Giỏ hàng của bạn</p>
                <button
                  onClick={closeCart}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {totalCartCount === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">
                    Chưa có sản phẩm nào
                  </p>
                ) : (
                  <>
                    {/* Trong giỏ - chưa gửi API */}
                    {cart.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Trong giỏ ({cart.length})
                        </p>
                        {cart.map((item) => (
                          <div
                            key={item.cart_id}
                            className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3"
                          >
                            <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} className="w-full h-full object-cover" />
                              ) : (
                                <Shirt className="w-5 h-5 text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {item.shirt_type_name}
                                </p>
                                <button
                                  onClick={() => removeCartItem(item.cart_id)}
                                  className="text-gray-300 hover:text-red-500 flex-shrink-0"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {item.gender === "nu" ? "Nữ" : "Nam"} · Size {item.size}
                                {item.color_name ? ` · ${item.color_name}` : ""}
                              </p>
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
                                  <button
                                    onClick={() => changeCartQty(item.cart_id, -1)}
                                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs"
                                  >
                                    −
                                  </button>
                                  <span className="w-7 text-center text-xs font-semibold">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => changeCartQty(item.cart_id, 1)}
                                    className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  {fmt(item.unit_price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between px-1 pt-1">
                          <span className="text-sm text-gray-500">Tạm tính</span>
                          <span className="font-bold text-gray-900">{fmt(cartTotal)}</span>
                        </div>
                        <button
                          onClick={handleCheckout}
                          disabled={checkingOut}
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {checkingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                          Đặt hàng ({cart.length} sản phẩm)
                        </button>
                      </div>
                    )}

                    {myRegistrations.length > 0 && (() => {
                      // ── Gộp theo LOẠI ÁO (shirt_type_id) — bỏ qua khác biệt màu/size ──
                      const groupedByType = new Map<string, {
                        shirt_type_id: string;
                        variants: any[]; // các registration gốc thuộc loại áo này
                      }>();

                      for (const reg of myRegistrations) {
                        const key = reg.shirt_type_id;
                        if (!groupedByType.has(key)) {
                          groupedByType.set(key, { shirt_type_id: key, variants: [] });
                        }
                        groupedByType.get(key)!.variants.push(reg);
                      }
                      const typeGroups = Array.from(groupedByType.values());

                      return (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Đã đặt ({myRegistrations.length})
                          </p>
                          {typeGroups.map((group) => {
                            const type = shirtTypes.find((t) => t.id === group.shirt_type_id);
                            const images: string[] = (type?.colors ?? []).flatMap((c: any) =>
                              (c.images ?? []).map((img: any) =>
                                typeof img === "string" ? img : img.url,
                              ),
                            );
                            const groupTotal = group.variants.reduce(
                              (sum: number, r: any) => sum + priceOf(r),
                              0,
                            );
                            const groupQuantity = group.variants.reduce(
                              (sum: number, r: any) => sum + (r.quantity ?? 1),
                              0,
                            );
                            const allPaid = group.variants.every((r: any) => r.payment_status === "confirmed");
                            const anyPending = group.variants.some(
                              (r: any) => r.payment_status !== "confirmed" && !!r.payment_reference,
                            );
                            const anyUnpaid = group.variants.some(
                              (r: any) => r.payment_status !== "confirmed" && !r.payment_reference,
                            );

                            return (
                              <div
                                key={group.shirt_type_id}
                                className="flex gap-3 rounded-xl border border-gray-100 p-3"
                              >
                                <div className="w-14 h-14 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {images[0] ? (
                                    <img src={images[0]} className="w-full h-full object-cover" />
                                  ) : (
                                    <Shirt className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {type?.name ?? "—"} <span className="text-gray-400 font-normal">× {groupQuantity}</span>
                                    </p>
                                  </div>

                                  {/* Danh sách từng biến thể (màu/size) trong loại áo này */}
                                  <div className="mt-1 space-y-1">
                                    {group.variants.map((r: any) => {
                                      const paid = r.payment_status === "confirmed";
                                      const pending = !paid && !!r.payment_reference;
                                      return (
                                        <div
                                          key={r.id}
                                          className="flex items-center justify-between gap-2 text-xs"
                                        >
                                          <span className="text-gray-400">
                                            {r.gender === "nu" ? "Nữ" : "Nam"} · Size {r.size} × {r.quantity}
                                            {r.color_name ? ` · ${r.color_name}` : ""}
                                          </span>
                                          <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-gray-500 font-medium">{fmt(priceOf(r))}</span>
                                            {!paid && !pending && (
                                              <button
                                                onClick={() => handleCancel(r)}
                                                className="text-gray-300 hover:text-red-500"
                                              >
                                                <XIcon className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-50">
                                    <span className="text-sm font-bold text-gray-900">
                                      {fmt(groupTotal)}
                                    </span>
                                    {allPaid ? (
                                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        Đã thanh toán
                                      </span>
                                    ) : anyPending ? (
                                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                        Chờ xác nhận
                                      </span>
                                    ) : anyUnpaid ? (
                                      <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                        Chưa thanh toán
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between px-1 pt-1">
                            <span className="text-sm text-gray-500">Tổng đã đặt</span>
                            <span className="font-bold text-gray-900">{fmt(subtotal)}</span>
                          </div>

                          {unpaidRegs.length > 0 && (
                            <button
                              onClick={openCombinedPay}
                              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-200"
                            >
                              💳 Thanh toán tất cả ({fmt(unpaidTotal)})
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {cart.length > 0 && myRegistrations.length > 0 && (
                      <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-600 font-medium">Tổng cộng</span>
                        <span className="text-lg font-black text-gray-900">
                          {fmt(grandTotal)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showPayPanel &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex flex-col justify-end transition-opacity duration-300 ease-out ${payPanelVisible ? "opacity-100" : "opacity-0"
              }`}
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={(e) => e.target === e.currentTarget && closePayPanel()}
          >
            <div
              className={`w-full bg-white rounded-t-2xl transition-transform duration-300 ease-out ${payPanelVisible ? "translate-y-0" : "translate-y-full"
                }`}
              style={{
                maxHeight: "90vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">Chọn phương thức thanh toán</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Thanh toán gộp {unpaidRegs.length} sản phẩm · {activity.title}
                  </p>
                </div>
                <button
                  onClick={closePayPanel}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-600">Tổng tiền thanh toán</span>
                  <span className="text-lg font-black text-red-600">{fmt(unpaidTotal)}</span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => selectPayMethod("wallet")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#0F2E22] hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#0F2E22]/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-[#0F2E22]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Ví BnB</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Trừ thẳng vào số dư ví — xác nhận ngay lập tức
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => selectPayMethod("transfer")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#C9A227] hover:bg-amber-50 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-xl">
                      🏦
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Chuyển khoản</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Quét QR VietQR, xác nhận sau khi chuyển
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => selectPayMethod("cash")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-xl">
                      💵
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Tiền mặt</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Thông báo admin, nộp tiền trực tiếp
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showConfirmPanel &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex flex-col justify-end transition-opacity duration-300 ease-out ${confirmPanelVisible ? "opacity-100" : "opacity-0"
              }`}
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
            onClick={(e) => e.target === e.currentTarget && closeConfirmPanel()}
          >
            <div
              className={`w-full bg-white rounded-t-2xl transition-transform duration-300 ease-out ${confirmPanelVisible ? "translate-y-0" : "translate-y-full"
                }`}
              style={{
                maxHeight: "90vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {payMethod === "wallet"
                      ? "Trừ ví BnB"
                      : payMethod === "transfer"
                        ? "Chuyển khoản"
                        : "Tiền mặt"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Thanh toán gộp {unpaidRegs.length} sản phẩm · {activity.title}
                  </p>
                </div>
                <button
                  onClick={closeConfirmPanel}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-600">Tổng tiền thanh toán</span>
                  <span className="text-lg font-black text-red-600">{fmt(unpaidTotal)}</span>
                </div>

                {payMethod === "wallet" && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-[#0F2E22] mb-1 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BnB
                      </p>
                      <p className="text-xs text-gray-500">
                        Ví sẽ bị trừ lần lượt cho {unpaidRegs.length} sản phẩm, tổng {fmt(unpaidTotal)}.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={backToChooseMethod}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handlePayWalletAll}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-[#0F2E22] text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <Wallet className="w-3.5 h-3.5" /> Xác nhận trừ ví
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === "transfer" &&
                  (() => {
                    const ref = `DATAOA GOP-${activity.id.slice(0, 4).toUpperCase()}-${Date.now()
                      .toString(36)
                      .toUpperCase()}`;
                    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
                    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
                    const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
                    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${unpaidTotal}&addInfo=${encodeURIComponent(
                      ref,
                    )}&accountName=${encodeURIComponent(bankAccountName)}`;

                    return (
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                          <p className="text-xs text-gray-400">
                            Quét mã QR để thanh toán {unpaidRegs.length} sản phẩm
                          </p>
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
                            <span className="font-bold text-red-600">{fmt(unpaidTotal)}</span>
                          </div>
                          <div className="px-4 py-2.5">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nội dung CK</span>
                              <span className="font-mono font-semibold text-gray-900">{ref}</span>
                            </div>
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

                        <div className="flex gap-2">
                          <button
                            onClick={backToChooseMethod}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                          >
                            Quay lại
                          </button>
                          <button
                            onClick={() => handleConfirmTransferredAll(ref)}
                            disabled={submittingPay}
                            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                          >
                            {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{" "}
                            Tôi đã chuyển khoản
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                {payMethod === "cash" && (
                  <div className="space-y-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        💵 Thanh toán tiền mặt
                      </p>
                      <p className="text-xs text-green-600">
                        Admin sẽ xác nhận sau khi nhận đủ tiền mặt cho {unpaidRegs.length} sản phẩm ({fmt(unpaidTotal)}).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={backToChooseMethod}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handleRequestCashAll}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{" "}
                        Thông báo admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {lightboxSrc &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${lightboxVisible ? "bg-black/80 opacity-100" : "bg-black/0 opacity-0"
              }`}
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 ${lightboxVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
            <img
              src={lightboxSrc}
              alt="Ảnh mẫu áo"
              className={`max-w-full max-h-full object-contain rounded-lg transition-all duration-200 ease-out ${lightboxVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(target?: string | null) {
  const [time, setTime] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: true,
  });

  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();

    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTime({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
        expired: false,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return time;
}

function CountBox({
  value,
  label,
  accent,
  tone = "cool",
}: {
  value: number;
  label: string;
  accent?: boolean;
  tone?: "cool" | "warm";
}) {
  const display = pad2(value);
  const numberClass = accent
    ? tone === "warm"
      ? "text-rose-600"
      : "text-indigo-600"
    : "text-white";
  const labelClass = accent
    ? tone === "warm"
      ? "text-rose-600/70"
      : "text-indigo-600/70"
    : "text-white/80";
  return (
    <div
      className={`rounded-2xl py-2.5 text-center border transition-colors ${accent
        ? "bg-white border-white shadow-sm"
        : "bg-white/15 border-white/25"
        }`}
    >
      <div className="count-rotate-wrap h-8 flex items-center justify-center">
        <span
          key={display}
          className={`count-rotate text-2xl font-black leading-8 ${numberClass}`}
        >
          {display}
        </span>
      </div>
      <p className={`text-[10px] mt-0.5 ${labelClass}`}>{label}</p>
    </div>
  );
}

const TOURNAMENT_LEVEL_LABEL: Record<string, string> = {
  A: "Trình A",
  "B+": "Trình B+",
  B: "Trình B",
  C: "Trình C",
};

function TournamentSection({ activity, myStatus, onChanged }: any) {
  const router = useRouter();
  const reg = myStatus?.my_registration;
  const canRegister = activity.status === "open";

  const [showRules, setShowRules] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "choose" | "wallet" | "transfer" | "cash"
  >("choose");
  const [submittingPay, setSubmittingPay] = useState(false);

  const startCountdown = useCountdown(activity.event_date);
  const deadlineCountdown = useCountdown(activity.deadline);

  const entryFee = activity.detail?.entry_fee_per_person ?? 0;
  const maxTeams = activity.detail?.max_teams ?? null;
  const amount = reg?.amount_override ?? entryFee;

  const isPaid = reg?.payment_status === "confirmed";
  const isPendingConfirm = reg && !isPaid && !!reg.payment_reference;
  const needsPayment = reg && amount > 0 && !isPaid && !isPendingConfirm;

  const PAYMENT_METHOD_LABEL: Record<string, string> = {
    wallet: "Ví BNB",
    transfer: "Chuyển khoản",
    cash: "Tiền mặt",
  };

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký giải đấu?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch { }
  };

  const goToRegisterPage = () => {
    router.push(`/events/${activity.id}/register`);
  };

  const openPayModal = () => {
    setPayMethod("choose");
    setShowPayModal(true);
  };

  const handlePayWallet = async () => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, { method: "wallet" });
      toast.success("Đã thanh toán bằng ví BNB!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleConfirmTransferred = async (ref: string) => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, {
        method: "transfer",
        payment_reference: ref,
      });
      toast.success("Đã ghi nhận, chờ admin xác nhận!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleRequestCash = async () => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, { method: "cash" });
      toast.success("Đã thông báo admin!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[28px] p-5 shadow-lg shadow-indigo-200/50 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {startCountdown.expired ? "Giải đã bắt đầu" : "Giải bắt đầu sau"}
        </div>

        {!startCountdown.expired ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <CountBox value={startCountdown.days} label="ngày" tone="cool" />
            <CountBox value={startCountdown.hours} label="giờ" tone="cool" />
            <CountBox value={startCountdown.minutes} label="phút" tone="cool" />
            <CountBox
              value={startCountdown.seconds}
              label="giây"
              tone="cool"
              accent
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/90">
            Chúc các đội thi đấu tốt! 🏆
          </p>
        )}
      </div>

      {/* Hạn đăng ký còn */}
      {activity.deadline && (
        <div className="rounded-[28px] p-5 shadow-lg shadow-rose-200/50 bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {deadlineCountdown.expired
                ? "Đã hết hạn đăng ký"
                : "Hạn đăng ký còn"}
            </div>
            <span className="text-[11px] text-white/80">
              {format(new Date(activity.deadline), "dd/MM/yyyy", {
                locale: vi,
              })}
            </span>
          </div>

          {!deadlineCountdown.expired && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              <CountBox
                value={deadlineCountdown.days}
                label="ngày"
                tone="warm"
              />
              <CountBox
                value={deadlineCountdown.hours}
                label="giờ"
                tone="warm"
              />
              <CountBox
                value={deadlineCountdown.minutes}
                label="phút"
                tone="warm"
              />
              <CountBox
                value={deadlineCountdown.seconds}
                label="giây"
                tone="warm"
                accent
              />
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[28px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Đăng ký thi đấu</h3>
          {entryFee > 0 && (
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              {entryFee.toLocaleString("vi-VN")}đ/người
            </span>
          )}
        </div>

        {reg && (
          <div className="bg-emerald-50 text-emerald-700 text-sm rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                {reg.role === "nam" ? "VĐV Nam" : "VĐV Nữ"} ·{" "}
                <strong>
                  {TOURNAMENT_LEVEL_LABEL[reg.level] ?? reg.level}
                </strong>
                {reg.team?.name && (
                  <>
                    {" "}
                    · Đội: <strong>{reg.team.name}</strong>
                  </>
                )}
              </span>
            </span>
            {!isPaid && !isPendingConfirm && (
              <button
                onClick={handleCancel}
                className="text-red-500 text-xs font-medium underline flex-shrink-0"
              >
                Huỷ
              </button>
            )}
          </div>
        )}

        {reg && !reg.team?.name && (
          <p className="text-xs text-gray-400 -mt-2">
            Đội thi đấu sẽ được BTC bốc thăm và công bố sau khi đóng đăng ký.
          </p>
        )}

        {isPaid && (
          <div className="bg-violet-50 rounded-2xl px-3 py-2.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-700 leading-snug">
              <p className="font-medium">Đã thanh toán lệ phí</p>
              {reg.payment_method && (
                <span className="inline-block mt-1 text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  {PAYMENT_METHOD_LABEL[reg.payment_method] ??
                    reg.payment_method}
                </span>
              )}
            </div>
          </div>
        )}

        {isPendingConfirm && (
          <div className="bg-orange-50 rounded-2xl px-3 py-2.5 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700 leading-snug">
              <p className="font-medium">
                Đã gửi yêu cầu thanh toán, đang chờ admin xác nhận
              </p>
              {reg.payment_method && (
                <span className="inline-block mt-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  {PAYMENT_METHOD_LABEL[reg.payment_method] ??
                    reg.payment_method}
                </span>
              )}
            </div>
          </div>
        )}

        {needsPayment && (
          <button
            onClick={openPayModal}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-fuchsia-200"
          >
            💳 Thanh toán {fmt(amount)}
          </button>
        )}

        {!reg && canRegister && (
          <button
            onClick={goToRegisterPage}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-fuchsia-200"
          >
            Đăng ký thi đấu ngay
          </button>
        )}

        {!reg && !canRegister && (
          <p className="text-sm text-gray-400 text-center py-2">
            Đã đóng đăng ký
          </p>
        )}

        {/* ── Số liệu ── */}
        <div className="flex gap-2 pt-2 border-t border-gray-50">
          {entryFee > 0 && (
            <div className="flex-1 rounded-2xl bg-amber-50 px-3 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Coins className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600/70 uppercase">
                  Lệ phí
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {fmt(entryFee)}
                </p>
              </div>
            </div>
          )}
          {maxTeams && (
            <div className="flex-1 rounded-2xl bg-violet-50 px-3 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] text-violet-600/70 uppercase">
                  Số đội tối đa
                </p>
                <p className="text-sm font-bold text-gray-900">{maxTeams}</p>
              </div>
            </div>
          )}
        </div>

        {activity.description && (
          <button
            onClick={() => setShowRules((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-600 pt-1"
          >
            Xem thể lệ giải
            {showRules ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
        {showRules && activity.description && (
          <p className="text-sm text-gray-500 whitespace-pre-line bg-gray-50 rounded-xl p-3">
            {activity.description}
          </p>
        )}
      </div>

      {showPayModal &&
        reg &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex flex-col justify-end"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowPayModal(false)
            }
          >
            <div
              className="w-full bg-white rounded-t-2xl"
              style={{
                maxHeight: "90vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {payMethod === "choose"
                      ? "Chọn phương thức thanh toán"
                      : payMethod === "wallet"
                        ? "Trừ ví BNB"
                        : payMethod === "transfer"
                          ? "Chuyển khoản"
                          : "Tiền mặt"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activity.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-600">
                    Số tiền thanh toán
                  </span>
                  <span className="text-lg font-black text-red-600">
                    {fmt(amount)}
                  </span>
                </div>

                {payMethod === "choose" && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setPayMethod("wallet")}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#0F2E22] hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-[#0F2E22]/10 flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-[#0F2E22]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Ví BNB
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Trừ thẳng vào số dư ví — xác nhận ngay lập tức
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPayMethod("transfer")}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#C9A227] hover:bg-amber-50 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-xl">
                        🏦
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Chuyển khoản
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Quét QR VietQR, xác nhận sau khi chuyển
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPayMethod("cash")}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-xl">
                        💵
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Tiền mặt
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Thông báo admin, nộp tiền trực tiếp
                        </p>
                      </div>
                    </button>
                  </div>
                )}

                {payMethod === "wallet" && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-[#0F2E22] mb-1 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                      </p>
                      <p className="text-xs text-gray-500">
                        Số dư ví sẽ bị trừ ngay lập tức.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPayMethod("choose")}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handlePayWallet}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-[#0F2E22] text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <Wallet className="w-3.5 h-3.5" /> Xác nhận trừ ví
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === "transfer" &&
                  (() => {
                    const ref = `DATAOA ${reg.id.slice(0, 8).toUpperCase()}`;
                    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                    const bankAccount =
                      process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
                    const bankAccountName =
                      process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
                    const bankDisplayName =
                      BANK_DISPLAY_NAMES[bankId] ?? bankId;
                    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

                    return (
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                          <p className="text-xs text-gray-400">
                            Quét mã QR để thanh toán
                          </p>
                          <img
                            src={qr}
                            alt="VietQR"
                            className="w-48 h-48 object-contain"
                          />
                        </div>

                        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 text-sm overflow-hidden">
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Ngân hàng</span>
                            <span className="font-semibold text-gray-900">
                              {bankDisplayName}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Số tài khoản</span>
                            <span className="font-semibold text-gray-900">
                              {bankAccount}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Số tiền</span>
                            <span className="font-bold text-red-600">
                              {fmt(amount)}
                            </span>
                          </div>
                          <div className="px-4 py-2.5">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nội dung CK</span>
                              <span className="font-mono font-semibold text-gray-900">
                                {ref}
                              </span>
                            </div>
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

                        <div className="flex gap-2">
                          <button
                            onClick={() => setPayMethod("choose")}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                          >
                            Quay lại
                          </button>
                          <button
                            onClick={() => handleConfirmTransferred(ref)}
                            disabled={submittingPay}
                            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                          >
                            {submittingPay && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}{" "}
                            Tôi đã chuyển khoản
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                {payMethod === "cash" && (
                  <div className="space-y-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        💵 Thanh toán tiền mặt
                      </p>
                      <p className="text-xs text-green-600">
                        Admin sẽ xác nhận sau khi nhận tiền trực tiếp.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPayMethod("choose")}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={handleRequestCash}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}{" "}
                        Thông báo admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}


function OfflineEventSection({ activity, myStatus, onChanged }: any) {
  const reg = myStatus?.my_registration;
  const [guestCount, setGuestCount] = useState(reg?.guest_count ?? 0);
  const [notes, setNotes] = useState(reg?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const canRegister = ["open", "ongoing", "upcoming"].includes(activity.status);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await activitiesApi.registerOfflineEvent(activity.id, {
        guest_count: guestCount,
        notes: notes || undefined,
      });
      toast.success(reg ? "Đã cập nhật đăng ký" : "Đã đăng ký tham gia");
      onChanged();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký tham gia?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch { }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-900">Đăng ký tham gia</h3>

      {reg && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Bạn đã đăng ký{" "}
          {reg.guest_count > 0 && `(+${reg.guest_count} khách đi cùng)`}
        </div>
      )}

      {canRegister ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Số khách đi cùng
            </label>
            <input
              type="number"
              min={0}
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
              {reg ? "Cập nhật" : "Đăng ký tham gia"}
            </button>
            {reg && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
              >
                Huỷ
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          Đã đóng đăng ký
        </p>
      )}
    </div>
  );
}

//  Bình chọn
function PollSection({ activity, myStatus, onChanged }: any) {
  const options = myStatus?.options ?? [];
  const counts: Record<string, number> = Object.fromEntries(
    (myStatus?.counts ?? []).map((c: any) => [c.option_id, c.count]),
  );
  const totalVotes = Object.values(counts).reduce(
    (s: number, c: any) => s + c,
    0,
  );
  const [selected, setSelected] = useState<string[]>(
    myStatus?.my_voted_option_ids ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const allowMultiple = activity.detail?.allow_multiple;
  const canVote = activity.status === "open";
  const hasVoted = (myStatus?.my_voted_option_ids ?? []).length > 0;

  const toggleOption = (id: string) => {
    if (allowMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelected([id]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0)
      return toast.error("Vui lòng chọn ít nhất 1 lựa chọn");
    setSubmitting(true);
    try {
      await activitiesApi.vote(activity.id, selected);
      toast.success("Đã ghi nhận bình chọn của bạn");
      onChanged();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <h3 className="font-bold text-gray-900">
        {allowMultiple ? "Chọn nhiều lựa chọn" : "Chọn 1 lựa chọn"}
      </h3>

      <div className="space-y-2">
        {options.map((opt: any) => {
          const count = counts[opt.id] ?? 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => canVote && toggleOption(opt.id)}
              disabled={!canVote}
              className={`w-full text-left rounded-xl border p-3 relative overflow-hidden transition-colors ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200"
                }`}
            >
              {(hasVoted || !canVote) && (
                <div
                  className="absolute inset-0 bg-blue-50/60"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {opt.label}
                </span>
                {(hasVoted || !canVote) && (
                  <span className="text-xs font-semibold text-gray-500">
                    {pct}% ({count})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {canVote ? (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
          {hasVoted ? "Cập nhật bình chọn" : "Gửi bình chọn"}
        </button>
      ) : (
        <p className="text-sm text-gray-400 text-center py-1">
          Đã đóng bình chọn · {totalVotes} lượt
        </p>
      )}
    </div>
  );
}

//  Sinh nhật
function BirthdaySection({ myStatus }: any) {
  const members = myStatus?.members ?? [];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <h3 className="font-bold text-gray-900">Thành viên có sinh nhật</h3>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Không có ai trong danh sách
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center font-bold text-pink-600 overflow-hidden">
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  m.full_name?.[0]
                )}
              </div>
              <p className="text-xs text-center text-gray-600 truncate w-full">
                {m.full_name}
              </p>
              <p className="text-[10px] text-gray-400">
                {format(new Date(m.date_of_birth), "dd/MM")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

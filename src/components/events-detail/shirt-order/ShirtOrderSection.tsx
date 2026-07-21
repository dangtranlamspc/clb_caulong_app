"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { activitiesApi } from "@/lib/api";
import { ImageLightbox } from "../ImageLightbox";
import { ShirtTypePicker } from "./ShirtTypePicker";
import { ShirtOrderForm } from "./ShirtOrderForm";
import { ShirtCartFab } from "./ShirtCartFab";
import { ShirtCartDrawer } from "./ShirtCartDrawer";
import { ShirtPayMethodPanel } from "./ShirtPayMethodPanel";
import { ShirtPaymentConfirmPanel } from "./ShirtPaymentConfirmPanel";
import { CartItem } from "@/types/types";
import { fmt, sortSizes } from "@/utils/utils";

const TRANSITION_MS = 280;

export function ShirtOrderSection({ activity, myStatus, onChanged }: any) {
  const shirtTypes: any[] = activity.detail?.shirt_types ?? [];
  const myRegistrations: any[] = myStatus?.my_registrations ?? [];
  const pendingRegistrations = myRegistrations.filter(
    (r: any) => r.payment_status !== "confirmed",
  );
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

  const [jerseyNumber, setJerseyNumber] = useState("");
  const [printName, setPrintName] = useState("");

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
    setJerseyNumber("");
    setPrintName("");
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
          jersey_number: jerseyNumber || undefined,
          print_name: printName || undefined,
        });
      }
      toast.success(`Đã đặt hàng ${selectedSizeList.length} sản phẩm`);
      setSizeQuantities({});
      setJerseyNumber("");
      setPrintName("");
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
      await activitiesApi.cancelRegistration(activity.id, { registration_id: reg.id });
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

  // const subtotal = myRegistrations.reduce((s: number, r: any) => s + priceOf(r), 0);
  const subtotal = pendingRegistrations.reduce((s: number, r: any) => s + priceOf(r), 0);
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
        await activitiesApi.payShirtOrder(activity.id, {
          registration_id: reg.id,
          method: "transfer",
          payment_reference: ref,
        });
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

  // const totalCartCount = cart.length + myRegistrations.length;

  const totalCartCount = cart.length + pendingRegistrations.length;

  return (
    <div className="space-y-4">
      <ShirtTypePicker
        shirtTypes={shirtTypes}
        selectedType={selectedType}
        selectedTypeId={selectedTypeId}
        setSelectedTypeId={setSelectedTypeId}
        activeColor={activeColor}
        activeColorImage={activeColorImage}
        selectedColorId={selectedColorId}
        setSelectedColorId={setSelectedColorId}
        cart={cart}
        myRegistrations={myRegistrations}
        openLightbox={openLightbox}
      />

      <ShirtOrderForm
        canRegister={canRegister}
        hasExistingSelection={regsForTypeGender.length > 0 || cart.length > 0}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        sizesForGender={sizesForGender}
        lockedSizes={lockedSizes}
        cartSizesForCurrent={cartSizesForCurrent}
        sizeQuantities={sizeQuantities}
        toggleSize={toggleSize}
        changeQty={changeQty}
        selectedSizeList={selectedSizeList}
        jerseyNumber={jerseyNumber}
        setJerseyNumber={setJerseyNumber}
        printName={printName}
        setPrintName={setPrintName}
        handlePlaceOrder={handlePlaceOrder}
        placingOrder={placingOrder}
      />

      <ShirtCartFab
        totalCartCount={totalCartCount}
        openCart={openCart}
        desktopCartSlot={desktopCartSlot}
      />

      <ShirtCartDrawer
        open={cartOpen}
        visible={cartVisible}
        onClose={closeCart}
        cart={cart}
        changeCartQty={changeCartQty}
        removeCartItem={removeCartItem}
        cartTotal={cartTotal}
        handleCheckout={handleCheckout}
        checkingOut={checkingOut}
        myRegistrations={pendingRegistrations}
        // myRegistrations={myRegistrations}
        shirtTypes={shirtTypes}
        priceOf={priceOf}
        handleCancel={handleCancel}
        subtotal={subtotal}
        unpaidRegsCount={unpaidRegs.length}
        unpaidTotal={unpaidTotal}
        openCombinedPay={openCombinedPay}
        totalCartCount={totalCartCount}
        grandTotal={grandTotal}
      />

      <ShirtPayMethodPanel
        open={showPayPanel}
        visible={payPanelVisible}
        onClose={closePayPanel}
        unpaidCount={unpaidRegs.length}
        unpaidTotal={unpaidTotal}
        activityTitle={activity.title}
        selectPayMethod={selectPayMethod}
      />

      <ShirtPaymentConfirmPanel
        open={showConfirmPanel}
        visible={confirmPanelVisible}
        onClose={closeConfirmPanel}
        payMethod={payMethod}
        activity={activity}
        unpaidCount={unpaidRegs.length}
        unpaidTotal={unpaidTotal}
        backToChooseMethod={backToChooseMethod}
        handlePayWalletAll={handlePayWalletAll}
        handleConfirmTransferredAll={handleConfirmTransferredAll}
        handleRequestCashAll={handleRequestCashAll}
        submittingPay={submittingPay}
      />

      <ImageLightbox src={lightboxSrc} visible={lightboxVisible} onClose={closeLightbox} />
    </div>
  );
}

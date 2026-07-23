"use client";

import { createPortal } from "react-dom";
import { Loader2, Shirt, XIcon } from "lucide-react";
import { CartItem } from "@/types/types";
import { fmt } from "@/utils/utils";

export function ShirtCartDrawer({
  open,
  visible,
  onClose,
  cart,
  changeCartQty,
  removeCartItem,
  cartTotal,
  handleCheckout,
  checkingOut,
  myRegistrations,
  shirtTypes,
  priceOf,
  handleCancel,
  changeRegistrationQty,
  updatingQtyId,
  subtotal,
  unpaidRegsCount,
  unpaidTotal,
  openCombinedPay,
  totalCartCount,
  grandTotal,
}: {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  cart: CartItem[];
  changeCartQty: (cartId: string, delta: number) => void;
  removeCartItem: (cartId: string) => void;
  cartTotal: number;
  handleCheckout: () => void;
  checkingOut: boolean;
  myRegistrations: any[];
  shirtTypes: any[];
  priceOf: (r: any) => number;
  handleCancel: (reg: any) => void;
  changeRegistrationQty: (regId: string, delta: number) => void;
  updatingQtyId?: string | null;
  subtotal: number;
  unpaidRegsCount: number;
  unpaidTotal: number;
  openCombinedPay: () => void;
  totalCartCount: number;
  grandTotal: number;
}) {
  if (!open || typeof document === "undefined") return null;

  const groupedByType = new Map<string, { shirt_type_id: string; variants: any[] }>();
  for (const reg of myRegistrations) {
    const key = reg.shirt_type_id;
    if (!groupedByType.has(key)) {
      groupedByType.set(key, { shirt_type_id: key, variants: [] });
    }
    groupedByType.get(key)!.variants.push(reg);
  }
  const typeGroups = Array.from(groupedByType.values());

  return createPortal(
    <div
      className={`fixed inset-0 z-[99998] flex flex-col justify-end transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"
        }`}
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full bg-white rounded-t-2xl transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"
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
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {totalCartCount === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Chưa có sản phẩm nào</p>
          ) : (
            <>
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

              {typeGroups.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Đã đặt ({myRegistrations.length})
                  </p>
                  {typeGroups.map((group) => {
                    const type = shirtTypes.find((t) => t.id === group.shirt_type_id);
                    const images: string[] = (type?.colors ?? []).flatMap((c: any) =>
                      (c.images ?? []).map((img: any) => (typeof img === "string" ? img : img.url)),
                    );
                    const groupTotal = group.variants.reduce(
                      (sum: number, r: any) => sum + priceOf(r),
                      0,
                    );
                    const groupQuantity = group.variants.reduce(
                      (sum: number, r: any) => sum + (r.quantity ?? 1),
                      0,
                    );
                    const allPaid = group.variants.every(
                      (r: any) => r.payment_status === "confirmed",
                    );
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
                              {type?.name ?? "—"}{" "}
                              <span className="text-gray-400 font-normal">× {groupQuantity}</span>
                            </p>
                          </div>

                          <div className="mt-1 space-y-1">
                            {group.variants.map((r: any) => {
                              const paid = r.payment_status === "confirmed";
                              const pending = !paid && !!r.payment_reference;
                              const canEditQty = !paid && !pending;
                              const isUpdating = updatingQtyId === r.id;

                              return (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="text-gray-400">
                                    {r.gender === "nu" ? "Nữ" : "Nam"} · Size {r.size}
                                    {r.color_name ? ` · ${r.color_name}` : ""}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {canEditQty ? (
                                      <div className="inline-flex items-center rounded-lg border border-gray-200 overflow-hidden">
                                        <button
                                          onClick={() => changeRegistrationQty(r.id, -1)}
                                          disabled={isUpdating || r.quantity <= 1}
                                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs disabled:opacity-30"
                                        >
                                          −
                                        </button>
                                        <span className="w-7 text-center text-xs font-semibold">
                                          {isUpdating ? (
                                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                          ) : (
                                            r.quantity
                                          )}
                                        </span>
                                        <button
                                          onClick={() => changeRegistrationQty(r.id, 1)}
                                          disabled={isUpdating}
                                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs disabled:opacity-30"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">× {r.quantity}</span>
                                    )}
                                    <span className="text-gray-500 font-medium">
                                      {fmt(priceOf(r))}
                                    </span>
                                    {canEditQty && (
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

                  {unpaidRegsCount > 0 && (
                    <button
                      onClick={openCombinedPay}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-200"
                    >
                      💳 Thanh toán tất cả ({fmt(unpaidTotal)})
                    </button>
                  )}
                </div>
              )}

              {cart.length > 0 && myRegistrations.length > 0 && (
                <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600 font-medium">Tổng cộng</span>
                  <span className="text-lg font-black text-gray-900">{fmt(grandTotal)}</span>
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

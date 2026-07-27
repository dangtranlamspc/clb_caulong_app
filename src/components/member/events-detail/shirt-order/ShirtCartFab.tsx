"use client";

import { createPortal } from "react-dom";
import { ShoppingCart } from "lucide-react";

export function ShirtCartFab({
  totalCartCount,
  openCart,
  desktopCartSlot,
}: {
  totalCartCount: number;
  openCart: () => void;
  desktopCartSlot: HTMLElement | null;
}) {
  if (totalCartCount === 0) return null;

  return (
    <>
      <button
        onClick={openCart}
        className="fixed z-40 bottom-[calc(env(safe-area-inset-bottom)+20px)] right-5 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-300/50 flex items-center justify-center text-white transition-transform active:scale-95 lg:hidden"
      >
        <ShoppingCart className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
          {totalCartCount}
        </span>
      </button>

      {desktopCartSlot &&
        createPortal(
          <button
            onClick={openCart}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Đơn hàng
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalCartCount}
            </span>
          </button>,
          desktopCartSlot,
        )}
    </>
  );
}

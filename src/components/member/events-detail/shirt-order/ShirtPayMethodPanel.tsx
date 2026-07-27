"use client";

import { createPortal } from "react-dom";
import { Wallet, XIcon } from "lucide-react";
import { fmt } from "@/utils/utils";

export function ShirtPayMethodPanel({
  open,
  visible,
  onClose,
  unpaidCount,
  unpaidTotal,
  activityTitle,
  selectPayMethod,
}: {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  unpaidCount: number;
  unpaidTotal: number;
  activityTitle: string;
  selectPayMethod: (method: "wallet" | "transfer" | "cash") => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex flex-col justify-end transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"
        }`}
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full bg-white rounded-t-2xl transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"
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
              Thanh toán gộp {unpaidCount} sản phẩm · {activityTitle}
            </p>
          </div>
          <button
            onClick={onClose}
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
  );
}

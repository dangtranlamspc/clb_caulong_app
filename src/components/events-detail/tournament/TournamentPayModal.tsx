"use client";

import { createPortal } from "react-dom";
import { Copy, Loader2, Wallet, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { fmt } from "@/utils/utils";
import { BANK_DISPLAY_NAMES } from "@/constants/constants";

export function TournamentPayModal({
  open,
  onClose,
  activity,
  reg,
  amount,
  payMethod,
  setPayMethod,
  submittingPay,
  handlePayWallet,
  handleConfirmTransferred,
  handleRequestCash,
}: {
  open: boolean;
  onClose: () => void;
  activity: any;
  reg: any;
  amount: number;
  payMethod: "choose" | "wallet" | "transfer" | "cash";
  setPayMethod: (m: "choose" | "wallet" | "transfer" | "cash") => void;
  submittingPay: boolean;
  handlePayWallet: () => void;
  handleConfirmTransferred: (ref: string) => void;
  handleRequestCash: () => void;
}) {
  if (!open || !reg || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
            <p className="text-xs text-gray-400 mt-0.5">{activity.title}</p>
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
            <span className="text-sm text-gray-600">Số tiền thanh toán</span>
            <span className="text-lg font-black text-red-600">{fmt(amount)}</span>
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
                  <p className="text-sm font-semibold text-gray-900">Ví BNB</p>
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
                  <p className="text-sm font-semibold text-gray-900">Chuyển khoản</p>
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
                  <p className="text-sm font-semibold text-gray-900">Tiền mặt</p>
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
                <p className="text-xs text-gray-500">Số dư ví sẽ bị trừ ngay lập tức.</p>
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
                  {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Wallet className="w-3.5 h-3.5" /> Xác nhận trừ ví
                </button>
              </div>
            </div>
          )}

          {payMethod === "transfer" &&
            (() => {
              const ref = `DATAOA ${reg.id.slice(0, 8).toUpperCase()}`;
              const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
              const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
              const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
              const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
              const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

              return (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                    <p className="text-xs text-gray-400">Quét mã QR để thanh toán</p>
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
                      <span className="font-bold text-red-600">{fmt(amount)}</span>
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
  );
}

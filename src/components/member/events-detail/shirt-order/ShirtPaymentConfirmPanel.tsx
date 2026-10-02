"use client";

import { createPortal } from "react-dom";
import { Copy, Loader2, Wallet, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { fmt } from "@/utils/utils";
import { BANK_DISPLAY_NAMES } from "@/constants/constants";

export function ShirtPaymentConfirmPanel({
  open,
  visible,
  onClose,
  payMethod,
  activity,
  unpaidCount,
  unpaidTotal,
  backToChooseMethod,
  handlePayWalletAll,
  handleConfirmTransferredAll,
  handleRequestCashAll,
  submittingPay,
}: {
  open: boolean;
  visible: boolean;
  onClose: () => void;
  payMethod: "choose" | "wallet" | "transfer" | "cash";
  activity: any;
  unpaidCount: number;
  unpaidTotal: number;
  backToChooseMethod: () => void;
  handlePayWalletAll: () => void;
  handleConfirmTransferredAll: (ref: string) => void;
  handleRequestCashAll: () => void;
  submittingPay: boolean;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex flex-col justify-end transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"
        }`}
      style={{ background: "var(--overlay)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full bg-[var(--surface)] rounded-t-2xl transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "translate-y-full"
          }`}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              {payMethod === "wallet"
                ? "Trừ ví BnB"
                : payMethod === "transfer"
                  ? "Chuyển khoản"
                  : "Tiền mặt"}
            </p>
            <p className="text-xs text-[var(--text-faint)] mt-0.5">
              Thanh toán gộp {unpaidCount} sản phẩm · {activity.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between bg-[var(--danger-soft)] rounded-xl px-4 py-3">
            <span className="text-sm text-[var(--text-muted)]">Tổng tiền thanh toán</span>
            <span className="text-lg font-black text-[var(--danger)]">{fmt(unpaidTotal)}</span>
          </div>

          {payMethod === "wallet" && (
            <div className="space-y-4">
              <div className="bg-[var(--surface-muted)] rounded-xl p-4">
                <p className="text-sm font-semibold text-[#0F2E22] mb-1 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BnB
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Ví sẽ bị trừ lần lượt cho {unpaidCount} sản phẩm, tổng {fmt(unpaidTotal)}.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={backToChooseMethod}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
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
                  <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2">
                    <p className="text-xs text-[var(--text-faint)]">
                      Quét mã QR để thanh toán {unpaidCount} sản phẩm
                    </p>
                    <img src={qr} alt="VietQR" className="w-48 h-48 object-contain" />
                  </div>

                  <div className="bg-[var(--surface-muted)] rounded-xl divide-y divide-[var(--border)] text-sm overflow-hidden">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[var(--text-muted)]">Ngân hàng</span>
                      <span className="font-semibold text-[var(--text)]">{bankDisplayName}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[var(--text-muted)]">Số tài khoản</span>
                      <span className="font-semibold text-[var(--text)]">{bankAccount}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-[var(--text-muted)]">Số tiền</span>
                      <span className="font-bold text-[var(--danger)]">{fmt(unpaidTotal)}</span>
                    </div>
                    <div className="px-4 py-2.5">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Nội dung CK</span>
                        <span className="font-mono font-semibold text-[var(--text)]">{ref}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ref);
                      toast.success("Đã copy nội dung chuyển khoản");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)]"
                  >
                    <Copy className="w-3.5 h-3.5" /> Sao chép nội dung
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={backToChooseMethod}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
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
              <div className="bg-[var(--success-soft)] rounded-xl p-4">
                <p className="text-sm font-semibold text-[var(--success)] mb-1">
                  💵 Thanh toán tiền mặt
                </p>
                <p className="text-xs text-[var(--success)]">
                  Admin sẽ xác nhận sau khi nhận đủ tiền mặt cho {unpaidCount} sản phẩm (
                  {fmt(unpaidTotal)}).
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={backToChooseMethod}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
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
  );
}

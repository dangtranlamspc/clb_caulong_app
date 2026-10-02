"use client";

import { sortSizes } from "@/utils/utils";

export function ShirtOrderForm({
  canRegister,
  hasExistingSelection,
  selectedGender,
  setSelectedGender,
  sizesForGender,
  sizeOrderCounts,
  cartSizesForCurrent,
  sizeQuantities,
  toggleSize,
  changeQty,
  selectedSizeList,
  jerseyNumber,
  setJerseyNumber,
  printName,
  setPrintName,
  handlePlaceOrder,
  placingOrder,
}: {
  canRegister: boolean;
  hasExistingSelection: boolean;
  selectedGender: "nam" | "nu";
  setSelectedGender: (g: "nam" | "nu") => void;
  sizesForGender: string[];
  sizeOrderCounts: Record<string, number>;
  cartSizesForCurrent: Set<string>;
  sizeQuantities: Record<string, number>;
  toggleSize: (s: string) => void;
  changeQty: (s: string, delta: number) => void;
  selectedSizeList: string[];
  jerseyNumber: string;
  setJerseyNumber: (v: string) => void;
  printName: string;
  setPrintName: (v: string) => void;
  handlePlaceOrder: () => void;
  placingOrder: boolean;
}) {
  return (
    <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-[var(--text)]">2. Thông tin đặt áo</h3>

      {!canRegister && !hasExistingSelection ? (
        <p className="text-sm text-[var(--text-faint)] text-center py-2">Đã đóng đăng ký</p>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
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
                    : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                    }`}
                >
                  {g === "nam" ? "Nam" : "Nữ"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Size áo (có thể chọn nhiều size, kể cả size đã đặt trước đó)
            </label>
            {sizesForGender.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">
                Chưa có size nào được cấu hình cho giới tính này
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizesForGender.map((s) => {
                  const orderCount = sizeOrderCounts[s] ?? 0;
                  const isInCart = cartSizesForCurrent.has(s);
                  const isSelected = sizeQuantities[s] != null;
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      disabled={!canRegister}
                      className={`relative w-11 h-11 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : isInCart
                          ? "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]"
                          : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]"
                        }`}
                    >
                      {s}
                      {orderCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {orderCount}
                        </span>
                      )}
                      {isInCart && (
                        <span className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-white text-[8px] font-bold flex items-center justify-center">
                          +
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {Object.keys(sizeOrderCounts).length > 0 && (
              <p className="text-[11px] text-[var(--text-faint)] mt-1.5">
                Số trong góc mỗi size là số lượng bạn đã đặt trước đó của size này — vẫn có thể đặt thêm.
              </p>
            )}
            {cartSizesForCurrent.size > 0 && (
              <p className="text-[11px] text-[var(--warning)] mt-1">
                Size có dấu + đã có trong giỏ hàng (chưa gửi đơn).
              </p>
            )}
          </div>

          {selectedSizeList.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-muted)]">
                Số lượng theo từng size
              </label>
              {sortSizes(selectedSizeList).map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <span className="text-sm font-semibold text-[var(--text)]">Size {s}</span>
                  <div className="inline-flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => changeQty(s, -1)}
                      disabled={!canRegister}
                      className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">
                      {sizeQuantities[s]}
                    </span>
                    <button
                      onClick={() => changeQty(s, 1)}
                      disabled={!canRegister}
                      className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedSizeList.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Số áo (tuỳ chọn)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  disabled={!canRegister}
                  placeholder="VD: 09"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Tên in trên áo (tuỳ chọn)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={printName}
                  onChange={(e) => setPrintName(e.target.value)}
                  disabled={!canRegister}
                  placeholder="VD: MINH"
                  className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {canRegister && (
            <button
              onClick={handlePlaceOrder}
              disabled={selectedSizeList.length === 0}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Thêm vào giỏ hàng
            </button>
          )}
        </>
      )}
    </div>
  );
}
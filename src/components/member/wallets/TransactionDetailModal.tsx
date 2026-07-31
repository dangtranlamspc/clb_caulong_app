import { Loader2, Users, XIcon, Ban, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { activitiesApi, registrationsApi, penaltiesApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { smt, txIcon } from "@/lib/wallet-helpers";

const TX_TYPE_LABEL: Record<string, string> = {
  topup: "Nạp tiền",
  session_payment: "Thanh toán buổi đánh",
  manual_expense: "Chi tiêu khác (admin ghi nhận)",
  manual_credit: "Cộng tiền khác (admin ghi nhận)",
  refund: "Hoàn tiền",
  penalty: "Phạt",
};

const PENALTY_TYPE_LABEL: Record<string, string> = {
  late_early: "Đi trễ / về sớm",
  special: "Trường hợp đặc biệt",
  other: "Khác",
};

export function TransactionDetailModal({
  tx,
  onClose,
  transactions = [],
}: {
  tx: any;
  onClose: () => void;
  transactions?: any[];
}) {
  const isPositive = tx.amount > 0;
  const { Icon, cls } = txIcon(tx);

  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const isSessionPayment =
    tx.type === "session_payment" &&
    tx.reference_type === "registration" &&
    tx.reference_id;

  const isShirtOrder =
    tx.reference_type === "shirt_order_registration" && tx.reference_id;

  const isPenaltyPayment =
    tx.type === "penalty" &&
    tx.reference_type === "penalty" &&
    tx.reference_id;

  const hasSnapshot = isSessionPayment && Boolean(tx.metadata);

  const shouldFetch = isSessionPayment || isShirtOrder || isPenaltyPayment;

  const shirtOrderLabel = isShirtOrder
    ? tx.amount > 0
      ? "Hoàn tiền đặt áo"
      : "Thanh toán đặt áo"
    : null;

  useEffect(() => {
    if (!shouldFetch) return;
    let ignore = false;
    setLoadingDetail(true);

    const request = isShirtOrder
      ? activitiesApi.getShirtOrderRegistrationDetail(tx.reference_id)
      : isPenaltyPayment
        ? penaltiesApi.getDetail(tx.reference_id)
        : registrationsApi.getDetail(tx.reference_id);

    request
      .then(({ data }) => { if (!ignore) setDetail(data); })
      .catch(() => { if (!ignore) setDetail(null); })
      .finally(() => { if (!ignore) setLoadingDetail(false); });

    return () => { ignore = true; };
  }, [tx.reference_id]);

  const reg = detail?.registration;
  const liveGuests = detail?.grouped_guests ?? [];
  const penalty = isPenaltyPayment ? detail : null;

  const isRefunded = isSessionPayment && transactions.some((t: any) =>
    t.type === 'refund' &&
    new Date(t.created_at).getTime() > new Date(tx.created_at).getTime() &&
    typeof t.description === 'string' && tx.title && t.description.includes(tx.title)
  );

  const isReversed =
    isSessionPayment && (isRefunded || (!loadingDetail && (!reg || reg.payment_status !== "confirmed")));

  const sessionStatus = reg?.sessions?.status;
  const isSessionCancelled = sessionStatus === "cancelled";

  const displaySessionTitle = hasSnapshot
    ? tx.metadata.session_title
    : reg?.sessions?.title;
  const displayBase = hasSnapshot ? (tx.metadata.base_amount ?? 0) : (reg?.base_amount ?? 0);
  const displayOtherFee = hasSnapshot
    ? (tx.metadata.other_fee_amount ?? 0)
    : (reg?.other_fee_amount ?? 0);
  const displayOtherFeeNote = hasSnapshot
    ? tx.metadata.other_fee_note
    : reg?.other_fee_note;
  const displayGuests = hasSnapshot ? (tx.metadata.guests ?? []) : liveGuests;
  const displayTotal = hasSnapshot
    ? (tx.metadata.total_amount ?? 0)
    : displayBase +
    displayOtherFee +
    liveGuests.reduce(
      (s: number, g: any) => s + (g.base_amount ?? 0) + (g.other_fee_amount ?? 0),
      0,
    );

  const isLoadingSessionDetail = isSessionPayment && loadingDetail;
  const sessionDetailFailed = isSessionPayment && !hasSnapshot && !loadingDetail && !reg;

  const isLoadingPenaltyDetail = isPenaltyPayment && loadingDetail;
  const penaltyDetailFailed = isPenaltyPayment && !loadingDetail && !penalty;

  if (typeof document === "undefined") return null;

  const shirtReg = isShirtOrder ? detail?.registration : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end transition-opacity duration-250"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transitionDuration: "250ms",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full bg-white rounded-t-2xl transition-transform ease-out hide-scrollbar"
        style={{
          maxHeight: "100vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transitionDuration: "280ms",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx>{`
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="sticky top-0 z-20 bg-white rounded-t-2xl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">
              Chi tiết giao dịch
            </p>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <XIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div className={`px-5 py-5 space-y-5 ${isReversed ? "blur-[1px] select-none pointer-events-none" : ""}`}>
            <div className="flex flex-col items-center text-center gap-2">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${cls}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <p
                className={`text-2xl font-black ${isPositive ? "text-emerald-600" : "text-red-500"}`}
              >
                {isPositive ? "+" : ""}
                {smt(tx.amount)}
              </p>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                {shirtOrderLabel ?? TX_TYPE_LABEL[tx.type] ?? tx.type}
              </span>
            </div>

            <div className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-400">Tiêu đề</span>
                <span className="font-semibold text-gray-900 text-right">
                  {tx.title}
                </span>
              </div>
              {tx.description && (
                <div className="px-4 py-3 text-sm">
                  <p className="text-gray-400 mb-1">Diễn giải</p>
                  <p className="text-gray-700">{tx.description}</p>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-400">Thời gian</span>
                <span className="font-medium text-gray-700">
                  {format(new Date(tx.created_at), "HH:mm, dd/MM/yyyy", {
                    locale: vi,
                  })}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-gray-400">Số dư sau giao dịch</span>
                <span className="font-bold text-gray-900">
                  {smt(tx.balance_after)}
                </span>
              </div>
            </div>

            {isPenaltyPayment && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Chi tiết khoản phạt
                </p>

                {isLoadingPenaltyDetail ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : penaltyDetailFailed ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="rounded-xl bg-white border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-gray-50 overflow-hidden">
                    {penalty?.sessions?.title ? (
                      <div className="flex justify-between px-4 py-2.5 text-sm bg-blue-50/50">
                        <span className="text-gray-500">Buổi đánh</span>
                        <div className="text-right">
                          <p className="font-semibold text-blue-700">
                            {penalty.sessions.title}
                          </p>
                          {penalty.sessions.scheduled_at && (
                            <p className="text-[11px] text-gray-400">
                              {format(new Date(penalty.sessions.scheduled_at), "dd/MM/yyyy", { locale: vi })}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-400">Buổi đánh</span>
                        <span className="text-gray-400">Không gắn buổi nào</span>
                      </div>
                    )}

                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Loại phạt
                      </span>
                      <span className="font-medium text-gray-800">
                        {PENALTY_TYPE_LABEL[penalty?.type] ?? penalty?.type}
                      </span>
                    </div>

                    <div className="px-4 py-2.5 text-sm">
                      <p className="text-gray-500 mb-1">Lý do</p>
                      <p className="text-gray-700">{penalty?.reason}</p>
                    </div>

                    <div className="flex justify-between px-4 py-3 text-sm bg-gray-50">
                      <span className="font-semibold text-gray-700">Số tiền phạt</span>
                      <span className="font-bold text-red-500">
                        {smt(Number(penalty?.amount ?? 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSessionPayment && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Chi tiết khoản thanh toán
                </p>

                {isLoadingSessionDetail ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : sessionDetailFailed ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="space-y-3">
                    {displaySessionTitle && (
                      <div className="flex justify-between px-4 py-2.5 text-sm bg-blue-50/50 rounded-xl">
                        <span className="text-gray-500">Buổi đánh</span>
                        <span className="font-semibold text-blue-700 text-right">
                          {displaySessionTitle}
                        </span>
                      </div>
                    )}

                    <div className="rounded-xl bg-white border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-gray-50 overflow-hidden">
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500">
                          Tiền sân + cầu của bạn
                        </span>
                        <span className="font-medium text-gray-800">
                          {smt(displayBase)}
                        </span>
                      </div>

                      {displayOtherFee > 0 ? (
                        <div className="px-4 py-2.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Khoản khác của bạn
                            </span>
                            <span className="font-medium text-amber-600">
                              {smt(displayOtherFee)}
                            </span>
                          </div>
                          {displayOtherFeeNote && (
                            <p className="text-xs text-gray-400 italic mt-0.5">
                              {displayOtherFeeNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-gray-400">Khoản khác</span>
                          <span className="text-gray-400">Không có</span>
                        </div>
                      )}

                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-600">Tổng của bạn</span>
                        <span className="font-bold text-red-500">
                          {smt(displayBase + displayOtherFee)}
                        </span>
                      </div>
                    </div>

                    {displayGuests.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-purple-600 font-medium flex items-center gap-1 px-1">
                          <Users className="w-3 h-3" /> Gộp thanh toán cùng{" "}
                          {displayGuests.length} khách
                        </p>
                        {displayGuests.map((g: any, idx: number) => {
                          const gName = hasSnapshot
                            ? g.name
                            : g.is_guest
                              ? g.guest_full_name
                              : g.users?.full_name;
                          const gBase = g.base_amount ?? 0;
                          const gOtherFee = g.other_fee_amount ?? 0;
                          const gTotal = gBase + gOtherFee;

                          return (
                            <div
                              key={g.id ?? idx}
                              className="rounded-xl bg-white border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] px-4 py-2.5"
                            >
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">+ {gName}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-400 mt-0.5 pl-3">
                                <span>Tiền sân + cầu</span>
                                <span>{smt(gBase)}</span>
                              </div>
                              {gOtherFee > 0 && (
                                <div className="flex justify-between text-xs mt-0.5 pl-3">
                                  <span className="text-amber-500">
                                    Khoản khác
                                  </span>
                                  <div className="text-right">
                                    <span className="text-amber-600 font-medium">
                                      {smt(gOtherFee)}
                                    </span>
                                    {g.other_fee_note && (
                                      <p className="text-gray-400 italic">
                                        {g.other_fee_note}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between text-sm mt-1.5 pt-1.5 border-t border-gray-50">
                                <span className="font-medium text-gray-600">
                                  Tổng của {gName}
                                </span>
                                <span className="font-bold text-red-500">
                                  {smt(gTotal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-400">Gộp với khách</span>
                        <span className="text-gray-400">
                          Không, thanh toán riêng
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between px-4 py-3 text-sm bg-white rounded-xl border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)]">
                      <span className="font-semibold text-gray-700">
                        Tổng bạn đã trả
                      </span>
                      <span className="font-bold text-red-500">
                        {smt(displayTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}


            {isShirtOrder && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Chi tiết đơn đặt áo
                </p>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : !shirtReg ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="rounded-xl bg-white border border-gray-50 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-gray-50 overflow-hidden">
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Loại áo</span>
                      <span className="font-medium text-gray-800">
                        {shirtReg.shirt_type_name}
                      </span>
                    </div>
                    {shirtReg.color_name && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500">Màu sắc</span>
                        <span className="font-medium text-gray-800">
                          {shirtReg.color_name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Size</span>
                      <span className="font-medium text-gray-800">{shirtReg.size}</span>
                    </div>
                    {(shirtReg.jersey_number || shirtReg.print_name) && (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-gray-500">Số áo / Tên in</span>
                        <span className="font-medium text-gray-800 text-right">
                          {shirtReg.jersey_number && `Số ${shirtReg.jersey_number}`}
                          {shirtReg.jersey_number && shirtReg.print_name && " · "}
                          {shirtReg.print_name && `"${shirtReg.print_name}"`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Số lượng</span>
                      <span className="font-medium text-gray-800">{shirtReg.quantity}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-500">Đơn giá</span>
                      <span className="font-medium text-gray-800">
                        {smt(shirtReg.unit_price)}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-sm bg-gray-50">
                      <span className="font-semibold text-gray-700">Thành tiền</span>
                      <span className="font-bold text-gray-900">
                        {smt(shirtReg.total_amount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isReversed && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-white/70">
              <Ban className="w-6 h-6 text-gray-400" />
              <p className="text-base font-bold text-gray-600 text-center px-6">
                {isSessionCancelled
                  ? "Buổi đánh đã bị hủy"
                  : "Hóa đơn đã được hoàn tác"}
              </p>
              <p className="text-sm font-semibold text-emerald-600">
                Đã hoàn tiền
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
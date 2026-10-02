import { Loader2, Users, XIcon, Ban, AlertTriangle, Share2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { activitiesApi, registrationsApi, fundApi } from "@/lib/api";
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
  const [sharingReceipt, setSharingReceipt] = useState(false);
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

  const isTournamentPayment =
    tx.reference_type === "tournament_registration" && tx.reference_id;

  const shirtOrderLabel = isShirtOrder
    ? tx.amount > 0
      ? "Hoàn tiền đặt áo"
      : "Thanh toán đặt áo"
    : null;

  const tournamentLabel = isTournamentPayment
    ? tx.amount > 0
      ? "Hoàn tiền giải đấu"
      : "Thanh toán giải đấu"
    : null;

  const isPenaltyPayment =
    tx.type === "penalty" &&
    tx.reference_type === "penalty" &&
    tx.reference_id;

  const hasSnapshot = isSessionPayment && Boolean(tx.metadata);

  const shouldFetch = isSessionPayment || isShirtOrder || isPenaltyPayment;

  const shirtOrderRegIds: string[] = isShirtOrder
    ? (tx.metadata?.registration_ids?.length ? tx.metadata.registration_ids : [tx.reference_id])
    : [];
  const isShirtOrderBatch = shirtOrderRegIds.length > 1;

  useEffect(() => {
    if (!shouldFetch) return;
    let ignore = false;
    setLoadingDetail(true);

    const request = isShirtOrder
      ? isShirtOrderBatch
        ? activitiesApi.getShirtOrderRegistrationsDetailBatch(shirtOrderRegIds)
        : activitiesApi.getShirtOrderRegistrationDetail(tx.reference_id)
      : isPenaltyPayment
        ? fundApi.getPenaltyById(tx.reference_id)
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

  const handleShareReceipt = async () => {
    if (sharingReceipt) return;
    setSharingReceipt(true);
    try {
      const html2canvas = (await import("html2canvas")).default;

      const guestsList = displayGuests.map((g: any) => {
        const gName = hasSnapshot
          ? g.name
          : g.is_guest
            ? g.guest_full_name
            : g.users?.full_name;
        return {
          name: gName,
          baseAmount: g.base_amount ?? 0,
          otherFeeAmount: g.other_fee_amount ?? 0,
          otherFeeNote: g.other_fee_note,
        };
      });

      const noteLinesHtml = (note?: string, prefix = "— ") =>
        (note ?? "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map(
            (line) =>
              `<p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">${prefix}${line}</p>`,
          )
          .join("");

      const otherFeeBox = (amount: number, note?: string, label = "Khoản khác của bạn") => {
        if (amount <= 0) return "";
        const noteHtml = noteLinesHtml(note);
        if (!noteHtml) {
          return `
          <div style="display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;border-top:1px solid #f3f4f6;">
            <span style="color:#9ca3af;">${label}</span>
            <span style="font-weight:500;color:#d97706;">${smt(amount)}</span>
          </div>
        `;
        }
        return `
        <div style="padding:10px 16px;border-top:1px solid #f3f4f6;">
          <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">${label}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:8px 10px;">
            <div style="flex:1;min-width:0;">${noteHtml}</div>
            <span style="font-weight:600;color:#d97706;font-size:13px;flex-shrink:0;">${smt(amount)}</span>
          </div>
        </div>
      `;
      };

      const row = (
        label: string,
        value: string,
        opts?: { bold?: boolean; shaded?: boolean },
      ) => `
      <div style="display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;background:${opts?.shaded ? "#f9fafb" : "transparent"};border-top:1px solid #f3f4f6;">
        <span style="color:${opts?.bold ? "#374151" : "#9ca3af"};font-weight:${opts?.bold ? 600 : 400};">${label}</span>
        <span style="font-weight:${opts?.bold ? 700 : 500};color:${opts?.bold ? "#ef4444" : "#111827"};">${value}</span>
      </div>
    `;

      const guestCardsHtml = guestsList
        .map(
          (g: any) => `
          <div style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="padding:10px 16px 0;font-size:13px;">
              <span style="color:#9ca3af;">+ </span>${g.name}
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 16px 10px;padding-left:28px;font-size:12px;color:#9ca3af;">
              <span>Tiền sân + cầu</span>
              <span>${smt(g.baseAmount)}</span>
            </div>
            ${g.otherFeeAmount > 0
              ? `
              <div style="padding:0 16px 10px;padding-left:28px;">
                <p style="margin:0 0 4px;font-size:12px;color:#d97706;">Khoản khác</p>
                ${noteLinesHtml(g.otherFeeNote, "")
                ? `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:8px 10px;">
                    <div style="flex:1;min-width:0;">${noteLinesHtml(g.otherFeeNote, "")}</div>
                    <span style="font-weight:600;color:#d97706;font-size:12px;flex-shrink:0;">${smt(g.otherFeeAmount)}</span>
                  </div>
                `
                : `
                  <div style="display:flex;justify-content:space-between;">
                    <span></span>
                    <span style="font-weight:600;color:#d97706;font-size:12px;">${smt(g.otherFeeAmount)}</span>
                  </div>
                `
              }
              </div>
            `
              : ""
            }
            <div style="display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid #f3f4f6;">
              <span style="font-size:13px;font-weight:600;color:#4b5563;">Tổng của ${g.name}</span>
              <span style="font-size:13px;font-weight:700;color:#ef4444;">${smt(g.baseAmount + g.otherFeeAmount)}</span>
            </div>
          </div>
        `,
        )
        .join("");

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "420px";
      document.body.appendChild(container);

      container.innerHTML = `
      <div style="width:420px;background:#ffffff;padding:24px;font-family:inherit;">
        <div style="text-align:center;margin-bottom:16px;">
          <p style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.5px;margin:0;">BNB BADMINTON CLUB</p>
          <p style="font-size:11px;color:#9ca3af;margin:2px 0 0;">Biên lai thanh toán</p>
        </div>

        <p style="font-size:11px;font-weight:600;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px;">
          Chi tiết khoản thanh toán
        </p>

        <div style="background:#eff6ff;border-radius:12px;display:flex;justify-content:space-between;padding:10px 16px;margin-bottom:12px;">
          <span style="font-size:13px;color:#6b7280;">Buổi đánh</span>
          <span style="font-size:13px;font-weight:600;color:#1d4ed8;">${displaySessionTitle ?? "—"}</span>
        </div>

        <div style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);margin-bottom:${guestsList.length > 0 ? "12" : "16"}px;">
          ${row("Tiền sân + cầu của bạn", smt(displayBase)).replace('border-top:1px solid #f3f4f6;', 'border-top:none;')}
          ${otherFeeBox(displayOtherFee, displayOtherFeeNote)}
          ${row("Tổng của bạn", smt(displayBase + displayOtherFee), { bold: true })}
        </div>

        ${guestsList.length > 0
          ? `
          <p style="font-size:12px;font-weight:600;color:#9333ea;margin:0 0 8px;">
            👥 Gộp thanh toán cùng ${guestsList.length} khách
          </p>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${guestCardsHtml}
          </div>
        `
          : ""
        }

        <div style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;display:flex;justify-content:space-between;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <span style="font-size:13px;font-weight:600;color:#374151;">Tổng bạn đã trả</span>
          <span style="font-size:14px;font-weight:700;color:#ef4444;">${smt(displayTotal)}</span>
        </div>

        <p style="text-align:center;font-size:10px;color:#d1d5db;margin-top:18px;">
          Xuất lúc ${format(new Date(), "HH:mm, dd/MM/yyyy", { locale: vi })}
        </p>
      </div>
    `;

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      document.body.removeChild(container);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("Không tạo được ảnh");

      const fileName = `bien-lai-${(displaySessionTitle ?? "buoi-danh").replace(/\s+/g, "-")}-${tx.id ?? Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        (navigator as any).canShare?.({ files: [file] })
      ) {
        await (navigator as any).share({
          files: [file],
          title: "Biên lai thanh toán — BNB Badminton",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("[handleShareReceipt] failed:", err);
      }
    } finally {
      setSharingReceipt(false);
    }
  };


  const shirtRegs: any[] = isShirtOrder
    ? isShirtOrderBatch
      ? (detail?.registrations ?? [])
      : (detail?.registration ? [detail.registration] : [])
    : [];
  const shirtOrderTotal = isShirtOrderBatch
    ? (detail?.total_amount ?? 0)
    : (shirtRegs[0]?.total_amount ?? 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end transition-opacity duration-250"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transitionDuration: "250ms",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full bg-[var(--surface)] rounded-t-2xl transition-transform ease-out hide-scrollbar"
        style={{
          maxHeight: "90vh",
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

        <div className="sticky top-0 z-20 bg-[var(--surface)] rounded-t-2xl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-bold text-[var(--text)]">
              Chi tiết giao dịch
            </p>
            <div className="flex items-center gap-2">
              {isSessionPayment && !isLoadingSessionDetail && !sessionDetailFailed && !isReversed && (
                <button
                  type="button"
                  onClick={handleShareReceipt}
                  disabled={sharingReceipt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {sharingReceipt ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  Chia sẻ
                </button>
              )}
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0"
              >
                <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
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
                className={`text-2xl font-black ${isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
              >
                {isPositive ? "+" : ""}
                {smt(tx.amount)}
              </p>
              <span className="text-xs font-medium text-[var(--text-faint)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
                {shirtOrderLabel ?? tournamentLabel ?? TX_TYPE_LABEL[tx.type] ?? tx.type}
              </span>
            </div>

            <div className="bg-[var(--surface)] rounded-xl divide-y divide-[var(--border)] overflow-hidden border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-faint)]">Tiêu đề</span>
                <span className="font-semibold text-[var(--text)] text-right">
                  {tx.title}
                </span>
              </div>
              {tx.description && (
                <div className="px-4 py-3 text-sm">
                  <p className="text-[var(--text-faint)] mb-1">Diễn giải</p>
                  <p className="text-[var(--text)]">{tx.description}</p>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-faint)]">Thời gian</span>
                <span className="font-medium text-[var(--text)]">
                  {format(new Date(tx.created_at), "HH:mm, dd/MM/yyyy", {
                    locale: vi,
                  })}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-faint)]">Số dư sau giao dịch</span>
                <span className="font-bold text-[var(--text)]">
                  {smt(tx.balance_after)}
                </span>
              </div>
            </div>

            {isPenaltyPayment && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-2">
                  Chi tiết khoản phạt
                </p>

                {isLoadingPenaltyDetail ? (
                  <div className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : penaltyDetailFailed ? (
                  <p className="text-sm text-[var(--text-faint)] text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-[var(--border)] overflow-hidden">
                    {penalty?.session?.title ? (
                      <div className="flex justify-between px-4 py-2.5 text-sm bg-[var(--primary-soft)]">
                        <span className="text-[var(--text-muted)]">Buổi đánh</span>
                        <div className="text-right">
                          <p className="font-semibold text-[var(--primary)]">
                            {penalty.session.title}
                          </p>
                          {penalty.session.scheduled_at && (
                            <p className="text-[11px] text-[var(--text-faint)]">
                              {format(new Date(penalty.session.scheduled_at), "dd/MM/yyyy", { locale: vi })}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-[var(--text-faint)]">Buổi đánh</span>
                        <span className="text-[var(--text-faint)]">Không gắn buổi nào</span>
                      </div>
                    )}

                    <div className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" /> Loại phạt
                      </span>
                      <span className="font-medium text-[var(--text)]">
                        {PENALTY_TYPE_LABEL[penalty?.penalty_type] ?? penalty?.penalty_type ?? "—"}
                      </span>
                    </div>

                    <div className="px-4 py-2.5 text-sm">
                      <p className="text-[var(--text-muted)] mb-1">Lý do</p>
                      <p className="text-[var(--text)]">{penalty?.description ?? penalty?.title}</p>
                    </div>

                    <div className="flex justify-between px-4 py-3 text-sm bg-[var(--surface-muted)]">
                      <span className="font-semibold text-[var(--text)]">Số tiền phạt</span>
                      <span className="font-bold text-[var(--danger)]">
                        {smt(Number(penalty?.amount ?? 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSessionPayment && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-2">
                  Chi tiết khoản thanh toán
                </p>

                {isLoadingSessionDetail ? (
                  <div className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : sessionDetailFailed ? (
                  <p className="text-sm text-[var(--text-faint)] text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="space-y-3">
                    {displaySessionTitle && (
                      <div className="flex justify-between px-4 py-2.5 text-sm bg-[var(--primary-soft)] rounded-xl">
                        <span className="text-[var(--text-muted)]">Buổi đánh</span>
                        <span className="font-semibold text-[var(--primary)] text-right">
                          {displaySessionTitle}
                        </span>
                      </div>
                    )}

                    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-[var(--border)] overflow-hidden">
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-[var(--text-muted)]">
                          Tiền sân + cầu của bạn
                        </span>
                        <span className="font-medium text-[var(--text)]">
                          {smt(displayBase)}
                        </span>
                      </div>

                      {displayOtherFee > 0 ? (
                        <div className="px-4 py-2.5 text-sm">
                          {displayOtherFeeNote ? (
                            <div className="space-y-1.5">
                              <span className="text-[var(--text-muted)]">Khoản khác của bạn</span>
                              <div className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-2.5 py-1.5">
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  {displayOtherFeeNote
                                    .split("\n")
                                    .map((l: string) => l.trim())
                                    .filter(Boolean)
                                    .map((line: string, i: number) => (
                                      <p key={i} className="text-xs text-[var(--text-faint)] italic">
                                        — {line}
                                      </p>
                                    ))}
                                </div>
                                <span className="font-medium text-[var(--warning)] flex-shrink-0">
                                  {smt(displayOtherFee)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)]">Khoản khác của bạn</span>
                              <span className="font-medium text-[var(--warning)]">
                                {smt(displayOtherFee)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[var(--text-faint)]">Khoản khác</span>
                          <span className="text-[var(--text-faint)]">Không có</span>
                        </div>
                      )}

                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="font-medium text-[var(--text-muted)]">Tổng của bạn</span>
                        <span className="font-bold text-[var(--danger)]">
                          {smt(displayBase + displayOtherFee)}
                        </span>
                      </div>
                    </div>

                    {displayGuests.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--purple)] font-medium flex items-center gap-1 px-1">
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
                              className="rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] px-4 py-2.5"
                            >
                              <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-muted)]">+ {gName}</span>
                              </div>
                              <div className="flex justify-between text-xs text-[var(--text-faint)] mt-0.5 pl-3">
                                <span>Tiền sân + cầu</span>
                                <span>{smt(gBase)}</span>
                              </div>
                              {gOtherFee > 0 && (
                                <div className="mt-0.5 pl-3 text-xs">
                                  {g.other_fee_note ? (
                                    <div className="space-y-1">
                                      <span className="text-[var(--warning)]">Khoản khác</span>
                                      <div className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-2.5 py-1.5">
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                          {g.other_fee_note
                                            .split("\n")
                                            .map((l: string) => l.trim())
                                            .filter(Boolean)
                                            .map((line: string, i: number) => (
                                              <p key={i} className="text-[var(--text-faint)] italic">
                                                {line}
                                              </p>
                                            ))}
                                        </div>
                                        <span className="text-[var(--warning)] font-medium flex-shrink-0">
                                          {smt(gOtherFee)}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-[var(--warning)]">Khoản khác</span>
                                      <span className="text-[var(--warning)] font-medium">{smt(gOtherFee)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-between text-sm mt-1.5 pt-1.5 border-t border-[var(--border)]">
                                <span className="font-medium text-[var(--text-muted)]">
                                  Tổng của {gName}
                                </span>
                                <span className="font-bold text-[var(--danger)]">
                                  {smt(gTotal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex justify-between px-4 py-2.5 text-sm">
                        <span className="text-[var(--text-faint)]">Gộp với khách</span>
                        <span className="text-[var(--text-faint)]">
                          Không, thanh toán riêng
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between px-4 py-3 text-sm bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)]">
                      <span className="font-semibold text-[var(--text)]">
                        Tổng bạn đã trả
                      </span>
                      <span className="font-bold text-[var(--danger)]">
                        {smt(displayTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}


            {isShirtOrder && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-2">
                  Chi tiết đơn đặt áo {isShirtOrderBatch && `(${shirtRegs.length} sản phẩm)`}
                </p>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : shirtRegs.length === 0 ? (
                  <p className="text-sm text-[var(--text-faint)] text-center py-4">
                    Không tải được chi tiết
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shirtRegs.map((shirtReg: any) => (
                      <div
                        key={shirtReg.id}
                        className="rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)] divide-y divide-[var(--border)] overflow-hidden"
                      >
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[var(--text-muted)]">Loại áo</span>
                          <span className="font-medium text-[var(--text)]">{shirtReg.shirt_type_name}</span>
                        </div>
                        {shirtReg.color_name && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-[var(--text-muted)]">Màu sắc</span>
                            <span className="font-medium text-[var(--text)]">{shirtReg.color_name}</span>
                          </div>
                        )}
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[var(--text-muted)]">Size</span>
                          <span className="font-medium text-[var(--text)]">{shirtReg.size}</span>
                        </div>
                        {(shirtReg.jersey_number || shirtReg.print_name) && (
                          <div className="flex justify-between px-4 py-2.5 text-sm">
                            <span className="text-[var(--text-muted)]">Số áo / Tên in</span>
                            <span className="font-medium text-[var(--text)] text-right">
                              {shirtReg.jersey_number && `Số ${shirtReg.jersey_number}`}
                              {shirtReg.jersey_number && shirtReg.print_name && " · "}
                              {shirtReg.print_name && `"${shirtReg.print_name}"`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[var(--text-muted)]">Số lượng</span>
                          <span className="font-medium text-[var(--text)]">{shirtReg.quantity}</span>
                        </div>
                        <div className="flex justify-between px-4 py-2.5 text-sm">
                          <span className="text-[var(--text-muted)]">Đơn giá</span>
                          <span className="font-medium text-[var(--text)]">{smt(shirtReg.unit_price)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-3 text-sm bg-[var(--surface-muted)]">
                          <span className="font-semibold text-[var(--text)]">Thành tiền</span>
                          <span className="font-bold text-[var(--text)]">{smt(shirtReg.total_amount)}</span>
                        </div>
                      </div>
                    ))}

                    {isShirtOrderBatch && (
                      <div className="flex justify-between px-4 py-3 text-sm bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.1)]">
                        <span className="font-semibold text-[var(--text)]">Tổng cả đơn</span>
                        <span className="font-bold text-[var(--danger)]">{smt(shirtOrderTotal)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isReversed && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]">
              <Ban className="w-6 h-6 text-[var(--text-faint)]" />
              <p className="text-base font-bold text-[var(--text-muted)] text-center px-6">
                {isSessionCancelled
                  ? "Buổi đánh đã bị hủy"
                  : "Hóa đơn đã được hoàn tác"}
              </p>
              <p className="text-sm font-semibold text-[var(--success)]">
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
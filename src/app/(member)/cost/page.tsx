"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sessionsApi } from "../../../lib/api";
import { RefreshCw, Wallet, X, Loader2, Users, TrendingUp, TrendingDown, ChevronDown, CalendarDays, Scale } from "lucide-react";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

function fmt(n: number) {
  const val = n ?? 0;
  if (Math.abs(val) >= 1_000_000)
    return (val / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + "k";
  return new Intl.NumberFormat("vi-VN").format(val);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n ?? 0) + "đ";
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return {
    full: `${days[d.getDay()]} · ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
  };
}
function groupByMonth(items: any[]): { month: string; items: any[] }[] {
  const map: Record<string, any[]> = {};
  for (const s of items) {
    const d = new Date(s.session.scheduled_at);
    const key = `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return Object.keys(map).map((month) => ({ month, items: map[month] }));
}

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      {children}
    </div>
  );
}


/**
 * Thay thế 2 component cũ: FeeRow và SessionCostDetailModal.
 *
 * 1) Cập nhật dòng import lucide-react:
 *    import {
 *      RefreshCw, Wallet, X, Loader2, Users, TrendingUp, TrendingDown,
 *      ChevronDown, CalendarDays, Scale,
 *    } from "lucide-react";
 *
 * 2) Dùng lại các thứ đã có sẵn trong file: useState, useEffect, createPortal,
 *    sessionsApi, fmtFull. Props của modal không đổi.
 */

function FeeRow({
  name,
  amount,
  note,
  nested,
}: {
  name: string;
  amount: number;
  note?: string | null;
  nested?: boolean;
}) {
  const lines = (note ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div
      className={
        nested
          ? "ml-1 border-l-2 border-[color-mix(in_srgb,var(--warning)_30%,transparent)] pl-3"
          : ""
      }
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`min-w-0 truncate text-sm text-[var(--text)] ${nested ? "" : "font-semibold"}`}
        >
          {name}
          {nested && (
            <span className="ml-1.5 text-[11px] font-normal text-[var(--text-faint)]">
              đi cùng
            </span>
          )}
        </span>
        <span className="min-w-4 flex-1 -translate-y-[3px] border-b border-dotted border-[color-mix(in_srgb,var(--warning)_30%,transparent)]" />
        <span
          className={`shrink-0 text-sm tabular-nums text-[var(--warning)] ${nested ? "font-medium" : "font-semibold"}`}
        >
          {fmtFull(amount)}
        </span>
      </div>
      {lines.map((l, i) => (
        <p key={i} className="mt-0.5 text-xs italic text-[var(--text-muted)]">
          {l}
        </p>
      ))}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  className = "",
  valueClassName = "text-[var(--text)]",
  icon,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 px-3 py-3 ${className}`}>
      <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[15px] font-bold tabular-nums leading-tight ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function SessionCostDetailModal({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [showFees, setShowFees] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setLoading(true);
    sessionsApi
      .getCostDetail(sessionId)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  // Khoá cuộn nền + đóng bằng phím Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  const chiPhi = detail?.chi_phi;
  const paidList: any[] = detail?.paid_list ?? [];
  const feeList: any[] = chiPhi?.other_fee_list ?? [];

  const totalCost = detail?.summary?.total_cost ?? 0;
  const totalPaid = detail?.summary?.total_paid ?? 0;
  const profit = totalPaid - totalCost;
  const isProfit = profit > 0;
  const isBreakEven = profit === 0;

  const tone = isBreakEven
    ? { text: "text-[var(--primary)]", soft: "bg-[var(--primary-soft)]" }
    : isProfit
      ? { text: "text-[var(--success)]", soft: "bg-[var(--success-soft)]" }
      : { text: "text-[var(--danger)]", soft: "bg-[var(--danger-soft)]" };
  const resultLabel = isBreakEven ? "Hòa vốn" : isProfit ? "Lãi" : "Lỗ";
  const ResultIcon = isBreakEven ? Scale : isProfit ? TrendingUp : TrendingDown;

  const title: string = detail?.session?.title ?? "Chi tiết buổi đánh";
  const sessionDate = detail ? new Date(detail.session.scheduled_at) : null;
  const shortDate = sessionDate
    ? `${String(sessionDate.getDate()).padStart(2, "0")}/${String(sessionDate.getMonth() + 1).padStart(2, "0")}`
    : "";
  // Tiêu đề buổi thường đã chứa ngày (vd "Thứ 5 (01/10)") -> không lặp lại dòng ngày
  const dateLabel =
    sessionDate && !title.includes(shortDate)
      ? sessionDate.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      : null;
  const paidPeople: number = detail?.summary?.total_members ?? 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết buổi đánh"
        className="flex w-full flex-col overflow-hidden rounded-t-3xl bg-[var(--surface)] shadow-2xl sm:max-w-lg sm:rounded-2xl"
        style={{
          maxHeight: "90dvh",
          transform: visible ? "translateY(0)" : "translateY(24px)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 260ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header + kết quả: luôn hiển thị, không cuộn theo nội dung */}
        <div className="shrink-0 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-snug text-[var(--text)]">
                {title}
              </h2>
              {detail && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-faint)]">
                  {dateLabel && (
                    <span className="flex items-center gap-1.5 capitalize">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {dateLabel}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {paidPeople} người đã thanh toán
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:bg-[var(--border-strong)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {detail && (
            <div className="px-5 pb-4">
              <section className="grid grid-cols-3 divide-x divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
                <SummaryCell label="Tổng thu" value={fmtFull(totalPaid)} />
                <SummaryCell label="Tổng chi" value={fmtFull(totalCost)} />
                <SummaryCell
                  label={resultLabel}
                  value={`${isProfit ? "+" : ""}${fmtFull(profit)}`}
                  className={tone.soft}
                  valueClassName={tone.text}
                  icon={<ResultIcon className={`h-3.5 w-3.5 ${tone.text}`} />}
                />
              </section>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 [scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)] [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <div className="animate-pulse space-y-4" aria-busy="true">
              <div className="h-14 rounded-2xl bg-[var(--surface-muted)]" />
              <div className="h-36 rounded-2xl bg-[var(--surface-muted)]" />
              <div className="h-44 rounded-2xl bg-[var(--surface-muted)]" />
            </div>
          ) : !detail ? (
            <p className="py-10 text-center text-sm text-[var(--text-faint)]">
              Không tải được dữ liệu. Đóng cửa sổ này và mở lại để thử lần nữa.
            </p>
          ) : (
            <>
              {/* Chi phí */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text)]">
                  Chi phí buổi đánh
                </h3>
                <div className="space-y-2 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--text-muted)]">🏟 Tiền sân</span>
                    <span className="font-medium tabular-nums text-[var(--text)]">
                      {fmtFull(chiPhi.court_fee)}
                    </span>
                  </div>

                  {chiPhi.shuttle_count > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--text-muted)]">
                        🏸 Tiền cầu
                        <span className="ml-1.5 text-xs text-[var(--text-faint)]">
                          {chiPhi.shuttle_count} × {fmtFull(chiPhi.shuttle_price)}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums text-[var(--text)]">
                        {fmtFull(chiPhi.shuttle_cost)}
                      </span>
                    </div>
                  )}

                  {chiPhi.other_fee > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--text-muted)]">
                        📌 Khoản khác
                        {chiPhi.other_fee_note && (
                          <span className="ml-1.5 text-xs italic text-[var(--text-faint)]">
                            {chiPhi.other_fee_note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-[var(--warning)]">
                        {fmtFull(chiPhi.other_fee)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-dashed border-[var(--border-strong)] pt-2.5">
                    <span className="font-semibold text-[var(--text)]">
                      Tổng chi
                    </span>
                    <span className="font-bold tabular-nums text-[var(--text)]">
                      {fmtFull(totalCost)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Khoản thu khác theo người (thu gọn mặc định) */}
              {feeList.length > 0 && (
                <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)]">
                  <button
                    type="button"
                    onClick={() => setShowFees((v) => !v)}
                    aria-expanded={showFees}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-semibold text-[var(--text)]">
                      Khoản khác theo người
                      <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">
                        {feeList.length} mục
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-[var(--warning)]">
                        {fmtFull(chiPhi.other_fee)}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-[var(--text-muted)] transition-transform duration-300 ${showFees ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{ gridTemplateRows: showFees ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--warning)_30%,transparent)] p-3">
                        {feeList.map((item: any, i: number) => {
                          const hasGuests = (item.guests?.length ?? 0) > 0;
                          return (
                            <div
                              key={i}
                              className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--surface)]"
                            >
                              <div className="space-y-2 px-3 py-2.5">
                                <FeeRow
                                  name={item.name}
                                  amount={item.amount}
                                  note={item.note}
                                />
                                {item.guests?.map((g: any, gi: number) => (
                                  <FeeRow
                                    key={gi}
                                    name={g.name}
                                    amount={g.amount}
                                    note={g.note}
                                    nested
                                  />
                                ))}
                              </div>
                              {hasGuests && (
                                <div className="flex items-center justify-between border-t border-dashed border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-3 py-2">
                                  <span className="text-xs font-medium text-[var(--warning)]">
                                    Tổng nhóm
                                  </span>
                                  <span className="text-sm font-bold tabular-nums text-[var(--warning)]">
                                    {fmtFull(item.total ?? item.amount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Danh sách thu tiền */}
              <section>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Danh sách thu tiền
                  </h3>
                  <span className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
                    <Users className="h-3.5 w-3.5" />
                    {paidList.length} khoản
                  </span>
                </div>

                {paidList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      Chưa có khoản nào được xác nhận thanh toán
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">
                      Tổng thu sẽ cập nhật khi admin xác nhận từng người.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
                    {paidList.map((p: any) => {
                      const groupedNames: string[] = p.guest_names ?? [];
                      const initial =
                        p.full_name?.trim()?.[0]?.toUpperCase() ?? "?";
                      return (
                        <li
                          key={p.registration_id}
                          className="flex items-center gap-3 px-3.5 py-2.5"
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${p.is_guest ? "bg-[var(--surface-muted)] text-[var(--text-muted)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}>
                            {initial}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--text)]">
                              {p.full_name}
                              {p.is_guest && (
                                <span className="ml-1.5 rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                  Khách
                                </span>
                              )}
                            </p>

                            {groupedNames.length > 0 && (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                <span className="text-[11px] text-[var(--text-faint)]">
                                  Gộp cùng
                                </span>
                                {groupedNames.map((n, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-[var(--purple-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--purple)]"
                                  >
                                    {n}
                                  </span>
                                ))}
                              </div>
                            )}

                            {p.other_fee_amount > 0 && (
                              <p className="mt-0.5 text-[11px] text-[var(--warning)]">
                                Gồm khoản khác {fmtFull(p.other_fee_amount)}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--text)]">
                            {fmtFull(p.total_amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SessionCostCard({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  const { session, participants, chi_phi } = item;
  const { full } = fmtDate(session.scheduled_at);
  const isProfit = chi_phi.profit > 0;
  const isBreakEven = chi_phi.profit === 0;
  const profitBorder = isBreakEven
    ? "border-blue-400"
    : isProfit
      ? "border-emerald-400"
      : "border-red-400";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-[var(--surface)] rounded-2xl overflow-hidden border-2 ${profitBorder} shadow-lg -translate-y-0.5 active:scale-[0.99] active:translate-y-0 transition-transform`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--text)]">{full}</p>
          <p className="text-xs text-[var(--text-faint)] mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participants.total} người · ♂ {participants.male_count} · ♀{" "}
            {participants.female_count}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {!isBreakEven && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${isProfit
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--danger-soft)] text-[var(--danger)]"
                }`}
            >
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isProfit ? "Lãi" : "Lỗ"}{" "}
              {isProfit ? "+" : ""}
              {fmt(chi_phi.profit)}
            </span>
          )}
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-xl bg-[var(--surface-muted)] px-3 py-2.5 space-y-1.5">
        <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider mb-2">
          Chi phí thực tế
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">🏟 Sân</span>
          <span className="font-medium text-[var(--text)]">
            {fmtFull(chi_phi.court_fee)}
          </span>
        </div>
        {chi_phi.shuttle_count > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              🏸 Cầu
              <span className="text-[var(--text-faint)] text-xs ml-1">
                {chi_phi.shuttle_count} × {fmt(chi_phi.shuttle_price)}
              </span>
            </span>
            <span className="font-medium text-[var(--text)]">
              {fmtFull(chi_phi.shuttle_cost)}
            </span>
          </div>
        )}
        {chi_phi.other_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              📌 Khoản khác
              {chi_phi.other_fee_note && (
                <span className="text-[var(--text-faint)] text-xs ml-1">
                  ({chi_phi.other_fee_note})
                </span>
              )}
            </span>
            <span className="font-medium text-[var(--warning)]">
              {fmtFull(chi_phi.other_fee)}
            </span>
          </div>
        )}

        <div className="pt-1.5 border-t border-[var(--border)] mt-1 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">💰 Tổng chi</span>
            <span className="font-semibold text-[var(--text)]">
              {fmtFull(chi_phi.total_cost)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">💵 Tổng thu</span>
            <span
              className={`font-semibold ${isBreakEven ? "text-[var(--primary)]" : isProfit ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
            >
              {fmtFull(chi_phi.total_paid)}
            </span>
          </div>
        </div>

        {!isBreakEven && (
          <div className="flex justify-between text-sm pt-1.5 border-t border-[var(--border)] mt-1">
            <span className="font-semibold text-[var(--text)] flex items-center gap-1">
              {isProfit ? <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" /> : <TrendingDown className="w-3.5 h-3.5 text-[var(--danger)]" />}
              {isProfit ? "Lãi" : "Lỗ"}
            </span>
            <span
              className={`font-black ${isProfit ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
            >
              {isProfit ? "+" : ""}
              {fmtFull(chi_phi.profit)}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function SkeletonStats() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-28 bg-[var(--surface)] rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-[var(--surface)] rounded-2xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 bg-[var(--surface)] rounded-2xl" />
      ))}
    </div>
  );
}

const INITIAL_VISIBLE = 2;
const LOAD_STEP = 2;
const LOAD_DELAY_MS = 350;

function SessionCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-4"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-[var(--surface-muted)]" />
          <div className="h-3 w-40 rounded bg-[var(--surface-muted)]" />
        </div>
        <div className="h-6 w-20 rounded-full bg-[var(--surface-muted)]" />
      </div>
      <div className="mt-4 h-36 rounded-xl bg-[var(--surface-muted)]" />
    </div>
  );
}

export default function CostPage() {
  const [data, setData] = useState<{ sessions: any[]; summary: any } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const now = new Date();
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number>(now.getFullYear());

  // ----- Hiện dần danh sách khi cuộn -----
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [armed, setArmed] = useState(false); // chỉ tự tải thêm sau khi người dùng đã cuộn
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: res } = await sessionsApi.getAllCosts({
        month: month ?? undefined,
        year,
      });
      setData(res);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [month, year]);

  // Đổi tháng/năm -> quay về 2 buổi đầu
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoadingMore(false);
    setVisibleCount(INITIAL_VISIBLE);
  }, [month, year]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const completedSessions = data
    ? data.sessions.filter((item: any) => item.session.status === "completed")
    : [];

  const total = completedSessions.length;
  const hasMore = visibleCount < total;
  const remaining = Math.max(0, total - visibleCount);
  const visibleSessions = completedSessions.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    timerRef.current = setTimeout(() => {
      setVisibleCount((c) => c + LOAD_STEP);
      setLoadingMore(false);
    }, LOAD_DELAY_MS);
  }, [loadingMore, hasMore]);

  // Đánh dấu người dùng đã bắt đầu cuộn (chuột, cảm ứng, hoặc cuộn trong bất kỳ vùng nào)
  useEffect(() => {
    if (armed) return;
    const arm = () => setArmed(true);
    window.addEventListener("scroll", arm, { capture: true, passive: true });
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("touchmove", arm, { passive: true });
    return () => {
      window.removeEventListener("scroll", arm, true);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchmove", arm);
    };
  }, [armed]);

  // Khi cuộn gần tới đáy danh sách thì tải thêm (chạy cho cả cuộn trang lẫn vùng cuộn bên trong layout)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !armed || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "0px 0px 240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed, hasMore, loadMore, visibleCount]);

  const grouped = groupByMonth(visibleSessions);
  const s = data?.summary;

  const YEAR_OPTIONS = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[var(--purple)]" /> Chi phí
        </h1>
        <button
          onClick={() => load(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-dark/70 hover:bg-[color-mix(in_srgb,var(--surface)_10%,transparent)] transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <CustomSelect
            value={month ? String(month) : ""}
            onChange={(val) => setMonth(val ? Number(val) : null)}
            placeholder="Cả năm"
            options={[
              { value: "", label: "Cả năm" },
              ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                value: String(m),
                label: `Tháng ${m}`,
              })),
            ]}
          />
        </div>
        <div className="flex-1">
          <CustomSelect
            value={String(year)}
            onChange={(val) => setYear(Number(val))}
            options={YEAR_OPTIONS.map((y) => ({
              value: String(y),
              label: `Năm ${y}`,
            }))}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonStats />
      ) : !data ? (
        <div className="bg-[var(--surface)] rounded-2xl py-14 text-center">
          <p className="text-[var(--text-faint)] text-sm">Không thể tải dữ liệu</p>
        </div>
      ) : (
        <>
          <FadeIn delay={0}>
            <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-violet-600 to-blue-600 dark:from-violet-900 dark:via-indigo-900 dark:to-blue-950 dark:border dark:border-white/10">
              <p className="text-white/75 text-xs mb-3">Tổng quan chi phí thực tế</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/15 dark:bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black">{fmt(s.total_actual_cost)}</p>
                  <p className="text-white/75 text-[10px] mt-0.5">Sân + cầu</p>
                </div>
                <div className="bg-white/15 dark:bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-amber-300">{fmt(s.total_other_fee)}</p>
                  <p className="text-white/75 text-[10px] mt-0.5">Khoản khác</p>
                </div>
                <div className="bg-white/15 dark:bg-white/10 rounded-xl p-3 text-center">
                  <p
                    className={`text-xl font-black ${s.total_profit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {s.total_profit >= 0 ? "+" : ""}
                    {fmt(s.total_profit)}
                  </p>
                  <p className="text-white/75 text-[10px] mt-0.5">
                    {s.total_profit >= 0 ? "Lãi lũy kế" : "Lỗ lũy kế"}
                  </p>
                </div>
                <div className="bg-white/15 dark:bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black">{s.total_male + s.total_female}</p>
                  <p className="text-white/75 text-[10px] mt-0.5">
                    ♂ {s.total_male} · ♀ {s.total_female}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--surface)] rounded-2xl p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-[var(--text)]">
                  {s.total_sessions}
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">Buổi đánh</p>
              </div>
              <div className="bg-[var(--surface)] rounded-2xl p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-[var(--text)]">
                  {s.total_shuttle_count}
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">Quả cầu</p>
              </div>
              <div className="bg-[var(--surface)] rounded-2xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-[var(--text)]">
                  {fmt(s.avg_cost_per_session)}
                </p>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">TB/buổi</p>
              </div>
            </div>
          </FadeIn>

          {grouped.map(({ month: monthLabel, items }, groupIdx) => (
            <div key={monthLabel} className="space-y-3">
              <FadeIn delay={groupIdx === 0 ? 220 : 0}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
                    {monthLabel}
                  </span>
                  <div className="flex-1 h-px bg-[var(--surface-muted)]" />
                </div>
              </FadeIn>
              {items.map((item: any) => {
                const absIdx = visibleSessions.indexOf(item);
                // 2 buổi đầu hiện sau phần tổng quan; các đợt tải thêm hiện lần lượt trong cùng đợt
                const delay =
                  absIdx < INITIAL_VISIBLE
                    ? 260 + absIdx * 80
                    : ((absIdx - INITIAL_VISIBLE) % LOAD_STEP) * 90;
                return (
                  <FadeIn key={item.session.id} delay={delay}>
                    <SessionCostCard
                      item={item}
                      onClick={() => setSelectedSessionId(item.session.id)}
                    />
                  </FadeIn>
                );
              })}
            </div>
          ))}

          {total === 0 && (
            <FadeIn delay={200}>
              <div className="bg-[var(--surface)] rounded-2xl py-14 text-center">
                <p className="text-[var(--text-faint)] text-sm">Chưa có buổi đánh nào hoàn thành</p>
              </div>
            </FadeIn>
          )}

          {hasMore && (
            <div ref={sentinelRef} className="pb-2">
              {loadingMore ? (
                <SessionCardSkeleton />
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  className="mx-auto flex h-10 items-center gap-2 rounded-full bg-[var(--surface-muted)] px-4 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--border-strong)] active:scale-[0.97]"
                >
                  <ChevronDown className="h-4 w-4" />
                  Xem thêm {remaining} buổi
                </button>
              )}
            </div>
          )}

          {!hasMore && total > INITIAL_VISIBLE && (
            <p className="pb-2 text-center text-xs text-[var(--text-faint)]">
              Đã hiển thị hết {total} buổi
            </p>
          )}
        </>
      )}

      {selectedSessionId && (
        <SessionCostDetailModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
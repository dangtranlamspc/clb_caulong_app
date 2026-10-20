"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { sessionsAdminApi } from "@/lib/api";
import { CARD, Chip, formatVnd as fmt } from "./session-ui";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

interface Props {
  sessionId: string;
  refreshKey?: number;
  allConfirmed?: boolean;
}

const toLines = (n?: string | null) =>
  (n ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function Section({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-hover)] sm:px-5"
      >
        <span className="text-sm font-semibold text-[var(--text)]">{title}</span>
        <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          {meta}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-3 sm:px-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Line({
  label,
  sub,
  value,
  amber,
  nested,
  notes,
  strong,
}: {
  label: string;
  sub?: string;
  value: string;
  amber?: boolean;
  nested?: boolean;
  notes?: string | null;
  strong?: boolean;
}) {
  return (
    <div
      className={
        nested
          ? "border-l-2 border-[color-mix(in_srgb,var(--warning)_35%,transparent)] pl-3"
          : ""
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm text-[var(--text)] ${strong ? "font-semibold" : ""}`}>
            {label}
            {sub && (
              <span className="block text-[11px] font-normal text-[var(--text-faint)] sm:ml-1.5 sm:inline">
                {sub}
              </span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${amber ? "text-[var(--warning)]" : "text-[var(--text)]"
            }`}
        >
          {value}
        </span>
      </div>
      {toLines(notes).map((line, i) => (
        <p key={i} className="mt-0.5 text-xs italic text-[var(--text-faint)]">
          {line}
        </p>
      ))}
    </div>
  );
}

export default function SessionCostCard({ sessionId, refreshKey, allConfirmed = false }: Props) {
  const [cost, setCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const fetchCost = useCallback(() => {
    return sessionsAdminApi
      .getCost(sessionId)
      .then(({ data }) => setCost(data))
      .catch(() => { });
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    fetchCost().finally(() => setLoading(false));
  }, [sessionId, fetchCost]);

  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;
    fetchCost();
  }, [refreshKey, fetchCost]);

  if (loading)
    return (
      <div className={`${CARD} h-48 animate-pulse bg-[var(--surface-muted)]`} />
    );
  if (!cost) return null;

  const { chi_phi, paid_list, summary } = cost;
  const hasConfirmed = Boolean(summary.has_confirmed);

  const otherFeeItems: {
    name: string;
    amount: number;
    note?: string | null;
    guests?: { name: string; amount: number; note?: string | null }[];
    total?: number;
  }[] = chi_phi.other_fee_list ?? [];

  const courtBreakdown: {
    name: string;
    minutes?: number;
    price_per_hour: number;
    total: number;
  }[] = Array.isArray(chi_phi.court_breakdown) ? chi_phi.court_breakdown : [];

  const total = Number(summary.total_cost) || 0;
  const paid = Number(summary.total_paid) || 0;
  const remaining = Number(summary.remaining) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const resultLabel =
    remaining > 0 ? "Còn thiếu" : remaining < 0 ? "Thu dư" : "Đủ chi phí";
  const resultTone = remaining > 0 ? "text-[var(--warning)]" : "text-[var(--success)]";

  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Chi phí và thu tiền
        </h2>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-faint)]">Tổng chi phí</p>
            <p className="mt-0.5 truncate text-base font-bold tabular-nums text-[var(--text)] sm:text-lg">
              {fmt(total)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-faint)]">Đã thu</p>
            <p className="mt-0.5 truncate text-base font-bold tabular-nums text-[var(--primary)] sm:text-lg">
              {fmt(paid)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-faint)]">
              {hasConfirmed ? resultLabel : "Chênh lệch"}
            </p>
            <p
              className={`mt-0.5 truncate text-base font-bold tabular-nums sm:text-lg ${hasConfirmed ? resultTone : "text-[var(--text-faint)]"
                }`}
            >
              {hasConfirmed ? fmt(Math.abs(remaining)) : "—"}
            </p>
          </div>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ thu tiền"
        >
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--text-faint)]">
          {hasConfirmed
            ? `Đã thu ${pct}% tổng chi phí`
            : "Chưa có ai được xác nhận thanh toán"}
        </p>
      </div>

      <Section title="Chi tiết chi phí" meta={<span className="tabular-nums">{fmt(total)}</span>}>
        <div className="space-y-4">

          <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-3.5 shadow-sm">
            <Line
              label="Tiền cầu"
              sub={`${chi_phi.shuttle_count} quả × ${fmt(chi_phi.shuttle_price)}`}
              value={fmt(chi_phi.shuttle_cost)}
              strong
            />
          </div>
          {courtBreakdown.length > 0 ? (
            <div className="space-y-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-4 shadow-sm">
              {courtBreakdown.map((c, i) => (
                <Line
                  key={i}
                  label={c.name}
                  sub={
                    c.minutes
                      ? `${c.minutes} phút × ${fmt(c.price_per_hour)}/tiếng`
                      : undefined
                  }
                  value={fmt(c.total)}
                />
              ))}
              <div className="flex items-center justify-between border-t border-dashed border-[var(--border-strong)] pt-2">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Tổng tiền sân
                </span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {fmt(chi_phi.court_fee)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2.5 shadow-sm">
              <Line label="Tiền sân" value={fmt(chi_phi.court_fee)} strong />
            </div>
          )}

          {chi_phi.other_fee > 0 && (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] p-3">
              <p className="text-sm font-semibold text-[var(--warning)]">
                Khoản thu khác
                {chi_phi.other_fee_note && (
                  <span className="ml-1 font-normal italic text-[var(--text-faint)]">
                    ({chi_phi.other_fee_note})
                  </span>
                )}
              </p>

              {otherFeeItems.length > 0 && (
                <div className="mt-2.5 space-y-2.5">
                  {otherFeeItems.map((item, i) => {
                    const hasGuests = (item.guests?.length ?? 0) > 0;
                    return (
                      <div
                        key={i}
                        className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[var(--surface)]"
                      >
                        <div className="space-y-2 px-3 py-2.5">
                          <Line
                            label={item.name}
                            value={fmt(item.amount)}
                            amber
                            strong
                            notes={item.note}
                          />
                          {item.guests?.map((g, gi) => (
                            <Line
                              key={gi}
                              label={g.name}
                              sub="đi cùng"
                              value={fmt(g.amount)}
                              amber
                              nested
                              notes={g.note}
                            />
                          ))}
                        </div>
                        {hasGuests && (
                          <div className="flex items-center justify-between border-t border-dashed border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-3 py-2">
                            <span className="text-xs font-medium text-[var(--warning)]">
                              Tổng nhóm
                            </span>
                            <span className="text-sm font-bold tabular-nums text-[var(--warning)]">
                              {fmt(item.total ?? item.amount)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-[color-mix(in_srgb,var(--warning)_28%,transparent)] pt-2">
                <span className="text-xs font-semibold text-[var(--warning)]">
                  Tổng khoản thu khác
                </span>
                <span className="text-sm font-bold tabular-nums text-[var(--warning)]">
                  {fmt(chi_phi.other_fee)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section
        key={`paid-${isMobile}`}
        title="Đã thu"
        defaultOpen={isMobile ? allConfirmed : hasConfirmed}
        meta={
          <span className="tabular-nums">
            {hasConfirmed ? `${paid_list.length} người` : "0 người"}
          </span>
        }
      >
        {hasConfirmed ? (
          <div className="space-y-2.5">
            {paid_list.map((p: any) => (
              <div
                key={p.registration_id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-sm text-[var(--text)]">{p.full_name}</span>
                  {p.member_type === "co_dinh" && (
                    <Chip tone="purple">Thành viên</Chip>
                  )}
                  {p.member_type === "vang_lai" && <Chip>Vãng lai</Chip>}
                  {p.is_guest && <Chip>Khách</Chip>}
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--primary)]">
                  {fmt(p.total_amount)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5">
              <span className="text-sm font-bold text-[var(--text)]">Tổng đã thu</span>
              <span className="text-sm font-bold tabular-nums text-[var(--primary)]">
                {fmt(paid)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm italic text-[var(--text-faint)]">
            Chưa có ai được xác nhận thanh toán
          </p>
        )}
      </Section>
    </section>
  );
}
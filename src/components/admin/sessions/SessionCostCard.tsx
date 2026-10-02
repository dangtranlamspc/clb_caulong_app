"use client";
import { useCallback, useEffect, useState } from "react";
import { sessionsAdminApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

interface Props {
  sessionId: string;
}

export default function SessionCostCard({ sessionId }: Props) {
  const [cost, setCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    if (!sessionId) return;
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on("broadcast", { event: "session_updated" }, () => {
        fetchCost();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchCost]);

  if (loading) return <div className="card animate-pulse h-48 bg-[var(--surface-muted)]" />;
  if (!cost) return null;

  const { chi_phi, paid_list, summary } = cost;
  const hasConfirmed = summary.has_confirmed;
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

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
          🔑 Chi phí thực tế
        </p>

        <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[var(--success-soft)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text)]">🏸 Tiền cầu</p>
              <p className="text-xs text-[var(--text-faint)]">
                {chi_phi.shuttle_count} quả × {fmt(chi_phi.shuttle_price)}
              </p>
            </div>
            <span className="text-base font-bold text-[var(--success)] flex-shrink-0 ml-3">
              {fmt(chi_phi.shuttle_cost)}
            </span>
          </div>
        </div>

        {courtBreakdown.length > 0 ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] overflow-hidden">
            <div className="px-3 py-2 text-sm font-medium text-[var(--text-muted)] border-b border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              🏟 Sân
            </div>

            <div className="divide-y divide-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
              {courtBreakdown.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {c.name}
                    </p>
                    {c.minutes ? (
                      <p className="text-xs text-[var(--text-faint)]">
                        {c.minutes} phút × {fmt(c.price_per_hour)}/tiếng
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-[var(--primary)] flex-shrink-0 ml-3">
                    {fmt(c.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center px-3 py-2 bg-[var(--primary-soft)]">
              <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                Tổng tiền sân
              </span>
              <span className="text-base font-bold text-[var(--primary)]">
                {fmt(chi_phi.court_fee)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">🏟 Sân</span>
            <span className="font-medium">{fmt(chi_phi.court_fee)}</span>
          </div>
        )}

        {chi_phi.other_fee > 0 && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] overflow-hidden">
            <div className="px-3 py-2 text-sm font-medium text-[var(--text-muted)] border-b border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
              💰 Khoản thu khác
              {chi_phi.other_fee_note && (
                <span className="text-[var(--text-faint)] italic"> ({chi_phi.other_fee_note})</span>
              )}
            </div>

            {otherFeeItems.length > 0 && (
              <div className="p-3 space-y-2.5">
                {otherFeeItems.map((item, i) => {
                  const toLines = (n?: string | null) =>
                    (n ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
                  const hasGuests = (item.guests?.length ?? 0) > 0;

                  // Một dòng: tên ..... giá
                  const Row = ({
                    name,
                    amount,
                    sub,
                    note,
                    nested,
                  }: {
                    name: string;
                    amount: number;
                    sub?: string;
                    note?: string | null;
                    nested?: boolean;
                  }) => (
                    <div className={nested ? "pl-3 border-l-2 border-[color-mix(in_srgb,var(--warning)_30%,transparent)]" : ""}>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`truncate ${nested
                              ? "text-sm text-[var(--text)]"
                              : "text-sm font-semibold text-[var(--text)]"
                            }`}
                        >
                          {name}
                          {sub && (
                            <span className="ml-1.5 text-[11px] font-normal text-[var(--text-faint)]">
                              {sub}
                            </span>
                          )}
                        </span>
                        {/* đường chấm dẫn mắt từ tên sang giá */}
                        <span className="flex-1 min-w-4 border-b border-dotted border-[color-mix(in_srgb,var(--warning)_30%,transparent)] translate-y-[-3px]" />
                        <span
                          className={`flex-shrink-0 tabular-nums ${nested
                              ? "text-sm font-medium text-[var(--warning)]"
                              : "text-sm font-semibold text-[var(--warning)]"
                            }`}
                        >
                          {fmt(amount)}
                        </span>
                      </div>
                      {toLines(note).map((line, li) => (
                        <p key={li} className="text-xs text-[var(--text-muted)] mt-0.5">
                          {line}
                        </p>
                      ))}
                    </div>
                  );

                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--surface)] overflow-hidden"
                    >
                      <div className="px-3 py-2.5 space-y-2">
                        <Row name={item.name} amount={item.amount} note={item.note} />
                        {item.guests?.map((g, gi) => (
                          <Row
                            key={gi}
                            name={g.name}
                            amount={g.amount}
                            sub="đi cùng"
                            note={g.note}
                            nested
                          />
                        ))}
                      </div>

                      {hasGuests && (
                        <div className="flex items-center justify-between px-3 py-2 bg-[var(--warning-soft)] border-t border-dashed border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
                          <span className="text-xs font-medium text-[var(--warning)]">
                            Tổng nhóm
                          </span>
                          <span className="text-sm font-bold text-[var(--warning)] tabular-nums">
                            {fmt(item.total ?? item.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center px-3 py-2 bg-[var(--warning-soft)]">
              <span className="text-xs font-semibold text-[var(--warning)] uppercase tracking-wide">
                Tổng khoản thu khác
              </span>
              <span className="text-base font-bold text-[var(--warning)]">
                {fmt(chi_phi.other_fee)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-gray-900 px-3.5 py-3 mt-1 -mx-4 sm:-mx-5">
          <span className="text-sm font-semibold text-[var(--text-faint)] pl-1">
            Tổng tất cả các chi phí
          </span>
          <span className="text-lg font-bold text-white pr-1">
            {fmt(summary.total_cost)}
          </span>
        </div>
      </div>

      {hasConfirmed ? (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            💰 Đã thu được
          </p>

          <div className="space-y-1.5">
            {paid_list.map((p: any) => (
              <div key={p.registration_id} className="text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[var(--text)]">{p.full_name}</span>
                    {p.member_type === "co_dinh" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--purple-soft)] text-[var(--purple)] border border-[color-mix(in_srgb,var(--purple)_30%,transparent)]">
                        Thành viên
                      </span>
                    )}
                    {p.member_type === "vang_lai" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
                        Vãng lai
                      </span>
                    )}
                    {p.is_guest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">
                        Khách
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-[var(--primary)] flex-shrink-0">
                    {fmt(p.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-bold border-t border-[var(--border)] pt-2">
            <span>Tổng đã thu</span>
            <span className="text-[var(--primary)]">{fmt(summary.total_paid)}</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
            💰 Đã thu được
          </p>
          <p className="text-sm text-[var(--text-faint)] italic">
            Chưa có ai được xác nhận thanh toán
          </p>
        </div>
      )}

      {hasConfirmed && (
        <div
          className={`card space-y-1 border ${summary.remaining > 0 ? "border-[color-mix(in_srgb,var(--purple)_30%,transparent)] bg-[var(--purple-soft)]" : "border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[var(--success-soft)]"}`}
        >
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            ℹ️ Kết quả
          </p>
          <p
            className={`text-sm ${summary.remaining > 0 ? "text-[var(--purple)]" : "text-[var(--success)]"}`}
          >
            {fmt(summary.total_cost)} − {fmt(summary.total_paid)} ={" "}
            <strong>{fmt(Math.abs(summary.remaining))}</strong>
            {summary.remaining > 0
              ? " → còn thiếu"
              : summary.remaining < 0
                ? " → thu dư"
                : " → đủ chi phí 🎉"}
          </p>
        </div>
      )}
    </div>
  );
}
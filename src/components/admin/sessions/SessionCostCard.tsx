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

  if (loading) return <div className="card animate-pulse h-48 bg-gray-100" />;
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
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          🔑 Chi phí thực tế
        </p>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">🏸 Tiền cầu</p>
              <p className="text-xs text-gray-400">
                {chi_phi.shuttle_count} quả × {fmt(chi_phi.shuttle_price)}
              </p>
            </div>
            <span className="text-base font-bold text-emerald-600 flex-shrink-0 ml-3">
              {fmt(chi_phi.shuttle_cost)}
            </span>
          </div>
        </div>

        {courtBreakdown.length > 0 ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
            <div className="px-3 py-2 text-sm font-medium text-gray-600 border-b border-blue-100/70">
              🏟 Sân
            </div>

            <div className="divide-y divide-blue-100/70">
              {courtBreakdown.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {c.name}
                    </p>
                    {c.minutes ? (
                      <p className="text-xs text-gray-400">
                        {c.minutes} phút × {fmt(c.price_per_hour)}/tiếng
                      </p>
                    ) : null}
                  </div>
                  <span className="text-sm font-semibold text-blue-600 flex-shrink-0 ml-3">
                    {fmt(c.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center px-3 py-2 bg-blue-100/50">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Tổng tiền sân
              </span>
              <span className="text-base font-bold text-blue-700">
                {fmt(chi_phi.court_fee)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">🏟 Sân</span>
            <span className="font-medium">{fmt(chi_phi.court_fee)}</span>
          </div>
        )}

        {chi_phi.other_fee > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden">
            <div className="px-3 py-2 text-sm font-medium text-gray-600 border-b border-amber-100/70">
              💰 Khoản thu khác
              {chi_phi.other_fee_note && (
                <span className="text-gray-400 italic"> ({chi_phi.other_fee_note})</span>
              )}
            </div>

            {otherFeeItems.length > 0 && (
              <div className="p-3 space-y-2">
                {otherFeeItems.map((item, i) => {
                  const noteLines = (item.note ?? "")
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);

                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-amber-200/70 bg-white/70 px-2.5 py-2 space-y-1"
                    >
                      <p className="text-xs font-semibold text-gray-600">
                        {item.name}
                      </p>

                      {noteLines.length > 0 && (
                        <div className="pl-2 space-y-0.5">
                          {noteLines.map((line, li) => (
                            <p key={li} className="text-[11px] text-gray-400 italic">
                              — {line}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Dòng tổng của riêng người này, nằm giữa các khoản thu */}
                      <div className="flex justify-between text-xs pt-1 border-t border-dashed border-amber-200/70">
                        <span className="text-gray-500">Tổng ({item.name})</span>
                        <span className="font-semibold text-amber-600">
                          {fmt(item.amount)}
                        </span>
                      </div>

                      {item.guests?.map((g, gi) => {
                        const gNoteLines = (g.note ?? "")
                          .split("\n")
                          .map((l) => l.trim())
                          .filter(Boolean);
                        return (
                          <div key={gi} className="pl-3">
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>
                                + {g.name}{" "}
                                <span className="text-gray-300">(đi cùng)</span>
                              </span>
                              <span className="font-medium text-amber-500">
                                {fmt(g.amount)}
                              </span>
                            </div>
                            {gNoteLines.length > 0 && (
                              <div className="pl-3 space-y-0.5">
                                {gNoteLines.map((line, li) => (
                                  <p
                                    key={li}
                                    className="text-[11px] text-gray-300 italic"
                                  >
                                    — {line}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {item.guests && item.guests.length > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-400 pl-3 pt-0.5 border-t border-dashed border-gray-200">
                          <span>= Tổng cộng</span>
                          <span className="font-semibold text-amber-700">
                            {fmt(item.total ?? item.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center px-3 py-2 bg-amber-100/50">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Tổng khoản thu khác
              </span>
              <span className="text-base font-bold text-amber-700">
                {fmt(chi_phi.other_fee)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-gray-900 px-3.5 py-3 mt-1 -mx-4 sm:-mx-5">
          <span className="text-sm font-semibold text-gray-200 pl-1">
            Tổng tất cả các chi phí
          </span>
          <span className="text-lg font-bold text-white pr-1">
            {fmt(summary.total_cost)}
          </span>
        </div>
      </div>

      {hasConfirmed ? (
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            💰 Đã thu được
          </p>

          <div className="space-y-1.5">
            {paid_list.map((p: any) => (
              <div key={p.registration_id} className="text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-700">{p.full_name}</span>
                    {p.member_type === "co_dinh" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Thành viên
                      </span>
                    )}
                    {p.member_type === "vang_lai" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        Vãng lai
                      </span>
                    )}
                    {p.is_guest && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        Khách
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-blue-600 flex-shrink-0">
                    {fmt(p.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-2">
            <span>Tổng đã thu</span>
            <span className="text-blue-600">{fmt(summary.total_paid)}</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            💰 Đã thu được
          </p>
          <p className="text-sm text-gray-400 italic">
            Chưa có ai được xác nhận thanh toán
          </p>
        </div>
      )}

      {hasConfirmed && (
        <div
          className={`card space-y-1 border ${summary.remaining > 0 ? "border-purple-200 bg-purple-50" : "border-green-200 bg-green-50"}`}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            ℹ️ Kết quả
          </p>
          <p
            className={`text-sm ${summary.remaining > 0 ? "text-purple-800" : "text-green-700"}`}
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
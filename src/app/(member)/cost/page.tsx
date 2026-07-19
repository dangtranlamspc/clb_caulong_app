"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { sessionsApi } from "../../../lib/api";
import { RefreshCw, Wallet, X, Loader2, Users } from "lucide-react";
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

const STATUS_CFG: Record<
  string,
  { label: string; dot: string; border: string }
> = {
  completed: {
    label: "Xong",
    dot: "bg-emerald-400",
    border: "border-l-emerald-400",
  },
  waiting_payment: {
    label: "Chờ TT",
    dot: "bg-blue-400",
    border: "border-l-blue-400",
  },
  open: { label: "Sắp", dot: "bg-sky-400", border: "border-l-sky-400" },
  full: { label: "Đầy", dot: "bg-orange-400", border: "border-l-orange-400" },
  cancelled: { label: "Hủy", dot: "bg-gray-300", border: "border-l-gray-300" },
};

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

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setLoading(true);
    sessionsApi
      .getCostDetail(sessionId)
      .then(({ data }) => setDetail(data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:items-center sm:justify-center"
      style={{
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: "85vh",
          transform: visible ? "translateY(0)" : "translateY(24px)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">
            Chi tiết chi phí buổi đánh
          </p>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          ) : !detail ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Không tải được dữ liệu
            </p>
          ) : (
            <>
              <div>
                <p className="font-bold text-gray-900">
                  {detail.session.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(detail.session.scheduled_at).toLocaleDateString(
                    "vi-VN",
                    {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Chi phí thực tế
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">🏟 Tiền sân</span>
                  <span className="font-medium text-gray-700">
                    {fmtFull(detail.chi_phi.court_fee)}
                  </span>
                </div>
                {detail.chi_phi.shuttle_count > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      🏸 Tiền cầu
                      <span className="text-gray-400 text-xs ml-1">
                        ({detail.chi_phi.shuttle_count} ×{" "}
                        {fmtFull(detail.chi_phi.shuttle_price)})
                      </span>
                    </span>
                    <span className="font-medium text-gray-700">
                      {fmtFull(detail.chi_phi.shuttle_cost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 mt-1">
                  <span className="font-semibold text-gray-700">
                    Tổng chi phí (sân + cầu)
                  </span>
                  <span className="font-black text-emerald-600">
                    {fmtFull(
                      detail.chi_phi.court_fee + detail.chi_phi.shuttle_cost,
                    )}
                  </span>
                </div>
              </div>

              {detail.chi_phi.other_fee > 0 && (
                <div className="rounded-xl bg-amber-50 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                    Khoản thu khác
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">
                      Tổng thu khác
                    </span>
                    <span className="font-bold text-amber-600">
                      {fmtFull(detail.chi_phi.other_fee)}
                    </span>
                  </div>
                  {(detail.chi_phi.other_fee_list ?? []).length > 0 && (
                    <div className="pt-1 space-y-1 border-t border-amber-100 mt-1">
                      {detail.chi_phi.other_fee_list.map(
                        (f: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs text-gray-500"
                          >
                            <span>
                              {f.name}
                              {f.note && (
                                <span className="text-amber-500 italic">
                                  {" "}
                                  ({f.note})
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-gray-600">
                              {fmtFull(f.amount)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Khoản từng người cần thanh toán (
                  {detail.paid_list?.length ?? 0} người)
                </p>
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {(detail.paid_list ?? []).map((p: any) => (
                    <div key={p.registration_id} className="px-3 py-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">
                          {p.full_name}
                          {p.is_guest && (
                            <span className="text-gray-400 text-xs ml-1">
                              (khách)
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-gray-900">
                          {fmtFull(p.total_amount)}
                        </span>
                      </div>
                      {p.guest_names?.length > 0 && (
                        <p className="text-xs text-purple-500 mt-0.5">
                          Gộp cùng: {p.guest_names.join(", ")}
                        </p>
                      )}
                      {p.other_fee_amount > 0 && (
                        <p className="text-xs mt-0.5">
                          <span className="text-amber-600 font-medium">
                            Khoản khác: {fmtFull(p.other_fee_amount)}
                          </span>
                          {p.other_fee_note && (
                            <span className="text-gray-400 italic">
                              {" "}
                              ({p.other_fee_note})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!detail.paid_list || detail.paid_list.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Chưa có ai được chốt thanh toán
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// function SessionCostCard({
//   item,
//   onClick,
// }: {
//   item: any;
//   onClick: () => void;
// }) {
//   const { session, participants, chi_phi } = item;
//   const { full } = fmtDate(session.scheduled_at);
//   const cfg = STATUS_CFG[session.status] ?? STATUS_CFG.open;

//   return (
//     <button
//       onClick={onClick}
//       className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.border} active:scale-[0.99] transition-transform`}
//     >
//       <div className="flex items-center gap-3 px-4 py-3">
//         <div className="flex-1 min-w-0">
//           <p className="font-bold text-sm text-gray-900">{full}</p>
//           <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
//             <Users className="w-3 h-3" />
//             {participants.total} người · ♂ {participants.male_count} · ♀{" "}
//             {participants.female_count}
//           </p>
//         </div>
//         <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
//           <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
//           {cfg.label}
//         </span>
//       </div>

//       <div className="mx-4 mb-3 rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
//         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
//           Chi phí thực tế
//         </p>
//         <div className="flex justify-between text-sm">
//           <span className="text-gray-500">🏟 Sân</span>
//           <span className="font-medium text-gray-700">
//             {fmtFull(chi_phi.court_fee)}
//           </span>
//         </div>
//         {chi_phi.shuttle_count > 0 && (
//           <div className="flex justify-between text-sm">
//             <span className="text-gray-500">
//               🏸 Cầu
//               <span className="text-gray-400 text-xs ml-1">
//                 {chi_phi.shuttle_count} × {fmt(chi_phi.shuttle_price)}
//               </span>
//             </span>
//             <span className="font-medium text-gray-700">
//               {fmtFull(chi_phi.shuttle_cost)}
//             </span>
//           </div>
//         )}
//         {chi_phi.other_fee > 0 && (
//           <div className="flex justify-between text-sm">
//             <span className="text-gray-500">
//               📌 Khoản khác
//               {chi_phi.other_fee_note && (
//                 <span className="text-gray-400 text-xs ml-1">
//                   ({chi_phi.other_fee_note})
//                 </span>
//               )}
//             </span>
//             <span className="font-medium text-amber-600">
//               {fmtFull(chi_phi.other_fee)}
//             </span>
//           </div>
//         )}
//         <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 mt-1">
//           <span className="font-semibold text-gray-700">
//             Tổng chi phí (sân + cầu)
//           </span>
//           <span className="font-black text-emerald-600">
//             {fmtFull(chi_phi.actual_cost)}
//           </span>
//         </div>
//       </div>
//     </button>
//   );
// }

function SessionCostCard({
  item,
  onClick,
}: {
  item: any;
  onClick: () => void;
}) {
  const { session, participants, chi_phi } = item;
  const { full } = fmtDate(session.scheduled_at);
  const cfg = STATUS_CFG[session.status] ?? STATUS_CFG.open;
  const isProfit = chi_phi.profit >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.border} active:scale-[0.99] transition-transform`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900">{full}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participants.total} người · ♂ {participants.male_count} · ♀{" "}
            {participants.female_count}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
              isProfit
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500"
            }`}
          >
            {isProfit ? "↗" : "↘"} {isProfit ? "Lãi" : "Lỗ"}{" "}
            {isProfit ? "+" : ""}
            {fmt(chi_phi.profit)}
          </span>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Chi phí thực tế
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">🏟 Sân</span>
          <span className="font-medium text-gray-700">
            {fmtFull(chi_phi.court_fee)}
          </span>
        </div>
        {chi_phi.shuttle_count > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              🏸 Cầu
              <span className="text-gray-400 text-xs ml-1">
                {chi_phi.shuttle_count} × {fmt(chi_phi.shuttle_price)}
              </span>
            </span>
            <span className="font-medium text-gray-700">
              {fmtFull(chi_phi.shuttle_cost)}
            </span>
          </div>
        )}
        {chi_phi.other_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              📌 Khoản khác
              {chi_phi.other_fee_note && (
                <span className="text-gray-400 text-xs ml-1">
                  ({chi_phi.other_fee_note})
                </span>
              )}
            </span>
            <span className="font-medium text-amber-600">
              {fmtFull(chi_phi.other_fee)}
            </span>
          </div>
        )}

        <div className="pt-1.5 border-t border-gray-200 mt-1 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">💰 Tổng chi</span>
            <span className="font-semibold text-gray-700">
              {fmtFull(chi_phi.total_cost)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">💵 Tổng thu</span>
            <span
              className={`font-semibold ${isProfit ? "text-emerald-600" : "text-red-500"}`}
            >
              {fmtFull(chi_phi.total_paid)}
            </span>
          </div>
        </div>

        <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 mt-1">
          <span className="font-semibold text-gray-700">
            {isProfit ? "📈 Lãi" : "📉 Lỗ"}
          </span>
          <span
            className={`font-black ${isProfit ? "text-emerald-600" : "text-red-500"}`}
          >
            {isProfit ? "+" : ""}
            {fmtFull(chi_phi.profit)}
          </span>
        </div>
      </div>
    </button>
  );
}

function SkeletonStats() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-28 bg-white rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-white rounded-2xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-40 bg-white rounded-2xl" />
      ))}
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

  const grouped = data ? groupByMonth(data.sessions) : [];
  const s = data?.summary;

  const YEAR_OPTIONS = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-violet-500" /> Chi phí
        </h1>
        <button
          onClick={() => load(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
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
        <div className="bg-white rounded-2xl py-14 text-center">
          <p className="text-gray-400 text-sm">Không thể tải dữ liệu</p>
        </div>
      ) : (
        <>
          <FadeIn delay={0}>
            <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-4 text-white">
              <p className="text-white/60 text-xs mb-3">
                Tổng quan chi phí thực tế
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-xl font-black">
                    {fmt(s.total_actual_cost)}
                  </p>
                  <p className="text-white/60 text-[10px] mt-0.5">Sân + cầu</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-amber-300">
                    {fmt(s.total_other_fee)}
                  </p>
                  <p className="text-white/60 text-[10px] mt-0.5">Khoản khác</p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p
                    className={`text-xl font-black ${s.total_profit >= 0 ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {s.total_profit >= 0 ? "+" : ""}
                    {fmt(s.total_profit)}
                  </p>
                  <p className="text-white/60 text-[10px] mt-0.5">
                    {s.total_profit >= 0 ? "Lãi lũy kế" : "Lỗ lũy kế"}
                  </p>
                </div>
                <div className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-xl font-black">
                    {s.total_male + s.total_female}
                  </p>
                  <p className="text-white/60 text-[10px] mt-0.5">
                    ♂ {s.total_male} · ♀ {s.total_female}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-gray-800">
                  {s.total_sessions}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Buổi đánh</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-2xl font-black text-gray-800">
                  {s.total_shuttle_count}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Quả cầu</p>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                <p className="text-xl font-black text-gray-800">
                  {fmt(s.avg_cost_per_session)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">TB/buổi</p>
              </div>
            </div>
          </FadeIn>

          {grouped.map(({ month, items }, groupIdx) => (
            <div key={month} className="space-y-3">
              <FadeIn delay={220 + groupIdx * 40}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {month}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              </FadeIn>
              {items.map((item: any, idx: number) => (
                <FadeIn
                  key={item.session.id}
                  delay={260 + groupIdx * 40 + idx * 80}
                >
                  <SessionCostCard
                    item={item}
                    onClick={() => setSelectedSessionId(item.session.id)}
                  />
                </FadeIn>
              ))}
            </div>
          ))}

          {data.sessions.length === 0 && (
            <FadeIn delay={200}>
              <div className="bg-white rounded-2xl py-14 text-center">
                <p className="text-gray-400 text-sm">Chưa có buổi đánh nào</p>
              </div>
            </FadeIn>
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

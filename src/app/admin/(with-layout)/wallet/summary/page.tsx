"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Wallet,
  Search,
  TrendingDown,
  Users,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Minus,
  Share2,
  Eye,
  CheckCircle2,
  XCircle,
  Bell,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { walletAdminApi } from "@/lib/api";
import AdminTransactionDetailModal from "@/components/admin/wallet/AdminTransactionDetailModal";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { subscribeAdminTopupRequests, subscribeWalletChanged } from "@/lib/wallet-events";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

function relativeDay(dateStr: string | null) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

const TIER_STYLE: Record<string, { color: string; bg: string; dot: string }> = {
  "Tân thủ": { color: "text-gray-600", bg: "bg-gray-100", dot: "🔘" },
  "Phong trào": { color: "text-green-700", bg: "bg-green-50", dot: "🟢" },
  "Cứng cựa": { color: "text-cyan-700", bg: "bg-cyan-50", dot: "🔵" },
  "Chủ lực": { color: "text-blue-700", bg: "bg-blue-50", dot: "🔷" },
  "Cao thủ": { color: "text-purple-700", bg: "bg-purple-50", dot: "🟣" },
  "Kiện tướng": { color: "text-amber-700", bg: "bg-amber-50", dot: "🥇" },
  "Đại Kiện Tướng": { color: "text-orange-700", bg: "bg-orange-50", dot: "🏆" },
  "Huyền Thoại": { color: "text-rose-700", bg: "bg-rose-50", dot: "👑" },
};

function RankTag({ tier, points }: { tier: string | null; points?: number }) {
  if (!tier) return <span className="text-xs text-gray-300">—</span>;
  const t = TIER_STYLE[tier] ?? {
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "•",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${t.bg} ${t.color}`}
    >
      <span>{t.dot}</span>
      {tier}
      {typeof points === "number" && (
        <span className="opacity-60">· {points}/50</span>
      )}
    </span>
  );
}

function formatThousands(value: string, allowNegative: boolean) {
  const isNegative = allowNegative && value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return isNegative ? "-" : "";
  const formatted = Number(digits).toLocaleString("vi-VN");
  return isNegative ? `-${formatted}` : formatted;
}

function parseThousands(value: string) {
  const isNegative = value.trim().startsWith("-");
  const digits = value.replace(/\D/g, "");
  const num = digits ? Number(digits) : 0;
  return isNegative ? -num : num;
}

function StatusBadge({ balance }: { balance: number }) {
  if (balance < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 whitespace-nowrap">
        Âm ví
      </span>
    );
  if (balance === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 whitespace-nowrap">
        Hết tiền
      </span>
    );
  if (balance < 50000)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 whitespace-nowrap">
        Sắp hết
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 whitespace-nowrap">
      Bình thường
    </span>
  );
}

function MemberMobileCard({
  m,
  active,
  onSelect,
  delay,
}: {
  m: any;
  active: boolean;
  onSelect: () => void;
  delay: number;
}) {
  return (
    <button
      onClick={onSelect}
      style={{ animationDelay: `${delay}ms` }}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-2xl bg-white border transition-all duration-150 active:scale-[0.98] animate-row-fade ${active
        ? "border-blue-300 ring-2 ring-blue-100 shadow-lg"
        : "border-gray-100 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.06),0_8px_20px_-4px_rgba(0,0,0,0.1)]"
        }`}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
        {m.avatar_url ? (
          <img
            src={m.avatar_url}
            alt={m.full_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          m.full_name[0]
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {m.full_name}
            </p>
            <p className="text-xs text-gray-400">{m.phone}</p>
          </div>
          <span
            className={`text-sm font-bold whitespace-nowrap flex-shrink-0 ${m.balance < 0 ? "text-red-500" : "text-gray-900"}`}
          >
            {fmt(m.balance)}
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
          <RankTag tier={m.tier} points={m.total_points} />
          <StatusBadge balance={m.balance} />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Buổi gần nhất: {relativeDay(m.last_session_at)}
        </p>
      </div>
    </button>
  );
}

function MemberPanel({
  member,
  onClose,
  onChanged,
  onSelectTx,
  onTransactionsLoaded,
}: {
  member: any;
  onClose: () => void;
  onChanged: (newBalance?: number) => void;
  onSelectTx: (tx: any) => void;
  onTransactionsLoaded: (transactions: any[]) => void;
}) {
  const [showTopup, setShowTopup] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showDeduct, setShowDeduct] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const amount = parseThousands(amountDisplay);
  const formOpen = showTopup || showAdjust || showDeduct;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountDisplay(formatThousands(e.target.value, showAdjust));
  };

  const fetchTx = useCallback(async () => {
    setLoadingTx(true);
    try {
      const { data } = await walletAdminApi.getMemberTransactions(member.id, {
        limit: 20,
      });
      const tx = data.data ?? [];
      setTransactions(data.data ?? []);
      onTransactionsLoaded(tx);
    } finally {
      setLoadingTx(false);
    }
  }, [member.id, onTransactionsLoaded]);



  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  useEffect(() => {
    const unsubscribe = subscribeWalletChanged(() => fetchTx());
    return unsubscribe;
  }, [fetchTx]);

  const closeForm = () => {
    setShowTopup(false);
    setShowAdjust(false);
    setShowDeduct(false);
    setAmountDisplay("");
    setNote("");
  };

  const handleSubmit = async (mode: "topup" | "adjust" | "deduct") => {
    const finalAmount = mode === "deduct" ? -Math.abs(amount) : amount;

    if (!finalAmount || (mode === "topup" && finalAmount < 1000)) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      const { data } =
        mode === "topup"
          ? await walletAdminApi.manualTopup(member.id, finalAmount, note || undefined)
          : await walletAdminApi.manualAdjust(member.id, finalAmount, note || undefined);

      toast.success("Đã cập nhật số dư");
      closeForm();
      fetchTx();
      onChanged(data.new_balance);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSign = () => {
    setAmountDisplay((prev) => {
      const trimmed = prev.trim();
      if (trimmed.startsWith("-")) return trimmed.slice(1);
      return trimmed ? `-${trimmed}` : "-";
    });
  };


  const handleShareImage = async () => {
    if (!receiptRef.current || sharing) return;
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("Không tạo được ảnh");

      const fileName = `so-du-${member.full_name?.replace(/\s+/g, "-") ?? member.id}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        (navigator as any).canShare?.({ files: [file] })
      ) {
        await (navigator as any).share({
          files: [file],
          title: "Sao kê ví — Ví BNB",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải ảnh sao kê xuống");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Tạo ảnh sao kê thất bại");
      }
    } finally {
      setSharing(false);
    }
  };

  const isNegativeAmount = amountDisplay.trim().startsWith("-");

  return (
    <div className="flex flex-col h-full min-h-0 bg-white lg:border-l border-gray-100">
      <div className="flex items-start justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-base sm:text-lg font-bold text-white flex-shrink-0 overflow-hidden">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              member.full_name[0]
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 truncate">
              {member.full_name}
            </p>
            <RankTag tier={member.tier} points={member.total_points} />
            <p className="text-xs text-gray-400 mt-0.5">{member.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleShareImage}
            disabled={sharing}
            className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-transform duration-150 active:scale-95 disabled:opacity-50"
            title="Chia sẻ ảnh sao kê"
          >
            {sharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>Chia sẻ</span>
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-transform duration-150 active:scale-90"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-400 mb-1">Số dư ví hiện tại</p>
        <p
          className={`text-2xl sm:text-3xl font-black ${member.balance < 0 ? "text-red-500" : "text-gray-900"}`}
        >
          {fmt(member.balance)}
        </p>
      </div>

      <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
        <button
          onClick={() => {
            setShowTopup(true);
            setShowAdjust(false);
            setShowDeduct(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-transform duration-150 active:scale-95 text-white text-xs sm:text-sm font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> Nạp tiền
        </button>
        <button
          onClick={() => {
            setShowDeduct(true);
            setShowTopup(false);
            setShowAdjust(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-transform duration-150 active:scale-95 text-red-600 text-xs sm:text-sm font-medium"
        >
          <Minus className="w-3.5 h-3.5" /> Trừ tiền
        </button>
        <button
          onClick={() => {
            setShowAdjust(true);
            setShowTopup(false);
            setShowDeduct(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-transform duration-150 active:scale-95 text-gray-700 text-xs sm:text-sm font-medium"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Điều chỉnh
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out flex-shrink-0 ${formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div
            className={`px-4 sm:px-5 py-3 border-b ${showDeduct ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
              }`}
          >
            <p className={`text-xs font-semibold mb-2 ${showDeduct ? "text-red-800" : "text-blue-800"}`}>
              {showTopup
                ? "Nạp tiền thủ công"
                : showDeduct
                  ? "Trừ tiền thủ công"
                  : "Điều chỉnh số dư (có thể nhập số âm)"}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {showAdjust && (
                  <button
                    type="button"
                    onClick={toggleSign}
                    className={`flex-shrink-0 w-11 rounded-lg border text-base font-bold transition-colors ${isNegativeAmount
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "bg-emerald-50 border-emerald-300 text-emerald-600"
                      }`}
                    title={
                      isNegativeAmount
                        ? "Đang trừ tiền — bấm để đổi thành cộng"
                        : "Đang cộng tiền — bấm để đổi thành trừ"
                    }
                  >
                    {isNegativeAmount ? "−" : "+"}
                  </button>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  placeholder="Số tiền"
                  className={`flex-1 min-w-0 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-shadow duration-150 bg-white ${showDeduct
                    ? "border-red-200 focus:border-red-400 focus:ring-red-100"
                    : "border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                    }`}
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-shadow duration-150 bg-white ${showDeduct
                  ? "border-red-200 focus:border-red-400 focus:ring-red-100"
                  : "border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                  }`}
              />
              <div className="flex gap-2">
                <button
                  onClick={closeForm}
                  disabled={submitting}
                  className="flex-1 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 transition-transform duration-150 active:scale-[0.98] text-gray-600 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:active:scale-100"
                >
                  Thu lại
                </button>
                <button
                  onClick={() =>
                    handleSubmit(showTopup ? "topup" : showDeduct ? "deduct" : "adjust")
                  }
                  disabled={submitting}
                  className={`flex-1 px-3 py-2 transition-transform duration-150 active:scale-[0.98] text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-1.5 ${showDeduct ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Xác nhận"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="px-4 sm:px-5 pt-4 pb-2">
          <p className="font-bold text-gray-900 text-sm">Lịch sử giao dịch</p>
        </div>
        {loadingTx ? (
          <div className="px-4 sm:px-5 py-2 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-4 sm:px-5 py-6 text-center text-gray-400 text-sm">
            Chưa có giao dịch nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <tbody>
                {transactions.map((tx: any) => (
                  <tr
                    key={tx.id}
                    onClick={() => onSelectTx(tx)}
                    className="hover:bg-gray-50 border-b border-gray-50 animate-row-fade"
                  >
                    <td className="px-4 sm:px-5 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(tx.created_at), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </td>
                    <td className="px-2 py-2.5 text-gray-700">
                      {(tx.type === "manual_expense" || tx.type === "manual_credit") && tx.description
                        ? tx.description
                        : tx.title}
                    </td>
                    <td
                      className={`px-2 py-2.5 font-bold text-right whitespace-nowrap ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {fmt(tx.amount)}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-xs text-gray-400 text-right whitespace-nowrap">
                      {fmt(tx.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", left: -9999, top: 0, width: 420 }} aria-hidden="true">
        <div
          ref={receiptRef}
          style={{ width: 420, background: "#ffffff", padding: 28, fontFamily: "inherit" }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", letterSpacing: 0.5 }}>
              VÍ BNB — CLB CẦU LÔNG
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Sao kê ví thành viên</p>
          </div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
              {member.full_name}
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{member.phone}</p>
            <p
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: member.balance < 0 ? "#ef4444" : "#111827",
                marginTop: 10,
                lineHeight: 1.3,
              }}
            >
              {fmt(member.balance)}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Số dư hiện tại</p>
          </div>

          <div style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 16px",
                fontSize: 11,
                color: "#9ca3af",
                background: "#f9fafb",
                fontWeight: 600,
              }}
            >
              <span>Ngày</span>
              <span>Giao dịch</span>
              <span>Số dư sau</span>
            </div>
            {transactions.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
                Chưa có giao dịch nào
              </div>
            ) : (
              transactions.map((tx: any, idx: number) => {
                const label =
                  (tx.type === "manual_expense" || tx.type === "manual_credit") && tx.description
                    ? tx.description
                    : tx.title;
                return (
                  <div
                    key={tx.id ?? idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "8px 16px",
                      fontSize: 12,
                      borderTop: "1px solid #f3f4f6",
                      gap: 8,
                    }}
                  >
                    <span style={{ color: "#9ca3af", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {format(new Date(tx.created_at), "dd/MM/yyyy", { locale: vi })}
                    </span>
                    <span style={{ color: "#374151", flex: 1, textAlign: "left" }}>{label}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: tx.amount > 0 ? "#059669" : "#ef4444",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {fmt(tx.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <p style={{ textAlign: "center", fontSize: 10, color: "#d1d5db", marginTop: 20 }}>
            Xuất lúc {format(new Date(), "HH:mm, dd/MM/yyyy", { locale: vi })}
          </p>
        </div>
      </div>
    </div>
  );
}

type SortField = "balance" | "full_name" | "last_session_at";
type SortOrder = "asc" | "desc";

function StatMembersModal({
  title,
  status,
  onClose,
  onSelectMember,
}: {
  title: string;
  status: string;
  onClose: () => void;
  onSelectMember: (member: any) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 10;

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    walletAdminApi
      .listMembers({
        status: status || undefined,
        search: search || undefined,
        page,
        limit: perPage,
        sort_by: "balance",
        sort_order: "desc",
      })
      .then(({ data }) => {
        if (cancelled) return;
        setMembers(data.data ?? []);
        setMeta(data.meta ?? {});
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = meta.total_pages ?? 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background .2s ease, backdrop-filter .2s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl h-[80vh] sm:h-[85vh] overflow-hidden relative flex flex-col"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
          opacity: visible ? 1 : 0,
          transition: "transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header cố định */}
        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 pr-8">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{meta.total ?? 0} thành viên</p>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="px-5 py-16 text-center text-gray-400 text-sm">
              Không có thành viên nào
            </div>
          ) : (
            <div className="px-3 py-3 space-y-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectMember(m);
                    handleClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                    ) : (
                      m.full_name[0]
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate text-sm">{m.full_name}</p>
                    <p className="text-xs text-gray-400">{m.phone}</p>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${m.balance < 0 ? "text-red-500" : "text-gray-900"}`}>
                    {fmt(m.balance)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-center gap-1 px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-500 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TopupRequestsModal({
  onClose,
  onProcessed,
}: {
  onClose: () => void;
  onProcessed: () => void; // gọi lại khi duyệt/từ chối xong để refresh badge count
}) {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [showReject, setShowReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [viewingBillUrl, setViewingBillUrl] = useState<string | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const fetchRequests = useCallback(async (status: "pending" | "resolved") => {
    setLoading(true);
    try {
      if (status === "pending") {
        const { data } = await walletAdminApi.listTopupRequests({ status: "pending", limit: 50 });
        setRequests(data.data ?? []);
      } else {
        const [{ data: approved }, { data: rejected }] = await Promise.all([
          walletAdminApi.listTopupRequests({ status: "approved", limit: 30 }),
          walletAdminApi.listTopupRequests({ status: "rejected", limit: 30 }),
        ]);
        const merged = [...(approved.data ?? []), ...(rejected.data ?? [])].sort(
          (a, b) => new Date(b.reviewed_at ?? b.created_at).getTime() - new Date(a.reviewed_at ?? a.created_at).getTime(),
        );
        setRequests(merged);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(activeTab);
  }, [activeTab, fetchRequests]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await walletAdminApi.approveTopup(id);
      toast.success("Đã duyệt nạp tiền");
      await fetchRequests(activeTab);
      onProcessed();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = rejectReason[id]?.trim();
    if (!reason) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setActionId(id);
    try {
      await walletAdminApi.rejectTopup(id, reason);
      toast.success("Đã từ chối");
      setShowReject(null);
      await fetchRequests(activeTab);
      onProcessed();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background .2s ease, backdrop-filter .2s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl h-[80vh] sm:h-[85vh] overflow-hidden relative flex flex-col"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
          opacity: visible ? 1 : 0,
          transition: "transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 pr-8">Yêu cầu nạp tiền</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mt-3">
            {(
              [
                ["pending", "Chờ duyệt"],
                ["resolved", "Đã duyệt"],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === val ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse bg-gray-100" />
            ))
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>{activeTab === "pending" ? "Không có yêu cầu nào" : "Chưa có lịch sử duyệt"}</p>
            </div>
          ) : (
            requests.map((r) => {
              const busy = actionId === r.id;
              return (
                <div key={r.id} className="border border-gray-100 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0 overflow-hidden">
                        {r.users?.avatar_url ? (
                          <img src={r.users.avatar_url} alt={r.users?.full_name} className="w-full h-full object-cover" />
                        ) : (
                          r.users?.full_name?.[0]?.toUpperCase() ?? "?"
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.users?.full_name}</p>
                        <p className="text-xs text-gray-400">
                          {r.users?.phone} · {format(new Date(r.created_at), "dd/MM HH:mm", { locale: vi })}
                        </p>
                      </div>
                    </div>
                    <span className="text-base font-black text-blue-600 whitespace-nowrap">{fmt(r.amount)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                      {r.payment_method === "cash" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}
                    </span>
                    {r.payment_reference && (
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{r.payment_reference}</span>
                    )}
                    {r.payment_proof_url && (
                      <button
                        onClick={() => setViewingBillUrl(r.payment_proof_url)}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" /> Xem bill
                      </button>
                    )}
                  </div>
                  {r.note && <p className="text-xs text-gray-400 italic">{r.note}</p>}

                  {activeTab === "resolved" ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}
                    >
                      {r.status === "approved" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {r.status === "approved"
                        ? `Đã duyệt${r.reviewed_at ? " · " + format(new Date(r.reviewed_at), "dd/MM HH:mm", { locale: vi }) : ""}`
                        : `Từ chối: ${r.reject_reason ?? ""}`}
                    </span>
                  ) : showReject !== r.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button
                        onClick={() => setShowReject(r.id)}
                        disabled={busy}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rejectReason[r.id] ?? ""}
                        onChange={(e) => setRejectReason((n) => ({ ...n, [r.id]: e.target.value }))}
                        className="input-field text-sm flex-1"
                        placeholder="Lý do từ chối"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg disabled:opacity-50"
                      >
                        Xác nhận
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {viewingBillUrl && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setViewingBillUrl(null);
          }}
        >
          <img
            src={viewingBillUrl}
            alt="Bill"
            className="max-w-lg w-full max-h-[80vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function WalletAdminSummaryPage() {
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("balance");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [memberTransactions, setMemberTransactions] = useState<any[]>([]);
  const [statModal, setStatModal] = useState<{ title: string; status: string } | null>(null);
  const perPage = 8;

  const [panelMember, setPanelMember] = useState<any | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<any>(null);

  const [exporting, setExporting] = useState(false);


  const [pendingTopupCount, setPendingTopupCount] = useState(0);
  const [showTopupModal, setShowTopupModal] = useState(false);

  const fetchPendingTopupCount = useCallback(async () => {
    const { data } = await walletAdminApi.listTopupRequests({ status: "pending", limit: 1 });
    setPendingTopupCount(data.meta?.total ?? 0);
  }, []);

  const fetchSummary = useCallback(async () => {
    const { data } = await walletAdminApi.getSummary();
    setStats(data);
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await walletAdminApi.listMembers({
        search: search || undefined,
        status: statusFilter || undefined,
        rank: rankFilter || undefined,
        page,
        limit: perPage,
        sort_by: sortField,
        sort_order: sortOrder,
      });
      setMembers(data.data ?? []);
      setMeta(data.meta ?? {});
      hasLoadedRef.current = true;

      setSelectedMember((prev: any) => {
        if (!prev) return prev;
        const updated = (data.data ?? []).find((m: any) => m.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, rankFilter, page, sortField, sortOrder]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchPendingTopupCount();
  }, [fetchPendingTopupCount]);

  useEffect(() => {
    const unsubscribe = subscribeAdminTopupRequests(() => {
      fetchPendingTopupCount();
    });
    return unsubscribe;
  }, [fetchPendingTopupCount]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchMembers();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchMembers();
  }, [statusFilter, rankFilter, page, sortField, sortOrder]);

  useEffect(() => {
    const unsubscribe = subscribeWalletChanged(() => {
      fetchSummary();
      fetchMembers();
    });
    return unsubscribe;
  }, [fetchSummary, fetchMembers]);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedMember) {
      setPanelMember(selectedMember);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPanelOpen(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    } else {
      setPanelOpen(false);
    }
  }, [selectedMember]);

  useEffect(() => {
    if (panelOpen || !panelMember) return;
    const el = panelRef.current;
    if (!el) {
      setPanelMember(null);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPanelMember(null);
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform") finish();
    };
    el.addEventListener("transitionend", onEnd);
    const fallback = setTimeout(finish, 350);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
    };
  }, [panelOpen, panelMember]);

  useEffect(() => {
    if (!panelMember) return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [panelMember]);

  const totalPages = meta.total_pages ?? 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const { data } = await walletAdminApi.exportReport();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-vi-clb-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Xuất báo cáo thành công!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Xuất báo cáo thất bại");
    } finally {
      setExporting(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortOrder === "desc" ? (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    );
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Tổng số dư CLB đang giữ",
      value: fmt(stats.club_balance),
      delta: `${stats.club_balance_delta >= 0 ? "+" : ""}${fmt(stats.club_balance_delta)} trong 30 ngày qua`,
      deltaPositive: stats.club_balance_delta >= 0,
      icon: <Wallet className="w-5 h-5 text-blue-600" />,
      iconBg: "bg-blue-50",
      status: "", // tất cả
    },
    {
      label: "Thành viên còn tiền",
      value: String(stats.member_count),
      delta: `${stats.member_pct}% tổng thành viên`,
      deltaPositive: true,
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      iconBg: "bg-emerald-50",
      status: "ok",
    },
    {
      label: "Thành viên âm ví",
      value: String(stats.negative_count),
      delta: `${stats.negative_pct}% tổng thành viên`,
      deltaPositive: false,
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      iconBg: "bg-orange-50",
      status: "negative",
    },
    {
      label: "Tổng công nợ",
      value: fmt(stats.total_debt),
      delta: "Chưa có dữ liệu so sánh tháng trước",
      deltaPositive: false,
      icon: <TrendingDown className="w-5 h-5 text-purple-600" />,
      iconBg: "bg-purple-50",
      status: "negative",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
                @keyframes rowFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-row-fade { animation: rowFade 0.25s ease-out both; }

                @keyframes cardFadeUp {
                    from { opacity: 0; transform: translate3d(0, 4px, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
                .animate-card-fade { animation: cardFadeUp 0.28s ease-out both; will-change: transform, opacity; }
            `}</style>

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-900 text-base sm:text-lg">Ví BNB</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTopupModal(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Inbox className="w-4 h-4" />
            <span>Duyệt nạp tiền</span>
            {pendingTopupCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingTopupCount > 99 ? "99+" : pendingTopupCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExportReport}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{exporting ? "Đang xuất..." : "Xuất báo cáo Excel"}</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStatModal({ title: s.label, status: s.status })}
              style={{ animationDelay: `${i * 40}ms` }}
              className="text-left bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 transition-all duration-150 animate-card-fade hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                  {s.icon}
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-tight">
                  {s.label}
                </p>
              </div>
              <p className="text-lg sm:text-2xl font-black text-gray-900 truncate">
                {s.value}
              </p>
              <p className={`text-[10px] sm:text-xs mt-1 font-medium ${s.deltaPositive ? "text-emerald-600" : "text-red-500"}`}>
                {s.delta}
              </p>
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm thành viên..."
                  className="pl-8 pr-3 py-2 sm:py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-shadow duration-150 w-full"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 sm:flex-none sm:w-40">
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setPage(1);
                    }}
                    placeholder="Tất cả trạng thái"
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: 'ok', label: 'Bình thường' },
                      { value: 'low', label: 'Sắp hết' },
                      { value: 'negative', label: 'Âm ví' },
                    ]}
                    triggerClassName="w-full flex items-center justify-between text-left px-3 py-2 sm:py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none"
                  />
                </div>
                <div className="flex-1 sm:flex-none sm:w-44">
                  <CustomSelect
                    value={rankFilter}
                    onChange={(val) => {
                      setRankFilter(val);
                      setPage(1);
                    }}
                    placeholder="Tất cả hạng"
                    options={[
                      { value: '', label: 'Tất cả hạng' },
                      ...Object.keys(TIER_STYLE).map((k) => ({
                        value: k,
                        label: `${TIER_STYLE[k].dot} ${k}`,
                      })),
                    ]}
                    triggerClassName="w-full flex items-center justify-between text-left px-3 py-2 sm:py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div
              className={`transition-opacity duration-200 ${refreshing ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
            >
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        <button
                          onClick={() => handleSort("full_name")}
                          className="flex items-center gap-1 hover:text-gray-600 transition-colors duration-150"
                        >
                          Thành viên <SortIcon field="full_name" />
                        </button>
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Hạng
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        <button
                          onClick={() => handleSort("balance")}
                          className="flex items-center gap-1 hover:text-gray-600 transition-colors duration-150 ml-auto"
                        >
                          Số dư ví <SortIcon field="balance" />
                        </button>
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Trạng thái
                      </th>
                      <th className="hidden sm:table-cell text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        <button
                          onClick={() => handleSort("last_session_at")}
                          className="flex items-center gap-1 hover:text-gray-600 transition-colors duration-150"
                        >
                          Buổi gần nhất <SortIcon field="last_session_at" />
                        </button>
                      </th>
                      <th className="px-4 sm:px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-4 sm:px-5 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : members.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 sm:px-5 py-12 text-center text-gray-400"
                        >
                          Không tìm thấy thành viên
                        </td>
                      </tr>
                    ) : (
                      members.map((m, i) => (
                        <tr
                          key={m.id}
                          className={`border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors duration-150 animate-row-fade ${selectedMember?.id === m.id ? "bg-blue-50" : ""}`}
                          style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}
                          onClick={() =>
                            setSelectedMember(
                              selectedMember?.id === m.id ? null : m,
                            )
                          }
                        >
                          <td className="px-4 sm:px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden">
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.full_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (
                                        e.currentTarget as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  m.full_name[0]
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {m.full_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {m.phone}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <RankTag tier={m.tier} points={m.total_points} />
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-bold whitespace-nowrap ${m.balance < 0 ? "text-red-500" : "text-gray-900"}`}
                          >
                            {fmt(m.balance)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge balance={m.balance} />
                          </td>
                          <td className="hidden sm:table-cell px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {relativeDay(m.last_session_at)}
                          </td>
                          <td className="px-4 sm:px-5 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMember(m);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-transform duration-150 active:scale-95 whitespace-nowrap"
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden flex flex-col gap-2.5 px-3 py-3">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  ))
                ) : members.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-400 text-sm">
                    Không tìm thấy thành viên
                  </div>
                ) : (
                  members.map((m, i) => (
                    <MemberMobileCard
                      key={m.id}
                      m={m}
                      active={selectedMember?.id === m.id}
                      delay={Math.min(i, 8) * 25}
                      onSelect={() =>
                        setSelectedMember(
                          selectedMember?.id === m.id ? null : m,
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 order-2 sm:order-1">
                Hiển thị {(page - 1) * perPage + 1} –{" "}
                {Math.min(page * perPage, meta.total ?? 0)} của{" "}
                {meta.total ?? 0} thành viên
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-transform duration-150 active:scale-90"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from(
                  { length: Math.min(totalPages, 5) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-md text-xs font-medium transition-transform duration-150 active:scale-90 ${page === p ? "bg-blue-600 text-white" : "border border-gray-200 hover:bg-gray-50 text-gray-600"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-transform duration-150 active:scale-90"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {panelMember && (
            <>
              <div
                className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-250 ${panelOpen ? "opacity-100" : "opacity-0"
                  }`}
                style={{ touchAction: "none" }}
                onClick={() => setSelectedMember(null)}
              />
              <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none">
                <div
                  ref={panelRef}
                  className={`pointer-events-auto bg-white shadow-xl overflow-hidden flex flex-col transform-gpu overscroll-contain
          transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform
          w-full h-[85dvh] max-h-[85dvh] rounded-t-2xl
          lg:w-[480px] lg:h-[85vh] lg:max-h-[720px] lg:rounded-2xl
          ${panelOpen
                      ? "translate-y-0 opacity-100 lg:scale-100"
                      : "translate-y-full opacity-0 lg:translate-y-0 lg:scale-95"
                    }`}
                >
                  <div className="lg:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
                    <span className="w-10 h-1 rounded-full bg-gray-200" />
                  </div>
                  <div className="flex-1 min-h-0 overscroll-contain flex flex-col">
                    <MemberPanel
                      member={panelMember}
                      onClose={() => setSelectedMember(null)}
                      onChanged={(newBalance) => {
                        if (typeof newBalance === "number") {
                          setSelectedMember((prev: any) =>
                            prev ? { ...prev, balance: newBalance } : prev,
                          );
                        }
                        fetchMembers();
                        fetchSummary();
                      }}
                      onSelectTx={(tx) => setSelectedTx(tx)}
                      onTransactionsLoaded={setMemberTransactions}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          {selectedTx && (
            <AdminTransactionDetailModal
              tx={selectedTx}
              onClose={() => setSelectedTx(null)}
              transactions={memberTransactions}
            />
          )}

          {statModal && (
            <StatMembersModal
              title={statModal.title}
              status={statModal.status}
              onClose={() => setStatModal(null)}
              onSelectMember={(m) => setSelectedMember(m)}
            />
          )}

          {showTopupModal && (
            <TopupRequestsModal
              onClose={() => setShowTopupModal(false)}
              onProcessed={() => {
                fetchPendingTopupCount();
                fetchSummary();
                fetchMembers();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

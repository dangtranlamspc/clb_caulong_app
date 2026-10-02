"use client";
import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarDays,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Users,
  X,
  Zap,
  Plus,
  Swords,
  Clock3,
  SlidersHorizontal,
  ChevronDown,
  Lock,
  Megaphone,
  Gift,
  BarChart3,
  Loader2,
  Copy,
  Download,
  Wallet,
  XIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { sessionsApi, matchesApi, activitiesApi, registrationsApi, walletApi } from "@/lib/api";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";
import { MembersModal } from "@/components/member/modals/MemberModalConponent";
import { useRouter } from "next/navigation";
import { EventSkeleton, MatchSkeleton, SessionSkeleton, SkeletonList } from "@/components/skeletons/Skeleton";
import { buildTransferNote } from "@/hooks/payment-ref";
import toast from "react-hot-toast";

type MainTab = "sessions" | "matches" | "events";

const SCROLL_AREA =
  "scroll-fade flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-2 px-2 pt-2 " +
  "pb-[calc(8.5rem_+_env(safe-area-inset-bottom,0px))] " + // chừa chỗ cho card cuối nằm trên thanh tab
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const SHELL_BOTTOM_SPACE = 116;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useFillViewport() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useIsoLayoutEffect(() => {
    const calc = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(320, Math.floor(window.innerHeight - top)));
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  return {
    ref,
    style: height ? { height, marginBottom: -SHELL_BOTTOM_SPACE } : undefined,
  };
}

const SESSION_STATUS_CFG: Record<
  string,
  { label: string; dotCls: string; badgeCls: string }
> = {
  open: {
    label: "Đang mở đăng ký",
    dotCls: "bg-emerald-400",
    badgeCls:
      "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_35%,transparent)]",
  },
  full: {
    label: "Đã đầy",
    dotCls: "bg-amber-400",
    badgeCls:
      "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]",
  },
  waiting_payment: {
    label: "Chờ thanh toán",
    dotCls: "bg-blue-400",
    badgeCls:
      "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
  },
  waiting_admin_finish: {
    label: "Chờ admin hoàn thành",
    dotCls: "bg-purple-400",
    badgeCls:
      "bg-[var(--purple-soft)] text-[var(--purple)] border-[color-mix(in_srgb,var(--purple)_35%,transparent)]",
  },
  cancelled: {
    label: "Đã hủy",
    dotCls: "bg-red-400",
    badgeCls:
      "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_35%,transparent)]",
  },
  completed: {
    label: "Hoàn thành",
    dotCls: "bg-[var(--text-faint)]",
    badgeCls:
      "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
  },
};

const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  pending_approval: {
    label: "Chờ admin duyệt",
    icon: Hourglass,
    cls: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]",
  },
  awaiting_checkin: {
    label: "Chờ điểm danh",
    icon: Hourglass,
    cls: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
  },
  awaiting_finish: {
    label: "Chờ buổi đánh kết thúc",
    icon: Hourglass,
    cls: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
  },
  pending: {
    label: "Chờ thanh toán",
    icon: Hourglass,
    cls: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]",
  },
  pending_review: {
    label: "Chờ admin xác nhận",
    icon: Clock3,
    cls: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
  },
  confirmed: {
    label: "Đã xác nhận thanh toán",
    icon: CheckCircle2,
    cls: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_35%,transparent)]",
  },
  rejected: {
    label: "Thanh toán bị từ chối",
    icon: AlertCircle,
    cls: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_35%,transparent)]",
  },
};

const SESSION_FILTER_TABS = [
  { value: "", label: "Tất cả" },
  { value: "open", label: "Mở", dot: "bg-emerald-400" },
  { value: "full", label: "Đầy", dot: "bg-amber-400" },
  { value: "waiting_payment", label: "Chờ TT", dot: "bg-blue-400" },
  {
    value: "waiting_admin_confirm",
    label: "Chờ admin chốt thanh toán",
    dot: "bg-indigo-400",
  },
  { value: "completed", label: "Xong", dot: "bg-[var(--text-faint)]" },
  { value: "cancelled", label: "Đã hủy", dot: "bg-red-400" },
];

const MATCH_STATUS_CFG: Record<
  string,
  { label: string; icon: any; cls: string; dot: string }
> = {
  pending_opponent: {
    label: "Chờ đối thủ",
    icon: Hourglass,
    cls: "text-[var(--text-muted)]",
    dot: "bg-[var(--text-faint)]",
  },
  pending_result: {
    label: "Chờ kết quả",
    icon: Clock3,
    cls: "text-[var(--primary)]",
    dot: "bg-blue-500",
  },
  pending_approval: {
    label: "Chờ admin duyệt",
    icon: Hourglass,
    cls: "text-[var(--warning)]",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    cls: "text-[var(--success)]",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Từ chối",
    icon: X,
    cls: "text-[var(--danger)]",
    dot: "bg-red-400",
  },
};

const MATCH_FILTER_OPTS = [
  { value: "", label: "Tất cả trận", dot: "bg-[var(--text-faint)]" },
  { value: "pending_opponent", label: "Chờ đối thủ", dot: "bg-[var(--text-faint)]" },
  { value: "pending_result", label: "Đang diễn ra", dot: "bg-blue-500" },
  { value: "pending_approval", label: "Chờ admin duyệt", dot: "bg-amber-400" },
  { value: "approved", label: "Đã hoàn thành", dot: "bg-emerald-500" },
  { value: "rejected", label: "Bị từ chối", dot: "bg-red-400" },
];

const BLOCKING_STATUSES = [
  "pending_opponent",
  "pending_result",
  "pending_approval",
];

const EVENT_TYPE_TABS = [
  { value: "", label: "Tất cả" },
  { value: "shirt_order", label: "👕 Đặt áo" },
  { value: "tournament", label: "🏆 Giải đấu" },
  { value: "birthday", label: "🎂 Sinh nhật" },
  { value: "offline_event", label: "🔥 Offline" },
  { value: "poll", label: "📊 Bình chọn" },
];

const EVENT_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open: {
    label: "Mở đăng ký",
    cls: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  upcoming: {
    label: "Sắp diễn ra",
    cls: "bg-[var(--purple-soft)] text-[var(--purple)]",
  },
  ongoing: {
    label: "Chuẩn bị",
    cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  draft: {
    label: "Sắp mở",
    cls: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  },
  closed: {
    label: "Đã đóng",
    cls: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  },
  completed: {
    label: "Đã kết thúc",
    cls: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  },
  cancelled: {
    label: "Đã huỷ",
    cls: "bg-[var(--danger-soft)] text-[var(--danger)]",
  },
};

const EVENT_TYPE_STATUS_OVERRIDE: Record<string, Record<string, string>> = {
  shirt_order: { open: "Đang nhận đăng ký", closed: "Đã đóng đăng ký" },
  tournament: { open: "Mở đăng ký" },
  birthday: { upcoming: "Sắp diễn ra" },
  offline_event: { ongoing: "Chuẩn bị", draft: "Chuẩn bị" },
  poll: { open: "Cần bình chọn" },
};

function getEventParticipantLabel(type: string, count: number) {
  switch (type) {
    case "tournament":
      return `${count} người đã đăng ký`;
    case "birthday":
      return `${count} thành viên`;
    case "poll":
      return `${count} lượt bình chọn`;
    default:
      return `Đã đăng kí ${count} áo`;
  }
}

function getEventParticipantIcon(type: string) {
  if (type === "birthday") return Gift;
  if (type === "poll") return BarChart3;
  return Users;
}

function useFadeIn(trigger: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!trigger) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [trigger]);
  return visible;
}

function EnergyBar({
  filled,
  max,
  status,
  dimmed = false,
  animated = true,
}: {
  filled: number;
  max: number;
  status?: string;
  dimmed?: boolean;
  animated?: boolean;
}) {
  const ratio = max > 0 ? filled / max : 0;
  const pct = Math.round(Math.min(1, ratio) * 100);
  const isFull = ratio >= 1;
  const isCompleted = status === "completed" || dimmed;
  const isStatic = isFull || isCompleted || !animated;

  const gradient = isCompleted
    ? "#9ca3af"
    : isFull
      ? "#ef4444"
      : ratio >= 0.6
        ? "linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)"
        : "linear-gradient(90deg, #4ade80, #22c55e, #4ade80)";

  return (
    <div className="w-full h-3.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
      <div
        className="h-full rounded-full relative overflow-hidden"
        style={{
          width: `${pct}%`,
          background: gradient,
          backgroundSize: isStatic ? "100% 100%" : "200% 100%",
          animation: isStatic
            ? undefined
            : "energyFlow 2s linear infinite, energyGrow 0.6s ease-out",
          transition: "width 0.5s ease",
        }}
      >
        {!isStatic && (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
              animation: "energyShine 1.6s ease-in-out infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}

const BANK_DISPLAY_NAMES: Record<string, string> = {
  MB: "MB Bank",
  VCB: "Vietcombank",
  TCB: "Techcombank",
  ACB: "ACB",
  BIDV: "BIDV",
  VTB: "VietinBank",
  TPB: "TPBank",
  STB: "Sacombank",
  VPB: "VPBank",
  MSB: "MSB",
};

function fmt(n: number) {
  return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

function energyTextCls(ratio: number, dimmed = false) {
  if (dimmed) return "text-[var(--text-faint)] font-medium";
  if (ratio >= 1) return "text-[var(--danger)] font-medium";
  if (ratio >= 0.6) return "text-[var(--warning)] font-medium";
  return "text-[var(--success)]";
}

function SessionPaymentModal({
  session,
  reg,
  userFullName,
  onClose,
  onSuccess,
}: {
  session: any;
  reg: any;
  userFullName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [myGuests, setMyGuests] = useState<any[]>([]);
  const [payType, setPayType] = useState<"solo" | "grouped" | null>(null);
  const [payMethod, setPayMethod] = useState<"choose" | "transfer" | "cash" | "wallet">("choose");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [sendingCash, setSendingCash] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    setLoadingGuests(true);
    registrationsApi
      .listBySession(session.id)
      .then(({ data }) => {
        const guests = (data.data ?? []).filter(
          (r: any) => r.host_registration_id === reg.id,
        );
        setMyGuests(guests);
        if (guests.length === 0) setPayType("solo");
      })
      .finally(() => setLoadingGuests(false));
  }, [session.id, reg.id]);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const guestTotal = myGuests.reduce(
    (sum: number, g: any) => sum + (g.amount_override ?? 0),
    0,
  );
  const soloAmount = reg.amount_override ?? 0;
  const groupedAmount = soloAmount + guestTotal;

  const companionName = (g: any) =>
    g.is_guest ? g.guest_full_name : g.users?.full_name;
  const hasMemberCompanion = myGuests.some((g: any) => !g.is_guest);
  const companionLabel = hasMemberCompanion ? "người đi cùng" : "khách đi cùng";

  const goToBill = (method: string) => {
    close();
    router.push(`/sessions/${session.id}/bill?method=${method}`);
  };

  const amt = payType === "grouped" ? groupedAmount : soloAmount;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{
        zIndex: 99999,
        background: visible ? "var(--overlay)" : "transparent",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background .3s, backdrop-filter .3s",
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full bg-[var(--surface)] rounded-t-2xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              {!payType
                ? "Chọn hình thức thanh toán"
                : payMethod === "choose"
                  ? "Chọn phương thức"
                  : payMethod === "transfer"
                    ? "Chuyển khoản"
                    : payMethod === "wallet"
                      ? "Trừ ví BNB"
                      : "Tiền mặt"}
            </p>
            <p className="text-xs text-[var(--text-faint)] mt-0.5">{session.title}</p>
          </div>
          <button onClick={close} className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center">
            <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loadingGuests ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-faint)]" />
            </div>
          ) : (
            <>
              {!payType && myGuests.length > 0 && (
                <div className="space-y-3" style={{ animation: "fadeSlideUp .25s ease both" }}>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Bạn muốn thanh toán:</p>
                  <button
                    onClick={() => { setPayType("solo"); setPayMethod("choose"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">👤</div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Tiền của riêng tôi</p>
                      <p className="text-lg font-black text-[var(--primary)] mt-0.5">{fmt(soloAmount)}</p>
                      <p className="text-xs text-[var(--text-faint)]">
                        {companionLabel.charAt(0).toUpperCase() + companionLabel.slice(1)} ({myGuests.map(companionName).join(", ")}) tự thanh toán riêng
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setPayType("grouped"); setPayMethod("choose"); }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--purple)] hover:bg-[var(--purple-soft)] transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-[var(--purple-soft)] flex items-center justify-center text-xl">👥</div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Gộp cả {companionLabel}</p>
                      <p className="text-lg font-black text-[var(--purple)] mt-0.5">{fmt(groupedAmount)}</p>
                      <p className="text-xs text-[var(--text-faint)]">
                        Bao gồm: {myGuests.map((g: any) => `${companionName(g)} (${fmt(g.amount_override ?? 0)})`).join(", ")}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {payType && (
                <div key={payType} style={{ animation: "fadeSlideUp .25s ease both" }}>
                  <div className="flex items-center justify-between bg-[var(--danger-soft)] rounded-xl px-4 py-3">
                    <span className="text-sm text-[var(--text-muted)]">Số tiền thanh toán</span>
                    <span className="text-lg font-black text-[var(--danger)]">{fmt(amt)}</span>
                  </div>

                  {payMethod === "choose" && (
                    <div className="space-y-3 mt-4" key="choose" style={{ animation: "fadeSlideUp .25s ease both" }}>
                      <button
                        onClick={() => setPayMethod("wallet")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">Ví BNB</p>
                          <p className="text-xs text-[var(--text-faint)] mt-0.5">Trừ thẳng vào số dư ví — xác nhận ngay lập tức</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setPayMethod("transfer")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">🏦</div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">Chuyển khoản</p>
                          <p className="text-xs text-[var(--text-faint)] mt-0.5">Quét QR VietQR, gửi ảnh bill xác nhận</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setPayMethod("cash")}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-soft)] transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center text-xl">💵</div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">Tiền mặt</p>
                          <p className="text-xs text-[var(--text-faint)] mt-0.5">Thông báo admin, nộp tiền trực tiếp</p>
                        </div>
                      </button>
                      {myGuests.length > 0 && (
                        <button onClick={() => setPayType(null)} className="w-full py-2 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)]">
                          ← Quay lại chọn kiểu thanh toán
                        </button>
                      )}
                    </div>
                  )}

                  {payMethod === "wallet" && (
                    <div className="space-y-4 mt-4" key="wallet" style={{ animation: "fadeSlideUp .25s ease both" }}>
                      <div className="bg-[var(--primary-soft)] rounded-xl p-4">
                        <p className="text-sm font-semibold text-[var(--primary)] mb-1 flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Số dư ví sẽ bị trừ ngay lập tức. Admin không cần duyệt thêm.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPayMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                          Quay lại
                        </button>
                        <button
                          onClick={async () => {
                            setSubmittingPay(true);
                            try {
                              if (myGuests.length > 0) {
                                await walletApi.confirmGuestPayment(reg.id, payType === "grouped" ? "grouped" : "separate");
                              } else {
                                await walletApi.payRegistration(reg.id);
                              }
                              toast.success("Đã thanh toán bằng ví BNB!");
                              onSuccess();
                              goToBill("wallet");
                            } catch (err: any) {
                              toast.error(err?.response?.data?.message ?? "Thanh toán thất bại");
                            } finally {
                              setSubmittingPay(false);
                            }
                          }}
                          disabled={submittingPay}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                        >
                          {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <Wallet className="w-3.5 h-3.5" /> Xác nhận trừ ví
                        </button>
                      </div>
                    </div>
                  )}

                  {payMethod === "transfer" && (() => {
                    const ref = buildTransferNote(userFullName ?? "", session.title, session.scheduled_at);
                    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
                    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
                    const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;
                    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

                    const handleCopyContent = () => {
                      navigator.clipboard.writeText(ref);
                      toast.success("Đã copy nội dung chuyển khoản");
                    };
                    const handleSaveQr = async () => {
                      try {
                        const res = await fetch(qr);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `vietqr-${ref}.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast.error("Không thể lưu ảnh, vui lòng chụp màn hình");
                      }
                    };
                    const handleConfirmTransferred = async () => {
                      setSubmittingPay(true);
                      try {
                        await registrationsApi.submitPayment(reg.id, {
                          payment_reference: ref,
                          pay_type: payType as "solo" | "grouped",
                          grouped_amount: payType === "grouped" ? groupedAmount : undefined,
                        });
                        toast.success("Đã ghi nhận, chờ admin xác nhận!");
                        onSuccess();
                        goToBill("transfer");
                      } catch {
                        toast.error("Gửi thất bại");
                      } finally {
                        setSubmittingPay(false);
                      }
                    };

                    return (
                      <div className="space-y-4 mt-4" key="transfer" style={{ animation: "fadeSlideUp .25s ease both" }}>
                        {/* QR luôn nằm trên nền trắng để máy quét đọc được ở dark mode */}
                        <div className="bg-white border-2 border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2">
                          <p className="text-xs text-gray-500">Quét mã QR để thanh toán</p>
                          <img src={qr} alt="VietQR" className="w-48 h-48 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
                            <span className="text-[var(--text-muted)]">Tên tài khoản</span>
                            <span className="font-semibold text-[var(--text)]">{bankAccountName}</span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-[var(--text-muted)]">Số tiền</span>
                            <span className="font-bold text-[var(--danger)]">{fmt(amt)}</span>
                          </div>
                          <div className="px-4 py-2.5">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-muted)]">Nội dung CK</span>
                              <span className="font-mono font-semibold text-[var(--text)]">{ref}</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-faint)] mt-1">Nội dung chuyển khoản là bắt buộc</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleCopyContent} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors">
                            <Copy className="w-3.5 h-3.5" /> Sao chép nội dung
                          </button>
                          <button onClick={handleSaveQr} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors">
                            <Download className="w-3.5 h-3.5" /> Lưu QR
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setPayMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                            Quay lại
                          </button>
                          <button
                            onClick={handleConfirmTransferred}
                            disabled={submittingPay}
                            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Tôi đã chuyển khoản
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {payMethod === "cash" && (
                    <div className="space-y-4 mt-4" key="cash" style={{ animation: "fadeSlideUp .25s ease both" }}>
                      <div className="bg-[var(--success-soft)] rounded-xl p-4">
                        <p className="text-sm font-semibold text-[var(--success)] mb-1">💵 Thanh toán tiền mặt</p>
                        <p className="text-xs text-[var(--text-muted)]">Admin sẽ xác nhận sau khi nhận tiền trực tiếp.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPayMethod("choose")} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]">
                          Quay lại
                        </button>
                        <button
                          onClick={async () => {
                            setSendingCash(true);
                            try {
                              await registrationsApi.requestCash(reg.id, {
                                pay_type: payType as "solo" | "grouped",
                                grouped_amount: payType === "grouped" ? groupedAmount : undefined,
                              });
                              toast.success("Đã thông báo admin!");
                              onSuccess();
                              goToBill("cash");
                            } catch {
                              toast.error("Gửi thất bại");
                            } finally {
                              setSendingCash(false);
                            }
                          }}
                          disabled={sendingCash}
                          className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {sendingCash && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Thông báo admin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SessionsTab({
  onPendingBillsChange,
  onOpenSessionsChange,
}: {
  onPendingBillsChange: (count: number) => void;
  onOpenSessionsChange: (hasOpen: boolean) => void;
}) {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [modalSession, setModalSession] = useState<{ id: string; title: string } | null>(null);
  const fadeIn = useFadeIn(!loading);
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [payModalSession, setPayModalSession] = useState<any>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const PAGE_SIZE = 10;
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pendingBillsSeqRef = useRef(0);
  const pendingBillsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSheet = () => {
    setSheetOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
  };
  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetOpen(false), 300);
  };

  const fetchSessions = useCallback(
    async (opts?: { silent?: boolean; targetLimit?: number }) => {
      const silent = opts?.silent ?? false;
      const targetLimit = opts?.targetLimit ?? limit;
      if (!silent) setLoading(true);
      try {
        const params: any = { limit: targetLimit };
        if (
          filter &&
          filter !== "waiting_payment" &&
          filter !== "waiting_admin_confirm"
        ) {
          params.status = filter;
        }

        const { data } = await sessionsApi.list(params);
        let list = data.data ?? [];
        const rawFetchedCount = list.length;
        const total = data.meta?.total ?? rawFetchedCount;

        if (filter === "waiting_payment") {
          list = list.filter(
            (s: any) => s.my_registration?.payment_status === "pending",
          );
        } else if (filter === "waiting_admin_confirm") {
          list = list.filter(
            (s: any) => s.status === "waiting_payment" && !s.all_paid,
          );
        }

        if (filter !== "cancelled") {
          list = list.filter((s: any) => s.status !== "cancelled");
        }

        const sorted = [...list].sort((a: any, b: any) => {
          if (!filter) {
            const aOpen = a.status === "open" ? 0 : 1;
            const bOpen = b.status === "open" ? 0 : 1;
            if (aOpen !== bOpen) return aOpen - bOpen;
          }
          const aTime = new Date(a.created_at ?? a.scheduled_at).getTime();
          const bTime = new Date(b.created_at ?? b.scheduled_at).getTime();
          return bTime - aTime;
        });

        setSessions(sorted);
        setHasMore(rawFetchedCount < total);
        setLimit(targetLimit);
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, limit],
  );

  const applyOptimisticRegister = useCallback((sessionId: string, registration: any) => {
    setSessions((prev) =>
      prev.map((sess) => {
        if (sess.id !== sessionId) return sess;
        const nextAvailable = Math.max(0, (sess.available_slots ?? 0) - 1);
        return {
          ...sess,
          my_registration: registration,
          available_slots: nextAvailable,
          status: nextAvailable <= 0 ? "full" : sess.status,
        };
      }),
    );
  }, []);

  const fetchPendingBills = useCallback(async () => {
    const mySeq = ++pendingBillsSeqRef.current;
    try {
      const { data } = await sessionsApi.list({ limit: 50 });
      if (mySeq !== pendingBillsSeqRef.current) return;
      const allSessions = data.data ?? [];
      const bills = allSessions.filter(
        (s: any) =>
          s.my_registration?.amount_override > 0 &&
          s.my_registration?.payment_status === "pending" &&
          !s.my_registration?.payment_reference,
      );
      setPendingBills(bills);
      onPendingBillsChange(bills.length);
      onOpenSessionsChange(allSessions.some((s: any) => s.status === "open"));
    } catch { }
  }, [onPendingBillsChange, onOpenSessionsChange]);

  const scheduleFetchPendingBills = useCallback(() => {
    if (pendingBillsDebounceRef.current) clearTimeout(pendingBillsDebounceRef.current);
    pendingBillsDebounceRef.current = setTimeout(fetchPendingBills, 300);
  }, [fetchPendingBills]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchSessions({ silent: true, targetLimit: limit + PAGE_SIZE });
  }, [loadingMore, hasMore, loading, limit, fetchSessions]);

  useEffect(() => {
    fetchPendingBills();
  }, [fetchPendingBills]);

  useEffect(() => {
    fetchSessions({ targetLimit: PAGE_SIZE });
  }, [filter]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { root: scrollRef.current, rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const fetchSessionsRef = useRef(fetchSessions);
  useEffect(() => {
    fetchSessionsRef.current = fetchSessions;
  }, [fetchSessions]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`activity-realtime:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => {
          fetchSessionsRef.current({ silent: true });
          scheduleFetchPendingBills();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => {
          fetchSessionsRef.current({ silent: true });
          scheduleFetchPendingBills();
        },
      )
      .subscribe();

    return () => {
      if (pendingBillsDebounceRef.current) clearTimeout(pendingBillsDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, scheduleFetchPendingBills]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const activeOpt =
    SESSION_FILTER_TABS.find((o) => o.value === filter) ?? SESSION_FILTER_TABS[0];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <button
        type="button"
        onClick={openSheet}
        className="shrink-0 w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 hover:border-[var(--border-strong)] active:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[var(--text-faint)]" />
          {activeOpt.dot && (
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeOpt.dot}`}
            />
          )}
          <span className="text-sm text-[var(--text)] font-medium">
            {activeOpt.label}
          </span>
          {filter && (
            <span className="text-[11px] font-semibold bg-[var(--primary-soft)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] px-2 py-0.5 rounded-full">
              Đang lọc
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
          Lọc <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>

      <div ref={scrollRef} className={`${SCROLL_AREA} space-y-4`}>

        {pendingBills.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPayModalSession({ session: s, reg: s.my_registration })}
            className="w-full flex items-center justify-between bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] rounded-2xl px-4 py-3 active:opacity-80 transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate">
                {s.title}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {format(new Date(s.scheduled_at), "EEE dd/MM", { locale: vi })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-bold text-[var(--danger)]">
                {s.my_registration.amount_override.toLocaleString("vi-VN")}đ
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--danger)]" />
            </div>
          </button>
        ))}

        <div
          className="space-y-4"
          style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease" }}
        >
          {loading ? (
            <SkeletonList count={4} Component={SessionSkeleton} />
          ) : sessions.length === 0 ? (
            <div
              className="bg-[var(--surface)] rounded-2xl py-14 text-center"
              style={{ animation: "fadeSlideUp .3s ease both" }}
            >
              <CalendarDays className="w-10 h-10 mx-auto text-[var(--border-strong)] mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Không có buổi đánh nào</p>
            </div>
          ) : (
            sessions.map((s, idx) => {
              const cfg =
                s.status === "waiting_payment" && s.all_paid
                  ? SESSION_STATUS_CFG.waiting_admin_finish
                  : (SESSION_STATUS_CFG[s.status] ?? SESSION_STATUS_CFG.open);
              const myReg = s.my_registration;
              const showRegisteredBadge =
                myReg && !(s.status === "waiting_payment" && s.all_paid);
              const cornerBadgeLabel = showRegisteredBadge
                ? "Bạn đã đăng ký"
                : s.status === "waiting_payment" && !myReg && !s.all_paid
                  ? "Chờ admin chốt thanh toán"
                  : cfg.label;
              const effectiveStatus =
                myReg?.participation_status === "pending_approval"
                  ? "pending_approval"
                  : myReg?.participation_status === "awaiting_checkin"
                    ? "awaiting_checkin"
                    : myReg?.payment_status === "pending" &&
                      myReg?.amount_override == null
                      ? "awaiting_finish"
                      : myReg?.payment_status === "pending" &&
                        myReg?.payment_reference
                        ? "pending_review"
                        : myReg?.payment_status;
              const regCfg = effectiveStatus
                ? (REG_CFG[effectiveStatus] ?? REG_CFG.pending)
                : null;
              const RegIcon = regCfg?.icon;
              const filled = s.approved_count ?? Math.max(
                0,
                (s.max_slots ?? 0) - (s.available_slots ?? 0),
              );
              const ratio = s.max_slots > 0 ? filled / s.max_slots : 0;
              const isFull = s.available_slots <= 0;
              const canRegister = s.status === "open" && !isFull && !myReg;

              const slotDimmed =
                Boolean(myReg?.amount_override) ||
                s.status === "waiting_payment" ||
                s.status === "cancelled";

              return (
                <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                  <div
                    className={`relative bg-[var(--surface)] rounded-2xl p-4 border shadow-md transition-all active:scale-[0.99] ${myReg ? "border-[color-mix(in_srgb,var(--primary)_30%,transparent)]" : "border-transparent"} ${s.status === "completed" ? "opacity-55 grayscale-[0.3]" : ""}`}
                    style={{
                      boxShadow: "var(--shadow)",
                      animation: "fadeSlideUp .35s ease both",
                      animationDelay: `${idx * 50}ms`,
                    }}
                  >
                    {s.status === "completed" ? (
                      <div
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--text-faint)] shadow-md flex items-center justify-center z-10"
                        title="Buổi đã hoàn thành"
                      >
                        <Lock className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      isFull && !myReg && (
                        <div
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 shadow-md shadow-red-200 flex items-center justify-center z-10"
                          title="Buổi đã đầy chỗ"
                        >
                          <Lock className="w-3.5 h-3.5 text-white" />
                        </div>
                      )
                    )}

                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-[var(--text)] leading-tight truncate flex-1 min-w-0">
                        {s.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${showRegisteredBadge
                          ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
                          : cfg.badgeCls
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${showRegisteredBadge ? "bg-blue-400" : cfg.dotCls
                            }`}
                        />
                        {cornerBadgeLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] mb-3">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(s.scheduled_at), "EEE dd/MM, HH:mm", {
                          locale: vi,
                        })}
                      </span>
                      {s.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">
                            {s.location}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.duration_minutes} phút
                      </span>
                    </div>
                    {s.status !== "completed" && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
                            <Zap className="w-3 h-3" />
                            Chỗ trống
                          </span>
                          <span className={`text-xs ${energyTextCls(ratio, slotDimmed)}`}>
                            {isFull
                              ? "Hết chỗ"
                              : `Còn ${s.available_slots} / ${s.max_slots}`}
                          </span>
                        </div>
                        <EnergyBar
                          filled={filled}
                          max={s.max_slots}
                          status={s.status}
                          dimmed={slotDimmed}
                          animated={false}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        {myReg
                          ? regCfg && (
                            <span
                              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${regCfg.cls}`}
                            >
                              <RegIcon className="w-3.5 h-3.5" />
                              {regCfg.label}
                            </span>
                          )
                          : isFull && (
                            <span className="text-xs text-[var(--text-faint)]">
                              Đã hết chỗ
                            </span>
                          )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalSession({ id: s.id, title: s.title });
                          }}
                          className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-2 py-1 active:bg-[var(--surface-hover)] transition-colors"
                        >
                          <Users className="w-3.5 h-4.5" />
                          {filled} người
                          {(s.male_count > 0 || s.female_count > 0) && (
                            <span className="flex items-center gap-1.5 ml-1.5 pl-1.5 border-l border-[var(--border)]">
                              <span className="text-[var(--primary)] font-medium">👨 {s.male_count ?? 0}</span>
                              <span className="text-[var(--pink)] font-medium">👩 {s.female_count ?? 0}</span>
                            </span>
                          )}
                        </button>
                        {myReg &&
                          myReg.amount_override > 0 &&
                          myReg.payment_status === "pending" &&
                          !myReg.payment_reference &&
                          myReg.participation_status === "confirmed" && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPayModalSession({ session: s, reg: myReg });
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-full animate-pulse"
                            >
                              💳 Thanh toán{" "}
                              {myReg.amount_override.toLocaleString("vi-VN")}đ
                            </button>
                          )}
                      </div>
                      {canRegister ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (registeringId) return;
                            setRegisteringId(s.id);
                            try {
                              const { data } = await registrationsApi.register({ session_id: s.id });
                              applyOptimisticRegister(s.id, data?.registration ?? {
                                id: `temp-${Date.now()}`,
                                payment_status: "pending",
                                participation_status: "pending_approval",
                              });
                              toast.success(data?.message ?? "Đăng ký thành công, vui lòng chờ admin duyệt");
                              fetchSessions({ silent: true });
                            } catch {
                            } finally {
                              setRegisteringId(null);
                            }
                          }}
                          disabled={registeringId === s.id}
                          className={`flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white bg-blue-600 shadow-sm active:scale-95 transition-all duration-300 ease-out overflow-hidden ${registeringId === s.id
                            ? "w-8 h-8 rounded-full gap-0 p-0"
                            : "w-[124px] h-8 gap-1 px-3 rounded-lg"
                            }`}
                          style={{
                            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        >
                          {registeringId === s.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Đăng ký ngay <ChevronRight className="w-3.5 h-4.5" />
                            </>
                          )}
                        </button>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--text-faint)] flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {!loading && sessions.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-faint)]" />
            ) : hasMore ? (
              <button
                onClick={loadMore}
                className="text-xs font-medium text-[var(--primary)] bg-[var(--primary-soft)] px-4 py-2 rounded-full active:opacity-80"
              >
                Xem thêm
              </button>
            ) : sessions.length > PAGE_SIZE ? (
              <span className="text-xs text-[var(--text-faint)]">Đã hiển thị hết</span>
            ) : null}
          </div>
        )}

      </div>

      {modalSession && (
        <MembersModal
          sessionId={modalSession.id}
          sessionTitle={modalSession.title}
          onClose={() => setModalSession(null)}
        />
      )}

      {payModalSession && (
        <SessionPaymentModal
          session={payModalSession.session}
          reg={payModalSession.reg}
          userFullName={user?.full_name ?? ""}
          onClose={() => setPayModalSession(null)}
          onSuccess={() => {
            setPayModalSession(null);
            setTimeout(() => {
              fetchSessions({ silent: true });
              fetchPendingBills();
            }, 300);
          }}
        />
      )}

      {sheetOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{
              background: sheetVisible ? "var(--overlay)" : "transparent",
              backdropFilter: sheetVisible ? "blur(2px)" : "none",
              transition: "background .3s, backdrop-filter .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && closeSheet()}
          >
            <div
              className="w-full bg-[var(--surface)] rounded-t-2xl"
              style={{
                maxWidth: 480,
                margin: "0 auto",
                transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
                transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 bg-[var(--border-strong)] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Lọc theo trạng thái
                </span>
                <button
                  onClick={closeSheet}
                  className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="py-2">
                {SESSION_FILTER_TABS.map((opt) => {
                  const isActive = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value);
                        closeSheet();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isActive ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-hover)]"}`}
                    >
                      <div className="flex items-center gap-3">
                        {opt.dot && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                          />
                        )}
                        <span
                          className={`text-sm font-medium ${isActive ? "text-[var(--primary)]" : "text-[var(--text)]"}`}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 pt-3 pb-8 border-t border-[var(--border)]">
                <button
                  onClick={closeSheet}
                  className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)]"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MatchesTab({
  onActiveMatchChange,
}: {
  onActiveMatchChange: (m: any) => void;
}) {
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fadeIn = useFadeIn(!loading);

  const openSheet = () => {
    setSheetOpen(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetVisible(true)),
    );
  };
  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetOpen(false), 300);
  };

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 30 };
      if (filter) params.status = filter;
      const { data } = await matchesApi.list(params);
      const list = data.data ?? [];
      setMatches(list);

      const { data: allData } = await matchesApi.list({ limit: 50 });
      const allList = allData.data ?? [];
      const active =
        allList.find((m: any) => BLOCKING_STATUSES.includes(m.status)) ?? null;
      setActiveMatch(active);
      onActiveMatchChange(active);
    } finally {
      setLoading(false);
    }
  }, [filter, onActiveMatchChange]);

  const fetchMatchesRef = useRef<() => Promise<void>>(async () => { });
  useEffect(() => {
    fetchMatchesRef.current = fetchMatches;
  }, [fetchMatches]);
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`matches-list:${user.id}`)
      .on("broadcast", { event: "match_result" }, () => fetchMatchesRef.current())
      .on("broadcast", { event: "match_created" }, () => fetchMatchesRef.current())
      .on("broadcast", { event: "match_status_changed" }, () => fetchMatchesRef.current())
      .on("broadcast", { event: "admin_match_created" }, () => fetchMatchesRef.current())
      .on("broadcast", { event: "match_deleted" }, () => fetchMatchesRef.current())
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const handleCancelMatch = async (matchId: string) => {
    if (!confirm("Huỷ trận đấu này? Hành động không thể hoàn tác.")) return;
    setCancellingId(matchId);
    try {
      await matchesApi.cancel(matchId);
      toast.success("Đã huỷ trận đấu");
      fetchMatchesRef.current();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Huỷ trận thất bại");
    } finally {
      setCancellingId(null);
    }
  };

  const activeOpt =
    MATCH_FILTER_OPTS.find((o) => o.value === filter) ?? MATCH_FILTER_OPTS[0];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <button
        type="button"
        onClick={openSheet}
        className="shrink-0 w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 hover:border-[var(--border-strong)] active:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[var(--text-faint)]" />
          <span className="text-sm text-[var(--text)] font-medium">
            {activeOpt.label}
          </span>
          {filter && (
            <span className="text-[11px] font-semibold bg-[var(--primary-soft)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] px-2 py-0.5 rounded-full">
              Đang lọc
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
          Lọc <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>

      <div className={`${SCROLL_AREA} space-y-4`}>
        {activeMatch && (
          <Link href={`/matches/${activeMatch.id}`}>
            <div
              className="flex items-center gap-3 bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] rounded-2xl px-4 py-3 active:opacity-80 transition-colors"
              style={{ animation: "fadeSlideUp .3s ease both" }}
            >
              <div className="w-9 h-9 rounded-full bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] flex items-center justify-center flex-shrink-0">
                <Clock3 className="w-4 h-4 text-[var(--warning)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--warning)]">
                  Có trận chưa hoàn thành
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {MATCH_STATUS_CFG[activeMatch.status]?.label} · Nhấp vào để thêm
                  tỉ số
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--warning)] flex-shrink-0" />
            </div>
          </Link>
        )}

        <div
          className="space-y-4"
          style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease" }}
        >
          {loading ? (
            <SkeletonList count={4} Component={MatchSkeleton} />
          ) : matches.length === 0 ? (
            <div
              className="bg-[var(--surface)] rounded-2xl py-14 text-center border border-dashed border-[var(--border)]"
              style={{ animation: "fadeSlideUp .3s ease both" }}
            >
              <Swords className="w-10 h-10 mx-auto text-[var(--border-strong)] mb-3" />
              <p className="text-[var(--text-faint)] text-sm">Chưa có trận nào</p>
              <Link href="/matches/create">
                <span className="inline-block mt-3 text-xs text-[var(--primary)] font-semibold bg-[var(--primary-soft)] px-4 py-2 rounded-full">
                  Thách đấu ngay →
                </span>
              </Link>
            </div>
          ) : (
            matches.map((m, idx) => {
              const cfg = MATCH_STATUS_CFG[m.status] ?? MATCH_STATUS_CFG.pending_opponent;
              const isTeamA =
                m.player_a1?.id === user?.id ||
                m.player_a2?.id === user?.id ||
                m.player_a3?.id === user?.id;
              const myTeam = isTeamA ? "A" : "B";
              const iWon = m.status === "approved" && m.winner_team === myTeam;
              const iLost = m.status === "approved" && m.winner_team && m.winner_team !== myTeam;
              const myNames = isTeamA
                ? [m.player_a1, m.player_a2, m.player_a3].filter(Boolean)
                : [m.player_b1, m.player_b2, m.player_b3].filter(Boolean);
              const oppNames = isTeamA
                ? [m.player_b1, m.player_b2, m.player_b3].filter(Boolean)
                : [m.player_a1, m.player_a2, m.player_a3].filter(Boolean);
              const isPendingMe = m.status === "pending_opponent" && m.player_b1?.id === user?.id;

              const avatarSizeCls = myNames.length >= 3 ? "w-9 h-9" : "w-12 h-12";
              const initialsTextCls = myNames.length >= 3 ? "text-[10px]" : "text-[11px]";

              const canCancel =
                m.created_by === user?.id &&
                (m.status === "pending_result" || m.status === "pending_approval");
              const isCancelling = cancellingId === m.id;

              return (
                <Link key={m.id} href={`/matches/${m.id}`} className="block mb-1">
                  <div
                    className={`bg-[var(--surface)] rounded-2xl p-4 shadow-md border transition-all active:scale-[0.99] ${isPendingMe ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] border-[1.5px]" : "border-[var(--border)]"}`}
                    style={{
                      boxShadow: "var(--shadow)",
                      animation: "fadeSlideUp .35s ease both",
                      animationDelay: `${idx * 50}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        {isPendingMe && (
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                            Bạn được mời!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                          {m.match_type === "triples"
                            ? "👥 3v3"
                            : m.match_type === "doubles"
                              ? "👥 Đôi"
                              : "👤 Đơn"}{" "}
                          · 1 set
                        </span>
                        {iWon && (
                          <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success-soft)] border border-[color-mix(in_srgb,var(--success)_35%,transparent)] px-2 py-0.5 rounded-full">
                            🏆 Thắng
                          </span>
                        )}
                        {iLost && (
                          <span className="text-[10px] font-bold text-[var(--danger)] bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] px-2 py-0.5 rounded-full">
                            Thua
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        {myNames.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-1.5">
                            {p.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={p.full_name}
                                className={`${avatarSizeCls} rounded-full object-cover flex-shrink-0 mb-2`}
                              />
                            ) : (
                              <div className={`${avatarSizeCls} rounded-full bg-[var(--primary-soft)] flex items-center justify-center ${initialsTextCls} font-bold text-[var(--primary)] flex-shrink-0 mb-2`}>
                                {p.full_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-[var(--text)] leading-tight break-words">
                              {p.full_name}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex-shrink-0 text-center">
                        {(m.status === "approved" ||
                          m.status === "pending_approval") &&
                          m.sets?.length > 0 ? (
                          (() => {
                            const s = m.sets[0];
                            const myScore = isTeamA ? s.score_a : s.score_b;
                            const oppScore = isTeamA ? s.score_b : s.score_a;
                            return (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xl font-black ${iWon ? "text-[var(--success)]" : "text-[var(--text-faint)]"}`}
                                >
                                  {myScore}
                                </span>
                                <span className="text-[var(--text-faint)]">–</span>
                                <span
                                  className={`text-xl font-black ${iLost ? "text-[var(--success)]" : "text-[var(--text-faint)]"}`}
                                >
                                  {oppScore}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[var(--text-faint)] font-bold text-sm">
                            VS
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        {oppNames.map((p: any) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-end gap-1.5"
                          >
                            <span className="text-xs font-semibold text-[var(--text)] leading-tight break-words text-right">
                              {p.full_name}
                            </span>
                            {p.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={p.full_name}
                                className={`${avatarSizeCls} rounded-full object-cover flex-shrink-0 mb-2`}
                              />
                            ) : (
                              <div className={`${avatarSizeCls} rounded-full bg-[var(--danger-soft)] flex items-center justify-center ${initialsTextCls} font-bold text-[var(--danger)] flex-shrink-0 mb-2`}>
                                {p.full_name?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-faint)]">
                        {m.played_at
                          ? format(new Date(m.played_at), "EEE dd/MM/yyyy", { locale: vi })
                          : format(new Date(m.created_at), "dd/MM/yyyy", { locale: vi })}
                      </span>

                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelMatch(m.id);
                            }}
                            disabled={isCancelling}
                            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isCancelling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Huỷ trận
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-[var(--text-faint)]" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {sheetOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{
              background: sheetVisible ? "var(--overlay)" : "transparent",
              backdropFilter: sheetVisible ? "blur(2px)" : "none",
              transition: "background .3s, backdrop-filter .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && closeSheet()}
          >
            <div
              className="w-full bg-[var(--surface)] rounded-t-2xl"
              style={{
                maxWidth: 480,
                margin: "0 auto",
                transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
                transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 bg-[var(--border-strong)] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Lọc theo trạng thái
                </span>
                <button
                  onClick={closeSheet}
                  className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="py-2">
                {MATCH_FILTER_OPTS.map((opt) => {
                  const isActive = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value);
                        closeSheet();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isActive ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-hover)]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                        />
                        <span
                          className={`text-sm font-medium ${isActive ? "text-[var(--primary)]" : "text-[var(--text)]"}`}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 pt-3 pb-8 border-t border-[var(--border)]">
                <button
                  onClick={closeSheet}
                  className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)]"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function getEventCapacity(a: any): number | null {
  if (a.type === "tournament") {
    const composition = a.detail?.composition ?? [];
    const maxTeams = a.detail?.max_teams ?? 0;
    const capacity = composition.length * maxTeams;
    return capacity > 0 ? capacity : null;
  }
  return (
    a.detail?.max_slots ??
    a.detail?.max_teams ??
    a.detail?.max_participants ??
    null
  );
}

function EventsTab({
  onOpenEventsChange,
}: {
  onOpenEventsChange: (hasOpen: boolean) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const fadeIn = useFadeIn(!loading);


  const handleShirtOrderClick = async (activityId: string) => {
    if (checkingId) return;
    setCheckingId(activityId);
    try {
      const { data } = await activitiesApi.getMyStatus(activityId);
      const hasOrdered =
        Array.isArray(data?.my_registrations) && data.my_registrations.length > 0;
      router.push(
        hasOrdered ? `/events/${activityId}/history` : `/events/${activityId}`,
      );
    } catch {
      router.push(`/events/${activityId}`);
    } finally {
      setCheckingId(null);
    }
  };

  const openSheet = () => {
    setSheetOpen(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetVisible(true)),
    );
  };
  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetOpen(false), 300);
  };

  const fetchEvents = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      try {
        const { data } = await activitiesApi.list({
          type: typeFilter || undefined,
          limit: 30,
        });
        const list = data.data ?? [];
        setItems(list);
        onOpenEventsChange(list.some((a: any) => a.status === "open"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [typeFilter, onOpenEventsChange],
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const fetchEventsRef = useRef(fetchEvents);
  useEffect(() => {
    fetchEventsRef.current = fetchEvents;
  }, [fetchEvents]);

  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefetch = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        fetchEventsRef.current({ silent: true });
      }, 300);
    };

    const channel = supabase
      .channel("activities-list-changes")
      .on("broadcast", { event: "activities_changed" }, scheduleRefetch)
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const activeOpt =
    EVENT_TYPE_TABS.find((o) => o.value === typeFilter) ?? EVENT_TYPE_TABS[0];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <button
        type="button"
        onClick={openSheet}
        className="shrink-0 w-full flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 hover:border-[var(--border-strong)] active:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-[var(--text-faint)]" />
          <span className="text-sm text-[var(--text)] font-medium">
            {activeOpt.label}
          </span>
          {typeFilter && (
            <span className="text-[11px] font-semibold bg-[var(--primary-soft)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] px-2 py-0.5 rounded-full">
              Đang lọc
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
          Lọc <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>

      <div
        className={`${SCROLL_AREA} space-y-3`}
        style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        {loading ? (
          <SkeletonList count={4} Component={EventSkeleton} />
        ) : items.length === 0 ? (
          <div
            className="bg-[var(--surface)] rounded-2xl py-14 text-center border border-dashed border-[var(--border)]"
            style={{ animation: "fadeSlideUp .3s ease both" }}
          >
            <Megaphone className="w-10 h-10 mx-auto text-[var(--border-strong)] mb-3" />
            <p className="text-[var(--text-faint)] text-sm">Chưa có hoạt động nào</p>
          </div>
        ) : (
          items.map((a, idx) => {
            const ParticipantIcon = getEventParticipantIcon(a.type);
            const dateValue = a.deadline ?? a.event_date;
            const isDeadline = Boolean(a.deadline);

            const maxCapacity = getEventCapacity(a);
            const participantCount = a.participant_count ?? 0;
            const hasCapacity = maxCapacity != null && maxCapacity > 0;
            const ratio = hasCapacity ? participantCount / maxCapacity : 0;
            const isFull =
              a.type === "tournament"
                ? Boolean(a.is_full)
                : hasCapacity && participantCount >= maxCapacity;
            const isChecking = checkingId === a.id;

            const isEffectivelyClosed =
              isFull && a.status !== "cancelled" && a.status !== "completed";

            const cfg = isEffectivelyClosed
              ? EVENT_STATUS_CFG.closed
              : (EVENT_STATUS_CFG[a.status] ?? EVENT_STATUS_CFG.draft);

            const overrideLabel = isEffectivelyClosed
              ? "Đã đóng đăng ký"
              : (a.status_label_override ?? EVENT_TYPE_STATUS_OVERRIDE[a.type]?.[a.status]);

            const cardContent = (
              <div
                className={`bg-[var(--surface)] rounded-2xl p-4 border border-transparent shadow-md active:scale-[0.99] active:bg-[var(--surface-hover)] transition-all relative ${isChecking ? "opacity-60 pointer-events-none" : ""
                  }`}
                style={{
                  boxShadow: "var(--shadow)",
                  animation: "fadeSlideUp .35s ease both",
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                {isChecking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] rounded-2xl z-10">
                    <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {a.cover_image_url ? (
                      <img
                        src={a.cover_image_url}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (a.emoji ?? "📌")
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text)] leading-snug break-words">
                        {a.title}
                      </p>
                      <span
                        className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}
                      >
                        {overrideLabel ?? cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-faint)]">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {isDeadline ? "Ngày chốt ds đăng kí: " : ""}
                        {dateValue
                          ? format(new Date(dateValue), "dd/MM/yyyy", {
                            locale: vi,
                          })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {hasCapacity ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1 text-xs text-[var(--text-faint)]">
                        <ParticipantIcon className="w-3 h-3" />
                        {getEventParticipantLabel(a.type, 0).replace(/^0\s*/, "")}
                      </span>
                      <span
                        className={`text-xs ${isFull
                          ? "text-[var(--danger)] font-medium"
                          : ratio >= 0.6
                            ? "text-[var(--warning)] font-medium"
                            : "text-[var(--success)]"
                          }`}
                      >
                        {isFull ? "Đã đầy" : `${participantCount} / ${maxCapacity}`}
                      </span>
                    </div>
                    <EnergyBar
                      filled={participantCount}
                      max={maxCapacity}
                      status={a.status}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-faint)]">
                    <ParticipantIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{getEventParticipantLabel(a.type, participantCount)}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-faint)] ml-auto" />
                  </div>
                )}
              </div>
            );

            if (a.type === "shirt_order") {
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleShirtOrderClick(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleShirtOrderClick(a.id);
                  }}
                  className="block cursor-pointer"
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link key={a.id} href={`/events/${a.id}`} className="block">
                {cardContent}
              </Link>
            );
          })
        )}
      </div>

      {sheetOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{
              background: sheetVisible ? "var(--overlay)" : "transparent",
              backdropFilter: sheetVisible ? "blur(2px)" : "none",
              transition: "background .3s, backdrop-filter .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && closeSheet()}
          >
            <div
              className="w-full bg-[var(--surface)] rounded-t-2xl"
              style={{
                maxWidth: 480,
                margin: "0 auto",
                transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
                transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 bg-[var(--border-strong)] rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--text)]">
                  Lọc theo loại hoạt động
                </span>
                <button
                  onClick={closeSheet}
                  className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="py-2">
                {EVENT_TYPE_TABS.map((opt) => {
                  const isActive = typeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTypeFilter(opt.value);
                        closeSheet();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isActive ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-hover)]"}`}
                    >
                      <span
                        className={`text-sm font-medium ${isActive ? "text-[var(--primary)]" : "text-[var(--text)]"}`}
                      >
                        {opt.label}
                      </span>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="px-4 pt-3 pb-8 border-t border-[var(--border)]">
                <button
                  onClick={closeSheet}
                  className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)]"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function ActivityPage() {
  const { ref: pageRef, style: pageStyle } = useFillViewport();
  const [tab, setTab] = useState<MainTab>("sessions");
  const [tabVisible, setTabVisible] = useState(true);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: "4px",
    width: "calc(33.333% - 5.33px)",
  });
  const tabRef = useRef<MainTab>("sessions");
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [hasPendingBills, setHasPendingBills] = useState(false);
  const [hasOpenSessions, setHasOpenSessions] = useState(false);
  const [hasOpenEvents, setHasOpenEvents] = useState(false);

  const eventsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchEventBadge = async () => {
      try {
        const { data: eventsData } = await activitiesApi.list({ limit: 30 });
        const hasOpen = (eventsData.data ?? []).some(
          (a: any) => a.status === "open",
        );
        setHasOpenEvents(hasOpen);
      } catch {
      }
    };

    const scheduleFetchEventBadge = () => {
      if (eventsDebounceRef.current) clearTimeout(eventsDebounceRef.current);
      eventsDebounceRef.current = setTimeout(fetchEventBadge, 300);
    };

    fetchEventBadge();

    const channel = supabase
      .channel("activity-events-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        scheduleFetchEventBadge,
      )
      .subscribe();

    return () => {
      if (eventsDebounceRef.current) clearTimeout(eventsDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const TAB_ORDER: MainTab[] = ["sessions", "matches", "events"];

  const indicatorFor = (t: MainTab) => {
    const idx = TAB_ORDER.indexOf(t);
    return {
      left: `calc(${(idx * 100) / 3}% + 4px)`,
      width: "calc(33.333% - 5.33px)",
    };
  };

  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTab = (next: MainTab) => {
    if (next === tabRef.current) return;
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    setTabVisible(false);
    setIndicatorStyle(indicatorFor(next));
    switchTimerRef.current = setTimeout(() => {
      tabRef.current = next;
      setTab(next);
      setTabVisible(true);
      switchTimerRef.current = null;
    }, 150);
  };


  useEffect(() => {
    const remembered = sessionStorage.getItem("activity:return-tab");
    if (remembered === "matches" || remembered === "events") {
      sessionStorage.removeItem("activity:return-tab");
      const t = remembered as MainTab;
      tabRef.current = t;
      setTab(t);
      setIndicatorStyle(indicatorFor(t));
    }
  }, []);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const TAB_META: Record<MainTab, { title: string; subtitle: string }> = {
    sessions: {
      title: "Buổi đánh cầu",
      subtitle: "Chọn buổi và đăng ký tham gia",
    },
    matches: {
      title: "Trận giao hữu",
      subtitle: "Tạo và theo dõi trận đấu của bạn",
    },
    events: {
      title: "Hoạt động",
      subtitle: "Đặt áo, giải đấu, bình chọn và hơn thế",
    },
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes shimmer {
            100% { transform: translateX(200%); }
        }
        @keyframes energyFlow {
            0% { background-position: 0% 0%; }
            100% { background-position: -200% 0%; }
        }
        @keyframes energyGrow {
            from { width: 0%; }
        }
        @keyframes energyShine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .scroll-fade {
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - 7.5rem - env(safe-area-inset-bottom, 0px)),
            transparent calc(100% - 4rem - env(safe-area-inset-bottom, 0px))
          );
          mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - 7.5rem - env(safe-area-inset-bottom, 0px)),
            transparent calc(100% - 4rem - env(safe-area-inset-bottom, 0px))
          );
        }
    `}</style>

      <div ref={pageRef} style={pageStyle} className="flex flex-col min-h-0 gap-4">
        <div className="shrink-0 flex items-center justify-between">
          <div style={{ transition: "opacity .2s", opacity: tabVisible ? 1 : 0 }}>
            <h1
              className="text-xl font-bold text-[var(--text)]"
            >
              {TAB_META[tab].title}
            </h1>
            <p
              className="text-sm text-[var(--text-muted)] mt-0.5"
            >
              {TAB_META[tab].subtitle}
            </p>
          </div>

          <div
            style={{
              transition: "opacity .2s, transform .2s",
              opacity: tab === "matches" && tabVisible ? 1 : 0,
              transform: tab === "matches" ? "scale(1)" : "scale(0.85)",
              pointerEvents: tab === "matches" ? "auto" : "none",
            }}
          >
            <Link href="/matches/create">
              <div className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-transform">
                <Plus className="w-4 h-4" /> Tạo trận
              </div>
            </Link>
          </div>
        </div>

        <div className="shrink-0 relative flex bg-[var(--surface-muted)] rounded-2xl p-1">
          <div
            className="absolute top-1 bottom-1 bg-blue-600 rounded-xl shadow-sm"
            style={{
              ...indicatorStyle,
              transition:
                "left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1)",
            }}
          />
          <button
            onClick={() => switchTab("sessions")}
            className={`relative flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10 ${tab === "sessions" ? "text-white" : "text-[var(--text-muted)]"}`}
          >
            <span className="relative inline-block">
              Buổi đánh
              {hasPendingBills ? (
                <span className="absolute -top-1.5 -right-2.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border border-[var(--surface)]" />
                </span>
              ) : hasOpenSessions ? (
                <span className="absolute -top-1.5 -right-2.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 border border-[var(--surface)]" />
                </span>
              ) : null}
            </span>
          </button>
          <button
            onClick={() => switchTab("matches")}
            className={`relative flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10 ${tab === "matches" ? "text-white" : "text-[var(--text-muted)]"}`}
          >
            <span className="relative inline-block">
              Giao hữu
              {activeMatch && (
                <span className="absolute -top-1.5 -right-2.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 border border-[var(--surface)]" />
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => switchTab("events")}
            className={`relative flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10 ${tab === "events" ? "text-white" : "text-[var(--text-muted)]"}`}
          >
            <span className="relative inline-block">
              Hoạt động
              {hasOpenEvents && (
                <span className="absolute -top-1.5 -right-2.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 border border-[var(--surface)]" />
                </span>
              )}
            </span>
          </button>
        </div>

        <div
          className="flex-1 min-h-0 flex flex-col"
          style={{ opacity: tabVisible ? 1 : 0, transition: "opacity 0.2s ease" }}
        >
          {tab === "sessions" ? (
            <SessionsTab
              onPendingBillsChange={(count) => setHasPendingBills(count > 0)}
              onOpenSessionsChange={setHasOpenSessions}
            />
          ) : tab === "matches" ? (
            <MatchesTab onActiveMatchChange={setActiveMatch} />
          ) : (
            <EventsTab onOpenEventsChange={setHasOpenEvents} />
          )}
        </div>
      </div>
    </>
  );
}

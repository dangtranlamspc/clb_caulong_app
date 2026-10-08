"use client";
import { useState, useEffect, useCallback, useTransition, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Pencil,
  Trash2,
  XCircle,
  Eye,
  Loader2,
  Wallet,
  CornerDownRight,
  CheckCircle2,
} from "lucide-react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { sessionsAdminApi } from "@/lib/api";
import { createPortal } from "react-dom";
import SessionFormModal from "@/components/admin/sessions/SessionFormModal";
import { useRouter } from "next/navigation";
import { useNavLoadingStore } from "@/store/nav-loading.store";

const BTN_3D =
  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold tracking-wide text-white whitespace-nowrap transition-all duration-200 active:shadow-none active:translate-y-[5px] disabled:opacity-60 disabled:pointer-events-none";

const BTN3D = {
  gray: "bg-gray-600 shadow-[0_5px_0_0_#374151] hover:shadow-[0_3px_0_0_#374151]",
  blue: "bg-blue-600 shadow-[0_5px_0_0_#1e40af] hover:shadow-[0_3px_0_0_#1e40af]",
  blueLight: "bg-blue-500 shadow-[0_5px_0_0_#1d4ed8] hover:shadow-[0_3px_0_0_#1d4ed8]",
  red: "bg-red-500 shadow-[0_5px_0_0_#b91c1c] hover:shadow-[0_3px_0_0_#b91c1c]",
  green: "bg-green-500 shadow-[0_5px_0_0_#15803d] hover:shadow-[0_3px_0_0_#15803d]",
  emerald: "bg-emerald-500 shadow-[0_5px_0_0_#047857] hover:shadow-[0_3px_0_0_#047857]",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open: { label: "Mở đăng ký", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
  full: { label: "Đã đầy", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
  waiting_payment: {
    label: "Chờ thanh toán",
    cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  cancelled: { label: "Đã hủy", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" },
  completed: { label: "Hoàn thành", cls: "bg-[var(--surface-muted)] text-[var(--text-muted)]" },
};

const STATUS_NEXT: Record<
  string,
  {
    label: string;
    next?: string;
    to?: string;
    action?: "complete";
    cls: string;
  }[]
> = {
  open: [
    { label: "Hủy buổi", next: "cancelled", cls: BTN3D.red },
  ],
  full: [
    { label: "Hủy buổi", next: "cancelled", cls: BTN3D.red },
    { label: "Kết thúc", to: "finish", cls: BTN3D.green },
  ],
  waiting_payment: [
    { label: "Hoàn thành", action: "complete", cls: BTN3D.emerald },
  ],
  cancelled: [
    { label: "Mở lại", next: "open", cls: BTN3D.blueLight },
  ],
  completed: [],
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useFillViewport(bottomGap = 0, bleed = 0) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useIsoLayoutEffect(() => {
    const calc = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(320, Math.floor(window.innerHeight - top - bottomGap + bleed)));
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
  }, [bottomGap]);

  return {
    ref,
    style: height ? { height, marginBottom: -bleed } : undefined,
  };
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ status: "", limit: 15 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { ref: pageRef, style: pageStyle } = useFillViewport(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<{ id?: string } | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const startNavLoading = useNavLoadingStore((s) => s.start);
  const stopNavLoading = useNavLoadingStore((s) => s.stop);
  const navLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [completeTarget, setCompleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeRegs, setCompleteRegs] = useState<any[]>([]);
  const [loadingCompleteRegs, setLoadingCompleteRegs] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const sortSessions = (arr: any[]) =>
    [...arr].sort((a: any, b: any) => {
      const aTime = new Date(a.scheduled_at).getTime();
      const bTime = new Date(b.scheduled_at).getTime();
      if (aTime !== bTime) return bTime - aTime;
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    });

  const fetchSessions = useCallback(
    async (
      pageToFetch: number,
      opts?: { silent?: boolean; append?: boolean },
    ) => {
      if (opts?.append) setLoadingMore(true);
      else if (!opts?.silent) setLoading(true);

      try {
        const params = Object.fromEntries(
          Object.entries({ ...query, page: pageToFetch }).filter(
            ([, v]) => v !== "",
          ),
        );
        const { data } = await sessionsAdminApi.list(params);
        const sorted = sortSessions(data.data ?? []);

        setSessions((prev) => (opts?.append ? [...prev, ...sorted] : sorted));
        setMeta(data.meta);
        setPage(pageToFetch);
        setHasMore(
          data.meta?.total_pages != null
            ? pageToFetch < data.meta.total_pages
            : sorted.length >= query.limit,
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query],
  );

  const refreshLoaded = useCallback(async () => {
    const loadedCount = page * query.limit;
    const params = Object.fromEntries(
      Object.entries({ ...query, page: 1, limit: loadedCount }).filter(
        ([, v]) => v !== "",
      ),
    );
    const { data } = await sessionsAdminApi.list(params);
    setSessions(sortSessions(data.data ?? []));
    setMeta(data.meta);
  }, [page, query]);

  useEffect(() => {
    if (!isPending) {
      setNavigatingId(null);
      if (navLoadingTimerRef.current) clearTimeout(navLoadingTimerRef.current);
      navLoadingTimerRef.current = setTimeout(() => {
        stopNavLoading();
      }, 400);
    }
    return () => {
      if (navLoadingTimerRef.current) clearTimeout(navLoadingTimerRef.current);
    };
  }, [isPending]);

  useEffect(() => {
    fetchSessions(1);
  }, [fetchSessions]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchSessions(page + 1, { append: true });
        }
      },
      { root: scrollRef.current, rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchSessions]);

  useEffect(() => {
    if (completeTarget) {
      const raf = requestAnimationFrame(() => setCompleteModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [completeTarget]);

  useEffect(() => {
    if (deleteTarget) {
      const raf = requestAnimationFrame(() => setDeleteModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [deleteTarget]);

  useEffect(() => {
    if (cancelTarget) {
      const raf = requestAnimationFrame(() => setCancelModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [cancelTarget]);

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setTimeout(() => setCancelTarget(null), 200);
  };

  const confirmCancelSession = async () => {
    if (!cancelTarget) return;
    const { id } = cancelTarget;
    closeCancelModal();
    setActionId(id);
    try {
      await sessionsAdminApi.updateStatus(id, { status: "cancelled" });
      toast.success("Đã hủy buổi và xóa toàn bộ đăng ký");
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: "cancelled", confirmed_count: 0, pending_count: 0 }
            : s,
        ),
      );
      refreshLoaded();
    } finally {
      setActionId(null);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setTimeout(() => setDeleteTarget(null), 200);
  };

  const handleStatusChange = async (id: string, next: string) => {
    setActionId(id);
    try {
      await sessionsAdminApi.updateStatus(id, { status: next });
      toast.success("Đã cập nhật trạng thái");
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: next } : s)),
      );
      refreshLoaded();
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    closeDeleteModal();
    setActionId(id);
    try {
      await sessionsAdminApi.delete(id);
      toast.success("Đã xóa buổi");
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setMeta((prev: any) => ({ ...prev, total: Math.max((prev.total ?? 1) - 1, 0) }));
      refreshLoaded();
    } finally {
      setActionId(null);
    }
  };

  const closeCompleteModal = () => {
    setCompleteModalVisible(false);
    setTimeout(() => {
      setCompleteTarget(null);
      setCompleteRegs([]);
    }, 200);
  };

  const openCompleteModal = async (id: string, title: string) => {
    setCompleteTarget({ id, title });
    setLoadingCompleteRegs(true);
    try {
      const { data } = await sessionsAdminApi.getRegistrations(id);
      setCompleteRegs(data ?? []);
    } catch {
      setCompleteRegs([]);
    } finally {
      setLoadingCompleteRegs(false);
    }
  };

  const confirmCompleteSession = async () => {
    if (!completeTarget) return;
    const { id } = completeTarget;
    closeCompleteModal();
    setActionId(id);
    setCompleting(true);
    try {
      await sessionsAdminApi.complete(id);
      toast.success("Đã hoàn thành và khoá buổi đánh!");
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "completed" } : s)),
      );
      refreshLoaded();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thất bại");
    } finally {
      setActionId(null);
      setCompleting(false);
    }
  };

  const completePending = completeRegs.filter(
    (r) =>
      r.payment_status === "pending" &&
      r.participation_status === "confirmed" &&
      r.amount_override != null &&
      !r.payment_reference &&
      r.payment_method !== "cash" &&
      r.payment_method !== "grouped_with_host" &&
      r.payment_method !== "wallet_grouped" &&
      r.payment_method !== "wallet_pending_confirm",
  );

  const completePendingReview = completeRegs.filter(
    (r) =>
      r.payment_status === "pending" &&
      (Boolean(r.payment_reference) ||
        (r.payment_method === "cash" && r.amount_override != null) ||
        r.payment_method === "grouped_with_host"),
  );

  const completeWalletPendingConfirm = completeRegs.filter(
    (r) =>
      r.payment_status === "pending" &&
      r.payment_method === "wallet_pending_confirm" &&
      r.amount_override != null,
  );

  const completeHostRegs = completeRegs.filter((r) => !r.host_registration_id);
  const completeGuestsOf = (hostId: string) =>
    completeRegs.filter((r) => r.host_registration_id === hostId);

  const buildCompletePendingSummary = () => {
    const pendingIds = new Set(completePending.map((r) => r.id));
    const pendingReviewIds = new Set(completePendingReview.map((r) => r.id));
    const walletPendingIds = new Set(
      completeWalletPendingConfirm.map((r) => r.id),
    );

    const getPaymentTag = (reg: any, hostName?: string) => {
      const isIndependentGuest = reg.is_guest && !reg.user_id;

      if (isIndependentGuest && reg.payment_method === "cash") {
        return { label: "💵 Tiền mặt", cls: "bg-[var(--success-soft)] text-[var(--success)]" };
      }
      if (Boolean(reg.payment_reference) && reg.payment_reference !== "TIEN_MAT")
        return {
          label: "🏦 Chuyển khoản (đã nộp bill)",
          cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
        };
      if (reg.payment_method === "cash")
        return {
          label: "💵 Tiền mặt (tự yêu cầu)",
          cls: "bg-[var(--success-soft)] text-[var(--success)]",
        };
      if (reg.payment_method === "grouped_with_host")
        return {
          label: `👥 Gộp theo ${hostName ?? "host"}`,
          cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
        };
      return { label: "💵 Tiền mặt", cls: "bg-[var(--success-soft)] text-[var(--success)]" };
    };

    const rows = completeHostRegs
      .map((host) => {
        const guests = completeGuestsOf(host.id);
        const nestedPending = guests.filter((g) => pendingIds.has(g.id));
        const nestedReview = guests.filter((g) => pendingReviewIds.has(g.id));
        const nestedWalletPending = guests.filter((g) =>
          walletPendingIds.has(g.id),
        );
        const hostPending = pendingIds.has(host.id);
        const hostReview = pendingReviewIds.has(host.id);
        const hostWalletPending = walletPendingIds.has(host.id);

        if (
          !hostPending &&
          !hostReview &&
          !hostWalletPending &&
          nestedPending.length === 0 &&
          nestedReview.length === 0 &&
          nestedWalletPending.length === 0
        )
          return null;

        return {
          host,
          hostPending,
          hostReview,
          hostWalletPending,
          nestedPending,
          nestedReview,
          nestedWalletPending,
        };
      })
      .filter(Boolean) as {
        host: any;
        hostPending: boolean;
        hostReview: boolean;
        hostWalletPending: boolean;
        nestedPending: any[];
        nestedReview: any[];
        nestedWalletPending: any[];
      }[];

    const total =
      completePending.length +
      completePendingReview.length +
      completeWalletPendingConfirm.length;

    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-muted)]">
          Có <strong className="text-[var(--text)]">{total}</strong> người sẽ được tự
          động xác nhận khi hoàn thành:
        </p>
        <ul className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {rows.map(
            ({
              host,
              hostPending,
              hostReview,
              hostWalletPending,
              nestedPending,
              nestedReview,
              nestedWalletPending,
            }) => {
              const name = host.is_guest
                ? host.guest_full_name
                : host.users?.full_name;
              const isIndependentGuest = host.is_guest && !host.user_id;
              const isMember = Boolean(host.user_id) && !host.is_guest;
              const tag = hostReview ? getPaymentTag(host) : null;

              const MAX_NAMES_SHOWN = 2;
              const buildGuestNamesLabel = (guests: any[]) => {
                const names = guests
                  .map((g) =>
                    g.is_guest ? g.guest_full_name : g.users?.full_name,
                  )
                  .filter(Boolean);
                if (names.length === 0) return "";
                if (names.length <= MAX_NAMES_SHOWN) return names.join(", ");
                const shown = names.slice(0, MAX_NAMES_SHOWN).join(", ");
                const remaining = names.length - MAX_NAMES_SHOWN;
                return `${shown},... (${remaining} người khác)`;
              };

              const walletPendingGuestNames = buildGuestNamesLabel(
                nestedWalletPending,
              );
              const hostWalletLabel = walletPendingGuestNames
                ? `⏳ Chưa chọn riêng hay gộp với ${walletPendingGuestNames} → gộp ví BnB`
                : "⏳ Chưa chọn → gộp ví BnB";

              const nestedWalletGuests = [...nestedPending, ...nestedWalletPending];

              return (
                <li key={host.id} className="text-sm text-[var(--text)]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-[var(--text)]">{name}</span>

                    {isIndependentGuest && hostPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                        💵 Tiền mặt
                      </span>
                    )}

                    {isMember && hostPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Wallet className="w-2.5 h-2.5" /> Ví BNB
                      </span>
                    )}

                    {hostWalletPending && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
                        {hostWalletLabel}
                      </span>
                    )}

                    {hostReview && tag && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tag.cls}`}
                      >
                        {tag.label}
                      </span>
                    )}
                  </div>

                  {(nestedWalletGuests.length > 0 || nestedReview.length > 0) && (
                    <ul className="mt-1 ml-1.5 pl-3 space-y-1 border-l border-[var(--border)]">
                      {nestedWalletGuests.map((g) => (
                        <li
                          key={g.id}
                          className="text-xs text-[var(--purple)] flex items-center gap-1.5 flex-wrap"
                        >
                          <CornerDownRight className="w-3 h-3 text-[var(--text-faint)] flex-shrink-0" />
                          <span>
                            {g.is_guest ? g.guest_full_name : g.users?.full_name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                            <Wallet className="w-2.5 h-2.5" /> Ví BNB của {name}
                          </span>
                        </li>
                      ))}
                      {nestedReview.map((g) => {
                        const gTag = getPaymentTag(g, name);
                        return (
                          <li
                            key={g.id}
                            className="text-xs text-[var(--purple)] flex items-center gap-1.5 flex-wrap"
                          >
                            <CornerDownRight className="w-3 h-3 text-[var(--text-faint)] flex-shrink-0" />
                            <span>
                              {g.is_guest ? g.guest_full_name : g.users?.full_name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${gTag.cls}`}
                            >
                              {gTag.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            },
          )}
        </ul>
      </div>
    );
  };

  return (
    <div ref={pageRef} style={pageStyle} className="flex flex-col min-h-0 gap-4">
      <div className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 space-y-3 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Buổi đánh cầu</h1>
          <p className="text-[var(--text-muted)] text-sm mt-0.5">{meta.total ?? 0} buổi</p>
        </div>
        <div className="flex items-center gap-2">
          <LayoutGroup>
            <div className="flex-1 flex gap-1 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-1 overflow-x-auto scrollbar-hide relative">
              {[
                ["", "Tất cả"],
                ["open", "Mở"],
                ["full", "Đầy"],
                ["completed", "Xong"],
                ["cancelled", "Hủy"],
              ].map(([val, lbl]) => {
                const isActive = query.status === val;
                return (
                  <button
                    key={val}
                    onClick={() =>
                      setQuery((q) => ({
                        ...q,
                        status: val,
                      }))
                    }
                    className={`relative flex-1 h-[46px] px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors flex items-center justify-center ${!isActive ? "bg-[var(--border-strong)]/60 backdrop-blur-sm" : ""
                      }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="session-status-pill"
                        className="absolute inset-0 bg-blue-600 rounded-lg"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors ${isActive ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                        }`}
                    >
                      {lbl}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <button
            onClick={() => setFormTarget({})}
            className="flex items-center justify-center gap-1.5 w-12 h-12 md:w-auto md:h-12 px-0 md:px-4 rounded-xl bg-blue-600 shadow-[0_4px_0_0_#1e40af] hover:shadow-[0_2px_0_0_#1e40af] active:shadow-none active:translate-y-[4px] transition-all duration-200 text-white flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline text-sm font-semibold tracking-wide">Thêm buổi đánh</span>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-44 animate-pulse bg-[var(--surface-muted)]" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card py-16 text-center text-[var(--text-faint)]">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Chưa có buổi đánh nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {sessions.map((s) => {
                const cfg =
                  s.status === "waiting_payment"
                    ? s.pending_action_count > 0
                      ? STATUS_CONFIG.waiting_payment
                      : { label: "Chờ chốt thanh toán", cls: "bg-[var(--primary-soft)] text-[var(--primary)]" }
                    : (STATUS_CONFIG[s.status] ?? STATUS_CONFIG.open);
                const nextActions = STATUS_NEXT[s.status] ?? [];
                const busy = actionId === s.id;

                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="card flex flex-col gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[var(--text)] leading-tight">
                        {s.title}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.cls}`}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-faint)]" />
                        <span>
                          {format(
                            new Date(s.scheduled_at),
                            "EEEE, dd/MM/yyyy HH:mm",
                            { locale: vi },
                          )}
                        </span>
                      </div>
                      {s.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-faint)]" />
                          <span className="truncate">{s.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 flex-wrap">
                          <Users className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                          <span
                            className={
                              s.available_slots <= 0
                                ? "text-[var(--danger)] font-medium"
                                : ""
                            }
                          >
                            {s.available_slots <= 0
                              ? "Hết chỗ"
                              : `${s.available_slots ?? s.max_slots}/${s.max_slots} chỗ trống`}
                          </span>
                          {(s.male_count > 0 || s.female_count > 0) && (
                            <span className="text-[var(--text-faint)] text-xs">
                              · 👨 {s.male_count ?? 0} · 👩 {s.female_count ?? 0}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                          {s.duration_minutes} phút
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                      <span className="text-xs text-[var(--text-faint)]">
                        {s.confirmed_count ?? 0} đã xác nhận ·{" "}
                        {s.pending_count ?? 0} chờ
                      </span>
                    </div>

                    <div className="flex flex-col gap-3.5 pt-1 pb-1.5">
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => {
                            setNavigatingId(s.id);
                            startNavLoading();
                            startTransition(() => {
                              router.push(`/admin/sessions/${s.id}`);
                            });
                          }}
                          disabled={navigatingId === s.id}
                          className={`${BTN_3D} ${BTN3D.gray}`}
                        >
                          {navigatingId === s.id ? (
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4 shrink-0" />
                          )}
                          Xem
                        </button>

                        {s.status !== "completed" && (
                          <button
                            onClick={() => setFormTarget({ id: s.id })}
                            className={`${BTN_3D} ${BTN3D.blue}`}
                          >
                            <Pencil className="w-4 h-4" /> Sửa
                          </button>
                        )}

                        {s.status === "cancelled" && (
                          <button
                            onClick={() => handleDelete(s.id, s.title)}
                            disabled={busy}
                            className={`${BTN_3D} ${BTN3D.red}`}
                          >
                            <Trash2 className="w-4 h-4 shrink-0" /> Xóa
                          </button>
                        )}
                      </div>

                      {nextActions.length > 0 && (
                        <div className="flex gap-2.5">
                          {nextActions.map(({ label, next, to, action, cls }) =>
                            to ? (
                              <Link
                                key={to}
                                href={`/admin/sessions/${s.id}/${to}`}
                                className={`${BTN_3D} ${cls}`}
                              >
                                {label}
                              </Link>
                            ) : action === "complete" ? (
                              <button
                                key="complete"
                                onClick={() => openCompleteModal(s.id, s.title)}
                                disabled={busy}
                                className={`${BTN_3D} ${cls}`}
                              >
                                {label}
                              </button>
                            ) : (
                              <button
                                key={next}
                                onClick={() =>
                                  next === "cancelled"
                                    ? setCancelTarget({ id: s.id, title: s.title })
                                    : handleStatusChange(s.id, next!)
                                }
                                disabled={busy}
                                className={`${BTN_3D} ${cls}`}
                              >
                                {label}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="flex items-center gap-2 text-[var(--text-faint)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thêm...
              </div>
            )}
          </div>
        )}

        <SessionFormModal
          target={formTarget}
          onClose={() => setFormTarget(null)}
          onSuccess={() => refreshLoaded()}
        />

        {deleteTarget &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: deleteModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeDeleteModal}
            >
              <div
                className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-xl"
                style={{
                  transform: deleteModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: deleteModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--danger-soft)] flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-[var(--danger)]" />
                    </div>
                    <h3 className="font-bold text-[var(--text)]">Xóa buổi đánh?</h3>
                  </div>
                  <button
                    onClick={closeDeleteModal}
                    className="p-1 text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5">
                  <p className="text-sm text-[var(--text-muted)]">
                    Xóa buổi{" "}
                    <strong className="text-[var(--text)]">
                      "{deleteTarget.title}"
                    </strong>
                    ? Hành động này không thể hoàn tác.
                  </p>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={closeDeleteModal}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={actionId === deleteTarget.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Xóa buổi
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {cancelTarget &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: cancelModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeCancelModal}
            >
              <div
                className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-xl"
                style={{
                  transform: cancelModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: cancelModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--danger-soft)] flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-4 h-4 text-[var(--danger)]" />
                    </div>
                    <h3 className="font-bold text-[var(--text)]">Hủy buổi đánh?</h3>
                  </div>
                  <button
                    onClick={closeCancelModal}
                    className="p-1 text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-2">
                  <p className="text-sm text-[var(--text-muted)]">
                    Hủy buổi{" "}
                    <strong className="text-[var(--text)]">
                      "{cancelTarget.title}"
                    </strong>
                    ?
                  </p>
                  <p className="text-sm text-[var(--danger)]">
                    Toàn bộ thành viên đã đăng ký buổi này sẽ bị{" "}
                    <strong>xóa khỏi danh sách</strong>, kể cả người đã xác nhận
                    thanh toán. Bạn có thể "Mở lại" buổi sau nhưng danh sách đăng
                    ký sẽ không được khôi phục.
                  </p>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
                  <button
                    onClick={closeCancelModal}
                    className="btn-secondary text-sm"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={confirmCancelSession}
                    disabled={actionId === cancelTarget.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Xác nhận hủy buổi
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {completeTarget &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: completeModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeCompleteModal}
            >
              <div
                className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-xl"
                style={{
                  transform: completeModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: completeModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--success-soft)] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    </div>
                    <h3 className="font-bold text-[var(--text)]">Hoàn thành buổi đánh?</h3>
                  </div>
                  <button
                    onClick={closeCompleteModal}
                    className="p-1 text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 text-sm text-[var(--text-muted)]">
                  {loadingCompleteRegs ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-[var(--text-faint)]">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                  ) : completePending.length +
                    completePendingReview.length +
                    completeWalletPendingConfirm.length >
                    0 ? (
                    buildCompletePendingSummary()
                  ) : (
                    "Xác nhận hoàn thành buổi đánh? Buổi sẽ bị khoá lại."
                  )}
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
                  <button onClick={closeCompleteModal} className="btn-secondary text-sm">
                    Hủy
                  </button>
                  <button
                    onClick={confirmCompleteSession}
                    disabled={completing || loadingCompleteRegs}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {completing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
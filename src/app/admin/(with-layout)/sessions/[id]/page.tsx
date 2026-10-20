"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Hourglass,
  Mail,
  UserPlus,
  Search,
  Loader2,
  Eye,
  CornerDownRight,
  UserX,
  UserCheck,
  Calculator,
  RotateCcw,
  Wallet,
  ChevronDown,
  ShieldAlert,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  sessionsAdminApi,
  registrationsAdminApi,
  membersAdminApi,
  fundApi,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { buildGuestReceipt } from "@/lib/guest-receipt";
import SessionCostCard from "@/components/admin/sessions/SessionCostCard";
import SessionPenaltiesCard from "@/components/admin/sessions/SessionPenaltiesCard";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import {
  Avatar,
  CARD,
  Chip,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalShell,
  PhaseButton,
  SESSION_UI_CSS,
  Switch,
  TONE_SOFT,
  formatVnd,
  type BtnTone,
  type Tone,
} from "@/components/admin/sessions/session-ui";
import { useNavLoadingStore } from "@/store/nav-loading.store";

/* ───────────────────────── config ───────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; tone: Tone; icon: any }> = {
  pendingApproval: { label: "Chờ duyệt", tone: "warning", icon: Hourglass },
  pending: { label: "Chờ thanh toán", tone: "warning", icon: Hourglass },
  pendingReview: { label: "Chờ chốt thanh toán", tone: "primary", icon: Eye },
  confirmed: {
    label: "Đã xác nhận thanh toán",
    tone: "success",
    icon: CheckCircle2,
  },
  rejected: { label: "Thanh toán bị từ chối", tone: "danger", icon: XCircle },
  awaitingCheckin: { label: "Chờ điểm danh", tone: "neutral", icon: Hourglass },
  awaitingFinish: {
    label: "Chờ buổi đánh kết thúc",
    tone: "neutral",
    icon: Hourglass,
  },
};

/** Vạch màu bên trái mỗi dòng đăng ký theo trạng thái */
const RAIL: Record<Tone, string> = {
  warning: "bg-amber-400",
  primary: "bg-blue-500",
  success: "bg-emerald-500",
  danger: "bg-red-500",
  purple: "bg-purple-500",
  neutral: "bg-transparent",
};

const SESSION_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Đang mở đăng ký", tone: "success" },
  full: { label: "Đã đủ người", tone: "warning" },
  waiting_payment: { label: "Chờ thanh toán", tone: "primary" },
  completed: { label: "Đã hoàn thành", tone: "neutral" },
  cancelled: { label: "Đã hủy", tone: "danger" },
};

const SKILL_LABEL: Record<string, string> = {
  yeu: "Yếu",
  trung_binh_yeu: "TB yếu",
  trung_binh: "TB",
  trung_binh_cong: "TB+",
  ban_chuyen: "Bán chuyên",
  chuyen_nghiep: "Chuyên nghiệp",
};

const LEVEL_LABELS: Record<string, string> = {
  yeu: "Yếu",
  tb_yeu: "TB yếu",
  tb: "TB",
  tb_plus: "TB+",
  ban_chuyen: "Bán chuyên (BC)",
  chuyen_nghiep: "Chuyên nghiệp",
};

const FIELD_LABEL = "mb-1.5 block text-sm font-medium text-[var(--text)]";

type ActionPhase = "idle" | "loading" | "success";

type Act = {
  key: string;
  label: string;
  short?: string;
  icon: ReactNode;
  tone: BtnTone;
  onClick: () => void;
  phase?: ActionPhase;
  disabled?: boolean;
  badge?: number;
  primary?: boolean;
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [registrations, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionPhase, setActionPhase] = useState<Record<string, ActionPhase>>(
    {},
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [addTab, setAddTab] = useState<"account" | "guest">("account");
  const [guestForm, setGuestForm] = useState({
    full_name: "",
    gender: "male",
    skill_level: "",
    email: "",
  });
  const [hostRegId, setHostRegId] = useState<string>("");
  const [guestPaidNow, setGuestPaidNow] = useState(false);
  const [guestPaySeparately, setGuestPaySeparately] = useState(false);
  const [guestSendEmail, setGuestSendEmail] = useState(false);

  const [manualRefreshing, setManualRefreshing] = useState(false);

  const [checkingInAll, setCheckingInAll] = useState(false);
  const [closingList, setClosingList] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackEmailIds, setRollbackEmailIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    key: "checkinAll" | "closeList" | "completeSession";
    title: string;
    message: ReactNode;
  } | null>(null);

  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());

  const [showPenaltyRefundModal, setShowPenaltyRefundModal] = useState(false);
  const [penaltiesToRefund, setPenaltiesToRefund] = useState<any[]>([]);
  const [checkingPenalties, setCheckingPenalties] = useState(false);

  const [sharingReceiptId, setSharingReceiptId] = useState<string | null>(null);

  const startNavLoading = useNavLoadingStore((s) => s.start);

  const closeConfirmModal = () => setConfirmModal(null);

  const toggleHostGuests = (hostId: string) => {
    setExpandedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(hostId)) next.delete(hostId);
      else next.add(hostId);
      return next;
    });
  };


  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: s }, { data: r }] = await Promise.all([
        sessionsAdminApi.get(id),
        sessionsAdminApi.getRegistrations(id),
      ]);
      setSession(s);
      setRegs(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const refreshSeqRef = useRef(0);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSilently = async () => {
    if (!id) return;
    const mySeq = ++refreshSeqRef.current;
    try {
      const [{ data: s }, { data: r }] = await Promise.all([
        sessionsAdminApi.get(id),
        sessionsAdminApi.getRegistrations(id),
      ]);
      if (mySeq !== refreshSeqRef.current) return;
      setSession(s);
      setRegs(r);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("[refreshSilently] failed:", err);
    }
  };

  const handleManualRefresh = async () => {
    if (manualRefreshing) return;
    setManualRefreshing(true);
    try {
      await refreshSilently();
    } finally {
      setManualRefreshing(false);
    }
  };

  const scheduleRefresh = () => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      refreshSilently();
    }, 250);
  };

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`session:${id}`)
      .on("broadcast", { event: "session_updated" }, () => scheduleRefresh())
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "registrations",
          filter: `session_id=eq.${id}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${id}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!showAddModal || addTab !== "account") return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await membersAdminApi.searchMembers(search.trim());
        setSearchResults(data ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, showAddModal, addTab]);

  useEffect(() => {
    if (showRollbackModal) setRollbackEmailIds(new Set());
  }, [showRollbackModal]);

  /* ───────── actions ───────── */

  const getPhase = (key: string): ActionPhase => actionPhase[key] ?? "idle";

  const runAction = (
    key: string,
    regId: string,
    action: () => Promise<any>,
    successMessage: string,
    errorMessage: string,
    afterDelay?: () => void,
  ) => {
    setActionId(regId);
    setActionPhase((p) => ({ ...p, [key]: "loading" }));

    action()
      .then(() => {
        setActionPhase((p) => ({ ...p, [key]: "success" }));
        toast.success(successMessage);
        setTimeout(async () => {
          afterDelay?.();
          await refreshSilently();
          setActionPhase((p) => {
            const next = { ...p };
            delete next[key];
            return next;
          });
          setActionId(null);
        }, 700);
      })
      .catch((err: any) => {
        setActionPhase((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
        setActionId(null);
        toast.error(err?.response?.data?.message ?? errorMessage);
      });
  };

  const handleApproveRegistration = (regId: string) =>
    runAction(
      `${regId}:approve`,
      regId,
      () => registrationsAdminApi.approveRegistration(regId),
      "Đã duyệt đăng ký",
      "Duyệt thất bại",
    );

  const handleRejectRegistration = (regId: string, displayName: string) => {
    if (!confirm(`Từ chối đăng ký của ${displayName}?`)) return;
    runAction(
      `${regId}:rejectReg`,
      regId,
      () => registrationsAdminApi.rejectRegistrationRequest(regId),
      "Đã từ chối đăng ký",
      "Thao tác thất bại",
    );
  };

  const handleConfirm = (regId: string) =>
    runAction(
      `${regId}:confirm`,
      regId,
      () => registrationsAdminApi.confirm(regId),
      "Xác nhận thành công — đã cộng 1 cầu lông!",
      "Xác nhận thất bại",
    );

  const handleReject = (regId: string) =>
    runAction(
      `${regId}:rejectConfirm`,
      regId,
      () => registrationsAdminApi.reject(regId, rejectNotes[regId]),
      "Đã từ chối",
      "Từ chối thất bại",
      () => setShowReject(null),
    );

  const handleCheckinPresent = (regId: string) =>
    runAction(
      `${regId}:present`,
      regId,
      () => registrationsAdminApi.checkinPresent(regId),
      "Đã điểm danh có mặt",
      "Điểm danh thất bại",
    );

  const handleCheckinAbsent = (regId: string, displayName: string) => {
    if (!confirm(`Đánh dấu vắng mặt và xoá ${displayName} khỏi buổi này?`))
      return;
    runAction(
      `${regId}:absent`,
      regId,
      () => registrationsAdminApi.checkinAbsent(regId),
      "Đã đánh dấu vắng mặt",
      "Thao tác thất bại",
    );
  };

  const runCheckinAllPresent = async () => {
    closeConfirmModal();
    setActionPhase((p) => ({ ...p, checkinAll: "loading" }));
    setCheckingInAll(true);
    try {
      const results = await Promise.allSettled(
        awaitingCheckin.map((r) => registrationsAdminApi.checkinPresent(r.id)),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        setActionPhase((p) => ({ ...p, checkinAll: "success" }));
        toast.success(`Đã điểm danh có mặt cho ${succeeded} người`);
      }
      if (failed > 0) toast.error(`${failed} người điểm danh thất bại`);

      await refreshSilently();
    } finally {
      setTimeout(() => {
        setActionPhase((p) => {
          const next = { ...p };
          delete next.checkinAll;
          return next;
        });
        setCheckingInAll(false);
      }, 700);
    }
  };

  const handleCheckinAllPresent = () => {
    if (awaitingCheckin.length === 0) return;
    setConfirmModal({
      key: "checkinAll",
      title: "Điểm danh tất cả có mặt?",
      message: `Điểm danh có mặt cho tất cả ${awaitingCheckin.length} người đang chờ điểm danh?`,
    });
  };

  const runCloseList = async () => {
    closeConfirmModal();
    setActionPhase((p) => ({ ...p, closeList: "loading" }));
    setClosingList(true);
    try {
      const results = await Promise.allSettled(
        awaitingCheckin.map((r) => registrationsAdminApi.checkinAbsent(r.id)),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        setActionPhase((p) => ({ ...p, closeList: "success" }));
        toast.success(`Đã chốt danh sách, xoá ${succeeded} người vắng mặt`);
      }
      if (failed > 0) toast.error(`${failed} người xử lý thất bại`);

      await refreshSilently();
    } finally {
      setTimeout(() => {
        setActionPhase((p) => {
          const next = { ...p };
          delete next.closeList;
          return next;
        });
        setClosingList(false);
      }, 700);
    }
  };

  const handleCloseList = () => {
    if (awaitingCheckin.length === 0) return;
    setConfirmModal({
      key: "closeList",
      title: "Chốt danh sách?",
      message: `${awaitingCheckin.length} người chưa điểm danh sẽ bị đánh dấu vắng mặt và xoá khỏi buổi này. Hành động này không thể hoàn tác.`,
    });
  };

  const runCompleteSession = async () => {
    if (!id) return;
    closeConfirmModal();
    setActionPhase((p) => ({ ...p, completeSession: "loading" }));
    setCompletingSession(true);
    try {
      await sessionsAdminApi.complete(id);
      setActionPhase((p) => ({ ...p, completeSession: "success" }));
      toast.success("Đã hoàn thành và khoá buổi đánh!");
      await refreshSilently();
    } catch (err: any) {
      setActionPhase((p) => {
        const next = { ...p };
        delete next.completeSession;
        return next;
      });
      toast.error(err?.response?.data?.message ?? "Thất bại");
    } finally {
      setTimeout(() => {
        setActionPhase((p) => {
          const next = { ...p };
          delete next.completeSession;
          return next;
        });
        setCompletingSession(false);
      }, 700);
    }
  };

  const buildPendingSummary = (): ReactNode => {
    const pendingIds = new Set(pending.map((r) => r.id));
    const pendingReviewIds = new Set(pendingReview.map((r) => r.id));
    const walletPendingIds = new Set(walletPendingConfirm.map((r) => r.id));
    const nameOf = (r: any) =>
      r.is_guest ? r.guest_full_name : r.users?.full_name;

    const rows = hostRegs
      .map((host) => {
        const guests = guestsOf(host.id);
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
      .filter(Boolean) as any[];

    const getPaymentTag = (
      reg: any,
      hostName?: string,
    ): { label: string; tone: Tone } => {
      const isIndependentGuest = reg.is_guest && !reg.user_id;
      if (isIndependentGuest && reg.payment_method === "cash")
        return { label: "💵 Tiền mặt", tone: "success" };
      if (
        Boolean(reg.payment_reference) &&
        reg.payment_reference !== "TIEN_MAT"
      )
        return { label: "🏦 Chuyển khoản (đã nộp bill)", tone: "primary" };
      if (reg.payment_method === "cash")
        return { label: "💵 Tiền mặt (tự yêu cầu)", tone: "success" };
      if (reg.payment_method === "grouped_with_host")
        return { label: `👥 Gộp theo ${hostName ?? "host"}`, tone: "primary" };
      return { label: "💵 Tiền mặt", tone: "success" };
    };

    const MAX_NAMES_SHOWN = 2;
    const buildGuestNamesLabel = (guests: any[]) => {
      const names = guests.map(nameOf).filter(Boolean);
      if (names.length === 0) return "";
      if (names.length <= MAX_NAMES_SHOWN) return names.join(", ");
      const shown = names.slice(0, MAX_NAMES_SHOWN).join(", ");
      return `${shown},... (${names.length - MAX_NAMES_SHOWN} người khác)`;
    };

    const autoCount =
      pending.length + pendingReview.length + walletPendingConfirm.length;

    return (
      <div className="space-y-4">
        {autoCount > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              Có <strong className="text-[var(--text)]">{autoCount}</strong>{" "}
              người sẽ được tự động xác nhận khi hoàn thành:
            </p>
            <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {rows.map(
                ({
                  host,
                  hostPending,
                  hostReview,
                  hostWalletPending,
                  nestedPending,
                  nestedReview,
                  nestedWalletPending,
                }: any) => {
                  const name = nameOf(host);
                  const isIndependentGuest = host.is_guest && !host.user_id;
                  const isMember = Boolean(host.user_id) && !host.is_guest;
                  const tag = hostReview ? getPaymentTag(host) : null;

                  const walletGuestNames =
                    buildGuestNamesLabel(nestedWalletPending);
                  const hostWalletLabel = walletGuestNames
                    ? `⏳ Chưa chọn riêng hay gộp với ${walletGuestNames} → gộp ví BnB`
                    : "⏳ Chưa chọn → gộp ví BnB";

                  const nestedWalletGuests = [
                    ...nestedPending,
                    ...nestedWalletPending,
                  ];

                  return (
                    <li key={host.id} className="text-sm text-[var(--text)]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{name}</span>
                        {isIndependentGuest && hostPending && (
                          <Chip tone="success">💵 Tiền mặt</Chip>
                        )}
                        {isMember && hostPending && (
                          <Chip
                            tone="primary"
                            icon={<Wallet className="h-3 w-3" />}
                          >
                            Ví BNB
                          </Chip>
                        )}
                        {hostWalletPending && (
                          <Chip tone="warning" className="whitespace-normal">
                            {hostWalletLabel}
                          </Chip>
                        )}
                        {hostReview && tag && (
                          <Chip tone={tag.tone}>{tag.label}</Chip>
                        )}
                      </div>

                      {(nestedWalletGuests.length > 0 ||
                        nestedReview.length > 0) && (
                          <ul className="ml-1.5 mt-1.5 space-y-1.5 border-l border-[var(--border)] pl-3">
                            {nestedWalletGuests.map((g: any) => (
                              <li
                                key={g.id}
                                className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]"
                              >
                                <CornerDownRight className="h-3 w-3 shrink-0 text-[var(--text-faint)]" />
                                <span>{nameOf(g)}</span>
                                <Chip
                                  tone="primary"
                                  icon={<Wallet className="h-3 w-3" />}
                                >
                                  Ví BNB của {name}
                                </Chip>
                              </li>
                            ))}
                            {nestedReview.map((g: any) => {
                              const gTag = getPaymentTag(g, name);
                              return (
                                <li
                                  key={g.id}
                                  className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]"
                                >
                                  <CornerDownRight className="h-3 w-3 shrink-0 text-[var(--text-faint)]" />
                                  <span>{nameOf(g)}</span>
                                  <Chip tone={gTag.tone}>{gTag.label}</Chip>
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
        )}

        {rejected.length > 0 && (
          <div
            className={`space-y-2 rounded-xl border p-3 ${TONE_SOFT.danger}`}
          >
            <p className="text-sm font-semibold">
              ⚠️ Sẽ KHÔNG được xử lý tự động
            </p>
            <ul className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
              {rejected.map((r) => (
                <li key={r.id} className="flex items-center gap-1.5 text-xs">
                  <XCircle className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{nameOf(r)}</span>
                  <span>— thanh toán bị từ chối</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px]">
              Buổi vẫn sẽ hoàn thành, nhưng những người này giữ nguyên trạng
              thái — bạn cần xử lý thủ công sau.
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleCompleteSession = () => {
    const hasWarnings =
      pending.length > 0 ||
      pendingReview.length > 0 ||
      walletPendingConfirm.length > 0 ||
      rejected.length > 0;
    setConfirmModal({
      key: "completeSession",
      title: "Hoàn thành buổi đánh?",
      message: hasWarnings
        ? buildPendingSummary()
        : "Xác nhận hoàn thành buổi đánh? Buổi sẽ bị khoá lại.",
    });
  };

  const getRollbackRefundPreview = () => {
    const list: { user_id: string; full_name: string; amount: number }[] = [];

    for (const host of hostRegs) {
      const isHostRow = !host.is_guest;
      const wasWalletDeducted =
        host.payment_status === "confirmed" &&
        (host.payment_method === "wallet" ||
          host.payment_method === "wallet_grouped");
      if (!isHostRow || !wasWalletDeducted) continue;

      const guests = guestsOf(host.id).filter(
        (g) => g.payment_method === "wallet_grouped",
      );
      const guestsTotal = guests.reduce(
        (s, g) => s + (g.amount_override ?? 0),
        0,
      );
      const amount = (host.amount_override ?? 0) + guestsTotal;
      if (amount > 0) {
        list.push({
          user_id: host.user_id,
          full_name: host.users?.full_name ?? "?",
          amount,
        });
      }
    }

    return list;
  };

  const handleRollbackFinish = async (refundPenalties = false) => {
    if (!id) return;
    setShowRollbackModal(false);
    setShowPenaltyRefundModal(false);
    setRollingBack(true);
    try {
      const { data } = await sessionsAdminApi.rollbackFinish(id, {
        refund_penalties: refundPenalties,
        email_registration_ids: Array.from(rollbackEmailIds),
      });
      if (data.errors?.length > 0) {
        toast.error(
          `Hoàn tác xong nhưng có ${data.errors.length} lỗi — vui lòng kiểm tra lại thủ công.`,
          { duration: 8000 },
        );
        console.error("[rollbackFinish errors]", data.errors);
      } else {
        toast.success(data.message);
      }
      if (data.cancelled_confirmed_manual_count > 0) {
        toast(
          `${data.cancelled_confirmed_manual_count} khoản đã xác nhận thủ công (tiền mặt/CK) cũng đã bị huỷ theo yêu cầu.`,
          { icon: "ℹ️", duration: 6000 },
        );
      }
      if (data.penalty_refunded_count > 0) {
        toast(`Đã hoàn ${data.penalty_refunded_count} khoản phạt đã trừ ví.`, {
          icon: "💸",
          duration: 6000,
        });
      }
      refreshSilently();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Hoàn tác thất bại");
    } finally {
      setRollingBack(false);
    }
  };

  const getRollbackEmailCandidates = () => {
    return registrations.filter((r) => {
      if (!r.is_guest) return false;
      if (!r.host_registration_id) return true;

      const host = registrations.find((h) => h.id === r.host_registration_id);
      const hostIsGuest = Boolean(host?.is_guest);
      if (hostIsGuest) return true;

      const isGroupedWithHost =
        r.payment_method === "grouped_with_host" ||
        r.payment_method === "wallet_grouped" ||
        r.payment_method === "wallet_pending_confirm";

      return !isGroupedWithHost;
    });
  };

  const toggleRollbackEmail = (registrationId: string) => {
    setRollbackEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(registrationId)) next.delete(registrationId);
      else next.add(registrationId);
      return next;
    });
  };

  const handleConfirmRollback = async () => {
    if (!id) return;
    setCheckingPenalties(true);
    try {
      const { data } = await fundApi.getPenaltiesBySession(id);
      const walletConfirmedPenalties = (data?.data ?? []).filter(
        (p: any) =>
          p.payment_status === "confirmed" &&
          p.actual_payment_method === "wallet",
      );

      setShowRollbackModal(false);

      if (walletConfirmedPenalties.length > 0) {
        setPenaltiesToRefund(walletConfirmedPenalties);
        setShowPenaltyRefundModal(true);
      } else {
        handleRollbackFinish(false);
      }
    } catch (err) {
      console.error("[handleConfirmRollback] Lỗi kiểm tra phạt:", err);
      setShowRollbackModal(false);
      handleRollbackFinish(false);
    } finally {
      setCheckingPenalties(false);
    }
  };

  const handleCancelSession = async () => {
    if (!id) return;
    setShowCancelModal(false);
    setCancelling(true);
    try {
      await sessionsAdminApi.updateStatus(id, { status: "cancelled" });
      toast.success("Đã hủy buổi đánh");
      router.push("/admin/sessions");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Hủy buổi thất bại");
      setCancelling(false);
    }
  };

  const handleReopenSession = async () => {
    if (!id) return;
    setReopening(true);
    try {
      await sessionsAdminApi.updateStatus(id, { status: "open" });
      toast.success("Đã mở lại buổi đánh");
      refreshSilently();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Mở lại thất bại");
    } finally {
      setReopening(false);
    }
  };

  const handleFinishSession = () => {
    if (finishing) return;
    setFinishing(true);
    startNavLoading();
    setTimeout(() => {
      const go = () => router.push(`/admin/sessions/${id}/finish`);
      if (
        typeof document !== "undefined" &&
        (document as any).startViewTransition
      ) {
        (document as any).startViewTransition(go);
      } else {
        go();
      }
    }, 400);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setSearch("");
    setSearchResults([]);
    setSelectedMembers([]);
    setAddNotes("");
    setAddTab("account");
    setGuestForm({ full_name: "", gender: "male", skill_level: "", email: "" });
    setHostRegId("");
    setGuestPaidNow(false);
    setGuestPaySeparately(false);
    setGuestSendEmail(false);
  };

  const handleAddMember = async () => {
    if (!id) return;

    const numToAdd = addTab === "account" ? selectedMembers.length : 1;
    const availableSlots = session.available_slots ?? 0;

    if (numToAdd > availableSlots) {
      toast.error(
        availableSlots <= 0
          ? "Buổi đã đủ số lượng, không thể thêm thành viên."
          : `Chỉ còn ${availableSlots} chỗ trống, bạn đang chọn ${numToAdd} người.`,
      );
      return;
    }

    setAdding(true);
    try {
      if (addTab === "account") {
        if (selectedMembers.length === 0) return;

        const results = await Promise.allSettled(
          selectedMembers.map((m) =>
            registrationsAdminApi.adminAdd({
              session_id: id,
              user_id: m.id,
              host_registration_id: hostRegId || undefined,
              notes: addNotes || undefined,
            }),
          ),
        );

        const succeeded = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failed = results.length - succeeded;

        if (succeeded > 0) {
          toast.success(`Đã thêm ${succeeded} thành viên vào buổi`);
        }
        if (failed > 0) {
          toast.error(
            `${failed} thành viên thêm thất bại (có thể đã đăng ký buổi này)`,
          );
        }
      } else {
        await registrationsAdminApi.adminAdd({
          session_id: id,
          guest_full_name: guestForm.full_name,
          guest_gender: guestForm.gender,
          guest_skill_level: guestForm.skill_level || undefined,
          guest_email: guestForm.email.trim() || undefined,
          host_registration_id: hostRegId || undefined,
          pay_type: hostRegId
            ? guestPaySeparately
              ? "solo"
              : "grouped"
            : undefined,
          payment_status: guestPaySeparately
            ? guestPaidNow
              ? "confirmed"
              : "pending"
            : undefined,
          notes: addNotes || undefined,
          send_email: guestSendEmail,
        });
        toast.success(`Đã thêm khách ${guestForm.full_name} vào buổi`);
      }
      closeAddModal();
      refreshSilently();
    } finally {
      setAdding(false);
    }
  };

  const handleShareGuestReceipt = async (
    reg: any,
    hostName?: string,
    groupedGuests?: any[],
  ) => {
    if (sharingReceiptId) return;
    setSharingReceiptId(reg.id);
    try {
      const { blob, fileName } = await buildGuestReceipt({
        reg,
        session,
        hostName,
        groupedGuests,
      });
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
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Đã tải ảnh biên lai xuống");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("[handleShareGuestReceipt]", err);
        toast.error("Tạo ảnh biên lai thất bại");
      }
    } finally {
      setSharingReceiptId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-28 md:pb-10 lg:max-w-4xl xl:max-w-7xl 2xl:max-w-[1440px]">
        <div className={`${CARD} h-60 animate-pulse bg-[var(--surface-muted)]`} />

        <div className="flex items-baseline justify-between px-1">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--border-strong)]" />
          <div className="h-3 w-12 animate-pulse rounded bg-[var(--border-strong)]" />
        </div>

        {[1, 2].map((i) => (
          <div key={i} className={`${CARD} p-4`}>
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[var(--border-strong)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border-strong)]" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--border-strong)]" />
                <div className="mt-2 h-5 w-24 animate-pulse rounded-full bg-[var(--border-strong)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!session) return null;


  const isAwaitingFinish = (reg: any) =>
    reg.payment_status === "pending" &&
    reg.participation_status === "confirmed" &&
    reg.amount_override == null;

  const awaitingFinish = registrations.filter(
    (r) =>
      r.payment_status === "pending" &&
      r.participation_status === "confirmed" &&
      r.amount_override == null,
  );

  const pending = registrations.filter(
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

  const pendingReview = registrations.filter(
    (r) =>
      r.payment_status === "pending" &&
      (Boolean(r.payment_reference) ||
        (r.payment_method === "cash" && r.amount_override != null) ||
        (r.payment_method === "grouped_with_host" &&
          r.amount_override != null)),
  );

  const walletPendingConfirm = registrations.filter(
    (r) =>
      r.payment_status === "pending" &&
      r.payment_method === "wallet_pending_confirm" &&
      r.amount_override != null,
  );

  const confirmed = registrations.filter(
    (r) => r.payment_status === "confirmed",
  );
  const allConfirmed =
    registrations.length > 0 &&
    registrations.every((r) => r.payment_status === "confirmed");
  const rejected = registrations.filter((r) => r.payment_status === "rejected");
  const pendingApproval = registrations.filter(
    (r) => r.participation_status === "pending_approval",
  );
  const awaitingCheckin = registrations.filter(
    (r) => r.participation_status === "awaiting_checkin",
  );

  const canComplete =
    session.status === "waiting_payment" &&
    registrations.filter((r) => r.participation_status === "confirmed").length >
    0;

  const hostRegs = registrations.filter((r) => !r.host_registration_id);
  const guestsOf = (hostId: string) =>
    registrations.filter((r) => r.host_registration_id === hostId);

  const hasCostData =
    (session.status === "completed" || session.status === "waiting_payment") &&
    (Number(session.court_fee ?? 0) > 0 ||
      Number(session.shuttle_count ?? 0) > 0 ||
      Number(session.other_fee ?? 0) > 0);

  const isOpenish = session.status === "open" || session.status === "full";

  const canAddMember = isOpenish && session.available_slots > 0;

  const canFinishSession = isOpenish && registrations.length > 0;

  const getCanReviewPayment = (reg: any) =>
    Boolean(reg.payment_reference) ||
    (reg.payment_method === "cash" && reg.amount_override != null);

  const startAt = new Date(session.scheduled_at);
  const endAt = new Date(
    startAt.getTime() + (session.duration_minutes ?? 0) * 60000,
  );
  const maxSlots = session.max_slots ?? 0;
  const takenSlots = Math.max(0, maxSlots - (session.available_slots ?? 0));
  const fillPct =
    maxSlots > 0 ? Math.min(100, Math.round((takenSlots / maxSlots) * 100)) : 0;
  const statusMeta = SESSION_STATUS[session.status] ?? {
    label: session.status,
    tone: "neutral" as Tone,
  };

  const hintText = [
    pendingApproval.length > 0 &&
    `${pendingApproval.length} đăng ký chờ duyệt`,
    awaitingCheckin.length > 0 &&
    `${awaitingCheckin.length} người chưa điểm danh`,
  ]
    .filter(Boolean)
    .join(", ");

  const ic = "h-4 w-4";
  const acts: Act[] = [];

  if (awaitingCheckin.length > 0) {
    acts.push({
      key: "checkinAll",
      label: "Điểm danh tất cả",
      short: "Điểm danh",
      icon: <UserCheck className={ic} />,
      tone: "green",
      badge: awaitingCheckin.length,
      phase: getPhase("checkinAll"),
      onClick: handleCheckinAllPresent,
      disabled: closingList,
      primary: true,
    });
    // acts.push({
    //   key: "closeList",
    //   label: "Chốt danh sách",
    //   short: "Chốt",
    //   icon: <UserX className={ic} />,
    //   tone: "red",
    //   badge: awaitingCheckin.length,
    //   phase: getPhase("closeList"),
    //   onClick: handleCloseList,
    //   disabled: checkingInAll,
    // });
  }

  if (
    canFinishSession &&
    awaitingCheckin.length === 0 &&
    pendingApproval.length === 0
  ) {
    acts.push({
      key: "finish",
      label: "Kết thúc buổi",
      short: "Kết thúc",
      icon: <Calculator className={ic} />,
      tone: "green",
      phase: finishing ? "loading" : "idle",
      onClick: handleFinishSession,
      primary: true,
    });
  }

  if (canComplete) {
    acts.push({
      key: "complete",
      label: "Hoàn thành",
      icon: <CheckCircle2 className={ic} />,
      tone: "green",
      phase: getPhase("completeSession"),
      onClick: handleCompleteSession,
      disabled: completingSession,
      primary: true,
    });
  }

  if (session.status === "cancelled") {
    acts.push({
      key: "reopen",
      label: "Mở lại buổi",
      short: "Mở lại",
      icon: <RotateCcw className={ic} />,
      tone: "sky",
      phase: reopening ? "loading" : "idle",
      onClick: handleReopenSession,
      primary: true,
    });
  }

  if (session.status === "waiting_payment" || session.status === "completed") {
    acts.push({
      key: "rollback",
      label: "Hoàn tác",
      icon: <RotateCcw className={ic} />,
      tone: "amber",
      phase: rollingBack ? "loading" : "idle",
      onClick: () => setShowRollbackModal(true),
      primary: !canComplete,
    });
  }

  if (isOpenish) {
    acts.push({
      key: "cancel",
      label: "Hủy buổi",
      icon: <XCircle className={ic} />,
      tone: "red",
      phase: cancelling ? "loading" : "idle",
      onClick: () => setShowCancelModal(true),
    });
  }

  if (canAddMember) {
    acts.push({
      key: "add",
      label: "Thêm thành viên",
      short: "Thêm",
      icon: <UserPlus className={ic} />,
      tone: "blue",
      onClick: () => setShowAddModal(true),
    });
  }

  const lead =
    acts.find((a) => a.primary) ?? acts.find((a) => a.key === "add") ?? acts[0];
  const others = acts.filter((a) => a !== lead);

  const renderRowActions = (reg: any) => {
    const displayName = reg.users?.full_name ?? reg.guest_full_name ?? "?";
    const busy = actionId === reg.id;
    const cls = "flex-1 md:min-w-[112px] md:flex-none";

    if (reg.participation_status === "pending_approval") {
      return (
        <>
          <PhaseButton
            size="sm"
            tone="blue"
            className={cls}
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Duyệt"
            phase={getPhase(`${reg.id}:approve`)}
            onClick={() => handleApproveRegistration(reg.id)}
            disabled={busy}
          />
          <PhaseButton
            size="sm"
            tone="red"
            variant="solid"
            className={cls}
            icon={<XCircle className="h-4 w-4" />}
            label="Từ chối"
            phase={getPhase(`${reg.id}:rejectReg`)}
            onClick={() => handleRejectRegistration(reg.id, displayName)}
            disabled={busy}
          />
        </>
      );
    }

    if (reg.participation_status === "awaiting_checkin") {
      return (
        <>
          <PhaseButton
            size="sm"
            tone="green"
            className={cls}
            icon={<UserCheck className="h-4 w-4" />}
            label="Có mặt"
            phase={getPhase(`${reg.id}:present`)}
            onClick={() => handleCheckinPresent(reg.id)}
            disabled={busy}
          />
          <PhaseButton
            size="sm"
            tone="red"
            variant="solid"
            className={cls}
            icon={<UserX className="h-4 w-4" />}
            label="Vắng mặt"
            phase={getPhase(`${reg.id}:absent`)}
            onClick={() => handleCheckinAbsent(reg.id, displayName)}
            disabled={busy}
          />
        </>
      );
    }

    if (reg.participation_status === "confirmed" && isAwaitingFinish(reg)) {
      return (
        <PhaseButton
          size="sm"
          tone="red"
          variant="solid"
          className={cls}
          icon={<UserX className="h-4 w-4" />}
          label="Vắng mặt"
          phase={getPhase(`${reg.id}:absent`)}
          onClick={() => handleCheckinAbsent(reg.id, displayName)}
          disabled={busy}
        />
      );
    }

    return (
      <>
        <PhaseButton
          size="sm"
          tone="green"
          className={cls}
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Xác nhận"
          phase={getPhase(`${reg.id}:confirm`)}
          onClick={() => handleConfirm(reg.id)}
          disabled={busy}
        />
        <PhaseButton
          size="sm"
          tone="red"
          variant="solid"
          className={cls}
          icon={<XCircle className="h-4 w-4" />}
          label="Từ chối"
          onClick={() => setShowReject(reg.id)}
          disabled={busy}
        />
      </>
    );
  };

  const renderRowContent = (
    reg: any,
    isNested = false,
    hostName?: string,
    groupedGuestsForReceipt?: any[],
  ) => {
    const isPendingReview =
      reg.payment_status === "pending" &&
      (Boolean(reg.payment_reference) ||
        (reg.payment_method === "cash" && reg.amount_override != null) ||
        (reg.payment_method === "grouped_with_host" &&
          reg.amount_override != null));

    const isAwaitingFinishRow =
      reg.payment_status === "pending" &&
      reg.participation_status === "confirmed" &&
      reg.amount_override == null &&
      !isPendingReview;

    const cfg =
      reg.participation_status === "pending_approval"
        ? STATUS_CONFIG.pendingApproval
        : reg.participation_status === "awaiting_checkin"
          ? STATUS_CONFIG.awaitingCheckin
          : isAwaitingFinishRow
            ? STATUS_CONFIG.awaitingFinish
            : isPendingReview
              ? STATUS_CONFIG.pendingReview
              : (STATUS_CONFIG[reg.payment_status] ?? STATUS_CONFIG.pending);
    const StatusIcon = cfg.icon;
    const attention = cfg.tone === "warning" || cfg.tone === "primary";

    const user = reg.users;
    const displayName = user?.full_name ?? reg.guest_full_name ?? "?";
    const displayGender = user?.gender ?? reg.guest_gender;
    const level = reg.is_guest
      ? reg.guest_skill_level &&
      (SKILL_LABEL[reg.guest_skill_level] ?? reg.guest_skill_level)
      : user?.level && (LEVEL_LABELS[user.level] ?? user.level);

    const totalAmount = reg.amount_override;
    const hasBreakdown =
      totalAmount != null &&
      reg.base_amount != null &&
      reg.other_fee_amount != null &&
      reg.other_fee_amount > 0;

    const canShare =
      reg.is_guest && reg.payment_method === "cash" && totalAmount != null;
    const sharing = sharingReceiptId === reg.id;

    return (
      <div
        className={`relative flex items-center gap-3 ${isNested ? "py-3 pl-5 pr-4" : "p-4"}`}
      >
        {isNested && (
          <CornerDownRight className="mt-2 h-3.5 w-3.5 shrink-0 self-start text-[var(--text-faint)]" />
        )}
        <Avatar
          url={user?.avatar_url}
          name={displayName}
          size={isNested ? 32 : 44}
          className="self-start"
        />

        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <p
              className={`truncate font-semibold text-[var(--text)] ${isNested ? "text-sm" : "text-[15px]"}`}
            >
              {displayName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {user?.member_type && (
                <Chip
                  tone={user.member_type === "co_dinh" ? "purple" : "neutral"}
                >
                  {user.member_type === "co_dinh" ? "Thành viên" : "Vãng lai"}
                </Chip>
              )}
              {reg.is_guest && <Chip>Khách</Chip>}
              {level && <Chip tone="purple">{level}</Chip>}
              {displayGender && (
                <Chip>{displayGender === "male" ? "Nam" : "Nữ"}</Chip>
              )}
              {reg.is_guest && reg.guest_email && (
                <Chip
                  tone="warning"
                  className="max-w-[200px]"
                  icon={<Mail className="h-3 w-3 shrink-0" />}
                >
                  <span className="truncate">{reg.guest_email}</span>
                </Chip>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Chip
              tone={cfg.tone}
              className="relative"
              icon={<StatusIcon className="h-3 w-3" />}
            >
              {cfg.label}
              {attention && (
                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
              )}
            </Chip>

            {reg.payment_method === "cash" && (
              <Chip tone="success">💵 Tiền mặt</Chip>
            )}
            {reg.payment_method === "bank_transfer" && (
              <Chip tone="primary">🏦 Chuyển khoản</Chip>
            )}
            {reg.payment_method === "wallet_pending_confirm" &&
              reg.host_registration_id && (
                <Chip tone="warning" icon={<Wallet className="h-3 w-3" />}>
                  Chờ {hostName ?? "host"} quyết định
                </Chip>
              )}
            {reg.payment_method === "wallet_grouped" &&
              reg.host_registration_id && (
                <Chip tone="primary" icon={<Wallet className="h-3 w-3" />}>
                  Ví BNB của {hostName ?? "host"}
                </Chip>
              )}
            {reg.payment_method === "wallet" && reg.host_registration_id && (
              <Chip tone="primary" icon={<Wallet className="h-3 w-3" />}>
                Ví BNB của {displayName}
              </Chip>
            )}
            {((reg.payment_method === "wallet" && !reg.host_registration_id) ||
              (reg.payment_method === "wallet_grouped" &&
                !reg.host_registration_id) ||
              (reg.payment_method === "wallet_pending_confirm" &&
                !reg.host_registration_id)) && (
                <Chip tone="primary" icon={<Wallet className="h-3 w-3" />}>
                  Ví BNB
                  {reg.payment_method === "wallet_pending_confirm"
                    ? " (chờ xác nhận)"
                    : ""}
                </Chip>
              )}
            {reg.points_awarded && reg.payment_status === "confirmed" && (
              <Chip tone="purple">🏸 Đã cộng điểm</Chip>
            )}
          </div>

          {hasBreakdown && (
            <dl className="mt-3 space-y-2 rounded-xl bg-[var(--surface-muted)] px-3.5 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--text-muted)]">Tiền sân + cầu</dt>
                <dd className="text-base font-semibold tabular-nums text-[var(--text)]">
                  {formatVnd(reg.base_amount)}
                </dd>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--text-muted)]">Khoản khác</dt>
                  <dd className="text-base font-semibold tabular-nums text-[var(--warning)]">
                    {formatVnd(reg.other_fee_amount)}
                  </dd>
                </div>
                {reg.other_fee_note &&
                  reg.other_fee_note
                    .split("\n")
                    .map((l: string) => l.trim())
                    .filter(Boolean)
                    .map((line: string, i: number) => (
                      <p
                        key={i}
                        className="mt-0.5 text-xs italic text-[var(--text-faint)]"
                      >
                        {line}
                      </p>
                    ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-dashed border-[var(--border-strong)] pt-2.5">
                <dt className="text-base font-bold text-[var(--text)]">Tổng</dt>
                <dd className="text-base font-bold tabular-nums text-[var(--text)]">
                  {formatVnd(totalAmount)}
                </dd>
              </div>
            </dl>
          )}

          {reg.notes && (
            <p className="mt-2 text-xs italic text-[var(--text-faint)]">
              {reg.notes}
            </p>
          )}
        </div>

        <div
          className={`flex shrink-0 flex-col items-end gap-1.5 text-right ${hasBreakdown ? "self-start" : "self-center"
            }`}
        >
          {!hasBreakdown && (
            <p
              className={`tabular-nums ${isNested ? "text-sm" : "text-base"} ${totalAmount != null
                ? "font-bold text-[var(--text)]"
                : "font-normal italic text-[var(--text-faint)]"
                }`}
            >
              {totalAmount != null ? formatVnd(totalAmount) : "—"}
            </p>
          )}
          {canShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleShareGuestReceipt(reg, hostName, groupedGuestsForReceipt);
              }}
              disabled={sharing}
              title="Chia sẻ biên lai"
              className="inline-flex h-7 items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2.5 text-[11px] font-semibold text-[var(--primary)] transition-colors hover:brightness-95 disabled:opacity-50"
            >
              {sharing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
              Biên lai
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRejectBox = (regId: string, isNested = false) =>
    showReject === regId && (
      <div
        className={`flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--surface-muted)] py-3 sm:flex-row sm:items-center ${isNested ? "pl-5 pr-4" : "px-4"
          }`}
      >
        <input
          type="text"
          autoFocus
          value={rejectNotes[regId] ?? ""}
          onChange={(e) =>
            setRejectNotes((n) => ({ ...n, [regId]: e.target.value }))
          }
          className="input-field flex-1 text-sm"
          placeholder="Lý do từ chối (tuỳ chọn)"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowReject(null)}
            className="btn-secondary text-sm"
          >
            Hủy
          </button>
          <PhaseButton
            size="md"
            tone="red"
            label="Xác nhận từ chối"
            phase={getPhase(`${regId}:rejectConfirm`)}
            onClick={() => handleReject(regId)}
            disabled={actionId === regId}
          />
        </div>
      </div>
    );

  const renderRow = (
    reg: any,
    isNested = false,
    hostName?: string,
    groupedGuestsForReceipt?: any[],
  ) => {
    const showActions =
      reg.participation_status === "pending_approval" ||
      reg.participation_status === "awaiting_checkin" ||
      isAwaitingFinish(reg) ||
      (reg.payment_status === "pending" && getCanReviewPayment(reg));

    return (
      <div key={reg.id}>
        {renderRowContent(reg, isNested, hostName, groupedGuestsForReceipt)}
        {showActions && (
          <div
            className={`flex gap-2 border-t border-[var(--border)] bg-[var(--surface-muted)] py-2.5 md:justify-end ${isNested ? "pl-5 pr-4" : "px-4"
              }`}
          >
            {renderRowActions(reg)}
          </div>
        )}
        {renderRejectBox(reg.id, isNested)}
      </div>
    );
  };

  const renderHostCard = (host: any) => {
    const guests = guestsOf(host.id);
    const GROUPED_METHODS = [
      "grouped_with_host",
      "wallet_grouped",
      "wallet_pending_confirm",
    ];

    const groupedGuestsAll = guests.filter((g) =>
      GROUPED_METHODS.includes(g.payment_method),
    );
    const soloGuestsAll = guests.filter(
      (g) => !GROUPED_METHODS.includes(g.payment_method),
    );

    const groupedTotal =
      (host.amount_override ?? 0) +
      groupedGuestsAll.reduce((s, g) => s + (g.amount_override ?? 0), 0);
    const soloTotal = soloGuestsAll.reduce(
      (s, g) => s + (g.amount_override ?? 0),
      0,
    );

    const hasGrouped = groupedGuestsAll.length > 0;
    const hasSolo = soloGuestsAll.length > 0;
    const billIssued =
      host.amount_override != null &&
      (session.status === "waiting_payment" ||
        session.status === "completed");
    const groupedGuestsForHost = guests.filter(
      (g) => g.payment_method === "grouped_with_host",
    );
    const hostDisplayName =
      host.users?.full_name ?? host.guest_full_name ?? "?";
    const isExpanded = expandedHosts.has(host.id);

    return (
      <article key={host.id} className={`${CARD} overflow-hidden`}>
        {renderRow(host, false, hostDisplayName, groupedGuestsForHost)}

        {guests.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => toggleHostGuests(host.id)}
              aria-expanded={isExpanded}
              className="flex w-full items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] px-1.5 text-xs font-bold text-[var(--primary)]">
                  {guests.length}
                </span>
                <span className="text-sm font-medium text-[var(--text)]">
                  {isExpanded ? "Ẩn" : "Hiện"} người đi cùng
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                  }`}
              />
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface-muted)] transition-opacity duration-300"
                  style={{ opacity: isExpanded ? 1 : 0 }}
                >
                  {guests.map((g) => renderRow(g, true, hostDisplayName))}
                </div>
              </div>
            </div>
          </>
        )}

        {guests.length > 0 && billIssued && (
          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface-muted)]">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {hasGrouped ? `Gộp ví ${hostDisplayName}` : hostDisplayName}
                {hasGrouped && (
                  <span className="font-normal text-[var(--text-faint)]">
                    {" "}
                    ({1 + groupedGuestsAll.length} người)
                  </span>
                )}
              </span>
              <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                {formatVnd(groupedTotal)}
              </span>
            </div>

            {soloGuestsAll.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Trả riêng: {g.users?.full_name ?? g.guest_full_name ?? "?"}
                </span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {formatVnd(g.amount_override ?? 0)}
                </span>
              </div>
            ))}

            {hasSolo && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs font-bold text-[var(--text)]">
                  Tổng cả nhóm
                </span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {formatVnd(groupedTotal + soloTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  const pipeline = [
    { label: "Chờ duyệt", count: pendingApproval.length, tone: "warning" },
    { label: "Chờ điểm danh", count: awaitingCheckin.length, tone: "neutral" },
    {
      label: "Chờ buổi đánh kết thúc",
      count: awaitingFinish.length,
      tone: "neutral",
    },
    { label: "Chờ thanh toán", count: pending.length, tone: "warning" },
    {
      label: "Chờ chốt thanh toán",
      count: pendingReview.length + walletPendingConfirm.length,
      tone: "primary",
    },
    {
      label: "Đã xác nhận thanh toán",
      count: confirmed.length,
      tone: "success",
    },
    { label: "Thanh toán bị từ chối", count: rejected.length, tone: "danger" },
  ].filter((p) => p.count > 0) as { label: string; count: number; tone: Tone }[];

  return (
    <>
      <style>{SESSION_UI_CSS}</style>

      <div className="mx-auto max-w-3xl space-y-4 pb-28 md:pb-10 lg:max-w-4xl xl:max-w-7xl xl:space-y-6 2xl:max-w-[1440px]">
        <div className="xl:sticky xl:top-0 xl:z-20 xl:before:pointer-events-none xl:before:absolute xl:before:-inset-x-4 xl:before:-top-10 xl:before:bottom-1/2 xl:before:-z-10 xl:before:bg-[var(--bg)] xl:before:content-['']">
          <section className={`${CARD} overflow-hidden`}>
            <div className="hidden items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3 md:flex xl:px-6">
              <button
                type="button"
                onClick={() => router.push("/admin/sessions")}
                aria-label="Quay lại danh sách buổi đánh"
                title="Quay lại"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 text-white transition-colors hover:bg-slate-800 active:scale-[0.97]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                {[...others, lead].filter(Boolean).map((a) => (
                  <PhaseButton
                    key={a.key}
                    label={a.label}
                    icon={a.icon}
                    tone={a.tone}
                    variant="solid"
                    badge={a.badge}
                    phase={a.phase}
                    disabled={a.disabled}
                    onClick={a.onClick}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={manualRefreshing}
                  aria-label="Tải lại dữ liệu"
                  title="Tải lại dữ liệu"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.97] disabled:opacity-50"
                >
                  <RotateCcw
                    className={`h-4 w-4 ${manualRefreshing ? "animate-spin" : ""}`}
                  />
                  Tải lại
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-5 xl:grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,260px)] xl:items-center xl:gap-8 xl:p-6">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 pt-1">
                  <h1 className="text-xl font-bold leading-snug text-[var(--text)] sm:text-2xl xl:text-[26px]">
                    {session.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip tone={statusMeta.tone}>{statusMeta.label}</Chip>
                    {canAddMember && hintText && (
                      <Chip
                        tone="warning"
                        icon={<Hourglass className="h-3 w-3" />}
                      >
                        Còn {hintText}
                      </Chip>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4 xl:mt-0">
                <div className="flex w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--primary-soft)] py-2.5 text-[var(--primary)]">
                  <span className="text-[11px] font-semibold leading-none">
                    Thg {format(startAt, "M")}
                  </span>
                  <span className="my-1 text-3xl font-bold leading-none tabular-nums">
                    {format(startAt, "dd")}
                  </span>
                  <span className="text-[10px] font-medium leading-none">
                    {format(startAt, "EEEE", { locale: vi })}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[var(--text)]">
                    <Clock className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
                    <span className="font-semibold tabular-nums">
                      {format(startAt, "HH:mm")} – {format(endAt, "HH:mm")}
                    </span>
                    <span className="text-[var(--text-faint)]">
                      ({session.duration_minutes} phút)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text)]">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
                    <span className="truncate">{session.location || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 xl:mt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Users className="h-4 w-4 text-[var(--text-faint)]" />
                    Số người
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${session.available_slots <= 0
                      ? "text-[var(--danger)]"
                      : "text-[var(--text)]"
                      }`}
                  >
                    {takenSlots}/{maxSlots}
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                  role="progressbar"
                  aria-valuenow={takenSlots}
                  aria-valuemin={0}
                  aria-valuemax={maxSlots}
                  aria-label="Số người đã đăng ký"
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${session.available_slots <= 0
                      ? "bg-red-500"
                      : "bg-[var(--primary)]"
                      }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-faint)]">
                  {session.available_slots <= 0
                    ? "Đã đủ số lượng"
                    : `Còn ${session.available_slots} chỗ trống`}
                </p>
              </div>
            </div>

          </section>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
          <aside className="flex flex-col gap-4 empty:hidden xl:order-2 xl:mt-[86px] xl:w-[380px] xl:shrink-0 2xl:w-[440px]">
            {hasCostData && (
              <SessionCostCard
                sessionId={id!}
                refreshKey={refreshTick}
                allConfirmed={allConfirmed}
              />
            )}
            <SessionPenaltiesCard sessionId={id!} />
          </aside>

          <div className="min-w-0 space-y-4 xl:order-1 xl:flex-1">
            {manualRefreshing ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${CARD} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[var(--border-strong)]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--border-strong)]" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--border-strong)]" />
                        <div className="mt-2 h-5 w-24 animate-pulse rounded-full bg-[var(--border-strong)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {pipeline.length > 0 && (
                  <div className="sd-noscroll flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                    {pipeline.map((p) => (
                      <span
                        key={p.label}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-xs font-medium ${TONE_SOFT[p.tone]}`}
                      >
                        {p.label}
                        <span className="min-w-[22px] rounded-full bg-[var(--surface)] px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums">
                          {p.count}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold text-[var(--text)]">
                    Danh sách tham gia
                  </h2>
                  <span className="text-xs text-[var(--text-faint)]">
                    {registrations.length} người
                  </span>
                </div>

                {registrations.length === 0 ? (
                  <div className={`${CARD} px-6 py-12 text-center`}>
                    <Users className="mx-auto mb-3 h-8 w-8 text-[var(--text-faint)] opacity-50" />
                    <p className="text-sm font-medium text-[var(--text)]">
                      Chưa có ai đăng ký buổi này
                    </p>
                    {canAddMember && (
                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4" />
                        Thêm thành viên
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">{hostRegs.map(renderHostCard)}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/sessions")}
            className="inline-flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-[var(--surface-muted)] px-1 text-[10px] font-semibold leading-none text-[var(--text-muted)] transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={manualRefreshing}
            className="inline-flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-[var(--surface-muted)] px-1 text-[10px] font-semibold leading-none text-[var(--text-muted)] transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <RotateCcw
              className={`h-4 w-4 ${manualRefreshing ? "animate-spin" : ""}`}
            />
            <span>Tải lại</span>
          </button>

          {others.map((a) => (
            <PhaseButton
              key={a.key}
              stacked
              variant="solid"
              label={a.short ?? a.label}
              icon={a.icon}
              tone={a.tone}
              badge={a.badge}
              phase={a.phase}
              disabled={a.disabled}
              onClick={a.onClick}
            />
          ))}

          {lead && (
            <PhaseButton
              stacked
              variant="solid"
              label={lead.short ?? lead.label}
              icon={lead.icon}
              tone={lead.tone}
              badge={lead.badge}
              phase={lead.phase}
              disabled={lead.disabled}
              onClick={lead.onClick}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <ModalShell onClose={closeAddModal} dismissible={false}>
          {(close) => {
            const slots = session.available_slots ?? 0;
            const overSlots =
              addTab === "account" && selectedMembers.length > slots;
            return (
              <>
                <ModalHeader
                  icon={<UserPlus className="h-4 w-4" />}
                  tone="primary"
                  title="Thêm thành viên vào buổi"
                  onClose={close}
                />

                <div className="mx-5 mt-4 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">
                  {(
                    [
                      ["account", "Có tài khoản"],
                      ["guest", "Khách không tài khoản"],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAddTab(val)}
                      className={`rounded-lg py-2 text-sm font-medium transition-all ${addTab === val
                        ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                        : "text-[var(--text-faint)]"
                        }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <ModalBody className="space-y-4">
                  {addTab === "account" ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                        <input
                          autoFocus
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="input-field pl-9"
                          placeholder="Tìm theo tên hoặc số điện thoại..."
                        />
                      </div>

                      {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMembers.map((m) => (
                            <span
                              key={m.id}
                              className={`flex items-center gap-1 rounded-full border py-1 pl-2.5 pr-1.5 text-xs font-medium ${TONE_SOFT.primary}`}
                            >
                              {m.full_name}
                              <button
                                type="button"
                                aria-label={`Bỏ chọn ${m.full_name}`}
                                onClick={() =>
                                  setSelectedMembers((prev) =>
                                    prev.filter((x) => x.id !== m.id),
                                  )
                                }
                                className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)]">
                        {searching ? (
                          <p className="py-4 text-center text-sm text-[var(--text-faint)]">
                            Đang tìm...
                          </p>
                        ) : searchResults.length === 0 ? (
                          <p className="py-4 text-center text-sm text-[var(--text-faint)]">
                            Không tìm thấy thành viên
                          </p>
                        ) : (
                          <ul className="divide-y divide-[var(--border)]">
                            {searchResults.map((m) => {
                              const isSelected = selectedMembers.some(
                                (x) => x.id === m.id,
                              );
                              return (
                                <li key={m.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedMembers((prev) =>
                                        isSelected
                                          ? prev.filter((x) => x.id !== m.id)
                                          : [...prev, m],
                                      )
                                    }
                                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${isSelected
                                      ? "bg-[var(--primary-soft)]"
                                      : "hover:bg-[var(--surface-hover)]"
                                      }`}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${isSelected
                                        ? "border-blue-600 bg-blue-600"
                                        : "border-[var(--border-strong)]"
                                        }`}
                                    >
                                      {isSelected && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                      )}
                                    </span>
                                    <Avatar
                                      url={m.avatar_url}
                                      name={m.full_name}
                                      size={32}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-[var(--text)]">
                                        {m.full_name}
                                      </p>
                                      <p className="text-xs text-[var(--text-faint)]">
                                        {m.phone}
                                      </p>
                                    </div>
                                    <Chip
                                      tone={
                                        m.member_type === "co_dinh"
                                          ? "purple"
                                          : "neutral"
                                      }
                                    >
                                      {m.member_type === "co_dinh"
                                        ? "Thành viên"
                                        : "Vãng lai"}
                                    </Chip>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <p
                        className={`rounded-lg px-3 py-2 text-xs ${overSlots
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : "bg-[var(--primary-soft)] text-[var(--primary)]"
                          }`}
                      >
                        {overSlots
                          ? `⚠️ Bạn đang chọn ${selectedMembers.length} người nhưng buổi chỉ còn ${slots} chỗ trống.`
                          : `Đã chọn ${selectedMembers.length} thành viên. Mỗi người sẽ nhận được thông báo đã được thêm vào buổi. Thanh toán sau khi buổi kết thúc.`}
                      </p>

                      <div>
                        <label className={FIELD_LABEL}>
                          Đi cùng (tuỳ chọn, để gộp tiền vào ví host)
                        </label>
                        <CustomSelect
                          value={hostRegId}
                          onChange={setHostRegId}
                          placeholder="-- Không, tính tiền riêng --"
                          options={registrations
                            .filter(
                              (r) => !r.is_guest && !r.host_registration_id,
                            )
                            .map((r: any) => ({
                              value: r.id,
                              label: r.users?.full_name ?? "?",
                            }))}
                        />
                        {hostRegId && selectedMembers.length > 1 && (
                          <p className="mt-1.5 text-[11px] text-[var(--warning)]">
                            ⚠️ Bạn đang chọn nhiều thành viên cùng lúc + chọn
                            "đi cùng host" — tất cả {selectedMembers.length}{" "}
                            người sẽ được gắn vào cùng 1 host này.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className={FIELD_LABEL}>Họ tên *</label>
                        <input
                          value={guestForm.full_name}
                          onChange={(e) =>
                            setGuestForm((f) => ({
                              ...f,
                              full_name: e.target.value,
                            }))
                          }
                          className="input-field"
                          placeholder="Tên khách"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={FIELD_LABEL}>Giới tính</label>
                          <CustomSelect
                            value={guestForm.gender}
                            onChange={(val) =>
                              setGuestForm((f) => ({ ...f, gender: val }))
                            }
                            options={[
                              { value: "male", label: "Nam" },
                              { value: "female", label: "Nữ" },
                            ]}
                          />
                        </div>
                        <div>
                          <label className={FIELD_LABEL}>Trình độ</label>
                          <CustomSelect
                            value={guestForm.skill_level}
                            onChange={(val) =>
                              setGuestForm((f) => ({ ...f, skill_level: val }))
                            }
                            placeholder="-- Chọn --"
                            options={[
                              { value: "yeu", label: "Yếu" },
                              { value: "trung_binh_yeu", label: "TB Yếu" },
                              { value: "trung_binh", label: "Trung bình" },
                              { value: "trung_binh_cong", label: "TB+" },
                              { value: "ban_chuyen", label: "Bán chuyên" },
                              {
                                value: "chuyen_nghiep",
                                label: "Chuyên nghiệp",
                              },
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={FIELD_LABEL}>
                          Email (không bắt buộc, để gửi hóa đơn)
                        </label>
                        <input
                          type="email"
                          value={guestForm.email}
                          onChange={(e) =>
                            setGuestForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                          className="input-field"
                          placeholder="vidu@email.com"
                        />
                        {guestForm.email.trim() && (
                          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
                            <span className="flex items-center gap-2 text-sm text-[var(--text)]">
                              <Mail className="h-4 w-4 text-[var(--text-faint)]" />
                              Gửi email thông báo ngay
                            </span>
                            <Switch
                              checked={guestSendEmail}
                              onChange={setGuestSendEmail}
                              label="Gửi email thông báo ngay"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={FIELD_LABEL}>Đi cùng (tuỳ chọn)</label>
                        <CustomSelect
                          value={hostRegId}
                          onChange={(val) => {
                            setHostRegId(val);
                            if (!val) setGuestPaySeparately(false);
                          }}
                          placeholder="-- Không, tính tiền riêng --"
                          options={registrations
                            .filter((r) => !r.host_registration_id)
                            .map((r: any) => ({
                              value: r.id,
                              label:
                                r.users?.full_name ?? r.guest_full_name ?? "?",
                            }))}
                        />

                        {hostRegId && (
                          <>
                            <label className="mt-2.5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                              <input
                                type="checkbox"
                                checked={guestPaySeparately}
                                onChange={(e) =>
                                  setGuestPaySeparately(e.target.checked)
                                }
                                className="rounded"
                              />
                              Thanh toán riêng (không gộp với người đi cùng)
                            </label>
                            <p className="mt-1 text-[11px] text-[var(--text-faint)]">
                              {guestPaySeparately
                                ? "Khách này sẽ tự thanh toán tiền mặt riêng, nhận hóa đơn riêng qua email."
                                : "Mặc định: người đi cùng trả hộ, hóa đơn sẽ gộp gửi về người đi cùng."}
                            </p>
                          </>
                        )}
                      </div>

                      <div>
                        <label className={FIELD_LABEL}>Ghi chú (tuỳ chọn)</label>
                        <input
                          value={addNotes}
                          onChange={(e) => setAddNotes(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </ModalBody>

                <ModalFooter>
                  <button
                    type="button"
                    onClick={close}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={
                      adding ||
                      (addTab === "account"
                        ? selectedMembers.length === 0 ||
                        selectedMembers.length > slots
                        : !guestForm.full_name.trim() || slots < 1)
                    }
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                    Thêm vào buổi
                    {addTab === "account" && selectedMembers.length > 1
                      ? ` (${selectedMembers.length})`
                      : ""}
                  </button>
                </ModalFooter>
              </>
            );
          }}
        </ModalShell>
      )}

      {confirmModal && (
        <ModalShell onClose={closeConfirmModal}>
          {(close) => {
            const k = confirmModal.key;
            return (
              <>
                <ModalHeader
                  icon={
                    k === "closeList" ? (
                      <UserX className="h-4 w-4" />
                    ) : k === "completeSession" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )
                  }
                  tone={k === "closeList" ? "danger" : "success"}
                  title={confirmModal.title}
                  onClose={close}
                />
                <ModalBody className="text-sm text-[var(--text-muted)]">
                  {confirmModal.message}
                </ModalBody>
                <ModalFooter>
                  <button
                    type="button"
                    onClick={close}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      k === "closeList"
                        ? runCloseList()
                        : k === "completeSession"
                          ? runCompleteSession()
                          : runCheckinAllPresent()
                    }
                    className={`h-10 rounded-xl px-4 text-sm font-semibold text-white transition-colors ${k === "closeList"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                  >
                    Xác nhận
                  </button>
                </ModalFooter>
              </>
            );
          }}
        </ModalShell>
      )}

      {showRollbackModal && (
        <ModalShell onClose={() => setShowRollbackModal(false)}>
          {(close) => {
            const preview = getRollbackRefundPreview();
            const total = preview.reduce((s, p) => s + p.amount, 0);
            const emailCandidates = getRollbackEmailCandidates();
            return (
              <>
                <ModalHeader
                  icon={<RotateCcw className="h-4 w-4" />}
                  tone="warning"
                  title="Hoàn tác hóa đơn?"
                  onClose={close}
                />

                <ModalBody className="space-y-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    Hoàn tác hóa đơn đã gửi cho buổi{" "}
                    <strong className="text-[var(--text)]">
                      {session.title}
                    </strong>
                    ?
                  </p>

                  {preview.length > 0 && (
                    <div
                      className={`space-y-2 rounded-xl border p-3 ${TONE_SOFT.primary}`}
                    >
                      <p className="text-xs font-semibold">
                        Tiền sẽ hoàn về ví ({preview.length} người)
                      </p>
                      <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
                        {preview.map((p) => (
                          <li
                            key={p.user_id}
                            className="flex items-center justify-between text-xs text-[var(--text-muted)]"
                          >
                            <span>{p.full_name}</span>
                            <span className="font-semibold tabular-nums text-[var(--primary)]">
                              {formatVnd(p.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between border-t border-[color-mix(in_srgb,var(--primary)_28%,transparent)] pt-2">
                        <span className="text-xs font-semibold text-[var(--text)]">
                          Tổng hoàn
                        </span>
                        <span className="text-sm font-bold tabular-nums">
                          {formatVnd(total)}
                        </span>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                      <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span>
                        Tiền đã trừ ví sẽ được <strong>hoàn lại</strong> và ghi
                        vào lịch sử ví.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                      <span>
                        <strong>Tất cả</strong> xác nhận thanh toán (kể cả tiền
                        mặt/chuyển khoản admin đã xác nhận thủ công) sẽ bị huỷ,
                        member sẽ nhận thông báo.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                      <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                      <span>
                        Buổi sẽ mở lại để bạn chỉnh sửa chi phí và gửi hóa đơn
                        mới.
                      </span>
                    </li>
                  </ul>

                  {emailCandidates.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                        <Mail className="h-3.5 w-3.5" />
                        Gửi mail "hóa đơn bị huỷ" cho khách (mặc định: không
                        gửi)
                      </p>
                      <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                        {emailCandidates.map((g) => {
                          const name = g.guest_full_name ?? "?";
                          return (
                            <li
                              key={g.id}
                              className="flex items-center justify-between gap-3"
                            >
                              <span className="truncate text-sm text-[var(--text)]">
                                {name}
                              </span>
                              <Switch
                                checked={rollbackEmailIds.has(g.id)}
                                onChange={() => toggleRollbackEmail(g.id)}
                                label={`Gửi mail cho ${name}`}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </ModalBody>

                <ModalFooter>
                  <button
                    type="button"
                    onClick={close}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRollback}
                    disabled={rollingBack || checkingPenalties}
                    className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                  >
                    {(rollingBack || checkingPenalties) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Xác nhận hoàn tác
                  </button>
                </ModalFooter>
              </>
            );
          }}
        </ModalShell>
      )}

      {showPenaltyRefundModal && (
        <ModalShell onClose={() => setShowPenaltyRefundModal(false)}>
          {(close) => (
            <>
              <ModalHeader
                icon={<ShieldAlert className="h-4 w-4" />}
                tone="danger"
                title="Hoàn luôn tiền phạt?"
                onClose={close}
              />
              <ModalBody className="space-y-3">
                <p className="text-sm text-[var(--text-muted)]">
                  Buổi này có <strong>{penaltiesToRefund.length}</strong> khoản
                  phạt đã được trừ thẳng vào ví. Bạn có muốn hoàn lại các khoản
                  này luôn không?
                </p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--border)] p-2 pr-1">
                  {penaltiesToRefund.map((p: any) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-1 py-1 text-xs text-[var(--text-muted)]"
                    >
                      <span className="truncate">
                        {p.users?.full_name}{" "}
                        <span className="text-[var(--text-faint)]">
                          — {p.reason}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 font-semibold tabular-nums text-[var(--danger)]">
                        {formatVnd(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-[var(--text)]">
                    Tổng cộng
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--danger)]">
                    {formatVnd(
                      penaltiesToRefund.reduce(
                        (s, p) => s + Number(p.amount),
                        0,
                      ),
                    )}
                  </span>
                </div>
              </ModalBody>
              <ModalFooter className="flex-col items-stretch">
                <button
                  type="button"
                  onClick={() => handleRollbackFinish(true)}
                  disabled={rollingBack}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {rollingBack && <Loader2 className="h-4 w-4 animate-spin" />}
                  Hoàn luôn tiền phạt
                </button>
                <button
                  type="button"
                  onClick={() => handleRollbackFinish(false)}
                  disabled={rollingBack}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--border-strong)] disabled:opacity-50"
                >
                  Không hoàn tiền phạt
                </button>
              </ModalFooter>
            </>
          )}
        </ModalShell>
      )}

      {showCancelModal && (
        <ModalShell size="sm" onClose={() => setShowCancelModal(false)}>
          {(close) => (
            <>
              <ModalHeader
                icon={<XCircle className="h-4 w-4" />}
                tone="danger"
                title="Hủy buổi đánh?"
                onClose={close}
              />
              <ModalBody>
                <p className="text-sm text-[var(--text-muted)]">
                  Hủy buổi{" "}
                  <strong className="text-[var(--text)]">
                    "{session.title}"
                  </strong>
                  ? Buổi chưa có ai đăng ký nên có thể hủy an toàn. Bạn có thể
                  mở lại sau nếu cần.
                </p>
              </ModalBody>
              <ModalFooter>
                <button
                  type="button"
                  onClick={close}
                  className="btn-secondary text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleCancelSession}
                  disabled={cancelling}
                  className="flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xác nhận hủy buổi
                </button>
              </ModalFooter>
            </>
          )}
        </ModalShell>
      )}
    </>
  );
}
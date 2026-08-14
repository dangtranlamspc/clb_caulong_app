"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Hourglass,
  Phone,
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
import { createPortal } from "react-dom";
import { MorphButton } from "@/components/effect-button/MorphButton";
import SessionCostCard from "@/components/admin/sessions/SessionCostCard";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { SwipeableRow } from "@/components/admin/sessions/SwipeableRow";
import { CompactActionButton } from "@/components/admin/sessions/CompactActionButton";
import SessionPenaltiesCard from "@/components/admin/sessions/SessionPenaltiesCard";
import { useNavLoadingStore } from "@/store/nav-loading.store";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> =
{
  pendingApproval: {
    label: "Chờ duyệt",
    cls: "bg-orange-50 text-orange-600 border-orange-200",
    icon: Hourglass,
  },
  pending: {
    label: "Chờ thanh toán",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Hourglass,
  },
  pendingReview: {
    label: "Chờ chốt thanh toán",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Eye,
  },
  confirmed: {
    label: "Đã xác nhận thanh toán",
    cls: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Thanh toán bị từ chối",
    cls: "bg-red-50 text-red-600 border-red-200",
    icon: XCircle,
  },
  awaitingCheckin: {
    label: "Chờ điểm danh",
    cls: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: Hourglass,
  },
  awaitingFinish: {
    label: "Chờ buổi đánh kết thúc",
    cls: "bg-slate-50 text-slate-600 border border-slate-200",
    icon: Hourglass,
  },
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

type ActionPhase = "idle" | "loading" | "success";

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [registrations, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionPhase, setActionPhase] = useState<Record<string, ActionPhase>>(
    {},
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [showReject, setShowReject] = useState<string | null>(null);

  const [viewingBillUrl, setViewingBillUrl] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [addConfirmNow, setAddConfirmNow] = useState(false);
  const [addNotes, setAddNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const [manualRefreshing, setManualRefreshing] = useState(false);

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

  const [checkingInAll, setCheckingInAll] = useState(false);
  const [closingList, setClosingList] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);

  const [rollingBack, setRollingBack] = useState(false);

  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reopening, setReopening] = useState(false);

  const [finishing, setFinishing] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    key: "checkinAll" | "closeList" | "completeSession";
    title: string;
    message: ReactNode;
  } | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const [rollbackModalVisible, setRollbackModalVisible] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);

  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());

  const [showPenaltyRefundModal, setShowPenaltyRefundModal] = useState(false);
  const [penaltyRefundModalVisible, setPenaltyRefundModalVisible] = useState(false);
  const [penaltiesToRefund, setPenaltiesToRefund] = useState<any[]>([]);
  const [checkingPenalties, setCheckingPenalties] = useState(false);

  const [sharingReceiptId, setSharingReceiptId] = useState<string | null>(null);

  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (confirmModal) {
      const raf = requestAnimationFrame(() => setConfirmModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [confirmModal]);

  useEffect(() => {
    if (showCancelModal) {
      const raf = requestAnimationFrame(() => setCancelModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [showCancelModal]);


  useEffect(() => {
    if (showPenaltyRefundModal) {
      const raf = requestAnimationFrame(() => setPenaltyRefundModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [showPenaltyRefundModal]);

  const closePenaltyRefundModal = () => {
    setPenaltyRefundModalVisible(false);
    setTimeout(() => setShowPenaltyRefundModal(false), 200);
  };

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setTimeout(() => setShowCancelModal(false), 200);
  };

  const toggleHostGuests = (hostId: string) => {
    setExpandedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(hostId)) next.delete(hostId);
      else next.add(hostId);
      return next;
    });
  };

  const closeConfirmModal = () => {
    setConfirmModalVisible(false);
    setTimeout(() => setConfirmModal(null), 200);
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

  const startNavLoading = useNavLoadingStore((s) => s.start);

  const handleShareGuestReceipt = async (
    reg: any,
    hostName?: string,
    groupedGuests?: any[],
  ) => {
    if (sharingReceiptId) return;
    setSharingReceiptId(reg.id);
    try {
      const html2canvas = (await import("html2canvas")).default;

      const displayName = reg.users?.full_name ?? reg.guest_full_name ?? "?";
      const hostAmount = reg.amount_override ?? 0;
      const hostBaseAmount = reg.base_amount ?? hostAmount;
      const hostOtherFeeAmount = reg.other_fee_amount ?? 0;
      const hostOtherFeeNote = reg.other_fee_note;
      const isGroupedGuest = Boolean(reg.host_registration_id);

      const guestsList = (groupedGuests ?? []).map((g) => ({
        name: g.users?.full_name ?? g.guest_full_name ?? "?",
        baseAmount: g.base_amount ?? g.amount_override ?? 0,
        otherFeeAmount: g.other_fee_amount ?? 0,
        otherFeeNote: g.other_fee_note,
      }));
      const guestsTotal = guestsList.reduce(
        (s, g) => s + g.baseAmount + (g.otherFeeAmount ?? 0),
        0,
      );
      const totalAmount = hostAmount + guestsTotal;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "420px";
      document.body.appendChild(container);

      const row = (label: string, value: string, opts?: { bold?: boolean; amber?: boolean; shaded?: boolean; note?: string }) => {
        const noteHtml = opts?.note
          ? opts.note
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .join("<br/>")
          : "";

        return `
          <div style="display:flex;justify-content:space-between;padding:10px 16px;font-size:13px;background:${opts?.shaded ? "#f9fafb" : "transparent"};border-top:1px solid #f3f4f6;">
            <span style="color:#9ca3af;">${label}</span>
            <div style="text-align:right;">
              <span style="font-weight:${opts?.bold ? 700 : 500};color:${opts?.amber ? "#d97706" : "#111827"};">${value}</span>
              ${noteHtml ? `<p style="font-size:11px;color:#9ca3af;font-style:italic;margin:0;">${noteHtml}</p>` : ""}
            </div>
          </div>
        `;
      };

      const guestRowsHtml = guestsList
        .map(
          (g) => `
            <div style="padding:10px 16px 2px;font-size:13px;border-top:1px solid #f3f4f6;">
              <span style="color:#9ca3af;">+ </span>${g.name}
              <span style="color:#9ca3af;font-size:12px;"> (đi cùng)</span>
            </div>
            ${row("Tiền sân + cầu", formatVnd(g.baseAmount))}
            ${g.otherFeeAmount > 0 ? row("Khoản khác", formatVnd(g.otherFeeAmount), { amber: true, note: g.otherFeeNote }) : ""}
          `,
        )
        .join("");

      container.innerHTML = `
      <div style="width:420px;background:#ffffff;padding:28px;font-family:inherit;">
        <div style="text-align:center;margin-bottom:20px;">
          <p style="font-size:13px;font-weight:700;color:#2563eb;letter-spacing:0.5px;">BNB BADMINTON CLUB</p>
          <p style="font-size:12px;color:#9ca3af;margin-top:2px;">Biên lai thanh toán</p>
        </div>
        <div style="text-align:center;margin-bottom:20px;">
          <p style="font-size:30px;font-weight:900;color:#ef4444;margin:0;line-height:1.3;">${formatVnd(totalAmount)}</p>
          <span style="display:inline-block;margin-top:10px;font-size:11px;color:#9ca3af;background:#f9fafb;padding:4px 10px;border-radius:999px;">
            💵 Tiền mặt${isGroupedGuest ? " (tự thanh toán)" : ""}
          </span>
        </div>
        <div style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:16px;">
          ${row("Người thanh toán", displayName)}
          ${row("Buổi đánh", session.title)}
          ${row("Thời gian buổi", format(new Date(session.scheduled_at), "HH:mm dd/MM/yyyy", { locale: vi }))}
          ${isGroupedGuest && hostName ? row("Đi cùng", hostName, { note: "thanh toán riêng, không gộp ví" }) : ""}
        </div>
        <div style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
          ${row("Tiền sân + cầu", formatVnd(hostBaseAmount))}
          ${hostOtherFeeAmount > 0 ? row("Khoản khác", formatVnd(hostOtherFeeAmount), { amber: true, note: hostOtherFeeNote }) : ""}
          ${guestRowsHtml}
          ${row("Tổng cộng", formatVnd(totalAmount), { bold: true, shaded: true })}
        </div>
        <p style="text-align:center;font-size:10px;color:#d1d5db;margin-top:20px;">
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

      const fileName = `bien-lai-${displayName.replace(/\s+/g, "-")}-${reg.id}.png`;
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
        toast.success("Đã tải ảnh biên lai xuống");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error("Tạo ảnh biên lai thất bại");
      }
    } finally {
      setSharingReceiptId(null);
    }
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
      .filter(Boolean) as {
        host: any;
        hostPending: boolean;
        hostReview: boolean;
        hostWalletPending: boolean;
        nestedPending: any[];
        nestedReview: any[];
        nestedWalletPending: any[];
      }[];

    const getPaymentTag = (reg: any, hostName?: string) => {
      const isIndependentGuest = reg.is_guest && !reg.user_id;

      if (isIndependentGuest && reg.payment_method === "cash") {
        return { label: "💵 Tiền mặt", cls: "bg-emerald-50 text-emerald-700" };
      }
      if (
        Boolean(reg.payment_reference) &&
        reg.payment_reference !== "TIEN_MAT"
      )
        return {
          label: "🏦 Chuyển khoản (đã nộp bill)",
          cls: "bg-indigo-50 text-indigo-700",
        };
      if (reg.payment_method === "cash")
        return {
          label: "💵 Tiền mặt (tự yêu cầu)",
          cls: "bg-emerald-50 text-emerald-700",
        };
      if (reg.payment_method === "grouped_with_host")
        return {
          label: `👥 Gộp theo ${hostName ?? "host"}`,
          cls: "bg-sky-50 text-sky-700",
        };
      return { label: "💵 Tiền mặt", cls: "bg-emerald-50 text-emerald-700" };
    };

    return (
      <div className="space-y-4">
        {(pending.length > 0 ||
          pendingReview.length > 0 ||
          walletPendingConfirm.length > 0) && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Có{" "}
                <strong className="text-gray-900">
                  {pending.length +
                    pendingReview.length +
                    walletPendingConfirm.length}
                </strong>{" "}
                người sẽ được tự động xác nhận khi hoàn thành:
              </p>
              <ul className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
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
                      if (names.length <= MAX_NAMES_SHOWN)
                        return names.join(", ");

                      const shown = names.slice(0, MAX_NAMES_SHOWN).join(", ");
                      const remaining = names.length - MAX_NAMES_SHOWN;
                      return `${shown},... (${remaining} người khác)`;
                    };

                    const walletPendingGuestNames =
                      buildGuestNamesLabel(nestedWalletPending);
                    const hostWalletLabel = walletPendingGuestNames
                      ? `⏳ Chưa chọn riêng hay gộp với ${walletPendingGuestNames} → gộp ví BnB`
                      : "⏳ Chưa chọn → gộp ví BnB";

                    const nestedWalletGuests = [
                      ...nestedPending,
                      ...nestedWalletPending,
                    ];

                    return (
                      <li key={host.id} className="text-sm text-gray-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {name}
                          </span>

                          {isIndependentGuest && hostPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              💵 Tiền mặt
                            </span>
                          )}

                          {isMember && hostPending && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              <Wallet className="w-2.5 h-2.5" /> Ví BNB
                            </span>
                          )}

                          {hostWalletPending && (
                            <span
                              title={nestedWalletPending
                                .map((g) =>
                                  g.is_guest
                                    ? g.guest_full_name
                                    : g.users?.full_name,
                                )
                                .join(", ")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
                            >
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

                        {(nestedWalletGuests.length > 0 ||
                          nestedReview.length > 0) && (
                            <ul className="mt-1 ml-1.5 pl-3 space-y-1 border-l border-gray-100">
                              {nestedWalletGuests.map((g) => (
                                <li
                                  key={g.id}
                                  className="text-xs text-purple-600 flex items-center gap-1.5 flex-wrap"
                                >
                                  <CornerDownRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                  <span>
                                    {g.is_guest
                                      ? g.guest_full_name
                                      : g.users?.full_name}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                                    <Wallet className="w-2.5 h-2.5" /> Ví BNB của{" "}
                                    {name}
                                  </span>
                                </li>
                              ))}
                              {nestedReview.map((g) => {
                                const gTag = getPaymentTag(g, name);
                                return (
                                  <li
                                    key={g.id}
                                    className="text-xs text-purple-600 flex items-center gap-1.5 flex-wrap"
                                  >
                                    <CornerDownRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                    <span>
                                      {g.is_guest
                                        ? g.guest_full_name
                                        : g.users?.full_name}
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
          )}

        {rejected.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
              ⚠️ Sẽ KHÔNG được xử lý tự động
            </p>
            <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {rejected.map((r) => {
                const name = r.is_guest
                  ? r.guest_full_name
                  : r.users?.full_name;
                return (
                  <li
                    key={r.id}
                    className="text-xs text-red-600 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3 h-3 flex-shrink-0" />
                    <span className="font-medium">{name}</span>
                    <span className="text-red-400">
                      — thanh toán bị từ chối
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-red-600">
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
    const msg = hasWarnings
      ? buildPendingSummary()
      : "Xác nhận hoàn thành buổi đánh? Buổi sẽ bị khoá lại.";
    setConfirmModal({
      key: "completeSession",
      title: "Hoàn thành buổi đánh?",
      message: msg,
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

  const handleConfirmRollback = async () => {
    if (!id) return;
    setCheckingPenalties(true);
    try {
      const { data } = await fundApi.getPenaltiesBySession(id);
      const walletConfirmedPenalties = (data?.data ?? []).filter(
        (p: any) =>
          p.payment_status === "confirmed" && p.actual_payment_method === "wallet",
      );

      closeRollbackModal();

      if (walletConfirmedPenalties.length > 0) {
        setPenaltiesToRefund(walletConfirmedPenalties);
        setShowPenaltyRefundModal(true);
      } else {
        handleRollbackFinish(false);
      }
    } catch (err) {
      console.error("[handleConfirmRollback] Lỗi kiểm tra phạt:", err);
      closeRollbackModal();
      handleRollbackFinish(false);
    } finally {
      setCheckingPenalties(false);
    }
  };

  const handleCancelSession = async () => {
    if (!id) return;
    closeCancelModal();
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
      if (mySeq !== refreshSeqRef.current) {
        return;
      }
      setSession(s);
      setRegs(r);
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
      .on("broadcast", { event: "session_updated" }, () => {
        scheduleRefresh();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "registrations",
          filter: `session_id=eq.${id}`,
        },
        (payload) => {
          scheduleRefresh();
        },
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
      .subscribe((status, err) => { });
    return () => {
      supabase.removeChannel(channel);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
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
    if (showRollbackModal) {
      const raf = requestAnimationFrame(() => setRollbackModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [showRollbackModal]);

  useEffect(() => {
    if (showAddModal) {
      const raf = requestAnimationFrame(() => setAddModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [showAddModal]);

  const closeRollbackModal = () => {
    setRollbackModalVisible(false);
    setTimeout(() => setShowRollbackModal(false), 200);
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

  const closeAddModal = () => {
    setAddModalVisible(false);
    setTimeout(() => {
      setShowAddModal(false);
      setSearch("");
      setSearchResults([]);
      setSelectedMembers([]);
      setAddConfirmNow(false);
      setAddNotes("");
      setAddTab("account");
      setGuestForm({ full_name: "", gender: "male", skill_level: "", email: "" });
      setHostRegId("");
      setGuestPaidNow(false);
      setGuestPaySeparately(false);
    }, 200);
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
          pay_type: hostRegId ? (guestPaySeparately ? "solo" : "grouped") : undefined,
          payment_status: guestPaySeparately ? (guestPaidNow ? "confirmed" : "pending") : undefined,
          notes: addNotes || undefined,
        });
        toast.success(`Đã thêm khách ${guestForm.full_name} vào buổi`);
      }
      closeAddModal();
      refreshSilently();
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="card h-32 animate-pulse bg-gray-100" />
        <div className="card h-64 animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (!session) return null;

  const isAwaitingFinish = (reg: any) =>
    reg.payment_status === "pending" &&
    reg.participation_status === "confirmed" &&
    reg.amount_override == null;

  const allPaid = registrations
    .filter((r) => r.participation_status === "confirmed")
    .every((r) => r.payment_status === "confirmed");

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
        (r.payment_method === "grouped_with_host" && r.amount_override != null)),
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

  const canAddMember =
    (session.status === "open" || session.status === "full") &&
    session.available_slots > 0;

  const canFinishSession =
    (session.status === "open" || session.status === "full") &&
    registrations.length > 0;

  const formatVnd = (n: number) =>
    Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";

  function DesktopRowActions({ reg }: { reg: any }) {
    const displayName = reg.users?.full_name ?? reg.guest_full_name ?? "?";
    const busy = actionId === reg.id;

    if (reg.participation_status === "pending_approval") {
      return (
        <>
          <MorphButton
            phase={getPhase(`${reg.id}:approve`)}
            idleIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Duyệt"
            idleWidthClass="w-28"
            colorClass="bg-blue-500 hover:bg-blue-600 text-white"
            successClassName="bg-blue-500 text-white"
            onClick={() => handleApproveRegistration(reg.id)}
            disabled={busy}
          />
          <MorphButton
            phase={getPhase(`${reg.id}:rejectReg`)}
            idleIcon={<XCircle className="w-3.5 h-3.5" />}
            label="Từ chối"
            idleWidthClass="w-28"
            colorClass="bg-red-500 hover:bg-red-600 text-white"
            successClassName="bg-red-500 text-white"
            onClick={() => handleRejectRegistration(reg.id, displayName)}
            disabled={busy}
          />
        </>
      );
    }

    if (reg.participation_status === "awaiting_checkin") {
      return (
        <>
          <MorphButton
            phase={getPhase(`${reg.id}:present`)}
            idleIcon={<UserCheck className="w-3.5 h-3.5" />}
            label="Có mặt"
            idleWidthClass="w-28"
            colorClass="bg-green-500 hover:bg-green-600 text-white"
            successClassName="bg-green-500 text-white"
            onClick={() => handleCheckinPresent(reg.id)}
            disabled={busy}
          />
          <MorphButton
            phase={getPhase(`${reg.id}:absent`)}
            idleIcon={<UserX className="w-3.5 h-3.5" />}
            label="Vắng mặt"
            idleWidthClass="w-28"
            colorClass="bg-red-500 hover:bg-red-600 text-white"
            successClassName="bg-red-500 text-white"
            onClick={() => handleCheckinAbsent(reg.id, displayName)}
            disabled={busy}
          />
        </>
      );
    }

    if (reg.participation_status === "confirmed" && isAwaitingFinish(reg)) {
      return (
        <MorphButton
          phase={getPhase(`${reg.id}:absent`)}
          idleIcon={<UserX className="w-3.5 h-3.5" />}
          label="Vắng mặt"
          idleWidthClass="w-28"
          colorClass="bg-red-500 hover:bg-red-600 text-white"
          successClassName="bg-red-500 text-white"
          onClick={() => handleCheckinAbsent(reg.id, displayName)}
          disabled={busy}
        />
      );
    }

    return (
      <>
        <MorphButton
          phase={getPhase(`${reg.id}:confirm`)}
          idleIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="Xác nhận"
          idleWidthClass="w-28"
          colorClass="bg-green-500 hover:bg-green-600 text-white"
          successClassName="bg-green-500 text-white"
          onClick={() => handleConfirm(reg.id)}
          disabled={busy}
        />
        <button
          onClick={() => setShowReject(reg.id)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" /> Từ chối
        </button>
      </>
    );
  }

  const getCanReviewPayment = (reg: any) =>
    Boolean(reg.payment_reference) ||
    (reg.payment_method === "cash" && reg.amount_override != null);

  function RowActions({ reg }: { reg: any }) {
    const displayName = reg.users?.full_name ?? reg.guest_full_name ?? "?";

    if (reg.participation_status === "pending_approval") {
      return (
        <>
          <button
            onClick={() => handleApproveRegistration(reg.id)}
            className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">Duyệt</span>
          </button>
          <button
            onClick={() => handleRejectRegistration(reg.id, displayName)}
            className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors rounded-r-2xl"
          >
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Từ chối
            </span>
          </button>
        </>
      );
    }

    if (reg.participation_status === "awaiting_checkin") {
      return (
        <>
          <button
            onClick={() => handleCheckinPresent(reg.id)}
            className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Có mặt
            </span>
          </button>
          <button
            onClick={() => handleCheckinAbsent(reg.id, displayName)}
            className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors rounded-r-2xl"
          >
            <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
              <UserX className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-gray-700">
              Vắng mặt
            </span>
          </button>
        </>
      );
    }

    if (reg.participation_status === "confirmed" && isAwaitingFinish(reg)) {
      return (
        <button
          onClick={() => handleCheckinAbsent(reg.id, displayName)}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors rounded-r-2xl"
        >
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
            <UserX className="w-5 h-5 text-white" />
          </div>
          <span className="text-[11px] font-medium text-gray-700">
            Vắng mặt
          </span>
        </button>
      );
    }

    return (
      <>
        <button
          onClick={() => handleConfirm(reg.id)}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[11px] font-medium text-gray-700">
            Xác nhận
          </span>
        </button>
        <button
          onClick={() => setShowReject(reg.id)}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 bg-gray-100 active:bg-gray-200 transition-colors rounded-r-2xl"
        >
          <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[11px] font-medium text-gray-700">Từ chối</span>
        </button>
      </>
    );
  }

  const renderRowContent = (reg: any, isNested = false, hostName?: string, groupedGuestsForReceipt?: any[],) => {
    const isPendingReview =
      reg.payment_status === "pending" &&
      (Boolean(reg.payment_reference) ||
        (reg.payment_method === "cash" && reg.amount_override != null) ||
        (reg.payment_method === "grouped_with_host" && reg.amount_override != null));

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
    const busy = actionId === reg.id;
    const user = reg.users;
    const displayName = user?.full_name ?? reg.guest_full_name ?? "?";
    const displayGender = user?.gender ?? reg.guest_gender;

    const totalAmount = reg.amount_override;
    const hasBreakdown =
      totalAmount != null &&
      reg.base_amount != null &&
      reg.other_fee_amount != null &&
      reg.other_fee_amount > 0;

    const isPlainPending =
      reg.participation_status !== "pending_approval" &&
      reg.participation_status !== "awaiting_checkin" &&
      !isAwaitingFinishRow &&
      !isPendingReview &&
      reg.payment_status === "pending";

    const isConfirmedRow = reg.payment_status === "confirmed";

    const pulseClass = !isDesktop
      ? isPendingReview
        ? "pending-review-row-pulse"
        : isPlainPending
          ? "pending-row-pulse"
          : isConfirmedRow
            ? "confirmed-row-tint"
            : ""
      : "";

    return (
      <div
        className={`relative ${isNested ? "pl-4 pr-3 py-3" : "px-4 py-3.5"} ${pulseClass}`}
      >
        <div className="flex items-start gap-3">
          {isNested && (
            <CornerDownRight className="w-3.5 h-3.5 text-gray-300 mt-1 flex-shrink-0" />
          )}
          <div
            className={`rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden ${isNested ? "w-7 h-7" : "w-9 h-9"}`}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span
                className={`text-blue-700 font-semibold ${isNested ? "text-xs" : "text-sm"}`}
              >
                {displayName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-semibold text-gray-900 ${isNested ? "text-sm" : "text-[15px]"}`}
              >
                {displayName}
              </span>
              {user?.member_type && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${user.member_type === "co_dinh"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}
                >
                  {user.member_type === "co_dinh" ? "Thành viên" : "Vãng lai"}
                </span>
              )}
              {reg.is_guest && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200 font-medium">
                  Khách
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-400">
              {displayGender && (
                <span>{displayGender === "male" ? "Nam" : "Nữ"}</span>
              )}
              {reg.is_guest
                ? reg.guest_skill_level && (
                  <span>
                    {SKILL_LABEL[reg.guest_skill_level] ??
                      reg.guest_skill_level}
                  </span>
                )
                : user?.level && (
                  <span>{LEVEL_LABELS[user.level] ?? user.level}</span>
                )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium whitespace-nowrap ${cfg.cls}`}
              >
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>

              {reg.payment_method === "cash" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                  💵 Tiền mặt
                </span>
              )}

              {reg.payment_method === "bank_transfer" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
                  🏦 Chuyển khoản
                </span>
              )}
              {reg.payment_method === "wallet_pending_confirm" &&
                reg.host_registration_id && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 font-medium">
                    <Wallet className="w-3 h-3" />
                    Chờ {hostName ?? "host"} quyết định
                  </span>
                )}

              {reg.payment_method === "wallet_grouped" &&
                reg.host_registration_id && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1 font-medium">
                    <Wallet className="w-3 h-3" />
                    Ví BNB của {hostName ?? "host"}
                  </span>
                )}

              {(reg.payment_method === "wallet" ||
                (reg.payment_method === "wallet_grouped" &&
                  !reg.host_registration_id) ||
                (reg.payment_method === "wallet_pending_confirm" &&
                  !reg.host_registration_id)) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1 font-medium">
                    <Wallet className="w-3 h-3" />
                    Ví BNB
                    {reg.payment_method === "wallet_pending_confirm"
                      ? " (chờ xác nhận)"
                      : ""}
                  </span>
                )}

              {reg.points_awarded && reg.payment_status === "confirmed" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                  🏸 Đã cộng điểm
                </span>
              )}

              <span
                className={`ml-auto text-xs font-bold whitespace-nowrap ${totalAmount != null ? "text-gray-900" : "text-gray-300 italic font-normal"}`}
              >
                {totalAmount != null ? formatVnd(totalAmount) : "-"}
              </span>

              {reg.is_guest &&
                reg.payment_method === "cash" &&
                totalAmount != null && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareGuestReceipt(reg, hostName, groupedGuestsForReceipt);
                    }}
                    disabled={sharingReceiptId === reg.id}
                    title="Chia sẻ biên lai"
                    className="hidden md:flex flex-shrink-0 items-center gap-1 px-2.5 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {sharingReceiptId === reg.id ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Share2 className="w-3 h-3 text-white" />
                    )}
                    <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                      Chia sẻ
                    </span>
                  </button>
                )}
            </div>

            {hasBreakdown && (
              <div className="text-[11px] text-gray-400 mt-1.5 space-y-1">
                <p>
                  Sân + cầu:{" "}
                  <span className="font-medium text-gray-500">
                    {formatVnd(reg.base_amount)}
                  </span>
                  {" + "}Khoản khác:{" "}
                  <span className="font-medium text-gray-500">
                    {formatVnd(reg.other_fee_amount)}
                  </span>
                </p>
                {reg.other_fee_note && (
                  <ul className="pl-3 space-y-0.5">
                    {reg.other_fee_note
                      .split("\n")
                      .map((l: string) => l.trim())
                      .filter(Boolean)
                      .map((line: string, i: number) => (
                        <li key={i} className="italic">
                          — {line}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {reg.notes && (
              <p className="text-xs text-gray-400 mt-1 italic">{reg.notes}</p>
            )}
          </div>
        </div>
        {reg.is_guest &&
          reg.payment_method === "cash" &&
          totalAmount != null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareGuestReceipt(reg, hostName, groupedGuestsForReceipt);
              }}
              disabled={sharingReceiptId === reg.id}
              title="Chia sẻ biên lai"
              className={`flex md:hidden absolute ${isNested ? "top-2 right-2" : "top-3 right-3"} items-center gap-1 px-2.5 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 z-10`}
            >
              {sharingReceiptId === reg.id ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Share2 className="w-3 h-3 text-white" />
              )}
              <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                Chia sẻ
              </span>
            </button>
          )}
      </div>
    );
  };

  const renderRow = (reg: any, isNested = false, hostName?: string) => {
    const canReviewPayment = getCanReviewPayment(reg);
    const showActions =
      reg.participation_status === "pending_approval" ||
      reg.participation_status === "awaiting_checkin" ||
      isAwaitingFinish(reg) ||
      (reg.payment_status === "pending" && canReviewPayment);

    return (
      <div key={reg.id}>
        {isDesktop ? (
          <div>
            {renderRowContent(reg, isNested, hostName)}
            {showActions && (
              <div
                className={`flex justify-end gap-2 border-t border-gray-100 py-2.5 ${isNested ? "pl-9 pr-3" : "px-4"
                  }`}
              >
                <DesktopRowActions reg={reg} />
              </div>
            )}
          </div>
        ) : (
          <SwipeableRow
            disabled={!showActions}
            actions={<RowActions reg={reg} />}
          >
            {renderRowContent(reg, isNested, hostName)}
          </SwipeableRow>
        )}

        {showReject === reg.id && (
          <div className={`${isNested ? "pl-9 pr-4" : "px-4"} pb-3 flex gap-2`}>
            <input
              type="text"
              value={rejectNotes[reg.id] ?? ""}
              onChange={(e) =>
                setRejectNotes((n) => ({ ...n, [reg.id]: e.target.value }))
              }
              className="input-field text-sm flex-1"
              placeholder="Lý do từ chối (tuỳ chọn)"
            />
            <MorphButton
              phase={getPhase(`${reg.id}:rejectConfirm`)}
              idleIcon={null}
              label="Xác nhận từ chối"
              idleWidthClass="w-40"
              colorClass="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => handleReject(reg.id)}
              disabled={actionId === reg.id}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes morphTickPop {
            0%   { transform: scale(0); opacity: 0; }
            60%  { transform: scale(1.25); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        .morph-tick {
            animation: morphTickPop 0.3s ease-out;
        }

        @keyframes badgePop {
            0%   { transform: scale(0.7) translateY(-4px); opacity: 0; }
            60%  { transform: scale(1.05) translateY(0); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        .badge-pop {
            animation: badgePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pendingRowPulse {
            0%, 100% { background-color: rgba(253, 224, 71, 0.05); }
            50%      { background-color: rgba(253, 224, 71, 0.4); }
        }
        .pending-row-pulse {
            animation: pendingRowPulse 1.6s ease-in-out infinite;
        }
        @keyframes pendingReviewRowPulse {
            0%, 100% { background-color: rgba(59, 130, 246, 0.05); }
            50%      { background-color: rgba(59, 130, 246, 0.35); }
        }
        .pending-review-row-pulse {
            animation: pendingReviewRowPulse 1.6s ease-in-out infinite;
        }
        .confirmed-row-tint {
            background-color: rgba(34, 197, 94, 0.12);
        }
      `}</style>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin/sessions")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex-1 min-w-0">
            {session.title}
          </h1>

          <button
            onClick={handleManualRefresh}
            disabled={manualRefreshing}
            title="Tải lại dữ liệu"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <RotateCcw
              className={`w-5 h-5 text-gray-500 ${manualRefreshing ? "animate-spin" : ""}`}
            />
          </button>

          {canAddMember &&
            (awaitingCheckin.length > 0 || pendingApproval.length > 0) && (
              <span className="flex-shrink-0 whitespace-nowrap text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                {pendingApproval.length > 0 &&
                  `Còn ${pendingApproval.length} đăng ký chờ duyệt`}
                {pendingApproval.length > 0 &&
                  awaitingCheckin.length > 0 &&
                  ", "}
                {awaitingCheckin.length > 0 &&
                  `${awaitingCheckin.length} người chưa điểm danh`}
              </span>
            )}
        </div>
        {isDesktop ? (
          <div className="flex items-center justify-end gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {awaitingCheckin.length > 0 && (
              <MorphButton
                phase={getPhase("checkinAll")}
                idleIcon={<UserCheck className="w-4 h-4" />}
                label={`All (${awaitingCheckin.length})`}
                idleWidthClass="w-22"
                colorClass="bg-green-500 hover:bg-green-600 text-white"
                successClassName="bg-green-500 text-white"
                onClick={handleCheckinAllPresent}
                disabled={closingList}
              />
            )}

            {awaitingCheckin.length > 0 && (
              <MorphButton
                phase={getPhase("closeList")}
                idleIcon={<UserX className="w-4 h-4" />}
                label={`Chốt (${awaitingCheckin.length} vắng)`}
                idleWidthClass="w-36"
                colorClass="bg-red-500 hover:bg-red-600 text-white"
                successClassName="bg-red-500 text-white"
                onClick={handleCloseList}
                disabled={checkingInAll}
              />
            )}

            {canFinishSession &&
              awaitingCheckin.length === 0 &&
              pendingApproval.length === 0 &&
              registrations.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (finishing) return;
                    setFinishing(true);
                    startNavLoading();
                    setTimeout(() => {
                      const doNavigate = () =>
                        router.push(`/admin/sessions/${id}/finish`);
                      if (
                        typeof document !== "undefined" &&
                        (document as any).startViewTransition
                      ) {
                        (document as any).startViewTransition(doNavigate);
                      } else {
                        doNavigate();
                      }
                    }, 750);
                  }}
                  disabled={finishing}
                  className={`flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white bg-green-500 hover:bg-green-600 shadow-sm active:scale-95 overflow-hidden ${finishing
                    ? "w-9 h-9 rounded-full gap-0 p-0"
                    : "w-auto h-9 gap-1.5 px-3 rounded-lg"
                    }`}
                  style={{
                    transitionProperty: "width, height, border-radius, padding, gap",
                    transitionDuration: "550ms",
                    transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
                  }}
                >
                  {finishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" /> Kết thúc
                    </>
                  )}
                </button>
              )}

            {(session.status === "open" || session.status === "full") && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold flex-shrink-0 disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Hủy buổi
              </button>
            )}

            {session.status === "cancelled" && (
              <button
                onClick={handleReopenSession}
                disabled={reopening}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-semibold flex-shrink-0 disabled:opacity-50"
              >
                {reopening ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Mở lại
              </button>
            )}

            {(session.status === "waiting_payment" ||
              session.status === "completed") && (
                <button
                  onClick={() => setShowRollbackModal(true)}
                  disabled={rollingBack}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-semibold disabled:opacity-50 flex-shrink-0"
                >
                  {rollingBack ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Hoàn tác
                </button>
              )}

            {canComplete && (
              <MorphButton
                phase={getPhase("completeSession")}
                idleIcon={<CheckCircle2 className="w-4 h-4" />}
                label="Hoàn thành"
                idleWidthClass="w-32"
                colorClass="bg-emerald-500 hover:bg-emerald-600 text-white"
                successClassName="bg-emerald-500 text-white"
                onClick={handleCompleteSession}
                disabled={completingSession}
              />
            )}

            {canAddMember && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Thêm thành viên
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-6">
            {awaitingCheckin.length > 0 && (
              <CompactActionButton
                icon={<UserCheck className="w-4 h-4" />}
                label="Điểm danh tất cả"
                badge={awaitingCheckin.length}
                colorClass="bg-emerald-500"
                onClick={handleCheckinAllPresent}
                disabled={closingList || getPhase("checkinAll") === "loading"}
                loading={getPhase("checkinAll") === "loading"}
              />
            )}

            {awaitingCheckin.length > 0 && (
              <CompactActionButton
                icon={<UserX className="w-4 h-4" />}
                label="Chốt danh sách"
                badge={awaitingCheckin.length}
                colorClass="bg-rose-500"
                onClick={handleCloseList}
                disabled={checkingInAll || getPhase("closeList") === "loading"}
                loading={getPhase("closeList") === "loading"}
              />
            )}

            {canFinishSession &&
              awaitingCheckin.length === 0 &&
              pendingApproval.length === 0 &&
              registrations.length > 0 && (
                <CompactActionButton
                  icon={<Calculator className="w-4 h-4" />}
                  label="Kết thúc"
                  colorClass="bg-teal-500"
                  onClick={() => {
                    if (finishing) return;
                    setFinishing(true);
                    startNavLoading();
                    setTimeout(() => {
                      router.push(`/admin/sessions/${id}/finish`);
                    }, 300);
                  }}
                  disabled={finishing}
                  loading={finishing}
                />
              )}

            {(session.status === "open" || session.status === "full") && (
              <CompactActionButton
                icon={<XCircle className="w-4 h-4" />}
                label="Huỷ buổi"
                colorClass="bg-orange-500"
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                loading={cancelling}
              />
            )}

            {session.status === "cancelled" && (
              <CompactActionButton
                icon={<RotateCcw className="w-4 h-4" />}
                label="Mở lại"
                colorClass="bg-sky-500"
                onClick={handleReopenSession}
                disabled={reopening}
                loading={reopening}
              />
            )}

            {(session.status === "waiting_payment" ||
              session.status === "completed") && (
                <CompactActionButton
                  icon={<RotateCcw className="w-4 h-4" />}
                  label="Hoàn tác"
                  colorClass="bg-amber-500"
                  onClick={() => setShowRollbackModal(true)}
                  disabled={rollingBack}
                  loading={rollingBack}
                />
              )}

            {canComplete && (
              <CompactActionButton
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Hoàn thành"
                colorClass="bg-green-500"
                onClick={handleCompleteSession}
                disabled={completingSession}
                loading={completingSession}
              />
            )}

            {canAddMember && (
              <CompactActionButton
                icon={<UserPlus className="w-4 h-4" />}
                label="Thêm thành viên"
                colorClass="bg-blue-500"
                onClick={() => setShowAddModal(true)}
              />
            )}
          </div>
        )}

        <div className="card grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4 p-5 text-sm shadow-md">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Thời gian</span>
            <div className="flex items-center gap-1 font-medium text-gray-800">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              {format(new Date(session.scheduled_at), "dd/MM HH:mm", {
                locale: vi,
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Thời lượng</span>
            <div className="flex items-center gap-1 font-medium text-gray-800">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {session.duration_minutes} phút
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Địa điểm</span>
            <div className="flex items-center gap-1 font-medium text-gray-800 truncate">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{session.location || "—"}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 text-xs">Chỗ trống</span>
            <div className="flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span
                className={
                  session.available_slots <= 0
                    ? "text-red-500"
                    : "text-gray-800"
                }
              >
                {session.available_slots}/{session.max_slots}
              </span>
            </div>
          </div>
        </div>

        {hasCostData && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)] overflow-hidden">
            <SessionCostCard sessionId={id!} />
          </div>
        )}


        <SessionPenaltiesCard sessionId={id!} />

        {manualRefreshing ? (
          <>
            <div className="flex gap-3 flex-wrap">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-7 w-28 rounded-full bg-gray-200 animate-pulse"
                />
              ))}
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)] overflow-hidden p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                      <div className="h-3 w-1/4 rounded bg-gray-200 animate-pulse" />
                      <div className="h-5 w-24 rounded-full bg-gray-200 animate-pulse mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-3 flex-wrap">
              {[
                {
                  label: "Chờ duyệt",
                  count: pendingApproval.length,
                  cls: "bg-orange-50 text-orange-600 border border-orange-200",
                },
                {
                  label: "Chờ điểm danh",
                  count: awaitingCheckin.length,
                  cls: "bg-slate-50 text-slate-600 border border-slate-200",
                },
                {
                  label: "Chờ buổi đánh kết thúc",
                  count: awaitingFinish.length,
                  cls: "bg-slate-50 text-slate-600 border border-slate-200",
                },
                {
                  label: "Chờ thanh toán",
                  count: pending.length,
                  cls: "bg-amber-50 text-amber-700 border border-amber-200",
                },
                {
                  label: "Chờ chốt thanh toán",
                  count: pendingReview.length + walletPendingConfirm.length,
                  cls: "bg-blue-50 text-blue-700 border border-blue-200",
                },
                {
                  label: "Đã xác nhận thanh toán",
                  count: confirmed.length,
                  cls: "bg-green-50 text-green-700 border border-green-200",
                },
                {
                  label: "Thanh toán bị từ chối",
                  count: rejected.length,
                  cls: "bg-red-50 text-red-600 border border-red-200",
                },
              ]
                .filter(({ count }) => count > 0)
                .map(({ label, count, cls }) => (
                  <span
                    key={label}
                    className={`badge-pop px-3 py-1 rounded-full text-sm font-medium ${cls}`}
                  >
                    {label}: {count}
                  </span>
                ))}
            </div>

            <div>
              {registrations.length === 0 ? (
                <div className="card py-12 text-center text-gray-400 shadow-md">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Chưa có ai đăng ký buổi này</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {hostRegs.map((host) => {
                    const guests = guestsOf(host.id);
                    const groupTotal =
                      guests.length > 0
                        ? (host.amount_override ?? 0) +
                        guests.reduce((s, g) => s + (g.amount_override ?? 0), 0)
                        : null;
                    const groupedGuestsForHost = guests.filter(
                      (g) => g.payment_method === "grouped_with_host",
                    );
                    const hostDisplayName =
                      host.users?.full_name ?? host.guest_full_name ?? "?";
                    const isExpanded = expandedHosts.has(host.id);
                    const hostCanReview = getCanReviewPayment(host);
                    const showHostActions =
                      host.participation_status === "pending_approval" ||
                      host.participation_status === "awaiting_checkin" ||
                      isAwaitingFinish(host) ||
                      (host.payment_status === "pending" && hostCanReview);

                    const hostExtras = (
                      <>
                        {guests.length > 0 && (
                          <>
                            <button
                              onClick={() => toggleHostGuests(host.id)}
                              className="w-full flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-blue-50/50 hover:bg-blue-50 active:bg-blue-100 transition-colors group"
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {guests.length}
                                </span>
                                <span className="text-sm font-semibold text-blue-700">
                                  {isExpanded ? "Ẩn" : "Hiện"} người đi cùng
                                </span>
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-blue-500 transition-transform duration-300 flex-shrink-0 ${isExpanded ? "rotate-180" : ""
                                  }`}
                              />
                            </button>

                            <div
                              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                              style={{
                                gridTemplateRows: isExpanded ? "1fr" : "0fr",
                              }}
                            >
                              <div className="overflow-hidden">
                                <div
                                  className="bg-gray-50/70 divide-y divide-gray-100 border-t border-gray-100 transition-opacity duration-300"
                                  style={{ opacity: isExpanded ? 1 : 0 }}
                                >
                                  {guests.map((g) =>
                                    renderRow(
                                      g,
                                      true,
                                      host.users?.full_name ?? host.guest_full_name ?? "người đứng tên",
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {groupTotal !== null && (
                          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
                            <span className="text-xs font-semibold text-gray-500">
                              Tổng cộng
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatVnd(groupTotal)}
                            </span>
                          </div>
                        )}
                      </>
                    );

                    return (
                      <div
                        key={host.id}
                        className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)] overflow-hidden"
                      >
                        {isDesktop ? (
                          <div>
                            {renderRowContent(host, false, hostDisplayName, groupedGuestsForHost)}
                            {showHostActions && (
                              <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-2.5">
                                <DesktopRowActions reg={host} />
                              </div>
                            )}
                            {hostExtras}
                          </div>
                        ) : (
                          <SwipeableRow
                            disabled={!showHostActions}
                            actions={<RowActions reg={host} />}
                          >
                            <div>
                              {renderRowContent(host, false, hostDisplayName, groupedGuestsForHost)}
                              {hostExtras}
                            </div>
                          </SwipeableRow>
                        )}

                        {showReject === host.id && (
                          <div className="px-4 pb-3 flex gap-2">
                            <input
                              type="text"
                              value={rejectNotes[host.id] ?? ""}
                              onChange={(e) =>
                                setRejectNotes((n) => ({
                                  ...n,
                                  [host.id]: e.target.value,
                                }))
                              }
                              className="input-field text-sm flex-1"
                              placeholder="Lý do từ chối (tuỳ chọn)"
                            />
                            <MorphButton
                              phase={getPhase(`${host.id}:rejectConfirm`)}
                              idleIcon={null}
                              label="Xác nhận từ chối"
                              idleWidthClass="w-40"
                              colorClass="bg-red-500 hover:bg-red-600 text-white"
                              onClick={() => handleReject(host.id)}
                              disabled={actionId === host.id}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {viewingBillUrl &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setViewingBillUrl(null)}
            >
              <div
                className="relative max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setViewingBillUrl(null)}
                  className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
                  title="Đóng"
                >
                  <XCircle className="w-7 h-7" />
                </button>
                <img
                  src={viewingBillUrl}
                  alt="Ảnh bill chuyển khoản"
                  className="w-full max-h-[80vh] object-contain rounded-xl bg-white"
                />
              </div>
            </div>,
            document.body,
          )}

        {/* ── Add member modal ── */}
        {showAddModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: addModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl"
                style={{
                  transform: addModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: addModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">
                    Thêm thành viên vào buổi
                  </h3>
                  <button
                    onClick={closeAddModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1 px-5 pt-3">
                  {[
                    ["account", "Có tài khoản"],
                    ["guest", "Khách không tài khoản"],
                  ].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setAddTab(val as any)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${addTab === val ? "bg-blue-50 text-blue-600" : "text-gray-400"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-4">
                  {addTab === "account" ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"
                            >
                              {m.full_name}
                              <button
                                onClick={() =>
                                  setSelectedMembers((prev) =>
                                    prev.filter((x) => x.id !== m.id),
                                  )
                                }
                                className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="max-h-72 overflow-y-auto -mx-1 border border-gray-100 rounded-xl">
                        {searching ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Đang tìm...
                          </p>
                        ) : searchResults.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Không tìm thấy thành viên
                          </p>
                        ) : (
                          <ul className="divide-y divide-gray-50">
                            {searchResults.map((m) => {
                              const isSelected = selectedMembers.some(
                                (x) => x.id === m.id,
                              );
                              return (
                                <li key={m.id}>
                                  <button
                                    onClick={() => {
                                      setSelectedMembers((prev) =>
                                        isSelected
                                          ? prev.filter((x) => x.id !== m.id)
                                          : [...prev, m],
                                      );
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isSelected
                                      ? "bg-blue-50"
                                      : "hover:bg-gray-50"
                                      }`}
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-gray-300"
                                        }`}
                                    >
                                      {isSelected && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      )}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                                        <span className="text-xs font-semibold text-blue-700">
                                          {m.full_name?.[0]?.toUpperCase() ??
                                            "?"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {m.full_name}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {m.phone}
                                      </p>
                                    </div>
                                    <span
                                      className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${m.member_type === "co_dinh"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                        }`}
                                    >
                                      {m.member_type === "co_dinh"
                                        ? "Thành viên"
                                        : "Vãng lai"}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                        ⓘ Đã chọn {selectedMembers.length} thành viên. Mỗi người
                        sẽ nhận được thông báo đã được thêm vào buổi. Thanh toán
                        sau khi buổi kết thúc.
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          <p className="text-[11px] text-amber-600 mt-1">
                            ⚠️ Bạn đang chọn nhiều thành viên cùng lúc + chọn
                            "đi cùng host" — tất cả {selectedMembers.length}{" "}
                            người sẽ được gắn vào cùng 1 host này.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Họ tên *
                        </label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Giới tính
                          </label>
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
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trình độ
                          </label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email (không bắt buộc, để gửi hóa đơn)
                        </label>
                        <input
                          type="email"
                          value={guestForm.email}
                          onChange={(e) =>
                            setGuestForm((f) => ({ ...f, email: e.target.value }))
                          }
                          className="input-field"
                          placeholder="vidu@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Đi cùng (tuỳ chọn)
                        </label>
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
                              label: r.users?.full_name ?? r.guest_full_name ?? "?",
                            }))}
                        />

                        {hostRegId && (
                          <>
                            <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={guestPaySeparately}
                                onChange={(e) => setGuestPaySeparately(e.target.checked)}
                                className="rounded"
                              />
                              Thanh toán riêng (không gộp với người đi cùng)
                            </label>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {guestPaySeparately
                                ? "Khách này sẽ tự thanh toán tiền mặt riêng, nhận hóa đơn riêng qua email."
                                : "Mặc định: người đi cùng trả hộ, hóa đơn sẽ gộp gửi về người đi cùng."}
                            </p>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ghi chú (tuỳ chọn)
                        </label>
                        <input
                          value={addNotes}
                          onChange={(e) => setAddNotes(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={closeAddModal}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={
                      adding ||
                      (addTab === "account"
                        ? selectedMembers.length === 0 ||
                        selectedMembers.length > (session.available_slots ?? 0)
                        : !guestForm.full_name.trim() || (session.available_slots ?? 0) < 1)
                    }
                    className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                      flex items-center justify-center gap-2 flex-shrink-0
                      disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                    Thêm vào buổi
                    {addTab === "account" && selectedMembers.length > 1
                      ? ` (${selectedMembers.length})`
                      : ""}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}


        {selectedMembers.length > (session.available_slots ?? 0) && (
          <p className="text-[11px] text-red-600 mt-1">
            ⚠️ Bạn đang chọn {selectedMembers.length} người nhưng buổi chỉ còn{" "}
            {session.available_slots ?? 0} chỗ trống.
          </p>
        )}

        {confirmModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: confirmModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeConfirmModal}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl"
                style={{
                  transform: confirmModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: confirmModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${confirmModal.key === "closeList"
                        ? "bg-red-50"
                        : confirmModal.key === "completeSession"
                          ? "bg-emerald-50"
                          : "bg-green-50"
                        }`}
                    >
                      {confirmModal.key === "closeList" ? (
                        <UserX className="w-4 h-4 text-red-500" />
                      ) : confirmModal.key === "completeSession" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900">
                      {confirmModal.title}
                    </h3>
                  </div>
                  <button
                    onClick={closeConfirmModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 text-sm text-gray-500">
                  {confirmModal.message}
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={closeConfirmModal}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() =>
                      confirmModal.key === "closeList"
                        ? runCloseList()
                        : confirmModal.key === "completeSession"
                          ? runCompleteSession()
                          : runCheckinAllPresent()
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${confirmModal.key === "closeList"
                      ? "bg-red-500 hover:bg-red-600"
                      : confirmModal.key === "completeSession"
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-green-500 hover:bg-green-600"
                      }`}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {showRollbackModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: rollbackModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeRollbackModal}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl"
                style={{
                  transform: rollbackModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: rollbackModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-4 h-4 text-orange-500" />
                    </div>
                    <h3 className="font-bold text-gray-900">
                      Hoàn tác hóa đơn?
                    </h3>
                  </div>
                  <button
                    onClick={closeRollbackModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm text-gray-500">
                    Hoàn tác hóa đơn đã gửi cho buổi{" "}
                    <strong className="text-gray-700">{session.title}</strong>?
                  </p>

                  {(() => {
                    const preview = getRollbackRefundPreview();
                    if (preview.length === 0) return null;
                    const total = preview.reduce((s, p) => s + p.amount, 0);
                    return (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-700">
                          Tiền sẽ hoàn về ví ({preview.length} người)
                        </p>
                        <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {preview.map((p) => (
                            <li
                              key={p.user_id}
                              className="flex items-center justify-between text-xs text-gray-600"
                            >
                              <span>{p.full_name}</span>
                              <span className="font-semibold text-blue-700">
                                {formatVnd(p.amount)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center justify-between border-t border-blue-100 pt-1.5">
                          <span className="text-xs font-semibold text-gray-700">
                            Tổng hoàn
                          </span>
                          <span className="text-sm font-bold text-blue-700">
                            {formatVnd(total)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <Wallet className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>
                        Tiền đã trừ ví sẽ được <strong>hoàn lại</strong> và ghi
                        vào lịch sử ví.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tất cả</strong> xác nhận thanh toán (kể cả tiền
                        mặt/chuyển khoản admin đã xác nhận thủ công) sẽ bị huỷ,
                        member sẽ nhận thông báo.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600">
                      <Calculator className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>
                        Buổi sẽ mở lại để bạn chỉnh sửa chi phí và gửi hóa đơn
                        mới.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={closeRollbackModal}
                    className="btn-secondary text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmRollback}
                    disabled={rollingBack || checkingPenalties}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {(rollingBack || checkingPenalties) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Xác nhận hoàn tác
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {showPenaltyRefundModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: penaltyRefundModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closePenaltyRefundModal}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl"
                style={{
                  transform: penaltyRefundModalVisible
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(8px)",
                  opacity: penaltyRefundModalVisible ? 1 : 0,
                  transition:
                    "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="font-bold text-gray-900">Hoàn luôn tiền phạt?</h3>
                  </div>
                  <button
                    onClick={closePenaltyRefundModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-sm text-gray-500">
                    Buổi này có <strong>{penaltiesToRefund.length}</strong> khoản phạt
                    đã được trừ thẳng vào ví. Bạn có muốn hoàn lại các khoản này luôn
                    không?
                  </p>
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 rounded-xl border border-gray-100 p-2">
                    {penaltiesToRefund.map((p: any) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between text-xs text-gray-600 px-1 py-1"
                      >
                        <span className="truncate">
                          {p.users?.full_name}{" "}
                          <span className="text-gray-400">— {p.reason}</span>
                        </span>
                        <span className="font-semibold text-red-500 flex-shrink-0 ml-2">
                          {formatVnd(p.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-gray-700">
                      Tổng cộng
                    </span>
                    <span className="text-sm font-bold text-red-500">
                      {formatVnd(
                        penaltiesToRefund.reduce((s, p) => s + Number(p.amount), 0),
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={() => handleRollbackFinish(true)}
                    disabled={rollingBack}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {rollingBack && <Loader2 className="w-4 h-4 animate-spin" />}
                    Hoàn luôn tiền phạt
                  </button>
                  <button
                    onClick={() => handleRollbackFinish(false)}
                    disabled={rollingBack}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Không hoàn tiền phạt
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {showCancelModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: cancelModalVisible ? 1 : 0,
                transition: "opacity 200ms ease-out",
              }}
              onClick={closeCancelModal}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
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
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="font-bold text-gray-900">Hủy buổi đánh?</h3>
                  </div>
                  <button
                    onClick={closeCancelModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5">
                  <p className="text-sm text-gray-500">
                    Hủy buổi{" "}
                    <strong className="text-gray-700">"{session.title}"</strong>
                    ? Buổi chưa có ai đăng ký nên có thể hủy an toàn. Bạn có thể
                    mở lại sau nếu cần.
                  </p>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={closeCancelModal}
                    className="btn-secondary text-sm"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={cancelling}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                    Xác nhận hủy buổi
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
}

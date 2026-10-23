"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  Hourglass,
  AlertCircle,
  Copy,
  Loader2,
  XCircle,
  X as XIcon,
  UserPlus,
  Wallet,
  Download,
  Heart,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { MorphButton } from "@/components/effect-button/MorphButton";
import { buildTransferNote } from "@/hooks/payment-ref";
import { useAuthStore } from "@/store/auth.store";
import { createPortal } from "react-dom";
import { useNotificationsRealtimeStore } from "@/store/notifications-realtime.store";
import { walletApi, sessionsApi, registrationsApi, usersApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import DebtWarningModal from "./DebtWarningModal";
import {
  BADGE_BASE,
  BADGE_TONE,
  GENDER_META,
  GenderCounts,
  countGender,
} from "@/components/member/badges";

type ActionPhase = "idle" | "loading" | "success";

const SKILL_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "yeu", label: "Yếu" },
  { value: "trung_binh_yeu", label: "TB yếu" },
  { value: "trung_binh", label: "TB" },
  { value: "trung_binh_cong", label: "TB+" },
  { value: "ban_chuyen", label: "Bán chuyên" },
  { value: "chuyen_nghiep", label: "Chuyên nghiệp" },
];

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

function noteLines(note?: string | null): string[] {
  return note
    ? note.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];
}

function getPaymentMethodBadge(reg: any, hostName?: string, ownName?: string) {
  const m = reg.payment_method;
  const isGroupedGuest = Boolean(reg.host_registration_id);

  if (m === "wallet_grouped" && isGroupedGuest) {
    return {
      label: hostName ? `Ví BNB của ${hostName}` : "Ví BNB",
      icon: <Wallet className="w-2.5 h-2.5" />,
      cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
    };
  }
  if (m === "wallet" && isGroupedGuest) {
    return {
      label: ownName ? `Ví BNB của ${ownName}` : "Ví BNB",
      icon: <Wallet className="w-2.5 h-2.5" />,
      cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
    };
  }
  if (m === "wallet" || m === "wallet_grouped") {
    return {
      label: "Ví BNB",
      icon: <Wallet className="w-2.5 h-2.5" />,
      cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
    };
  }
  if (m === "grouped_with_host") {
    return {
      label: hostName ? `Chuyển khoản (gộp ${hostName})` : "Chuyển khoản",
      icon: <span>🏦</span>,
      cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
    };
  }
  if (m === "cash") {
    return {
      label: "Tiền mặt",
      icon: <span>💵</span>,
      cls: "bg-[var(--success-soft)] text-[var(--success)]",
    };
  }
  if (reg.payment_reference) {
    return {
      label: "Chuyển khoản",
      icon: <span>🏦</span>,
      cls: "bg-[var(--primary-soft)] text-[var(--primary)]",
    };
  }
  return null;
}

function WalletGuestConfirmModal({
  hostRegistrationId,
  guestNames,
  guestTotal,
  deadline,
  onClose,
  onDone,
}: {
  hostRegistrationId: string;
  guestNames: string;
  guestTotal: number;
  deadline: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (mode: "grouped" | "separate") => {
    setSubmitting(true);
    try {
      await walletApi.confirmGuestPayment(hostRegistrationId, mode);
      toast.success(
        mode === "grouped"
          ? `Đã trừ ví ${fmt(guestTotal)} cho khách đi cùng`
          : "Khách đi cùng sẽ tự thanh toán tiền mặt",
      );
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const deadlineDate = new Date(deadline);
  const hoursLeft = Math.max(
    0,
    Math.floor((deadlineDate.getTime() - Date.now()) / 3600000),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-end"
      style={{ background: "var(--overlay)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full bg-[var(--surface)] rounded-t-2xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div>
            <p className="text-sm font-bold text-[var(--text)]">
              Xác nhận thanh toán khách đi cùng
            </p>
            <p className="text-xs text-[var(--warning)] mt-0.5">
              ⏱ Còn {hoursLeft}h để xác nhận — sau đó sẽ tự động gộp vào ví
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Info */}
          <div className="bg-[var(--primary-soft)] rounded-xl px-4 py-3 flex items-start gap-3">
            <Wallet className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                Phần của bạn đã được trừ ví
              </p>
              <p className="text-xs text-[var(--primary)] mt-0.5">
                Khách đi cùng ({guestNames}) cần thanh toán{" "}
                <strong>{fmt(guestTotal)}</strong>. Bạn muốn gộp chung vào ví
                không?
              </p>
            </div>
          </div>

          <button
            onClick={() => handleConfirm("grouped")}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] active:scale-[0.99] transition-all text-left disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">
                Trừ thêm vào ví của tôi
              </p>
              <p className="text-lg font-black text-[var(--primary)]">
                {fmt(guestTotal)}
              </p>
              <p className="text-xs text-[var(--text-faint)] mt-0.5">
                Gộp tiền cho {guestNames} vào ví BNB của bạn
              </p>
            </div>
            {submitting && (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--primary)] flex-shrink-0" />
            )}
          </button>

          <button
            onClick={() => handleConfirm("separate")}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-soft)] active:scale-[0.99] transition-all text-left disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center flex-shrink-0 text-xl">
              💵
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text)]">
                Khách tự thanh toán tiền mặt
              </p>
              <p className="text-xs text-[var(--text-faint)] mt-0.5">
                {guestNames} sẽ nộp tiền mặt trực tiếp cho admin
              </p>
            </div>
          </button>

          <p className="text-xs text-[var(--text-faint)] text-center">
            Nếu không xác nhận trước{" "}
            {format(deadlineDate, "HH:mm dd/MM", { locale: vi })}, hệ thống sẽ
            tự động trừ ví gộp chung.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InfoTile({
  icon: Icon,
  tone,
  label,
  className = "",
  children,
}: {
  icon: any;
  tone: "primary" | "purple" | "pink";
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-2.5 ${className}`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `var(--${tone}-soft)` }}
      >
        <Icon className="w-4 h-4" style={{ color: `var(--${tone})` }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-faint)]">
          {label}
        </p>
        <p className="text-sm font-semibold text-[var(--text)] truncate">{children}</p>
      </div>
    </div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [registerPhase, setRegisterPhase] = useState<ActionPhase>("idle");
  const [interestedPhase, setInterestedPhase] = useState<ActionPhase>("idle");
  const [cancelPhase, setCancelPhase] = useState<ActionPhase>("idle");
  const [payType, setPayType] = useState<"solo" | "grouped" | null>(null);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [guestTab, setGuestTab] = useState<"account" | "guest">("account");
  const [guestForm, setGuestForm] = useState({
    full_name: "",
    gender: "male",
    skill_level: "",
    email: "",
  });
  const [addingGuest, setAddingGuest] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState<any>(null);

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "choose" | "transfer" | "cash" | "wallet"
  >("choose");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [sendingCash, setSendingCash] = useState(false);

  const [guestConfirmSubmitting, setGuestConfirmSubmitting] = useState<
    "grouped" | "separate" | null
  >(null);

  const [showAllRegsModal, setShowAllRegsModal] = useState(false);
  const [allRegsModalVisible, setAllRegsModalVisible] = useState(false);

  const [guestConfirmPayload, setGuestConfirmPayload] = useState<{
    hostRegistrationId: string;
    guestNames: string;
    guestTotal: number;
    deadline: string;
  } | null>(null);

  const [showAmountsModal, setShowAmountsModal] = useState(false);
  const [amountsModalVisible, setAmountsModalVisible] = useState(false);

  const [costDetail, setCostDetail] = useState<any>(null);

  const [respondPhase, setRespondPhase] = useState<"idle" | "accept" | "decline">("idle");

  const [debtWarning, setDebtWarning] = useState<number | null>(null);

  const fetchCostDetail = async () => {
    try {
      const { data } = await sessionsApi.getCostDetail(id);
      setCostDetail(data);
    } catch {
      setCostDetail(null);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchRegistrations();
    fetchCostDetail();
  }, [id]);

  useEffect(() => {
    if (showGuestModal) {
      const raf = requestAnimationFrame(() => setGuestModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [showGuestModal]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowLoading(false), 400);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchSession = async () => {
    try {
      const { data } = await sessionsApi.get(id);
      setSession(data);
      setInterestedPhase(data.is_interested ? "success" : "idle");
    } finally {
      setLoading(false);
    }
  };

  const handleInlineGuestConfirm = async (mode: "grouped" | "separate") => {
    if (!myReg?.id) return;
    setGuestConfirmSubmitting(mode);
    try {
      await walletApi.confirmGuestPayment(myReg.id, mode);
      toast.success(
        mode === "grouped"
          ? "Đã trừ ví cho khách đi cùng"
          : "Khách đi cùng sẽ tự thanh toán tiền mặt",
      );
      if (mode === "grouped") {
        router.push(`/sessions/${id}/bill?method=wallet`);
      } else {
        fetchSession();
        fetchRegistrations();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Có lỗi xảy ra");
    } finally {
      setGuestConfirmSubmitting(null);
    }
  };

  const fetchRegistrations = async () => {
    setLoadingRegs(true);
    try {
      const { data } = await registrationsApi.listBySession(id);
      setRegistrations(data.data ?? []);
    } finally {
      setLoadingRegs(false);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchRegistrations();
  }, [id]);

  useEffect(() => {
    if (!showGuestModal || guestTab !== "account") return;
    const t = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data } = await usersApi.searchMembers(memberSearch.trim());
        setMemberSearchResults(data ?? []);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, showGuestModal, guestTab]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`session:${id}`)
      .on("broadcast", { event: "session_updated" }, () => {
        fetchSession();
        fetchRegistrations();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "registrations",
          filter: `session_id=eq.${id}`,
        },
        () => {
          fetchSession();
          fetchRegistrations();
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
        () => {
          fetchSession();
          fetchRegistrations();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const lastNotification = useNotificationsRealtimeStore(
    (s) => s.lastNotification,
  );

  useEffect(() => {
    const payload = lastNotification;
    if (!payload) return;

    const isGuestConfirmType =
      payload?.type === "wallet_guest_confirm" ||
      payload?.data?.type === "wallet_guest_confirm";
    if (!isGuestConfirmType) return;

    const data = payload?.data ?? payload;

    if (data.session_id && String(data.session_id) !== String(id)) return;

    const currentMyReg = session?.my_registration;

    if (!currentMyReg || currentMyReg.id !== data.host_registration_id) return;
    if (currentMyReg.payment_method !== "wallet_pending_confirm") return;

    setGuestConfirmPayload({
      hostRegistrationId: data.host_registration_id,
      guestNames: data.guest_names,
      guestTotal: data.guest_total,
      deadline: data.deadline,
    });
  }, [lastNotification, session, id]);

  const handleRegister = async () => {
    setRegisterPhase("loading");
    try {
      const { data } = await registrationsApi.register({ session_id: id });
      setRegisterPhase("success");
      toast.success("Đăng ký thành công! Vui lòng chờ admin điểm danh.");
      setTimeout(() => {
        setSession((prev: any) => ({
          ...prev,
          my_registration: data.registration,
          available_slots: prev.available_slots - 1,
        }));
        fetchRegistrations();
        setRegisterPhase("idle");
      }, 700);
    } catch (err: any) {
      setRegisterPhase("idle");
      const data = err?.response?.data;
      if (data?.code === "WALLET_DEBT_BLOCK") {
        setDebtWarning(Number(data.debt) || 0);
      } else {
        toast.error(data?.message ?? "Đăng ký thất bại");
      }
    }
  };

  const handleMarkInterested = async () => {
    setInterestedPhase("loading");
    try {
      await sessionsApi.markInterested(id);
      setInterestedPhase("success");
      toast.success("Đã gửi lời chúc đến mọi người trong buổi!");
    } catch (err: any) {
      setInterestedPhase("idle");
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    }
  };


  const handleRespondAdded = async (action: "accept" | "decline") => {
    if (!myReg?.id) return;
    setRespondPhase(action);
    try {
      await registrationsApi.respond(myReg.id, action);
      toast.success(
        action === "accept"
          ? "Đã xác nhận tham gia buổi đánh"
          : "Đã báo bận, đăng ký của bạn đã được huỷ",
      );
      fetchSession();
      fetchRegistrations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Có lỗi xảy ra");
    } finally {
      setRespondPhase("idle");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Hủy đăng ký buổi này?")) return;
    setCancelPhase("loading");
    try {
      await registrationsApi.cancel(session.my_registration.id);
      setCancelPhase("success");
      toast.success("Đã hủy đăng ký");
      setTimeout(() => {
        fetchSession();
        fetchRegistrations();
        setCancelPhase("idle");
      }, 700);
    } catch (err: any) {
      setCancelPhase("idle");
      toast.error(err?.response?.data?.message ?? "Không thể hủy");
    }
  };

  const openAmountsModal = () => {
    setShowAmountsModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAmountsModalVisible(true));
    });
  };

  const closeAmountsModal = () => {
    setAmountsModalVisible(false);
    setTimeout(() => setShowAmountsModal(false), 200);
  };

  const openAllRegsModal = () => {
    setShowAllRegsModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAllRegsModalVisible(true));
    });
  };

  const closeAllRegsModal = () => {
    setAllRegsModalVisible(false);
    setTimeout(() => setShowAllRegsModal(false), 200);
  };

  const openPayModal = () => {
    setPayType(null);
    setPayMethod("choose");
    setShowPayModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPayModalVisible(true));
    });
  };

  const closePayModal = () => {
    setPayModalVisible(false);
    setTimeout(() => setShowPayModal(false), 300);
  };

  const closeGuestModal = () => {
    setGuestModalVisible(false);
    setTimeout(() => {
      setShowGuestModal(false);
      setGuestForm({ full_name: "", gender: "male", skill_level: "", email: "" });
      setGuestTab("account");
      setMemberSearch("");
      setMemberSearchResults([]);
      setSelectedCompanion(null);
    }, 200);
  };

  const handleAddGuest = async () => {
    if (!myReg?.id) return;

    if (guestTab === "account") {
      if (!selectedCompanion) {
        toast.error("Vui lòng chọn thành viên đi cùng");
        return;
      }
      setAddingGuest(true);
      try {
        await registrationsApi.addGuest(myReg.id, {
          user_id: selectedCompanion.id,
        });
        toast.success(`Đã thêm ${selectedCompanion.full_name} đi cùng bạn`);
        closeGuestModal();
        fetchSession();
        fetchRegistrations();
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Thêm thất bại");
      } finally {
        setAddingGuest(false);
      }
    } else {
      if (!guestForm.full_name.trim()) {
        toast.error("Vui lòng nhập họ tên khách");
        return;
      }
      setAddingGuest(true);
      try {
        await registrationsApi.addGuest(myReg.id, {
          guest_full_name: guestForm.full_name.trim(),
          guest_gender: guestForm.gender,
          guest_skill_level: guestForm.skill_level || undefined,
          guest_email: guestForm.email.trim() || undefined,
        });
        toast.success(`Đã thêm khách ${guestForm.full_name} đi cùng bạn`);
        closeGuestModal();
        fetchSession();
        fetchRegistrations();
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Thêm khách thất bại");
      } finally {
        setAddingGuest(false);
      }
    }
  };

  if (showLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg,#183153 0%,#102744 40%,#10192f 70%,#1a1035 100%)",
          opacity: loading ? 1 : 0,
          transition: "opacity 350ms ease-out",
        }}
      >
        <div className="flex flex-col items-center gap-5">
          <img
            src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png"
            width={164}
            height={164}
            alt="BNB Badminton Club"
            style={{
              objectFit: "contain",
              animation: "bnbLogoPop 1s ease-in-out infinite",
            }}
          />
        </div>

        <style>{`
            @keyframes bnbLogoPop {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.18); }
            }
            @keyframes bnbDotBounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                40% { transform: translateY(-6px); opacity: 1; }
            }
        `}</style>
      </div>
    );
  }

  if (!session)
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center py-20 text-[var(--text-faint)]">
          Không tìm thấy buổi đánh
        </div>
      </div>
    );

  const myReg = session.my_registration;
  const effectiveStatus = session.status;
  const isFull = session.available_slots <= 0;
  const canRegister = session.status === "open" && !isFull && !myReg;

  const myGuests = registrations.filter(
    (r: any) => r.host_registration_id === myReg?.id,
  );
  const guestTotal = myGuests.reduce(
    (sum: number, g: any) => sum + (g.amount_override ?? 0),
    0,
  );
  const soloAmount = myReg?.amount_override ?? 0;
  const groupedAmount = soloAmount + guestTotal;

  const companionName = (g: any) =>
    g.is_guest ? g.guest_full_name : g.users?.full_name;
  const hasMemberCompanion = myGuests.some((g: any) => !g.is_guest);
  const companionLabel = hasMemberCompanion ? "người đi cùng" : "khách đi cùng";

  const totalOtherFeeFromRegs = registrations.reduce(
    (sum: number, r: any) => sum + (r.other_fee_amount ?? 0),
    0,
  );

  const hasPendingGuestWallet = myGuests.some(
    (g: any) => g.payment_method === "wallet_pending_confirm",
  );

  const confirmedParticipants = registrations.filter(
    (r: any) => r.participation_status === "confirmed",
  );
  const allParticipantsPaid =
    confirmedParticipants.length > 0 &&
    confirmedParticipants.every((r: any) => r.payment_status === "confirmed");
  const isAwaitingAdminFinish =
    session.status === "waiting_payment" && allParticipantsPaid;

  const filledSlots = (session.max_slots ?? 0) - (session.available_slots ?? 0);
  const slotRatio = session.max_slots > 0 ? filledSlots / session.max_slots : 0;
  const slotPct = Math.round(Math.min(1, slotRatio) * 100);

  const slotDimmed =
    session.status === "waiting_payment" ||
    session.status === "completed" ||
    session.status === "cancelled";

  const slotBarColor = slotDimmed
    ? "#9ca3af"
    : isFull
      ? "#ef4444"
      : slotRatio >= 0.6
        ? "#f59e0b"
        : "#22c55e";

  const statusPillCls =
    myReg && (effectiveStatus === "open" || effectiveStatus === "full")
      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
      : effectiveStatus === "open"
        ? "bg-[var(--success-soft)] text-[var(--success)]"
        : effectiveStatus === "full"
          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
          : isAwaitingAdminFinish
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : effectiveStatus === "waiting_payment"
              ? "bg-[var(--warning-soft)] text-[var(--warning)]"
              : effectiveStatus === "completed"
                ? "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                : effectiveStatus === "cancelled"
                  ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)]";

  const statusPillLabel =
    myReg && (effectiveStatus === "open" || effectiveStatus === "full")
      ? "Bạn đã đăng ký"
      : effectiveStatus === "open"
        ? "Mở đăng ký"
        : effectiveStatus === "full"
          ? "Đã đầy"
          : isAwaitingAdminFinish
            ? "Chờ admin hoàn thành"
            : effectiveStatus === "waiting_payment"
              ? "Chờ thanh toán"
              : effectiveStatus === "completed"
                ? "Hoàn thành"
                : effectiveStatus === "cancelled"
                  ? "Đã hủy"
                  : effectiveStatus;

  const approvedRegistrations = registrations.filter(
    (r: any) => r.participation_status !== "pending_approval",
  );

  const regRoots = approvedRegistrations.filter(
    (m: any) => !m.host_registration_id,
  );
  const regGuestsOf = (hostId: string) =>
    approvedRegistrations.filter((m: any) => m.host_registration_id === hostId);

  const isCompleted = session.status === "completed";
  const participantList = isCompleted
    ? registrations.filter((r: any) => r.participation_status === "confirmed")
    : approvedRegistrations;
  const participantGender = countGender(participantList);
  const registeredGender = countGender(approvedRegistrations);

  const renderRegPerson = (m: any, opts?: { nested?: boolean }) => {
    const nested = opts?.nested;
    const u = m.users;
    const fullName = u?.full_name ?? m.guest_full_name ?? "?";
    const gender = GENDER_META[u?.gender ?? m.guest_gender] ?? null;
    const ringColor = gender?.color ?? "var(--border)";
    const rawLevel = m.is_guest ? m.guest_skill_level : u?.level;
    const levelText = rawLevel
      ? ((m.is_guest ? SKILL_LABEL[rawLevel] : LEVEL_LABELS[rawLevel]) ?? rawLevel)
      : null;
    const parts = fullName.trim().split(" ").filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
    const avatarSize = nested ? "w-9 h-9" : "w-11 h-11";

    return (
      <li
        key={m.id}
        className={`relative ${nested ? "ml-6" : ""}`}
        style={{ animation: "fadeSlideUp .3s ease both" }}
      >
        {nested && (
          <span
            aria-hidden
            className="absolute -left-4 top-0 h-1/2 w-3 border-l-2 border-b-2 border-[var(--border-strong)] rounded-bl-lg"
          />
        )}

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
          {u?.avatar_url ? (
            <img
              src={u.avatar_url}
              alt={fullName}
              className={`${avatarSize} rounded-full object-cover flex-shrink-0`}
              style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
            />
          ) : (
            <div
              className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm bg-[var(--primary-soft)] text-[var(--primary)]`}
              style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
            >
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className={`font-bold text-[var(--text)] truncate ${nested ? "text-xs" : "text-sm"}`}>
              {fullName}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {gender && (
                <span className={`${BADGE_BASE} ${gender.tone}`}>
                  {gender.icon} {gender.label}
                </span>
              )}
              {levelText && (
                <span className={`${BADGE_BASE} ${BADGE_TONE.primary}`}>🎯 {levelText}</span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1 max-w-[42%] text-right">
            {m.is_guest ? (
              <span className={`${BADGE_BASE} ${BADGE_TONE.warning}`}>🙋 Khách</span>
            ) : m.tier ? (
              <>
                <span className={`${BADGE_BASE} ${BADGE_TONE.purple} max-w-full`}>
                  <span className="truncate">💎 {m.tier}</span>
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {m.total_points ?? 0} điểm
                </span>
              </>
            ) : (
              <span className={`${BADGE_BASE} ${BADGE_TONE.muted}`}>Chưa có rank</span>
            )}
          </div>
        </div>
      </li>
    );
  };

  const renderPersonAmounts = () => {
    const GROUPED_PM = ["grouped_with_host", "wallet_grouped"];

    const nameOf = (x: any) => x.users?.full_name ?? x.guest_full_name ?? "?";
    const priceFor = (gender?: string) =>
      gender === "female" || gender === "nu"
        ? (session.price_female ?? session.price_per_slot ?? 0)
        : (session.price_male ?? session.price_per_slot ?? 0);
    const amountOf = (x: any) =>
      x.amount_override ?? priceFor(x.users?.gender ?? x.guest_gender);

    const statusIcon = (ok: boolean) =>
      ok ? (
        <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
      ) : (
        <Hourglass className="w-4 h-4 text-[var(--warning)] flex-shrink-0" />
      );

    const feeBreakdown = (x: any, amount: number) => {
      const fee = x.other_fee_amount ?? 0;
      if (!(fee > 0)) return null;
      const base = x.base_amount ?? Math.max(0, amount - fee);
      const lines = noteLines(x.other_fee_note);

      return (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden text-[12px]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[var(--text-muted)]">🏸 Sân + cầu</span>
            <span className="font-semibold tabular-nums text-[var(--text)]">
              {fmt(base)}
            </span>
          </div>

          <div className="px-3 py-1.5 border-t border-dashed border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--warning)]">💰 Khoản khác</span>
              <span className="font-bold tabular-nums text-[var(--warning)]">
                +{fmt(fee)}
              </span>
            </div>
            {lines.map((line, i) => (
              <p
                key={i}
                className="text-[11px] italic text-[var(--text-muted)] mt-0.5 leading-snug"
              >
                • {line}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface-muted)]">
            <span className="font-semibold text-[var(--text-muted)]">Tổng</span>
            <span className="font-bold tabular-nums text-[var(--text)]">
              {fmt(amount)}
            </span>
          </div>
        </div>
      );
    };

    const renderBlock = (opts: {
      key: string;
      title: string;
      isMe?: boolean;
      tag?: string;
      badge: ReturnType<typeof getPaymentMethodBadge>;
      ok: boolean;
      total: number;
      members: any[];
      memberAmounts: number[];
      withTopBorder?: boolean;
    }) => {
      const { members, memberAmounts } = opts;
      const isGroup = members.length > 1;
      const hasFee = members.some((m: any) => (m.other_fee_amount ?? 0) > 0);

      return (
        <div
          key={opts.key}
          className={`px-3.5 py-3 ${opts.withTopBorder ? "border-t border-[var(--border)]" : ""}`}
        >
          {/* Tiêu đề: nhóm nhiều người thì chỉ hiện trạng thái, tổng nằm ở cuối */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text)] truncate">
                {opts.title}
                {opts.isMe && (
                  <span className="text-[var(--primary)] font-semibold"> (bạn)</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {opts.tag && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                    {opts.tag}
                  </span>
                )}
                {hasFee && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--warning-soft)] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
                    💰 Có khoản khác
                  </span>
                )}
                {opts.badge && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${opts.badge.cls}`}
                  >
                    {opts.badge.icon} {opts.badge.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {statusIcon(opts.ok)}
              {!isGroup && (
                <span
                  className={`text-base font-bold tabular-nums ${opts.isMe ? "text-[var(--primary)]" : "text-[var(--text)]"
                    }`}
                >
                  {fmt(opts.total)}
                </span>
              )}
            </div>
          </div>

          {isGroup ? (
            <>
              <div className="mt-3 space-y-2">
                {members.map((x, i) => {
                  const hasOwnFee = (x.other_fee_amount ?? 0) > 0;
                  const isCompanion = i > 0;
                  const isLast = i === members.length - 1;

                  return (
                    <div key={x.id} className={`relative ${isCompanion ? "ml-5" : ""}`}>
                      {isCompanion && (
                        <>
                          <span
                            aria-hidden
                            className="absolute -left-3 -top-2 h-[calc(50%+0.5rem)] w-3 border-l-2 border-b-2 border-[var(--border-strong)] rounded-bl-lg"
                          />
                          {!isLast && (
                            <span
                              aria-hidden
                              className="absolute -left-3 top-1/2 -bottom-2 border-l-2 border-[var(--border-strong)]"
                            />
                          )}
                        </>
                      )}

                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13px] font-semibold text-[var(--text)] truncate">
                            {nameOf(x)}
                            {isCompanion && (
                              <span className="ml-1.5 text-[11px] font-normal text-[var(--text-faint)]">
                                đi cùng
                              </span>
                            )}
                          </span>
                          {!hasOwnFee && (
                            <span className="text-[13px] font-semibold text-[var(--text)] tabular-nums flex-shrink-0">
                              {fmt(memberAmounts[i])}
                            </span>
                          )}
                        </div>
                        {feeBreakdown(x, memberAmounts[i])}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className={`mt-3 flex items-center justify-between rounded-xl px-3 py-2 border border-[var(--border)] ${opts.isMe ? "bg-[var(--surface)]" : "bg-[var(--surface)]"
                  }`}
              >
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Tổng {members.length} người
                </span>
                <span
                  className={`text-base font-bold tabular-nums ${opts.isMe ? "text-[var(--primary)]" : "text-[var(--text)]"
                    }`}
                >
                  {fmt(opts.total)}
                </span>
              </div>
            </>
          ) : (
            feeBreakdown(members[0], opts.total)
          )}
        </div>
      );
    };

    return (
      <div className="space-y-2.5">
        {registrations
          .filter(
            (r) => !r.host_registration_id && r.participation_status === "confirmed",
          )
          .map((r: any) => {
            const guests = registrations.filter(
              (g) =>
                g.host_registration_id === r.id &&
                g.participation_status === "confirmed",
            );
            const groupedGuests = guests.filter((g: any) =>
              GROUPED_PM.includes(g.payment_method),
            );
            const soloGuests = guests.filter(
              (g: any) => !GROUPED_PM.includes(g.payment_method),
            );

            const isMe = r.id === myReg?.id;
            const hostName = nameOf(r);

            const hostAmount = amountOf(r);
            const groupedMembers = [r, ...groupedGuests];
            const groupedAmounts = [hostAmount, ...groupedGuests.map(amountOf)];
            const groupedTotal = groupedAmounts.reduce((s, n) => s + n, 0);
            const groupedPaid =
              r.payment_status === "confirmed" &&
              groupedGuests.every((g: any) => g.payment_status === "confirmed");

            const groupTotal =
              groupedTotal + soloGuests.reduce((s: number, g: any) => s + amountOf(g), 0);

            return (
              <div
                key={r.id}
                className={`rounded-2xl overflow-hidden border ${isMe
                  ? "border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)]"
                  : "border-[var(--border)] bg-[var(--surface-muted)]"
                  }`}
              >
                {renderBlock({
                  key: r.id,
                  title: hostName,
                  isMe,
                  tag: groupedGuests.length > 0 ? `Gộp ${groupedMembers.length} người` : undefined,
                  badge: getPaymentMethodBadge(r),
                  ok: groupedPaid,
                  total: groupedTotal,
                  members: groupedMembers,
                  memberAmounts: groupedAmounts,
                })}

                {soloGuests.map((g: any) =>
                  renderBlock({
                    key: g.id,
                    title: nameOf(g),
                    tag: "Trả riêng",
                    badge: getPaymentMethodBadge(g, hostName, nameOf(g)),
                    ok: g.payment_status === "confirmed",
                    total: amountOf(g),
                    members: [g],
                    memberAmounts: [amountOf(g)],
                    withTopBorder: true,
                  }),
                )}

                {soloGuests.length > 0 && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--surface)] border-t border-dashed border-[var(--border)]">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      Tổng cả nhóm
                    </span>
                    <span
                      className={`text-sm font-bold tabular-nums ${isMe ? "text-[var(--primary)]" : "text-[var(--text)]"
                        }`}
                    >
                      {fmt(groupTotal)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <>
      <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                ::view-transition-old(root) {
                    animation: 160ms ease-out both vt-fade-out;
                }
                ::view-transition-new(root) {
                    animation: 220ms ease-out both vt-fade-in;
                }
                @keyframes vt-fade-out {
                    from { opacity: 1; }
                    to   { opacity: 1; }
                }
                @keyframes vt-fade-in {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
      <div className="min-h-screen bg-[var(--bg)] pb-4">
        <div
          className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] backdrop-blur-md border-b border-[var(--border)] px-4 py-3 flex items-center justify-between"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        >
          <button
            onClick={() => {
              sessionStorage.setItem("activity:return-tab", "sessions");
              const doNavigate = () => router.push("/activity");
              if (
                typeof document !== "undefined" &&
                (document as any).startViewTransition
              ) {
                (document as any).startViewTransition(doNavigate);
              } else {
                doNavigate();
              }
            }}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition-all -ml-1 pl-1 pr-2 py-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          {myReg &&
            (session.status === "open" || session.status === "full") && (
              <button
                onClick={() => setShowGuestModal(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-[0_6px_14px_-4px_rgba(0,0,0,0.7)] transition-all"
              >
                <UserPlus className="w-4 h-4" /> Thêm người đi cùng
              </button>
            )}
        </div>

        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
          <div
            className="bg-[var(--surface)] rounded-3xl p-5 shadow-sm"
            style={{
              animation: "fadeSlideUp .35s ease both",
              viewTransitionName: `session-card-${String(id)}`,
            }}
          >
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusPillCls}`}>
                {statusPillLabel}
              </span>
              {myReg?.participation_status === "pending_approval" && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--warning-soft)] text-[var(--warning)] flex items-center gap-1">
                  <Hourglass className="w-3 h-3" /> Chờ admin duyệt
                </span>
              )}
              {myReg?.participation_status === "awaiting_checkin" &&
                myReg?.added_response !== "pending" && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] flex items-center gap-1">
                    <Hourglass className="w-3 h-3" /> Chờ admin điểm danh
                  </span>
                )}
            </div>

            <h1
              className="text-xl font-bold text-[var(--text)] leading-tight"
              style={{ viewTransitionName: `session-title-${String(id)}` }}
            >
              {session.title}
            </h1>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <InfoTile icon={CalendarDays} tone="primary" label="Ngày">
                {format(new Date(session.scheduled_at), "EEE, dd/MM/yyyy", { locale: vi })}
              </InfoTile>
              <InfoTile icon={Clock} tone="purple" label="Giờ chơi">
                {format(new Date(session.scheduled_at), "HH:mm")} · {session.duration_minutes} phút
              </InfoTile>
              {session.location && (
                <InfoTile icon={MapPin} tone="pink" label="Địa điểm" className="col-span-2">
                  {session.location}
                </InfoTile>
              )}
            </div>

            <div className="mt-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                  <Users className="w-4 h-4 text-[var(--primary)]" />
                  {participantList.length} người {isCompleted ? "đã tham gia" : "đăng ký"}
                </span>
                <GenderCounts male={participantGender.male} female={participantGender.female} />
              </div>

              {!isCompleted && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[var(--text-faint)]">Chỗ trống</span>
                    <span
                      className={`text-xs font-semibold ${slotDimmed
                        ? "text-[var(--text-faint)]"
                        : isFull
                          ? "text-[var(--danger)]"
                          : slotRatio >= 0.6
                            ? "text-[var(--warning)]"
                            : "text-[var(--success)]"
                        }`}
                    >
                      {isFull ? "Đã hết chỗ" : `Còn ${session.available_slots}/${session.max_slots}`}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[var(--surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${slotPct}%`, background: slotBarColor }}
                    />
                  </div>
                </div>
              )}
            </div>

            {session.description && (
              <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">
                {session.description}
              </p>
            )}
          </div>

          {myReg &&
            myReg.added_response === "pending" &&
            myReg.participation_status !== "confirmed" && (
              <div
                className="bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-2xl px-4 py-4 space-y-3"
                style={{ animation: "fadeSlideUp .35s ease both" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-4.5 h-4.5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      Admin đã thêm bạn vào buổi này
                    </p>
                    <p className="text-xs text-[var(--primary)] mt-0.5">
                      Xác nhận tham gia hoặc báo bận để admin sắp xếp lại nếu cần.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespondAdded("accept")}
                    disabled={respondPhase !== "idle"}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {respondPhase === "accept" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Tham gia
                  </button>
                  <button
                    onClick={() => handleRespondAdded("decline")}
                    disabled={respondPhase !== "idle"}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-50 transition-colors"
                  >
                    {respondPhase === "decline" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Bận rùi
                  </button>
                </div>
              </div>
            )}

          {(session.status === "waiting_payment" || session.status === "completed") &&
            costDetail &&
            (costDetail.chi_phi.shuttle_count > 0 ||
              costDetail.chi_phi.court_fee > 0 ||
              costDetail.chi_phi.other_fee > 0) && (
              <div
                className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm space-y-3"
                style={{ animation: "fadeSlideUp .3s ease both" }}
              >
                <h3 className="font-bold text-[var(--text)] text-sm flex items-center gap-2">
                  🧾 Chi phí buổi đánh
                </h3>

                {costDetail.chi_phi.shuttle_count > 0 && (
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_30%,transparent)] bg-[var(--success-soft)] overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text)]">🏸 Tiền cầu</p>
                        <p className="text-xs text-[var(--text-faint)]">
                          {costDetail.chi_phi.shuttle_count} quả ×{" "}
                          {fmt(costDetail.chi_phi.shuttle_price)}
                        </p>
                      </div>
                      <span className="text-base font-bold text-[var(--success)] flex-shrink-0 ml-3">
                        {fmt(costDetail.chi_phi.shuttle_cost)}
                      </span>
                    </div>
                  </div>
                )}

                {Array.isArray(costDetail.chi_phi.court_breakdown) &&
                  costDetail.chi_phi.court_breakdown.length > 0 ? (
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] overflow-hidden">
                    <div className="px-3.5 py-2.5 text-sm font-medium text-[var(--text-muted)] border-b border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                      🏟 Sân
                    </div>
                    <div className="divide-y divide-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                      {costDetail.chi_phi.court_breakdown.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-3.5 py-2.5"
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
                    <div className="flex justify-between items-center px-3.5 py-2.5 bg-[var(--primary-soft)]">
                      <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        Tổng tiền sân
                      </span>
                      <span className="text-base font-bold text-[var(--primary)]">
                        {fmt(costDetail.chi_phi.court_fee)}
                      </span>
                    </div>
                  </div>
                ) : (
                  costDetail.chi_phi.court_fee > 0 && (
                    <div className="flex justify-between text-sm px-1">
                      <span className="text-[var(--text-muted)]">🏟 Sân</span>
                      <span className="font-medium">
                        {fmt(costDetail.chi_phi.court_fee)}
                      </span>
                    </div>
                  )
                )}

                {costDetail.chi_phi.other_fee > 0 && (
                  <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] overflow-hidden">
                    <div className="px-3.5 py-2.5 text-sm font-medium text-[var(--text-muted)] border-b border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
                      💰 Khoản thu khác
                      {costDetail.chi_phi.other_fee_note && (
                        <span className="text-[var(--text-faint)] italic font-normal">
                          {" "}({costDetail.chi_phi.other_fee_note})
                        </span>
                      )}
                    </div>

                    {Array.isArray(costDetail.chi_phi.other_fee_list) &&
                      costDetail.chi_phi.other_fee_list.length > 0 && (
                        <div className="p-3 space-y-2.5">
                          {costDetail.chi_phi.other_fee_list.map((item: any, i: number) => {
                            const hasGuests = (item.guests?.length ?? 0) > 0;

                            // Một dòng: tên ..... giá
                            const renderRow = (
                              name: string,
                              amount: number,
                              note?: string | null,
                              nested?: boolean,
                            ) => (
                              <div className={nested ? "pl-3 border-l-2 border-[color-mix(in_srgb,var(--warning)_30%,transparent)]" : ""}>
                                <div className="flex items-baseline gap-2">
                                  <span
                                    className={`truncate ${nested
                                      ? "text-sm text-[var(--text)]"
                                      : "text-sm font-semibold text-[var(--text)]"
                                      }`}
                                  >
                                    {name}
                                    {nested && (
                                      <span className="ml-1.5 text-[11px] font-normal text-[var(--text-faint)]">
                                        đi cùng
                                      </span>
                                    )}
                                  </span>
                                  {/* đường chấm dẫn mắt từ tên sang giá */}
                                  <span className="flex-1 min-w-4 border-b border-dotted border-[color-mix(in_srgb,var(--warning)_30%,transparent)] -translate-y-[3px]" />
                                  <span
                                    className={`flex-shrink-0 tabular-nums text-sm text-[var(--warning)] ${nested ? "font-medium" : "font-semibold"
                                      }`}
                                  >
                                    {fmt(amount)}
                                  </span>
                                </div>
                                {noteLines(note).map((line, li) => (
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
                                  {renderRow(item.name, item.amount, item.note)}
                                  {item.guests?.map((g: any, gi: number) => (
                                    <div key={gi}>{renderRow(g.name, g.amount, g.note, true)}</div>
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

                    <div className="flex justify-between items-center px-3.5 py-2.5 bg-[var(--warning-soft)]">
                      <span className="text-xs font-semibold text-[var(--warning)] uppercase tracking-wide">
                        Tổng khoản thu khác
                      </span>
                      <span className="text-base font-bold text-[var(--warning)]">
                        {fmt(costDetail.chi_phi.other_fee)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-gray-900 dark:bg-[var(--surface-muted)] dark:border dark:border-[var(--border)] px-4 py-3.5 mt-1">
                  <span className="text-sm font-semibold text-white/80">Tổng chi phí</span>
                  <span className="text-lg font-bold text-white">
                    {fmt(costDetail.summary.total_cost)}
                  </span>
                </div>

                {registrations.filter((r) => r.participation_status === "confirmed")
                  .length > 0 && (
                    <button
                      onClick={openAmountsModal}
                      className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Mỗi người cần thanh toán
                    </button>
                  )}
              </div>
            )}

          {myReg && myReg.participation_status === "pending_approval" && (
            <div
              className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm flex items-center gap-3"
              style={{ animation: "fadeSlideUp .35s ease both" }}
            >
              <div className="w-10 h-10 rounded-full bg-[var(--warning-soft)] flex items-center justify-center flex-shrink-0">
                <Hourglass className="w-5 h-5 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  Đã đăng ký thành công
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Admin đang duyệt đăng ký của bạn, vui lòng chờ trong ít phút.
                </p>
              </div>
            </div>
          )}

          {myReg &&
            hasPendingGuestWallet &&
            myReg.payment_method === "wallet_pending_confirm" &&
            (() => {
              const pendingGuests = myGuests.filter(
                (g: any) => g.payment_method === "wallet_pending_confirm",
              );
              const pendingGuestsTotal = pendingGuests.reduce(
                (s: number, g: any) => s + (g.amount_override ?? 0),
                0,
              );
              const groupTotal = soloAmount + pendingGuestsTotal;

              return (
                <div
                  className="bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-2xl px-4 py-4 space-y-3"
                  style={{ animation: "fadeSlideUp .35s ease both" }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--warning-soft)] flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4.5 h-4.5 text-[var(--warning)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--warning)]">
                        Cần xác nhận thanh toán cho khách đi cùng
                      </p>
                      <p className="text-xs text-[var(--warning)] mt-0.5">
                        Chọn trừ ví chung hay để khách tự thanh toán tiền mặt.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--text-muted)]">Phần của bạn</span>
                      <span className="font-semibold text-[var(--text)]">
                        {fmt(soloAmount)}
                      </span>
                    </div>
                    {pendingGuests.map((g: any) => (
                      <div
                        key={g.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-[var(--purple)]">
                          + {g.guest_full_name}
                        </span>
                        <span className="font-semibold text-[var(--text)]">
                          {fmt(g.amount_override ?? 0)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm pt-1.5 border-t border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
                      <span className="font-semibold text-[var(--warning)]">
                        Tổng cộng
                      </span>
                      <span className="font-bold text-[var(--warning)]">
                        {fmt(groupTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleInlineGuestConfirm("grouped")}
                      disabled={guestConfirmSubmitting !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {guestConfirmSubmitting === "grouped" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wallet className="w-3.5 h-3.5" />
                      )}
                      Gộp vào ví
                    </button>
                    <button
                      onClick={() => handleInlineGuestConfirm("separate")}
                      disabled={guestConfirmSubmitting !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--success-soft)] text-[var(--success)] hover:bg-[var(--success-soft)] disabled:opacity-50 transition-colors"
                    >
                      {guestConfirmSubmitting === "separate" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>💵</span>
                      )}
                      Khách tự trả
                    </button>
                  </div>
                </div>
              );
            })()}

          {myReg &&
            myReg.payment_status === "confirmed" &&
            !hasPendingGuestWallet &&
            (() => {
              const groupedGuests = myGuests.filter(
                (g: any) =>
                  g.payment_method === "grouped_with_host" ||
                  g.payment_method === "wallet_grouped",
              );
              const groupedGuestsTotal = groupedGuests.reduce(
                (s: number, g: any) => s + (g.amount_override ?? 0),
                0,
              );
              const paidTotal =
                (myReg.amount_override ?? 0) + groupedGuestsTotal;

              return (
                <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--success-soft)] flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text)]">
                      Đã thanh toán thành công
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-[var(--text-muted)]">
                        Số tiền đã đóng:{" "}
                        <span className="font-semibold text-[var(--success)]">
                          {fmt(paidTotal)}
                        </span>
                        {groupedGuestsTotal > 0 && (
                          <span className="text-[var(--text-faint)]">
                            {" "}
                            (gồm cả{" "}
                            {groupedGuests
                              .map((g: any) => companionName(g))
                              .filter(Boolean)
                              .join(", ")}
                            )
                          </span>
                        )}
                      </p>
                      {myReg.payment_method === "wallet" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-semibold">
                          <Wallet className="w-2.5 h-2.5" /> Ví BNB
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

          {myReg && myReg.payment_status === "rejected" && (
            <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--danger-soft)] flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Thanh toán bị từ chối
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Vui lòng liên hệ admin để được hỗ trợ thanh toán lại.
                </p>
              </div>
            </div>
          )}

          <div
            className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm"
            style={{
              animation: "fadeSlideUp .35s ease both",
              animationDelay: "40ms",
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--primary)]" />
                Đã đăng ký ({approvedRegistrations.length})
              </h3>
              <GenderCounts male={registeredGender.male} female={registeredGender.female} />
            </div>
            {loadingRegs ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[var(--surface-muted)] rounded w-2/3" />
                      <div className="h-2.5 bg-[var(--surface-muted)] rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : approvedRegistrations.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)] text-center py-6">
                Chưa có ai đăng ký buổi này
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {regRoots.slice(0, 3).map((root: any) => {
                    const guests = regGuestsOf(root.id);
                    return (
                      <div key={root.id} className="space-y-2">
                        {renderRegPerson(root)}
                        {guests.map((g: any) => renderRegPerson(g, { nested: true }))}
                      </div>
                    );
                  })}
                </ul>
                {regRoots.length > 3 && (() => {
                  const shownRoots = regRoots.slice(0, 3);
                  const shownCount = shownRoots.reduce(
                    (sum, root) => sum + 1 + regGuestsOf(root.id).length,
                    0,
                  );
                  const remainingCount = approvedRegistrations.length - shownCount;
                  return (
                    <button
                      onClick={openAllRegsModal}
                      className="w-full mt-2 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] text-sm font-semibold text-[var(--text-muted)] transition-colors"
                    >
                      Xem tất cả (còn {remainingCount} người)
                    </button>
                  );
                })()}
              </>
            )}
          </div>

          {myReg &&
            myReg.participation_status === "awaiting_checkin" &&
            myReg.added_response !== "pending" && (
              <div
                className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm flex items-center gap-3"
                style={{ animation: "fadeSlideUp .35s ease both" }}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-5 h-5 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    Đang chờ điểm danh
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Admin sẽ điểm danh khi buổi bắt đầu. Sau khi buổi kết thúc, số
                    tiền cần thanh toán sẽ hiện ở đây.
                  </p>
                </div>
              </div>
            )}

          {myReg &&
            myReg.participation_status === "confirmed" &&
            myReg.payment_status === "pending" &&
            !myReg.amount_override && (
              <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    Đã điểm danh có mặt
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Số tiền cần thanh toán sẽ được admin thông báo sau khi buổi
                    kết thúc.
                  </p>
                </div>
              </div>
            )}

          {showAmountsModal &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{
                  background: "var(--overlay)",
                  backdropFilter: "blur(2px)",
                  opacity: amountsModalVisible ? 1 : 0,
                  transition: "opacity 200ms ease-out",
                }}
                onClick={closeAmountsModal}
              >
                <div
                  className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
                  style={{
                    transform: amountsModalVisible
                      ? "scale(1) translateY(0)"
                      : "scale(0.95) translateY(8px)",
                    opacity: amountsModalVisible ? 1 : 0,
                    transition:
                      "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                    <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--primary)]" />
                      Số tiền từng người
                    </h3>
                    <button
                      onClick={closeAmountsModal}
                      className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                    >
                      <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                  <div className="px-5 py-4 overflow-y-auto scrollbar-hide">
                    {renderPersonAmounts()}
                  </div>
                  <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
                    <button
                      onClick={closeAmountsModal}
                      className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)]"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {showGuestModal &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                style={{
                  background: guestModalVisible
                    ? "rgba(0,0,0,0.4)"
                    : "rgba(0,0,0,0)",
                  transition: "background 250ms ease-out",
                }}
                onClick={(e) =>
                  e.target === e.currentTarget && closeGuestModal()
                }
              >
                <div
                  className="w-full max-w-md bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl shadow-xl"
                  style={{
                    transform: guestModalVisible
                      ? "translateY(0)"
                      : "translateY(100%)",
                    opacity: guestModalVisible ? 1 : 0,
                    transition:
                      "transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="font-bold text-[var(--text)]">
                      Thêm người đi cùng
                    </h3>
                    <button
                      onClick={closeGuestModal}
                      className="p-1 text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-1 px-5 pt-3">
                    {[
                      ["account", "Có tài khoản"],
                      ["guest", "Khách không tài khoản"],
                    ].map(([val, lbl]) => (
                      <button
                        key={val}
                        onClick={() => setGuestTab(val as any)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${guestTab === val
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "text-[var(--text-faint)]"
                          }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="p-5 space-y-3">
                    {guestTab === "account" ? (
                      <>
                        <div className="relative">
                          <input
                            autoFocus
                            value={memberSearch}
                            onChange={(e) => {
                              setMemberSearch(e.target.value);
                              setSelectedCompanion(null);
                            }}
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                          />
                        </div>

                        {selectedCompanion && (
                          <div className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                            <span className="flex-1 text-sm font-medium text-[var(--primary)] truncate">
                              {selectedCompanion.full_name}
                            </span>
                            <button
                              onClick={() => setSelectedCompanion(null)}
                              className="w-5 h-5 rounded-full hover:bg-blue-200 flex items-center justify-center flex-shrink-0"
                            >
                              <XIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
                            </button>
                          </div>
                        )}

                        {!selectedCompanion && (
                          <div className="max-h-60 overflow-y-auto scrollbar-hide -mx-1 border border-[var(--border)] rounded-xl">
                            {searchingMembers ? (
                              <p className="text-sm text-[var(--text-faint)] text-center py-4">
                                Đang tìm...
                              </p>
                            ) : memberSearchResults.length === 0 ? (
                              <p className="text-sm text-[var(--text-faint)] text-center py-4">
                                {memberSearch.trim()
                                  ? "Không tìm thấy thành viên"
                                  : "Nhập tên hoặc số điện thoại để tìm"}
                              </p>
                            ) : (
                              <ul className="divide-y divide-[var(--border)]">
                                {memberSearchResults
                                  .filter((m: any) => m.id !== user?.id)
                                  .map((m: any) => (
                                    <li key={m.id}>
                                      <button
                                        onClick={() => setSelectedCompanion(m)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] transition-colors"
                                      >
                                        <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                          {m.avatar_url ? (
                                            <img
                                              src={m.avatar_url}
                                              alt={m.full_name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span className="text-xs font-semibold text-[var(--primary)]">
                                              {m.full_name?.[0]?.toUpperCase() ?? "?"}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-[var(--text)] truncate">
                                            {m.full_name}
                                          </p>
                                          <p className="text-xs text-[var(--text-faint)]">{m.phone}</p>
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-[var(--primary)] bg-[var(--primary-soft)] rounded-lg px-3 py-2">
                          ⓘ {selectedCompanion?.full_name ?? "Thành viên"} sẽ
                          nhận thông báo được thêm vào buổi. Khi thanh toán, bạn
                          có thể chọn gộp tiền của họ vào ví của mình hoặc để họ
                          tự thanh toán.
                        </p>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text)] mb-1">
                            Họ tên *
                          </label>
                          <input
                            autoFocus
                            value={guestForm.full_name}
                            onChange={(e) =>
                              setGuestForm((f) => ({
                                ...f,
                                full_name: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
                            placeholder="Tên khách đi cùng"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-[var(--text)] mb-1">
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
                            <label className="block text-sm font-medium text-[var(--text)] mb-1">
                              Trình độ
                            </label>
                            <CustomSelect
                              value={guestForm.skill_level}
                              onChange={(val) =>
                                setGuestForm((f) => ({
                                  ...f,
                                  skill_level: val,
                                }))
                              }
                              placeholder="-- Chọn --"
                              options={SKILL_OPTIONS.filter(
                                (o) => o.value !== "",
                              ).map((o) => ({
                                value: o.value,
                                label: o.label,
                              }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text)] mb-1">
                            Email (không bắt buộc, để gửi hóa đơn)
                          </label>
                          <input
                            type="email"
                            value={guestForm.email}
                            onChange={(e) =>
                              setGuestForm((f) => ({ ...f, email: e.target.value }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
                            placeholder="vidu@email.com"
                          />
                        </div>
                        <p className="text-xs text-[var(--primary)] bg-[var(--primary-soft)] rounded-lg px-3 py-2">
                          ⓘ Tiền của khách đi cùng sẽ được gộp vào số tiền bạn
                          cần thanh toán sau khi buổi kết thúc.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border)]">
                    <button
                      onClick={closeGuestModal}
                      className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAddGuest}
                      disabled={
                        addingGuest ||
                        (guestTab === "account"
                          ? !selectedCompanion
                          : !guestForm.full_name.trim())
                      }
                      className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {addingGuest && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}{" "}
                      Thêm vào buổi
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <div
            className="max-w-lg mx-auto px-4 mt-2 space-y-2 flex flex-col items-center"
            style={{
              animation: "fadeSlideUp .35s ease both",
              animationDelay: "80ms",
            }}
          >
            {canRegister && (
              <div className="w-full flex items-center justify-center gap-2">
                <MorphButton
                  phase={registerPhase}
                  label="🏸 Đăng ký tham gia"
                  idleWidthClass="flex-1"
                  onClick={handleRegister}
                />

                <button
                  onClick={handleMarkInterested}
                  disabled={interestedPhase !== "idle"}
                  className={`flex items-center justify-center gap-1.5 text-sm font-medium
                    h-10 rounded-lg px-3 whitespace-nowrap
                    transition-[flex,border-radius,background-color] duration-300 ease-out
                    disabled:cursor-not-allowed disabled:opacity-60
                    ${interestedPhase === "idle" ? "flex-1" : "flex-shrink-0 w-10 !px-0 rounded-full"}
                    ${interestedPhase === "success"
                      ? "bg-pink-500 text-white"
                      : "bg-[var(--surface)] border border-[color-mix(in_srgb,var(--pink)_30%,transparent)] text-[var(--pink)] hover:bg-[var(--pink-soft)]"
                    }`}
                >
                  {interestedPhase === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : interestedPhase === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  {interestedPhase === "idle" && (
                    <span className="whitespace-nowrap">Quan tâm</span>
                  )}
                </button>
              </div>
            )}

            {myReg &&
              myReg.payment_status === "pending" &&
              myReg.amount_override > 0 &&
              !myReg.payment_reference &&
              myReg.payment_method !== "wallet" &&
              myReg.payment_method !== "wallet_grouped" &&
              myReg.payment_method !== "wallet_pending_confirm" && (
                <button
                  onClick={openPayModal}
                  className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
                >
                  💳 Thanh toán
                </button>
              )}

            {myReg &&
              myReg.payment_status === "pending" &&
              !myReg.amount_override &&
              !myReg.added_by_user_id &&
              myReg.participation_status !== "confirmed" && (
                <MorphButton
                  phase={cancelPhase}
                  label="Hủy đăng ký"
                  idleIcon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={handleCancel}
                  idleClassName="bg-[var(--surface)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  successClassName="bg-red-500 text-white"
                />
              )}

            {isFull && !myReg && (
              <div className="w-full py-4 rounded-2xl bg-[var(--surface-muted)] text-[var(--text-faint)] font-medium text-center text-sm">
                Buổi đã đầy chỗ
              </div>
            )}
          </div>

          {showPayModal &&
            myReg &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed inset-0 flex flex-col justify-end"
                style={{
                  zIndex: 99999,
                  background: payModalVisible
                    ? "rgba(0,0,0,0.5)"
                    : "rgba(0,0,0,0)",
                  backdropFilter: payModalVisible ? "blur(2px)" : "none",
                  transition: "background .3s, backdrop-filter .3s",
                }}
                onClick={(e) => e.target === e.currentTarget && closePayModal()}
              >
                <div
                  className="w-full bg-[var(--surface)] rounded-t-2xl"
                  style={{
                    maxHeight: "90vh",
                    overflowY: "auto",
                    paddingBottom: "env(safe-area-inset-bottom)",
                    transform: payModalVisible
                      ? "translateY(0)"
                      : "translateY(100%)",
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
                      <p className="text-xs text-[var(--text-faint)] mt-0.5">
                        {session.title}
                      </p>
                    </div>
                    <button
                      onClick={closePayModal}
                      className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                    >
                      <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {!payType && myGuests.length > 0 && (
                      <div
                        className="space-y-3"
                        style={{ animation: "fadeSlideUp .25s ease both" }}
                      >
                        <p className="text-xs text-[var(--text-muted)] font-medium">
                          Bạn muốn thanh toán:
                        </p>
                        <button
                          onClick={() => {
                            setPayType("solo");
                            setPayMethod("choose");
                          }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                        >
                          <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">
                            👤
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)]">
                              Tiền của riêng tôi
                            </p>
                            <p className="text-lg font-black text-[var(--primary)] mt-0.5">
                              {fmt(soloAmount)}
                            </p>
                            <p className="text-xs text-[var(--text-faint)]">
                              {companionLabel.charAt(0).toUpperCase() +
                                companionLabel.slice(1)}{" "}
                              ({myGuests.map(companionName).join(", ")}) tự
                              thanh toán riêng
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setPayType("grouped");
                            setPayMethod("choose");
                          }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--purple)] hover:bg-[var(--purple-soft)] transition-colors text-left"
                        >
                          <div className="w-11 h-11 rounded-full bg-[var(--purple-soft)] flex items-center justify-center text-xl">
                            👥
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)]">
                              Gộp cả {companionLabel}
                            </p>
                            <p className="text-lg font-black text-[var(--purple)] mt-0.5">
                              {fmt(groupedAmount)}
                            </p>
                            <p className="text-xs text-[var(--text-faint)]">
                              Bao gồm:{" "}
                              {myGuests
                                .map(
                                  (g: any) =>
                                    `${companionName(g)} (${fmt(g.amount_override ?? 0)})`,
                                )
                                .join(", ")}
                            </p>
                          </div>
                        </button>
                      </div>
                    )}

                    {!payType &&
                      myGuests.length === 0 &&
                      (() => {
                        setPayType("solo");
                        return null;
                      })()}

                    {payType &&
                      (() => {
                        const amt =
                          payType === "grouped" ? groupedAmount : soloAmount;
                        return (
                          <div
                            key={payType}
                            style={{ animation: "fadeSlideUp .25s ease both" }}
                          >
                            <div className="flex items-center justify-between bg-[var(--danger-soft)] rounded-xl px-4 py-3">
                              <span className="text-sm text-[var(--text-muted)]">
                                Số tiền thanh toán
                              </span>
                              <span className="text-lg font-black text-[var(--danger)]">
                                {fmt(amt)}
                              </span>
                            </div>

                            {payMethod === "choose" && (
                              <div
                                className="space-y-3 mt-4"
                                key="choose"
                                style={{
                                  animation: "fadeSlideUp .25s ease both",
                                }}
                              >
                                {/* Ví BNB */}
                                <button
                                  onClick={() => setPayMethod("wallet")}
                                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                                >
                                  <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-5 h-5 text-[var(--primary)]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">
                                      Ví BNB
                                    </p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">
                                      Trừ thẳng vào số dư ví — xác nhận ngay lập
                                      tức
                                    </p>
                                  </div>
                                </button>
                                {/* Chuyển khoản */}
                                <button
                                  onClick={() => setPayMethod("transfer")}
                                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors text-left"
                                >
                                  <div className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xl">
                                    🏦
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">
                                      Chuyển khoản
                                    </p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">
                                      Quét QR VietQR, gửi ảnh bill xác nhận
                                    </p>
                                  </div>
                                </button>
                                {/* Tiền mặt */}
                                <button
                                  onClick={() => setPayMethod("cash")}
                                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-soft)] transition-colors text-left"
                                >
                                  <div className="w-11 h-11 rounded-full bg-[var(--success-soft)] flex items-center justify-center text-xl">
                                    💵
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text)]">
                                      Tiền mặt
                                    </p>
                                    <p className="text-xs text-[var(--text-faint)] mt-0.5">
                                      Thông báo admin, nộp tiền trực tiếp
                                    </p>
                                  </div>
                                </button>
                                {myGuests.length > 0 && (
                                  <button
                                    onClick={() => setPayType(null)}
                                    className="w-full py-2 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                                  >
                                    ← Quay lại chọn kiểu thanh toán
                                  </button>
                                )}
                              </div>
                            )}

                            {/* ── Ví BNB flow ── */}
                            {payMethod === "wallet" && (
                              <div
                                className="space-y-4 mt-4"
                                key="wallet"
                                style={{
                                  animation: "fadeSlideUp .25s ease both",
                                }}
                              >
                                <div className="bg-[var(--primary-soft)] rounded-xl p-4">
                                  <p className="text-sm font-semibold text-[var(--primary)] mb-1 flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> Thanh toán
                                    bằng Ví BNB
                                  </p>
                                  <p className="text-xs text-[var(--primary)]">
                                    Số dư ví sẽ bị trừ ngay lập tức. Admin không
                                    cần duyệt thêm.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setPayMethod("choose")}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
                                  >
                                    Quay lại
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setSubmittingPay(true);
                                      try {
                                        if (myGuests.length > 0) {
                                          await walletApi.confirmGuestPayment(
                                            myReg.id,
                                            payType === "grouped"
                                              ? "grouped"
                                              : "separate",
                                          );
                                        } else {
                                          await walletApi.payRegistration(
                                            myReg.id,
                                          );
                                        }
                                        toast.success(
                                          "Đã thanh toán bằng ví BNB!",
                                        );
                                        closePayModal();
                                        router.push(
                                          `/sessions/${id}/bill?method=wallet`,
                                        );
                                      } catch (err: any) {
                                        toast.error(
                                          err?.response?.data?.message ??
                                          "Thanh toán thất bại",
                                        );
                                      } finally {
                                        setSubmittingPay(false);
                                      }
                                    }}
                                    disabled={submittingPay}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                                  >
                                    {submittingPay && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}
                                    <Wallet className="w-3.5 h-3.5" /> Xác nhận
                                    trừ ví
                                  </button>
                                </div>
                              </div>
                            )}

                            {payMethod === "transfer" &&
                              (() => {
                                const ref = buildTransferNote(
                                  user?.full_name ?? "",
                                  session.title,
                                  session.scheduled_at,
                                );
                                const bankId =
                                  process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                                const bankAccount =
                                  process.env.NEXT_PUBLIC_BANK_ACCOUNT ??
                                  "0000000000";
                                const bankAccountName =
                                  process.env.NEXT_PUBLIC_BANK_NAME ??
                                  "CLB CAU LONG";
                                const bankDisplayName =
                                  BANK_DISPLAY_NAMES[bankId] ?? bankId;
                                const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

                                const handleCopyContent = () => {
                                  navigator.clipboard.writeText(ref);
                                  toast.success(
                                    "Đã copy nội dung chuyển khoản",
                                  );
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
                                    toast.error(
                                      "Không thể lưu ảnh, vui lòng chụp màn hình",
                                    );
                                  }
                                };

                                const handleConfirmTransferred = async () => {
                                  setSubmittingPay(true);
                                  try {
                                    await registrationsApi.submitPayment(
                                      myReg.id,
                                      {
                                        payment_reference: ref,
                                        pay_type: payType,
                                        grouped_amount:
                                          payType === "grouped"
                                            ? groupedAmount
                                            : undefined,
                                      },
                                    );
                                    toast.success(
                                      "Đã ghi nhận, chờ admin xác nhận!",
                                    );
                                    closePayModal();
                                    router.push(
                                      `/sessions/${id}/bill?method=transfer`,
                                    );
                                  } catch {
                                    toast.error("Gửi thất bại");
                                  } finally {
                                    setSubmittingPay(false);
                                  }
                                };

                                return (
                                  <div
                                    className="space-y-4 mt-4"
                                    key="transfer"
                                    style={{
                                      animation: "fadeSlideUp .25s ease both",
                                    }}
                                  >
                                    <div className="bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2">
                                      <p className="text-xs text-[var(--text-faint)]">
                                        Quét mã QR để thanh toán
                                      </p>
                                      <img
                                        src={qr}
                                        alt="VietQR"
                                        className="w-48 h-48 object-contain"
                                        onError={(e) => {
                                          (
                                            e.target as HTMLImageElement
                                          ).style.display = "none";
                                        }}
                                      />
                                    </div>

                                    <div className="bg-[var(--surface-muted)] rounded-xl divide-y divide-[var(--border)] text-sm overflow-hidden">
                                      <div className="flex justify-between px-4 py-2.5">
                                        <span className="text-[var(--text-muted)]">
                                          Ngân hàng
                                        </span>
                                        <span className="font-semibold text-[var(--text)]">
                                          {bankDisplayName}
                                        </span>
                                      </div>
                                      <div className="flex justify-between px-4 py-2.5">
                                        <span className="text-[var(--text-muted)]">
                                          Số tài khoản
                                        </span>
                                        <span className="font-semibold text-[var(--text)]">
                                          {bankAccount}
                                        </span>
                                      </div>
                                      <div className="flex justify-between px-4 py-2.5">
                                        <span className="text-[var(--text-muted)]">
                                          Tên tài khoản
                                        </span>
                                        <span className="font-semibold text-[var(--text)]">
                                          {bankAccountName}
                                        </span>
                                      </div>
                                      <div className="flex justify-between px-4 py-2.5">
                                        <span className="text-[var(--text-muted)]">
                                          Số tiền
                                        </span>
                                        <span className="font-bold text-[var(--danger)]">
                                          {fmt(amt)}
                                        </span>
                                      </div>
                                      <div className="px-4 py-2.5">
                                        <div className="flex justify-between">
                                          <span className="text-[var(--text-muted)]">
                                            Nội dung CK
                                          </span>
                                          <span className="font-mono font-semibold text-[var(--text)]">
                                            {ref}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-faint)] mt-1">
                                          Nội dung chuyển khoản là bắt buộc
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleCopyContent}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                                      >
                                        <Copy className="w-3.5 h-3.5" /> Sao
                                        chép nội dung
                                      </button>
                                      <button
                                        onClick={handleSaveQr}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" /> Lưu
                                        QR
                                      </button>
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setPayMethod("choose")}
                                        className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
                                      >
                                        Quay lại
                                      </button>
                                      <button
                                        onClick={handleConfirmTransferred}
                                        disabled={submittingPay}
                                        className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        {submittingPay && (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        )}{" "}
                                        Tôi đã chuyển khoản
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}

                            {/* ── Tiền mặt flow ── */}
                            {payMethod === "cash" && (
                              <div
                                className="space-y-4 mt-4"
                                key="cash"
                                style={{
                                  animation: "fadeSlideUp .25s ease both",
                                }}
                              >
                                <div className="bg-[var(--success-soft)] rounded-xl p-4">
                                  <p className="text-sm font-semibold text-[var(--success)] mb-1">
                                    💵 Thanh toán tiền mặt
                                  </p>
                                  <p className="text-xs text-[var(--success)]">
                                    Admin sẽ xác nhận sau khi nhận tiền trực
                                    tiếp.
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setPayMethod("choose")}
                                    className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)]"
                                  >
                                    Quay lại
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setSendingCash(true);
                                      try {
                                        await registrationsApi.requestCash(
                                          myReg.id,
                                          {
                                            pay_type: payType,
                                            grouped_amount:
                                              payType === "grouped"
                                                ? groupedAmount
                                                : undefined,
                                          },
                                        );
                                        toast.success("Đã thông báo admin!");
                                        closePayModal();
                                        router.push(
                                          `/sessions/${id}/bill?method=cash`,
                                        );
                                      } catch {
                                        toast.error("Gửi thất bại");
                                      } finally {
                                        setSendingCash(false);
                                      }
                                    }}
                                    disabled={sendingCash}
                                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  >
                                    {sendingCash && (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    )}{" "}
                                    Thông báo admin
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {showAllRegsModal &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{
                  background: "var(--overlay)",
                  backdropFilter: "blur(2px)",
                  opacity: allRegsModalVisible ? 1 : 0,
                  transition: "opacity 200ms ease-out",
                }}
                onClick={closeAllRegsModal}
              >
                <div
                  className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
                  style={{
                    transform: allRegsModalVisible
                      ? "scale(1) translateY(0)"
                      : "scale(0.95) translateY(8px)",
                    opacity: allRegsModalVisible ? 1 : 0,
                    transition:
                      "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                    <div className="min-w-0">
                      <h3 className="font-bold text-[var(--text)] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--primary)]" />
                        Đã đăng ký ({approvedRegistrations.length})
                      </h3>
                      <div className="mt-1.5">
                        <GenderCounts male={registeredGender.male} female={registeredGender.female} />
                      </div>
                    </div>
                    <button
                      onClick={closeAllRegsModal}
                      className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                    >
                      <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                  </div>
                  <div className="px-5 py-3 overflow-y-auto scrollbar-hide">
                    <ul className="space-y-2">
                      {regRoots.map((root: any) => {
                        const guests = regGuestsOf(root.id);
                        return (
                          <div key={root.id} className="space-y-2">
                            {renderRegPerson(root)}
                            {guests.map((g: any) => renderRegPerson(g, { nested: true }))}
                          </div>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
                    <button
                      onClick={closeAllRegsModal}
                      className="w-full py-2.5 rounded-xl bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text)]"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {guestConfirmPayload && (
            <WalletGuestConfirmModal
              hostRegistrationId={guestConfirmPayload.hostRegistrationId}
              guestNames={guestConfirmPayload.guestNames}
              guestTotal={guestConfirmPayload.guestTotal}
              deadline={guestConfirmPayload.deadline}
              onClose={() => setGuestConfirmPayload(null)}
              onDone={() => {
                setGuestConfirmPayload(null);
                fetchSession();
                fetchRegistrations();
              }}
            />
          )}

          {debtWarning !== null && (
            <DebtWarningModal debt={debtWarning} onClose={() => setDebtWarning(null)} />
          )}
        </div>
      </div>
    </>
  );
}

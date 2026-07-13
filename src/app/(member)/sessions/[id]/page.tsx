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
} from "lucide-react";
import toast from "react-hot-toast";
import { sessionsApi, registrationsApi, walletApi } from "../../../../lib/api";
import { supabase } from "@/lib/supabase";
import { MorphButton } from "@/components/effect-button/MorphButton";
import { buildTransferNote } from "@/hooks/payment-ref";
import { useAuthStore } from "@/store/auth.store";
import { createPortal } from "react-dom";
import { useNotificationsRealtimeStore } from "@/store/notifications-realtime.store";

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

function getPaymentMethodBadge(reg: any) {
  const m = reg.payment_method;
  if (m === "wallet" || m === "wallet_grouped") {
    return {
      label: "Ví BNB",
      icon: <Wallet className="w-2.5 h-2.5" />,
      cls: "bg-blue-100 text-blue-700",
    };
  }
  if (m === "grouped_with_host") {
    return {
      label: "Chuyển khoản",
      icon: <span>🏦</span>,
      cls: "bg-sky-100 text-sky-700",
    };
  }
  if (m === "cash") {
    return {
      label: "Tiền mặt",
      icon: <span>💵</span>,
      cls: "bg-emerald-100 text-emerald-700",
    };
  }
  if (reg.payment_reference) {
    return {
      label: "Chuyển khoản",
      icon: <span>🏦</span>,
      cls: "bg-sky-100 text-sky-700",
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
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full bg-white rounded-t-2xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">
              Xác nhận thanh toán khách đi cùng
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              ⏱ Còn {hoursLeft}h để xác nhận — sau đó sẽ tự động gộp vào ví
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Info */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-3">
            <Wallet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Phần của bạn đã được trừ ví
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Khách đi cùng ({guestNames}) cần thanh toán{" "}
                <strong>{fmt(guestTotal)}</strong>. Bạn muốn gộp chung vào ví
                không?
              </p>
            </div>
          </div>

          {/* Option 1: Gộp vào ví */}
          <button
            onClick={() => handleConfirm("grouped")}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 active:scale-[0.99] transition-all text-left disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Trừ thêm vào ví của tôi
              </p>
              <p className="text-lg font-black text-blue-600">
                {fmt(guestTotal)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Gộp tiền cho {guestNames} vào ví BNB của bạn
              </p>
            </div>
            {submitting && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
            )}
          </button>

          {/* Option 2: Tách riêng — khách tự nộp mặt */}
          <button
            onClick={() => handleConfirm("separate")}
            disabled={submitting}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 active:scale-[0.99] transition-all text-left disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
              💵
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Khách tự thanh toán tiền mặt
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {guestNames} sẽ nộp tiền mặt trực tiếp cho admin
              </p>
            </div>
          </button>

          <p className="text-xs text-gray-400 text-center">
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

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registerPhase, setRegisterPhase] = useState<ActionPhase>("idle");
  const [cancelPhase, setCancelPhase] = useState<ActionPhase>("idle");
  const [payType, setPayType] = useState<"solo" | "grouped" | null>(null);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestForm, setGuestForm] = useState({
    full_name: "",
    gender: "male",
    skill_level: "",
  });
  const [addingGuest, setAddingGuest] = useState(false);

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "choose" | "transfer" | "cash" | "wallet"
  >("choose");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [sendingCash, setSendingCash] = useState(false);

  const [guestConfirmPayload, setGuestConfirmPayload] = useState<{
    hostRegistrationId: string;
    guestNames: string;
    guestTotal: number;
    deadline: string;
  } | null>(null);

  const fetchSession = async () => {
    try {
      const { data } = await sessionsApi.get(id);
      setSession(data);
    } finally {
      setLoading(false);
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
    if (!id) return;
    const channel = supabase
      .channel(`session:${id}`)
      .on("broadcast", { event: "session_updated" }, () => {
        fetchSession();
        fetchRegistrations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // useEffect(() => {
  //     if (!user?.id) return;
  //     const channel = supabase
  //         .channel(`notifications:${user.id}`)
  //         .on('broadcast', { event: 'new_notification' }, ({ payload }: any) => {
  //             if (payload?.type === 'wallet_guest_confirm' || payload?.data?.type === 'wallet_guest_confirm') {
  //                 const data = payload?.data ?? payload;
  //                 setGuestConfirmPayload({
  //                     hostRegistrationId: data.host_registration_id,
  //                     guestNames: data.guest_names,
  //                     guestTotal: data.guest_total,
  //                     deadline: data.deadline,
  //                 });
  //             }
  //         })
  //         .subscribe();
  //     return () => { supabase.removeChannel(channel); };
  // }, [user?.id]);

  const lastNotification = useNotificationsRealtimeStore(
    (s) => s.lastNotification,
  );
  useEffect(() => {
    const payload = lastNotification;
    if (
      payload?.type === "wallet_guest_confirm" ||
      payload?.data?.type === "wallet_guest_confirm"
    ) {
      const data = payload?.data ?? payload;
      setGuestConfirmPayload({
        hostRegistrationId: data.host_registration_id,
        guestNames: data.guest_names,
        guestTotal: data.guest_total,
        deadline: data.deadline,
      });
    }
  }, [lastNotification]);

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
      toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
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
    setShowGuestModal(false);
    setGuestForm({ full_name: "", gender: "male", skill_level: "" });
  };

  const handleAddGuest = async () => {
    if (!myReg?.id || !guestForm.full_name.trim()) {
      toast.error("Vui lòng nhập họ tên khách");
      return;
    }
    setAddingGuest(true);
    try {
      await registrationsApi.addGuest(myReg.id, {
        guest_full_name: guestForm.full_name.trim(),
        guest_gender: guestForm.gender,
        guest_skill_level: guestForm.skill_level || undefined,
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
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
        <div className="bg-white rounded-2xl h-48 animate-pulse" />
        <div className="bg-white rounded-2xl h-32 animate-pulse" />
      </div>
    );
  }

  if (!session)
    return (
      <div className="text-center py-20 text-gray-400">
        Không tìm thấy buổi đánh
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

  return (
    <>
      <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
      <div className="space-y-4">
        {/* Back + Add guest */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sessionStorage.setItem("activity:return-tab", "sessions");
              router.push("/activity");
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          {myReg &&
            (session.status === "open" || session.status === "full") && (
              <button
                onClick={() => setShowGuestModal(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Thêm khách đi cùng
              </button>
            )}
        </div>

        {/* Session info card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {session.title}
            </h1>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  myReg &&
                  (effectiveStatus === "open" || effectiveStatus === "full")
                    ? "bg-blue-50 text-blue-700"
                    : effectiveStatus === "open"
                      ? "bg-emerald-50 text-emerald-700"
                      : effectiveStatus === "full"
                        ? "bg-amber-50 text-amber-700"
                        : isAwaitingAdminFinish
                          ? "bg-blue-50 text-blue-700"
                          : effectiveStatus === "waiting_payment"
                            ? "bg-orange-50 text-orange-700"
                            : effectiveStatus === "completed"
                              ? "bg-gray-100 text-gray-500"
                              : effectiveStatus === "cancelled"
                                ? "bg-red-50 text-red-600"
                                : "bg-gray-100 text-gray-500"
                }`}
              >
                {myReg &&
                (effectiveStatus === "open" || effectiveStatus === "full")
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
                              : effectiveStatus}
              </span>

              {myReg?.participation_status === "pending_approval" && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 flex items-center gap-1">
                  <Hourglass className="w-3 h-3" /> Chờ admin duyệt
                </span>
              )}

              {myReg?.participation_status === "awaiting_checkin" && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
                  <Hourglass className="w-3 h-3" /> Chờ admin điểm danh
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2.5 text-sm text-gray-600">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span>
                {format(
                  new Date(session.scheduled_at),
                  "EEEE, dd/MM/yyyy — HH:mm",
                  { locale: vi },
                )}
              </span>
            </div>
            {session.location && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span>{session.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span>{session.duration_minutes} phút</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? "bg-red-50" : "bg-emerald-50"}`}
              >
                <Users
                  className={`w-3.5 h-3.5 ${isFull ? "text-red-500" : "text-emerald-600"}`}
                />
              </div>
              <span className={isFull ? "text-red-500 font-medium" : ""}>
                {isFull
                  ? "Đã hết chỗ"
                  : `Còn ${session.available_slots}/${session.max_slots} chỗ trống`}
              </span>
            </div>
          </div>
          {session.description && (
            <p className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500 leading-relaxed">
              {session.description}
            </p>
          )}
        </div>

        {/* Registrations list */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Đã đăng ký ({registrations.length})
          </h3>
          {loadingRegs ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Chưa có ai đăng ký buổi này
            </p>
          ) : (
            (() => {
              const roots = registrations.filter(
                (m: any) => !m.host_registration_id,
              );
              const guestsOf = (hostId: string) =>
                registrations.filter(
                  (m: any) => m.host_registration_id === hostId,
                );
              const renderPerson = (m: any, opts?: { nested?: boolean }) => {
                const u = m.users;
                const fullName = u?.full_name ?? m.guest_full_name ?? "?";
                const gender = u?.gender ?? m.guest_gender;
                const skillLevel = m.is_guest ? m.guest_skill_level : null;
                const parts = fullName.trim().split(" ").filter(Boolean);
                const initials =
                  parts.length >= 2
                    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                    : fullName.slice(0, 2).toUpperCase();
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-3 ${opts?.nested ? "py-2 pl-6" : "py-2.5"}`}
                    style={{ animation: "fadeSlideUp .3s ease both" }}
                  >
                    {opts?.nested && (
                      <span className="w-3 h-px bg-gray-200 flex-shrink-0 -ml-3 mr-[-2px]" />
                    )}
                    {u?.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={fullName}
                        className={`rounded-full object-cover flex-shrink-0 ${opts?.nested ? "w-7 h-7" : "w-9 h-9"}`}
                      />
                    ) : (
                      <div
                        className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${opts?.nested ? "w-7 h-7 text-[10px] bg-purple-100 text-purple-700" : "w-9 h-9 text-xs bg-blue-100 text-blue-700"}`}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium text-gray-900 truncate ${opts?.nested ? "text-xs" : "text-sm"}`}
                      >
                        {fullName}
                        {m.is_guest && (
                          <span className="text-xs text-gray-400 ml-1">
                            (khách)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {gender === "male"
                          ? "Nam"
                          : gender === "female"
                            ? "Nữ"
                            : ""}
                        {skillLevel && (
                          <span>
                            {" "}
                            · {SKILL_LABEL[skillLevel] ?? skillLevel}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              };
              return (
                <ul className="divide-y divide-gray-50">
                  {roots.map((root: any) => {
                    const guests = guestsOf(root.id);
                    return (
                      <div key={root.id}>
                        {renderPerson(root)}
                        {guests.length > 0 && (
                          <ul>
                            {guests.map((g: any) =>
                              renderPerson(g, { nested: true }),
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </ul>
              );
            })()
          )}
        </div>

        {/* Chi phí buổi */}
        {(session.status === "waiting_payment" ||
          session.status === "completed") &&
          (session.court_fee > 0 ||
            session.shuttle_count > 0 ||
            totalOtherFeeFromRegs > 0) && (
            <div
              className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
              style={{ animation: "fadeSlideUp .3s ease both" }}
            >
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                🧾 Chi phí buổi đánh
              </h3>
              <div className="space-y-1.5 text-sm">
                {session.shuttle_count > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>
                      🏸 Cầu {session.shuttle_count} ×{" "}
                      {fmt(session.shuttle_price ?? 0)}
                    </span>
                    <span className="font-medium">
                      {fmt(
                        (session.shuttle_count ?? 0) *
                          (session.shuttle_price ?? 0),
                      )}
                    </span>
                  </div>
                )}
                {session.court_fee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>🏟 Tiền sân</span>
                    <span className="font-medium">
                      {fmt(session.court_fee ?? 0)}
                    </span>
                  </div>
                )}
                {totalOtherFeeFromRegs > 0 && (
                  <div className="text-gray-600">
                    <div className="flex justify-between">
                      <span>💰 Khoản thu khác</span>
                      <span className="font-medium">
                        {fmt(totalOtherFeeFromRegs)}
                      </span>
                    </div>
                    {/* <div className="mt-1 pl-4 space-y-0.5">
                                            {registrations
                                                .filter(r => (r.other_fee_amount ?? 0) > 0 && r.payment_method !== 'grouped_with_host')
                                                .map((r: any) => {
                                                    const name = r.users?.full_name ?? r.guest_full_name ?? '?';
                                                    return (
                                                        <div key={r.id} className="flex justify-between text-xs text-gray-400">
                                                            <span>
                                                                {name}
                                                                {r.other_fee_note && <span className="italic"> — {r.other_fee_note}</span>}
                                                            </span>
                                                            <span className="font-medium text-amber-600">{fmt(r.other_fee_amount)}</span>
                                                        </div>
                                                    );
                                                })}
                                        </div> */}
                    <div className="mt-1 pl-4 space-y-0.5">
                      {registrations
                        .filter((r) => (r.other_fee_amount ?? 0) > 0)
                        .map((r: any) => {
                          const name =
                            r.users?.full_name ?? r.guest_full_name ?? "?";
                          const isGroupedGuest =
                            r.is_guest &&
                            r.host_registration_id &&
                            r.payment_method === "grouped_with_host";
                          const hostName = isGroupedGuest
                            ? (registrations.find(
                                (h: any) => h.id === r.host_registration_id,
                              )?.users?.full_name ??
                              registrations.find(
                                (h: any) => h.id === r.host_registration_id,
                              )?.guest_full_name)
                            : null;
                          return (
                            <div
                              key={r.id}
                              className="flex justify-between text-xs text-gray-400"
                            >
                              <span>
                                {isGroupedGuest ? `+ ${name}` : name}
                                {isGroupedGuest && hostName && (
                                  <span className="text-gray-300">
                                    {" "}
                                    (đi cùng {hostName})
                                  </span>
                                )}
                                {r.other_fee_note && (
                                  <span className="italic">
                                    {" "}
                                    — {r.other_fee_note}
                                  </span>
                                )}
                              </span>
                              <span className="font-medium text-amber-600">
                                {fmt(r.other_fee_amount)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-gray-100 pt-2 text-gray-900">
                  <span>Tổng chi phí</span>
                  <span>
                    {fmt(
                      (session.court_fee ?? 0) +
                        (session.shuttle_count ?? 0) *
                          (session.shuttle_price ?? 0) +
                        totalOtherFeeFromRegs,
                    )}
                  </span>
                </div>
              </div>
              {registrations.filter(
                (r) => r.participation_status === "confirmed",
              ).length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Số tiền từng người
                  </p>
                  <div className="space-y-2">
                    {/* {registrations.filter(r => !r.host_registration_id && r.participation_status === 'confirmed').map((r: any) => {
                                            const guests = registrations.filter(g => g.host_registration_id === r.id && g.participation_status === 'confirmed');
                                            const name = r.users?.full_name ?? r.guest_full_name ?? '?';
                                            const isMe = r.id === myReg?.id;
                                            const gender = r.users?.gender ?? r.guest_gender;
                                            const defaultPrice = gender === 'female' ? (session.price_female ?? session.price_per_slot ?? 0) : (session.price_male ?? session.price_per_slot ?? 0);
                                            const amount = r.amount_override ?? defaultPrice;
                                            const hasBreakdown = r.base_amount != null && r.other_fee_amount != null && r.other_fee_amount > 0; */}
                    {registrations
                      .filter(
                        (r) =>
                          !r.host_registration_id &&
                          r.participation_status === "confirmed",
                      )
                      .map((r: any) => {
                        const guests = registrations.filter(
                          (g) =>
                            g.host_registration_id === r.id &&
                            g.participation_status === "confirmed",
                        );
                        const name =
                          r.users?.full_name ?? r.guest_full_name ?? "?";
                        const isMe = r.id === myReg?.id;
                        const gender = r.users?.gender ?? r.guest_gender;
                        const defaultPrice =
                          gender === "female"
                            ? (session.price_female ??
                              session.price_per_slot ??
                              0)
                            : (session.price_male ??
                              session.price_per_slot ??
                              0);

                        const guestDefaultPrice = (g: any) => {
                          const gGender = g.guest_gender;
                          return gGender === "female"
                            ? (session.price_female ??
                                session.price_per_slot ??
                                0)
                            : (session.price_male ??
                                session.price_per_slot ??
                                0);
                        };
                        const groupedWithHostGuests = guests.filter(
                          (g: any) => g.payment_method === "grouped_with_host",
                        );
                        const groupedWithHostTotal =
                          groupedWithHostGuests.reduce(
                            (s: number, g: any) =>
                              s + (g.amount_override ?? guestDefaultPrice(g)),
                            0,
                          );

                        const hostOwnAmount = r.amount_override ?? defaultPrice;
                        const amount = hostOwnAmount + groupedWithHostTotal;

                        const combinedBaseAmount =
                          (r.base_amount ?? 0) +
                          groupedWithHostGuests.reduce(
                            (s: number, g: any) => s + (g.base_amount ?? 0),
                            0,
                          );
                        const combinedOtherFeeAmount =
                          (r.other_fee_amount ?? 0) +
                          groupedWithHostGuests.reduce(
                            (s: number, g: any) =>
                              s + (g.other_fee_amount ?? 0),
                            0,
                          );
                        const combinedOtherFeeNote = [
                          r.other_fee_note,
                          ...groupedWithHostGuests.map(
                            (g: any) => g.other_fee_note,
                          ),
                        ]
                          .filter(Boolean)
                          .join(", ");
                        const hasBreakdown =
                          r.base_amount != null && combinedOtherFeeAmount > 0;
                        return (
                          <div
                            key={r.id}
                            className={`rounded-xl px-3 py-2.5 ${isMe ? "bg-blue-50 border border-blue-100" : "bg-gray-50"}`}
                          >
                            <div className="flex justify-between items-center">
                              <span
                                className={`text-sm font-medium ${isMe ? "text-blue-700" : "text-gray-700"}`}
                              >
                                {name}{" "}
                                {isMe && (
                                  <span className="text-xs font-normal text-blue-400">
                                    (bạn)
                                  </span>
                                )}
                                {(() => {
                                  const badge = getPaymentMethodBadge(r);
                                  if (!badge) return null;
                                  return (
                                    <span
                                      className={`ml-1.5 inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}
                                    >
                                      {badge.icon} {badge.label}
                                    </span>
                                  );
                                })()}
                              </span>
                              <div className="flex items-center gap-2">
                                {r.payment_status === "confirmed" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                <span
                                  className={`text-sm font-bold ${isMe ? "text-blue-600" : "text-gray-900"}`}
                                >
                                  {fmt(amount)}
                                </span>
                              </div>
                            </div>

                            {/* {hasBreakdown && (
                                                        <p className="text-[11px] text-gray-400 mt-1">
                                                            Sân + cầu: <span className="font-medium text-gray-500">{fmt(r.base_amount)}</span>
                                                            {' + '}<span className="font-medium text-amber-600">{fmt(r.other_fee_amount)}</span>
                                                            {r.other_fee_note && <span className="italic"> ({r.other_fee_note})</span>}
                                                            {' = '}<span className={`font-semibold ${isMe ? 'text-blue-600' : 'text-gray-600'}`}>{fmt(amount)}</span>
                                                        </p>
                                                    )} */}

                            {hasBreakdown && (
                              <p className="text-[11px] text-gray-400 mt-1">
                                Sân + cầu:{" "}
                                <span className="font-medium text-gray-500">
                                  {fmt(combinedBaseAmount)}
                                </span>
                                {" + "}
                                <span className="font-medium text-amber-600">
                                  {fmt(combinedOtherFeeAmount)}
                                </span>
                                {combinedOtherFeeNote && (
                                  <span className="italic">
                                    {" "}
                                    ({combinedOtherFeeNote})
                                  </span>
                                )}
                                {" = "}
                                <span
                                  className={`font-semibold ${isMe ? "text-blue-600" : "text-gray-600"}`}
                                >
                                  {fmt(amount)}
                                </span>
                              </p>
                            )}

                            {guests.map((g: any) => {
                              const gGender = g.guest_gender;
                              const gDefaultPrice =
                                gGender === "female"
                                  ? (session.price_female ??
                                    session.price_per_slot ??
                                    0)
                                  : (session.price_male ??
                                    session.price_per_slot ??
                                    0);
                              const gAmount =
                                g.amount_override ?? gDefaultPrice;
                              const gHasBreakdown =
                                g.base_amount != null &&
                                g.other_fee_amount != null &&
                                g.other_fee_amount > 0;
                              const isGuestPaid =
                                g.payment_status === "confirmed";
                              const isPendingWallet =
                                g.payment_method === "wallet_pending_confirm";
                              const isGroupedWithHost =
                                g.payment_method === "grouped_with_host";
                              const gBadge = getPaymentMethodBadge(g);
                              return (
                                <div
                                  key={g.id}
                                  className="mt-2 pl-3 border-l-2 border-purple-100"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-purple-600 flex flex-wrap items-center gap-1">
                                      + {g.guest_full_name}
                                      <span className="text-gray-400">
                                        (đi cùng)
                                      </span>
                                      {isPendingWallet && (
                                        <span className="text-amber-500">
                                          · chờ xác nhận
                                        </span>
                                      )}
                                      {gBadge && (
                                        <span
                                          className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${gBadge.cls}`}
                                        >
                                          {gBadge.icon} {gBadge.label}
                                        </span>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {isGroupedWithHost ? (
                                        <span className="text-[11px] text-gray-400 italic">
                                          đã gộp vào {name}
                                        </span>
                                      ) : (
                                        <>
                                          {isGuestPaid ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          ) : (
                                            <Hourglass className="w-3 h-3 text-amber-400" />
                                          )}
                                          <span className="text-xs font-semibold text-gray-600">
                                            {fmt(gAmount)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {gHasBreakdown && !isGroupedWithHost && (
                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                      Sân + cầu:{" "}
                                      <span className="font-medium text-gray-500">
                                        {fmt(g.base_amount)}
                                      </span>
                                      {" + "}
                                      <span className="font-medium text-amber-600">
                                        {fmt(g.other_fee_amount)}
                                      </span>
                                      {g.other_fee_note && (
                                        <span className="italic">
                                          {" "}
                                          ({g.other_fee_note})
                                        </span>
                                      )}
                                      {" = "}
                                      <span className="font-semibold text-gray-600">
                                        {fmt(gAmount)}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

        {myReg && myReg.participation_status === "pending_approval" && (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3"
            style={{ animation: "fadeSlideUp .35s ease both" }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Đã đăng ký thành công
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Admin đang duyệt đăng ký của bạn, vui lòng chờ trong ít phút.
              </p>
            </div>
          </div>
        )}

        {myReg && myReg.participation_status === "awaiting_checkin" && (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3"
            style={{ animation: "fadeSlideUp .35s ease both" }}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Đang chờ điểm danh
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Hourglass className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Đã điểm danh có mặt
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Số tiền cần thanh toán sẽ được admin thông báo sau khi buổi
                  kết thúc.
                </p>
              </div>
            </div>
          )}

        {myReg &&
          hasPendingGuestWallet &&
          myReg.payment_status === "confirmed" && (
            <button
              onClick={() => {
                const pendingGuest = myGuests.find(
                  (g: any) => g.payment_method === "wallet_pending_confirm",
                );
                if (!pendingGuest) return;
                setGuestConfirmPayload({
                  hostRegistrationId: myReg.id,
                  guestNames: myGuests
                    .filter(
                      (g: any) => g.payment_method === "wallet_pending_confirm",
                    )
                    .map((g: any) => g.guest_full_name)
                    .join(", "),
                  guestTotal: myGuests
                    .filter(
                      (g: any) => g.payment_method === "wallet_pending_confirm",
                    )
                    .reduce(
                      (s: number, g: any) => s + (g.amount_override ?? 0),
                      0,
                    ),
                  deadline:
                    pendingGuest.wallet_confirm_deadline ??
                    new Date(Date.now() + 86400000).toISOString(),
                });
              }}
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-left hover:bg-amber-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  Cần xác nhận thanh toán cho khách đi cùng
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Nhấn để chọn gộp ví hoặc để khách tự nộp tiền mặt →
                </p>
              </div>
            </button>
          )}

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
            const paidTotal = (myReg.amount_override ?? 0) + groupedGuestsTotal;

            return (
              <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Đã thanh toán thành công
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-gray-500">
                      Số tiền đã đóng:{" "}
                      <span className="font-semibold text-emerald-600">
                        {fmt(paidTotal)}
                      </span>
                      {groupedGuestsTotal > 0 && (
                        <span className="text-gray-400">
                          {" "}
                          (gồm cả{" "}
                          {groupedGuests
                            .map((g: any) => g.guest_full_name)
                            .join(", ")}
                          )
                        </span>
                      )}
                    </p>
                    {myReg.payment_method === "wallet" && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        <Wallet className="w-2.5 h-2.5" /> Ví BNB
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        {myReg && myReg.payment_status === "rejected" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Thanh toán bị từ chối
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vui lòng liên hệ admin để được hỗ trợ thanh toán lại.
              </p>
            </div>
          </div>
        )}

        {/* Guest modal */}
        {showGuestModal &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
              onClick={(e) => e.target === e.currentTarget}
            >
              <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">
                    Thêm khách đi cùng
                  </h3>
                  <button
                    onClick={closeGuestModal}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Tên khách đi cùng"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giới tính
                      </label>
                      <select
                        value={guestForm.gender}
                        onChange={(e) =>
                          setGuestForm((f) => ({
                            ...f,
                            gender: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                      >
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trình độ
                      </label>
                      <select
                        value={guestForm.skill_level}
                        onChange={(e) =>
                          setGuestForm((f) => ({
                            ...f,
                            skill_level: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                      >
                        {SKILL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    ⓘ Tiền của khách đi cùng sẽ được gộp vào số tiền bạn cần
                    thanh toán sau khi buổi kết thúc.
                  </p>
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={closeGuestModal}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddGuest}
                    disabled={addingGuest || !guestForm.full_name.trim()}
                    className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {addingGuest && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}{" "}
                    Thêm khách
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Action buttons */}
        <div
          className="space-y-2"
          style={{
            animation: "fadeSlideUp .35s ease both",
            animationDelay: "80ms",
          }}
        >
          {canRegister && (
            <MorphButton
              phase={registerPhase}
              label="🏸 Đăng ký tham gia"
              onClick={handleRegister}
            />
          )}

          {myReg &&
            myReg.payment_status === "pending" &&
            myReg.amount_override > 0 &&
            !myReg.payment_reference && (
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
            !myReg.added_by_user_id && (
              <MorphButton
                phase={cancelPhase}
                label="Hủy đăng ký"
                idleIcon={<XCircle className="w-3.5 h-3.5" />}
                onClick={handleCancel}
                idleClassName="bg-white border border-red-200 text-red-500 hover:bg-red-50"
                successClassName="bg-red-500 text-white"
              />
            )}

          {isFull && !myReg && (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-medium text-center text-sm">
              Buổi đã đầy chỗ
            </div>
          )}
        </div>

        {/* Pay modal */}
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
                className="w-full bg-white rounded-t-2xl"
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
                  <div className="w-9 h-1 rounded-full bg-gray-200" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
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
                    <p className="text-xs text-gray-400 mt-0.5">
                      {session.title}
                    </p>
                  </div>
                  <button
                    onClick={closePayModal}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <XIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {!payType && myGuests.length > 0 && (
                    <div
                      className="space-y-3"
                      style={{ animation: "fadeSlideUp .25s ease both" }}
                    >
                      <p className="text-xs text-gray-500 font-medium">
                        Bạn muốn thanh toán:
                      </p>
                      <button
                        onClick={() => {
                          setPayType("solo");
                          setPayMethod("choose");
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                          👤
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Tiền của riêng tôi
                          </p>
                          <p className="text-lg font-black text-blue-600 mt-0.5">
                            {fmt(soloAmount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Khách đi cùng (
                            {myGuests
                              .map((g: any) => g.guest_full_name)
                              .join(", ")}
                            ) tự thanh toán riêng
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setPayType("grouped");
                          setPayMethod("choose");
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-xl">
                          👥
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Gộp cả khách đi cùng
                          </p>
                          <p className="text-lg font-black text-purple-600 mt-0.5">
                            {fmt(groupedAmount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Bao gồm:{" "}
                            {myGuests
                              .map(
                                (g: any) =>
                                  `${g.guest_full_name} (${fmt(g.amount_override ?? 0)})`,
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
                          <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                            <span className="text-sm text-gray-600">
                              Số tiền thanh toán
                            </span>
                            <span className="text-lg font-black text-red-600">
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
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                              >
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Wallet className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Ví BNB
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Trừ thẳng vào số dư ví — xác nhận ngay lập
                                    tức
                                  </p>
                                </div>
                              </button>
                              {/* Chuyển khoản */}
                              <button
                                onClick={() => setPayMethod("transfer")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                              >
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                                  🏦
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Chuyển khoản
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Quét QR VietQR, gửi ảnh bill xác nhận
                                  </p>
                                </div>
                              </button>
                              {/* Tiền mặt */}
                              <button
                                onClick={() => setPayMethod("cash")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                              >
                                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-xl">
                                  💵
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Tiền mặt
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Thông báo admin, nộp tiền trực tiếp
                                  </p>
                                </div>
                              </button>
                              {myGuests.length > 0 && (
                                <button
                                  onClick={() => setPayType(null)}
                                  className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
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
                              <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                  <Wallet className="w-4 h-4" /> Thanh toán bằng
                                  Ví BNB
                                </p>
                                <p className="text-xs text-blue-600">
                                  Số dư ví sẽ bị trừ ngay lập tức. Admin không
                                  cần duyệt thêm.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setPayMethod("choose")}
                                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
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
                                  <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                                    <p className="text-xs text-gray-400">
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

                                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 text-sm overflow-hidden">
                                    <div className="flex justify-between px-4 py-2.5">
                                      <span className="text-gray-500">
                                        Ngân hàng
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {bankDisplayName}
                                      </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-2.5">
                                      <span className="text-gray-500">
                                        Số tài khoản
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {bankAccount}
                                      </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-2.5">
                                      <span className="text-gray-500">
                                        Tên tài khoản
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {bankAccountName}
                                      </span>
                                    </div>
                                    <div className="flex justify-between px-4 py-2.5">
                                      <span className="text-gray-500">
                                        Số tiền
                                      </span>
                                      <span className="font-bold text-red-600">
                                        {fmt(amt)}
                                      </span>
                                    </div>
                                    <div className="px-4 py-2.5">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">
                                          Nội dung CK
                                        </span>
                                        <span className="font-mono font-semibold text-gray-900">
                                          {ref}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-400 mt-1">
                                        Nội dung chuyển khoản là bắt buộc
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleCopyContent}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <Copy className="w-3.5 h-3.5" /> Sao chép
                                      nội dung
                                    </button>
                                    <button
                                      onClick={handleSaveQr}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Lưu
                                      QR
                                    </button>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setPayMethod("choose")}
                                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
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
                              <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-sm font-semibold text-green-800 mb-1">
                                  💵 Thanh toán tiền mặt
                                </p>
                                <p className="text-xs text-green-600">
                                  Admin sẽ xác nhận sau khi nhận tiền trực tiếp.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setPayMethod("choose")}
                                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
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

        {/* Modal xác nhận gộp/riêng guest wallet */}
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
      </div>
    </>
  );
}

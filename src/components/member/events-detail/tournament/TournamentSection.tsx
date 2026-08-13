"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Coins, Users } from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi } from "@/lib/api";
import { TournamentPayModal } from "./TournamentPayModal";
import { useCountdown } from "@/hooks/useCountdown";
import { PAYMENT_METHOD_LABEL, TOURNAMENT_LEVEL_LABEL } from "@/constants/constants";
import { fmt } from "@/utils/utils";

export function TournamentSection({ activity, myStatus, onChanged }: any) {
  const router = useRouter();
  const reg = myStatus?.my_registration;
  const canRegister = activity.status === "open";

  const [showRules, setShowRules] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"choose" | "wallet" | "transfer" | "cash">("choose");
  const [submittingPay, setSubmittingPay] = useState(false);

  const startCountdown = useCountdown(activity.event_date);
  const deadlineCountdown = useCountdown(activity.deadline);

  const entryFee = activity.detail?.entry_fee_per_person ?? 0;
  const maxTeams = activity.detail?.max_teams ?? null;
  const amount = reg?.amount_override ?? entryFee;

  const isPaid = reg?.payment_status === "confirmed";
  const isPendingConfirm = reg && !isPaid && !!reg.payment_reference;
  const needsPayment = reg && amount > 0 && !isPaid && !isPendingConfirm;

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký giải đấu?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch { }
  };

  const goToRegisterPage = () => {
    router.push(`/events/${activity.id}/register`);
  };

  const openPayModal = () => {
    setPayMethod("choose");
    setShowPayModal(true);
  };

  const handlePayWallet = async () => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, { method: "wallet" });
      toast.success("Đã thanh toán bằng ví BNB!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleConfirmTransferred = async (ref: string) => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, {
        method: "transfer",
        payment_reference: ref,
      });
      toast.success("Đã ghi nhận, chờ admin xác nhận!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleRequestCash = async () => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payTournament(activity.id, { method: "cash" });
      toast.success("Đã thông báo admin!");
      setShowPayModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi thất bại");
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ================= HERO COUNTDOWN ================= */}
      <section className="relative overflow-hidden rounded-[26px] bg-[#0B1220] p-5 text-white shadow-xl">
        {/* Decorative background */}
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  {startCountdown.expired
                    ? "GIẢI ĐẤU TRỰC TIẾP"
                    : "ĐIẾM NGƯỢC GIẢI ĐẤU"}
                </span>
              </div>

              <h3 className="text-xl font-black tracking-tight">
                {startCountdown.expired
                  ? "Giải đấu đã bắt đầu"
                  : "Sẵn sàng tranh tài?"}
              </h3>

              {!startCountdown.expired && (
                <p className="mt-1 text-xs text-slate-400">
                  Thời gian bắt đầu giải đấu
                </p>
              )}
            </div>

            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl">
              🏸
            </div>
          </div>

          {!startCountdown.expired ? (
            <div className="mt-5 grid grid-cols-4 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-black tabular-nums">
                  {String(startCountdown.days).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Ngày
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-black tabular-nums">
                  {String(startCountdown.hours).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Giờ
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-black tabular-nums">
                  {String(startCountdown.minutes).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Phút
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-2 py-3 text-center">
                <div className="text-2xl font-black tabular-nums text-cyan-300">
                  {String(startCountdown.seconds).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-400/70">
                  Giây
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15">
                🏆
              </div>

              <div>
                <p className="text-sm font-bold text-emerald-300">
                  Chúc các đội thi đấu tốt!
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-300/60">
                  Hãy chiến đấu hết mình trên sân!
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= REGISTRATION DEADLINE ================= */}
      {activity.deadline && (
        <section className="relative overflow-hidden rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900">
                  {deadlineCountdown.expired
                    ? "Đã hết hạn đăng ký"
                    : "Hạn đăng ký"}
                </p>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  {format(
                    new Date(activity.deadline),
                    "dd/MM/yyyy • HH:mm",
                    { locale: vi }
                  )}
                </p>
              </div>
            </div>
          </div>

          {!deadlineCountdown.expired && (
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                ["Ngày", deadlineCountdown.days],
                ["Giờ", deadlineCountdown.hours],
                ["Phút", deadlineCountdown.minutes],
                ["Giây", deadlineCountdown.seconds],
              ].map(([label, value], index) => (
                <div
                  key={String(label)}
                  className={`rounded-xl px-2 py-2 text-center ${index === 3
                    ? "bg-orange-500 text-white"
                    : "bg-orange-50/80 text-orange-700"
                    }`}
                >
                  <div className="text-sm font-black tabular-nums">
                    {String(value).padStart(2, "0")}
                  </div>
                  <div className="text-[8px] font-semibold uppercase opacity-60">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-[26px] border border-gray-100 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="mt-0.5 text-lg font-black tracking-tight text-gray-900">
                Đăng ký thi đấu
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">

          {reg && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-emerald-800">
                      Đã đăng ký tham gia
                    </p>

                    {!isPaid && !isPendingConfirm && (
                      <button
                        onClick={handleCancel}
                        className="text-[11px] font-semibold text-red-500 transition hover:text-red-600"
                      >
                        Huỷ đăng ký
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 shadow-sm">
                      {reg.role === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                    </span>

                    <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-indigo-600 shadow-sm">
                      {TOURNAMENT_LEVEL_LABEL[reg.level] ?? reg.level}
                    </span>

                    {reg.team?.name && (
                      <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 shadow-sm">
                        Đội: {reg.team.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {reg && !reg.team?.name && (
            <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3.5 py-3">
              <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />

              <p className="text-[11px] leading-relaxed text-gray-500">
                Đội thi đấu sẽ được BTC bốc thăm và công bố sau khi đóng đăng ký.
              </p>
            </div>
          )}

          {isPaid && (
            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-violet-900">
                  Thanh toán thành công
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-violet-600">
                    Lệ phí đã được xác nhận
                  </span>

                  {reg.payment_method && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-600">
                      {PAYMENT_METHOD_LABEL[reg.payment_method] ??
                        reg.payment_method}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {isPendingConfirm && (
            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                <Clock className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-orange-900">
                  Đang chờ xác nhận
                </p>

                <p className="mt-0.5 text-[11px] leading-relaxed text-orange-600">
                  BTC đã nhận yêu cầu thanh toán của bạn.
                </p>

                {reg.payment_method && (
                  <span className="mt-2 inline-block rounded-md bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                    {PAYMENT_METHOD_LABEL[reg.payment_method] ??
                      reg.payment_method}
                  </span>
                )}
              </div>
            </div>
          )}

          {needsPayment && (
            <button
              onClick={openPayModal}
              className="group relative w-full overflow-hidden rounded-2xl bg-[#111827] px-5 py-4 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#172033]"
            >
              <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-indigo-500/20 to-transparent" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500">
                    💳
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Thanh toán lệ phí
                    </p>

                    <p className="mt-0.5 text-base font-black">
                      {fmt(amount)}
                    </p>
                  </div>
                </div>

                <div className="text-xl transition-transform group-hover:translate-x-1">
                  →
                </div>
              </div>
            </button>
          )}

          {!reg && canRegister && (
            <button
              onClick={goToRegisterPage}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />

              <div className="relative flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                    Registration Open
                  </p>

                  <p className="mt-0.5 text-base font-black">
                    Đăng ký thi đấu ngay
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg transition-transform group-hover:translate-x-1">
                  →
                </div>
              </div>
            </button>
          )}

          {/* Closed */}
          {!reg && !canRegister && (
            <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center">
              <p className="text-sm font-bold text-gray-500">
                Đã đóng đăng ký
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                Hẹn gặp bạn ở những giải đấu tiếp theo
              </p>
            </div>
          )}

          {(entryFee > 0 || maxTeams) && (
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">

              {entryFee > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                      <Coins className="h-4 w-4 text-amber-600" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Lệ phí
                      </p>

                      <p className="mt-0.5 truncate text-sm font-black text-gray-900">
                        {fmt(entryFee)}/người
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {maxTeams && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Tối đa
                      </p>

                      <p className="mt-0.5 text-sm font-black text-gray-900">
                        {maxTeams} đội
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activity.description && (
            <div className="border-t border-gray-100 pt-3">
              <button
                onClick={() => setShowRules((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl py-2 text-left transition hover:bg-gray-50"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm">
                    📋
                  </div>

                  <span className="text-sm font-bold text-gray-700">
                    Thể lệ giải đấu
                  </span>
                </div>

                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  {showRules ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </button>

              {showRules && (
                <div className="mt-2 rounded-2xl bg-gray-50 p-4">
                  <p className="whitespace-pre-line text-xs leading-6 text-gray-500">
                    {activity.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <TournamentPayModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        activity={activity}
        reg={reg}
        amount={amount}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        submittingPay={submittingPay}
        handlePayWallet={handlePayWallet}
        handleConfirmTransferred={handleConfirmTransferred}
        handleRequestCash={handleRequestCash}
      />
    </div>
  );
}

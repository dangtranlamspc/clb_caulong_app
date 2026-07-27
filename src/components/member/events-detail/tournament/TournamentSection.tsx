"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Coins, Users } from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi } from "@/lib/api";
import { CountBox } from "../CountBox";
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
    <div className="space-y-3">
      <div className="rounded-[28px] p-5 shadow-lg shadow-indigo-200/50 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {startCountdown.expired ? "Giải đã bắt đầu" : "Giải bắt đầu sau"}
        </div>

        {!startCountdown.expired ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <CountBox value={startCountdown.days} label="ngày" tone="cool" />
            <CountBox value={startCountdown.hours} label="giờ" tone="cool" />
            <CountBox value={startCountdown.minutes} label="phút" tone="cool" />
            <CountBox value={startCountdown.seconds} label="giây" tone="cool" accent />
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/90">Chúc các đội thi đấu tốt! 🏆</p>
        )}
      </div>

      {activity.deadline && (
        <div className="rounded-[28px] p-5 shadow-lg shadow-rose-200/50 bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {deadlineCountdown.expired ? "Đã hết hạn đăng ký" : "Hạn đăng ký còn"}
            </div>
            <span className="text-[11px] text-white/80">
              {format(new Date(activity.deadline), "dd/MM/yyyy", { locale: vi })}
            </span>
          </div>

          {!deadlineCountdown.expired && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              <CountBox value={deadlineCountdown.days} label="ngày" tone="warm" />
              <CountBox value={deadlineCountdown.hours} label="giờ" tone="warm" />
              <CountBox value={deadlineCountdown.minutes} label="phút" tone="warm" />
              <CountBox value={deadlineCountdown.seconds} label="giây" tone="warm" accent />
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[28px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Đăng ký thi đấu</h3>
          {entryFee > 0 && (
            <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              {entryFee.toLocaleString("vi-VN")}đ/người
            </span>
          )}
        </div>

        {reg && (
          <div className="bg-emerald-50 text-emerald-700 text-sm rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                {reg.role === "nam" ? "VĐV Nam" : "VĐV Nữ"} ·{" "}
                <strong>{TOURNAMENT_LEVEL_LABEL[reg.level] ?? reg.level}</strong>
                {reg.team?.name && (
                  <>
                    {" "}
                    · Đội: <strong>{reg.team.name}</strong>
                  </>
                )}
              </span>
            </span>
            {!isPaid && !isPendingConfirm && (
              <button
                onClick={handleCancel}
                className="text-red-500 text-xs font-medium underline flex-shrink-0"
              >
                Huỷ
              </button>
            )}
          </div>
        )}

        {reg && !reg.team?.name && (
          <p className="text-xs text-gray-400 -mt-2">
            Đội thi đấu sẽ được BTC bốc thăm và công bố sau khi đóng đăng ký.
          </p>
        )}

        {isPaid && (
          <div className="bg-violet-50 rounded-2xl px-3 py-2.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-700 leading-snug">
              <p className="font-medium">Đã thanh toán lệ phí</p>
              {reg.payment_method && (
                <span className="inline-block mt-1 text-xs font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  {PAYMENT_METHOD_LABEL[reg.payment_method] ?? reg.payment_method}
                </span>
              )}
            </div>
          </div>
        )}

        {isPendingConfirm && (
          <div className="bg-orange-50 rounded-2xl px-3 py-2.5 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700 leading-snug">
              <p className="font-medium">Đã gửi yêu cầu thanh toán, đang chờ admin xác nhận</p>
              {reg.payment_method && (
                <span className="inline-block mt-1 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  {PAYMENT_METHOD_LABEL[reg.payment_method] ?? reg.payment_method}
                </span>
              )}
            </div>
          </div>
        )}

        {needsPayment && (
          <button
            onClick={openPayModal}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-fuchsia-200"
          >
            💳 Thanh toán {fmt(amount)}
          </button>
        )}

        {!reg && canRegister && (
          <button
            onClick={goToRegisterPage}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-fuchsia-200"
          >
            Đăng ký thi đấu ngay
          </button>
        )}

        {!reg && !canRegister && (
          <p className="text-sm text-gray-400 text-center py-2">Đã đóng đăng ký</p>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-50">
          {entryFee > 0 && (
            <div className="flex-1 rounded-2xl bg-amber-50 px-3 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Coins className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-amber-600/70 uppercase">Lệ phí</p>
                <p className="text-sm font-bold text-gray-900">{fmt(entryFee)}</p>
              </div>
            </div>
          )}
          {maxTeams && (
            <div className="flex-1 rounded-2xl bg-violet-50 px-3 py-2.5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] text-violet-600/70 uppercase">Số đội tối đa</p>
                <p className="text-sm font-bold text-gray-900">{maxTeams}</p>
              </div>
            </div>
          )}
        </div>

        {activity.description && (
          <button
            onClick={() => setShowRules((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-600 pt-1"
          >
            Xem thể lệ giải
            {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        {showRules && activity.description && (
          <p className="text-sm text-gray-500 whitespace-pre-line bg-gray-50 rounded-xl p-3">
            {activity.description}
          </p>
        )}
      </div>

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

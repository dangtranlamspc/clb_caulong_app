"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
  Gift,
  Shirt,
  Trophy,
  Flame,
  Copy,
  Wallet,
  XIcon,
  Clock,
  UserX,
  UserPlus,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi, usersApi } from "@/lib/api";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/auth.store";

const TYPE_META: Record<string, { icon: any; label: string }> = {
  shirt_order: { icon: Shirt, label: "Đặt áo nhóm" },
  tournament: { icon: Trophy, label: "Giải nội bộ" },
  birthday: { icon: Gift, label: "Sinh nhật thành viên" },
  offline_event: { icon: Flame, label: "Offline / Giao lưu" },
  poll: { icon: BarChart3, label: "Bình chọn" },
};

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<any>(null);
  const [myStatus, setMyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [{ data: a }, { data: s }] = await Promise.all([
        activitiesApi.get(id),
        activitiesApi.getMyStatus(id),
      ]);
      setActivity(a);
      setMyStatus(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="h-8 bg-gray-200 rounded w-40 animate-pulse" />
        <div className="bg-white rounded-2xl h-40 animate-pulse" />
        <div className="bg-white rounded-2xl h-56 animate-pulse" />
      </div>
    );
  }
  if (!activity) return null;

  const meta = TYPE_META[activity.type];
  const Icon = meta?.icon ?? CalendarDays;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            sessionStorage.setItem("activity:return-tab", "events");
            router.push("/activity");
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">
          {activity.title}
        </h1>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
            {activity.cover_image_url ? (
              <img
                src={activity.cover_image_url}
                className="w-full h-full object-cover"
              />
            ) : (
              (activity.emoji ?? "📌")
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Icon className="w-3 h-3" /> {meta?.label}
            </p>
            <p className="font-bold text-gray-900 truncate">{activity.title}</p>
          </div>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600 border-t border-gray-50 pt-3">
          {(activity.event_date || activity.deadline) && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>
                {activity.deadline ? "Deadline: " : "Ngày diễn ra: "}
                {format(
                  new Date(activity.deadline ?? activity.event_date),
                  "EEEE, dd/MM/yyyy HH:mm",
                  { locale: vi },
                )}
              </span>
            </div>
          )}
          {activity.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{activity.location}</span>
            </div>
          )}
        </div>

        {activity.description && (
          <p className="text-sm text-gray-500 border-t border-gray-50 pt-3 whitespace-pre-line">
            {activity.description}
          </p>
        )}
      </div>

      {activity.type === "shirt_order" && (
        <ShirtOrderSection
          activity={activity}
          myStatus={myStatus}
          onChanged={fetchAll}
        />
      )}
      {activity.type === "tournament" && (
        <TournamentSection
          activity={activity}
          myStatus={myStatus}
          onChanged={fetchAll}
        />
      )}
      {activity.type === "offline_event" && (
        <OfflineEventSection
          activity={activity}
          myStatus={myStatus}
          onChanged={fetchAll}
        />
      )}
      {activity.type === "poll" && (
        <PollSection
          activity={activity}
          myStatus={myStatus}
          onChanged={fetchAll}
        />
      )}
      {activity.type === "birthday" && <BirthdaySection myStatus={myStatus} />}
    </div>
  );
}

// Đặt áo
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

function ShirtOrderSection({ activity, myStatus, onChanged }: any) {
  const reg = myStatus?.my_registration;
  const [size, setSize] = useState(reg?.size ?? "");
  const [quantity, setQuantity] = useState(reg?.quantity ?? 1);
  const [submitting, setSubmitting] = useState(false);
  const sizes: string[] = activity.detail?.available_sizes ?? [];
  const price = activity.detail?.price_per_shirt ?? 0;
  const canRegister = activity.status === "open";

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "choose" | "wallet" | "transfer" | "cash"
  >("choose");
  const [submittingPay, setSubmittingPay] = useState(false);

  const amount = price * (reg?.quantity ?? (quantity || 1));

  const isPaid = reg?.payment_status === "confirmed";
  const isPendingConfirm = reg && !isPaid && !!reg.payment_reference;
  const isLocked = isPaid || isPendingConfirm;
  const needsPayment = reg && price > 0 && !isPaid && !isPendingConfirm;

  const PAYMENT_METHOD_LABEL: Record<string, string> = {
    wallet: "Ví BNB",
    transfer: "Chuyển khoản",
    cash: "Tiền mặt",
  };

  const handleSubmit = async () => {
    if (!size) return toast.error("Vui lòng chọn size");
    const finalQuantity = isLocked
      ? reg.quantity
      : quantity === "" || quantity < 1
        ? 1
        : quantity;
    setSubmitting(true);
    try {
      await activitiesApi.registerShirtOrder(activity.id, {
        size,
        quantity: finalQuantity,
      });
      toast.success(reg ? "Đã cập nhật đăng ký" : "Đã đăng ký đặt áo");
      onChanged();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký đặt áo?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch {}
  };

  const openPayModal = () => {
    setPayMethod("choose");
    setShowPayModal(true);
  };

  const handlePayWallet = async () => {
    setSubmittingPay(true);
    try {
      await activitiesApi.payShirtOrder(activity.id, { method: "wallet" });
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
      await activitiesApi.payShirtOrder(activity.id, {
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
      await activitiesApi.payShirtOrder(activity.id, { method: "cash" });
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
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Đăng ký đặt áo</h3>
        {price > 0 && (
          <span className="text-sm font-semibold text-blue-600">
            {price.toLocaleString("vi-VN")}đ/áo
          </span>
        )}
      </div>

      {reg && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Bạn đã đăng ký: size <strong>{reg.size}</strong> × {reg.quantity} áo
        </div>
      )}

      {isPaid && (
        <div className="bg-blue-50 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 leading-snug">
            <p className="font-medium">Đã thanh toán</p>
            {reg.payment_method && (
              <span className="inline-block mt-1 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {PAYMENT_METHOD_LABEL[reg.payment_method] ?? reg.payment_method}
              </span>
            )}
          </div>
        </div>
      )}

      {isPendingConfirm && (
        <div className="bg-orange-50 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-700 leading-snug">
            <p className="font-medium">
              Đã gửi yêu cầu thanh toán, đang chờ admin xác nhận
            </p>
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
          className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          💳 Thanh toán {fmt(amount)}
        </button>
      )}

      {canRegister ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Chọn size
            </label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    size === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Số lượng
              {isLocked && (
                <span className="text-gray-400 font-normal">
                  {" "}
                  (không thể đổi sau khi đã thanh toán)
                </span>
              )}
            </label>
            <input
              type="number"
              min={1}
              value={isLocked ? reg.quantity : quantity}
              onChange={(e) => {
                const val = e.target.value;
                setQuantity(val === "" ? "" : Number(val));
              }}
              onBlur={() => {
                if (quantity === "" || quantity < 1) setQuantity(1);
              }}
              disabled={isLocked}
              className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
              {reg ? "Cập nhật" : "Đăng ký"}
            </button>
            {reg && !isPaid && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
              >
                Huỷ
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          Đã đóng đăng ký
        </p>
      )}

      {/* ── Pay modal ── */}
      {showPayModal &&
        reg &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex flex-col justify-end"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowPayModal(false)
            }
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
                    {payMethod === "choose"
                      ? "Chọn phương thức thanh toán"
                      : payMethod === "wallet"
                        ? "Trừ ví BNB"
                        : payMethod === "transfer"
                          ? "Chuyển khoản"
                          : "Tiền mặt"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activity.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-600">
                    Số tiền thanh toán
                  </span>
                  <span className="text-lg font-black text-red-600">
                    {fmt(amount)}
                  </span>
                </div>

                {payMethod === "choose" && (
                  <div className="space-y-3">
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
                          Trừ thẳng vào số dư ví — xác nhận ngay lập tức
                        </p>
                      </div>
                    </button>

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
                          Quét QR VietQR, xác nhận sau khi chuyển
                        </p>
                      </div>
                    </button>

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
                  </div>
                )}

                {payMethod === "wallet" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Thanh toán bằng Ví BNB
                      </p>
                      <p className="text-xs text-blue-600">
                        Số dư ví sẽ bị trừ ngay lập tức.
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
                        onClick={handlePayWallet}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <Wallet className="w-3.5 h-3.5" /> Xác nhận trừ ví
                      </button>
                    </div>
                  </div>
                )}

                {payMethod === "transfer" &&
                  (() => {
                    const ref = `DATAOA ${reg.id.slice(0, 8).toUpperCase()}`;
                    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
                    const bankAccount =
                      process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
                    const bankAccountName =
                      process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
                    const bankDisplayName =
                      BANK_DISPLAY_NAMES[bankId] ?? bankId;
                    const qr = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(bankAccountName)}`;

                    return (
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                          <p className="text-xs text-gray-400">
                            Quét mã QR để thanh toán
                          </p>
                          <img
                            src={qr}
                            alt="VietQR"
                            className="w-48 h-48 object-contain"
                          />
                        </div>

                        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 text-sm overflow-hidden">
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Ngân hàng</span>
                            <span className="font-semibold text-gray-900">
                              {bankDisplayName}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Số tài khoản</span>
                            <span className="font-semibold text-gray-900">
                              {bankAccount}
                            </span>
                          </div>
                          <div className="flex justify-between px-4 py-2.5">
                            <span className="text-gray-500">Số tiền</span>
                            <span className="font-bold text-red-600">
                              {fmt(amount)}
                            </span>
                          </div>
                          <div className="px-4 py-2.5">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Nội dung CK</span>
                              <span className="font-mono font-semibold text-gray-900">
                                {ref}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(ref);
                            toast.success("Đã copy nội dung chuyển khoản");
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Copy className="w-3.5 h-3.5" /> Sao chép nội dung
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setPayMethod("choose")}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
                          >
                            Quay lại
                          </button>
                          <button
                            onClick={() => handleConfirmTransferred(ref)}
                            disabled={submittingPay}
                            className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
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

                {payMethod === "cash" && (
                  <div className="space-y-4">
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
                        onClick={handleRequestCash}
                        disabled={submittingPay}
                        className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submittingPay && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}{" "}
                        Thông báo admin
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

//  Giải đấu
//  Giải đấu
function TournamentSection({ activity, myStatus, onChanged }: any) {
  const { user } = useAuthStore();
  const reg = myStatus?.my_registration;
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canRegister = activity.status === "open";

  // ── Teammate modal state ──
  const [showTeammateModal, setShowTeammateModal] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký giải đấu?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch {}
  };

  const openTeammateModal = () => {
    if (!teamName.trim()) return toast.error("Vui lòng nhập tên đội");
    setSelectedPartner(null);
    setSearch("");
    setResults([]);
    setShowTeammateModal(true);
  };

  // Debounce search
  useEffect(() => {
    if (!showTeammateModal) return;
    if (!search.trim() || search.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await usersApi.searchMembers(search.trim());
        const list = Array.isArray(data) ? data : [];
        setResults(list.filter((u: any) => u.id !== user?.id));
      } catch {
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, showTeammateModal, user?.id]);

  const doRegister = async (player2UserId?: string) => {
    setSubmitting(true);
    try {
      await activitiesApi.registerTournament(activity.id, {
        team_name: teamName.trim(),
        player2_user_id: player2UserId,
      });
      toast.success("Đã đăng ký giải đấu");
      setShowTeammateModal(false);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-900">Đăng ký thi đấu</h3>

      {reg ? (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Đội:{" "}
            <strong>{reg.team_name}</strong>
          </span>
          <button
            onClick={handleCancel}
            className="text-red-500 text-xs font-medium underline flex-shrink-0"
          >
            Huỷ
          </button>
        </div>
      ) : canRegister ? (
        <div className="space-y-3">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Tên đội của bạn"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
          />
          <button
            onClick={openTeammateModal}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            Đăng ký đội
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          Đã đóng đăng ký
        </p>
      )}

      {/* ── Teammate modal ── */}
      {showTeammateModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex flex-col justify-end"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setShowTeammateModal(false)
            }
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
                    Chọn đồng đội
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Đội: {teamName.trim()}
                  </p>
                </div>
                <button
                  onClick={() => setShowTeammateModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <XIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {selectedPartner ? (
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                      {selectedPartner.avatar_url ? (
                        <img
                          src={selectedPartner.avatar_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedPartner.full_name?.[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {selectedPartner.full_name}
                      </p>
                      <p className="text-xs text-blue-500">Đồng đội</p>
                    </div>
                    <button
                      onClick={() => setSelectedPartner(null)}
                      className="text-xs text-red-500 font-medium underline flex-shrink-0"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm tên thành viên... (ít nhất 2 ký tự)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {searching ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      ) : search.trim() && results.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                          Không tìm thấy thành viên nào
                        </p>
                      ) : (
                        results.map((m: any) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedPartner(m)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 overflow-hidden flex-shrink-0">
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                m.full_name?.[0]
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {m.full_name}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => doRegister(undefined)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" /> Đăng ký không đồng đội
                  </button>
                  <button
                    onClick={() => doRegister(selectedPartner?.id)}
                    disabled={submitting || !selectedPartner}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    {submitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <UserPlus className="w-3.5 h-3.5" /> Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

//  Offline / BBQ
function OfflineEventSection({ activity, myStatus, onChanged }: any) {
  const reg = myStatus?.my_registration;
  const [guestCount, setGuestCount] = useState(reg?.guest_count ?? 0);
  const [notes, setNotes] = useState(reg?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const canRegister = ["open", "ongoing", "upcoming"].includes(activity.status);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await activitiesApi.registerOfflineEvent(activity.id, {
        guest_count: guestCount,
        notes: notes || undefined,
      });
      toast.success(reg ? "Đã cập nhật đăng ký" : "Đã đăng ký tham gia");
      onChanged();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Huỷ đăng ký tham gia?")) return;
    try {
      await activitiesApi.cancelRegistration(activity.id);
      toast.success("Đã huỷ đăng ký");
      onChanged();
    } catch {}
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-gray-900">Đăng ký tham gia</h3>

      {reg && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Bạn đã đăng ký{" "}
          {reg.guest_count > 0 && `(+${reg.guest_count} khách đi cùng)`}
        </div>
      )}

      {canRegister ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Số khách đi cùng
            </label>
            <input
              type="number"
              min={0}
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
              {reg ? "Cập nhật" : "Đăng ký tham gia"}
            </button>
            {reg && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
              >
                Huỷ
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">
          Đã đóng đăng ký
        </p>
      )}
    </div>
  );
}

//  Bình chọn
function PollSection({ activity, myStatus, onChanged }: any) {
  const options = myStatus?.options ?? [];
  const counts: Record<string, number> = Object.fromEntries(
    (myStatus?.counts ?? []).map((c: any) => [c.option_id, c.count]),
  );
  const totalVotes = Object.values(counts).reduce(
    (s: number, c: any) => s + c,
    0,
  );
  const [selected, setSelected] = useState<string[]>(
    myStatus?.my_voted_option_ids ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const allowMultiple = activity.detail?.allow_multiple;
  const canVote = activity.status === "open";
  const hasVoted = (myStatus?.my_voted_option_ids ?? []).length > 0;

  const toggleOption = (id: string) => {
    if (allowMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelected([id]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0)
      return toast.error("Vui lòng chọn ít nhất 1 lựa chọn");
    setSubmitting(true);
    try {
      await activitiesApi.vote(activity.id, selected);
      toast.success("Đã ghi nhận bình chọn của bạn");
      onChanged();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <h3 className="font-bold text-gray-900">
        {allowMultiple ? "Chọn nhiều lựa chọn" : "Chọn 1 lựa chọn"}
      </h3>

      <div className="space-y-2">
        {options.map((opt: any) => {
          const count = counts[opt.id] ?? 0;
          const pct =
            totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => canVote && toggleOption(opt.id)}
              disabled={!canVote}
              className={`w-full text-left rounded-xl border p-3 relative overflow-hidden transition-colors ${
                isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200"
              }`}
            >
              {(hasVoted || !canVote) && (
                <div
                  className="absolute inset-0 bg-blue-50/60"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-800">
                  {opt.label}
                </span>
                {(hasVoted || !canVote) && (
                  <span className="text-xs font-semibold text-gray-500">
                    {pct}% ({count})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {canVote ? (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
          {hasVoted ? "Cập nhật bình chọn" : "Gửi bình chọn"}
        </button>
      ) : (
        <p className="text-sm text-gray-400 text-center py-1">
          Đã đóng bình chọn · {totalVotes} lượt
        </p>
      )}
    </div>
  );
}

//  Sinh nhật
function BirthdaySection({ myStatus }: any) {
  const members = myStatus?.members ?? [];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
      <h3 className="font-bold text-gray-900">Thành viên có sinh nhật</h3>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Không có ai trong danh sách
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {members.map((m: any) => (
            <div key={m.id} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center font-bold text-pink-600 overflow-hidden">
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  m.full_name?.[0]
                )}
              </div>
              <p className="text-xs text-center text-gray-600 truncate w-full">
                {m.full_name}
              </p>
              <p className="text-[10px] text-gray-400">
                {format(new Date(m.date_of_birth), "dd/MM")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

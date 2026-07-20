"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronRight,
  User,
  Phone,
  Calendar,
  Mail,
  MapPin,
  Loader2,
  Search,
  X,
  Landmark,
  Wallet,
  Banknote,
  Copy,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi, profileApi, usersApi } from "@/lib/api";

const LEVEL_OPTIONS = [
  { value: "A", label: "Trình A", sub: "Cao", color: "#1a9e5c", bg: "#e6f7ee" },
  {
    value: "B+",
    label: "Trình B+",
    sub: "Khá",
    color: "#7c3aed",
    bg: "#efe7fd",
  },
  {
    value: "B",
    label: "Trình B",
    sub: "Trung bình",
    color: "#c8790f",
    bg: "#fff2df",
  },
  {
    value: "C",
    label: "Trình C",
    sub: "Cơ bản",
    color: "#0f9db0",
    bg: "#e3f7fb",
  },
];

const STEPS = [
  { key: 1, title: "Thông tin cá nhân", sub: "Nhập thông tin đăng ký" },
  { key: 2, title: "Hoàn tất", sub: "Xác nhận & thanh toán" },
];

function fmt(n: number) {
  return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

function stripVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();
}

type RegisterForm = {
  member: any;
  full_name: string;
  phone: string;
  date_of_birth: string;
  email: string;
  gender: "nam" | "nu";
  address: string;
  level: "" | "A" | "B+" | "B" | "C";
  role: "nam" | "nu";
  notes: string;
};

const emptyForm: RegisterForm = {
  member: null,
  full_name: "",
  phone: "",
  date_of_birth: "",
  email: "",
  gender: "nam",
  address: "",
  level: "",
  role: "nam",
  notes: "",
};

function applyMemberToForm(f: RegisterForm, m: any): RegisterForm {
  return {
    ...f,
    member: m,
    full_name: m.full_name ?? "",
    phone: m.phone ?? "",
    date_of_birth: m.date_of_birth ? m.date_of_birth.slice(0, 10) : "",
    email: m.email ?? "",
    gender: m.gender === "nu" ? "nu" : "nam",
    address: m.address ?? "",
    level: m.skill_level ?? f.level,
  };
}

type PaymentOutcome = "confirmed" | "pending_admin" | null;

export default function TournamentRegisterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [registration, setRegistration] = useState<any>(null);

  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [payMethod, setPayMethod] = useState<
    "transfer" | "cash" | "wallet" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);

  const [paymentOutcome, setPaymentOutcome] = useState<PaymentOutcome>(null);
  const [walletNewBalance, setWalletNewBalance] = useState<number | null>(null);

  const isMember = !!form.member;
  const entryFee = activity?.detail?.entry_fee_per_person ?? 0;

  useEffect(() => {
    activitiesApi
      .get(id)
      .then(({ data }) => setActivity(data))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    profileApi
      .getMe()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => applyMemberToForm(f, data));
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!showMemberSearch) return;
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await usersApi.searchMembers(search.trim());
        setSearchResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, showMemberSearch]);

  const selectMember = (m: any) => {
    setForm((f) => applyMemberToForm(f, m));
    setShowMemberSearch(false);
  };

  const clearMember = () => {
    setForm({
      ...emptyForm,
      level: form.level,
      role: form.role,
      notes: form.notes,
    });
  };

  const validateStep1 = () => {
    if (!form.full_name.trim()) return "Vui lòng nhập họ và tên";
    if (!form.phone.trim()) return "Vui lòng nhập số điện thoại";
    if (!form.date_of_birth) return "Vui lòng chọn ngày sinh";
    if (!isMember && !form.email.trim()) return "Vui lòng nhập email";
    if (!form.level) return "Vui lòng chọn trình độ hiện tại";
    return null;
  };

  const goNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) return toast.error(err);
      setStep(2);
    }
  };

  const goBack = () => {
    if (step === 1) return router.back();
    setStep((s) => Math.max(s - 1, 1));
  };

  const paymentRef = activity
    ? `${stripVietnameseTones(activity.title).replace(/\s+/g, "")}_${stripVietnameseTones(
      form.full_name,
    ).replace(/\s+/g, "")}`
    : "";

  const qrUrl =
    entryFee > 0
      ? `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? "TCB"}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "9961060042"}-compact2.png?amount=${entryFee}&addInfo=${encodeURIComponent(paymentRef)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? "NGO VAN NGOI")}`
      : "";

  const ensureRegistration = async () => {
    if (registration) return registration;
    const payload: any = {
      role: form.role,
      level: form.level,
      notes: form.notes || undefined,
    };
    if (form.member) {
      payload.user_id = form.member.id;
    } else {
      payload.guest_full_name = form.full_name;
      payload.guest_phone = form.phone;
      payload.guest_date_of_birth = form.date_of_birth;
      payload.guest_email = form.email;
      payload.guest_gender = form.gender;
      payload.guest_address = form.address;
    }
    const { data } = await activitiesApi.registerTournamentPublic(id, payload);
    setRegistration(data.registration);
    return data.registration;
  };

  const submitFreeRegistration = async () => {
    setSubmitting(true);
    try {
      await ensureRegistration();
      toast.success("Đã gửi đăng ký!");
      setPaymentOutcome(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const payWithWallet = async () => {
    setSubmitting(true);
    try {
      const reg = await ensureRegistration();
      const { data } = await activitiesApi.payTournamentPublic(reg.id, {
        method: "wallet",
      });
      setWalletNewBalance(data.new_balance ?? null);
      setPaymentOutcome("confirmed");
      toast.success("Đã thanh toán bằng Ví BNB!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thanh toán thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const requestCashPayment = async () => {
    setSubmitting(true);
    try {
      const reg = await ensureRegistration();
      await activitiesApi.payTournamentPublic(reg.id, { method: "cash" });
      setPaymentOutcome("pending_admin");
      toast.success("Đã gửi yêu cầu đến BTC!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Gửi yêu cầu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const showTransferQR = async () => {
    setSubmitting(true);
    try {
      await ensureRegistration();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
      setPayMethod(null);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmTransferDone = async () => {
    if (!registration) return;
    setConfirmingTransfer(true);
    try {
      await activitiesApi.payTournamentPublic(registration.id, {
        method: "transfer",
      });
      setPaymentOutcome("pending_admin");
      toast.success("Đã gửi thông báo chuyển khoản đến BTC!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Xác nhận thất bại");
    } finally {
      setConfirmingTransfer(false);
    }
  };

  const handleSelectPayMethod = (method: "wallet" | "transfer" | "cash") => {
    setPayMethod(method);
    setPaymentOutcome(null);
    if (method === "transfer") showTransferQR();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!activity) return null;

  const isDone =
    paymentOutcome === "confirmed" ||
    paymentOutcome === "pending_admin" ||
    (entryFee === 0 && !!registration);

  return (
    <div className="min-h-screen bg-[#F4F6FA] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <span>Giải đấu</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>{activity.title}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-medium">Đăng ký thi đấu</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Đăng ký thi đấu cá nhân
        </h1>

        {/* Step indicator */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step >= s.key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    {s.key}
                  </div>
                  <div className="hidden sm:block">
                    <p
                      className={`text-sm font-semibold ${step >= s.key ? "text-gray-900" : "text-gray-400"
                        }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 ${step > s.key ? "bg-blue-600" : "bg-gray-100"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          {/* ── Cột trái: form theo bước ── */}
          <div className="space-y-5 min-w-0">
            {step === 1 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <SectionTitle
                  icon={<User className="w-4 h-4" />}
                  title="Thông tin cá nhân"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  {form.member ? (
                    <button
                      type="button"
                      onClick={() => setShowMemberSearch(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                        {form.member.avatar_url && (
                          <img
                            src={form.member.avatar_url}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {form.full_name}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Thành viên
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearMember();
                        }}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className="input-field flex-1"
                        placeholder="Nhập họ và tên"
                        value={form.full_name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, full_name: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowMemberSearch(true)}
                        className="px-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 flex-shrink-0"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {form.member
                      ? "Đã tự động điền thông tin tài khoản của bạn. Bấm để đổi sang thành viên khác."
                      : "Chọn từ danh sách thành viên để tự động điền thông tin."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput
                    label="Số điện thoại"
                    required
                    icon={<Phone className="w-4 h-4" />}
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  />
                  <FieldInput
                    label="Ngày sinh"
                    required
                    type="date"
                    icon={<Calendar className="w-4 h-4" />}
                    value={form.date_of_birth}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, date_of_birth: v }))
                    }
                  />
                  <FieldInput
                    label="Email"
                    required={!isMember}
                    icon={<Mail className="w-4 h-4" />}
                    value={form.email}
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                  <FieldInput
                    label="Địa chỉ"
                    icon={<MapPin className="w-4 h-4" />}
                    value={form.address}
                    onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Giới tính <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    {(["nam", "nu"] as const).map((g) => (
                      <label
                        key={g}
                        className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                      >
                        <input
                          type="radio"
                          checked={form.gender === g}
                          onChange={() => setForm((f) => ({ ...f, gender: g }))}
                          className="accent-blue-600"
                        />
                        {g === "nam" ? "Nam" : "Nữ"}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trình độ hiện tại <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LEVEL_OPTIONS.map((lv) => (
                      <button
                        key={lv.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, level: lv.value as any }))
                        }
                        className={`relative rounded-2xl border-2 p-3 text-center transition-colors ${form.level === lv.value
                            ? "border-blue-500 bg-blue-50/40"
                            : "border-gray-200"
                          }`}
                      >
                        {form.level === lv.value && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <span
                          className="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-sm font-bold mb-1.5"
                          style={{ background: lv.bg, color: lv.color }}
                        >
                          {lv.value}
                        </span>
                        <p className="text-sm font-semibold text-gray-800">
                          {lv.label}
                        </p>
                        <p className="text-xs text-gray-400">{lv.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò đăng ký <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          value: "nam",
                          label: "Vận động viên Nam",
                          sub: "Đăng ký thi đấu nội dung nam",
                        },
                        {
                          value: "nu",
                          label: "Vận động viên Nữ",
                          sub: "Đăng ký thi đấu nội dung nữ",
                        },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, role: r.value }))
                        }
                        className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${form.role === r.value
                            ? "border-blue-500 bg-blue-50/40"
                            : "border-gray-200"
                          }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.value === "nam"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-pink-50 text-pink-600"
                            }`}
                        >
                          {r.value === "nam" ? "♂" : "♀"}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {r.label}
                          </p>
                          <p className="text-xs text-gray-400">{r.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ghi chú thêm (nếu có)
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    maxLength={200}
                    placeholder="Nhập ghi chú thêm..."
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {form.notes.length}/200
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <SectionTitle icon="💳" title="Hoàn tất đăng ký" />

                {entryFee === 0 ? (
                  isDone ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg">
                        Đăng ký thành công!
                      </h3>
                      <p className="text-sm text-gray-500">
                        Cảm ơn bạn đã đăng ký tham gia giải đấu.
                      </p>
                      <button
                        onClick={() => router.push(`/events/${id}`)}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                      >
                        Về trang giải đấu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">
                        Giải đấu này không thu lệ phí. Bấm xác nhận để hoàn tất
                        đăng ký.
                      </p>
                      <button
                        onClick={submitFreeRegistration}
                        disabled={submitting}
                        className="w-full px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Xác nhận đăng ký
                      </button>
                    </div>
                  )
                ) : paymentOutcome === "confirmed" ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Đã thanh toán thành công!
                    </h3>
                    <p className="text-sm text-gray-500">
                      Đã trừ {fmt(entryFee)} từ Ví BNB của bạn.
                      {walletNewBalance != null &&
                        ` Số dư còn lại: ${fmt(walletNewBalance)}.`}
                    </p>
                    <button
                      onClick={() => router.push(`/events/${id}`)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                    >
                      Về trang giải đấu
                    </button>
                  </div>
                ) : paymentOutcome === "pending_admin" ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Đã gửi yêu cầu thành công!
                    </h3>
                    <p className="text-sm text-gray-500">
                      BTC sẽ kiểm tra và xác nhận thanh toán của bạn trong thời
                      gian sớm nhất.
                    </p>
                    <button
                      onClick={() => router.push(`/events/${id}`)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
                    >
                      Về trang giải đấu
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-700">
                      Lệ phí thi đấu: <strong>{fmt(entryFee)}</strong>/người.
                      Vui lòng hoàn tất thanh toán để xác nhận đăng ký.
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Phương thức thanh toán
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {isMember && (
                          <PaymentOption
                            active={payMethod === "wallet"}
                            icon={<Wallet className="w-5 h-5" />}
                            label="Ví BNB"
                            sub="Trừ thẳng số dư ví"
                            onClick={() => handleSelectPayMethod("wallet")}
                          />
                        )}
                        <PaymentOption
                          active={payMethod === "transfer"}
                          icon={<Landmark className="w-5 h-5" />}
                          label="Chuyển khoản"
                          sub="Quét QR chuyển khoản ngân hàng"
                          onClick={() => handleSelectPayMethod("transfer")}
                        />
                        <PaymentOption
                          active={payMethod === "cash"}
                          icon={<Banknote className="w-5 h-5" />}
                          label="Thanh toán tiền mặt"
                          sub="Thanh toán trực tiếp cho BTC"
                          onClick={() => handleSelectPayMethod("cash")}
                        />
                      </div>
                      {!isMember && (
                        <p className="text-xs text-gray-400 mt-2">
                          Đăng ký khách (không có tài khoản) chỉ hỗ trợ chuyển
                          khoản hoặc tiền mặt.
                        </p>
                      )}
                    </div>

                    {payMethod === "wallet" && (
                      <button
                        onClick={payWithWallet}
                        disabled={submitting}
                        className="w-full px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Thanh toán {fmt(entryFee)} từ Ví BNB
                      </button>
                    )}

                    {payMethod === "transfer" && (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        {submitting && !registration ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-center">
                              <img
                                src={qrUrl}
                                alt="QR chuyển khoản"
                                className="w-48 h-48 rounded-lg border border-gray-200 bg-white"
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs text-gray-400">
                                  Nội dung chuyển khoản
                                </p>
                                <p className="font-mono font-semibold text-red-600">
                                  {paymentRef}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentRef);
                                  toast.success(
                                    "Đã copy nội dung chuyển khoản",
                                  );
                                }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-white flex-shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" /> Sao chép
                              </button>
                            </div>
                            <button
                              onClick={confirmTransferDone}
                              disabled={confirmingTransfer || !registration}
                              className="w-full px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {confirmingTransfer && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}
                              Tôi đã chuyển khoản
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {payMethod === "cash" && (
                      <button
                        onClick={requestCashPayment}
                        disabled={submitting}
                        className="w-full px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Gửi yêu cầu thanh toán tiền mặt
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Nav buttons */}
            {step === 1 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={goNext}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  Tiếp tục <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {step === 2 && !isDone && (
              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white"
                >
                  ← Quay lại
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <p className="font-bold text-gray-900 text-sm">
                Thông tin giải đấu
              </p>
              <div className="rounded-xl overflow-hidden h-28 bg-gray-100">
                {activity.cover_image_url && (
                  <img
                    src={activity.cover_image_url}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <SidebarRow
                icon={<Calendar className="w-4 h-4" />}
                label="Thời gian"
                value={
                  activity.event_date
                    ? format(
                      new Date(activity.event_date),
                      "HH:mm - dd/MM/yyyy",
                      { locale: vi },
                    )
                    : "—"
                }
              />
              <SidebarRow
                icon={<MapPin className="w-4 h-4" />}
                label="Địa điểm"
                value={activity.location ?? "—"}
              />
              <SidebarRow
                icon={<User className="w-4 h-4" />}
                label="Hình thức"
                value={
                  activity.detail?.format_type === "don" ? "Đơn" : "Đồng đội"
                }
              />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2.5">
              <p className="font-bold text-gray-900 text-sm">
                Thông tin đăng ký
              </p>
              <SidebarRow label="Họ và tên" value={form.full_name || "—"} />
              <SidebarRow label="SĐT" value={form.phone || "—"} />
              <SidebarRow
                label="Giới tính"
                value={form.gender === "nam" ? "Nam" : "Nữ"}
              />
              <SidebarRow
                label="Trình độ"
                value={
                  form.level ? (
                    <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full text-xs">{`Trình ${form.level}`}</span>
                  ) : (
                    "—"
                  )
                }
              />
              <SidebarRow
                label="Vai trò"
                value={form.role === "nam" ? "VĐV Nam" : "VĐV Nữ"}
              />
            </div>

            {entryFee > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-1">
                <p className="font-bold text-gray-900 text-sm mb-1">
                  Lệ phí thi đấu
                </p>
                <p className="text-2xl font-black text-red-600">
                  {fmt(entryFee)}{" "}
                  <span className="text-sm font-medium text-gray-400">
                    / người
                  </span>
                </p>
                <div className="flex justify-between text-sm text-gray-500 pt-1">
                  <span>Số lượng</span> <span>1 người</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-50 mt-1">
                  <span>Tổng cộng</span> <span>{fmt(entryFee)}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-2xl p-5 space-y-2">
              <p className="font-bold text-gray-900 text-sm">Bạn cần hỗ trợ?</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Liên hệ BTC qua số điện thoại hoặc Fanpage để được hỗ trợ nhanh
                nhất.
              </p>
              <button className="w-full py-2 rounded-lg bg-white text-blue-600 text-sm font-medium border border-blue-100">
                Liên hệ BTC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal tìm thành viên */}
      {showMemberSearch && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center"
          onClick={(e) =>
            e.target === e.currentTarget && setShowMemberSearch(false)
          }
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">Tìm thành viên</p>
              <button onClick={() => setShowMemberSearch(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nhập tên thành viên..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {searching ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              ) : (
                searchResults.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectMember(m)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {m.avatar_url && (
                        <img
                          src={m.avatar_url}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.full_name}
                    </p>
                  </button>
                ))
              )}
              {!searching &&
                search.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Không tìm thấy — bạn có thể đăng ký như khách bằng cách đóng
                    cửa sổ này và tự nhập thông tin.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <h3 className="font-bold text-gray-900">{title}</h3>
    </div>
  );
}

function FieldInput({
  label,
  required,
  icon,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
        {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm outline-none min-w-0"
        />
      </div>
    </div>
  );
}

function PaymentOption({
  active,
  icon,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${active ? "border-blue-500 bg-blue-50/40" : "border-gray-200"
        }`}
    >
      <span className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </button>
  );
}

function SidebarRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
        {icon} {label}
      </span>
      <span className="font-medium text-gray-800 text-right truncate">
        {value}
      </span>
    </div>
  );
}

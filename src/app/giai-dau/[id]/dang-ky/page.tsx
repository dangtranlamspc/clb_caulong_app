"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { activitiesApi, guestShirtOrderApi } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ChevronRight,
    ChevronLeft,
    User,
    MessageCircle,
    Landmark,
    Wallet as WalletIcon,
    Copy,
    Check,
    Calendar,
    MapPin,
    Users,
    ListChecks,
    Loader2,
    PartyPopper,
    Phone,
    Mail,
} from "lucide-react";
import { BANK_DISPLAY_NAMES } from "@/constants/constants";


const SUPPORT_PHONE = "0900 000 000";

const LEVELS = [
    { value: "A", label: "Trình A", sub: "Cao" },
    { value: "B+", label: "Trình B+", sub: "Khá" },
    { value: "B", label: "Trình B", sub: "Trung bình" },
    { value: "C", label: "Trình C", sub: "Cơ bản" },
] as const;

const STEPS = [
    { id: 1, label: "Thông tin cá nhân", desc: "Nhập thông tin đăng ký" },
    { id: 2, label: "Thông tin thi đấu", desc: "Chọn trình & vai trò" },
    { id: 3, label: "Xác nhận", desc: "Kiểm tra lại thông tin" },
    { id: 4, label: "Thanh toán", desc: "Hoàn tất lệ phí & đăng ký" },
];

function removeTones(str: string) {
    return (str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]/g, "");
}

function buildTransferRef(activityCode: string, fullName: string) {
    const name = removeTones(fullName).replace(/\s+/g, "");
    return `${activityCode}_${name || "KH"}`;
}

function formatCurrency(n: number) {
    return (n ?? 0).toLocaleString("vi-VN") + "đ";
}

function formatDateTime(iso?: string | null) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

function initials(name: string) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return parts[parts.length - 1][0]?.toUpperCase() ?? "?";
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function SectionCard({
    icon,
    iconBg,
    title,
    children,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconBg }}
                >
                    {icon}
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function PickCard({
    active,
    onClick,
    title,
    sub,
    icon,
    activeColor = "#2563eb",
    disabled,
}: {
    active: boolean;
    onClick: () => void;
    title: string;
    sub?: string;
    icon?: React.ReactNode;
    activeColor?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`relative text-left rounded-xl border-2 px-3.5 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${active ? "shadow-sm" : "border-gray-100 hover:border-gray-200"
                }`}
            style={active ? { borderColor: activeColor, background: `${activeColor}0d` } : undefined}
        >
            {active && (
                <span
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: activeColor }}
                >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
            )}
            {icon}
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </button>
    );
}

export default function TournamentPublicRegisterPage() {
    const params = useParams<{ id: string }>();
    const activityId = params?.id;
    const router = useRouter();

    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [registration, setRegistration] = useState<any>(null);
    const [regId, setRegId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [form, setForm] = useState({
        full_name: "",
        phone: "",
        date_of_birth: "",
        email: "",
        gender: "" as "" | "nam" | "nu",
        address: "",
        level: "" as "" | "A" | "B+" | "B" | "C",
        notes: "",
        payment_method: "" as "" | "transfer" | "cash",
    });

    const update = (patch: Partial<typeof form>) =>
        setForm((f) => ({ ...f, ...patch }));

    useEffect(() => {
        if (!activityId) return;
        setLoading(true);
        guestShirtOrderApi
            .getActivity(activityId)
            .then(({ data }) => {
                if (data.type !== "tournament") {
                    setLoadError("Hoạt động này không phải giải đấu.");
                    return;
                }
                setActivity(data);
            })
            .catch((err) => {
                setLoadError(
                    err?.response?.data?.message || "Không tải được thông tin giải đấu",
                );
            })
            .finally(() => setLoading(false));
    }, [activityId]);

    const composition: any[] = activity?.detail?.composition ?? [];
    const matchContents: { id: string; label: string }[] =
        activity?.detail?.rules?.match_contents ?? [];
    const entryFee: number = activity?.detail?.entry_fee_per_person ?? 0;
    const hasFee = entryFee > 0;

    const hasNamRole = composition.some((c) => c.role === "nam");
    const hasNuRole = composition.some((c) => c.role === "nu");

    const derivedRole = form.gender as "" | "nam" | "nu";
    const genderRoleSupported =
        !derivedRole || (derivedRole === "nam" ? hasNamRole : hasNuRole);

    const availableLevels = useMemo(() => {
        const set = new Set(
            composition.filter((c) => c.role === "nam").map((c) => c.level),
        );
        return LEVELS.filter((l) => set.has(l.value));
    }, [composition]);

    const contentSummary = useMemo(() => {
        if (matchContents.length) {
            return matchContents.map((m) => m.label).join(" · ");
        }
        const parts: string[] = [];
        if (hasNamRole) {
            const levels = [
                ...new Set(
                    composition.filter((c) => c.role === "nam").map((c) => c.level),
                ),
            ];
            parts.push(`Đội Nam${levels.length ? ` (${levels.join(", ")})` : ""}`);
        }
        if (hasNuRole) parts.push("Đội Nữ");
        return parts.join(" · ") || "—";
    }, [matchContents, composition, hasNamRole, hasNuRole]);

    const activityCode = useMemo(() => {
        const t = removeTones(activity?.title || "GIAIDAU").toUpperCase();
        return t.slice(0, 10) || "GIAIDAU";
    }, [activity]);

    const transferRef = useMemo(
        () => buildTransferRef(activityCode, form.full_name),
        [activityCode, form.full_name],
    );

    const bankId = process.env.NEXT_PUBLIC_BANK_ID ?? "MB";
    const bankAccount = process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? "0000000000";
    const bankAccountName = process.env.NEXT_PUBLIC_BANK_NAME ?? "CLB CAU LONG";
    const bankDisplayName = BANK_DISPLAY_NAMES[bankId] ?? bankId;

    const vietQrUrl = useMemo(() => {
        const amount = entryFee || 0;
        return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
            transferRef,
        )}&accountName=${encodeURIComponent(bankAccountName)}`;
    }, [entryFee, transferRef]);

    const copyRef = async () => {
        try {
            await navigator.clipboard.writeText(transferRef);
            setCopied(true);
            toast.success("Đã sao chép nội dung chuyển khoản");
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Không thể sao chép, vui lòng copy thủ công");
        }
    };

    const validateStep1 = () => {
        if (!form.full_name.trim()) return "Vui lòng nhập họ và tên";
        if (!form.phone.trim()) return "Vui lòng nhập số điện thoại";
        if (!form.date_of_birth) return "Vui lòng chọn ngày sinh";
        if (!form.email.trim()) return "Vui lòng nhập email";
        if (!form.gender) return "Vui lòng chọn giới tính";
        return null;
    };

    const validateStep2 = () => {
        if (!form.level) return "Vui lòng chọn trình độ hiện tại";
        if (!genderRoleSupported)
            return `Giải đấu này hiện không tổ chức nội dung dành cho ${form.gender === "nam" ? "Nam" : "Nữ"
                }. Vui lòng quay lại đổi giới tính hoặc liên hệ BTC.`;
        return null;
    };

    const registerGuest = async () => {
        if (regId) {
            setStep(4);
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await activitiesApi.registerTournamentPublic(activityId!, {
                guest_full_name: form.full_name.trim(),
                guest_phone: form.phone.trim(),
                guest_date_of_birth: form.date_of_birth,
                guest_email: form.email.trim(),
                guest_gender: form.gender,
                guest_address: form.address.trim() || undefined,
                role: form.gender,
                level: form.level,
                notes: form.notes.trim() || undefined,
            });
            setRegId(data.registration.id);
            setRegistration(data.registration);
            setStep(4);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const finishRegistration = async () => {
        if (hasFee && !form.payment_method) {
            toast.error("Vui lòng chọn phương thức thanh toán");
            return;
        }
        setSubmitting(true);
        try {
            if (hasFee && regId) {
                const { data: payData } = await activitiesApi.payTournamentPublic(regId, {
                    method: form.payment_method as "transfer" | "cash",
                    payment_reference:
                        form.payment_method === "transfer" ? transferRef : undefined,
                });
                setRegistration(payData.registration);
            }
            setDone(true);
            const willEmailNow = !hasFee || form.payment_method === "cash";
            toast.success(
                willEmailNow
                    ? "Đăng ký thành công! Thông tin đã được gửi tới email của bạn."
                    : "Đăng ký thành công! Email xác nhận sẽ được gửi sau khi BTC xác nhận thanh toán.",
            );
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            const err = validateStep1();
            if (err) return toast.error(err);
            setStep(2);
            return;
        }
        if (step === 2) {
            const err = validateStep2();
            if (err) return toast.error(err);
            setStep(3);
            return;
        }
        if (step === 3) {
            registerGuest();
            return;
        }
        if (step === 4) {
            finishRegistration();
            return;
        }
    };

    const handleBack = () => {
        if (step === 1) {
            router.back();
            return;
        }
        setStep((s) => s - 1);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA]">
                <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (loadError || !activity) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] px-4">
                <div className="text-center">
                    <p className="text-gray-500 mb-1">
                        {loadError || "Không tìm thấy giải đấu"}
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="text-blue-600 text-sm font-semibold hover:underline"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F6FA]">
            <Toaster position="top-center" />

            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
                    <button
                        onClick={() => router.push("/activities")}
                        className="hover:text-gray-600 transition-colors"
                    >
                        Giải đấu
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-gray-500">{activity.title}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-gray-900 font-medium">Đăng ký thi đấu</span>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Đăng ký thi đấu cá nhân
                </h1>

                {/* Stepper */}
                <div className="flex items-center mb-8">
                    {STEPS.map((s, idx) => {
                        const active = !done && step === s.id;
                        const passed = done || step > s.id;
                        return (
                            <div key={s.id} className="flex items-center flex-1 last:flex-none">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${active
                                            ? "bg-blue-600 text-white"
                                            : passed
                                                ? "bg-emerald-500 text-white"
                                                : "bg-gray-200 text-gray-500"
                                            }`}
                                    >
                                        {passed ? <Check className="w-4 h-4" /> : s.id}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p
                                            className={`text-xs font-semibold ${active ? "text-blue-600" : passed ? "text-emerald-600" : "text-gray-400"
                                                }`}
                                        >
                                            {s.label}
                                        </p>
                                        <p className="text-[11px] text-gray-400">{s.desc}</p>
                                    </div>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div
                                        className={`flex-1 h-px mx-3 ${step > s.id || done ? "bg-emerald-300" : "bg-gray-200"
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {done ? (
                    <SuccessView
                        activity={activity}
                        registration={registration}
                        form={form}
                        hasFee={hasFee}
                        entryFee={entryFee}
                        transferRef={transferRef}
                        vietQrUrl={vietQrUrl}
                        bankDisplayName={bankDisplayName}
                        bankAccount={bankAccount}
                        bankAccountName={bankAccountName}
                        copyRef={copyRef}
                        copied={copied}
                        router={router}
                    />
                ) : (
                    <>
                        {step === 1 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "#eef2ff" }}
                                    >
                                        <ListChecks className="w-4.5 h-4.5 text-indigo-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900">Thông tin giải đấu</h3>
                                </div>

                                {activity.cover_image_url && (
                                    <img
                                        src={activity.cover_image_url}
                                        alt={activity.title}
                                        className="w-full h-100 sm:h-100 object-cover rounded-xl mb-5"
                                    />
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                                    <SummaryRow
                                        icon={<Calendar className="w-3.5 h-3.5" />}
                                        label="Thời gian"
                                        value={formatDateTime(activity.event_date)}
                                    />
                                    <SummaryRow
                                        icon={<MapPin className="w-3.5 h-3.5" />}
                                        label="Địa điểm"
                                        value={activity.location || "—"}
                                    />
                                    <SummaryRow
                                        icon={<Users className="w-3.5 h-3.5" />}
                                        label="Hình thức"
                                        value="Đội"
                                    />
                                    <SummaryRow
                                        icon={<ListChecks className="w-3.5 h-3.5" />}
                                        label="Nội dung"
                                        value={contentSummary}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
                            <div className="space-y-4 min-w-0">
                                {step === 1 && (
                                    <SectionCard
                                        icon={<User className="w-4.5 h-4.5 text-blue-600" />}
                                        iconBg="#eef2ff"
                                        title="Thông tin cá nhân"
                                    >
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 text-xs text-blue-700 mb-4 flex items-center justify-between gap-2">
                                            <span>Đã là thành viên CLB? Đăng nhập để đăng ký nhanh hơn.</span>
                                            <button
                                                onClick={() =>
                                                    router.push(
                                                        `/auth/login?redirect=/activities/${activityId}`,
                                                    )
                                                }
                                                className="text-blue-700 font-semibold whitespace-nowrap hover:underline flex-shrink-0"
                                            >
                                                Đăng nhập
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field label="Họ và tên" required>
                                                <input
                                                    className="input-field"
                                                    placeholder="Nguyễn Văn A"
                                                    value={form.full_name}
                                                    onChange={(e) => update({ full_name: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="Số điện thoại" required>
                                                <div className="relative">
                                                    <Phone className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        className="input-field pl-9"
                                                        placeholder="0912 345 678"
                                                        value={form.phone}
                                                        onChange={(e) => update({ phone: e.target.value })}
                                                    />
                                                </div>
                                            </Field>
                                            <Field label="Ngày sinh" required>
                                                <input
                                                    type="date"
                                                    className="input-field"
                                                    value={form.date_of_birth}
                                                    onChange={(e) => update({ date_of_birth: e.target.value })}
                                                />
                                            </Field>
                                            <Field label="Email" required>
                                                <div className="relative">
                                                    <Mail className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        type="email"
                                                        className="input-field pl-9"
                                                        placeholder="ban@email.com"
                                                        value={form.email}
                                                        onChange={(e) => update({ email: e.target.value })}
                                                    />
                                                </div>
                                            </Field>
                                            <Field label="Giới tính" required>
                                                <div className="flex items-center gap-5 h-[42px]">
                                                    {(["nam", "nu"] as const).map((g) => (
                                                        <label
                                                            key={g}
                                                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="gender"
                                                                checked={form.gender === g}
                                                                onChange={() => update({ gender: g })}
                                                                className="accent-blue-600 w-4 h-4"
                                                            />
                                                            {g === "nam" ? "Nam" : "Nữ"}
                                                        </label>
                                                    ))}
                                                </div>
                                            </Field>
                                            <Field label="Địa chỉ">
                                                <div className="relative">
                                                    <MapPin className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                                                    <input
                                                        className="input-field pl-9"
                                                        placeholder="TP. Thủ Đức, TP. Hồ Chí Minh"
                                                        value={form.address}
                                                        onChange={(e) => update({ address: e.target.value })}
                                                    />
                                                </div>
                                            </Field>
                                        </div>
                                    </SectionCard>
                                )}

                                {step === 2 && (
                                    <SectionCard
                                        icon={<MessageCircle className="w-4.5 h-4.5 text-purple-600" />}
                                        iconBg="#f3e8ff"
                                        title="Thông tin thi đấu"
                                    >
                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-400 mb-0.5">
                                                    Vai trò đăng ký (theo giới tính đã chọn)
                                                </p>
                                                <span
                                                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${form.gender === "nam"
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "bg-pink-50 text-pink-600"
                                                        }`}
                                                >
                                                    {form.gender === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setStep(1)}
                                                className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
                                            >
                                                Đổi giới tính
                                            </button>
                                        </div>

                                        {!genderRoleSupported && (
                                            <div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-xs text-red-600 mb-4">
                                                Giải đấu này hiện không tổ chức nội dung dành cho{" "}
                                                {form.gender === "nam" ? "Nam" : "Nữ"}. Vui lòng quay lại
                                                đổi giới tính hoặc liên hệ BTC.
                                            </div>
                                        )}

                                        <Field label="Trình độ hiện tại" required>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                                                {LEVELS.map((l) => {
                                                    const disabled =
                                                        derivedRole === "nam" &&
                                                        availableLevels.length > 0 &&
                                                        !availableLevels.some((a) => a.value === l.value);
                                                    return (
                                                        <PickCard
                                                            key={l.value}
                                                            active={form.level === l.value}
                                                            onClick={() => update({ level: l.value })}
                                                            title={l.label}
                                                            sub={l.sub}
                                                            disabled={disabled}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </Field>

                                        <Field label="Ghi chú thêm (nếu có)">
                                            <textarea
                                                rows={3}
                                                maxLength={200}
                                                className="input-field w-full resize-none"
                                                placeholder="Nhập ghi chú..."
                                                value={form.notes}
                                                onChange={(e) => update({ notes: e.target.value })}
                                            />
                                            <p className="text-right text-[11px] text-gray-300 mt-1">
                                                {form.notes.length}/200
                                            </p>
                                        </Field>
                                    </SectionCard>
                                )}

                                {step === 3 && (
                                    <SectionCard
                                        icon={<ListChecks className="w-4.5 h-4.5 text-indigo-600" />}
                                        iconBg="#eef2ff"
                                        title="Xác nhận thông tin đăng ký"
                                    >
                                        <div className="divide-y divide-gray-50">
                                            <ReviewRow label="Họ và tên" value={form.full_name} />
                                            <ReviewRow label="Số điện thoại" value={form.phone} />
                                            <ReviewRow
                                                label="Ngày sinh"
                                                value={
                                                    form.date_of_birth
                                                        ? new Date(form.date_of_birth).toLocaleDateString("vi-VN")
                                                        : "—"
                                                }
                                            />
                                            <ReviewRow label="Email" value={form.email} />
                                            <ReviewRow
                                                label="Giới tính"
                                                value={form.gender === "nam" ? "Nam" : "Nữ"}
                                            />
                                            <ReviewRow label="Địa chỉ" value={form.address || "—"} />
                                            <ReviewRow
                                                label="Vai trò đăng ký"
                                                value={form.gender === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                                            />
                                            <ReviewRow
                                                label="Trình độ"
                                                value={form.level ? `Trình ${form.level}` : "—"}
                                            />
                                            <ReviewRow label="Ghi chú" value={form.notes || "—"} />
                                        </div>

                                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
                                            <button
                                                onClick={() => setStep(1)}
                                                className="text-xs font-semibold text-blue-600 hover:underline"
                                            >
                                                Sửa thông tin cá nhân
                                            </button>
                                            <span className="text-gray-200">•</span>
                                            <button
                                                onClick={() => setStep(2)}
                                                className="text-xs font-semibold text-blue-600 hover:underline"
                                            >
                                                Sửa thông tin thi đấu
                                            </button>
                                        </div>
                                    </SectionCard>
                                )}

                                {step === 4 && (
                                    hasFee ? (
                                        <SectionCard
                                            icon={<WalletIcon className="w-4.5 h-4.5 text-amber-600" />}
                                            iconBg="#fef3c7"
                                            title="Thanh toán lệ phí"
                                        >
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 text-xs text-amber-700 mb-4">
                                                Lệ phí thi đấu: <b>{formatCurrency(entryFee)}</b> / người.
                                                Vui lòng hoàn tất thanh toán để xác nhận đăng ký.
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                                                <PickCard
                                                    active={form.payment_method === "transfer"}
                                                    onClick={() => update({ payment_method: "transfer" })}
                                                    title="Chuyển khoản ngân hàng"
                                                    sub="Chuyển khoản qua tài khoản ngân hàng"
                                                    icon={<Landmark className="w-5 h-5 text-blue-500 mb-1" />}
                                                />
                                                <PickCard
                                                    active={form.payment_method === "cash"}
                                                    onClick={() => update({ payment_method: "cash" })}
                                                    title="Thanh toán tiền mặt"
                                                    sub="Thanh toán trực tiếp cho BTC"
                                                    icon={<WalletIcon className="w-5 h-5 text-emerald-500 mb-1" />}
                                                />
                                            </div>

                                            {form.payment_method === "transfer" && (
                                                <div className="rounded-xl border border-gray-100 p-3.5">
                                                    {vietQrUrl && (
                                                        <img
                                                            src={vietQrUrl}
                                                            alt="VietQR"
                                                            className="w-36 h-auto mx-auto rounded-lg border border-gray-100 mb-3"
                                                        />
                                                    )}
                                                    <p className="text-xs text-gray-400 mb-1">
                                                        Nội dung chuyển khoản
                                                    </p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono font-semibold text-gray-900 text-sm truncate">
                                                            {transferRef}
                                                        </span>
                                                        <button
                                                            onClick={copyRef}
                                                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
                                                        >
                                                            {copied ? (
                                                                <Check className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                            Sao chép
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </SectionCard>
                                    ) : (
                                        <SectionCard
                                            icon={<WalletIcon className="w-4.5 h-4.5 text-emerald-600" />}
                                            iconBg="#e6f7ee"
                                            title="Hoàn tất đăng ký"
                                        >
                                            <p className="text-sm text-gray-500 leading-relaxed">
                                                Giải đấu này không thu lệ phí tham gia. Nhấn{" "}
                                                <b>&ldquo;Hoàn tất đăng ký&rdquo;</b> để gửi thông tin đăng ký
                                                của bạn. Xác nhận đăng ký sẽ được gửi về email bạn đã cung cấp.
                                            </p>
                                        </SectionCard>
                                    )
                                )}

                                <div className="flex items-center justify-between pt-1">
                                    {step < 4 ? (
                                        <button
                                            onClick={handleBack}
                                            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2.5"
                                        >
                                            <ChevronLeft className="w-4 h-4" /> Quay lại
                                        </button>
                                    ) : (
                                        <span />
                                    )}
                                    <button
                                        disabled={submitting}
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 disabled:opacity-50 transition-colors ml-auto"
                                    >
                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {step === 3
                                            ? "Xác nhận & Gửi đăng ký"
                                            : step === 4
                                                ? hasFee
                                                    ? "Thanh toán & Hoàn tất"
                                                    : "Hoàn tất đăng ký"
                                                : "Tiếp tục"}
                                    </button>
                                </div>
                            </div>

                            {/* Cột phải: thông tin phụ theo từng bước */}
                            <div className="space-y-4">
                                {step >= 2 && (
                                    <SectionCard
                                        icon={<User className="w-4.5 h-4.5 text-blue-600" />}
                                        iconBg="#eef2ff"
                                        title="Thông tin đăng ký"
                                    >
                                        <div className="flex items-center gap-3.5 mb-3.5">
                                            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-lg flex-shrink-0">
                                                {initials(form.full_name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {form.full_name || "—"}
                                                </p>
                                                <p className="text-xs text-gray-400">Người đăng ký</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <SummaryRow label="SĐT" value={form.phone || "—"} plain />
                                            <SummaryRow
                                                label="Giới tính"
                                                value={form.gender ? (form.gender === "nam" ? "Nam" : "Nữ") : "—"}
                                                plain
                                            />
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400">Vai trò</span>
                                                {form.gender ? (
                                                    <span
                                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form.gender === "nam"
                                                            ? "bg-blue-50 text-blue-600"
                                                            : "bg-pink-50 text-pink-600"
                                                            }`}
                                                    >
                                                        VĐV {form.gender === "nam" ? "Nam" : "Nữ"}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400">Trình độ</span>
                                                {form.level ? (
                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                                        Trình {form.level}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </div>
                                        </div>
                                    </SectionCard>
                                )}

                                {step === 4 && hasFee && (
                                    <SectionCard
                                        icon={<WalletIcon className="w-4.5 h-4.5 text-red-500" />}
                                        iconBg="#fee2e2"
                                        title="Lệ phí thi đấu"
                                    >
                                        <p className="text-2xl font-bold text-red-500">
                                            {formatCurrency(entryFee)}
                                            <span className="text-xs font-medium text-gray-400"> / người</span>
                                        </p>
                                        <div className="mt-3 space-y-1.5 text-xs">
                                            <SummaryRow label="Số lượng" value="1 người" plain />
                                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                                                <span className="text-gray-500 font-semibold">Tổng cộng</span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(entryFee)}
                                                </span>
                                            </div>
                                        </div>
                                    </SectionCard>
                                )}

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="font-bold text-gray-900 text-sm mb-1.5">
                                        Bạn cần hỗ trợ?
                                    </h3>
                                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                                        Liên hệ BTC qua số điện thoại hoặc Fanpage để được hỗ trợ
                                        nhanh chóng.
                                    </p>
                                    <a
                                        href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Phone className="w-4 h-4" /> Liên hệ BTC
                                    </a>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryRow({
    icon,
    label,
    value,
    plain,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    plain?: boolean;
}) {
    if (plain) {
        return (
            <div className="flex items-center justify-between">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-800 font-medium truncate max-w-[60%] text-right">
                    {value}
                </span>
            </div>
        );
    }
    return (
        <div className="flex items-start gap-2">
            <span className="text-gray-300 mt-0.5">{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="text-gray-800 font-medium break-words sm:truncate">{value}</p>
            </div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">
                {value}
            </span>
        </div>
    );
}

function SuccessView({
    activity,
    registration,
    form,
    hasFee,
    entryFee,
    router,
}: any) {
    const isTransferPending =
        hasFee &&
        registration?.payment_method === "transfer" &&
        registration?.payment_status !== "confirmed";

    return (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5">
                Đăng ký thành công!
            </h2>
            <p className="text-sm text-gray-500 mb-1.5">
                Cảm ơn <b>{form.full_name}</b> đã đăng ký tham gia{" "}
                <b>{activity.title}</b>.
            </p>
            <p className="text-xs text-gray-400 mb-6">
                {isTransferPending
                    ? <>Sau khi BTC xác nhận thanh toán, email xác nhận{hasFee ? " kèm hoá đơn" : ""} sẽ được gửi tới <b>{form.email}</b>.</>
                    : <>Một email xác nhận{hasFee ? " kèm hoá đơn" : ""} đã được gửi tới <b>{form.email}</b>.</>}
            </p>

            <div className="text-left rounded-xl border border-gray-100 divide-y divide-gray-50 mb-6">
                <SummaryLine label="Vai trò" value={`VĐV ${form.gender === "nam" ? "Nam" : "Nữ"} · Trình ${form.level}`} />
                <SummaryLine label="Số điện thoại" value={form.phone} />
                {hasFee && (
                    <SummaryLine label="Lệ phí" value={formatCurrency(entryFee)} />
                )}
                {hasFee && (
                    <SummaryLine
                        label="Phương thức"
                        value={registration?.payment_method === "transfer" ? "Chuyển khoản" : "Tiền mặt"}
                    />
                )}
            </div>

            {/* {isTransferPending && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-left mb-2">
                    <p className="text-sm font-semibold text-blue-700 mb-3">
                        Vui lòng chuyển khoản để hoàn tất đăng ký
                    </p>
                    {vietQrUrl && (
                        <img
                            src={vietQrUrl}
                            alt="VietQR"
                            className="w-44 h-auto mx-auto rounded-lg border border-blue-100 mb-3"
                        />
                    )}
                    <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <p>Ngân hàng: <b>{bankDisplayName}</b></p>
                        <p>Số tài khoản: <b>{bankAccount}</b></p>
                        <p>Chủ tài khoản: <b>{bankAccountName}</b></p>
                        <p>Số tiền: <b>{formatCurrency(entryFee)}</b></p>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2">
                        <span className="font-mono font-semibold text-gray-900 text-sm truncate">
                            {transferRef}
                        </span>
                        <button
                            onClick={copyRef}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            Sao chép
                        </button>
                    </div>
                </div>
            )} */}

            <button
                onClick={() => router.push(`/activities/${activity.id}`)}
                className="mt-6 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-colors"
            >
                Về trang giải đấu
            </button>
        </div>
    );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
        </div>
    );
}
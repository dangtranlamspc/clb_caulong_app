"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Search, UserPlus, X, Wallet, Landmark, Banknote } from "lucide-react";
import { eventsAdminApi, membersAdminApi } from "@/lib/api";

type Mode = "member" | "guest";
type PaymentChoice = "none" | "wallet" | "transfer" | "cash";

interface AdminAddShirtOrderModalProps {
    activityId: string;
    activity: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AdminAddShirtOrderModal({
    activityId,
    activity,
    onSuccess,
    onCancel,
}: AdminAddShirtOrderModalProps) {
    const shirtTypes: any[] = activity?.detail?.shirt_types ?? [];

    const [mode, setMode] = useState<Mode>("member");

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);

    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");

    const [shirtTypeId, setShirtTypeId] = useState(shirtTypes[0]?.id ?? "");
    const [gender, setGender] = useState<"nam" | "nu">("nam");
    const [size, setSize] = useState("");
    const [quantity, setQuantity] = useState<number | "">(1);
    const [payment, setPayment] = useState<PaymentChoice>("none");
    const [submitting, setSubmitting] = useState(false);

    const selectedType = shirtTypes.find((t: any) => t.id === shirtTypeId);
    const sizes: string[] = selectedType?.available_sizes?.[gender] ?? [];
    const price = selectedType?.price_per_shirt ?? 0;
    const total = price * (Number(quantity) || 0);

    useEffect(() => {
        setSize("");
    }, [shirtTypeId, gender]);

    useEffect(() => {
        if (mode === "guest") setPayment((p) => (p === "wallet" || p === "transfer" ? "cash" : p));
    }, [mode]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(query.trim());
                setResults(data ?? []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const canSubmit = useMemo(() => {
        if (!shirtTypeId || !size) return false;
        if (mode === "member" && !selectedMember) return false;
        if (mode === "guest" && !guestName.trim()) return false;
        return true;
    }, [shirtTypeId, size, mode, selectedMember, guestName]);

    const handleSubmit = async () => {
        if (!canSubmit) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }
        setSubmitting(true);
        try {
            await eventsAdminApi.adminAddShirtOrderRegistration(activityId, {
                user_id: mode === "member" ? selectedMember?.id : undefined,
                guest_full_name: mode === "guest" ? guestName.trim() : undefined,
                guest_phone: mode === "guest" ? guestPhone.trim() || undefined : undefined,
                shirt_type_id: shirtTypeId,
                gender,
                size,
                quantity: Number(quantity) || 1,
                payment_method: payment === "none" ? undefined : payment,
            });
            toast.success("Đã thêm đăng ký");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Thêm đăng ký thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pr-8">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" /> Thêm đăng ký
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {activity?.emoji} {activity?.title}
                    </p>
                </div>
            </div>

            {/* ── Chọn loại: thành viên / khách ── */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1">
                <button
                    type="button"
                    onClick={() => setMode("member")}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "member" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                        }`}
                >
                    Thành viên CLB
                </button>
                <button
                    type="button"
                    onClick={() => setMode("guest")}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "guest" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                        }`}
                >
                    Khách (không có tài khoản)
                </button>
            </div>

            {mode === "member" ? (
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-500">
                        Tìm thành viên
                    </label>
                    {selectedMember ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                    {selectedMember.avatar_url ? (
                                        <img
                                            src={selectedMember.avatar_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        selectedMember.full_name?.[0]
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {selectedMember.full_name}
                                    </p>
                                    {selectedMember.phone && (
                                        <p className="text-xs text-gray-500">{selectedMember.phone}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMember(null);
                                    setQuery("");
                                }}
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Nhập tên hoặc SĐT..."
                                className="input-field pl-9"
                            />
                            {(searching || results.length > 0) && query && (
                                <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                                    {searching ? (
                                        <div className="flex items-center justify-center py-4 text-gray-400 text-sm gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tìm...
                                        </div>
                                    ) : (
                                        results.map((m: any) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMember(m);
                                                    setResults([]);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 overflow-hidden flex-shrink-0">
                                                    {m.avatar_url ? (
                                                        <img
                                                            src={m.avatar_url}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        m.full_name?.[0]
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {m.full_name}
                                                    </p>
                                                    {m.phone && (
                                                        <p className="text-xs text-gray-400">{m.phone}</p>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                            Họ tên khách
                        </label>
                        <input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                            SĐT (tuỳ chọn)
                        </label>
                        <input
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="09xxxxxxxx"
                            className="input-field"
                        />
                    </div>
                </div>
            )}

            {/* ── Loại áo ── */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Loại áo
                </label>
                <div className="flex flex-wrap gap-2">
                    {shirtTypes.map((t: any) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setShirtTypeId(t.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${shirtTypeId === t.id
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-200"
                                }`}
                        >
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Giới tính + Size ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Giới tính
                    </label>
                    <div className="flex gap-2">
                        {(["nam", "nu"] as const).map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGender(g)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${gender === g
                                    ? g === "nu"
                                        ? "bg-pink-600 text-white border-pink-600"
                                        : "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                {g === "nu" ? "Nữ" : "Nam"}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Số lượng
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQuantity(val === "" ? "" : Number(val));
                        }}
                        onBlur={() => {
                            if (quantity === "" || (quantity as number) < 1) setQuantity(1);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="input-field"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Size
                </label>
                {sizes.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        Chưa có size cho {gender === "nu" ? "Nữ" : "Nam"} ở loại áo này
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {sizes.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSize(s)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${size === s
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Thanh toán ── */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setPayment("none")}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "none"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-200"
                            }`}
                    >
                        Chưa thanh toán
                    </button>
                    <button
                        type="button"
                        disabled={mode === "guest"}
                        onClick={() => setPayment("wallet")}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${payment === "wallet"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200"
                            }`}
                    >
                        <Wallet className="w-3.5 h-3.5" /> Ví BNB
                    </button>
                    <button
                        type="button"
                        disabled={mode === "guest"}
                        onClick={() => setPayment("transfer")}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${payment === "transfer"
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-white text-gray-600 border-gray-200"
                            }`}
                    >
                        <Landmark className="w-3.5 h-3.5" /> Chuyển khoản
                    </button>
                    <button
                        type="button"
                        onClick={() => setPayment("cash")}
                        className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${payment === "cash"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-gray-600 border-gray-200"
                            }`}
                    >
                        <Banknote className="w-3.5 h-3.5" /> Tiền mặt
                    </button>
                </div>

                {payment === "wallet" && (
                    <p className="text-xs text-blue-600 mt-2">
                        Số dư ví của thành viên sẽ bị trừ ngay và ghi lại lịch sử giao dịch.
                    </p>
                )}
                {payment === "transfer" && (
                    <p className="text-xs text-sky-600 mt-2">
                        Hệ thống sẽ gửi yêu cầu chuyển khoản đến thành viên, chờ admin xác nhận sau.
                    </p>
                )}
                {payment === "cash" && (
                    <p className="text-xs text-emerald-600 mt-2">
                        Đăng ký sẽ được đánh dấu "Đã xác nhận" ngay lập tức.
                    </p>
                )}
                {mode === "guest" && (
                    <p className="text-xs text-gray-400 mt-2">
                        Khách không có tài khoản nên chỉ hỗ trợ tiền mặt hoặc để trống.
                    </p>
                )}
            </div>

            {/* ── Tổng tiền ── */}
            {price > 0 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-500">Tổng tiền</span>
                    <span className="text-lg font-bold text-gray-900">
                        {Math.round(total).toLocaleString("vi-VN")}đ
                    </span>
                </div>
            )}

            {/* ── Actions ── */}
            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                    Huỷ
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Xác nhận
                </button>
            </div>
        </div>
    );
}
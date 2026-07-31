"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    CalendarDays,
    ChevronRight,
    MapPin,
    Users,
    Zap,
    Loader2,
    UserPlus,
    X as XIcon,
    AlertCircle,
    CheckCircle2,
    Clock3,
    Hourglass,
    CreditCard,
    Lock
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { sessionsApi, registrationsApi, usersApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

const SKILL_OPTIONS = [
    { value: "yeu", label: "Yếu" },
    { value: "trung_binh_yeu", label: "TB yếu" },
    { value: "trung_binh", label: "TB" },
    { value: "trung_binh_cong", label: "TB+" },
    { value: "ban_chuyen", label: "Bán chuyên" },
    { value: "chuyen_nghiep", label: "Chuyên nghiệp" },
];

const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
    pending_approval: {
        label: "Chờ admin duyệt",
        icon: Hourglass,
        cls: "bg-orange-50 text-orange-600 border-orange-200",
    },
    awaiting_checkin: {
        label: "Chờ điểm danh",
        icon: Hourglass,
        cls: "bg-slate-50 text-slate-600 border-slate-200",
    },
    awaiting_finish: {
        label: "Chờ buổi đánh kết thúc",
        icon: Hourglass,
        cls: "bg-slate-50 text-slate-600 border-slate-200",
    },
    // pending: {
    //     label: "Chờ thanh toán",
    //     icon: Hourglass,
    //     cls: "bg-amber-50 text-amber-700 border-amber-200",
    // },
    pending_review: {
        label: "Chờ admin xác nhận",
        icon: Clock3,
        cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    confirmed: {
        label: "Đã xác nhận thanh toán",
        icon: CheckCircle2,
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    rejected: {
        label: "Thanh toán bị từ chối",
        icon: AlertCircle,
        cls: "bg-red-50 text-red-500 border-red-200",
    },
};

function getSessionStatusBadge(s: any) {
    const myReg = s.my_registration;
    const effectiveStatus = s.status;
    const isAwaitingAdminFinish = s.status === "waiting_payment" && s.all_paid;

    const cls =
        myReg && (effectiveStatus === "open" || effectiveStatus === "full")
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
                                    : "bg-gray-100 text-gray-500";

    const label =
        myReg && (effectiveStatus === "open" || effectiveStatus === "full")
            ? "Bạn đã đăng ký"
            : effectiveStatus === "open"
                ? "Đang mở đăng ký"
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

    return { label, cls };
}

function AddCompanionModal({
    session,
    onClose,
    onDone,
}: {
    session: any;
    onClose: () => void;
    onDone: () => void;
}) {
    const { user } = useAuthStore();
    const [visible, setVisible] = useState(false);
    const [tab, setTab] = useState<"account" | "guest">("account");
    const [memberSearch, setMemberSearch] = useState("");
    const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
    const [searchingMembers, setSearchingMembers] = useState(false);
    const [selectedCompanion, setSelectedCompanion] = useState<any>(null);
    const [guestForm, setGuestForm] = useState({
        full_name: "",
        gender: "male",
        skill_level: "",
    });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (tab !== "account") return;
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
    }, [memberSearch, tab]);

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const myRegId = session.my_registration?.id;

    const handleAdd = async () => {
        if (!myRegId) return;
        if (tab === "account") {
            if (!selectedCompanion) {
                toast.error("Vui lòng chọn thành viên đi cùng");
                return;
            }
            setAdding(true);
            try {
                await registrationsApi.addGuest(myRegId, {
                    user_id: selectedCompanion.id,
                });
                toast.success(`Đã thêm ${selectedCompanion.full_name} đi cùng bạn`);
                onDone();
                close();
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Thêm thất bại");
            } finally {
                setAdding(false);
            }
        } else {
            if (!guestForm.full_name.trim()) {
                toast.error("Vui lòng nhập họ tên khách");
                return;
            }
            setAdding(true);
            try {
                await registrationsApi.addGuest(myRegId, {
                    guest_full_name: guestForm.full_name.trim(),
                    guest_gender: guestForm.gender,
                    guest_skill_level: guestForm.skill_level || undefined,
                });
                toast.success(`Đã thêm khách ${guestForm.full_name} đi cùng bạn`);
                onDone();
                close();
            } catch (err: any) {
                toast.error(err?.response?.data?.message ?? "Thêm khách thất bại");
            } finally {
                setAdding(false);
            }
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{
                background: visible ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
                transition: "background 250ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <div
                className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
                style={{
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    opacity: visible ? 1 : 0,
                    transition:
                        "transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Thêm người đi cùng</h3>
                    <button onClick={close} className="p-1 text-gray-400 hover:text-gray-600">
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
                            onClick={() => setTab(val as any)}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${tab === val ? "bg-blue-50 text-blue-600" : "text-gray-400"
                                }`}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                <div className="p-5 space-y-3">
                    {tab === "account" ? (
                        <>
                            <input
                                autoFocus
                                value={memberSearch}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value);
                                    setSelectedCompanion(null);
                                }}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                placeholder="Tìm theo tên hoặc số điện thoại..."
                            />

                            {selectedCompanion && (
                                <div className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-blue-50 border border-blue-200">
                                    <span className="flex-1 text-sm font-medium text-blue-700 truncate">
                                        {selectedCompanion.full_name}
                                    </span>
                                    <button
                                        onClick={() => setSelectedCompanion(null)}
                                        className="w-5 h-5 rounded-full hover:bg-blue-200 flex items-center justify-center flex-shrink-0"
                                    >
                                        <XIcon className="w-3.5 h-3.5 text-blue-600" />
                                    </button>
                                </div>
                            )}

                            {!selectedCompanion && (
                                <div className="max-h-60 overflow-y-auto -mx-1 border border-gray-100 rounded-xl">
                                    {searchingMembers ? (
                                        <p className="text-sm text-gray-400 text-center py-4">
                                            Đang tìm...
                                        </p>
                                    ) : memberSearchResults.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-4">
                                            {memberSearch.trim()
                                                ? "Không tìm thấy thành viên"
                                                : "Nhập tên hoặc số điện thoại để tìm"}
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-gray-50">
                                            {memberSearchResults
                                                .filter((m: any) => m.id !== user?.id)
                                                .map((m: any) => (
                                                    <li key={m.id}>
                                                        <button
                                                            onClick={() => setSelectedCompanion(m)}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {m.avatar_url ? (
                                                                    <img
                                                                        src={m.avatar_url}
                                                                        alt={m.full_name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-semibold text-blue-700">
                                                                        {m.full_name?.[0]?.toUpperCase() ?? "?"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                                    {m.full_name}
                                                                </p>
                                                                <p className="text-xs text-gray-400">{m.phone}</p>
                                                            </div>
                                                        </button>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                                ⓘ {selectedCompanion?.full_name ?? "Thành viên"} sẽ nhận thông
                                báo được thêm vào buổi. Tiền có thể gộp vào ví của bạn hoặc để
                                họ tự thanh toán.
                            </p>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ tên *
                                </label>
                                <input
                                    autoFocus
                                    value={guestForm.full_name}
                                    onChange={(e) =>
                                        setGuestForm((f) => ({ ...f, full_name: e.target.value }))
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
                                    <CustomSelect
                                        value={guestForm.gender}
                                        onChange={(val) => setGuestForm((f) => ({ ...f, gender: val }))}
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
                                        options={SKILL_OPTIONS}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                                ⓘ Tiền của khách đi cùng sẽ được gộp vào số tiền bạn cần thanh
                                toán sau khi buổi kết thúc.
                            </p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                    <button
                        onClick={close}
                        className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={
                            adding ||
                            (tab === "account" ? !selectedCompanion : !guestForm.full_name.trim())
                        }
                        className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {adding && <Loader2 className="w-4 h-4 animate-spin" />} Thêm vào buổi
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

interface UpcomingSessionsSectionProps {
    upcoming: any[];
    loading: boolean;
    onOpenParticipants: (sessionId: string, title: string) => void;
}

export function UpcomingSessionsSection({
    upcoming,
    loading,
    onOpenParticipants,
}: UpcomingSessionsSectionProps) {
    const { user } = useAuthStore();
    const [localSessions, setLocalSessions] = useState<any[]>(upcoming);
    const [registeringId, setRegisteringId] = useState<string | null>(null);
    const [companionModalSession, setCompanionModalSession] = useState<any>(null);

    useEffect(() => {
        setLocalSessions(upcoming);
    }, [upcoming]);

    const refetchSession = useCallback(async (sessionId: string) => {
        try {
            const { data } = await sessionsApi.get(sessionId);
            setLocalSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, ...data } : s)),
            );
        } catch {
        }
    }, []);

    useEffect(() => {
        if (!user?.id || localSessions.length === 0) return;

        const channel = supabase
            .channel(`home-upcoming-sessions:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "registrations" },
                (payload: any) => {
                    const sid =
                        (payload.new as any)?.session_id ?? (payload.old as any)?.session_id;
                    if (sid && localSessions.some((s) => s.id === sid)) {
                        refetchSession(sid);
                    }
                },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sessions" },
                (payload: any) => {
                    const sid = (payload.new as any)?.id ?? (payload.old as any)?.id;
                    if (sid && localSessions.some((s) => s.id === sid)) {
                        refetchSession(sid);
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, localSessions.map((s) => s.id).join(","), refetchSession]);

    useEffect(() => {
        if (localSessions.length === 0) return;

        const channels = localSessions.map((s) =>
            supabase
                .channel(`session:${s.id}`)
                .on("broadcast", { event: "session_updated" }, () => {
                    refetchSession(s.id);
                })
                .subscribe(),
        );

        return () => {
            channels.forEach((c) => supabase.removeChannel(c));
        };
    }, [localSessions.map((s) => s.id).join(","), refetchSession]);

    const handleRegister = async (sessionId: string) => {
        if (registeringId) return;
        setRegisteringId(sessionId);
        try {
            const { data } = await registrationsApi.register({
                session_id: sessionId,
            });
            toast.success("Đăng ký thành công! Vui lòng chờ admin duyệt.");
            setLocalSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? {
                            ...s,
                            my_registration: data.registration,
                            available_slots: s.available_slots - 1,
                        }
                        : s,
                ),
            );
            refetchSession(sessionId);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
        } finally {
            setTimeout(() => setRegisteringId(null), 500);
        }
    };

    const displaySessions = localSessions
        .filter((s) => s.status !== "completed" && s.status !== "cancelled")
        .sort(
            (a, b) =>
                new Date(b.created_at ?? b.scheduled_at).getTime() -
                new Date(a.created_at ?? a.scheduled_at).getTime(),
        )
        .slice(0, 4);

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-blue-300" />
                    <h3 className="font-bold text-gray-600 text-sm">
                        Buổi đánh gần đây
                    </h3>
                </div>
                <Link
                    href="/sessions"
                    className="text-xs text-blue-600 font-semibold flex items-center gap-0.5"
                >
                    Tất cả <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {(() => null)()}

            {loading ? (
                <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
                    ))}
                </div>
            ) : displaySessions.length === 0 ? (
                <div className="bg-white rounded-2xl py-10 text-center border border-dashed border-gray-200">
                    <CalendarDays className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                    <p className="text-gray-400 text-sm">Chưa có buổi đánh nào</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {displaySessions.map((s, index) => {
                        const myReg = s.my_registration;
                        const isFull = s.available_slots <= 0;

                        const total = s.max_slots ?? s.total_slots ?? null;
                        const filled = total ? total - s.available_slots : null;
                        const pct = total
                            ? Math.min(100, Math.round((filled! / total) * 100))
                            : 0;

                        const slotStatus: "plenty" | "low" | "full" = isFull
                            ? "full"
                            : pct >= 80
                                ? "low"
                                : "plenty";

                        const STATUS_STYLE = {
                            plenty: {
                                text: "text-emerald-600",
                                barBg:
                                    "bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500",
                                animate: true,
                            },
                            low: {
                                text: "text-amber-600",
                                barBg:
                                    "bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500",
                                animate: true,
                            },
                            full: {
                                text: "text-red-500",
                                barBg: "bg-red-500",
                                animate: false,
                            },
                        }[slotStatus];

                        const canRegister = s.status === "open" && !isFull && !myReg;
                        const canAddCompanion =
                            myReg && (s.status === "open" || s.status === "full");
                        const canPay =
                            myReg &&
                            myReg.amount_override > 0 &&
                            myReg.payment_status === "pending" &&
                            !myReg.payment_reference &&
                            myReg.participation_status === "confirmed";
                        const statusBadge = getSessionStatusBadge(s);
                        const isRegisteringThis = registeringId === s.id;

                        const effectiveStatus =
                            myReg?.participation_status === "pending_approval"
                                ? "pending_approval"
                                : myReg?.participation_status === "awaiting_checkin"
                                    ? "awaiting_checkin"
                                    : myReg?.payment_status === "pending" &&
                                        myReg?.amount_override == null
                                        ? "awaiting_finish"
                                        : myReg?.payment_status === "pending" &&
                                            myReg?.payment_reference
                                            ? "pending_review"
                                            : myReg?.payment_status;
                        const regCfg = effectiveStatus
                            ? (REG_CFG[effectiveStatus] ?? REG_CFG.pending)
                            : null;
                        const RegIcon = regCfg?.icon;

                        return (
                            <div
                                key={s.id}
                                style={{
                                    boxShadow:
                                        "0 8px 24px -4px rgba(30, 64, 175, 0.12), 0 4px 10px -2px rgba(0,0,0,0.06)",
                                }}
                                className={`relative bg-white rounded-2xl p-5 border transition-all ${myReg ? "border-blue-200" : "border-gray-100"
                                    }`}
                            >
                                {isFull && (
                                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 shadow-md shadow-red-200 flex items-center justify-center z-10"
                                        title="Buổi đã đầy chỗ"
                                    >
                                        <Lock className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )
                                }
                                <Link href={`/sessions/${s.id}`}>
                                    <div className="flex items-start justify-between gap-3 active:scale-99 transition-transform">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm truncate">
                                                {s.title}
                                            </p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {format(new Date(s.scheduled_at), "EEE dd/MM HH:mm", {
                                                        locale: vi,
                                                    })}
                                                </span>
                                                {s.location && (
                                                    <span className="flex items-center gap-1 min-w-0">
                                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{s.location}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {total ? (
                                                <div className="mt-3 w-full">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-semibold text-gray-400">
                                                            Đã đăng ký
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${STATUS_STYLE.text}`}>
                                                            {filled}/{total}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${STATUS_STYLE.barBg}`}
                                                            style={{
                                                                width: `${pct}%`,
                                                                backgroundSize: STATUS_STYLE.animate
                                                                    ? "200% 100%"
                                                                    : "100% 100%",
                                                                animation: STATUS_STYLE.animate
                                                                    ? "energyFlow 2s linear infinite, growBar 0.8s ease-out"
                                                                    : "growBar 0.8s ease-out",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${isFull ? "text-red-400" : "text-emerald-500"
                                                        }`}
                                                >
                                                    <Users className="w-3 h-3" />
                                                    {isFull ? "Hết chỗ" : `Còn ${s.available_slots} chỗ`}
                                                </span>
                                            )}
                                        </div>
                                        {statusBadge && !(isFull && !myReg) && (
                                            <span
                                                className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${statusBadge.cls}`}
                                            >
                                                {statusBadge.label}
                                            </span>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex items-center justify-between mt-5 gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onOpenParticipants(s.id, s.title);
                                            }}
                                            className="h-9 pl-3 pr-3.5 rounded-full bg-blue-50 flex items-center gap-1.5 active:scale-90 transition-transform flex-shrink-0"
                                        >
                                            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-xs font-bold text-blue-600">{filled ?? 0}</span>
                                            {(s.male_count > 0 || s.female_count > 0) && (
                                                <span className="flex items-center gap-1 ml-1 pl-1.5 border-l border-blue-200">
                                                    <span className="text-[11px] font-semibold text-blue-500">👨 {s.male_count ?? 0}</span>
                                                    <span className="text-[11px] font-semibold text-pink-500">👩 {s.female_count ?? 0}</span>
                                                </span>
                                            )}
                                        </button>

                                        {myReg && regCfg && (
                                            <span
                                                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${regCfg.cls}`}
                                            >
                                                <RegIcon className="w-3.5 h-3.5" />
                                                {regCfg.label}
                                            </span>
                                        )}
                                    </div>

                                    {canRegister ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleRegister(s.id);
                                            }}
                                            disabled={isRegisteringThis}
                                            className={`flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white bg-blue-600 shadow-sm shadow-blue-200 active:scale-95 transition-all duration-300 ease-out overflow-hidden ${isRegisteringThis
                                                ? "w-9 h-9 rounded-full gap-0 p-0"
                                                : "w-auto h-9 gap-1.5 px-4 rounded-full"
                                                }`}
                                            style={{
                                                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                                            }}
                                        >
                                            {isRegisteringThis ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Đăng ký ngay"
                                            )}
                                        </button>
                                    ) : canPay ? (
                                        <Link
                                            href={`/sessions/${s.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200 active:scale-95 transition-all px-4 h-9 rounded-full animate-pulse"
                                        >
                                            <CreditCard className="w-3.5 h-3.5" /> Chi tiết thanh toán
                                        </Link>
                                    ) : canAddCompanion ? (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setCompanionModalSession(s);
                                            }}
                                            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" /> Thêm
                                        </button>
                                    ) : isFull && !myReg ? (
                                        <span className="flex-shrink-0 text-xs font-semibold text-white bg-red-500 px-4 py-2 rounded-full">
                                            Hết chỗ
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}

                    <style jsx>{`
                        @keyframes energyFlow {
                        0% {
                            background-position: 0% 0%;
                        }
                        100% {
                            background-position: -200% 0%;
                        }
                        }
                        @keyframes growBar {
                        from {
                            width: 0%;
                        }
                        }
                    `}</style>
                </div>
            )
            }

            {
                companionModalSession && (
                    <AddCompanionModal
                        session={companionModalSession}
                        onClose={() => setCompanionModalSession(null)}
                        onDone={() => refetchSession(companionModalSession.id)}
                    />
                )
            }
        </section >
    );
}
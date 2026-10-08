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
import { c, alpha } from "@/lib/theme";
import DebtWarningModal from "../sessions/DebtWarningModal";

const SKILL_OPTIONS = [
    { value: "yeu", label: "Yếu" },
    { value: "trung_binh_yeu", label: "TB yếu" },
    { value: "trung_binh", label: "TB" },
    { value: "trung_binh_cong", label: "TB+" },
    { value: "ban_chuyen", label: "Bán chuyên" },
    { value: "chuyen_nghiep", label: "Chuyên nghiệp" },
];

const mix = (v: string, p: number) => `color-mix(in_srgb,var(--${v})_${p}%,transparent)`;

const TONE = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
    muted: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
};

const SELECT_FIX =
    "[&_*]:!text-[var(--text)] [&_button]:!bg-[var(--surface-muted)] [&_button]:!border-[var(--border)] [&_svg]:!text-[var(--text-muted)]";

const INPUT =
    "w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] placeholder:text-[var(--text-faint)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]";

const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
    pending_approval: { label: "Chờ admin duyệt", icon: Hourglass, cls: TONE.warning },
    awaiting_checkin: { label: "Chờ điểm danh", icon: Hourglass, cls: TONE.muted },
    awaiting_finish: { label: "Chờ buổi đánh kết thúc", icon: Hourglass, cls: TONE.muted },
    pending_review: { label: "Chờ admin xác nhận", icon: Clock3, cls: TONE.primary },
    confirmed: { label: "Đã xác nhận thanh toán", icon: CheckCircle2, cls: TONE.success },
    rejected: { label: "Thanh toán bị từ chối", icon: AlertCircle, cls: TONE.danger },
};

function getSessionStatusBadge(s: any) {
    const myReg = s.my_registration;
    const st = s.status;
    const isAwaitingAdminFinish = st === "waiting_payment" && s.all_paid;

    const BADGE = {
        primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
        success: "bg-[var(--success-soft)] text-[var(--success)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
        muted: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    };

    if (myReg && (st === "open" || st === "full"))
        return { label: "Bạn đã đăng ký", cls: BADGE.primary };
    if (st === "open") return { label: "Đang mở đăng ký", cls: BADGE.success };
    if (st === "full") return { label: "Đã đầy", cls: BADGE.warning };
    if (isAwaitingAdminFinish) return { label: "Chờ admin hoàn thành", cls: BADGE.primary };
    if (st === "waiting_payment") return { label: "Chờ thanh toán", cls: BADGE.warning };
    if (st === "completed") return { label: "Hoàn thành", cls: BADGE.muted };
    if (st === "cancelled") return { label: "Đã hủy", cls: BADGE.danger };
    return { label: st, cls: BADGE.muted };
}

export function AddCompanionModal({
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


    const accountPanelRef = useRef<HTMLDivElement>(null);
    const guestPanelRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const guestNameRef = useRef<HTMLInputElement>(null);
    const firstRender = useRef(true);
    const [heights, setHeights] = useState<{ account?: number; guest?: number }>({});
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const a = accountPanelRef.current;
        const g = guestPanelRef.current;
        if (!a || !g) return;
        const measure = () =>
            setHeights({ account: a.offsetHeight, guest: g.offsetHeight });
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(a);
        ro.observe(g);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const focusTab = () =>
            (tab === "account" ? searchInputRef : guestNameRef).current?.focus({
                preventScroll: true,
            });

        if (firstRender.current) {
            firstRender.current = false;
            const t = setTimeout(focusTab, 300);
            return () => clearTimeout(t);
        }
        setAnimating(true);
        const t = setTimeout(() => {
            setAnimating(false);
            focusTab();
        }, 320);
        return () => clearTimeout(t);
    }, [tab]);

    const panelStyle = (active: boolean): React.CSSProperties => ({
        opacity: active ? 1 : 0,
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
        transition: `opacity 250ms ease-out, visibility 0s linear ${active ? "0s" : "300ms"}`,
    });

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const myRegId = session.my_registration?.id;

    const handleAdd = async () => {
        if (!myRegId) {
            console.error("[AddCompanionModal] thiếu my_registration.id", session);
            toast.error("Không tìm thấy đăng ký của bạn, vui lòng tải lại trang");
            return;
        }
        if (String(myRegId).startsWith("temp-")) {
            toast.error("Đăng ký đang được xử lý, thử lại sau giây lát");
            return;
        }
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
                background: visible ? c.overlay : "rgba(0,0,0,0)",
                transition: "background 250ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <style jsx global>{`
                @keyframes companionTabRight {
                    from { opacity: 0; transform: translateX(16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes companionTabLeft {
                    from { opacity: 0; transform: translateX(-16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .companion-tab-right { animation: companionTabRight 280ms cubic-bezier(0.32,0.72,0,1) both; }
                .companion-tab-left { animation: companionTabLeft 280ms cubic-bezier(0.32,0.72,0,1) both; }

                @media (prefers-reduced-motion: reduce) {
                    .companion-tab-right, .companion-tab-left { animation: none; }
                }
            `}</style>
            <div
                className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                style={{
                    boxShadow: c.shadowStrong,
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 280ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <h3 className="font-bold text-[var(--text)]">Thêm người đi cùng</h3>
                    <button onClick={close} className="p-1 text-[var(--text-faint)] hover:text-[var(--text)]">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 pt-3">
                    <div className="relative flex p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                        {/* Ô nền trượt giữa 2 tab */}
                        <span
                            aria-hidden
                            className="absolute top-1 bottom-1 left-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)]"
                            style={{
                                width: "calc((100% - 0.5rem) / 2)",
                                transform: `translateX(${tab === "account" ? 0 : 100}%)`,
                                transition: "transform 300ms cubic-bezier(0.32,0.72,0,1)",
                            }}
                        />
                        {[
                            ["account", "Có tài khoản"],
                            ["guest", "Khách không tài khoản"],
                        ].map(([val, lbl]) => (
                            <button
                                key={val}
                                onClick={() => setTab(val as any)}
                                className="relative z-10 flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                                style={{ color: tab === val ? c.primary : c.textMuted }}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    style={{
                        height: heights[tab],
                        transition: "height 300ms cubic-bezier(0.32,0.72,0,1)",
                        overflowX: "clip",
                        overflowY: animating ? "hidden" : "visible",
                    }}
                >
                    <div
                        className="flex items-start w-[200%]"
                        style={{
                            transform: `translateX(${tab === "account" ? 0 : -50}%)`,
                            transition: "transform 300ms cubic-bezier(0.32,0.72,0,1)",
                        }}
                    >
                        <div
                            ref={accountPanelRef}
                            aria-hidden={tab !== "account"}
                            className="w-1/2 p-5 space-y-3"
                            style={panelStyle(tab === "account")}
                        >
                            <input
                                ref={searchInputRef}
                                value={memberSearch}
                                onChange={(e) => {
                                    setMemberSearch(e.target.value);
                                    setSelectedCompanion(null);
                                }}
                                className={INPUT}
                                placeholder="Tìm theo tên hoặc số điện thoại..."
                            />

                            {selectedCompanion && (
                                <div className={`flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl border ${TONE.primary}`}>
                                    <span className="flex-1 text-sm font-medium truncate">
                                        {selectedCompanion.full_name}
                                    </span>
                                    <button
                                        onClick={() => setSelectedCompanion(null)}
                                        className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center flex-shrink-0"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {!selectedCompanion && (
                                <div className="max-h-60 overflow-y-auto -mx-1 border border-[var(--border)] rounded-xl">
                                    {searchingMembers ? (
                                        <p className="text-sm text-[var(--text-faint)] text-center py-4">Đang tìm...</p>
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
                                                                    <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-semibold text-[var(--primary)]">
                                                                        {m.full_name?.[0]?.toUpperCase() ?? "?"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-[var(--text)] truncate">{m.full_name}</p>
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
                                ⓘ {selectedCompanion?.full_name ?? "Thành viên"} sẽ nhận thông báo được thêm vào buổi.
                                Tiền có thể gộp vào ví của bạn hoặc để họ tự thanh toán.
                            </p>
                        </div>

                        <div
                            ref={guestPanelRef}
                            aria-hidden={tab !== "guest"}
                            className="w-1/2 p-5 space-y-3"
                            style={panelStyle(tab === "guest")}
                        >
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Họ tên *</label>
                                <input
                                    ref={guestNameRef}
                                    value={guestForm.full_name}
                                    onChange={(e) => setGuestForm((f) => ({ ...f, full_name: e.target.value }))}
                                    className={INPUT}
                                    placeholder="Tên khách đi cùng"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Giới tính</label>
                                    <div className={SELECT_FIX}>
                                        <CustomSelect
                                            value={guestForm.gender}
                                            onChange={(val) => setGuestForm((f) => ({ ...f, gender: val }))}
                                            options={[
                                                { value: "male", label: "Nam" },
                                                { value: "female", label: "Nữ" },
                                            ]}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Trình độ</label>
                                    <div className={SELECT_FIX}>
                                        <CustomSelect
                                            value={guestForm.skill_level}
                                            onChange={(val) => setGuestForm((f) => ({ ...f, skill_level: val }))}
                                            placeholder="-- Chọn --"
                                            options={SKILL_OPTIONS}
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--primary)] bg-[var(--primary-soft)] rounded-lg px-3 py-2">
                                ⓘ Tiền của khách đi cùng sẽ được gộp vào số tiền bạn cần thanh toán sau khi buổi kết thúc.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex justify-end gap-3 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface)]">
                    <button
                        onClick={close}
                        className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={adding || (tab === "account" ? !selectedCompanion : !guestForm.full_name.trim())}
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

function ConfirmCancelModal({
    session,
    loading,
    onClose,
    onConfirm,
}: {
    session: any;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: c.overlay }}
            onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
                style={{ boxShadow: c.shadowStrong }}
            >
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--danger-soft)] flex items-center justify-center mb-3">
                    <XIcon className="w-6 h-6 text-[var(--danger)]" />
                </div>
                <h3 className="font-bold text-[var(--text)]">Huỷ đăng ký buổi này?</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-snug">
                    Bạn sẽ không còn trong danh sách của buổi{" "}
                    <span className="font-semibold text-[var(--text)]">{session.title}</span>.
                    Người đi cùng (nếu có) cũng sẽ bị gỡ theo.
                </p>
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                        Giữ lại
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />} Huỷ đăng ký
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
    const [cancelSession, setCancelSession] = useState<any>(null);
    const [cancelling, setCancelling] = useState(false);
    const [debtWarning, setDebtWarning] = useState<number | null>(null);

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
            channels.forEach((ch) => supabase.removeChannel(ch));
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
            const data = err?.response?.data;
            if (data?.code === "WALLET_DEBT_BLOCK") {
                setDebtWarning(Number(data.debt) || 0);
            } else {
                toast.error(data?.message ?? "Đăng ký thất bại");
            }
        } finally {
            setTimeout(() => setRegisteringId(null), 500);
        }
    };

    const handleCancel = async () => {
        const s = cancelSession;
        const regId = s?.my_registration?.id;
        if (!regId || cancelling) return;
        setCancelling(true);
        try {
            await registrationsApi.cancel(regId);
            toast.success("Đã huỷ đăng ký");
            setLocalSessions((prev) =>
                prev.map((x) =>
                    x.id === s.id
                        ? { ...x, my_registration: null, available_slots: x.available_slots + 1 }
                        : x,
                ),
            );
            setCancelSession(null);
            refetchSession(s.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Huỷ đăng ký thất bại");
        } finally {
            setCancelling(false);
        }
    };

    const displaySessions = localSessions
        .filter((s) => s.status !== "completed" && s.status !== "cancelled")
        .sort(
            (a, b) =>
                new Date(a.scheduled_at).getTime() -
                new Date(b.scheduled_at).getTime(),
        )
        .slice(0, 4);

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[var(--primary)]" />
                    <h3 className="font-bold text-[var(--text-muted)] text-sm">Buổi đánh gần đây</h3>
                </div>
                <Link href="/sessions" className="text-xs text-[var(--primary)] font-semibold flex items-center gap-0.5">
                    Tất cả <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl h-24 animate-pulse" />
                    ))}
                </div>
            ) : displaySessions.length === 0 ? (
                <div className="bg-[var(--surface)] rounded-2xl py-10 text-center border border-dashed border-[var(--border-strong)]">
                    <CalendarDays className="w-8 h-8 mx-auto text-[var(--text-faint)] mb-2" />
                    <p className="text-[var(--text-faint)] text-sm">Chưa có buổi đánh nào</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {displaySessions.map((s) => {
                        const myReg = s.my_registration;
                        const isFull = s.available_slots <= 0;

                        const total = s.max_slots ?? s.total_slots ?? null;
                        const filled = total ? total - s.available_slots : null;
                        const pct = total ? Math.min(100, Math.round((filled! / total) * 100)) : 0;

                        const slotStatus: "plenty" | "low" | "full" = isFull ? "full" : pct >= 80 ? "low" : "plenty";

                        const STATUS_STYLE = {
                            plenty: {
                                text: "text-[var(--success)]",
                                barBg: "bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500",
                            },
                            low: {
                                text: "text-[var(--warning)]",
                                barBg: "bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500",
                            },
                            full: { text: "text-[var(--danger)]", barBg: "bg-red-500" },
                        }[slotStatus];

                        const canRegister = s.status === "open" && !isFull && !myReg;
                        const canAddCompanion = myReg && (s.status === "open" || s.status === "full");
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
                                    : myReg?.payment_status === "pending" && myReg?.amount_override == null
                                        ? "awaiting_finish"
                                        : myReg?.payment_status === "pending" && myReg?.payment_reference
                                            ? "pending_review"
                                            : myReg?.payment_status;
                        const regCfg = effectiveStatus ? (REG_CFG[effectiveStatus] ?? null) : null;
                        const RegIcon = regCfg?.icon;

                        return (
                            <div
                                key={s.id}
                                className="relative rounded-2xl p-5 border transition-all"
                                style={{
                                    background: c.surface,
                                    borderColor: myReg ? alpha("primary", 40) : c.border,
                                    boxShadow: c.shadow,
                                }}
                            >
                                {isFull && (
                                    <div
                                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 shadow-md shadow-red-200 flex items-center justify-center z-10"
                                        title="Buổi đã đầy chỗ"
                                    >
                                        <Lock className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                                <Link href={`/sessions/${s.id}`}>
                                    <div className="flex items-start justify-between gap-3 active:scale-99 transition-transform">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-[var(--text)] text-sm truncate">{s.title}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {format(new Date(s.scheduled_at), "EEE dd/MM HH:mm", { locale: vi })}
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
                                                        <span className="text-[10px] font-semibold text-[var(--text-faint)]">
                                                            Đã đăng ký
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${STATUS_STYLE.text}`}>
                                                            {filled}/{total}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${STATUS_STYLE.barBg}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${isFull ? "text-[var(--danger)]" : "text-[var(--success)]"
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
                                            className="h-9 pl-3 pr-3.5 rounded-full bg-[var(--primary-soft)] flex items-center gap-1.5 active:scale-90 transition-transform flex-shrink-0"
                                        >
                                            <Users className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                                            <span className="text-xs font-bold text-[var(--primary)]">{s.approved_count ?? filled ?? 0}</span>
                                            {(s.male_count > 0 || s.female_count > 0) && (
                                                <span className="flex items-center gap-1 ml-1 pl-1.5 border-l border-[color-mix(in_srgb,var(--primary)_30%,transparent)]">
                                                    <span className="text-[11px] font-semibold text-[var(--primary)]">
                                                        👨 {s.male_count ?? 0}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-[var(--pink)]">
                                                        👩 {s.female_count ?? 0}
                                                    </span>
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
                                            className={`flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white bg-blue-600 shadow-sm shadow-blue-200/30 active:scale-95 transition-all duration-300 ease-out overflow-hidden ${isRegisteringThis
                                                ? "w-9 h-9 rounded-full gap-0 p-0"
                                                : "w-auto h-9 gap-1.5 px-4 rounded-full"
                                                }`}
                                            style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
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
                                            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200/30 active:scale-95 transition-all px-4 h-9 rounded-full animate-pulse"
                                        >
                                            <CreditCard className="w-3.5 h-3.5" /> Chi tiết thanh toán
                                        </Link>
                                    ) : canAddCompanion ? (
                                        <div className="flex-shrink-0 flex items-center gap-2">
                                            <button
                                                type="button"
                                                title="Thêm người đi cùng"
                                                aria-label="Thêm người đi cùng"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCompanionModalSession(s);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200/30 active:scale-90 rounded-full transition"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                title="Huỷ đăng ký"
                                                aria-label="Huỷ đăng ký"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setCancelSession(s);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-200/30 active:scale-90 rounded-full transition"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : isFull && !myReg ? (
                                        <span className="flex-shrink-0 text-xs font-semibold text-white bg-red-500 px-4 py-2 rounded-full">
                                            Hết chỗ
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {companionModalSession && (
                <AddCompanionModal
                    session={companionModalSession}
                    onClose={() => setCompanionModalSession(null)}
                    onDone={() => refetchSession(companionModalSession.id)}
                />
            )}

            {cancelSession && (
                <ConfirmCancelModal
                    session={cancelSession}
                    loading={cancelling}
                    onClose={() => setCancelSession(null)}
                    onConfirm={handleCancel}
                />
            )}

            {debtWarning !== null && (
                <DebtWarningModal debt={debtWarning} onClose={() => setDebtWarning(null)} />
            )}
        </section>
    );
}
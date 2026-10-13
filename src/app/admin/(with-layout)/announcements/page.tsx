"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
    Bell,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileText,
    Loader2,
    Megaphone,
    Pencil,
    Plus,
    Save,
    Search,
    Send,
    Trash2,
    Undo2,
    Users,
    X,
    XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { announcementsAdminApi, membersAdminApi } from "@/lib/api";

const MAX_TITLE = 100;
const MAX_MESSAGE = 1000;
const PAGE_SIZE = 10;
const DESKTOP_BREAKPOINT = 1024;

type Mode = "now" | "schedule" | "draft";
type Audience = "all" | "selected";
type Filter = "all" | "draft" | "scheduled" | "sent";

interface MemberLite {
    id: string;
    full_name: string;
    phone?: string;
    avatar_url?: string | null;
}

const FILTERS: { key: Filter; label: string; status?: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "draft", label: "Nháp", status: "draft" },
    { key: "scheduled", label: "Hẹn giờ", status: "scheduled" },
    { key: "sent", label: "Đã gửi", status: "sent,sending,failed" },
];

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: any; spin?: boolean }> = {
    draft: {
        label: "Nháp",
        cls: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
        Icon: FileText,
    },
    scheduled: {
        label: "Hẹn giờ",
        cls: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
        Icon: Clock,
    },
    sending: {
        label: "Đang gửi",
        cls: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
        Icon: Loader2,
        spin: true,
    },
    sent: {
        label: "Đã gửi",
        cls: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
        Icon: CheckCircle2,
    },
    failed: {
        label: "Gửi lỗi",
        cls: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
        Icon: XCircle,
    },
};

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

const atHour = (dayOffset: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
};

const seg = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)]"
    }`;

function useIsDesktop(breakpoint = DESKTOP_BREAKPOINT) {
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        setIsDesktop(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [breakpoint]);
    return isDesktop;
}

function MemberAvatar({ m, size = 32 }: { m: MemberLite; size?: number }) {
    return (
        <div
            className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
            style={{ width: size, height: size }}
        >
            {m.avatar_url ? (
                <img
                    src={m.avatar_url}
                    alt={m.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                />
            ) : (
                m.full_name?.[0]?.toUpperCase() ?? "?"
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Logic form soạn thông báo — dùng chung cho mobile và desktop
   ═══════════════════════════════════════════════════════════ */
function useComposer({
    editId,
    onSaved,
    onLoadError,
}: {
    editId: string | null;
    onSaved: () => void;
    onLoadError?: () => void;
}) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [audience, setAudience] = useState<Audience>("all");
    const [selected, setSelected] = useState<MemberLite[]>([]);
    const [mode, setMode] = useState<Mode>("now");
    const [scheduledLocal, setScheduledLocal] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

    const [search, setSearch] = useState("");
    const [results, setResults] = useState<MemberLite[]>([]);
    const [searching, setSearching] = useState(false);

    // nạp dữ liệu khi sửa
    useEffect(() => {
        if (!editId) return;
        let ignore = false;
        announcementsAdminApi
            .get(editId)
            .then(({ data }) => {
                if (ignore) return;
                setTitle(data.title);
                setMessage(data.message);
                setAudience(data.audience);
                setSelected(data.recipients ?? []);
                setMode(data.status === "scheduled" ? "schedule" : "draft");
                setScheduledLocal(data.scheduled_at ? toLocalInput(new Date(data.scheduled_at)) : "");
            })
            .catch(() => {
                if (!ignore) onLoadError?.();
            })
            .finally(() => {
                if (!ignore) setLoadingEdit(false);
            });
        return () => {
            ignore = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId]);

    // tìm thành viên (debounce)
    useEffect(() => {
        if (audience !== "selected") return;
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await membersAdminApi.searchMembers(search.trim());
                setResults(data ?? []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search, audience]);

    const dirty = Boolean(title.trim() || message.trim() || selected.length > 0);

    const isSelected = (id: string) => selected.some((m) => m.id === id);
    const toggleMember = (m: MemberLite) =>
        setSelected((prev) => (prev.some((x) => x.id === m.id) ? prev.filter((x) => x.id !== m.id) : [...prev, m]));

    const allResultsSelected = results.length > 0 && results.every((m) => isSelected(m.id));
    const toggleAllResults = () => {
        if (allResultsSelected) {
            const ids = new Set(results.map((m) => m.id));
            setSelected((prev) => prev.filter((m) => !ids.has(m.id)));
        } else {
            setSelected((prev) => {
                const have = new Set(prev.map((m) => m.id));
                return [...prev, ...results.filter((m) => !have.has(m.id))];
            });
        }
    };

    const handleSubmit = async () => {
        if (submitting || loadingEdit) return;
        const t = title.trim();
        const m = message.trim();

        if (!t) return toast.error("Vui lòng nhập tiêu đề");
        if (!m) return toast.error("Vui lòng nhập nội dung");
        if (audience === "selected" && selected.length === 0)
            return toast.error("Vui lòng chọn ít nhất 1 người nhận");

        let scheduledAtIso: string | undefined;
        if (mode === "schedule") {
            if (!scheduledLocal) return toast.error("Vui lòng chọn thời gian gửi");
            const when = new Date(scheduledLocal);
            if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 30_000)
                return toast.error("Thời gian hẹn giờ phải ở trong tương lai");
            scheduledAtIso = when.toISOString();
        }

        if (mode === "now") {
            const who = audience === "all" ? "TẤT CẢ thành viên" : `${selected.length} thành viên đã chọn`;
            if (!window.confirm(`Gửi thông báo này tới ${who} ngay bây giờ?`)) return;
        }

        const payload = {
            title: t,
            message: m,
            audience,
            recipient_ids: audience === "selected" ? selected.map((x) => x.id) : [],
            action: (mode === "now" ? "send_now" : mode === "schedule" ? "schedule" : "draft") as
                | "send_now"
                | "schedule"
                | "draft",
            scheduled_at: scheduledAtIso,
        };

        setSubmitting(true);
        try {
            if (editId) await announcementsAdminApi.update(editId, payload);
            else await announcementsAdminApi.create(payload);

            toast.success(
                mode === "now"
                    ? "Đang gửi thông báo..."
                    : mode === "schedule"
                        ? `Đã hẹn giờ gửi lúc ${format(new Date(scheduledLocal), "HH:mm dd/MM", { locale: vi })}`
                        : "Đã lưu nháp",
            );
            onSaved();
        } catch {
            /* toast từ interceptor */
        } finally {
            setSubmitting(false);
        }
    };

    return {
        editId,
        title, setTitle,
        message, setMessage,
        audience, setAudience,
        selected, setSelected,
        mode, setMode,
        scheduledLocal, setScheduledLocal,
        submitting, loadingEdit,
        search, setSearch,
        results, searching,
        dirty,
        isSelected, toggleMember, allResultsSelected, toggleAllResults,
        handleSubmit,
    };
}

type Composer = ReturnType<typeof useComposer>;

/* ───────── Các trường của form ───────── */
function ComposerFields({ c }: { c: Composer }) {
    const minLocal = toLocalInput(new Date(Date.now() + 60_000));
    const presets = [
        { label: "Sau 1 giờ", date: new Date(Date.now() + 3600_000) },
        { label: "18:00 hôm nay", date: atHour(0, 18) },
        { label: "8:00 sáng mai", date: atHour(1, 8) },
    ].filter((p) => p.date.getTime() > Date.now() + 60_000);

    if (c.loadingEdit) {
        return (
            <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-[var(--surface-muted)] animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-[var(--text)]">Tiêu đề *</label>
                    <span className="text-[11px] text-[var(--text-faint)]">
                        {c.title.length}/{MAX_TITLE}
                    </span>
                </div>
                <input
                    value={c.title}
                    onChange={(e) => c.setTitle(e.target.value.slice(0, MAX_TITLE))}
                    className="input-field"
                    placeholder="VD: Thông báo nghỉ sinh hoạt tuần này"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-[var(--text)]">Nội dung *</label>
                    <span className="text-[11px] text-[var(--text-faint)]">
                        {c.message.length}/{MAX_MESSAGE}
                    </span>
                </div>
                <textarea
                    value={c.message}
                    onChange={(e) => c.setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                    rows={5}
                    className="input-field resize-y min-h-[110px]"
                    placeholder="Nhập nội dung thông báo..."
                />
            </div>

            {/* Người nhận */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">Người nhận</label>
                <div className="flex gap-1 bg-[var(--surface-muted)] rounded-xl p-1">
                    <button onClick={() => c.setAudience("all")} className={seg(c.audience === "all")}>
                        <Users className="w-4 h-4" /> Tất cả
                    </button>
                    <button onClick={() => c.setAudience("selected")} className={seg(c.audience === "selected")}>
                        <Users className="w-4 h-4" /> Chọn người
                        {c.selected.length > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {c.selected.length}
                            </span>
                        )}
                    </button>
                </div>

                {c.audience === "selected" && (
                    <div className="space-y-2">
                        {c.selected.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {c.selected.map((m) => (
                                    <span
                                        key={m.id}
                                        className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] text-[var(--primary)] text-xs font-medium"
                                    >
                                        {m.full_name}
                                        <button
                                            onClick={() => c.toggleMember(m)}
                                            className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                                <button onClick={() => c.setSelected([])} className="text-xs text-[var(--danger)] font-medium px-1.5">
                                    Xoá hết
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
                            <input
                                value={c.search}
                                onChange={(e) => c.setSearch(e.target.value)}
                                className="input-field pl-9"
                                placeholder="Tìm theo tên hoặc số điện thoại..."
                            />
                        </div>

                        {c.results.length > 0 && (
                            <button onClick={c.toggleAllResults} className="text-xs font-semibold text-[var(--primary)]">
                                {c.allResultsSelected ? "Bỏ chọn tất cả kết quả" : `Chọn tất cả ${c.results.length} kết quả`}
                            </button>
                        )}

                        <div className="max-h-56 overflow-y-auto border border-[var(--border)] rounded-xl">
                            {c.searching ? (
                                <p className="text-sm text-[var(--text-faint)] text-center py-4">Đang tìm...</p>
                            ) : c.results.length === 0 ? (
                                <p className="text-sm text-[var(--text-faint)] text-center py-4">Không tìm thấy thành viên</p>
                            ) : (
                                <ul className="divide-y divide-[var(--border)]">
                                    {c.results.map((m) => {
                                        const on = c.isSelected(m.id);
                                        return (
                                            <li key={m.id}>
                                                <button
                                                    onClick={() => c.toggleMember(m)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-hover)]"
                                                        }`}
                                                >
                                                    <div
                                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${on ? "bg-blue-600 border-blue-600" : "border-[var(--border-strong)]"
                                                            }`}
                                                    >
                                                        {on && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                    <MemberAvatar m={m} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-[var(--text)] truncate">{m.full_name}</p>
                                                        <p className="text-xs text-[var(--text-faint)]">{m.phone}</p>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Cách gửi */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--text)]">Cách gửi</label>
                <div className="flex gap-1 bg-[var(--surface-muted)] rounded-xl p-1">
                    <button onClick={() => c.setMode("now")} className={seg(c.mode === "now")}>
                        <Send className="w-4 h-4" /> Gửi ngay
                    </button>
                    <button onClick={() => c.setMode("schedule")} className={seg(c.mode === "schedule")}>
                        <CalendarClock className="w-4 h-4" /> Hẹn giờ
                    </button>
                    <button onClick={() => c.setMode("draft")} className={seg(c.mode === "draft")}>
                        <Save className="w-4 h-4" /> Nháp
                    </button>
                </div>

                {c.mode === "schedule" && (
                    <div className="space-y-2">
                        <input
                            type="datetime-local"
                            value={c.scheduledLocal}
                            min={minLocal}
                            onChange={(e) => c.setScheduledLocal(e.target.value)}
                            className="input-field"
                        />
                        {presets.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {presets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => c.setScheduledLocal(toLocalInput(p.date))}
                                        className="px-2.5 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Xem trước */}
            {(c.title.trim() || c.message.trim()) && (
                <div>
                    <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-1.5">Xem trước</p>
                    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-[var(--primary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[var(--text)] break-words">
                                {c.title.trim() || "Tiêu đề thông báo"}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5 whitespace-pre-wrap break-words">
                                {c.message.trim() || "Nội dung thông báo"}
                            </p>
                            <p className="text-[10px] text-[var(--text-faint)] mt-1">Vừa xong</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ───────── Chân form: tóm tắt + nút gửi ───────── */
function ComposerFooter({ c, safeArea = false }: { c: Composer; safeArea?: boolean }) {
    const submitLabel = c.mode === "now" ? "Gửi ngay" : c.mode === "schedule" ? "Hẹn giờ gửi" : "Lưu nháp";
    const SubmitIcon = c.mode === "now" ? Send : c.mode === "schedule" ? CalendarClock : Save;
    const audienceText = c.audience === "all" ? "Tất cả thành viên" : `${c.selected.length} người`;

    return (
        <div
            className="flex-shrink-0 border-t border-[var(--border)] px-5 pt-3 bg-[var(--surface)]"
            style={{ paddingBottom: safeArea ? "max(12px, env(safe-area-inset-bottom, 0px))" : 12 }}
        >
            <p className="text-[11px] text-[var(--text-faint)] mb-2 text-center">
                Gửi tới: <span className="font-semibold text-[var(--text-muted)]">{audienceText}</span>
                {" · "}
                {c.mode === "now"
                    ? "Gửi ngay"
                    : c.mode === "schedule"
                        ? c.scheduledLocal
                            ? `Hẹn ${format(new Date(c.scheduledLocal), "HH:mm dd/MM", { locale: vi })}`
                            : "Chưa chọn giờ"
                        : "Lưu nháp"}
            </p>
            <button
                onClick={c.handleSubmit}
                disabled={c.submitting || c.loadingEdit}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
            >
                {c.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SubmitIcon className="w-4 h-4" />}
                {c.editId && c.mode !== "now" ? `${submitLabel} (cập nhật)` : submitLabel}
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE: bottom sheet
   ═══════════════════════════════════════════════════════════ */
function ComposerSheet({
    editId,
    onClose,
    onSaved,
}: {
    editId: string | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        return () => cancelAnimationFrame(raf);
    }, []);

    const closeNow = () => {
        setVisible(false);
        setTimeout(onClose, 260);
    };

    const c = useComposer({
        editId,
        onSaved: () => {
            onSaved();
            closeNow();
        },
        onLoadError: closeNow,
    });

    const handleClose = () => {
        if (c.submitting) return;
        if (!editId && c.dirty && !window.confirm("Bỏ nội dung đang soạn?")) return;
        closeNow();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
                transition: "opacity 220ms ease-out",
                overscrollBehavior: "contain",
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className={`bg-[var(--surface)] shadow-xl w-full flex flex-col overflow-hidden h-[92dvh] rounded-t-3xl
          transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform
          ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                    <span className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center">
                            <Megaphone className="w-4 h-4 text-[var(--primary)]" />
                        </div>
                        <h3 className="font-bold text-[var(--text)]">{editId ? "Sửa thông báo" : "Soạn thông báo"}</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--border-strong)] flex items-center justify-center transition-transform active:scale-90"
                    >
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                    <ComposerFields c={c} />
                </div>

                <ComposerFooter c={c} safeArea />
            </div>
        </div>,
        document.body,
    );
}

/* ═══════════════════════════════════════════════════════════
   DESKTOP: khung soạn cố định bên phải
   ═══════════════════════════════════════════════════════════ */
function ComposerPanel({
    editId,
    onNew,
    onSaved,
}: {
    editId: string | null;
    onNew: () => void;
    onSaved: () => void;
}) {
    const c = useComposer({ editId, onSaved, onLoadError: onNew });

    const handleNew = () => {
        if (c.dirty && !window.confirm("Bỏ nội dung đang soạn?")) return;
        onNew();
    };

    return (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[0_2px_16px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden max-h-[calc(100dvh-11rem)]">
            <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-[var(--text)] leading-tight">
                            {editId ? "Sửa thông báo" : "Soạn thông báo"}
                        </h3>
                        {editId && <p className="text-[11px] text-[var(--warning)]">Đang chỉnh sửa bản đã lưu</p>}
                    </div>
                </div>
                {(editId || c.dirty) && (
                    <button
                        onClick={handleNew}
                        disabled={c.submitting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] disabled:opacity-50 flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" /> {editId ? "Soạn mới" : "Xoá form"}
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                <ComposerFields c={c} />
            </div>

            <ComposerFooter c={c} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Trang chính
   ═══════════════════════════════════════════════════════════ */
export default function AdminAnnouncementsPage() {
    const isDesktop = useIsDesktop();

    const [sheetOpen, setSheetOpen] = useState(false); // chỉ dùng cho mobile
    const [editId, setEditId] = useState<string | null>(null);
    const [panelKey, setPanelKey] = useState(0); // đổi key để reset khung soạn desktop

    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState<Filter>("all");
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [loadingList, setLoadingList] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchList = useCallback(
        async (silent = false) => {
            if (!silent) setLoadingList(true);
            try {
                const status = FILTERS.find((f) => f.key === filter)?.status;
                const { data } = await announcementsAdminApi.list({ status, page: 1, limit });
                setItems(data.data ?? []);
                setTotal(data.meta?.total ?? 0);
            } catch {
                /* interceptor đã hiện toast */
            } finally {
                setLoadingList(false);
            }
        },
        [filter, limit],
    );

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        if (!items.some((i) => i.status === "sending" || i.status === "scheduled")) return;
        const t = setInterval(() => fetchList(true), 15000);
        return () => clearInterval(t);
    }, [items, fetchList]);

    // Mobile
    const openCompose = () => {
        setEditId(null);
        setSheetOpen(true);
    };
    const closeSheet = () => {
        setSheetOpen(false);
        setEditId(null);
    };

    // Chung
    const openEdit = (id: string) => {
        setEditId(id);
        if (!isDesktop) setSheetOpen(true);
    };

    // Desktop
    const resetPanel = () => {
        setEditId(null);
        setPanelKey((k) => k + 1);
    };

    const runAction = async (id: string, fn: () => Promise<any>, okMsg: string) => {
        setBusyId(id);
        try {
            await fn();
            toast.success(okMsg);
            await fetchList(true);
        } catch {
            /* toast từ interceptor */
        } finally {
            setBusyId(null);
        }
    };

    const handleSendFromList = (item: any) => {
        const who = item.audience === "all" ? "TẤT CẢ thành viên" : `${item.recipient_ids?.length ?? 0} thành viên đã chọn`;
        if (!window.confirm(`Gửi "${item.title}" tới ${who} ngay bây giờ?`)) return;
        runAction(item.id, () => announcementsAdminApi.sendNow(item.id), "Đang gửi thông báo...");
    };

    const handleDelete = (item: any) => {
        if (!window.confirm(`Xoá thông báo "${item.title}"? Thông báo đã gửi tới thành viên sẽ không bị thu hồi.`)) return;
        if (editId === item.id) resetPanel();
        runAction(item.id, () => announcementsAdminApi.remove(item.id), "Đã xoá thông báo");
    };

    /* ───────── Danh sách (dùng chung) ───────── */
    const filterBar = (
        <div className="flex gap-1 bg-[var(--surface-muted)] rounded-xl p-1 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => (
                <button
                    key={f.key}
                    onClick={() => {
                        setFilter(f.key);
                        setLimit(PAGE_SIZE);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)]"
                        }`}
                >
                    {f.label}
                </button>
            ))}
        </div>
    );

    const list = (
        <div className="space-y-3">
            {loadingList ? (
                [...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-[var(--surface-muted)] animate-pulse" />)
            ) : items.length === 0 ? (
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] py-14 px-6 text-center">
                    <Megaphone className="w-9 h-9 mx-auto mb-2 text-[var(--text-faint)] opacity-40" />
                    <p className="text-sm text-[var(--text-muted)]">
                        {filter === "all" ? "Chưa có thông báo nào" : "Không có thông báo trong mục này"}
                    </p>
                    {!isDesktop && (
                        <button
                            onClick={openCompose}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold active:scale-95 transition-transform"
                        >
                            <Plus className="w-4 h-4" /> Soạn thông báo
                        </button>
                    )}
                </div>
            ) : (
                items.map((item) => {
                    const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.draft;
                    const busy = busyId === item.id;
                    const editable = item.status === "draft" || item.status === "scheduled";
                    const beingEdited = isDesktop && editId === item.id;
                    const audienceText =
                        item.audience === "all" ? "Tất cả thành viên" : `${item.recipient_ids?.length ?? 0} người được chọn`;
                    const timeText =
                        item.status === "scheduled" && item.scheduled_at
                            ? `Gửi lúc ${format(new Date(item.scheduled_at), "HH:mm dd/MM/yyyy", { locale: vi })}`
                            : item.sent_at
                                ? `Gửi lúc ${format(new Date(item.sent_at), "HH:mm dd/MM/yyyy", { locale: vi })}`
                                : `Cập nhật ${format(new Date(item.updated_at), "HH:mm dd/MM/yyyy", { locale: vi })}`;

                    return (
                        <div
                            key={item.id}
                            className={`bg-[var(--surface)] rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 space-y-2.5 transition-colors ${beingEdited
                                ? "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] ring-2 ring-blue-100"
                                : "border-[var(--border)]"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-[var(--text)] text-sm break-words min-w-0">{item.title}</p>
                                <span
                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap flex-shrink-0 ${cfg.cls}`}
                                >
                                    <cfg.Icon className={`w-3 h-3 ${cfg.spin ? "animate-spin" : ""}`} />
                                    {cfg.label}
                                </span>
                            </div>

                            <p className="text-xs text-[var(--text-muted)] line-clamp-3 whitespace-pre-wrap break-words">
                                {item.message}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-faint)]">
                                <span className="inline-flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {audienceText}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {timeText}
                                </span>
                                {(item.status === "sent" || item.status === "failed") && (
                                    <span>
                                        Đã nhận: {item.success_count}/{item.recipient_count}
                                        {item.failed_count > 0 && <span className="text-[var(--danger)]"> · lỗi {item.failed_count}</span>}
                                    </span>
                                )}
                            </div>

                            {item.error_message && <p className="text-[11px] text-[var(--danger)]">{item.error_message}</p>}

                            <div className="flex flex-wrap gap-2 pt-1">
                                {editable && (
                                    <>
                                        <button
                                            onClick={() => handleSendFromList(item)}
                                            disabled={busy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                                        >
                                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                            Gửi ngay
                                        </button>
                                        <button
                                            onClick={() => openEdit(item.id)}
                                            disabled={busy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Sửa
                                        </button>
                                    </>
                                )}
                                {item.status === "scheduled" && (
                                    <button
                                        onClick={() =>
                                            runAction(item.id, () => announcementsAdminApi.unschedule(item.id), "Đã bỏ hẹn giờ, chuyển về nháp")
                                        }
                                        disabled={busy}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                                    >
                                        <Undo2 className="w-3.5 h-3.5" /> Bỏ hẹn giờ
                                    </button>
                                )}
                                {item.status !== "sending" && (
                                    <button
                                        onClick={() => handleDelete(item)}
                                        disabled={busy}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform ml-auto"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Xoá
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {!loadingList && items.length < total && (
                <button
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                >
                    Xem thêm ({total - items.length})
                </button>
            )}
        </div>
    );

    const header = (
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-[var(--text)] leading-tight">Thông báo</h1>
                <p className="text-xs text-[var(--text-faint)]">Quản lý thông báo gửi tới thành viên</p>
            </div>
        </div>
    );

    /* ───────── DESKTOP: chia đôi ───────── */
    if (isDesktop) {
        return (
            <div className="max-w-6xl mx-auto grid grid-cols-[minmax(0,1fr)_420px] gap-6 items-start pb-8">
                <div className="space-y-4 min-w-0">
                    {header}
                    {filterBar}
                    {list}
                </div>

                <div className="sticky top-0">
                    <ComposerPanel
                        key={`${editId ?? "new"}-${panelKey}`}
                        editId={editId}
                        onNew={resetPanel}
                        onSaved={() => {
                            resetPanel();
                            fetchList(true);
                        }}
                    />
                </div>
            </div>
        );
    }

    /* ───────── MOBILE: danh sách + nút + + bottom sheet ───────── */
    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-28">
            {header}
            {filterBar}
            {list}

            <button
                onClick={openCompose}
                title="Soạn thông báo mới"
                className="fixed z-40 right-4 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_24px_rgba(37,99,235,0.45)] transition-transform active:scale-95"
                style={{ bottom: "max(20px, calc(env(safe-area-inset-bottom, 0px) + 12px))" }}
            >
                <Plus className="w-6 h-6" />
            </button>

            {sheetOpen && (
                <ComposerSheet
                    key={editId ?? "new"}
                    editId={editId}
                    onClose={closeSheet}
                    onSaved={() => fetchList(true)}
                />
            )}
        </div>
    );
}
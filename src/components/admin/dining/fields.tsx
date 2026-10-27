"use client";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ───────── Ô tiền: tự thêm dấu . ngăn cách hàng nghìn ───────── */
export function MoneyInput({
    value,
    onChange,
    disabled,
    placeholder = "0",
    className = "",
}: {
    value: string; // chỉ chứa chữ số, vd "1500000"
    onChange: (digits: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}) {
    const display = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                inputMode="numeric"
                disabled={disabled}
                placeholder={placeholder}
                value={display}
                onChange={(e) =>
                    onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
                }
                className="input-field w-full pr-9 text-base font-semibold tabular-nums disabled:opacity-60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-faint)]">
                đ
            </span>
        </div>
    );
}

/* ───────── Ô ngày + giờ (value dạng "YYYY-MM-DDTHH:mm") ───────── */
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DOW_FULL = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = ["00", "15", "30", "45"];

export function DateTimeField({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);

    const [dPart, tPart] = value ? value.split("T") : ["", ""];
    const time = tPart || "19:00";
    const selected = dPart ? new Date(`${dPart}T00:00`) : null;

    const today = new Date();
    const todayStr = dateStr(today);
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = dateStr(tomorrow);

    // bản nháp: chỉ áp dụng khi bấm Xác nhận
    const [draftDate, setDraftDate] = useState(dPart || todayStr);
    const [draftTime, setDraftTime] = useState(time);
    const [view, setView] = useState(
        () => new Date((selected ?? today).getFullYear(), (selected ?? today).getMonth(), 1),
    );

    const openModal = () => {
        const base = dPart ? new Date(`${dPart}T00:00`) : today;
        setDraftDate(dPart || todayStr);
        setDraftTime(time);
        setView(new Date(base.getFullYear(), base.getMonth(), 1));
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    };

    const closeModal = () => {
        setVisible(false);
        setTimeout(() => setOpen(false), 200);
    };

    const confirm = () => {
        onChange(`${draftDate}T${draftTime}`);
        closeModal();
    };

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const [hh, mm] = draftTime.split(":");
    const goMonth = (delta: number) =>
        setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

    const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
        ...Array.from({ length: offset }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
    ];

    const draftObj = new Date(`${draftDate}T00:00`);
    const draftSummary = `${DOW_FULL[draftObj.getDay()]}, ${pad(draftObj.getDate())}/${pad(
        draftObj.getMonth() + 1,
    )}/${draftObj.getFullYear()} · ${draftTime}`;

    const summary = selected
        ? `${DOW_FULL[selected.getDay()]}, ${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()} · ${time}`
        : "Chọn ngày và giờ";

    const pill = (active: boolean) =>
        `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active
            ? "border-transparent bg-[var(--primary)] text-white"
            : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
        }`;

    return (
        <>
            {/* Ô hiển thị giá trị */}
            <button
                type="button"
                onClick={openModal}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
            >
                <CalendarDays className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                <span
                    className={`flex-1 truncate text-sm font-semibold ${selected ? "text-[var(--text)]" : "text-[var(--text-faint)]"
                        }`}
                >
                    {summary}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
            </button>

            {/* Modal chọn ngày giờ */}
            {open &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center sm:p-4"
                        style={{
                            background: visible ? "var(--overlay)" : "rgba(0,0,0,0)",
                            backdropFilter: visible ? "blur(2px)" : "none",
                            transition: "background .2s, backdrop-filter .2s",
                        }}
                        onClick={(e) => e.target === e.currentTarget && closeModal()}
                    >
                        <div
                            className="flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] sm:max-w-sm sm:rounded-3xl"
                            style={{
                                boxShadow: "var(--shadow-strong)",
                                transform: visible ? "translateY(0)" : "translateY(40px)",
                                opacity: visible ? 1 : 0,
                                transition: "transform .25s cubic-bezier(0.32,0.72,0,1), opacity .2s",
                                paddingBottom: "env(safe-area-inset-bottom)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                                <div className="min-w-0">
                                    <p className="text-xs text-[var(--text-faint)]">Chọn ngày & giờ</p>
                                    <p className="truncate text-sm font-bold text-[var(--text)]">{draftSummary}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    aria-label="Đóng"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Nội dung cuộn */}
                            <div className="space-y-4 overflow-y-auto px-5 py-4">
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        className={pill(draftDate === todayStr)}
                                        onClick={() => {
                                            setDraftDate(todayStr);
                                            setView(new Date(today.getFullYear(), today.getMonth(), 1));
                                        }}
                                    >
                                        Hôm nay
                                    </button>
                                    <button
                                        type="button"
                                        className={pill(draftDate === tomorrowStr)}
                                        onClick={() => {
                                            setDraftDate(tomorrowStr);
                                            setView(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
                                        }}
                                    >
                                        Ngày mai
                                    </button>
                                </div>

                                {/* Lịch */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <button
                                            type="button"
                                            aria-label="Tháng trước"
                                            onClick={() => goMonth(-1)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="text-sm font-bold text-[var(--text)]">
                                            Tháng {view.getMonth() + 1}, {view.getFullYear()}
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="Tháng sau"
                                            onClick={() => goMonth(1)}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {WEEKDAYS.map((w, i) => (
                                            <span
                                                key={w}
                                                className={`py-1 text-[11px] font-semibold ${i >= 5 ? "text-[var(--danger)]" : "text-[var(--text-faint)]"
                                                    }`}
                                            >
                                                {w}
                                            </span>
                                        ))}
                                        {cells.map((d, i) => {
                                            if (!d) return <span key={`e${i}`} />;
                                            const ds = dateStr(d);
                                            const isSel = ds === draftDate;
                                            const isToday = ds === todayStr;
                                            return (
                                                <button
                                                    key={ds}
                                                    type="button"
                                                    onClick={() => setDraftDate(ds)}
                                                    className={`h-10 rounded-xl text-sm font-semibold tabular-nums transition-colors ${isSel
                                                        ? "bg-[var(--primary)] text-white"
                                                        : "text-[var(--text)] hover:bg-[var(--surface-hover)]"
                                                        } ${isToday && !isSel ? "ring-1 ring-inset ring-[var(--primary)]" : ""}`}
                                                >
                                                    {d.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Giờ */}
                                <div className="space-y-2 border-t border-[var(--border)] pt-3">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                                        <Clock className="h-3.5 w-3.5" /> Giờ
                                    </p>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {HOURS.map((h) => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => setDraftTime(`${h}:${mm || "00"}`)}
                                                className={`h-9 rounded-lg text-sm font-semibold tabular-nums transition-colors ${h === hh
                                                    ? "bg-[var(--primary)] text-white"
                                                    : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                                                    }`}
                                            >
                                                {h}
                                            </button>
                                        ))}
                                    </div>

                                    <p className="pt-1 text-xs font-semibold text-[var(--text-muted)]">Phút</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {MINUTES.map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setDraftTime(`${hh || "19"}:${m}`)}
                                                className={`h-9 rounded-lg text-sm font-semibold tabular-nums transition-colors ${m === mm
                                                    ? "bg-[var(--primary)] text-white"
                                                    : "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                                                    }`}
                                            >
                                                :{m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex gap-3 border-t border-[var(--border)] px-5 py-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={confirm}
                                    className="h-11 flex-[1.4] rounded-xl bg-[var(--primary)] text-sm font-semibold text-white"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
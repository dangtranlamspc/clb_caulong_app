"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export type Tone =
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "purple"
    | "neutral";

export const TONE_SOFT: Record<Tone, string> = {
    primary:
        "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_28%,transparent)]",
    success:
        "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_28%,transparent)]",
    warning:
        "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_28%,transparent)]",
    danger:
        "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_28%,transparent)]",
    purple:
        "bg-[var(--purple-soft)] text-[var(--purple)] border-[color-mix(in_srgb,var(--purple)_28%,transparent)]",
    neutral:
        "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
};

export const TONE_ICON: Record<Tone, string> = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    purple: "bg-[var(--purple-soft)] text-[var(--purple)]",
    neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
};

export const CARD =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.18)]";

export const formatVnd = (n: number) =>
    Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";

export const SESSION_UI_CSS = `
@keyframes sdPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.sd-pop { animation: sdPop .3s ease-out; }
.sd-noscroll::-webkit-scrollbar { display: none; }
.sd-noscroll { scrollbar-width: none; }
@media (prefers-reduced-motion: reduce) {
  .sd-pop { animation: none; }
}
`;

export function Chip({
    tone = "neutral",
    icon,
    className = "",
    children,
}: {
    tone?: Tone;
    icon?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_SOFT[tone]} ${className}`}
        >
            {icon}
            {children}
        </span>
    );
}


export function Avatar({
    url,
    name,
    size = 40,
    className = "",
}: {
    url?: string | null;
    name?: string | null;
    size?: number;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-soft)] font-semibold text-[var(--primary)] ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        >
            {url && !failed ? (
                <img
                    src={url}
                    alt={name ?? ""}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                initial
            )}
        </div>
    );
}


export type Phase = "idle" | "loading" | "success";
export type BtnTone = "blue" | "green" | "red" | "amber" | "sky";

const SOLID: Record<BtnTone, string> = {
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    red: "bg-red-500 text-white hover:bg-red-600",
    amber: "bg-amber-500 text-white hover:bg-amber-600",
    sky: "bg-sky-600 text-white hover:bg-sky-700",
};

const SOFT: Record<BtnTone, string> = {
    blue: "bg-[var(--primary-soft)] text-[var(--primary)] hover:brightness-95",
    green: "bg-[var(--success-soft)] text-[var(--success)] hover:brightness-95",
    red: "bg-[var(--danger-soft)] text-[var(--danger)] hover:brightness-95",
    amber: "bg-[var(--warning-soft)] text-[var(--warning)] hover:brightness-95",
    sky: "bg-[var(--primary-soft)] text-[var(--primary)] hover:brightness-95",
};

const SIZE = {
    sm: "h-9 gap-1.5 rounded-lg px-3 text-xs",
    md: "h-10 gap-2 rounded-xl px-4 text-sm",
    lg: "h-12 gap-2 rounded-xl px-5 text-[15px]",
};

export function PhaseButton({
    label,
    icon,
    tone = "blue",
    variant = "solid",
    size = "md",
    phase = "idle",
    onClick,
    disabled,
    badge,
    stacked = false,
    className = "",
}: {
    label: string;
    icon?: ReactNode;
    tone?: BtnTone;
    variant?: "solid" | "soft";
    size?: keyof typeof SIZE;
    phase?: Phase;
    onClick?: () => void;
    disabled?: boolean;
    badge?: number;
    stacked?: boolean;
    className?: string;
}) {
    const busy = phase === "loading";
    const done = phase === "success";
    const lead = busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
    ) : done ? (
        <CheckCircle2 className="sd-pop h-4 w-4" />
    ) : (
        icon
    );
    const dim = disabled && !busy && !done;

    const sizing = stacked
        ? "h-12 min-w-0 flex-1 flex-col gap-0.5 rounded-xl px-1 text-[10px] leading-none"
        : SIZE[size];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy || done}
            aria-busy={busy}
            className={`relative inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.97] ${sizing} ${variant === "solid" ? SOLID[tone] : SOFT[tone]
                } ${dim ? "cursor-not-allowed opacity-50" : ""} ${className}`}
        >
            {lead}
            <span className="whitespace-nowrap">{label}</span>
            {badge != null && badge > 0 && (
                <span
                    className={
                        stacked
                            ? "absolute -right-1 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white"
                            : `ml-0.5 rounded-full px-1.5 text-[11px] font-bold tabular-nums ${variant === "solid" ? "bg-white/25" : "bg-black/10"
                            }`
                    }
                >
                    {badge}
                </span>
            )}
        </button>
    );
}


export function Switch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? "bg-emerald-500" : "bg-[var(--border-strong)]"
                }`}
        >
            <span
                className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
            />
        </button>
    );
}

export function ModalShell({
    onClose,
    size = "md",
    dismissible = true,
    children,
}: {
    onClose: () => void;
    size?: "sm" | "md";
    dismissible?: boolean;
    children: (close: () => void) => ReactNode;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        if (!dismissible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dismissible]);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200 sm:items-center sm:p-4"
            style={{
                background: "var(--overlay)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
            }}
            onClick={dismissible ? close : undefined}
        >
            <div
                role="dialog"
                aria-modal="true"
                className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-[var(--surface)] shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:rounded-2xl ${size === "sm" ? "sm:max-w-sm" : "sm:max-w-md"
                    } ${visible
                        ? "translate-y-0 opacity-100 sm:scale-100"
                        : "translate-y-full opacity-0 sm:translate-y-2 sm:scale-95"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-2 sm:hidden">
                    <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
                </div>
                {children(close)}
            </div>
        </div>,
        document.body,
    );
}

export function ModalHeader({
    icon,
    tone = "neutral",
    title,
    onClose,
}: {
    icon?: ReactNode;
    tone?: Tone;
    title: string;
    onClose: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
                {icon && (
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_ICON[tone]}`}
                    >
                        {icon}
                    </span>
                )}
                <h3 className="truncate text-base font-bold text-[var(--text)]">
                    {title}
                </h3>
            </div>
            <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded-full p-1.5 text-[var(--text-faint)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-muted)]"
            >
                <XCircle className="h-5 w-5" />
            </button>
        </div>
    );
}

export function ModalBody({
    className = "",
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`min-h-0 flex-1 overflow-y-auto p-5 ${className}`}>
            {children}
        </div>
    );
}

export function ModalFooter({
    className = "justify-end",
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={`flex items-center gap-3 border-t border-[var(--border)] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 ${className}`}
        >
            {children}
        </div>
    );
}
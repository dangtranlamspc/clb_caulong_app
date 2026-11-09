"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, X as XIcon } from "lucide-react";
import { BADGE_BASE, BADGE_TONE } from "@/components/member/badges";

export type PayForPerson = {
    id: string;
    name: string;
    amount: number;
    hostName?: string;
    isGuest: boolean;
    disabledReason: string | null;
};

const fmt = (n: number) => Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";

const WALLET_LOCKED = ["wallet", "wallet_grouped", "wallet_pending_confirm"];
const hasChosen = (r: any) =>
    Boolean(r.payment_reference) ||
    Boolean(r.cash_requested_at) ||
    WALLET_LOCKED.includes(r.payment_method);

/** Danh sách người có thể được trả hộ (cùng logic với trang chi tiết buổi) */
export function buildPayForPeople(myReg: any, registrations: any[]): PayForPerson[] {
    if (!myReg) return [];

    const reasonOf = (r: any): string | null => {
        if (r.paid_by_registration_id && r.paid_by_registration_id !== myReg.id)
            return "Đã có người thanh toán hộ";
        if (hasChosen(r)) return "Đã chọn cách thanh toán";
        if (r.host_registration_id) {
            const h = registrations.find((x) => x.id === r.host_registration_id);
            if (h && (h.payment_status !== "pending" || hasChosen(h)))
                return "Nhóm đã chọn cách thanh toán";
        } else if (
            registrations.some(
                (g) =>
                    g.host_registration_id === r.id &&
                    g.payment_method === "grouped_with_host" &&
                    !g.paid_by_registration_id,
            )
        ) {
            return "Đang gộp tiền với người đi cùng";
        }
        return null;
    };

    return registrations
        .filter(
            (r) =>
                r.id !== myReg.id &&
                r.host_registration_id !== myReg.id &&
                r.participation_status === "confirmed" &&
                r.payment_status === "pending" &&
                r.amount_override != null,
        )
        .map((r) => {
            const host = r.host_registration_id
                ? registrations.find((x) => x.id === r.host_registration_id)
                : null;
            return {
                id: r.id,
                name: r.users?.full_name ?? r.guest_full_name ?? "?",
                amount: r.amount_override ?? 0,
                isGuest: Boolean(r.is_guest),
                hostName: host ? host.users?.full_name ?? host.guest_full_name : undefined,
                disabledReason: reasonOf(r),
            };
        });
}

export function PayForOthersModal({
    people,
    initialSelectedIds,
    saving,
    onSkip,
    onContinue,
    onClose,
}: {
    people: PayForPerson[];
    initialSelectedIds: string[];
    saving: boolean;
    onSkip: () => void;
    onContinue: (ids: string[]) => void;
    onClose: () => void;
}) {
    const [visible, setVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const close = () => {
        if (saving) return;
        setVisible(false);
        setTimeout(onClose, 250);
    };

    const toggle = (id: string) =>
        setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const total = people
        .filter((p) => selectedIds.includes(p.id))
        .reduce((s, p) => s + p.amount, 0);

    return createPortal(
        <div
            className="fixed inset-0 flex flex-col justify-end"
            style={{
                zIndex: 99999,
                background: visible ? "var(--overlay)" : "transparent",
                backdropFilter: visible ? "blur(2px)" : "none",
                transition: "background .3s, backdrop-filter .3s",
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <div
                className="w-full bg-[var(--surface)] rounded-t-2xl flex flex-col"
                style={{
                    maxHeight: "90vh",
                    paddingBottom: "env(safe-area-inset-bottom)",
                    transform: visible ? "translateY(0)" : "translateY(100%)",
                    transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
                    <div>
                        <p className="text-sm font-bold text-[var(--text)]">Thanh toán hộ</p>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5">
                            Chọn người bạn muốn trả tiền giúp (không bắt buộc)
                        </p>
                    </div>
                    <button
                        onClick={close}
                        className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center"
                    >
                        <XIcon className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                <ul className="px-5 py-3 space-y-2 overflow-y-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {people.map((p) => {
                        const checked = selectedIds.includes(p.id);
                        const disabled = Boolean(p.disabledReason);
                        return (
                            <li key={p.id}>
                                <button
                                    disabled={disabled}
                                    onClick={() => toggle(p.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-colors ${checked
                                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                                        : "border-[var(--border)] bg-[var(--surface-muted)]"
                                        } ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.99]"}`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${checked
                                            ? "bg-[var(--primary)] border-[var(--primary)]"
                                            : "border-[var(--border-strong)]"
                                            }`}
                                    >
                                        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text)] truncate">
                                            {p.name}
                                            {p.isGuest && (
                                                <span className={`${BADGE_BASE} ${BADGE_TONE.warning} ml-1.5`}>
                                                    🙋 Khách
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-faint)] truncate">
                                            {p.disabledReason ??
                                                (p.hostName ? `Đi cùng ${p.hostName}` : "Đăng ký riêng")}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-[var(--text)] flex-shrink-0">
                                        {fmt(p.amount)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="px-5 py-3 border-t border-[var(--border)] space-y-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--text-muted)]">
                                Thanh toán hộ {selectedIds.length} người
                            </span>
                            <span className="font-bold text-[var(--primary)]">+{fmt(total)}</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={onSkip}
                            disabled={saving}
                            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] disabled:opacity-50"
                        >
                            Không, chỉ phần tôi
                        </button>
                        <button
                            onClick={() => onContinue(selectedIds)}
                            disabled={saving}
                            className="flex-[1.4] py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Tiếp tục
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
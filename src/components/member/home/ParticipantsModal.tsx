"use client";
import { createPortal } from "react-dom";
import { c } from "@/lib/theme";

const LEVEL_LABELS: Record<string, string> = {
    yeu: "Yếu",
    tb_yeu: "TB yếu",
    tb: "TB",
    tb_plus: "TB+",
    ban_chuyen: "Bán chuyên (BC)",
    chuyen_nghiep: "Chuyên nghiệp",
};

const GUEST_SKILL_LABELS: Record<string, string> = {
    yeu: "Yếu",
    trung_binh_yeu: "TB yếu",
    trung_binh: "TB",
    trung_binh_cong: "TB+",
    ban_chuyen: "Bán chuyên (BC)",
    chuyen_nghiep: "Chuyên nghiệp",
};

interface ParticipantsModalProps {
    open: boolean;
    sessionTitle?: string;
    participants: any[];
    loading: boolean;
    onClose: () => void;
}

export function ParticipantsModal({
    open,
    sessionTitle,
    participants,
    loading,
    onClose,
}: ParticipantsModalProps) {
    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: c.overlay }}
            onClick={onClose}
        >
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
            `}</style>
            <div
                className="w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[75vh] flex flex-col animate-slide-up border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                style={{ boxShadow: c.shadowStrong }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                    <div>
                        <p className="text-xs text-[var(--text-faint)]">Người tham gia</p>
                        <p className="font-bold text-[var(--text)] text-sm">{sessionTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        className="w-8 h-8 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="no-scrollbar overflow-y-auto px-5 py-3 space-y-2">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-14 bg-[var(--surface-muted)] rounded-2xl animate-pulse"
                            />
                        ))
                    ) : participants.length === 0 ? (
                        <p className="text-center text-sm text-[var(--text-faint)] py-8">
                            Chưa có ai đăng ký
                        </p>
                    ) : (
                        participants.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0"
                            >
                                {p.avatar_url ? (
                                    <img
                                        src={p.avatar_url}
                                        alt={p.full_name}
                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center font-bold text-[var(--primary)] text-sm flex-shrink-0">
                                        {p.full_name?.[0]?.toUpperCase() ?? "?"}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                                        {p.full_name}
                                        {p.is_guest && (
                                            <span className="ml-1.5 text-[10px] text-[var(--text-faint)] font-normal">
                                                (khách)
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {p.level_label && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)]">
                                                🎯{" "}
                                                {LEVEL_LABELS[p.level_label] ??
                                                    GUEST_SKILL_LABELS[p.level_label] ??
                                                    p.level_label}
                                            </span>
                                        )}
                                        {!p.is_guest &&
                                            (p.tier ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--purple-soft)] text-[var(--purple)] border border-[color-mix(in_srgb,var(--purple)_25%,transparent)]">
                                                    💎 {p.tier} · {p.total_points ?? 0}đ
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-faint)] border border-[var(--border)]">
                                                    Chưa có rank
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
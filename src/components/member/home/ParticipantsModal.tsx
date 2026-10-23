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

const BADGE_BASE =
    "inline-flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold leading-none px-2 py-1 rounded-full text-white whitespace-nowrap";

const BADGE_TONE = {
    primary: "bg-[color-mix(in_srgb,var(--primary)_70%,black)]",
    pink: "bg-[color-mix(in_srgb,var(--pink)_70%,black)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_65%,black)]",
    purple: "bg-[color-mix(in_srgb,var(--purple)_70%,black)]",
    muted: "bg-[color-mix(in_srgb,var(--text-faint)_70%,black)]",
};

const GENDER_META: Record<
    string,
    { icon: string; label: string; tone: string; color: string }
> = {
    male: { icon: "♂", label: "Nam", tone: BADGE_TONE.primary, color: "var(--primary)" },
    female: { icon: "♀", label: "Nữ", tone: BADGE_TONE.pink, color: "var(--pink)" },
};
GENDER_META.nam = GENDER_META.male;
GENDER_META.nu = GENDER_META.female;

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
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
                    <div className="min-w-0">
                        <p className="text-xs text-[var(--text-faint)] flex items-center gap-1.5">
                            Người tham gia
                            {!loading && participants.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-[10px] font-bold leading-none">
                                    {participants.length}
                                </span>
                            )}
                        </p>
                        <p className="font-bold text-[var(--text)] text-sm truncate mt-0.5">
                            {sessionTitle}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        className="w-8 h-8 flex-shrink-0 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* List */}
                <div className="no-scrollbar overflow-y-auto px-4 py-3 space-y-2">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-16 bg-[var(--surface-muted)] rounded-2xl animate-pulse"
                            />
                        ))
                    ) : participants.length === 0 ? (
                        <p className="text-center text-sm text-[var(--text-faint)] py-8">
                            Chưa có ai đăng ký
                        </p>
                    ) : (
                        participants.map((p) => {
                            const gender = p.gender ? GENDER_META[p.gender] : null;
                            const ringColor = gender?.color ?? "var(--border)";
                            const levelText = p.level_label
                                ? (LEVEL_LABELS[p.level_label] ??
                                    GUEST_SKILL_LABELS[p.level_label] ??
                                    p.level_label)
                                : null;

                            return (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]"
                                >
                                    {/* Avatar */}
                                    {p.avatar_url ? (
                                        <img
                                            src={p.avatar_url}
                                            alt={p.full_name}
                                            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                            style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
                                        />
                                    ) : (
                                        <div
                                            className="w-11 h-11 rounded-full bg-[var(--primary-soft)] flex items-center justify-center font-bold text-[var(--primary)] text-base flex-shrink-0"
                                            style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
                                        >
                                            {p.full_name?.[0]?.toUpperCase() ?? "?"}
                                        </div>
                                    )}

                                    {/* Tên + giới tính + trình độ */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[var(--text)] truncate">
                                            {p.full_name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            {gender && (
                                                <span className={`${BADGE_BASE} ${gender.tone}`}>
                                                    {gender.icon} {gender.label}
                                                </span>
                                            )}
                                            {levelText && (
                                                <span className={`${BADGE_BASE} ${BADGE_TONE.primary}`}>
                                                    🎯 {levelText}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cột phải: rank hoặc Khách */}
                                    <div className="flex-shrink-0 flex flex-col items-end gap-1 max-w-[42%] text-right">
                                        {p.is_guest ? (
                                            <span className={`${BADGE_BASE} ${BADGE_TONE.warning}`}>
                                                🙋 Khách
                                            </span>
                                        ) : p.tier ? (
                                            <>
                                                <span
                                                    className={`${BADGE_BASE} ${BADGE_TONE.purple} max-w-full`}
                                                >
                                                    <span className="truncate">💎 {p.tier}</span>
                                                </span>
                                                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                                                    {p.total_points ?? 0} điểm
                                                </span>
                                            </>
                                        ) : (
                                            <span className={`${BADGE_BASE} ${BADGE_TONE.muted}`}>
                                                Chưa có rank
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
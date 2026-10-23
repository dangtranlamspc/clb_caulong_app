import { registrationsApi } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Hourglass,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GUEST_SKILL_LABEL: Record<string, string> = {
  yeu: "Yếu",
  trung_binh_yeu: "TB yếu",
  trung_binh: "TB",
  trung_binh_cong: "TB+",
  ban_chuyen: "Bán chuyên",
  chuyen_nghiep: "Chuyên nghiệp",
};

const LEVEL_LABELS: Record<string, string> = {
  yeu: "Yếu",
  tb_yeu: "TB yếu",
  tb: "TB",
  tb_plus: "TB+",
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

const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  pending_approval: {
    label: "Chờ admin duyệt",
    icon: Hourglass,
    cls: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
  },
  awaiting_checkin: {
    label: "Chờ điểm danh",
    icon: Hourglass,
    cls: "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]",
  },
  pending: {
    label: "Chờ thanh toán",
    icon: Hourglass,
    cls: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
  },
  pending_review: {
    label: "Chờ admin xác nhận",
    icon: Clock3,
    cls: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
  },
  confirmed: {
    label: "Đã xác nhận thanh toán",
    icon: CheckCircle2,
    cls: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
  },
  rejected: {
    label: "Thanh toán bị từ chối",
    icon: AlertCircle,
    cls: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
  },
};

export function MembersModal({
  sessionId,
  sessionTitle,
  onClose,
}: {
  sessionId: string;
  sessionTitle: string;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    registrationsApi
      .listBySession(sessionId)
      .then(({ data }) => setMembers(data.data ?? []))
      .finally(() => setLoading(false));
    const t = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true)),
    );
    return () => {
      cancelAnimationFrame(t);
    };
  }, [sessionId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const approvedMembers = members.filter(
    (m: any) => m.participation_status !== "pending_approval",
  );

  const roots = approvedMembers.filter((m: any) => !m.host_registration_id);
  const guestsOf = (hostId: string) =>
    approvedMembers.filter((m: any) => m.host_registration_id === hostId);

  const renderPerson = (m: any, opts?: { nested?: boolean }) => {
    const nested = opts?.nested;
    const u = m.users;
    const fullName = u?.full_name ?? m.guest_full_name ?? "?";
    const gender = GENDER_META[u?.gender ?? m.guest_gender] ?? null;
    const ringColor = gender?.color ?? "var(--border)";
    const skillLevel = m.is_guest ? m.guest_skill_level : null;
    const levelText = skillLevel
      ? (GUEST_SKILL_LABEL[skillLevel] ?? skillLevel)
      : u?.level
        ? (LEVEL_LABELS[u.level] ?? u.level)
        : null;

    const parts = fullName.trim().split(" ").filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : fullName.slice(0, 2).toUpperCase();

    const effectiveStatus =
      m.participation_status === "pending_approval"
        ? "pending_approval"
        : m.participation_status === "awaiting_checkin"
          ? "awaiting_checkin"
          : m.payment_status === "pending" && m.payment_reference
            ? "pending_review"
            : m.payment_status;
    const regCfg = REG_CFG[effectiveStatus] ?? REG_CFG.pending;
    const RegIcon = regCfg.icon;

    const avatarSize = nested ? "w-9 h-9" : "w-11 h-11";

    return (
      <li
        key={m.id}
        className={`relative ${nested ? "ml-6" : ""}`}
        style={{ opacity: 0, animation: `fadeIn .2s ease forwards` }}
      >
        {nested && (
          <span
            aria-hidden
            className="absolute -left-4 top-0 h-1/2 w-3 border-l-2 border-b-2 border-[var(--border-strong)] rounded-bl-lg"
          />
        )}

        <div className="px-3 py-2.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {u?.avatar_url ? (
              <img
                src={u.avatar_url}
                alt={fullName}
                className={`${avatarSize} rounded-full object-cover flex-shrink-0`}
                style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
              />
            ) : (
              <div
                className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm bg-[var(--primary-soft)] text-[var(--primary)]`}
                style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
              >
                {initials}
              </div>
            )}

            {/* Tên + giới tính + trình độ */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-[var(--text)] truncate ${nested ? "text-xs" : "text-sm"}`}
              >
                {fullName}
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
              {m.is_guest ? (
                <span className={`${BADGE_BASE} ${BADGE_TONE.warning}`}>
                  🙋 Khách
                </span>
              ) : m.tier ? (
                <>
                  <span className={`${BADGE_BASE} ${BADGE_TONE.purple} max-w-full`}>
                    <span className="truncate">💎 {m.tier}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                    {m.total_points ?? 0} điểm
                  </span>
                </>
              ) : (
                <span className={`${BADGE_BASE} ${BADGE_TONE.muted}`}>
                  Chưa có rank
                </span>
              )}
            </div>
          </div>

          {/* Trạng thái thanh toán: hàng riêng, thẳng với cột tên */}
          <div className={nested ? "pl-12" : "pl-14"}>
            <span
              className={`mt-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${regCfg.cls}`}
            >
              <RegIcon className="w-3 h-3" />
              {regCfg.label}
            </span>
          </div>
        </div>
      </li>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{
        background: visible ? "var(--overlay)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background .3s, backdrop-filter .3s",
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full rounded-t-2xl bg-[var(--surface)] border-t border-[var(--border)] text-[var(--text)]"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
          boxShadow: "var(--shadow-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5">
              Thành viên đăng ký
              {!loading && approvedMembers.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] text-[10px] font-bold leading-none">
                  {approvedMembers.length}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-faint)] mt-0.5 truncate max-w-[240px]">
              {sessionTitle}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Đóng"
            className="w-7 h-7 flex-shrink-0 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 px-4 pt-3 pb-6">
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-[var(--surface-muted)] rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : approvedMembers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto text-[var(--text-faint)] mb-2" />
              <p className="text-sm text-[var(--text-faint)]">Chưa có thành viên nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {roots.map((root: any) => (
                <ul key={root.id} className="space-y-2">
                  {renderPerson(root)}
                  {guestsOf(root.id).map((g: any) =>
                    renderPerson(g, { nested: true }),
                  )}
                </ul>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
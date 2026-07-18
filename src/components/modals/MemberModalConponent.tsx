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
  pending: {
    label: "Chờ thanh toán",
    icon: Hourglass,
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
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

  const roots = members.filter((m: any) => !m.host_registration_id);
  const guestsOf = (hostId: string) =>
    members.filter((m: any) => m.host_registration_id === hostId);

  const renderPerson = (m: any, opts?: { nested?: boolean }) => {
    const u = m.users;
    const fullName = u?.full_name ?? m.guest_full_name ?? "?";
    const gender = u?.gender ?? m.guest_gender;
    const skillLevel = m.is_guest ? m.guest_skill_level : null;
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

    return (
      <li
        key={m.id}
        className={`flex items-center gap-3 ${opts?.nested ? "py-2 pl-6" : "py-3"}`}
        style={{ opacity: 0, animation: `fadeIn .2s ease forwards` }}
      >
        {opts?.nested && (
          <span className="w-3 h-px bg-gray-200 flex-shrink-0 -ml-3 mr-[-2px]" />
        )}
        {u?.avatar_url ? (
          <img
            src={u.avatar_url}
            alt={fullName}
            className={`rounded-full object-cover flex-shrink-0 ${opts?.nested ? "w-7 h-7" : "w-9 h-9"}`}
          />
        ) : (
          <div
            className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${opts?.nested ? "w-7 h-7 text-[10px] bg-purple-100 text-purple-700" : "w-9 h-9 text-xs bg-blue-100 text-blue-700"}`}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-gray-900 truncate ${opts?.nested ? "text-xs" : "text-sm"}`}
          >
            {fullName}
            {m.is_guest && (
              <span className="text-xs text-gray-400 ml-1">(khách)</span>
            )}
          </p>
          <p className="text-xs text-gray-400 mb-1">
            {gender === "male" ? "Nam" : gender === "female" ? "Nữ" : ""}
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {(skillLevel || u?.level) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                🎯{" "}
                {skillLevel
                  ? (GUEST_SKILL_LABEL[skillLevel] ?? skillLevel)
                  : (LEVEL_LABELS[u?.level] ?? u?.level)}
              </span>
            )}
            {!m.is_guest &&
              (m.tier ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  💎 {m.tier} · {m.total_points ?? 0}đ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                  Chưa có rank
                </span>
              ))}
          </div>
        </div>
        <span
          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 self-start ${regCfg.cls}`}
        >
          <RegIcon className="w-3 h-3" />
          {regCfg.label}
        </span>
      </li>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{
        background: visible ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(2px)" : "none",
        transition: "background .3s, backdrop-filter .3s",
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-full bg-white rounded-t-2xl"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "env(safe-area-inset-bottom)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Thành viên đăng ký
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">
              {sessionTitle}
            </p>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {loading ? (
            <div className="space-y-3 pt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-8 h-8 mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Chưa có thành viên nào</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 pt-1">
              {roots.map((root: any) => {
                const guests = guestsOf(root.id);
                return (
                  <div key={root.id}>
                    {renderPerson(root)}
                    {guests.length > 0 && (
                      <ul>
                        {guests.map((g: any) =>
                          renderPerson(g, { nested: true }),
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

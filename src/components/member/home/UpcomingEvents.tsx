"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Megaphone,
  ChevronRight,
  CalendarDays,
  Users,
  Gift,
  BarChart3,
  Loader2,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { c } from "@/lib/theme";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open: { label: "Mở đăng ký", cls: "bg-emerald-500 shadow-emerald-500/30" },
  upcoming: { label: "Sắp diễn ra", cls: "bg-violet-500 shadow-violet-500/30" },
  ongoing: { label: "Chuẩn bị", cls: "bg-blue-500 shadow-blue-500/30" },
  draft: { label: "Sắp mở", cls: "bg-amber-500 shadow-amber-500/30" },
  closed: { label: "Đã đóng", cls: "bg-slate-500 shadow-slate-500/30" },
  completed: { label: "Đã kết thúc", cls: "bg-slate-500 shadow-slate-500/30" },
  cancelled: { label: "Đã huỷ", cls: "bg-red-500 shadow-red-500/30" },
};

const TYPE_STATUS_OVERRIDE: Record<string, Record<string, string>> = {
  shirt_order: { open: "Đang nhận đăng ký" },
  tournament: { open: "Mở đăng ký" },
  birthday: { upcoming: "Sắp diễn ra" },
  offline_event: { ongoing: "Chuẩn bị", draft: "Chuẩn bị" },
  poll: { open: "Cần bình chọn" },
};

function getParticipantLabel(type: string, count: number) {
  switch (type) {
    case "tournament":
      return `${count} người đã đăng ký`;
    case "birthday":
      return `${count} thành viên`;
    case "poll":
      return `${count} lượt bình chọn`;
    default:
      return `Đã đăng kí ${count} áo`;
  }
}

function getParticipantIcon(type: string) {
  if (type === "birthday") return Gift;
  if (type === "poll") return BarChart3;
  return Users;
}

export function UpcomingEvents() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    activitiesApi
      .list({ limit: 20 })
      .then(({ data }) => {
        const active = (data.data ?? []).filter(
          (a: any) => a.status !== "completed",
        );
        setItems(active.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleShirtOrderClick = async (activityId: string) => {
    if (checkingId) return;
    setCheckingId(activityId);
    try {
      const { data } = await activitiesApi.getMyStatus(activityId);
      const hasOrdered =
        Array.isArray(data?.my_registrations) && data.my_registrations.length > 0;
      router.push(
        hasOrdered ? `/events/${activityId}/history` : `/events/${activityId}`,
      );
    } catch {
      router.push(`/events/${activityId}`);
    } finally {
      setCheckingId(null);
    }
  };

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Megaphone className="w-4 h-4 text-[var(--pink)]" />
          <h3 className="font-bold text-[var(--text-muted)] text-sm">Hoạt động sắp tới</h3>
        </div>
        <Link
          href="/activities"
          className="text-xs text-[var(--primary)] font-semibold flex items-center gap-0.5"
        >
          Tất cả <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl h-20 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
          style={{ boxShadow: c.shadow }}
        >
          <ul className="divide-y divide-[var(--border)]">
            {items.map((a) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.draft;
              const overrideLabel =
                a.status_label_override ??
                TYPE_STATUS_OVERRIDE[a.type]?.[a.status];
              const ParticipantIcon = getParticipantIcon(a.type);
              const dateValue = a.deadline ?? a.event_date;
              const isDeadline = Boolean(a.deadline);
              const isChecking = checkingId === a.id;

              const itemContent = (
                <div className="flex items-center gap-3 px-4 py-3 active:bg-[var(--surface-hover)] transition-colors relative">
                  {isChecking && (
                    <div
                      className="absolute inset-0 flex items-center justify-center z-10"
                      style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)" }}
                    >
                      <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {a.cover_image_url ? (
                      <img
                        src={a.cover_image_url}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (a.emoji ?? "📌")
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">
                      {a.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-muted)]">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {isDeadline ? "Deadline: " : ""}
                        {dateValue
                          ? format(new Date(dateValue), "dd/MM/yyyy", {
                            locale: vi,
                          })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-[var(--text-muted)]">
                      <ParticipantIcon className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {getParticipantLabel(a.type, a.participant_count ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${cfg.cls}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                      {overrideLabel ?? cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-faint)]" />
                  </div>
                </div>
              );

              if (a.type === "shirt_order") {
                return (
                  <li key={a.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleShirtOrderClick(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleShirtOrderClick(a.id);
                      }}
                      className={`cursor-pointer ${isChecking ? "pointer-events-none" : ""}`}
                    >
                      {itemContent}
                    </div>
                  </li>
                );
              }

              return (
                <li key={a.id}>
                  <Link href={`/events/${a.id}`}>{itemContent}</Link>
                </li>
              );
            })}
          </ul>

          <div className="mx-4 mb-3 mt-1 bg-[var(--primary-soft)] rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              i
            </span>
            <p className="text-[11px] text-[var(--primary)]">
              Chạm vào một hoạt động để xem chi tiết hoặc đăng ký.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
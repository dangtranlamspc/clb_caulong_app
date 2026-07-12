"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Megaphone,
  ChevronRight,
  CalendarDays,
  Users,
  Gift,
  BarChart3,
} from "lucide-react";
import { activitiesApi } from "@/lib/api";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  open: { label: "Mở đăng ký", cls: "bg-emerald-50 text-emerald-600" },
  upcoming: { label: "Sắp diễn ra", cls: "bg-purple-50 text-purple-600" },
  ongoing: { label: "Chuẩn bị", cls: "bg-blue-50 text-blue-600" },
  draft: { label: "Sắp mở", cls: "bg-gray-50 text-gray-500" },
  closed: { label: "Đã đóng", cls: "bg-slate-50 text-slate-500" },
  completed: { label: "Đã kết thúc", cls: "bg-slate-50 text-slate-500" },
  cancelled: { label: "Đã huỷ", cls: "bg-red-50 text-red-500" },
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
      return `${count} đội đã đăng ký`;
    case "birthday":
      return `${count} thành viên`;
    case "poll":
      return `${count} lượt bình chọn`;
    default:
      return `${count} người đã đăng ký`;
  }
}

function getParticipantIcon(type: string) {
  if (type === "birthday") return Gift;
  if (type === "poll") return BarChart3;
  return Users;
}

export function UpcomingEvents() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activitiesApi
      .list({ limit: 5 })
      .then(({ data }) => setItems(data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Megaphone className="w-4 h-4 text-pink-500" />
          <h3 className="font-bold text-gray-900 text-sm">Hoạt động sắp tới</h3>
        </div>
        <Link
          href="/activities"
          className="text-xs text-blue-600 font-semibold flex items-center gap-0.5"
        >
          Tất cả <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {items.map((a) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.draft;
              const overrideLabel =
                a.status_label_override ??
                TYPE_STATUS_OVERRIDE[a.type]?.[a.status];
              const ParticipantIcon = getParticipantIcon(a.type);
              const dateValue = a.deadline ?? a.event_date;
              const isDeadline = Boolean(a.deadline);

              return (
                <li key={a.id}>
                  <Link href={`/events/${a.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
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
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {a.title}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
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
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                          <ParticipantIcon className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {getParticipantLabel(
                              a.type,
                              a.participant_count ?? 0,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}
                        >
                          {overrideLabel ?? cfg.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mx-4 mb-3 mt-1 bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              i
            </span>
            <p className="text-[11px] text-blue-600">
              Chạm vào một hoạt động để xem chi tiết hoặc đăng ký.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

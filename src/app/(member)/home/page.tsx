"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CalendarDays,
  Trophy,
  ClipboardList,
  ChevronRight,
  MapPin,
  Users,
  CheckCircle2,
  Hourglass,
  AlertCircle,
  TrendingUp,
  Zap,
  Gift,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  profileApi,
  rankingsApi,
  registrationsApi,
  sessionsApi,
  usersApi,
} from "@/lib/api";
import { UpcomingEvents } from "@/components/events/UpcomingEvents";

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

const VANG_LAI_THRESHOLD = 5;

function getMemberLevelBadge(user: any): {
  emoji: string;
  line1: string;
  line2?: string;
} {
  if (!user) return { emoji: "🎯", line1: "Chưa có level" };

  if (user.member_type === "co_dinh") {
    const isVip = user.member_subtype === "vip";
    const levelLabel = user.level ? LEVEL_LABELS[user.level] : undefined;

    return {
      emoji: isVip ? "👑" : "🏆",
      line1: isVip ? "Thành viên VIP" : "Thành viên thường",
      line2: levelLabel,
    };
  }

  if (user.member_type === "vang_lai") {
    const count = user.attendance_count ?? 0;
    const isKhachQuen =
      user.vang_lai_status === "khach_quen" || count >= VANG_LAI_THRESHOLD;

    return {
      emoji: isKhachQuen ? "🥈" : "🥉",
      line1: user.vang_lai_label ?? (isKhachQuen ? "Khách quen" : "Khách mới"),
    };
  }

  return { emoji: "🎯", line1: "Chưa có level" };
}

const REG_CFG: Record<
  string,
  { label: string; icon: any; cls: string; bg: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    icon: Hourglass,
    cls: "text-amber-600",
    bg: "bg-amber-50",
  },
  confirmed: {
    label: "Đã xác nhận",
    icon: CheckCircle2,
    cls: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  rejected: {
    label: "Từ chối",
    icon: AlertCircle,
    cls: "text-red-500",
    bg: "bg-red-50",
  },
};

export default function HomePage() {
  const { user, setUser } = useAuthStore();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);

  const [participantsModal, setParticipantsModal] = useState<{
    open: boolean;
    sessionId: string | null;
    sessionTitle?: string;
  }>({ open: false, sessionId: null });
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      sessionsApi.list({ status: "open", limit: 3 }),
      registrationsApi.getMyRegistrations({ limit: 3 }),
      rankingsApi.myStats(),
      rankingsApi.myRank(),
      usersApi.birthdaysThisMonth(),
      profileApi.getMe(),
    ])
      .then(([s, r, st, rk, bd, me]) => {
        const sortedUpcoming = [...(s.data.data ?? [])].sort(
          (a: any, b: any) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime(),
        );
        setUpcoming(sortedUpcoming);
        setMyRegs(r.data.data ?? []);
        setMyStats(st.data);
        setMyRank(rk.data);
        setBirthdays(bd.data ?? []);
        setUser(me.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const levelBadge = getMemberLevelBadge(user);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Chào buổi sáng";
    if (h < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const openParticipants = async (sessionId: string, title: string) => {
    setParticipantsModal({ open: true, sessionId, sessionTitle: title });
    setParticipantsLoading(true);
    try {
      const res = await sessionsApi.getParticipants(sessionId);
      setParticipants(res.data ?? []);
    } catch {
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();

  return (
    <>
      <div className="space-y-5">
        {/* Hero banner */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 rounded-3xl p-5 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              {/* Avatar */}
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-blue-200 text-sm">{greeting()},</p>
                <h2 className="text-white text-xl font-black mt-0.5">
                  {user?.full_name} 👋
                </h2>
              </div>
            </div>

            <div className="flex items-stretch gap-2.5 mt-4">
              {loading ? (
                <div className="h-14 flex-1 bg-white/10 rounded-2xl animate-pulse" />
              ) : (
                <>
                  <div className="bg-white/15 rounded-2xl px-3 py-2 flex items-center gap-2 flex-1">
                    <span className="text-2xl">{levelBadge.emoji}</span>
                    <div className="text-white mt-0.5 leading-tight">
                      <p className="text-[13px] font-bold">
                        {levelBadge.line1}
                      </p>

                      {levelBadge.line2 && (
                        <p className="text-[15px] text-yellow-200 font-medium">
                          {levelBadge.line2}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                    <p className="text-white/60 text-[10px] leading-none">
                      W / L
                    </p>

                    <p className="text-white font-black text-lg mt-0.5">
                      {myStats?.revice?.wins ?? 0} /{" "}
                      {myStats?.revice?.losses ?? 0}
                    </p>

                    <p className="text-[14px] text-white/50 mt-0.5">
                      {myRank?.tier ?? "Tân thủ"}
                    </p>

                    <p className="text-yellow-300 font-bold text-sm">
                      {myRank?.total_points ?? 0} điểm
                    </p>
                  </div>
                  <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                    <p className="text-white/60 text-[10px] leading-none">
                      Tháng này
                    </p>
                    <p className="text-white font-black text-xl mt-0.5">
                      {myStats?.sessions_this_month ?? 0}
                    </p>
                    <p className="text-white/50 text-[10px]">buổi</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              href: "/activity",
              icon: CalendarDays,
              label: "Hoạt động",
              bg: "bg-blue-50",
              ic: "text-blue-600",
              ring: "ring-blue-100",
            },
            {
              href: "/history",
              icon: ClipboardList,
              label: "Lịch sử\ncủa tôi",
              bg: "bg-amber-50",
              ic: "text-amber-600",
              ring: "ring-amber-100",
            },
            {
              href: "/leaderboard",
              icon: Trophy,
              label: "Bảng\nxếp hạng",
              bg: "bg-purple-50",
              ic: "text-purple-600",
              ring: "ring-purple-100",
            },
          ].map(({ href, icon: Icon, label, bg, ic, ring }) => (
            <Link key={href} href={href}>
              <div
                className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-2 text-center shadow-lg shadow-black/10 active:scale-95 transition-transform`}
              >
                <div
                  className={`w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm ring-1 ${ring}`}
                >
                  <Icon className={`w-5 h-5 ${ic}`} />
                </div>
                <p className="text-xs font-semibold text-gray-700 leading-tight whitespace-pre-line h-8 flex items-center justify-center">
                  {label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!loading && birthdays.length > 0 && (
          <section>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background: "linear-gradient(135deg, #f857a6, #ec4899)",
                    boxShadow: "0 2px 8px rgba(248,87,166,0.35)",
                    animation: "cakeWiggle 2.5s ease-in-out infinite",
                  }}
                >
                  🎂
                </div>
                <h3 className="font-bold text-gray-600 text-sm">
                  Sinh nhật tháng {currentMonth + 1}
                </h3>
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#fce7f3", color: "#be185d" }}
              >
                {birthdays.length} người
              </span>
            </div>

            {/* Cards grid — 4 per row, scrollable */}
            <div className="grid grid-cols-4 gap-2">
              {birthdays.map((m, idx) => {
                const dob = new Date(m.date_of_birth);
                const day = dob.getDate();
                const isToday =
                  dob.getDate() === currentDay &&
                  dob.getMonth() === currentMonth;
                const isUpcoming =
                  !isToday &&
                  Math.abs(day - currentDay) <= 4 &&
                  day >= currentDay;
                const initials =
                  m.full_name
                    ?.split(" ")
                    .slice(-2)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase() ?? "?";
                const firstName = m.full_name?.split(" ").pop() ?? m.full_name;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl relative overflow-hidden"
                    style={{
                      ...(isToday
                        ? {
                          background:
                            "linear-gradient(160deg, #fff0f8, #fce7f3)",
                          border: "1.5px solid #f9a8d4",
                          boxShadow: "0 4px 16px rgba(248,87,166,0.18)",
                          animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both, todayPulse 3s ease-in-out 0.5s infinite`,
                        }
                        : isUpcoming
                          ? {
                            background:
                              "linear-gradient(160deg, #fff7ed, #ffedd5)",
                            border: "1px solid #fed7aa",
                            animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
                          }
                          : {
                            background: "white",
                            border: "1px solid #f3f4f6",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                            animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
                          }),
                    }}
                  >
                    {isToday && (
                      <span
                        className="absolute top-1.5 right-1.5 text-[7px] font-black px-1.5 py-0.5 rounded-full text-white uppercase tracking-wide"
                        style={{
                          background:
                            "linear-gradient(135deg, #f857a6, #ec4899)",
                        }}
                      >
                        Hôm nay
                      </span>
                    )}

                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm relative overflow-hidden"
                      style={
                        isToday
                          ? {
                            background: m.avatar_url
                              ? "transparent"
                              : "linear-gradient(135deg, #f857a6, #ec4899)",
                            color: "white",
                            fontSize: "18px",
                            boxShadow: "0 3px 10px rgba(248,87,166,0.45)",
                          }
                          : isUpcoming
                            ? {
                              background: m.avatar_url
                                ? "transparent"
                                : "linear-gradient(135deg, #fed7aa, #fdba74)",
                              color: "#9a3412",
                            }
                            : {
                              background: m.avatar_url
                                ? "transparent"
                                : "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                              color: "#1d4ed8",
                            }
                      }
                    >
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.full_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : isToday ? (
                        "🎂"
                      ) : (
                        initials
                      )}

                      {/* Pulse ring for today */}
                      {isToday && (
                        <span
                          className="absolute inset-0 rounded-full border-2 border-pink-400"
                          style={{
                            animation: "ringOut 1.8s ease-out infinite",
                          }}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <p
                      className="text-[10px] font-bold text-center leading-tight w-full px-0.5 truncate"
                      style={{ color: isToday ? "#9d174d" : "#374151" }}
                    >
                      {firstName}
                    </p>

                    {/* Date badge */}
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={
                        isToday
                          ? {
                            background:
                              "linear-gradient(135deg, #f857a6, #ec4899)",
                            color: "white",
                          }
                          : isUpcoming
                            ? {
                              background: "#fed7aa",
                              color: "#9a3412",
                            }
                            : {
                              background: "#f3f4f6",
                              color: "#6b7280",
                            }
                      }
                    >
                      🎂 {day}/{currentMonth + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Keyframe styles */}
            <style jsx>{`
              @keyframes cardIn {
                from {
                  opacity: 0;
                  transform: scale(0.75) translateY(10px);
                }
                to {
                  opacity: 1;
                  transform: scale(1) translateY(0);
                }
              }
              @keyframes todayPulse {
                0%,
                100% {
                  box-shadow: 0 4px 16px rgba(248, 87, 166, 0.18);
                }
                50% {
                  box-shadow: 0 6px 24px rgba(248, 87, 166, 0.32);
                }
              }
              @keyframes ringOut {
                0% {
                  transform: scale(1);
                  opacity: 0.8;
                }
                100% {
                  transform: scale(1.65);
                  opacity: 0;
                }
              }
              @keyframes cakeWiggle {
                0%,
                100% {
                  transform: rotate(0deg);
                }
                20% {
                  transform: rotate(-12deg);
                }
                40% {
                  transform: rotate(12deg);
                }
                60% {
                  transform: rotate(-6deg);
                }
                80% {
                  transform: rotate(6deg);
                }
              }
            `}</style>
          </section>
        )}

        <UpcomingEvents />

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-300" />
              <h3 className="font-bold text-gray-600 text-sm">
                Buổi đang mở đăng ký
              </h3>
            </div>
            <Link
              href="/sessions"
              className="text-xs text-blue-600 font-semibold flex items-center gap-0.5"
            >
              Tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl h-24 animate-pulse"
                />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl py-10 text-center border border-dashed border-gray-200">
              <CalendarDays className="w-8 h-8 mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">Chưa có buổi nào đang mở</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((s, index) => {
                const myReg = s.my_registration;
                const isFull = s.available_slots <= 0;

                const total = s.max_slots ?? s.total_slots ?? null;
                const filled = total ? total - s.available_slots : null;
                const pct = total
                  ? Math.min(100, Math.round((filled! / total) * 100))
                  : 0;

                const slotStatus: "plenty" | "low" | "full" = isFull
                  ? "full"
                  : pct >= 80
                    ? "low"
                    : "plenty";

                const STATUS_STYLE = {
                  plenty: {
                    text: "text-emerald-600",
                    barBg:
                      "bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500",
                    animate: true,
                  },
                  low: {
                    text: "text-amber-600",
                    barBg:
                      "bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500",
                    animate: true,
                  },
                  full: {
                    text: "text-red-500",
                    barBg: "bg-red-500",
                    animate: false,
                  },
                }[slotStatus];

                return (
                  <Link key={s.id} href={`/sessions/${s.id}`}>
                    <div
                      style={{
                        marginBottom:
                          index !== upcoming.length - 1 ? "20px" : 0,
                      }}
                      className={`bg-white rounded-2xl p-5 shadow-sm border transition-all active:scale-99 ${myReg ? "border-blue-200" : "border-gray-100"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {s.title}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {format(
                                new Date(s.scheduled_at),
                                "EEE dd/MM HH:mm",
                                { locale: vi },
                              )}
                            </span>
                            {s.location && (
                              <span className="flex items-center gap-1 max-w-28 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {s.location}
                              </span>
                            )}
                          </div>

                          {total ? (
                            <div className="mt-3 max-w-[220px]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-gray-400">
                                  Đã đăng ký
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${STATUS_STYLE.text}`}
                                >
                                  {filled}/{total}
                                </span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${STATUS_STYLE.barBg}`}
                                  style={{
                                    width: `${pct}%`,
                                    backgroundSize: STATUS_STYLE.animate
                                      ? "200% 100%"
                                      : "100% 100%",
                                    animation: STATUS_STYLE.animate
                                      ? "energyFlow 2s linear infinite, growBar 0.8s ease-out"
                                      : "growBar 0.8s ease-out",
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${isFull ? "text-red-400" : "text-emerald-500"
                                }`}
                            >
                              <Users className="w-3 h-3" />
                              {isFull
                                ? "Hết chỗ"
                                : `Còn ${s.available_slots} chỗ`}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openParticipants(s.id, s.title);
                            }}
                            className="h-9 pl-3 pr-3.5 rounded-full bg-blue-50 flex items-center gap-1.5 active:scale-90 transition-transform"
                          >
                            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="text-xs font-bold text-blue-600">
                              {filled ?? 0}
                            </span>
                          </button>

                          {myReg ? (
                            <span
                              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border ${myReg.payment_status === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                            >
                              {myReg.payment_status === "confirmed"
                                ? "✓ Xác nhận"
                                : "⏳ Chờ"}
                            </span>
                          ) : !isFull ? (
                            <span className="text-xs bg-blue-600 text-white font-bold px-4 py-2 rounded-full shadow-sm shadow-blue-200">
                              Chi tiết
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <style jsx>{`
                @keyframes energyFlow {
                  0% {
                    background-position: 0% 0%;
                  }
                  100% {
                    background-position: -200% 0%;
                  }
                }
                @keyframes growBar {
                  from {
                    width: 0%;
                  }
                }
              `}</style>
            </div>
          )}
        </section>
        {participantsModal.open && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
            onClick={() =>
              setParticipantsModal({ open: false, sessionId: null })
            }
          >
            <div
              className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[75vh] flex flex-col animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Người tham gia</p>
                  <p className="font-bold text-gray-900 text-sm">
                    {participantsModal.sessionTitle}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setParticipantsModal({ open: false, sessionId: null })
                  }
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-3 space-y-2">
                {participantsLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-gray-50 rounded-2xl animate-pulse"
                    />
                  ))
                ) : participants.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">
                    Chưa có ai đăng ký
                  </p>
                ) : (
                  participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                    >
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.full_name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                          {p.full_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.full_name}
                          {p.is_guest && (
                            <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                              (khách)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {p.level_label && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              🎯{" "}
                              {LEVEL_LABELS[p.level_label] ??
                                GUEST_SKILL_LABELS[p.level_label] ??
                                p.level_label}
                            </span>
                          )}
                          {!p.is_guest &&
                            (p.tier ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                💎 {p.tier} · {p.total_points ?? 0}đ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
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
          </div>
        )}
      </div>
    </>
  );
}

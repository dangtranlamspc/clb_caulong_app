"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Wallet2,
  GlassWater
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  fundApi,
  profileApi,
  rankingsApi,
  registrationsApi,
  sessionsApi,
  usersApi,
} from "@/lib/api";
import { HandbookEntryCard } from "@/components/member/handbook/HandbookEntryCard";
import { HandbookModal } from "@/components/member/handbook/HandbookModal";
import { UpcomingEvents } from "@/components/member/home/UpcomingEvents";
import { UpcomingSessionsSection } from "@/components/member/home/UpcomingSessionsSection";
import { ParticipantsModal } from "@/components/member/home/ParticipantsModal";
import { supabase } from "@/lib/supabase";
import { BirthdayModal } from "@/components/member/home/BirthdayModal";
import { c, alpha, type ThemeTokens } from "@/lib/theme";

const LEVEL_LABELS: Record<string, string> = {
  yeu: "Yếu",
  tb_yeu: "TB yếu",
  tb: "TB",
  tb_plus: "TB+",
  ban_chuyen: "Bán chuyên (BC)",
  chuyen_nghiep: "Chuyên nghiệp",
};

const QUICK_LINKS: {
  href: string;
  icon: typeof CalendarDays;
  label: string;
  tone: keyof ThemeTokens;
  soft: keyof ThemeTokens;
}[] = [
    { href: "/activity", icon: CalendarDays, label: "Hoạt động", tone: "primary", soft: "primarySoft" },
    { href: "/history", icon: ClipboardList, label: "Lịch sử\ncủa tôi", tone: "warning", soft: "warningSoft" },
    { href: "/drinks/my", icon: GlassWater, label: "Nước", tone: "purple", soft: "purpleSoft" },
    { href: "/fund", icon: Wallet2, label: "Quỹ\nchung", tone: "success", soft: "successSoft" },
  ];


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


function fmtCompact(n: number) {
  if (n >= 1_000_000) {
    const trieu = n / 1_000_000;
    return (Number.isInteger(trieu) ? trieu.toString() : trieu.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")).replace(".", ",") + "tr";
  }
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return n.toString();
}

export default function HomePage() {
  const { user, setUser } = useAuthStore();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);
  const [fundBalance, setFundBalance] = useState<number | null>(null);

  const [participantsModal, setParticipantsModal] = useState<{
    open: boolean;
    sessionId: string | null;
    sessionTitle?: string;
  }>({ open: false, sessionId: null });

  const [selectedBirthdayMember, setSelectedBirthdayMember] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [handbookOpen, setHandbookOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      sessionsApi.list({ limit: 20 }),
      registrationsApi.getMyRegistrations({ limit: 3 }),
      rankingsApi.myStats(),
      rankingsApi.myRank(),
      usersApi.birthdaysThisMonth(),
      profileApi.getMe(),
    ])
      .then(([s, r, st, rk, bd, me]) => {
        setUpcoming(s.data.data ?? []);
        setMyRegs(r.data.data ?? []);
        setMyStats(st.data);
        setMyRank(rk.data);
        setBirthdays(bd.data ?? []);
        setUser(me.data);

        if (me.data && !me.data.has_seen_handbook) {
          setHandbookOpen(true);
          profileApi
            .markHandbookSeen()
            .then(() => setUser({ ...me.data, has_seen_handbook: true }))
            .catch(() => { });
        }
      })
      .finally(() => setLoading(false));
  }, []);


  const loadFundBalance = () => {
    fundApi.getSummary().then(({ data }) => setFundBalance(data.balance)).catch(() => { });
  };

  useEffect(() => {
    loadFundBalance();
  }, []);

  useEffect(() => {
    let debounceRef: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("home-fund-balance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fund_transactions" },
        () => {
          if (debounceRef) clearTimeout(debounceRef);
          debounceRef = setTimeout(loadFundBalance, 250);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_fund" },
        () => {
          if (debounceRef) clearTimeout(debounceRef);
          debounceRef = setTimeout(loadFundBalance, 250);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (debounceRef) clearTimeout(debounceRef);
    };
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
        <div
          className="relative rounded-3xl p-5 overflow-hidden"
          style={{
            background: c.heroGradient,
            boxShadow: c.shadow,
          }}
        >
          <div className="relative">
            <div className="flex items-center gap-3 mb-1">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--surface)_20%,transparent)] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-blue-100 text-sm">{greeting()},</p>
                <h2 className="text-white text-xl font-black mt-0.5">
                  {user?.full_name} 👋
                </h2>
              </div>
            </div>

            <div className="flex items-stretch gap-2.5 mt-4">
              {loading ? (
                <div className="h-14 flex-1 bg-[color-mix(in_srgb,var(--surface)_10%,transparent)] rounded-2xl animate-pulse" />
              ) : (
                <>
                  <div className="bg-[color-mix(in_srgb,var(--surface)_15%,transparent)] rounded-2xl px-3 py-2 flex items-center gap-2 flex-1">
                    <span className="text-2xl">{levelBadge.emoji}</span>
                    <div className="text-white mt-0.5 leading-tight">
                      <p className="text-[13px] font-bold">{levelBadge.line1}</p>
                      {levelBadge.line2 && (
                        <p className="text-[15px] text-yellow-200 font-medium">
                          {levelBadge.line2}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-[color-mix(in_srgb,var(--surface)_15%,transparent)] rounded-2xl px-4 py-2 text-center">
                    <p className="text-white/75 text-[10px] leading-none">W / L</p>
                    <p className="text-white font-black text-lg mt-0.5">
                      {myStats?.revice?.wins ?? 0} / {myStats?.revice?.losses ?? 0}
                    </p>
                    <p className="text-[14px] text-white/75 mt-0.5">
                      {myRank?.tier ?? "Tân thủ"}
                    </p>
                    <p className="text-yellow-300 font-bold text-sm">
                      {myRank?.total_points ?? 0} điểm
                    </p>
                  </div>

                  <div className="bg-[color-mix(in_srgb,var(--surface)_15%,transparent)] rounded-2xl px-4 py-2 text-center">
                    <p className="text-white/75 text-[10px] leading-none">Tháng này</p>
                    <p className="text-white font-black text-xl mt-0.5">
                      {myStats?.sessions_this_month ?? 0}
                    </p>
                    <p className="text-white/75 text-[10px]">buổi</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_LINKS.map(({ href, icon: Icon, label, tone, soft }) => (
            <Link key={href} href={href}>
              <div
                className="rounded-2xl p-2.5 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform"
                style={{
                  background: `linear-gradient(180deg, ${alpha(tone, 10)} 0%, transparent 65%), ${c.surface}`,
                  border: `1px solid ${c.border}`,
                  boxShadow: c.shadow,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: c[soft] }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: c[tone] }} />
                </div>

                {href === "/fund" ? (
                  <div className="h-8 flex flex-col items-center justify-center leading-tight">
                    <p className="text-[10px] font-semibold" style={{ color: c.textMuted }}>
                      Quỹ chung
                    </p>
                    <p className="text-[12px] font-black" style={{ color: c.success }}>
                      {fundBalance === null ? "..." : fmtCompact(fundBalance)}
                    </p>
                  </div>
                ) : (
                  <p
                    className="text-[11px] font-semibold leading-tight whitespace-pre-line h-8 flex items-center justify-center"
                    style={{ color: c.text }}
                  >
                    {label}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <HandbookEntryCard
          onClick={() => setHandbookOpen(true)}
          seen={!!user?.has_seen_handbook}
        />

        {!loading && birthdays.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                  style={{
                    background: "linear-gradient(135deg, #f857a6, #ec4899)",
                    boxShadow: "0 2px 8px rgba(248,87,166,0.35)",
                  }}
                >
                  🎂
                </div>
                <h3 className="font-bold text-sm" style={{ color: c.textMuted }}>
                  Sinh nhật tháng {currentMonth + 1}
                </h3>
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: c.pinkSoft, color: c.pink }}
              >
                {birthdays.length} người
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {birthdays.map((m, idx) => {
                const dob = new Date(m.date_of_birth);
                const day = dob.getDate();
                const isToday =
                  dob.getDate() === currentDay && dob.getMonth() === currentMonth;
                const isUpcoming =
                  !isToday && Math.abs(day - currentDay) <= 4 && day >= currentDay;
                const initials =
                  m.full_name
                    ?.split(" ")
                    .slice(-2)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase() ?? "?";
                const firstName = m.full_name?.split(" ").pop() ?? m.full_name;

                const enter = `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`;

                const cardStyle = isToday
                  ? {
                    background: `linear-gradient(160deg, ${c.pinkSoft} 0%, ${alpha("pink", 25)} 100%), ${c.surface}`,
                    border: `1.5px solid ${alpha("pink", 55)}`,
                    boxShadow: "0 4px 16px rgba(248,87,166,0.18)",
                    animation: `${enter}, todayPulse 3s ease-in-out 0.5s infinite`,
                  }
                  : isUpcoming
                    ? {
                      background: `linear-gradient(160deg, ${c.warningSoft} 0%, ${alpha("warning", 18)} 100%), ${c.surface}`,
                      border: `1px solid ${alpha("warning", 40)}`,
                      animation: enter,
                    }
                    : {
                      background: c.surface,
                      border: `1px solid ${c.border}`,
                      boxShadow: c.shadow,
                      animation: enter,
                    };

                const avatarStyle = isToday
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
                      background: m.avatar_url ? "transparent" : c.warningSoft,
                      color: c.warning,
                    }
                    : {
                      background: m.avatar_url ? "transparent" : c.primarySoft,
                      color: c.primary,
                    };

                const dateChipStyle = isToday
                  ? { background: "linear-gradient(135deg, #f857a6, #ec4899)", color: "white" }
                  : isUpcoming
                    ? { background: c.warningSoft, color: c.warning }
                    : { background: c.surfaceMuted, color: c.textMuted };

                return (
                  <div
                    key={m.id ?? idx}
                    onClick={() => setSelectedBirthdayMember(m)}
                    className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl relative overflow-hidden active:scale-95 transition-transform cursor-pointer"
                    style={cardStyle}
                  >
                    {isToday && (
                      <span
                        className="absolute top-1.5 right-1.5 text-[7px] font-black px-1.5 py-0.5 rounded-full text-white uppercase tracking-wide"
                        style={{ background: "linear-gradient(135deg, #f857a6, #ec4899)" }}
                      >
                        Hôm nay
                      </span>
                    )}

                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm relative overflow-hidden"
                      style={avatarStyle}
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

                      {isToday && (
                        <span
                          className="absolute inset-0 rounded-full border-2 border-pink-400"
                          style={{ animation: "ringOut 1.8s ease-out infinite" }}
                        />
                      )}
                    </div>

                    <p
                      className="text-[10px] font-bold text-center leading-tight w-full px-0.5 truncate"
                      style={{ color: isToday ? c.pink : c.text }}
                    >
                      {firstName}
                    </p>

                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      style={dateChipStyle}
                    >
                      🎂 {day}/{currentMonth + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            <style jsx>{`
      @keyframes cardIn {
        from { opacity: 0; transform: scale(0.75) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes todayPulse {
        0%, 100% { box-shadow: 0 4px 16px rgba(248, 87, 166, 0.18); }
        50% { box-shadow: 0 6px 24px rgba(248, 87, 166, 0.32); }
      }
      @keyframes ringOut {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.65); opacity: 0; }
      }
      @keyframes cakeWiggle {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(-12deg); }
        40% { transform: rotate(12deg); }
        60% { transform: rotate(-6deg); }
        80% { transform: rotate(6deg); }
      }
    `}</style>
          </section>
        )}

        <UpcomingSessionsSection
          upcoming={upcoming}
          loading={loading}
          onOpenParticipants={openParticipants}
        />

        <UpcomingEvents />

        <HandbookModal open={handbookOpen} onClose={() => setHandbookOpen(false)} />

        <ParticipantsModal
          open={participantsModal.open}
          sessionTitle={participantsModal.sessionTitle}
          participants={participants}
          loading={participantsLoading}
          onClose={() => setParticipantsModal({ open: false, sessionId: null })}
        />

        <BirthdayModal
          open={!!selectedBirthdayMember}
          member={selectedBirthdayMember}
          currentUserId={user?.id}
          onClose={() => setSelectedBirthdayMember(null)}
          onSendWishes={async (memberId, message) => {
            await usersApi.sendBirthdayWish(memberId, { message });
          }}
        />
      </div>
    </>
  );
}

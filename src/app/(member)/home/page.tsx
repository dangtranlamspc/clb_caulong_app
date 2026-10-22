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
import { WeatherHero } from "@/components/member/home/WeatherHero";
import { BirthdaySection } from "@/components/member/home/BirthdaySection";

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
  return (
    <>
      <div className="space-y-5">
        <WeatherHero style={{ boxShadow: c.shadow }}>
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
        </WeatherHero>

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

        {!loading && user && !user.has_seen_handbook && (
          <HandbookEntryCard onClick={() => setHandbookOpen(true)} seen={false} />
        )}

        {!loading && birthdays.length > 0 && (
          <BirthdaySection birthdays={birthdays} onSelect={setSelectedBirthdayMember} />
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
      </div >
    </>
  );
}

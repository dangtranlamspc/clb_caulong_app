'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Users, Crown, User, UserRound, CalendarDays, Wallet, Flame, BadgeCheck,
    Megaphone, Calendar, ChevronRight, Receipt, HandCoins, TrendingUp, TrendingDown,
    Scale, CupSoda, AlertTriangle, PiggyBank,
} from 'lucide-react';
import { format } from 'date-fns';
import { sessionsApi, rankingsAdminApi, dashboardAdminApi, eventsAdminApi, userDrinksAdminApi, fundApi } from '@/lib/api';
import { CustomSelect } from '@/components/admin/sessions/CustomSelect';
import { fmtFull, SessionCostCard, SessionCostDetailModal } from '@/components/admin/shared/session-cost';
import { DrinkHoldersModal } from '@/components/admin/shared/DrinkHoldersModal';

const FINANCE_PERIOD_OPTIONS = [
    { value: '1', label: '1 tháng' }, { value: '3', label: '3 tháng' }, { value: '6', label: '6 tháng' },
    { value: '9', label: '9 tháng' }, { value: '12', label: '1 năm' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

const TOP_ROW = 'h-[340px] flex-none xl:h-[320px]';

const BOTTOM_ROW = 'flex-1 min-h-[300px] xl:min-h-0';

const ATTENDANCE_TIERS = [
    { min: 0, max: 1, icon: '🥚', label: 'Người Mới Tham Gia' },
    { min: 2, max: 5, icon: '🏸', label: 'Làm Quen Sân' },
    { min: 6, max: 12, icon: '💪', label: 'Bắt Nhịp' },
    { min: 13, max: 25, icon: '⚡', label: 'Ổn Sân' },
    { min: 26, max: 45, icon: '🔥', label: 'Thành Thạo Sân' },
    { min: 46, max: 80, icon: '⭐', label: 'Gắn Bó CLB' },
    { min: 81, max: 130, icon: '💎', label: 'Trụ Cột Sân' },
    { min: 131, max: Infinity, icon: '👑', label: 'Lão Làng Sân Cầu' },
];

const ACTIVITY_TYPE_DEFAULT_IMAGE: Record<string, string> = {
    shirt_order: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/T-shirt/3D/t-shirt_3d.png',
    tournament: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png',
    birthday: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Birthday%20cake/3D/birthday_cake_3d.png',
    offline_event: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png',
    poll: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20chart/3D/bar_chart_3d.png',
};

const ACTIVITY_TYPE_ICON_BG: Record<string, string> = {
    shirt_order: 'bg-blue-50', tournament: 'bg-amber-50', birthday: 'bg-pink-50',
    offline_event: 'bg-orange-50', poll: 'bg-purple-50',
};

const ACTIVITY_STATUS_CFG: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-500', open: 'bg-green-50 text-green-700',
    upcoming: 'bg-purple-50 text-purple-600', ongoing: 'bg-blue-50 text-blue-600',
    closed: 'bg-orange-50 text-orange-600', completed: 'bg-slate-50 text-slate-500',
    cancelled: 'bg-red-50 text-red-500',
};

const ACTIVITY_STATUS_LABEL: Record<string, string> = {
    draft: 'Nháp', open: 'Mở đăng ký', upcoming: 'Sắp diễn ra', ongoing: 'Đang diễn ra',
    closed: 'Đã đóng đăng ký', completed: 'Đã kết thúc', cancelled: 'Đã huỷ',
};

function activityMetaLine(a: any) {
    const dateLabel = a.deadline
        ? `Deadline: ${format(new Date(a.deadline), 'dd/MM/yyyy')}`
        : a.event_date ? format(new Date(a.event_date), 'dd/MM/yyyy') : null;
    const countLabel = a.registrations_count != null ? `${a.registrations_count} người đã đăng ký` : null;
    return { dateLabel, countLabel };
}

function ActivityThumbnail({ src, emoji }: { src?: string | null; emoji: string }) {
    const [err, setErr] = useState(false);
    if (src && !err) {
        return <img src={src} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />;
    }
    return <span className="text-2xl">{emoji}</span>;
}

function getAttendanceTier(total: number) {
    return ATTENDANCE_TIERS.find((t) => total >= t.min && total <= t.max) ?? ATTENDANCE_TIERS[0];
}

function rankBadgeClass(idx: number) {
    if (idx === 0) return 'bg-amber-400 text-white';
    if (idx === 1) return 'bg-slate-300 text-white';
    if (idx === 2) return 'bg-orange-300 text-white';
    return 'text-gray-400';
}

function MiniDelta({ delta }: { delta: number }) {
    if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">▲ {delta}</span>;
    if (delta < 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">▼ {Math.abs(delta)}</span>;
    return <span className="text-[10px] font-medium text-gray-300">—</span>;
}

function LeaderAvatar({ src, name }: { src?: string | null; name: string }) {
    const [err, setErr] = useState(false);
    return (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            {src && !err ? (
                <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
            ) : (
                <User className="w-4 h-4 text-slate-500" />
            )}
        </div>
    );
}

function CardSkeleton({ className = 'h-20' }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-gray-100 rounded-2xl ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
}

function Reveal({ show, delayMs = 0, children }: { show: boolean; delayMs?: number; children: React.ReactNode }) {
    if (!show) return null;
    return <div className="animate-reveal" style={{ animationDelay: `${delayMs}ms` }}>{children}</div>;
}

function sessionTime(i: any) {
    const s = i?.session ?? {};
    const raw = s.session_date ?? s.date ?? s.start_time ?? s.created_at;
    const t = raw ? new Date(raw).getTime() : 0;
    return isNaN(t) ? 0 : t;
}

function SessionCostCarousel({ items, onSelect }: { items: any[]; onSelect: (id: string) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    useEffect(() => {
        ref.current?.scrollTo({ top: 0 });
        setActive(0);
    }, [items]);

    const onScroll = () => {
        const el = ref.current;
        if (!el || !el.clientHeight) return;
        setActive(Math.round(el.scrollTop / el.clientHeight));
    };

    const goTo = (i: number) => {
        const el = ref.current;
        if (!el) return;
        el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
    };

    return (
        <div className="absolute inset-0">
            <div
                ref={ref}
                onScroll={onScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {items.map((item, idx) => (
                    <div
                        key={item.session.id}
                        className="h-full snap-start snap-always overflow-y-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {idx === 0 && (
                            <span className="inline-block mb-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                Mới nhất
                            </span>
                        )}
                        <SessionCostCard item={item} onClick={() => onSelect(item.session.id)} />
                        {idx < items.length - 1 && (
                            <p className="mt-2 text-center text-[10px] text-gray-300">↓ Cuộn để xem buổi trước</p>
                        )}
                    </div>
                ))}
            </div>

            {items.length > 1 && (
                <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            aria-label={`Buổi ${i + 1}`}
                            className={`w-1.5 rounded-full transition-all ${i === active ? 'h-4 bg-emerald-500' : 'h-1.5 bg-gray-200 hover:bg-gray-300'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function Panel({
    title, icon: Icon, iconCls = 'text-blue-500', action, children, className = '', bodyClassName = '',
}: {
    title: string; icon?: any; iconCls?: string; action?: React.ReactNode;
    children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
    return (
        <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col min-h-0 ${className}`}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${iconCls}`} />}
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate">{title}</h3>
                </div>
                {action}
            </div>
            <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
        </section>
    );
}

function KpiCard({
    icon: Icon, iconBg, label, value, sub, valueCls = 'text-gray-900', children,
}: {
    icon: any; iconBg: string; label: string; value: React.ReactNode;
    sub?: React.ReactNode; valueCls?: string; children?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
            </div>
            <p className={`mt-2 text-xl font-bold leading-tight tabular-nums ${valueCls}`}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
            {children}
        </div>
    );
}

type LeaderRow = {
    id: string; full_name: string; avatar_url?: string | null;
    rank_label: string; points: number; points_delta: number; badge: 'fire' | 'verified' | null;
};

type AttendanceLeaderRow = {
    id: string; full_name: string; avatar_url?: string | null;
    sessions_this_month: number; total_sessions: number; sessions_delta: number;
};

const EMPTY_SUMMARY = { member_count: 0, total_count: 0, total_amount: 0 };

export default function AdminDashboardPage() {
    const router = useRouter();
    const now = new Date();

    const [statsLoading, setStatsLoading] = useState(true);
    const [totalMembers, setTotalMembers] = useState(0);
    const [memberBreakdown, setMemberBreakdown] = useState({ vip: 0, thuong: 0, vang_lai: 0 });

    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionCounts, setSessionCounts] = useState({ today: 0, this_week: 0, this_month: 0 });

    const [walletLoading, setWalletLoading] = useState(true);
    const [walletSummary, setWalletSummary] = useState<any>(null);
    const [monthlyFinance, setMonthlyFinance] = useState({ income: 0, expense: 0 });

    const [pointsLoading, setPointsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [leaderboardAttendance, setLeaderboardAttendance] = useState<AttendanceLeaderRow[]>([]);
    const [attendanceMonth, setAttendanceMonth] = useState(now.getMonth() + 1);
    const [attendanceYear, setAttendanceYear] = useState(now.getFullYear());
    const [leaderTab, setLeaderTab] = useState<'points' | 'attendance'>('points');

    const [financePeriod, setFinancePeriod] = useState(6);
    const [financeYear, setFinanceYear] = useState(now.getFullYear());
    const [financeYears, setFinanceYears] = useState<number[]>([now.getFullYear()]);
    const [financeChartData, setFinanceChartData] = useState<{ month: string; Thu: number; Chi: number }[]>([]);
    const [financeChartLoading, setFinanceChartLoading] = useState(true);

    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    const [periodMonth, setPeriodMonth] = useState<number | null>(now.getMonth() + 1);
    const [periodYear, setPeriodYear] = useState(now.getFullYear());
    const [costLoading, setCostLoading] = useState(true);
    const [costSessions, setCostSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    const [drinkLoading, setDrinkLoading] = useState(true);
    const [drinkStats, setDrinkStats] = useState({
        total_members_owning: 0, total_quantity: 0, total_value: 0, transactions_this_month: 0,
    });
    const [drinkBreakdown, setDrinkBreakdown] = useState<any[]>([]);
    const [showDrinkHolders, setShowDrinkHolders] = useState(false);

    const [penaltyLoading, setPenaltyLoading] = useState(true);
    const [topPenalized, setTopPenalized] = useState<any[]>([]);
    const [penaltySummary, setPenaltySummary] = useState(EMPTY_SUMMARY);

    const [topupLoading, setTopupLoading] = useState(true);
    const [topTopups, setTopTopups] = useState<any[]>([]);
    const [topupSummary, setTopupSummary] = useState(EMPTY_SUMMARY);

    const rootRef = useRef<HTMLDivElement>(null);
    const [rootH, setRootH] = useState<number | null>(null);


    useEffect(() => {
        const calc = () => {
            const el = rootRef.current;
            if (!el) return;
            if (window.innerWidth < 1280) { setRootH(null); return; } // dưới xl: để tự cao
            const top = el.getBoundingClientRect().top;
            setRootH(window.innerHeight - top - 16); // 16 = khoảng đệm dưới
        };
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);

    useEffect(() => {
        setStatsLoading(true);
        dashboardAdminApi.getMemberTypeCounts()
            .then(({ data: c }) => {
                setMemberBreakdown({ vip: c.vip ?? 0, thuong: c.thuong ?? 0, vang_lai: c.vang_lai ?? 0 });
                setTotalMembers(c.total ?? 0);
            })
            .catch(() => { })
            .finally(() => setStatsLoading(false));
    }, []);

    useEffect(() => {
        setActivitiesLoading(true);
        eventsAdminApi.list({ limit: 5 })
            .then(({ data }) => setRecentActivities(data?.data ?? []))
            .catch(() => setRecentActivities([]))
            .finally(() => setActivitiesLoading(false));
    }, []);

    useEffect(() => {
        setSessionLoading(true);
        const n = new Date();
        const startOfDay = new Date(n.getFullYear(), n.getMonth(), n.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const startOfMonth = new Date(n.getFullYear(), n.getMonth(), 1);
        const endOfMonth = new Date(n.getFullYear(), n.getMonth() + 1, 0);
        const iso = (d: Date) => format(d, 'yyyy-MM-dd');

        Promise.allSettled([
            sessionsApi.list({ from_date: iso(startOfDay), to_date: iso(startOfDay), limit: 1, page: 1 }),
            sessionsApi.list({ from_date: iso(startOfWeek), to_date: iso(endOfWeek), limit: 1, page: 1 }),
            sessionsApi.list({ from_date: iso(startOfMonth), to_date: iso(endOfMonth), limit: 1, page: 1 }),
        ]).then(([t, w, m]) => {
            setSessionCounts({
                today: t.status === 'fulfilled' ? (t.value as any)?.data?.meta?.total ?? 0 : 0,
                this_week: w.status === 'fulfilled' ? (w.value as any)?.data?.meta?.total ?? 0 : 0,
                this_month: m.status === 'fulfilled' ? (m.value as any)?.data?.meta?.total ?? 0 : 0,
            });
        }).finally(() => setSessionLoading(false));
    }, []);

    useEffect(() => {
        setPenaltyLoading(true);
        fundApi.getTopPenalizedMembers({ month: periodMonth ?? undefined, year: periodYear, limit: 5 })
            .then(({ data }) => {
                setTopPenalized(data?.items ?? []);
                setPenaltySummary(data?.summary ?? EMPTY_SUMMARY);
            })
            .catch(() => {
                setTopPenalized([]);
                setPenaltySummary(EMPTY_SUMMARY);
            })
            .finally(() => setPenaltyLoading(false));
    }, [periodMonth, periodYear]);

    useEffect(() => {
        setTopupLoading(true);
        dashboardAdminApi.getTopTopups({ month: periodMonth ?? undefined, year: periodYear, limit: 5 })
            .then(({ data }) => {
                setTopTopups(data?.items ?? []);
                setTopupSummary(data?.summary ?? EMPTY_SUMMARY);
            })
            .catch(() => {
                setTopTopups([]);
                setTopupSummary(EMPTY_SUMMARY);
            })
            .finally(() => setTopupLoading(false));
    }, [periodMonth, periodYear]);

    useEffect(() => {
        setDrinkLoading(true);
        Promise.allSettled([
            userDrinksAdminApi.getOverviewStats(),
            userDrinksAdminApi.getDrinksBreakdown(),
        ]).then(([statsRes, breakdownRes]) => {
            if (statsRes.status === 'fulfilled') {
                const s = (statsRes.value as any).data ?? {};
                setDrinkStats({
                    total_members_owning: s.total_members_owning ?? 0,
                    total_quantity: s.total_quantity ?? 0,
                    total_value: s.total_value ?? 0,
                    transactions_this_month: s.transactions_this_month ?? 0,
                });
            }
            if (breakdownRes.status === 'fulfilled') {
                const rows = (breakdownRes.value as any).data;
                setDrinkBreakdown(Array.isArray(rows) ? rows.slice(0, 5) : []);
            }
        }).finally(() => setDrinkLoading(false));
    }, []);

    useEffect(() => {
        setWalletLoading(true);
        Promise.allSettled([
            dashboardAdminApi.getWalletSummary(),
            dashboardAdminApi.getMonthlyFinance(),
        ]).then(([walletRes, financeRes]) => {
            if (walletRes.status === 'fulfilled') setWalletSummary((walletRes.value as any).data);
            if (financeRes.status === 'fulfilled') {
                const f = (financeRes.value as any).data;
                setMonthlyFinance({ income: f?.income ?? 0, expense: f?.expense ?? 0 });
            }
        }).finally(() => setWalletLoading(false));
    }, []);

    useEffect(() => {
        setPointsLoading(true);
        rankingsAdminApi.rankLeaderboard()
            .then(({ data }) => {
                const rows = (data ?? []) as any[];
                setLeaderboard(rows.slice(0, 5).map((r) => ({
                    id: r.id, full_name: r.full_name ?? 'Chưa rõ tên', avatar_url: r.avatar_url ?? null,
                    rank_label: r.tier ?? '—', points: r.total_points ?? 0,
                    points_delta: r.points_this_week ?? 0, badge: null,
                })));
            })
            .catch(() => { })
            .finally(() => setPointsLoading(false));
    }, []);

    useEffect(() => {
        setAttendanceLoading(true);
        rankingsAdminApi.leaderboard({ month: attendanceMonth, year: attendanceYear })
            .then(({ data }) => {
                const rows = (data ?? []) as any[];
                setLeaderboardAttendance(
                    [...rows]
                        .sort((a, b) => (b.sessions_this_month ?? 0) - (a.sessions_this_month ?? 0))
                        .slice(0, 5)
                        .map((r) => ({
                            id: r.id, full_name: r.full_name ?? 'Chưa rõ tên', avatar_url: r.avatar_url ?? null,
                            sessions_this_month: r.sessions_this_month ?? 0,
                            total_sessions: r.total_sessions ?? 0, sessions_delta: r.sessions_delta ?? 0,
                        })),
                );
            })
            .catch(() => setLeaderboardAttendance([]))
            .finally(() => setAttendanceLoading(false));
    }, [attendanceMonth, attendanceYear]);

    useEffect(() => {
        dashboardAdminApi.getFinanceYears()
            .then(({ data }) => { if (Array.isArray(data) && data.length) setFinanceYears(data); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        setFinanceChartLoading(true);
        dashboardAdminApi.getFinanceHistory({ months: financePeriod, year: financeYear })
            .then(({ data }) => {
                const rows = Array.isArray(data) ? data : [];
                setFinanceChartData(rows.map((r: any) => ({ month: `Th.${r.month}`, Thu: r.income ?? 0, Chi: r.expense ?? 0 })));
            })
            .catch(() => setFinanceChartData([]))
            .finally(() => setFinanceChartLoading(false));
    }, [financePeriod, financeYear]);

    useEffect(() => {
        setCostLoading(true);
        sessionsApi.getAllCosts({ month: periodMonth ?? undefined, year: periodYear })
            .then(({ data }) => setCostSessions(data?.sessions ?? []))
            .catch(() => setCostSessions([]))
            .finally(() => setCostLoading(false));
    }, [periodMonth, periodYear]);

    const completed = useMemo(
        () => costSessions.filter((i: any) => i.session.status === 'completed'),
        [costSessions],
    );

    const sortedCompleted = useMemo(
        () => [...completed].sort((a, b) => sessionTime(b) - sessionTime(a)),
        [completed],
    );
    const [activeCostIdx] = [0];

    const agg = useMemo(() => {
        let courtShuttle = 0, otherFee = 0, paid = 0, cost = 0, male = 0, female = 0;
        for (const i of completed) {
            courtShuttle += i.chi_phi.actual_cost ?? 0;
            otherFee += i.chi_phi.other_fee ?? 0;
            paid += i.chi_phi.total_paid ?? 0;
            cost += i.chi_phi.total_cost ?? 0;
            male += i.participants.male_count ?? 0;
            female += i.participants.female_count ?? 0;
        }
        return { courtShuttle, otherFee, paid, cost, profit: paid - cost, male, female, sessions: completed.length };
    }, [completed]);

    const periodLabel = periodMonth ? `Tháng ${periodMonth}/${periodYear}` : `Năm ${periodYear}`;
    const isProfit = agg.profit > 0;
    const isBreakEven = agg.profit === 0;
    const totalPeople = agg.male + agg.female;
    const malePct = totalPeople > 0 ? Math.round((agg.male / totalPeople) * 100) : 0;
    const leaderboardLoading = leaderTab === 'points' ? pointsLoading : attendanceLoading;

    const memberChips = [
        { icon: Crown, bg: 'bg-emerald-500', label: 'VIP', v: memberBreakdown.vip, href: '/admin/members?member_type=co_dinh&member_subtype=vip' },
        { icon: User, bg: 'bg-violet-400', label: 'Thường', v: memberBreakdown.thuong, href: '/admin/members?member_type=co_dinh&member_subtype=thuong' },
        { icon: UserRound, bg: 'bg-orange-400', label: 'Vãng lai', v: memberBreakdown.vang_lai, href: '/admin/members?member_type=vang_lai' },
    ];

    return (
        <div
            ref={rootRef}
            style={rootH ? { height: rootH } : undefined}
            className="w-full flex flex-col gap-3 xl:overflow-hidden"
        >
            <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-gray-900">Tổng quan</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Số liệu tính theo <span className="font-semibold text-gray-500">{periodLabel}</span> (các buổi đã hoàn thành)
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {!statsLoading && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => router.push('/admin/members')}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[11px] text-gray-400">Thành viên</span>
                                <span className="text-sm font-bold text-gray-900 tabular-nums">{totalMembers}</span>
                            </button>
                            {memberChips.map(({ icon: I, bg, label, v, href }) => (
                                <button
                                    key={label}
                                    onClick={() => router.push(href)}
                                    title={label}
                                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors"
                                >
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center ${bg}`}>
                                        <I className="w-3 h-3 text-white" />
                                    </span>
                                    <span className="text-[11px] text-gray-500">{label}</span>
                                    <span className="text-xs font-bold text-gray-900 tabular-nums">{v}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2 w-full justify-end xl:w-auto">
                        <div className="w-32">
                            <CustomSelect
                                value={periodMonth ? String(periodMonth) : ''}
                                onChange={(v) => setPeriodMonth(v ? Number(v) : null)}
                                placeholder="Cả năm"
                                options={[{ value: '', label: 'Cả năm' }, ...MONTH_OPTIONS]}
                            />
                        </div>
                        <div className="w-32">
                            <CustomSelect
                                value={String(periodYear)}
                                onChange={(v) => setPeriodYear(Number(v))}
                                options={financeYears.map((y) => ({ value: String(y), label: `Năm ${y}` }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI */}
            <div className="flex-shrink-0">
                {costLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        {[...Array(6)].map((_, i) => <CardSkeleton key={i} className="h-[92px]" />)}
                    </div>
                ) : (
                    <Reveal show>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                            <KpiCard
                                icon={CalendarDays} iconBg="bg-blue-500" label="Buổi hoàn thành"
                                value={agg.sessions} sub={periodLabel}
                            />
                            <KpiCard
                                icon={Receipt} iconBg="bg-emerald-500" label="Tiền sân + cầu"
                                value={fmtFull(agg.courtShuttle)} sub="Chi phí thực tế"
                            />
                            <KpiCard
                                icon={HandCoins} iconBg="bg-amber-500" label="Thu khoản khác"
                                value={fmtFull(agg.otherFee)} valueCls="text-amber-600" sub="Nước uống, phát sinh..."
                            />
                            <KpiCard
                                icon={Wallet} iconBg="bg-violet-500" label="Tổng thu / chi"
                                value={fmtFull(agg.paid)} sub={`Chi ${fmtFull(agg.cost)}`}
                            />
                            <KpiCard
                                icon={isBreakEven ? Scale : isProfit ? TrendingUp : TrendingDown}
                                iconBg={isBreakEven ? 'bg-blue-500' : isProfit ? 'bg-emerald-500' : 'bg-red-500'}
                                label={isBreakEven ? 'Hòa vốn' : isProfit ? 'Lãi' : 'Lỗ'}
                                value={`${isProfit ? '+' : ''}${fmtFull(agg.profit)}`}
                                valueCls={isBreakEven ? 'text-blue-600' : isProfit ? 'text-emerald-600' : 'text-red-500'}
                                sub="Thu − chi"
                            />
                            <KpiCard
                                icon={Users} iconBg="bg-pink-500" label="Lượt tham gia"
                                value={totalPeople} sub={`♂ ${agg.male} · ♀ ${agg.female}`}
                            >
                                <div className="mt-1.5 h-1.5 rounded-full bg-pink-100 overflow-hidden">
                                    <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: `${malePct}%` }} />
                                </div>
                            </KpiCard>
                        </div>
                    </Reveal>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[minmax(0,1fr)] gap-3 xl:flex-1 xl:min-h-0">
                <div className="flex flex-col gap-3 xl:min-h-0">
                    <Panel
                        title={`Chi phí các buổi · ${periodLabel}`}
                        icon={Receipt}
                        iconCls="text-emerald-500"
                        className={TOP_ROW}
                        bodyClassName="relative overflow-hidden"
                        action={<span className="text-[11px] text-gray-400">{sortedCompleted.length} buổi</span>}
                    >
                        {costLoading ? (
                            <CardSkeleton className="h-full min-h-[200px]" />
                        ) : sortedCompleted.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-10">Chưa có buổi đánh nào hoàn thành trong kỳ này</p>
                        ) : (
                            <SessionCostCarousel items={sortedCompleted} onSelect={setSelectedSessionId} />
                        )}
                    </Panel>

                    <Panel
                        title="Hoạt động mới nhất"
                        icon={Megaphone}
                        iconCls="text-purple-500"
                        className={BOTTOM_ROW}
                        bodyClassName="xl:overflow-y-auto scroll-hover"
                        action={
                            <button onClick={() => router.push('/admin/events')} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                                Xem tất cả →
                            </button>
                        }
                    >
                        {activitiesLoading ? (
                            <CardSkeleton className="h-32" />
                        ) : recentActivities.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">Chưa có hoạt động nào</p>
                        ) : (
                            <Reveal show>
                                <div className="space-y-1.5">
                                    {recentActivities.map((a: any, idx: number) => {
                                        const { dateLabel, countLabel } = activityMetaLine(a);
                                        return (
                                            <button
                                                key={a.id}
                                                onClick={() => router.push('/admin/events')}
                                                className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left animate-reveal"
                                                style={{ animationDelay: `${idx * 40}ms` }}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${ACTIVITY_TYPE_ICON_BG[a.type] ?? 'bg-gray-50'}`}>
                                                    <ActivityThumbnail src={a.cover_image_url ?? ACTIVITY_TYPE_DEFAULT_IMAGE[a.type]} emoji={a.emoji ?? '📌'} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">{a.title}</p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{dateLabel}{countLabel ? ` · ${countLabel}` : ''}</span>
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${ACTIVITY_STATUS_CFG[a.status] ?? 'bg-gray-50 text-gray-500'}`}>
                                                    {ACTIVITY_STATUS_LABEL[a.status] ?? a.status}
                                                </span>
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </Reveal>
                        )}
                    </Panel>
                </div>

                <div className="flex flex-col gap-3 xl:min-h-0">
                    <Panel
                        title="Biểu đồ thu chi"
                        className={TOP_ROW}
                        bodyClassName="flex flex-col"
                        action={
                            <div className="flex items-center gap-1.5">
                                <div className="w-30 sm:w-32">
                                    <CustomSelect
                                        value={String(financePeriod)}
                                        onChange={(v) => setFinancePeriod(Number(v))}
                                        options={FINANCE_PERIOD_OPTIONS}
                                    />
                                </div>
                                <div className="w-24 sm:w-28">
                                    <CustomSelect
                                        value={String(financeYear)}
                                        onChange={(v) => setFinanceYear(Number(v))}
                                        options={financeYears.map((y) => ({ value: String(y), label: String(y) }))}
                                    />
                                </div>
                            </div>
                        }
                    >
                        {financeChartLoading ? (
                            <CardSkeleton className="flex-1 min-h-[120px]" />
                        ) : financeChartData.length === 0 ? (
                            <div className="flex-1 min-h-[120px] flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                        ) : (
                            <div className="relative flex-1 min-h-[120px]">
                                <div className="absolute inset-0 animate-reveal">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={financeChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                                            <Tooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')}đ`} />
                                            <Line type="monotone" dataKey="Thu" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="Chi" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </Panel>

                    <Panel title="Bảng xếp hạng" className={BOTTOM_ROW} bodyClassName="xl:overflow-y-auto">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                {(['points', 'attendance'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setLeaderTab(t)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${leaderTab === t ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {t === 'points' ? 'Top điểm' : 'Top chuyên cần'}
                                    </button>
                                ))}
                            </div>
                            {leaderTab === 'attendance' && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-24">
                                        <CustomSelect value={String(attendanceMonth)} onChange={(v) => setAttendanceMonth(Number(v))} options={MONTH_OPTIONS} />
                                    </div>
                                    <div className="w-20">
                                        <CustomSelect
                                            value={String(attendanceYear)}
                                            onChange={(v) => setAttendanceYear(Number(v))}
                                            options={financeYears.map((y) => ({ value: String(y), label: String(y) }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {leaderboardLoading ? (
                            <CardSkeleton className="h-40" />
                        ) : (
                            <Reveal show>
                                <div className="space-y-0.5">
                                    {leaderTab === 'points' ? (
                                        leaderboard.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                                        ) : leaderboard.map((p, idx) => (
                                            <div key={p.id} className="flex items-center gap-3 py-1 animate-reveal" style={{ animationDelay: `${idx * 40}ms` }}>
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                                    {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : idx + 1}
                                                </span>
                                                <LeaderAvatar src={p.avatar_url} name={p.full_name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                                                        {p.full_name}
                                                        {p.badge === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 truncate">Rank: {p.rank_label}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-gray-800">{p.points.toLocaleString('vi-VN')}</p>
                                                        <p className="text-[10px] text-gray-400">điểm</p>
                                                    </div>
                                                    <MiniDelta delta={p.points_delta} />
                                                </div>
                                            </div>
                                        ))
                                    ) : leaderboardAttendance.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                                    ) : leaderboardAttendance.map((p, idx) => {
                                        const tier = getAttendanceTier(p.total_sessions);
                                        return (
                                            <div key={p.id} className="flex items-center gap-3 py-1 animate-reveal" style={{ animationDelay: `${idx * 40}ms` }}>
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                                    {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : idx + 1}
                                                </span>
                                                <LeaderAvatar src={p.avatar_url} name={p.full_name} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name}</p>
                                                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        <span>{tier.icon}</span><span className="truncate">{tier.label}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-gray-800">{p.sessions_this_month}</p>
                                                        <p className="text-[10px] text-gray-400">buổi</p>
                                                    </div>
                                                    <MiniDelta delta={p.sessions_delta} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Reveal>
                        )}

                        <button
                            onClick={() => router.push('/admin/rankings')}
                            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                            Xem đầy đủ bảng xếp hạng →
                        </button>
                    </Panel>
                </div>

                <div className="flex flex-col gap-3 xl:min-h-0">
                    <Panel
                        title={`Nạp tiền nhiều nhất · ${periodLabel}`}
                        icon={PiggyBank}
                        iconCls="text-emerald-500"
                        className={TOP_ROW}
                        bodyClassName="overflow-y-auto scroll-hover"
                    >
                        {topupLoading ? (
                            <CardSkeleton className="h-40" />
                        ) : (
                            <Reveal show>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-emerald-50/70 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Tổng nạp</p>
                                        <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmtFull(topupSummary.total_amount)}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Số lần</p>
                                        <p className="text-lg font-bold text-gray-900 leading-6">{topupSummary.total_count}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Người nạp</p>
                                        <p className="text-lg font-bold text-gray-900 leading-6">{topupSummary.member_count}</p>
                                    </div>
                                </div>

                                <div className="mt-2 space-y-0.5">
                                    {topTopups.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-6">Không có lượt nạp nào trong kỳ này</p>
                                    ) : topTopups.map((p, idx) => (
                                        <div key={p.user_id} className="flex items-center gap-3 py-1">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                                {idx + 1}
                                            </span>
                                            <LeaderAvatar src={p.avatar_url} name={p.full_name ?? ''} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name ?? 'Chưa rõ tên'}</p>
                                                <p className="text-[11px] text-gray-400">{p.count} lần nạp</p>
                                            </div>
                                            <p className="text-sm font-bold text-emerald-600 tabular-nums flex-shrink-0">{fmtFull(p.total_amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </Reveal>
                        )}
                    </Panel>
                    <Panel
                        title={`Phạt nhiều nhất · ${periodLabel}`}
                        icon={AlertTriangle}
                        iconCls="text-red-500"
                        className={BOTTOM_ROW}
                        bodyClassName="xl:overflow-y-auto scroll-hover"
                        action={
                            <button onClick={() => router.push('/admin/fund')} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                                Chi tiết →
                            </button>
                        }
                    >
                        {penaltyLoading ? (
                            <CardSkeleton className="h-40" />
                        ) : (
                            <Reveal show>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-red-50/70 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Tổng phạt</p>
                                        <p className="text-sm font-bold text-red-500 tabular-nums">{fmtFull(penaltySummary.total_amount)}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Số lần</p>
                                        <p className="text-lg font-bold text-gray-900 leading-6">{penaltySummary.total_count}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 py-2">
                                        <p className="text-[10px] text-gray-400 uppercase">Người bị phạt</p>
                                        <p className="text-lg font-bold text-gray-900 leading-6">{penaltySummary.member_count}</p>
                                    </div>
                                </div>

                                <div className="mt-2 space-y-0.5">
                                    {topPenalized.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-6">Không có khoản phạt nào trong kỳ này</p>
                                    ) : topPenalized.map((p, idx) => (
                                        <div key={p.user_id} className="flex items-center gap-3 py-1">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                                {idx + 1}
                                            </span>
                                            <LeaderAvatar src={p.avatar_url} name={p.full_name ?? ''} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name ?? 'Chưa rõ tên'}</p>
                                                <p className="text-[11px] text-gray-400 truncate">
                                                    {p.count} lần
                                                    {p.unpaid_amount > 0 && (
                                                        <span className="text-amber-600"> · chưa thu {fmtFull(p.unpaid_amount)}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold text-red-500 tabular-nums flex-shrink-0">{fmtFull(p.total_amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </Reveal>
                        )}
                    </Panel>
                </div>

                <div className="flex flex-col gap-3 xl:min-h-0">
                    <div className={`flex flex-col gap-3 ${TOP_ROW}`}>
                        <Panel title="Buổi đánh" icon={CalendarDays} className="flex-none">
                            {sessionLoading ? (
                                <CardSkeleton className="h-14" />
                            ) : (
                                <Reveal show>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-blue-50 py-2">
                                            <p className="text-[10px] text-gray-400 uppercase">Hôm nay</p>
                                            <p className="text-lg font-bold text-blue-500 leading-6">{sessionCounts.today}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-50 py-2">
                                            <p className="text-[10px] text-gray-400 uppercase">Tuần này</p>
                                            <p className="text-lg font-bold text-gray-900 leading-6">{sessionCounts.this_week}</p>
                                        </div>
                                        <div className="rounded-xl bg-gray-50 py-2">
                                            <p className="text-[10px] text-gray-400 uppercase">Tháng này</p>
                                            <p className="text-lg font-bold text-gray-900 leading-6">{sessionCounts.this_month}</p>
                                        </div>
                                    </div>
                                </Reveal>
                            )}
                        </Panel>

                        <Panel
                            title="Quỹ CLB"
                            icon={Wallet}
                            iconCls="text-slate-600"
                            className="flex-1"
                            bodyClassName="overflow-y-auto scroll-hover"
                        >
                            {walletLoading ? (
                                <CardSkeleton className="h-28" />
                            ) : (
                                <Reveal show>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl bg-emerald-50/60 p-2.5">
                                            <p className="text-[10px] text-gray-400 uppercase">Thu tháng này</p>
                                            <p className="text-sm font-bold text-emerald-600 tabular-nums">{monthlyFinance.income.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                        <div className="rounded-xl bg-red-50/60 p-2.5">
                                            <p className="text-[10px] text-gray-400 uppercase">Chi tháng này</p>
                                            <p className="text-sm font-bold text-red-500 tabular-nums">{monthlyFinance.expense.toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Quỹ còn lại</p>
                                            <p className="text-lg font-bold text-blue-500 tabular-nums">{(walletSummary?.club_balance ?? 0).toLocaleString('vi-VN')}đ</p>
                                        </div>
                                        <span className="text-2xl">💰</span>
                                    </div>
                                </Reveal>
                            )}
                        </Panel>
                    </div>

                    <Panel
                        title="Nước trong kho thành viên"
                        icon={CupSoda}
                        iconCls="text-sky-500"
                        className={BOTTOM_ROW}
                        bodyClassName="xl:overflow-y-auto scroll-hover"
                        action={
                            <button onClick={() => setShowDrinkHolders(true)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                                Chi tiết →
                            </button>
                        }
                    >
                        {drinkLoading ? (
                            <CardSkeleton className="h-40" />
                        ) : (
                            <Reveal show>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-sky-50/70 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase">Tổng số chai</p>
                                        <p className="text-lg font-bold text-sky-600 tabular-nums leading-6">{drinkStats.total_quantity.toLocaleString('vi-VN')}</p>
                                    </div>
                                    <div className="rounded-xl bg-amber-50/70 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase">Giá trị</p>
                                        <p className="text-sm font-bold text-amber-600 tabular-nums leading-6">{fmtFull(drinkStats.total_value)}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase">Người có nước</p>
                                        <p className="text-lg font-bold text-gray-900 tabular-nums leading-6">{drinkStats.total_members_owning}</p>
                                    </div>
                                    <div className="rounded-xl bg-gray-50 p-2.5">
                                        <p className="text-[10px] text-gray-400 uppercase">GD tháng này</p>
                                        <p className="text-lg font-bold text-gray-900 tabular-nums leading-6">{drinkStats.transactions_this_month}</p>
                                    </div>
                                </div>

                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Loại nước nhiều nhất</p>
                                    {drinkBreakdown.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-3">Chưa có dữ liệu</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {drinkBreakdown.map((d) => (
                                                <div key={d.drink_id} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        <ActivityThumbnail src={d.image_url} emoji="🥤" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                                                        <p className="text-[11px] text-gray-400">{d.member_count} người sở hữu</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-sm font-bold text-gray-800 tabular-nums">{d.total_quantity}</p>
                                                        <p className="text-[10px] text-gray-400">chai</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Reveal>
                        )}
                    </Panel>
                </div>
            </div>

            {
                selectedSessionId && (
                    <SessionCostDetailModal sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
                )
            }

            {showDrinkHolders && <DrinkHoldersModal onClose={() => setShowDrinkHolders(false)} />}

            <style jsx global>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-reveal { animation: reveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Thanh scroll ẩn mặc định, mờ dần hiện ra khi hover (desktop). Độ rộng cố định nên không bị giật layout */
        .scroll-hover {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s ease;
        }
        .scroll-hover::-webkit-scrollbar { width: 6px; }
        .scroll-hover::-webkit-scrollbar-track { background: transparent; }
        .scroll-hover::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
          transition: background-color 0.3s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .scroll-hover:hover { scrollbar-color: rgba(148, 163, 184, 0.6) transparent; }
          .scroll-hover:hover::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.6); }
          .scroll-hover::-webkit-scrollbar-thumb:hover { background-color: rgba(100, 116, 139, 0.8); }
        }
      `}</style>
        </div >
    );
}
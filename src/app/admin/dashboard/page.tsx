'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Crown, User, UserRound, CalendarDays, Wallet, Flame, BadgeCheck, Megaphone, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { sessionsApi, rankingsAdminApi, dashboardAdminApi, eventsAdminApi } from '@/lib/api';
import { CustomSelect } from '@/components/admin/sessions/CustomSelect';

const FINANCE_PERIOD_OPTIONS = [
    { value: '1', label: '1 tháng' }, { value: '3', label: '3 tháng' }, { value: '6', label: '6 tháng' },
    { value: '9', label: '9 tháng' }, { value: '12', label: '1 năm' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

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
    shirt_order: 'bg-blue-50',
    tournament: 'bg-amber-50',
    birthday: 'bg-pink-50',
    offline_event: 'bg-orange-50',
    poll: 'bg-purple-50',
};

const ACTIVITY_STATUS_CFG: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-500',
    open: ' bg-green-50 text-green-700',
    upcoming: 'bg-purple-50 text-purple-600',
    ongoing: 'bg-blue-50 text-blue-600',
    closed: 'bg-orange-50 text-orange-600',
    completed: 'bg-slate-50 text-slate-500',
    cancelled: 'bg-red-50 text-red-500',
};

const ACTIVITY_STATUS_LABEL: Record<string, string> = {
    draft: 'Nháp',
    open: 'Mở đăng ký',
    upcoming: 'Sắp diễn ra',
    ongoing: 'Đang diễn ra',
    closed: 'Đã đóng đăng ký',
    completed: 'Đã kết thúc',
    cancelled: 'Đã huỷ',
};

function activityMetaLine(a: any) {
    const dateLabel = a.deadline
        ? `Deadline: ${format(new Date(a.deadline), 'dd/MM/yyyy')}`
        : a.event_date
            ? format(new Date(a.event_date), 'dd/MM/yyyy')
            : null;

    const countLabel =
        a.registrations_count != null
            ? `${a.registrations_count} người đã đăng ký`
            : null;

    return { dateLabel, countLabel };
}

function ActivityThumbnail({ src, emoji }: { src?: string | null; emoji: string }) {
    const [err, setErr] = useState(false);
    if (src && !err) {
        return (
            <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setErr(true)}
            />
        );
    }
    return <span className="text-3xl">{emoji}</span>;
}

function getAttendanceTier(totalSessions: number) {
    return ATTENDANCE_TIERS.find((t) => totalSessions >= t.min && totalSessions <= t.max) ?? ATTENDANCE_TIERS[0];
}

function rankBadgeClass(idx: number) {
    if (idx === 0) return 'bg-amber-400 text-white';
    if (idx === 1) return 'bg-slate-300 text-white';
    if (idx === 2) return 'bg-orange-300 text-white';
    return 'text-gray-400';
}

function MiniDelta({ delta }: { delta: number }) {
    if (delta > 0) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                ▲ {delta}
            </span>
        );
    }
    if (delta < 0) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                ▼ {Math.abs(delta)}
            </span>
        );
    }
    return <span className="text-[10px] font-medium text-gray-300">—</span>;
}

function LeaderAvatar({ src, name }: { src?: string | null; name: string }) {
    const [err, setErr] = useState(false);
    const show = src && !err;
    return (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            {show ? (
                <img src={src!} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
            ) : (
                <User className="w-4 h-4 text-slate-500" />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, iconBg, label, value, onClick }: { icon: any; iconBg: string; label: string; value: number | string; onClick?: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`bg-white rounded-2xl p-4 flex items-start gap-3 border border-gray-100 shadow-sm text-left w-full ${onClick ? 'hover:border-blue-200 hover:shadow-md active:scale-[0.98] transition-all cursor-pointer' : ''}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
            </div>
        </button>
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
    return (
        <div className="animate-reveal" style={{ animationDelay: `${delayMs}ms` }}>
            {children}
        </div>
    );
}

type LeaderRow = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    rank_label: string;
    points: number;
    points_delta: number;
    badge: 'fire' | 'verified' | null;
};

type AttendanceLeaderRow = {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    sessions_this_month: number;
    total_sessions: number;
    sessions_delta: number;
};

export default function AdminDashboardPage() {
    const router = useRouter();
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
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

    const [leaderTab, setLeaderTab] = useState<'points' | 'attendance'>('points');

    const [financePeriod, setFinancePeriod] = useState(6);
    const [financeYear, setFinanceYear] = useState(new Date().getFullYear());
    const [financeYears, setFinanceYears] = useState<number[]>([new Date().getFullYear()]);
    const [financeChartData, setFinanceChartData] = useState<{ month: string; Thu: number; Chi: number }[]>([]);
    const [financeChartLoading, setFinanceChartLoading] = useState(true);

    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);

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
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const iso = (d: Date) => format(d, 'yyyy-MM-dd');

        Promise.allSettled([
            sessionsApi.list({ from_date: iso(startOfDay), to_date: iso(startOfDay), limit: 1, page: 1 }),
            sessionsApi.list({ from_date: iso(startOfWeek), to_date: iso(endOfWeek), limit: 1, page: 1 }),
            sessionsApi.list({ from_date: iso(startOfMonth), to_date: iso(endOfMonth), limit: 1, page: 1 }),
        ]).then(([todayRes, weekRes, monthRes]) => {
            setSessionCounts({
                today: todayRes.status === 'fulfilled' ? (todayRes.value as any)?.data?.meta?.total ?? 0 : 0,
                this_week: weekRes.status === 'fulfilled' ? (weekRes.value as any)?.data?.meta?.total ?? 0 : 0,
                this_month: monthRes.status === 'fulfilled' ? (monthRes.value as any)?.data?.meta?.total ?? 0 : 0,
            });
        }).finally(() => setSessionLoading(false));
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

    // Top điểm — chỉ fetch 1 lần
    useEffect(() => {
        setPointsLoading(true);
        rankingsAdminApi.rankLeaderboard()
            .then(({ data }) => {
                const rows = (data ?? []) as any[];
                setLeaderboard(
                    rows.slice(0, 5).map((r) => ({
                        id: r.id,
                        full_name: r.full_name ?? 'Chưa rõ tên',
                        avatar_url: r.avatar_url ?? null,
                        rank_label: r.tier ?? '—',
                        points: r.total_points ?? 0,
                        points_delta: r.points_this_week ?? 0,
                        badge: null,
                    })),
                );
            })
            .catch(() => { })
            .finally(() => setPointsLoading(false));
    }, []);

    // Top chuyên cần — refetch mỗi khi đổi tháng/năm
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
                            id: r.id,
                            full_name: r.full_name ?? 'Chưa rõ tên',
                            avatar_url: r.avatar_url ?? null,
                            sessions_this_month: r.sessions_this_month ?? 0,
                            total_sessions: r.total_sessions ?? 0,
                            sessions_delta: r.sessions_delta ?? 0,
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

    const leaderboardLoading = leaderTab === 'points' ? pointsLoading : attendanceLoading;

    return (
        <div className="space-y-4">
            {statsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : (
                <Reveal show delayMs={0}>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={Users}
                            iconBg="bg-blue-500"
                            label="Tổng thành viên"
                            value={totalMembers}
                            onClick={() => router.push('/admin/members')}
                        />
                        <StatCard
                            icon={Crown}
                            iconBg="bg-emerald-500"
                            label="VIP"
                            value={memberBreakdown.vip}
                            onClick={() => router.push('/admin/members?member_type=co_dinh&member_subtype=vip')}
                        />
                        <StatCard
                            icon={User}
                            iconBg="bg-violet-400"
                            label="Thường"
                            value={memberBreakdown.thuong}
                            onClick={() => router.push('/admin/members?member_type=co_dinh&member_subtype=thuong')}
                        />
                        <StatCard
                            icon={UserRound}
                            iconBg="bg-orange-400"
                            label="Vãng lai"
                            value={memberBreakdown.vang_lai}
                            onClick={() => router.push('/admin/members?member_type=vang_lai')}
                        />
                    </div>
                </Reveal>
            )}

            {/* Buổi đánh */}
            {sessionLoading ? (
                <CardSkeleton className="h-28" />
            ) : (
                <Reveal show delayMs={60}>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <CalendarDays className="w-4 h-4 text-blue-500" />
                            <h3 className="text-[11px] font-bold text-gray-500 uppercase">Buổi đánh</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><p className="text-[10px] text-gray-400 uppercase">Hôm nay</p><p className="text-xl font-bold text-blue-500">{sessionCounts.today}</p></div>
                            <div><p className="text-[10px] text-gray-400 uppercase">Tuần này</p><p className="text-xl font-bold text-gray-900">{sessionCounts.this_week}</p></div>
                            <div><p className="text-[10px] text-gray-400 uppercase">Tháng này</p><p className="text-xl font-bold text-gray-900">{sessionCounts.this_month}</p></div>
                        </div>
                    </div>
                </Reveal>
            )}

            {/* Tài chính tháng này */}
            {walletLoading ? (
                <CardSkeleton className="h-32" />
            ) : (
                <Reveal show delayMs={100}>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-4 h-4 text-slate-600" />
                            <h3 className="text-[11px] font-bold text-gray-500 uppercase">Tài chính</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] text-gray-400 uppercase">Thu tháng này</p><p className="text-base font-bold text-emerald-500">{monthlyFinance.income.toLocaleString('vi-VN')}đ</p></div>
                            <div><p className="text-[10px] text-gray-400 uppercase">Chi tháng này</p><p className="text-base font-bold text-red-500">{monthlyFinance.expense.toLocaleString('vi-VN')}đ</p></div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex items-center justify-between">
                            <div><p className="text-[10px] text-gray-400 uppercase">Quỹ còn lại</p><p className="text-xl font-bold text-blue-500">{(walletSummary?.club_balance ?? 0).toLocaleString('vi-VN')}đ</p></div>
                            <span className="text-2xl">💰</span>
                        </div>
                    </div>
                </Reveal>
            )}


            {/* Hoạt động mới nhất */}
            {activitiesLoading ? (
                <CardSkeleton className="h-40" />
            ) : (
                <Reveal show delayMs={120}>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-purple-500" />
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase">Hoạt động mới nhất</h3>
                            </div>
                            <button
                                onClick={() => router.push('/admin/events')}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                                Xem tất cả →
                            </button>
                        </div>

                        {recentActivities.length === 0 ? (
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-400 text-sm">
                                Chưa có hoạt động nào
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentActivities.map((a: any, idx: number) => {
                                    const { dateLabel, countLabel } = activityMetaLine(a);
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => router.push('/admin/events')}
                                            className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left animate-reveal"
                                            style={{ animationDelay: `${idx * 40}ms` }}
                                        >
                                            <div
                                                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${ACTIVITY_TYPE_ICON_BG[a.type] ?? 'bg-gray-50'}`}
                                            >
                                                <ActivityThumbnail
                                                    src={a.cover_image_url ?? ACTIVITY_TYPE_DEFAULT_IMAGE[a.type]}
                                                    emoji={a.emoji ?? '📌'}
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1">
                                                    {a.title}
                                                </p>
                                                {dateLabel && (
                                                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                                        {dateLabel}
                                                    </p>
                                                )}
                                                {countLabel && (
                                                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <Users className="w-3 h-3 flex-shrink-0" />
                                                        {countLabel}
                                                    </p>
                                                )}
                                            </div>
                                            <span
                                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${ACTIVITY_STATUS_CFG[a.status] ?? 'bg-gray-50 text-gray-500'}`}
                                            >
                                                {ACTIVITY_STATUS_LABEL[a.status] ?? a.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Reveal>
            )}


            {/* Biểu đồ thu chi */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase">Biểu đồ thu chi</h3>
                    <div className="flex items-center gap-1.5">
                        <div className="w-28">
                            <CustomSelect
                                value={String(financePeriod)}
                                onChange={(val) => setFinancePeriod(Number(val))}
                                options={FINANCE_PERIOD_OPTIONS}
                            />
                        </div>
                        <div className="w-24">
                            <CustomSelect
                                value={String(financeYear)}
                                onChange={(val) => setFinanceYear(Number(val))}
                                options={financeYears.map((y) => ({ value: String(y), label: String(y) }))}
                            />
                        </div>
                    </div>
                </div>

                {financeChartLoading ? (
                    <CardSkeleton className="h-[180px]" />
                ) : financeChartData.length === 0 ? (
                    <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                    <Reveal show delayMs={0}>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={financeChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                                <Tooltip formatter={(v) => `${Number(v).toLocaleString('vi-VN')}đ`} />
                                <Line type="monotone" dataKey="Thu" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                                <Line type="monotone" dataKey="Chi" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Reveal>
                )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Bảng xếp hạng</h3>
                <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                    <button
                        onClick={() => setLeaderTab('points')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${leaderTab === 'points'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        Top điểm
                    </button>
                    <button
                        onClick={() => setLeaderTab('attendance')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${leaderTab === 'attendance'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        Top chuyên cần
                    </button>
                </div>

                {leaderTab === 'attendance' && (
                    <div className="flex items-center justify-end gap-1.5 mb-4">
                        <div className="w-28">
                            <CustomSelect
                                value={String(attendanceMonth)}
                                onChange={(val) => setAttendanceMonth(Number(val))}
                                options={MONTH_OPTIONS}
                            />
                        </div>
                        <div className="w-24">
                            <CustomSelect
                                value={String(attendanceYear)}
                                onChange={(val) => setAttendanceYear(Number(val))}
                                options={financeYears.map((y) => ({ value: String(y), label: String(y) }))}
                            />
                        </div>
                    </div>
                )}

                {leaderboardLoading ? (
                    <CardSkeleton className="h-40" />
                ) : (
                    <Reveal show delayMs={0}>
                        <div className="space-y-1">
                            {leaderTab === 'points' ? (
                                leaderboard.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                                ) : leaderboard.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 py-1.5 animate-reveal"
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                            {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : idx + 1}
                                        </span>
                                        <LeaderAvatar src={p.avatar_url} name={p.full_name} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                                                {p.full_name}
                                                {p.badge === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                            </p>
                                            <p className="text-[11px] text-gray-400">Rank: {p.rank_label}</p>
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
                            ) : (
                                leaderboardAttendance.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu</p>
                                ) : leaderboardAttendance.map((p, idx) => {
                                    const tier = getAttendanceTier(p.total_sessions);
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center gap-3 py-1.5 animate-reveal"
                                            style={{ animationDelay: `${idx * 40}ms` }}
                                        >
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>
                                                {idx === 0 ? <Flame className="w-3.5 h-3.5" /> : idx + 1}
                                            </span>
                                            <LeaderAvatar src={p.avatar_url} name={p.full_name} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name}</p>
                                                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                    <span>{tier.icon}</span>
                                                    <span className="truncate">{tier.label}</span>
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
                                })
                            )}
                        </div>
                    </Reveal>
                )}

                <button
                    onClick={() => router.push('/admin/rankings')}
                    className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                    Xem đầy đủ bảng xếp hạng →
                </button>
            </div>

            <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal {
          animation: reveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
        </div>
    );
}
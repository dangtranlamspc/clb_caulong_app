'use client';
import { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, Crown, User, UserRound, CalendarDays, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { sessionsApi, rankingsApi, dashboardAdminApi } from '@/lib/api';

const FINANCE_PERIOD_OPTIONS = [
    { value: 1, label: '1 tháng' }, { value: 3, label: '3 tháng' }, { value: 6, label: '6 tháng' },
    { value: 9, label: '9 tháng' }, { value: 12, label: '1 năm' },
];

function rankBadgeClass(idx: number) {
    if (idx === 0) return 'bg-amber-400 text-white';
    if (idx === 1) return 'bg-slate-300 text-white';
    if (idx === 2) return 'bg-orange-300 text-white';
    return 'text-gray-400';
}

function StatCard({ icon: Icon, iconBg, label, value }: { icon: any; iconBg: string; label: string; value: number | string }) {
    return (
        <div className="bg-white rounded-2xl p-4 flex items-start gap-3 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
            </div>
        </div>
    );
}

// Skeleton dạng shimmer — có dải sáng chạy qua thay vì chỉ nhấp nháy phẳng
function CardSkeleton({ className = 'h-20' }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-gray-100 rounded-2xl ${className}`}>
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
    );
}

// Bọc quanh mỗi khối nội dung: khi loading=false, trượt lên nhẹ + fade in,
// delayMs tạo hiệu ứng xuất hiện lệch nhau (staggered) giữa các khối
function Reveal({ show, delayMs = 0, children }: { show: boolean; delayMs?: number; children: React.ReactNode }) {
    if (!show) return null;
    return (
        <div className="animate-reveal" style={{ animationDelay: `${delayMs}ms` }}>
            {children}
        </div>
    );
}

export default function AdminDashboardPage() {
    const [statsLoading, setStatsLoading] = useState(true);
    const [totalMembers, setTotalMembers] = useState(0);
    const [memberBreakdown, setMemberBreakdown] = useState({ vip: 0, thuong: 0, vang_lai: 0 });

    const [sessionLoading, setSessionLoading] = useState(true);
    const [sessionCounts, setSessionCounts] = useState({ today: 0, this_week: 0, this_month: 0 });

    const [walletLoading, setWalletLoading] = useState(true);
    const [walletSummary, setWalletSummary] = useState<any>(null);
    const [monthlyFinance, setMonthlyFinance] = useState({ income: 0, expense: 0 });

    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    const [financePeriod, setFinancePeriod] = useState(6);
    const [financeYear, setFinanceYear] = useState(new Date().getFullYear());
    const [financeYears, setFinanceYears] = useState<number[]>([new Date().getFullYear()]);
    const [financeChartData, setFinanceChartData] = useState<{ month: string; Thu: number; Chi: number }[]>([]);
    const [financeChartLoading, setFinanceChartLoading] = useState(true);

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

    useEffect(() => {
        setLeaderboardLoading(true);
        rankingsApi.leaderboard()
            .then(({ data }) => {
                const rows = (data ?? []) as any[];
                setLeaderboard(
                    rows.slice(0, 5).map((r) => ({
                        id: r.id, full_name: r.full_name ?? 'Chưa rõ tên', avatar_url: r.avatar_url ?? null,
                        rank_label: r.tier ?? '—', points: r.total_points ?? 0,
                    })),
                );
            })
            .catch(() => { })
            .finally(() => setLeaderboardLoading(false));
    }, []);

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

    return (
        <div className="space-y-4">
            {/* Stat cards thành viên */}
            {statsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : (
                <Reveal show delayMs={0}>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Users} iconBg="bg-blue-500" label="Tổng thành viên" value={totalMembers} />
                        <StatCard icon={Crown} iconBg="bg-emerald-500" label="VIP" value={memberBreakdown.vip} />
                        <StatCard icon={User} iconBg="bg-violet-400" label="Thường" value={memberBreakdown.thuong} />
                        <StatCard icon={UserRound} iconBg="bg-orange-400" label="Vãng lai" value={memberBreakdown.vang_lai} />
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

            {/* Biểu đồ thu chi */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase">Biểu đồ thu chi</h3>
                    <div className="flex items-center gap-1.5">
                        <select value={financePeriod} onChange={(e) => setFinancePeriod(Number(e.target.value))}
                            className="text-[10px] font-medium text-gray-600 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 bg-white">
                            {FINANCE_PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <select value={financeYear} onChange={(e) => setFinanceYear(Number(e.target.value))}
                            className="text-[10px] font-medium text-gray-600 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 bg-white">
                            {financeYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
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

            {/* Bảng xếp hạng */}
            {leaderboardLoading ? (
                <CardSkeleton className="h-40" />
            ) : (
                <Reveal show delayMs={140}>
                    <div className="bg-white rounded-2xl p-4 border border-gray-100">
                        <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-3">Top điểm</h3>
                        {leaderboard.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
                        ) : leaderboard.map((p, idx) => (
                            <div
                                key={p.id}
                                className="flex items-center gap-3 py-1.5 animate-reveal"
                                style={{ animationDelay: `${140 + idx * 40}ms` }}
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${rankBadgeClass(idx)}`}>{idx + 1}</span>
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                    {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-500" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{p.full_name}</p>
                                    <p className="text-[11px] text-gray-400">Rank: {p.rank_label}</p>
                                </div>
                                <p className="text-sm font-bold text-gray-800 flex-shrink-0">{p.points.toLocaleString('vi-VN')}</p>
                            </div>
                        ))}
                    </div>
                </Reveal>
            )}

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
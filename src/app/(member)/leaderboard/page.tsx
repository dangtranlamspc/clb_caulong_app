'use client';
import { useEffect, useState, useRef } from 'react';
import { Trophy, Medal, Star, RefreshCw, TrendingUp, Swords, Shield, Calendar, ChevronDown } from 'lucide-react';
import { rankingsApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { RankPodiumAvatarList } from '@/components/ranks/Rank';

const ATTENDANCE_CFG: Record<string, { emoji: string; cls: string; bg: string }> = {
    'Người Mới Tham Gia': { emoji: '🥚', cls: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
    'Làm Quen Sân': { emoji: '🏸', cls: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    'Bắt Nhịp': { emoji: '💪', cls: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
    'Ổn Sân': { emoji: '⚡', cls: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    'Thành Thạo Sân': { emoji: '🔥', cls: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
    'Gắn Bó CLB': { emoji: '⭐', cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    'Trụ Cột Sân': { emoji: '💎', cls: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    'Lão Làng Sân Cầu': { emoji: '👑', cls: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

const LEVEL_LABELS: Record<string, string> = {
    yeu: 'Yếu',
    tb_yeu: 'TB yếu',
    tb: 'TB',
    tb_plus: 'TB+',
    ban_chuyen: 'Bán chuyên (BC)',
    chuyen_nghiep: 'Chuyên nghiệp',
};

const ATTENDANCE_TIERS = [
    { min: 0, max: 1, label: 'Người Mới Tham Gia' },
    { min: 2, max: 5, label: 'Làm Quen Sân' },
    { min: 6, max: 12, label: 'Bắt Nhịp' },
    { min: 13, max: 25, label: 'Ổn Sân' },
    { min: 26, max: 45, label: 'Thành Thạo Sân' },
    { min: 46, max: 80, label: 'Gắn Bó CLB' },
    { min: 81, max: 130, label: 'Trụ Cột Sân' },
    { min: 131, max: Infinity, label: 'Lão Làng Sân Cầu' },
];

function getAttendanceLevel(totalSessions: number) {
    const tier = ATTENDANCE_TIERS.find((t) => totalSessions >= t.min && totalSessions <= t.max) ?? ATTENDANCE_TIERS[0];
    return { label: tier.label, ...ATTENDANCE_CFG[tier.label] };
}

function AttendanceBadge({ totalSessions, compact = false }: { totalSessions: number; compact?: boolean }) {
    const lv = getAttendanceLevel(totalSessions ?? 0);
    return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full border whitespace-nowrap ${lv.bg} ${lv.cls} ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
            <span>{lv.emoji}</span>
            <span>{lv.label}</span>
        </span>
    );
}

function SkillBadge({ level, compact = false }: { level?: string | null; compact?: boolean }) {
    if (!level || !LEVEL_LABELS[level]) return null;
    return (
        <span className={`inline-flex items-center font-semibold rounded-full border whitespace-nowrap bg-yellow-50 border-yellow-200 text-yellow-700 ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}>
            {LEVEL_LABELS[level]}
        </span>
    );
}

type Tab = 'rank' | 'winrate' | 'leaderboard';

type GenderFilter = 'all' | 'male' | 'female';

function GenderSubTabs({ value, onChange }: { value: GenderFilter; onChange: (v: GenderFilter) => void }) {
    const OPTS: { key: GenderFilter; label: string }[] = [
        { key: 'all', label: 'Tất cả' },
        { key: 'male', label: 'Nam' },
        { key: 'female', label: 'Nữ' },
    ];
    return (
        <div className="flex border border-gray-100 rounded-lg bg-gray-50 p-0.5 gap-0.5 mb-3">
            {OPTS.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 ${value === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function filterByGender<T extends { gender?: string }>(data: T[], filter: GenderFilter): T[] {
    if (filter === 'all') return data;
    return data.filter(d => d.gender === filter);
}


function TabContent({ children, tabKey }: { children: React.ReactNode; tabKey: string }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);
    return (
        <div
            key={tabKey}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
        >
            {children}
        </div>
    );
}

function SkeletonRows({ count = 6 }: { count?: number }) {
    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl h-28 animate-pulse" />
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                        <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                            <div className="h-2 bg-gray-100 rounded animate-pulse w-1/3" />
                        </div>
                        <div className="w-12 h-4 bg-gray-100 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-yellow-200">
            <Trophy className="w-4 h-4 text-white" />
        </div>
    );
    if (rank === 2) return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm">
            <Medal className="w-4 h-4 text-white" />
        </div>
    );
    if (rank === 3) return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-sm">
            <Star className="w-4 h-4 text-white" />
        </div>
    );
    return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
            #{rank}
        </div>
    );
}

function AnimatedRow({ children, index }: { children: React.ReactNode; index: number }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), index * 40);
        return () => clearTimeout(t);
    }, [index]);
    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}>
            {children}
        </div>
    );
}

function WeeklyTrendTriangle({ pointsThisWeek }: { pointsThisWeek: number }) {
    if (!pointsThisWeek) {
        return (
            <span className="inline-flex items-center text-sm text-gray-300 font-bold">
                –
            </span>
        );
    }

    const isUp = pointsThisWeek > 0;
    const color = isUp ? 'text-green-500' : 'text-red-400';

    return (
        <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${color}`}>
            <span
                className="inline-block w-0 h-0"
                style={
                    isUp
                        ? {
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderBottom: '9px solid currentColor',
                        }
                        : {
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '9px solid currentColor',
                        }
                }
            />
            {Math.abs(pointsThisWeek)}
        </span>
    );
}

// ── Podium (Top 3) ──────────────────────────────────────────────────────────

const PODIUM_CFG: Record<1 | 2 | 3, {
    order: string;
    avatarSize: string;
    ringColor: string;
    fallbackBg: string;
    glow: string;
    platformHeight: string;
    platformBg: string;
    medalEmoji: string;
    labelColor: string;
}> = {
    1: {
        order: 'order-2',
        avatarSize: 'w-16 h-16 text-2xl',
        ringColor: 'border-yellow-400',
        fallbackBg: 'bg-gradient-to-br from-yellow-100 to-amber-200',
        glow: 'shadow-lg shadow-yellow-200',
        platformHeight: 'h-20',
        platformBg: 'from-yellow-400 to-amber-500',
        medalEmoji: '🥇',
        labelColor: 'text-yellow-700',
    },
    2: {
        order: 'order-1',
        avatarSize: 'w-12 h-12 text-lg',
        ringColor: 'border-slate-300',
        fallbackBg: 'bg-slate-100',
        glow: 'shadow-sm',
        platformHeight: 'h-14',
        platformBg: 'from-slate-300 to-slate-400',
        medalEmoji: '🥈',
        labelColor: 'text-slate-600',
    },
    3: {
        order: 'order-3',
        avatarSize: 'w-12 h-12 text-lg',
        ringColor: 'border-amber-400',
        fallbackBg: 'bg-amber-50',
        glow: 'shadow-sm',
        platformHeight: 'h-10',
        platformBg: 'from-amber-600 to-orange-700',
        medalEmoji: '🥉',
        labelColor: 'text-orange-700',
    },
};

function PodiumSlot({ member, rank }: { member: any; rank: 1 | 2 | 3 }) {
    const cfg = PODIUM_CFG[rank];

    if (!member) {
        return <div className={`flex-1 ${cfg.order}`} />;
    }

    return (
        <div className={`flex flex-col items-center flex-1 min-w-0 ${cfg.order}`}>
            {rank === 1 && <div className="text-2xl mb-1 leading-none">👑</div>}

            {member.avatar_url ? (
                <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className={`${cfg.avatarSize} rounded-full object-cover border-2 ${cfg.ringColor} ${cfg.glow}`}
                />
            ) : (
                <div className={`${cfg.avatarSize} rounded-full ${cfg.fallbackBg} flex items-center justify-center font-black ${cfg.labelColor} border-2 ${cfg.ringColor} ${cfg.glow}`}>
                    {member.full_name?.[0]}
                </div>
            )}

            <p className="text-xs font-semibold text-gray-700 truncate max-w-[84px] mx-auto mt-2 text-center">
                {member.full_name}
            </p>
            <div className="flex justify-center mt-0.5">
                <SkillBadge level={member.level} compact />
            </div>

            <p className="text-sm font-black text-slate-700 mt-1 flex items-center justify-center gap-1">
                {member.sessions_this_month}
                <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="" className="w-6 h-6 object-contain" />
            </p>

            <div className="flex justify-center mt-1">
                <AttendanceBadge totalSessions={member.total_sessions} compact />
            </div>
            <div className="flex justify-center mt-1">
                <WeeklyTrendTriangle pointsThisWeek={member.sessions_delta ?? 0} />
            </div>

            <div
                className={`w-full ${cfg.platformHeight} mt-2 rounded-t-xl bg-gradient-to-b ${cfg.platformBg} ${cfg.glow} flex items-start justify-center pt-2`}
            >
                <span className="text-white font-black text-xs flex items-center gap-1">
                    {cfg.medalEmoji} #{rank}
                </span>
            </div>
        </div>
    );
}

function TopThreePodium({ top3 }: { top3: any[] }) {
    return (
        <div className="bg-white rounded-2xl p-4 pt-3 shadow-sm">
            <p className="text-xs text-gray-400 font-medium text-center mb-4 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> TOP 3
            </p>
            <div className="flex items-end justify-center gap-2">
                <PodiumSlot member={top3[1]} rank={2} />
                <PodiumSlot member={top3[0]} rank={1} />
                <PodiumSlot member={top3[2]} rank={3} />
            </div>
        </div>
    );
}

function getCurrentMonthValue() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthOptions(monthsBack = 12) {
    const now = new Date();
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < monthsBack; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        opts.push({ value, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` });
    }
    return opts;
}

const MONTH_OPTIONS = buildMonthOptions(12);

function MonthDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="relative inline-flex items-center">
            <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
            >
                {MONTH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
        </div>
    );
}


function LeaderboardTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
    const [monthData, setMonthData] = useState(data);
    const [monthLoading, setMonthLoading] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (selectedMonth === getCurrentMonthValue()) {
            setMonthData(data);
        }
    }, [data]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const [year, month] = selectedMonth.split('-').map(Number);
        setMonthLoading(true);
        rankingsApi.leaderboard({ month, year })
            .then((res: any) => setMonthData(res.data ?? []))
            .finally(() => setMonthLoading(false));
    }, [selectedMonth]);

    const filteredData = filterByGender(monthData, genderFilter);
    const top3 = filteredData.slice(0, 3);
    const rest = filteredData.slice(3);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-end">
                    <MonthDropdown value={selectedMonth} onChange={setSelectedMonth} />
                </div>
                <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
            </div>

            {monthLoading ? (
                <SkeletonRows count={5} />
            ) : (
                <>
                    {top3.length > 0 && <TopThreePodium top3={top3} />}

                    {rest.length > 0 && (
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                            <div className="divide-y divide-gray-50">
                                {rest.map((member, idx) => {
                                    const isMe = member.id === user?.id;
                                    return (
                                        <AnimatedRow key={member.id} index={idx}>
                                            <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-blue-50' : 'hover:bg-gray-50/50'}`}>
                                                <RankMedal rank={Number(member.rank)} />
                                                <div className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ${isMe ? 'ring-2 ring-blue-300' : ''}`}>
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                            {member.full_name?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className={`font-semibold text-sm truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>{member.full_name}</p>
                                                        {isMe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">Bạn</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        <AttendanceBadge totalSessions={member.total_sessions} compact />
                                                        <SkillBadge level={member.level} compact />
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className={`font-black text-base flex items-center justify-end gap-0.5 ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                                                        {member.sessions_this_month}
                                                        <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="" className="w-5 h-5 object-contain" style={{ mixBlendMode: 'multiply' }} />
                                                    </p>
                                                    <div className="flex justify-end mt-0.5">
                                                        <WeeklyTrendTriangle pointsThisWeek={member.sessions_delta ?? 0} />
                                                    </div>
                                                </div>
                                            </div>
                                        </AnimatedRow>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {filteredData.length === 0 && (
                        <div className="bg-white rounded-2xl py-14 text-center">
                            <Trophy className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                            <p className="text-gray-400 text-sm">Không có dữ liệu cho tháng này</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function WinRateTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const filteredData = filterByGender(data, genderFilter);
    return (
        <div className="space-y-4">
            <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
            {filteredData.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <Swords className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Chưa có dữ liệu win rate tháng này</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        {filteredData.map((member, idx) => {
                            const isMe = member.id === user?.id;
                            const isTop3 = idx < 3;
                            const winRate = Number(member.win_rate_percent ?? 0);
                            const barColor = winRate >= 70 ? 'bg-green-500' : winRate >= 50 ? 'bg-blue-500' : winRate >= 30 ? 'bg-amber-400' : 'bg-red-400';
                            return (
                                <AnimatedRow key={member.id} index={idx}>
                                    <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-blue-50' : isTop3 ? 'bg-yellow-50/50' : 'hover:bg-gray-50/50'}`}>
                                        <RankMedal rank={idx + 1} />
                                        <div className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ${isMe ? 'ring-2 ring-blue-300' : ''}`}>
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                    {member.full_name?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`font-semibold text-sm truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>{member.full_name}</p>
                                                {isMe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">Bạn</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(winRate, 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0">{member.total_sets_month ?? 0} set</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-black text-sm ${winRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>{winRate.toFixed(1)}%</p>
                                            <p className="text-[10px] text-gray-400">
                                                <span className="text-green-600">{member.sets_won_month}W</span>{' / '}
                                                <span className="text-red-400">{member.sets_lost_month}L</span>
                                            </p>
                                        </div>
                                    </div>
                                </AnimatedRow>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

const TIER_COLOR: Record<string, string> = {
    'Tân thủ': 'text-zinc-500',
    'Phong trào': 'text-orange-600',
    'Cứng cựa': 'text-slate-500',
    'Chủ lực': 'text-yellow-600',
    'Cao thủ': 'text-sky-600',
    'Kiện tướng': 'text-emerald-600',
    'Đại Kiện Tướng': 'text-blue-600',
    'Huyền Thoại': 'text-purple-700',
};

const POINTS_PER_TIER = 50;

function MiniEnergyBar({ points, total }: { points: number; total: number }) {
    const [animatedWidth, setAnimatedWidth] = useState(0);
    const targetWidth = Math.min(100, (points / total) * 100);
    const percent = Math.round(targetWidth);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedWidth(targetWidth), 150);
        return () => clearTimeout(timer);
    }, [targetWidth]);

    return (
        <div className="w-full max-w-[160px] mt-1.5">
            <div className="flex items-center gap-2">
                <div className="relative h-3 flex-1 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-lime-400 via-green-500 to-emerald-500"
                        style={{
                            width: `${animatedWidth}%`,
                            transition: 'width 700ms ease-out',
                        }}
                    />
                </div>
                <span className="text-[13px] font-bold text-green-600 flex-shrink-0">{percent}%</span>
            </div>
            <p className="text-[13px] text-gray-400 mt-2">
                {points}/{total} điểm lên hạng
            </p>
        </div>
    );
}


function RankTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const filteredData = filterByGender(data, genderFilter)
        .sort((a, b) => {
            if (b.total_points !== a.total_points) {
                return b.total_points - a.total_points;
            }
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            return a.losses - b.losses;
        });

    const displayList = filteredData.map((p, idx) => ({
        ...p,
        _displayRank: idx + 1,
    }));

    return (
        <div className="space-y-4">
            <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
            {displayList.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <Shield className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Chưa có dữ liệu rank</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        {displayList.map((p, idx) => {
                            const isMe = p.id === user?.id;
                            const pos = p._displayRank;
                            const tierColor = TIER_COLOR[p.tier] ?? 'text-gray-600';
                            const isMaxTier = p.tier === 'Huyền Thoại';
                            return (
                                <AnimatedRow key={p.id} index={idx}>
                                    <div className={`flex items-center gap-3 px-4 py-7 ${isMe ? 'bg-blue-50' : pos <= 3 ? 'bg-yellow-50/50' : 'hover:bg-gray-50/50'}`}>
                                        <RankMedal rank={pos} />
                                        <div className='ml-10' style={{ width: 48, height: 48, flexShrink: 0, overflow: 'visible' }}>
                                            <RankPodiumAvatarList
                                                tier={p.tier}
                                                avatar={p.avatar_url}
                                                name={p.full_name}
                                                size={48}
                                                frameScale={5.5}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 ml-12">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`font-bold text-base break-words ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>{p.full_name}</p>
                                                {isMe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">Bạn</span>}
                                            </div>
                                            <span className={`text-sm font-semibold ${tierColor}`}>{p.tier}</span>
                                            {!isMaxTier && (
                                                <MiniEnergyBar points={p.points ?? 0} total={POINTS_PER_TIER} />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center flex-shrink-0">
                                            <p className="text-sm text-gray-400 text-center">
                                                <span className="text-green-600 font-medium">{p.wins}W</span>
                                                <span className="mx-0.5">/</span>
                                                <span className="text-red-400 font-medium">{p.losses}L</span>
                                            </p>
                                            <div className="mt-0.5">
                                                <WeeklyTrendTriangle pointsThisWeek={p.points_this_week ?? 0} />
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedRow>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function filterData_withOriginalRank(data: any[]) {
    return data.map(p => ({ ...p, _displayRank: Number(p.rank_position) }));
}

export default function LeaderboardPage() {
    const { user } = useAuthStore();
    const [tab, setTab] = useState<Tab>('rank');
    const [prevTab, setPrevTab] = useState<Tab>('rank');
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [winRateData, setWinRateData] = useState<any[]>([]);
    const [rankData, setRankData] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [lb, wr, rk, ms] = await Promise.all([
                rankingsApi.leaderboard(),
                rankingsApi.winRate(),
                rankingsApi.rankLeaderboard(),
                rankingsApi.myStats(),
            ]);
            setLeaderboardData(lb.data ?? []);
            setWinRateData(wr.data ?? []);
            setRankData(rk.data ?? []);
            setMyStats(ms.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleTabChange = (newTab: Tab) => {
        if (newTab === tab) return;
        setTabLoading(true);
        setPrevTab(tab);
        setTimeout(() => {
            setTab(newTab);
            setTabLoading(false);
        }, 150);
    };

    const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'rank', label: 'Rank', icon: '💎' },
        { key: 'winrate', label: 'Winrate', icon: '⚔️' },
        {
            key: 'leaderboard', label: 'Buổi đánh',
            icon: <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" className="w-4 h-4 object-contain" style={{ mixBlendMode: 'screen' }} />
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Bảng xếp hạng
                </h1>
                <button onClick={fetchAll} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
                {TABS.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => handleTabChange(key)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${tab === key
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm scale-[1.02]'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        {typeof icon === 'string' ? icon : icon} {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <SkeletonRows count={6} />
            ) : tabLoading ? (
                <SkeletonRows count={4} />
            ) : (
                <TabContent tabKey={tab}>
                    {tab === 'rank' && <RankTab data={rankData} myStats={myStats} user={user} />}
                    {tab === 'winrate' && <WinRateTab data={winRateData} myStats={myStats} user={user} />}
                    {tab === 'leaderboard' && <LeaderboardTab data={leaderboardData} myStats={myStats} user={user} />}
                </TabContent>
            )}
        </div>
    );
}
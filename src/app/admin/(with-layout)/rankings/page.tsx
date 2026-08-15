"use client";
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Trophy, Users, Crown, Calendar, ChevronDown } from 'lucide-react';
import { rankingsAdminApi } from '@/lib/api';
import { getTierConfig } from '@/helper/rankConfig';

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

const POINTS_PER_TIER = 50;

function TriangleUp({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] ${className}`}
        />
    );
}


function getAttendanceTier(totalSessions: number) {
    const t = ATTENDANCE_TIERS.find((t) => totalSessions >= t.min && totalSessions <= t.max);
    return t ?? ATTENDANCE_TIERS[0];
}

function AttendanceLevelBadge({ totalSessions }: { totalSessions: number }) {
    const tier = getAttendanceTier(totalSessions);
    return (
        <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium text-gray-600 max-w-full">
            <span className="flex-shrink-0">{tier.icon}</span>
            <span className="truncate">{tier.label}</span>
        </span>
    );
}

function TriangleDown({ className = '' }: { className?: string }) {
    return (
        <span
            className={`inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[9px] ${className}`}
        />
    );
}

function YearDropdown({ options, value, onChange }: { options: number[]; value: number; onChange: (y: number) => void }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) setMounted(true);
        else if (mounted) {
            const t = setTimeout(() => setMounted(false), 150);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <div ref={wrapRef} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap hover:bg-gray-100 hover:border-gray-300 transition-colors duration-200"
            >
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>Năm {value}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {mounted && (
                <div
                    className={`absolute right-0 mt-1.5 w-28 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 origin-top-right transition-all duration-150 ease-out ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
                >
                    {options.map((y) => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => { onChange(y); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${y === value ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Năm {y}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function MonthOptionDropdown({ value, onChange }: { value: 'all' | number; onChange: (v: 'all' | number) => void }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) setMounted(true);
        else if (mounted) {
            const t = setTimeout(() => setMounted(false), 150);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const label = value === 'all' ? 'Cả năm' : `Tháng ${value}`;

    return (
        <div ref={wrapRef} className="relative flex-shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap hover:bg-gray-100 hover:border-gray-300 transition-colors duration-200"
            >
                <span>{label}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {mounted && (
                <div
                    className={`absolute right-0 mt-1.5 w-32 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 origin-top-right transition-all duration-150 ease-out ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
                >
                    <button
                        type="button"
                        onClick={() => { onChange('all'); setOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold border-b border-gray-100 mb-1 transition-colors duration-150 ${value === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                        📅 Cả năm
                    </button>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { onChange(m); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${value === m ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Tháng {m}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function DeltaText({ delta, suffix }: { delta: number; suffix: string }) {
    if (delta > 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TriangleUp className="border-b-emerald-600" />
                {delta} {suffix}
            </span>
        );
    }
    if (delta < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                <TriangleDown className="border-t-red-500" />
                {Math.abs(delta)} {suffix}
            </span>
        );
    }
    return <span className="inline-flex items-center text-xs font-medium text-gray-400">-</span>;
}

function ProgressBar({ percent, gradientClass }: { percent: number; gradientClass: string }) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        setWidth(0);
        const t = setTimeout(() => setWidth(percent), 50);
        return () => clearTimeout(t);
    }, [percent]);

    return (
        <div className="relative flex-1 h-2 sm:h-2.5 bg-gray-100 rounded-full overflow-hidden min-w-[40px] sm:min-w-[60px]">
            <div
                className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${gradientClass}`}
                style={{ width: `${width}%` }}
            >
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
        </div>
    );
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name: string; size?: number }) {
    const [err, setErr] = useState(false);
    const show = src && !err;
    return (
        <div className="rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-blue-100 text-blue-700 font-semibold flex-shrink-0" style={{ width: size, height: size }}>
            {show ? <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} /> : <span>{name?.[0]?.toUpperCase()}</span>}
        </div>
    );
}

const POS_BADGE_CLS: Record<number, string> = {
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-orange-100 text-orange-700',
};

function TopThree({ data, valueKey, valueSuffix, deltaKey, deltaSuffix, deltaLabel, renderSub }: {
    data: any[];
    valueKey: string;
    valueSuffix: string;
    deltaKey: string;
    deltaSuffix: string;
    deltaLabel: string;
    renderSub?: (m: any) => React.ReactNode;
}) {
    const order = [data[1], data[0], data[2]];
    const positions = [2, 1, 3];
    const liftClass = ['mt-4 sm:mt-6', 'mt-0', 'mt-4 sm:mt-6'];

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end">
            {order.map((m, i) => {
                const pos = positions[i];
                if (!m) return <div key={i} />;
                const isFirst = pos === 1;
                return (
                    <div
                        key={m.id}
                        className={`relative rounded-2xl p-2.5 sm:p-4 text-center ${liftClass[i]} ${isFirst ? 'bg-amber-50 border-2 border-amber-300 shadow-sm' : 'bg-gray-50 border border-gray-200'}`}
                    >
                        {isFirst ? (
                            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 fill-amber-300 absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2" />
                        ) : (
                            <span className={`absolute -top-2.5 sm:-top-3 left-2 sm:left-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${POS_BADGE_CLS[pos]}`}>
                                {pos}
                            </span>
                        )}
                        <div className="flex justify-center mb-1.5 sm:mb-2">
                            <Avatar src={m.avatar_url} name={m.full_name} size={isFirst ? 56 : 44} />
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{m.full_name}</p>
                        {renderSub && <div className="mt-0.5">{renderSub(m)}</div>}
                        <p className={`font-black mt-1 ${isFirst ? 'text-lg sm:text-2xl text-gray-900' : 'text-base sm:text-xl text-gray-800'}`}>
                            {m[valueKey]} <span className="text-[10px] sm:text-xs font-medium text-gray-400">{valueSuffix}</span>
                        </p>
                        <div className="mt-1 flex justify-center">
                            <DeltaText delta={m[deltaKey] ?? 0} suffix={deltaSuffix} />
                        </div>
                        <p className="hidden sm:block text-[10px] text-gray-400 mt-0.5">{deltaLabel}</p>
                    </div>
                );
            })}
        </div>
    );
}

function PosPill({ pos }: { pos: number }) {
    return (
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center">
            {pos}
        </span>
    );
}


function SessionMobileCard({ m, pos, prevMonthLabel }: { m: any; pos: number; prevMonthLabel: string }) {
    const totalClubSessions = m.total_sessions_in_month ?? 0;
    const rate = totalClubSessions > 0 ? Math.min(100, (m.sessions_this_month / totalClubSessions) * 100) : 0;
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5">
            <PosPill pos={pos} />
            <Avatar src={m.avatar_url} name={m.full_name} size={32} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <AttendanceLevelBadge totalSessions={m.total_sessions ?? 0} />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <ProgressBar percent={rate} gradientClass="bg-emerald-500" />
                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {m.sessions_this_month}/{totalClubSessions} ({rate.toFixed(0)}%)
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{m.sessions_this_month} buổi</span>
                <DeltaText delta={m.sessions_delta ?? 0} suffix="" />
            </div>
        </div>
    );
}

function SessionTable({ data, prevMonthLabel }: { data: any[]; prevMonthLabel: string }) {
    return (
        <div className="card !p-0 overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
                            <th className="px-3 py-2.5 font-medium w-10">#</th>
                            <th className="px-3 py-2.5 font-medium">Thành viên</th>
                            <th className="px-3 py-2.5 font-medium">Cấp độ</th>
                            <th className="px-3 py-2.5 font-medium text-center whitespace-nowrap">Số buổi<br />tháng này</th>
                            <th className="px-3 py-2.5 font-medium text-center">Tỷ lệ</th>
                            <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">So với<br />{prevMonthLabel}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((m, idx) => {
                            const pos = idx + 4;
                            const totalClubSessions = m.total_sessions_in_month ?? 0;
                            const rate = totalClubSessions > 0
                                ? Math.min(100, (m.sessions_this_month / totalClubSessions) * 100)
                                : 0;
                            return (
                                <tr key={m.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2.5 text-gray-400 font-medium">{pos}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar src={m.avatar_url} name={m.full_name} size={28} />
                                            <span className="font-medium text-gray-800 truncate">{m.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <AttendanceLevelBadge totalSessions={m.total_sessions ?? 0} />
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-semibold text-gray-700 whitespace-nowrap">{m.sessions_this_month} buổi</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <ProgressBar percent={rate} gradientClass="bg-emerald-500" />
                                            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                                                {m.sessions_this_month}/{totalClubSessions} ({rate.toFixed(0)}%)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <DeltaText delta={m.sessions_delta ?? 0} suffix="" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-50">
                {data.map((m, idx) => (
                    <SessionMobileCard key={m.id} m={m} pos={idx + 4} prevMonthLabel={prevMonthLabel} />
                ))}
            </div>
        </div>
    );
}


function RankMobileCard({ p, pos }: { p: any; pos: number }) {
    const cfg = getTierConfig(p.tier);
    const progressPct = Math.min(100, ((p.points ?? 0) / POINTS_PER_TIER) * 100);
    return (
        <div className="flex items-center gap-2.5 px-3 py-2.5">
            <PosPill pos={pos} />
            <Avatar src={p.avatar_url} name={p.full_name} size={32} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{p.full_name}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap mt-0.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    💎 {p.tier}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <ProgressBar percent={progressPct} gradientClass="bg-gradient-to-r from-violet-400 to-purple-600" />
                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {(p.points ?? 0)}/{POINTS_PER_TIER}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-gray-800 whitespace-nowrap">{p.total_points} đ</span>
                <DeltaText delta={p.points_this_week ?? 0} suffix="" />
            </div>
        </div>
    );
}

function RankTable({ data }: { data: any[] }) {
    return (
        <div className="card !p-0 overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] text-gray-400 border-b border-gray-100">
                            <th className="px-3 py-2.5 font-medium w-10">#</th>
                            <th className="px-3 py-2.5 font-medium">Thành viên</th>
                            <th className="px-3 py-2.5 font-medium">Rank</th>
                            <th className="px-3 py-2.5 font-medium text-right">Điểm</th>
                            <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">So với<br />tuần trước</th>
                            <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Tiến độ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((p, idx) => {
                            const pos = idx + 4;
                            const cfg = getTierConfig(p.tier);
                            const progressPct = Math.min(100, ((p.points ?? 0) / POINTS_PER_TIER) * 100);
                            return (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2.5 text-gray-400 font-medium">{pos}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar src={p.avatar_url} name={p.full_name} size={28} />
                                            <span className="font-medium text-gray-800 truncate">{p.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                            💎 {p.tier}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-gray-700">{p.total_points}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        <DeltaText delta={p.points_this_week ?? 0} suffix="" />
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2 justify-end">
                                            <ProgressBar percent={progressPct} gradientClass="bg-gradient-to-r from-violet-400 to-purple-600" />
                                            <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                                                {(p.points ?? 0)}/{POINTS_PER_TIER}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="sm:hidden divide-y divide-gray-50">
                {data.map((p, idx) => (
                    <RankMobileCard key={p.id} p={p} pos={idx + 4} />
                ))}
            </div>
        </div>
    );
}

export default function RankingsPage() {
    const [sessionData, setSessionData] = useState<any[]>([]);
    const [rankData, setRankData] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingRank, setLoadingRank] = useState(true);

    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonthOption, setSelectedMonthOption] = useState<'all' | number>(today.getMonth() + 1);

    const yearOptions = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

    const fetchSessions = async (year: number, monthOption: 'all' | number) => {
        setLoadingSessions(true);
        try {
            const { data } = monthOption === 'all'
                ? await rankingsAdminApi.leaderboard({ view: 'year', year })
                : await rankingsAdminApi.leaderboard({ month: monthOption, year });
            setSessionData(data ?? []);
        } finally { setLoadingSessions(false); }
    };

    const fetchRank = async () => {
        setLoadingRank(true);
        try { const { data } = await rankingsAdminApi.rankLeaderboard(); setRankData(data ?? []); }
        finally { setLoadingRank(false); }
    };

    const refreshAll = () => { fetchSessions(selectedYear, selectedMonthOption); fetchRank(); };
    useEffect(() => { refreshAll(); }, []);
    useEffect(() => { fetchSessions(selectedYear, selectedMonthOption); }, [selectedYear, selectedMonthOption]);

    const sessionTop3 = sessionData.slice(0, 3);
    const sessionRest = sessionData.slice(3);
    const rankTop3 = rankData.slice(0, 3);
    const rankRest = rankData.slice(3);

    // Label "so với ..." — tự lùi qua năm trước nếu đang ở tháng 1
    const prevLabel = (() => {
        if (selectedMonthOption === 'all') return `năm ${selectedYear - 1}`;
        if (selectedMonthOption === 1) return `tháng 12/${selectedYear - 1}`;
        return `tháng ${selectedMonthOption - 1}/${selectedYear}`;
    })();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bảng xếp hạng</h1>
                <button onClick={refreshAll} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm sm:text-base">
                                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" /> <span className="truncate">CHUYÊN CẦN</span>
                            </h2>
                            <p className="hidden sm:block text-xs text-gray-400 mt-0.5">Xếp hạng thành viên theo tổng số buổi tham gia</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <YearDropdown options={yearOptions} value={selectedYear} onChange={setSelectedYear} />
                            <MonthOptionDropdown value={selectedMonthOption} onChange={setSelectedMonthOption} />
                        </div>
                    </div>

                    {loadingSessions && sessionData.length === 0 ? (
                        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-gray-100" />)}</div>
                    ) : sessionData.length === 0 ? (
                        <div className="card py-10 text-center text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Chưa có dữ liệu</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {loadingSessions && (
                                <div className="absolute inset-0 z-10 -m-1 bg-white/70 backdrop-blur-[1px] rounded-2xl flex items-start justify-center pt-12">
                                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                                </div>
                            )}
                            <div className={`space-y-3 transition-opacity duration-200 ${loadingSessions ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                                <TopThree
                                    data={sessionTop3}
                                    valueKey="sessions_this_month"
                                    valueSuffix="buổi"
                                    deltaKey="sessions_delta"
                                    deltaSuffix="buổi"
                                    deltaLabel={`so với ${prevLabel}`}
                                    renderSub={(m) => <AttendanceLevelBadge totalSessions={m.total_sessions ?? 0} />}
                                />
                                {sessionRest.length > 0 && <SessionTable data={sessionRest} prevMonthLabel={prevLabel} />}
                                <p className="text-[11px] text-gray-400 flex items-start gap-1.5 px-1">
                                    <span>ⓘ</span>
                                    <span>Tỷ lệ tham gia = (Số buổi thành viên đã tham gia / Tổng số buổi CLB tổ chức trong khoảng thời gian đã chọn) × 100%.</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Phần ĐIỂM RANK giữ nguyên, không đổi */}
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm sm:text-base">
                                <Trophy className="w-4 h-4 text-purple-500 flex-shrink-0" /> <span className="truncate">ĐIỂM RANK</span>
                            </h2>
                            <p className="hidden sm:block text-xs text-gray-400 mt-0.5">Xếp hạng thành viên theo tổng điểm tích lũy để leo rank</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap flex-shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="hidden sm:inline">Tất cả thời gian</span>
                            <span className="sm:hidden">Tất cả</span>
                        </span>
                    </div>

                    {loadingRank ? (
                        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card h-14 animate-pulse bg-gray-100" />)}</div>
                    ) : rankData.length === 0 ? (
                        <div className="card py-10 text-center text-gray-400">
                            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Chưa có dữ liệu</p>
                        </div>
                    ) : (
                        <>
                            <TopThree
                                data={rankTop3}
                                valueKey="total_points"
                                valueSuffix="điểm"
                                deltaKey="points_this_week"
                                deltaSuffix="điểm"
                                deltaLabel="so với tuần trước"
                                renderSub={(m) => (
                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${getTierConfig(m.tier).color}`}>
                                        💎 {m.tier}
                                    </span>
                                )}
                            />
                            {rankRest.length > 0 && <RankTable data={rankRest} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
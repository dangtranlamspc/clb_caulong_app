'use client';
import { useEffect, useState, useRef } from 'react';
import { Trophy, RefreshCw, Swords, Shield, X, Triangle, Crown, Award, Info } from 'lucide-react';
import { rankingsApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { getTierCardBackground, getTierTheme, RankIcon, RankPodiumAvatarList } from '@/components/member/ranks/Rank';
import { createPortal } from 'react-dom';
import { CustomSelect } from '@/components/admin/sessions/CustomSelect';
import Lottie from 'lottie-react';

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
        <div className="flex border border-gray-100 rounded-lg bg-white p-0.5 gap-0.5 mb-3">
            {OPTS.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all duration-200 ${value === key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-black hover:bg-gray-50'
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
        setVisible(false);
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, [tabKey]);
    return (
        <div
            key={tabKey}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.18s ease, transform 0.18s ease',
                willChange: 'opacity, transform',
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
            <Crown className="w-4 h-4 text-white" fill="currentColor" strokeWidth={1.5} />
        </div>
    );
    if (rank === 2) return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm">
            <Award className="w-4 h-4 text-white" />
        </div>
    );
    if (rank === 3) return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-sm">
            <Award className="w-4 h-4 text-white" />
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
        const delay = Math.min(index * 30, 300);
        const t = setTimeout(() => setVisible(true), delay);
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
    const isUp = pointsThisWeek > 0;
    const isFlat = !pointsThisWeek;
    const color = isFlat ? 'text-gray-300' : isUp ? 'text-green-500' : 'text-red-400';

    if (isFlat) {
        return (
            <span className={`inline-flex items-center text-xs font-bold ${color}`}>
                –
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
            <Triangle
                className={`w-2.5 h-2.5 ${isUp ? '' : 'rotate-180'}`}
                fill="currentColor"
                strokeWidth={0}
            />
            {Math.abs(pointsThisWeek)}
        </span>
    );
}

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

function buildYearOptions(count = 5) {
    const y = new Date().getFullYear();
    return Array.from({ length: count }, (_, i) => ({ value: String(y - i), label: `Năm ${y - i}` }));
}

function buildMonthOptionList() {
    return [
        { value: 'all', label: '📅 Cả năm' },
        ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` })),
    ];
}

const YEAR_OPTIONS = buildYearOptions(5);
const MONTH_OPTION_LIST = buildMonthOptionList();

let cachedInfoAnimation: any = null;
let infoAnimationPromise: Promise<any> | null = null;

function InfoTriggerButton({ onClick }: { onClick: () => void }) {
    const [animationData, setAnimationData] = useState<any>(cachedInfoAnimation);

    useEffect(() => {
        if (cachedInfoAnimation) return;
        if (!infoAnimationPromise) {
            infoAnimationPromise = fetch('/lottie/info.json').then((res) => res.json());
        }
        infoAnimationPromise.then((data) => {
            cachedInfoAnimation = data;
            setAnimationData(data);
        });
    }, []);

    return (
        <button
            onClick={onClick}
            className="mb-3 flex-shrink-0"
        >
            {animationData ? (
                <Lottie animationData={animationData} loop autoplay className="w-12 h-12" />
            ) : null}
        </button>
    );
}

function LeaderboardInfoModal({ onClose }: { onClose: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative max-h-[85vh] overflow-y-auto"
                style={{
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                <div className="px-5 pt-6 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                        <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="" className="w-5 h-5 object-contain" />
                        <p className="text-base font-bold text-gray-800">Cách tính điểm buổi đánh</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                        Mỗi buổi đánh tham gia và thanh toán xong sẽ được cộng điểm vào bảng xếp hạng này.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">1. Khi nào được cộng điểm?</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                                    Tham gia + thanh toán thành công: +1
                                    <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="" className="w-4 h-4 object-contain" />
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed mt-2">
                                Điểm chỉ được cộng khi admin (hoặc hệ thống trừ ví tự động) <span className="font-semibold text-gray-700">xác nhận thanh toán</span> cho buổi đánh — đăng ký tham gia nhưng chưa thanh toán xong sẽ chưa được tính.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">2. Số điểm hiển thị</p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Con số cạnh biểu tượng <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="" className="inline w-3.5 h-3.5 object-contain mx-0.5" /> là tổng số buổi đã tham gia và thanh toán thành công trong khoảng thời gian đang chọn (theo tháng cụ thể, hoặc 3/6/12 tháng gần nhất).
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">3. Mũi tên xu hướng</p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                So sánh số buổi tham gia của khoảng thời gian hiện tại với khoảng liền trước đó (ví dụ tháng này so với tháng trước) — tăng thì mũi tên xanh, giảm thì mũi tên đỏ.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}


function LeaderboardTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
    const [selectedMonthOption, setSelectedMonthOption] = useState(String(today.getMonth() + 1));
    const [monthData, setMonthData] = useState(data);
    const [monthLoading, setMonthLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const isFirstRender = useRef(true);

    const isCurrentDefault =
        selectedYear === String(today.getFullYear()) &&
        selectedMonthOption === String(today.getMonth() + 1);

    useEffect(() => {
        if (isCurrentDefault) {
            setMonthData(data);
        }
    }, [data]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        setMonthLoading(true);

        const params = selectedMonthOption === 'all'
            ? { view: 'year' as const, year: Number(selectedYear) }
            : { month: Number(selectedMonthOption), year: Number(selectedYear) };

        rankingsApi.leaderboard(params)
            .then((res: any) => setMonthData(res.data ?? []))
            .finally(() => setMonthLoading(false));
    }, [selectedYear, selectedMonthOption]);

    const filteredData = filterByGender(monthData, genderFilter);
    const top3 = filteredData.slice(0, 3);
    const rest = filteredData.slice(3);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-end gap-2">
                    <CustomSelect
                        value={selectedYear}
                        onChange={setSelectedYear}
                        options={YEAR_OPTIONS}
                        triggerClassName="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 min-w-[100px]"
                    />
                    <CustomSelect
                        value={selectedMonthOption}
                        onChange={setSelectedMonthOption}
                        options={MONTH_OPTION_LIST}
                        triggerClassName="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 min-w-[110px]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
                    </div>
                    <InfoTriggerButton onClick={() => setShowInfo(true)} />
                </div>
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
                            <p className="text-gray-400 text-sm">Không có dữ liệu cho khoảng thời gian này</p>
                        </div>
                    )}

                    {showInfo && <LeaderboardInfoModal onClose={() => setShowInfo(false)} />}
                </>
            )}
        </div>
    );
}

function WinRateInfoModal({ onClose }: { onClose: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative max-h-[85vh] overflow-y-auto"
                style={{
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                <div className="px-5 pt-6 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Swords className="w-5 h-5 text-blue-600" />
                        <p className="text-base font-bold text-gray-800">Cách tính & xếp hạng Winrate</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                        Không chỉ dựa vào % thắng thô, để công bằng hơn với người chơi nhiều trận so với những người ít trận.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">1. Công thức tính %:</p>
                            <p className="text-xs font-mono font-semibold text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mt-2">
                                % = (Thắng + 5) / (Tổng trận + 10) × 100
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">2. Trường hợp 0 trận thắng</p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Nếu chưa thắng trận nào, % hiển thị luôn là <span className="font-semibold text-gray-700">0%</span> (không áp dụng công thức phía trên), để không gây hiểu lầm là "có tỷ lệ thắng dương" dù thực tế chưa thắng lần nào.
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed mt-1">
                                Trong nhóm 0 thắng, ai <span className="font-semibold text-gray-700">thua ít trận hơn</span> sẽ được xếp cao hơn — ví dụ 0 thắng/2 thua đứng trên 0 thắng/4 thua.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function WinRateTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const [showInfo, setShowInfo] = useState(false);
    const filteredData = filterByGender(data, genderFilter);
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                    <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
                </div>
                <InfoTriggerButton onClick={() => setShowInfo(true)} />
            </div>
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
                                                <span className="text-[10px] text-gray-400 flex-shrink-0">{member.total_sets_month ?? 0} trận</span>
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
                        {showInfo && <WinRateInfoModal onClose={() => setShowInfo(false)} />}
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

const TIER_ORDER = [
    'Tân thủ',
    'Phong trào',
    'Cứng cựa',
    'Chủ lực',
    'Cao thủ',
    'Kiện tướng',
    'Đại Kiện Tướng',
    'Huyền Thoại',
];

const POINTS_PER_TIER = 50;

function getTotalPoints(tier: string, currentPoints: number): number | null {
    const idx = TIER_ORDER.indexOf(tier);
    if (idx <= 0) return null;
    return idx * POINTS_PER_TIER + (currentPoints ?? 0);
}


function RankEnergyBar({ points, total, tier }: { points: number; total: number; tier: string }) {
    const [animatedWidth, setAnimatedWidth] = useState(0);
    const targetWidth = Math.min(100, (points / total) * 100);
    const percent = Math.round(targetWidth);
    const theme = getTierTheme(tier);

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedWidth(targetWidth), 150);
        return () => clearTimeout(timer);
    }, [targetWidth]);

    return (
        <div className="w-full max-w-[220px]">
            <div className="flex items-center gap-2">
                <div
                    className="relative h-4 flex-1 rounded-full overflow-hidden border"
                    style={{ background: theme.track, borderColor: `${theme.accent}55` }}
                >
                    <div
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                            width: `${animatedWidth}%`,
                            background: `linear-gradient(90deg, ${theme.mid}, ${theme.glow}, ${theme.accent})`,
                            transition: 'width 700ms ease-out',
                        }}
                    >
                        <div
                            className="absolute top-0 left-0 h-full w-1/2"
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                animation: 'energy-shimmer 2s linear infinite',
                            }}
                        />
                    </div>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: theme.glow }}>{percent}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
                {points}/{total} điểm lên hạng
            </p>
            <style jsx>{`
                @keyframes energy-shimmer {
                    0% { transform: translateX(-220%); }
                    100% { transform: translateX(220%); }
                }
            `}</style>
        </div>
    );
}

function RankDetailModal({ member, onClose }: { member: any; onClose: () => void }) {
    const [visible, setVisible] = useState(false);
    const tier = member.tier;
    const theme = getTierTheme(tier);
    const isMaxTier = tier === 'Huyền Thoại';

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-xs rounded-3xl overflow-hidden relative"
                style={{
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                    backgroundColor: theme.dark,
                    backgroundImage: getTierCardBackground(tier),
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex flex-col items-center px-6 pt-12 pb-6">
                    <p className="text-sm font-semibold text-white/90 mb-1">{member.full_name}</p>

                    <div
                        style={{
                            width: '100%', maxWidth: 260, height: 210,
                            overflow: 'visible', display: 'flex',
                            alignItems: 'flex-start', justifyContent: 'center',
                            pointerEvents: 'none', position: 'relative', zIndex: 1,
                        }}
                    >
                        <RankIcon tier={tier} size={230} scale={1.25} offsetY={12} />
                    </div>

                    <p className="text-base font-bold text-white drop-shadow -mt-4 mb-3">{tier}</p>

                    {isMaxTier ? (
                        <p className="text-sm text-white/70">Đã đạt hạng cao nhất</p>
                    ) : (
                        <RankEnergyBar points={member.points ?? 0} total={POINTS_PER_TIER} tier={tier} />
                    )}

                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/15 w-full justify-center">
                        <p className="text-sm text-white/80">
                            <span className="text-emerald-300 font-bold">{member.wins}W</span>
                            <span className="mx-1 text-white/40">/</span>
                            <span className="text-red-300 font-bold">{member.losses}L</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function RankInfoModal({ onClose }: { onClose: () => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-sm bg-white rounded-3xl overflow-hidden relative max-h-[85vh] overflow-y-auto"
                style={{
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                >
                    <X className="w-4 h-4 text-gray-600" />
                </button>

                <div className="px-5 pt-6 pb-5">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <p className="text-base font-bold text-gray-800">Cách tính điểm & thăng hạng</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-4">
                        Điểm được cộng theo từng trận đấu, tích lũy đủ sẽ tự động lên hạng.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">1. Cộng điểm sau mỗi trận</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                                    Thắng: +5 điểm
                                </span>
                                <span className="text-xs font-mono font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-1.5">
                                    Thua: +2 điểm
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed mt-2">
                                Dù thắng hay thua, mỗi trận đấu đều được cộng điểm — thắng được nhiều hơn để khuyến khích thi đấu tốt, nhưng thua vẫn có điểm để ghi nhận sự tham gia.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">2. Lên hạng</p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Mỗi hạng cần tích lũy đủ <span className="font-semibold text-gray-700">{POINTS_PER_TIER} điểm</span> để lên hạng tiếp theo. Điểm hiển thị trên mỗi thẻ (ví dụ "14 điểm") là điểm đang có trong hạng hiện tại — đạt {POINTS_PER_TIER} sẽ tự động thăng hạng và điểm reset về 0 ở hạng mới.
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">3. Thứ tự các hạng</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {TIER_ORDER.map((t, i) => (
                                    <span
                                        key={t}
                                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${TIER_COLOR[t] ?? 'text-gray-600'} bg-gray-50`}
                                    >
                                        {i + 1}. {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">4. Tổng điểm là gì?</p>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                "Tổng điểm" là điểm cộng dồn từ hạng đầu tiên đến hiện tại — bằng số hạng đã vượt qua nhân {POINTS_PER_TIER}, cộng điểm đang có ở hạng hiện tại. Dùng để so sánh mức độ tiến bộ tổng thể giữa các thành viên.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}


function RankTab({ data, myStats, user }: { data: any[]; myStats: any; user: any }) {
    const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showInfo, setShowInfo] = useState(false);

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
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                    <GenderSubTabs value={genderFilter} onChange={setGenderFilter} />
                </div>
                <InfoTriggerButton onClick={() => setShowInfo(true)} />
            </div>
            {displayList.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <Shield className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Chưa có dữ liệu rank</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayList.map((p, idx) => {
                        const isMe = p.id === user?.id;
                        const pos = p._displayRank;
                        const tierColor = TIER_COLOR[p.tier] ?? 'text-gray-600';
                        const totalPoints = getTotalPoints(p.tier, p.points ?? 0);

                        const delta = p.points_this_week ?? 0;
                        const isUp = delta > 0;
                        const isFlat = delta === 0;
                        const trendColor = isFlat ? 'text-gray-300' : isUp ? 'text-emerald-500' : 'text-red-500';
                        return (
                            <AnimatedRow key={p.id} index={idx}>
                                <button
                                    onClick={() => setSelectedMember(p)}
                                    className={`w-full flex items-center gap-3 px-4 py-6 rounded-2xl -translate-y-0.5 text-left ${isMe ? 'bg-blue-50' : pos <= 3 ? 'bg-yellow-50/50' : 'bg-white'}`}
                                    style={{
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
                                    }}
                                >
                                    <RankMedal rank={pos} />
                                    <div className="ml-10 flex-shrink-0" style={{ width: 48, height: 48, overflow: 'visible' }}>
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
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className={`text-sm font-extrabold tabular-nums ${tierColor}`}>
                                                {p.points ?? 0}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">điểm</span>
                                        </div>
                                    </div>

                                    {totalPoints !== null && (
                                        <div className="flex flex-col items-center flex-shrink-0 mr-6">
                                            <div className="relative">
                                                <p className={`text-2xl font-extrabold tabular-nums leading-none ${tierColor}`}>
                                                    {totalPoints}
                                                </p>
                                                <div className="absolute -top-3 -right-9 flex items-center gap-0.5">
                                                    {isFlat ? (
                                                        <span className={`text-sm font-bold ${trendColor}`}>–</span>
                                                    ) : (
                                                        <>
                                                            <Triangle
                                                                className={`w-3.5 h-3.5 ${trendColor} ${isUp ? '' : 'rotate-180'}`}
                                                                fill="currentColor"
                                                                strokeWidth={0}
                                                            />
                                                            <span className={`text-sm font-bold tabular-nums ${trendColor}`}>
                                                                {Math.abs(delta)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-400 tracking-wide whitespace-nowrap">tổng điểm</p>
                                        </div>
                                    )}
                                </button>
                            </AnimatedRow>
                        );
                    })}
                </div>
            )}

            {selectedMember && (
                <RankDetailModal member={selectedMember} onClose={() => setSelectedMember(null)} />
            )}

            {showInfo && <RankInfoModal onClose={() => setShowInfo(false)} />}
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useAuthStore();
    const [tab, setTab] = useState<Tab>('rank');
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [winRateData, setWinRateData] = useState<any[]>([]);
    const [rankData, setRankData] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
        setTab(newTab);
    };

    const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'rank', label: 'Rank', icon: '💎' },
        { key: 'winrate', label: 'Winrate', icon: '⚔️' },
        {
            key: 'leaderboard', label: 'Chuyên cần',
            icon: <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" className="w-4 h-4 object-contain" style={{ mixBlendMode: 'screen' }} />
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1
                    className="text-xl font-bold text-dark flex items-center gap-2"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.8)" }}
                >
                    <Trophy className="w-5 h-5 text-yellow-600" /> Bảng xếp hạng
                </h1>
                <button onClick={fetchAll} className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex border border-gray-200 rounded-xl bg-white p-1 gap-1">
                {TABS.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => handleTabChange(key)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-1 ${tab === key
                            ? 'bg-blue-600 text-white shadow-sm scale-[1.02]'
                            : 'bg-white text-black hover:bg-gray-50'
                            }`}
                    >
                        {typeof icon === 'string' ? icon : icon} {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <SkeletonRows count={6} />
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
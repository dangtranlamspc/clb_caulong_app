'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    CalendarDays, Trophy, ClipboardList, ChevronRight,
    MapPin, Users, CheckCircle2, Hourglass, AlertCircle,
    TrendingUp, Zap, Gift,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { profileApi, rankingsApi, registrationsApi, sessionsApi, usersApi } from '@/lib/api';

const LEVEL_CFG_VI: Record<string, { emoji: string; cls: string }> = {
    'Cố định (tháng)': { emoji: '🏆', cls: 'text-purple-700' },
    'Vãng lai cố định': { emoji: '🥇', cls: 'text-blue-700' },
    'Vãng lai lâu lâu': { emoji: '🥈', cls: 'text-cyan-700' },
    'Vãng lai lần đầu': { emoji: '🥉', cls: 'text-green-700' },
    'Chưa có level': { emoji: '🎯', cls: 'text-gray-500' },
};

const REG_CFG: Record<string, { label: string; icon: any; cls: string; bg: string }> = {
    pending: { label: 'Chờ xác nhận', icon: Hourglass, cls: 'text-amber-600', bg: 'bg-amber-50' },
    confirmed: { label: 'Đã xác nhận', icon: CheckCircle2, cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    rejected: { label: 'Từ chối', icon: AlertCircle, cls: 'text-red-500', bg: 'bg-red-50' },
};

export default function HomePage() {
    const { user, setUser } = useAuthStore();
    const [upcoming, setUpcoming] = useState<any[]>([]);
    const [myRegs, setMyRegs] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>(null);
    const [birthdays, setBirthdays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            sessionsApi.list({ status: 'open', limit: 3 }),
            registrationsApi.getMyRegistrations({ limit: 3 }),
            rankingsApi.myStats(),
            usersApi.birthdaysThisMonth(),
            profileApi.getMe(),
        ]).then(([s, r, st, bd, me]) => {
            setUpcoming(s.data.data ?? []);
            setMyRegs(r.data.data ?? []);
            setMyStats(st.data);
            setBirthdays(bd.data ?? []);
            setUser(me.data);
        }).finally(() => setLoading(false));
    }, []);

    const levelCfg = LEVEL_CFG_VI[myStats?.level] ?? { emoji: '🎯', cls: 'text-gray-500' };

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Chào buổi sáng';
        if (h < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
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
                                <h2 className="text-white text-xl font-black mt-0.5">{user?.full_name} 👋</h2>
                            </div>
                        </div>

                        <div className="flex items-stretch gap-2.5 mt-4">
                            {loading ? (
                                <div className="h-14 flex-1 bg-white/10 rounded-2xl animate-pulse" />
                            ) : (
                                <>
                                    <div className="bg-white/15 rounded-2xl px-3 py-2 flex items-center gap-2 flex-1">
                                        <span className="text-2xl">{levelCfg.emoji}</span>
                                        <div>
                                            <p className="text-white/60 text-[10px] leading-none">Level</p>
                                            <p className="text-white text-xs font-bold mt-0.5 leading-tight">
                                                {myStats?.level ?? 'Chưa có level'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                                        <p className="text-white/60 text-[10px] leading-none">Cầu lông</p>
                                        <p className="text-white font-black text-xl mt-0.5 flex items-center justify-center gap-1.5 w-full">
                                            {myStats?.badminton?.total_points ?? 0}
                                            <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="cầu lông" className="w-6 h-6 object-contain" style={{ mixBlendMode: 'screen' }} />
                                        </p>
                                    </div>
                                    <div className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                                        <p className="text-white/60 text-[10px] leading-none">Tháng này</p>
                                        <p className="text-white font-black text-xl mt-0.5">{myStats?.sessions_this_month ?? 0}</p>
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
                        { href: '/activity', icon: CalendarDays, label: 'Hoạt động', bg: 'bg-blue-50', ic: 'text-blue-600', ring: 'ring-blue-100' },
                        { href: '/history', icon: ClipboardList, label: 'Lịch sử\ncủa tôi', bg: 'bg-amber-50', ic: 'text-amber-600', ring: 'ring-amber-100' },
                        { href: '/leaderboard', icon: Trophy, label: 'Bảng\nxếp hạng', bg: 'bg-purple-50', ic: 'text-purple-600', ring: 'ring-purple-100' },
                    ].map(({ href, icon: Icon, label, bg, ic, ring }) => (
                        <Link key={href} href={href}>
                            <div className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-2 text-center active:scale-95 transition-transform`}>
                                <div className={`w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm ring-1 ${ring}`}>
                                    <Icon className={`w-5 h-5 ${ic}`} />
                                </div>
                                <p className="text-xs font-semibold text-gray-700 leading-tight whitespace-pre-line">{label}</p>
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
                                        background: 'linear-gradient(135deg, #f857a6, #ec4899)',
                                        boxShadow: '0 2px 8px rgba(248,87,166,0.35)',
                                        animation: 'cakeWiggle 2.5s ease-in-out infinite',
                                    }}
                                >
                                    🎂
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm">
                                    Sinh nhật tháng {currentMonth + 1}
                                </h3>
                            </div>
                            <span
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                style={{ background: '#fce7f3', color: '#be185d' }}
                            >
                                {birthdays.length} người
                            </span>
                        </div>

                        {/* Cards grid — 4 per row, scrollable */}
                        <div className="grid grid-cols-4 gap-2">
                            {birthdays.map((m, idx) => {
                                const dob = new Date(m.date_of_birth);
                                const day = dob.getDate();
                                const isToday = dob.getDate() === currentDay && dob.getMonth() === currentMonth;
                                const isUpcoming = !isToday && Math.abs(day - currentDay) <= 4 && day >= currentDay;
                                const initials = m.full_name?.split(' ').slice(-2).map((w: string) => w[0]).join('').toUpperCase() ?? '?';
                                const firstName = m.full_name?.split(' ').pop() ?? m.full_name;

                                return (
                                    <div
                                        key={m.id}
                                        className="flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl relative overflow-hidden"
                                        style={{
                                            ...(isToday ? {
                                                background: 'linear-gradient(160deg, #fff0f8, #fce7f3)',
                                                border: '1.5px solid #f9a8d4',
                                                boxShadow: '0 4px 16px rgba(248,87,166,0.18)',
                                                animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both, todayPulse 3s ease-in-out 0.5s infinite`,
                                            } : isUpcoming ? {
                                                background: 'linear-gradient(160deg, #fff7ed, #ffedd5)',
                                                border: '1px solid #fed7aa',
                                                animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
                                            } : {
                                                background: 'white',
                                                border: '1px solid #f3f4f6',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                animation: `cardIn 0.4s cubic-bezier(.34,1.56,.64,1) ${idx * 0.07}s both`,
                                            }),
                                        }}
                                    >
                                        {/* "Hôm nay" label */}
                                        {isToday && (
                                            <span
                                                className="absolute top-1.5 right-1.5 text-[7px] font-black px-1.5 py-0.5 rounded-full text-white uppercase tracking-wide"
                                                style={{ background: 'linear-gradient(135deg, #f857a6, #ec4899)' }}
                                            >
                                                Hôm nay
                                            </span>
                                        )}

                                        {/* Avatar */}
                                        <div
                                            className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm relative overflow-hidden"
                                            style={isToday ? {
                                                background: m.avatar_url ? 'transparent' : 'linear-gradient(135deg, #f857a6, #ec4899)',
                                                color: 'white',
                                                fontSize: '18px',
                                                boxShadow: '0 3px 10px rgba(248,87,166,0.45)',
                                            } : isUpcoming ? {
                                                background: m.avatar_url ? 'transparent' : 'linear-gradient(135deg, #fed7aa, #fdba74)',
                                                color: '#9a3412',
                                            } : {
                                                background: m.avatar_url ? 'transparent' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                                                color: '#1d4ed8',
                                            }}
                                        >
                                            {m.avatar_url ? (
                                                <img
                                                    src={m.avatar_url}
                                                    alt={m.full_name}
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : isToday ? '🎂' : initials}

                                            {/* Pulse ring for today */}
                                            {isToday && (
                                                <span
                                                    className="absolute inset-0 rounded-full border-2 border-pink-400"
                                                    style={{ animation: 'ringOut 1.8s ease-out infinite' }}
                                                />
                                            )}
                                        </div>

                                        {/* Name */}
                                        <p
                                            className="text-[10px] font-bold text-center leading-tight w-full px-0.5 truncate"
                                            style={{ color: isToday ? '#9d174d' : '#374151' }}
                                        >
                                            {firstName}
                                        </p>

                                        {/* Date badge */}
                                        <span
                                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                                            style={isToday ? {
                                                background: 'linear-gradient(135deg, #f857a6, #ec4899)',
                                                color: 'white',
                                            } : isUpcoming ? {
                                                background: '#fed7aa',
                                                color: '#9a3412',
                                            } : {
                                                background: '#f3f4f6',
                                                color: '#6b7280',
                                            }}
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
                                from { opacity: 0; transform: scale(0.75) translateY(10px); }
                                to { opacity: 1; transform: scale(1) translateY(0); }
                            }
                            @keyframes todayPulse {
                                0%, 100% { box-shadow: 0 4px 16px rgba(248,87,166,0.18); }
                                50% { box-shadow: 0 6px 24px rgba(248,87,166,0.32); }
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

                {/* Upcoming sessions */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <h3 className="font-bold text-gray-900 text-sm">Buổi đang mở đăng ký</h3>
                        </div>
                        <Link href="/sessions" className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
                            Tất cả <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
                            ))}
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="bg-white rounded-2xl py-10 text-center border border-dashed border-gray-200">
                            <CalendarDays className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-gray-400 text-sm">Chưa có buổi nào đang mở</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map((s) => {
                                const myReg = s.my_registration;
                                const isFull = s.available_slots <= 0;
                                const price = s.price_male && user?.gender === 'male' ? s.price_male
                                    : s.price_female && user?.gender === 'female' ? s.price_female
                                        : s.price_per_slot ?? 0;
                                return (
                                    <Link key={s.id} href={`/sessions/${s.id}`}>
                                        <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-99 ${myReg ? 'border-blue-100' : 'border-transparent'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarDays className="w-3 h-3" />
                                                            {format(new Date(s.scheduled_at), 'EEE dd/MM HH:mm', { locale: vi })}
                                                        </span>
                                                        {s.location && (
                                                            <span className="flex items-center gap-1 max-w-28 truncate">
                                                                <MapPin className="w-3 h-3 flex-shrink-0" />{s.location}
                                                            </span>
                                                        )}
                                                        <span className={`flex items-center gap-1 font-medium ${isFull ? 'text-red-400' : 'text-emerald-500'}`}>
                                                            <Users className="w-3 h-3" />
                                                            {isFull ? 'Hết chỗ' : `Còn ${s.available_slots} chỗ`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                    <span className="font-bold text-blue-600 text-sm">
                                                        {price.toLocaleString('vi-VN')}đ
                                                    </span>
                                                    {myReg ? (
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${myReg.payment_status === 'confirmed'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                            {myReg.payment_status === 'confirmed' ? '✓ Xác nhận' : '⏳ Chờ'}
                                                        </span>
                                                    ) : !isFull ? (
                                                        <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">
                                                            Đăng ký
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Recent registrations */}
                <section className="pb-2">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-500" />
                            <h3 className="font-bold text-gray-900 text-sm">Đăng ký gần đây</h3>
                        </div>
                        <Link href="/history" className="text-xs text-blue-600 font-semibold flex items-center gap-0.5">
                            Tất cả <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
                            ))}
                        </div>
                    ) : myRegs.length === 0 ? (
                        <div className="bg-white rounded-2xl py-10 text-center border border-dashed border-gray-200">
                            <ClipboardList className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-gray-400 text-sm">Chưa có đăng ký nào</p>
                            <Link href="/sessions" className="inline-block mt-2 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">
                                Đăng ký buổi đầu tiên
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {myRegs.map((reg) => {
                                const cfg = REG_CFG[reg.payment_status] ?? REG_CFG.pending;
                                const Icon = cfg.icon;
                                const sess = reg.sessions;
                                return (
                                    <Link key={reg.id} href={`/sessions/${sess?.id}`}>
                                        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm flex items-center gap-3 active:scale-[0.99] transition-transform">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                                <Icon className={`w-4 h-4 ${cfg.cls}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{sess?.title ?? 'Buổi đánh'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                                                    {reg.points_awarded && (
                                                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                            +1 <img src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png" alt="cầu lông" className="w-5 h-5 object-contain" style={{ mixBlendMode: 'multiply' }} />
                                                        </span>
                                                    )}
                                                    {reg.payment_status === 'pending' && !reg.payment_reference && (
                                                        <span className="text-[10px] text-orange-500 font-medium">Chưa gửi mã</span>
                                                    )}
                                                </div>
                                            </div>
                                            {sess?.scheduled_at && (
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-xs font-semibold text-gray-500">
                                                        {format(new Date(sess.scheduled_at), 'dd/MM', { locale: vi })}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {format(new Date(sess.scheduled_at), 'HH:mm', { locale: vi })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../lib/api';
import { BirthdayModal, useBirthdayGreeting } from '../../components/BirthdayModal';
import { MatchResultModal } from '../../components/MatchResultModal';
import { ChallengeModal } from '../../components/ChallengeModal';
import { useMatchResultNotification } from '../../hooks/useMatchResultNotification';
import { useChallengeNotification } from '../../hooks/useChallengeNotification';
import toast from 'react-hot-toast';
import { Home, CalendarDays, ClipboardList, Trophy, UserCircle2, LogOut, BadgePercent } from 'lucide-react';
import { useTeamInviteNotification } from '@/hooks/useTeamInviteNotification';
import { TeamInviteModal } from '@/components/TeamInviteModal';

const NAV_ITEMS = [
    { href: '/home', icon: Home, label: 'Trang chủ' },
    { href: '/activity', icon: CalendarDays, label: 'Hoạt động' },
    { href: '/cost', icon: BadgePercent, label: 'Chi phí' },
    { href: '/leaderboard', icon: Trophy, label: 'Xếp hạng' },
    { href: '/profile', icon: UserCircle2, label: 'Hồ sơ' },
];

function BadmintonLogo({ size = 26 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <defs>
                <linearGradient id="racket-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
            </defs>
            <ellipse cx="8.5" cy="8.5" rx="6" ry="7.5" transform="rotate(-35 8.5 8.5)" stroke="url(#racket-grad)" strokeWidth="2" fill="none" />
            <line x1="5" y1="7" x2="13" y2="4" stroke="rgba(96,165,250,0.5)" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="4" y1="10" x2="13" y2="7" stroke="rgba(96,165,250,0.5)" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="13" y1="13" x2="21" y2="21" stroke="url(#racket-grad)" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="21.5" cy="21.5" r="1.8" fill="#34d399" />
        </svg>
    );
}


function UserAvatar({ fullName, avatarUrl }: { fullName?: string; avatarUrl?: string | null }) {
    const initials = fullName
        ? fullName.trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase()
        : '?';

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={fullName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}
            />
        );
    }

    return (
        <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)', border: '1.5px solid rgba(255,255,255,0.25)' }}
        >
            {initials}
        </div>
    );
}


function BottomNav({ pathname }: { pathname: string }) {
    const [scrolling, setScrolling] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolling(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setScrolling(false), 800);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 px-6 pointer-events-none">
            <div
                className="pointer-events-auto flex items-center gap-0.5 rounded-full shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(15,25,50,0.82) 0%, rgba(10,15,35,0.88) 50%, rgba(20,10,40,0.82) 100%)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)',
                    padding: scrolling ? '5px 18px' : '8px 20px',
                    transition: 'padding 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive = href === '/profile'
                        ? pathname === '/profile'
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            title={label}
                            className="relative flex items-center justify-center"
                            style={{
                                width: scrolling ? 48 : 58,
                                height: scrolling ? 36 : 44,
                                transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                            }}
                        >
                            <div
                                className="flex items-center justify-center"
                                style={{
                                    width: isActive ? (scrolling ? 44 : 54) : (scrolling ? 32 : 38),
                                    height: isActive ? (scrolling ? 30 : 36) : (scrolling ? 28 : 34),
                                    borderRadius: isActive ? 999 : '50%',
                                    background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.06)',
                                    boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                }}
                            >
                                <Icon
                                    style={{
                                        width: scrolling ? 18 : 22,
                                        height: scrolling ? 18 : 22,
                                        color: isActive ? '#111' : 'rgba(255,255,255,0.8)',
                                        strokeWidth: isActive ? 2.2 : 1.8,
                                        transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                    }}
                                />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout, user } = useAuthStore();
    const [mounted, setMounted] = useState(false);

    const { show: showBirthday, close: closeBirthday } = useBirthdayGreeting(user ?? null);

    const { current: matchResult, dismiss: dismissResult } = useMatchResultNotification();

    const { current: teamInvite, dismiss: dismissTeamInvite } = useTeamInviteNotification();

    const {
        current: challenge,
        handleAccept,
        handleReject,
        dismiss: dismissChallenge,
    } = useChallengeNotification();

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && !isAuthenticated) router.replace('/auth/login');
    }, [mounted, isAuthenticated, router]);

    const handleLogout = async () => {
        try { await authApi.logout(); } catch { }
        logout();
        toast.success('Đã đăng xuất');
        router.push('/auth/login');
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const firstName = user?.full_name?.split(' ').pop() ?? user?.full_name;

    return (
        <div className="min-h-screen bg-[#F4F6FA] pb-24">

            <BirthdayModal
                userName={user?.full_name ?? ''}
                show={showBirthday}
                onClose={closeBirthday}
            />
            {challenge && !matchResult && (
                <ChallengeModal
                    challenge={challenge}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onClose={dismissChallenge}
                />
            )}

            {teamInvite && !challenge && !matchResult && (
                <TeamInviteModal
                    invite={teamInvite}
                    onClose={dismissTeamInvite}
                />
            )}

            {matchResult && (
                <MatchResultModal
                    result={matchResult}
                    onClose={dismissResult}
                />
            )}

            <header
                className="sticky top-0 z-30 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 40%, #1a1035 100%)' }}
            >
                <div aria-hidden="true" style={{ position: 'absolute', top: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%)', pointerEvents: 'none' }} />
                <div aria-hidden="true" style={{ position: 'absolute', top: -10, right: 30, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)', pointerEvents: 'none' }} />
                <div aria-hidden="true" style={{ position: 'absolute', bottom: -20, right: -10, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.3), transparent 70%)', pointerEvents: 'none' }} />

                <div
                    className="relative max-w-lg mx-auto px-4 flex items-center justify-between"
                    style={{ height: 64, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.07)', borderBottom: '0.5px solid rgba(255,255,255,0.12)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                        >
                            <BadmintonLogo size={26} />
                        </div>
                        <div>
                            <p className="font-bold text-white leading-none" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>
                                CLB Cầu Lông
                            </p>
                            <span
                                className="inline-flex items-center gap-1 font-semibold"
                                style={{ marginTop: 4, padding: '2px 8px', fontSize: 9, borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}
                            >
                                🏸 Mùa giải {new Date().getFullYear()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                            <p className="font-semibold leading-tight" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                                {firstName}
                            </p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                                {user?.role === 'admin' ? '⭐ Quản trị viên' : 'Thành viên'}
                            </p>
                        </div>
                        <UserAvatar fullName={user?.full_name} avatarUrl={user?.avatar_url} />
                        <button
                            onClick={handleLogout}
                            title="Đăng xuất"
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(239,68,68,0.2)'; el.style.borderColor = 'rgba(239,68,68,0.35)'; el.style.color = '#fca5a5'; }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.07)'; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.color = 'rgba(255,255,255,0.4)'; }}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-5">
                {children}
            </main>

            {/* ── Bottom nav ── */}
            <BottomNav pathname={pathname} />
        </div>
    );
}
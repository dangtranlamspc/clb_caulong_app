'use client';
import { useEffect, useState } from 'react';
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
        <img
            src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782199056/icon_home-fn_z1thtm.png"
            width={size}
            height={size}
            alt="BNB Badminton Club"
            style={{ objectFit: 'contain' }}
        />
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
    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{
                background: '#ffffff',
                borderTop: '1px solid #e5e7eb',
                boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
            }}
        >
            <div className="max-w-lg mx-auto flex items-stretch">
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive = href === '/profile'
                        ? pathname === '/profile'
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
                            style={{ minHeight: 56 }}
                        >
                            <div
                                className="flex items-center justify-center rounded-xl transition-all"
                                style={{
                                    width: 36,
                                    height: 28,
                                    background: isActive ? 'rgba(30,58,95,0.1)' : 'transparent',
                                }}
                            >
                                <Icon
                                    style={{
                                        width: 20,
                                        height: 20,
                                        color: isActive ? '#0e56b5' : '#9ca3af',
                                        strokeWidth: isActive ? 2.2 : 1.8,
                                        transition: 'color 0.2s',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? '#0e56b5' : '#9ca3af',
                                    transition: 'color 0.2s',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                {label}
                            </span>
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
                    key={matchResult.matchId}
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
                        <div className="flex-shrink-0 pt-3  ">
                            <BadmintonLogo size={85} />
                        </div>
                        <div>
                            <p className="font-bold text-white leading-none" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>
                                BNB BADMINTON CLUB
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
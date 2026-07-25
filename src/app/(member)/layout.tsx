"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/auth.store";
import { authApi } from "../../lib/api";
import {
    BirthdayModal,
    useBirthdayGreeting,
} from "../../components/modals/BirthdayModal";
import { MatchResultModal } from "../../components/matches/MatchResultModal";
import { ChallengeModal } from "../../components/matches/ChallengeModal";
import { useMatchResultNotification } from "../../hooks/useMatchResultNotification";
import { useChallengeNotification } from "../../hooks/useChallengeNotification";
import {
    Home,
    CalendarDays,
    Trophy,
    UserCircle2,
    LogOut,
    BadgePercent,
    Wallet,
    Menu,
} from "lucide-react";
import { useTeamInviteNotification } from "@/hooks/useTeamInviteNotification";
import { TeamInviteModal } from "@/components/matches/TeamInviteModal";
import { NotificationBell } from "@/components/noti/NotificationBell";
import { useNotificationsRealtimeStore } from "@/store/notifications-realtime.store";
import { AdminMenuDrawer } from "@/components/admin/AdminMenuDrawer";

const NAV_ITEMS = [
    { href: "/home", icon: Home, label: "Trang chủ" },
    { href: "/activity", icon: CalendarDays, label: "Hoạt động" },
    { href: "/wallet", icon: Wallet, label: "Ví" },
    { href: "/cost", icon: BadgePercent, label: "Chi phí" },
    { href: "/leaderboard", icon: Trophy, label: "Xếp hạng" },
    { href: "/profile", icon: UserCircle2, label: "Hồ sơ" },
];

function BadmintonLogo({ size = 26 }: { size?: number }) {
    return (
        <img
            src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494761/LOGO_TEAM_BNB_BLACK_cjhww8.png"
            width={size}
            height={size}
            alt="BNB Badminton Club"
            style={{ objectFit: "contain" }}
        />
    );
}

function UserAvatar({
    fullName,
    avatarUrl,
}: {
    fullName?: string;
    avatarUrl?: string | null;
}) {
    const initials = fullName
        ? fullName
            .trim()
            .split(" ")
            .slice(-2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
        : "?";

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={fullName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                style={{ border: "1.5px solid rgba(255,255,255,0.25)" }}
            />
        );
    }

    return (
        <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
            style={{
                background: "linear-gradient(135deg, #6366f1, #06b6d4)",
                border: "1.5px solid rgba(255,255,255,0.25)",
            }}
        >
            {initials}
        </div>
    );
}

function BottomNav({ pathname }: { pathname: string }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
            <div
                className="w-full max-w-lg flex items-stretch"
                style={{
                    background: "#ffffff",
                    borderTop: "1px solid #e5e7eb",
                    boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
            >
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive =
                        href === "/profile"
                            ? pathname === "/profile"
                            : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors min-w-0"
                            style={{ minHeight: 56 }}
                        >
                            <div
                                className="flex items-center justify-center rounded-xl transition-all"
                                style={{
                                    width: 36,
                                    height: 28,
                                    background: isActive ? "rgba(30,58,95,0.1)" : "transparent",
                                }}
                            >
                                <Icon
                                    style={{
                                        width: 20,
                                        height: 20,
                                        color: isActive ? "#0e56b5" : "#9ca3af",
                                        strokeWidth: isActive ? 2.2 : 1.8,
                                        transition: "color 0.2s",
                                    }}
                                />
                            </div>
                            <span
                                className="whitespace-nowrap"
                                style={{
                                    fontSize: 9.5,
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? "#0e56b5" : "#9ca3af",
                                    transition: "color 0.2s",
                                    letterSpacing: "-0.01em",
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

export default function MemberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, logout, user } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
    const isAdmin = user?.role === "admin";

    useEffect(() => {
        if (!user?.id) return;
        useNotificationsRealtimeStore.getState().connect(user.id);
        return () => {
            useNotificationsRealtimeStore.getState().disconnect();
        };
    }, [user?.id]);

    const { show: showBirthday, close: closeBirthday } = useBirthdayGreeting(
        user ?? null,
    );

    const { current: matchResult, dismiss: dismissResult } =
        useMatchResultNotification();

    const { current: teamInvite, dismiss: dismissTeamInvite } =
        useTeamInviteNotification();

    const {
        current: challenge,
        handleAccept,
        handleReject,
        dismiss: dismissChallenge,
    } = useChallengeNotification();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isAuthenticated) router.replace("/auth/login");
    }, [mounted, isAuthenticated, router]);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } finally {
            useAuthStore.getState().logout();
            window.location.href = "/auth/login";
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const firstName = user?.full_name?.split(" ").pop() ?? user?.full_name;

    return (
        <div
            className="app-shell min-h-screen pb-24">
            <div
                className="fixed inset-0 -z-10"
                style={{ backgroundColor: "#f4f6fa" }}
            />
            <BirthdayModal
                userName={user?.full_name ?? ""}
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
                <TeamInviteModal invite={teamInvite} onClose={dismissTeamInvite} />
            )}

            {matchResult && (
                <MatchResultModal
                    key={matchResult.matchId}
                    result={matchResult}
                    onClose={dismissResult}
                />
            )}
            <header className="sticky top-0 z-30 flex justify-center">
                <div
                    className="relative w-full max-w-lg overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(135deg,#183153 0%,#102744 40%,#10192f 70%,#1a1035 100%)",
                        borderBottomLeftRadius: 24,
                        borderBottomRightRadius: 24,
                    }}
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="aurora-bg"></div>

                        <div className="light-beam beam1"></div>
                        <div className="light-beam beam2"></div>
                        <div className="light-beam beam3"></div>

                        {Array.from({ length: 36 }).map((_, i) => (
                            <span
                                key={i}
                                className={`blob blob-${(i % 6) + 1}`}
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * -8}s`,
                                    animationDuration: `${4 + Math.random() * 4}s`,
                                }}
                            />
                        ))}
                    </div>

                    <style jsx>{`
                @keyframes auroraMove {
                    0% {
                    background-position: 0% 50%;
                    }

                    50% {
                    background-position: 100% 50%;
                    }

                    100% {
                    background-position: 0% 50%;
                    }
                }

                .aurora-bg {
                    position: absolute;
                    inset: -30%;

                    background:
                    radial-gradient(
                        circle at 10% 20%,
                        rgba(59, 130, 246, 0.3),
                        transparent 30%
                    ),
                    radial-gradient(
                        circle at 80% 30%,
                        rgba(6, 182, 212, 0.3),
                        transparent 30%
                    ),
                    radial-gradient(
                        circle at 50% 90%,
                        rgba(139, 92, 246, 0.28),
                        transparent 35%
                    ),
                    linear-gradient(
                        120deg,
                        #183153,
                        #102744,
                        #0d2340,
                        #1b1640,
                        #183153
                    );

                    background-size: 300% 300%;

                    animation: auroraMove 8s linear infinite;
                }

                @keyframes blobMove {
                    0% {
                    transform: translate(0, 0) scale(1) rotate(0);
                    }

                    25% {
                    transform: translate(35px, -20px) scale(1.4) rotate(90deg);
                    }

                    50% {
                    transform: translate(-30px, 35px) scale(0.8) rotate(180deg);
                    }

                    75% {
                    transform: translate(20px, 25px) scale(1.25) rotate(270deg);
                    }

                    100% {
                    transform: translate(0, 0) scale(1) rotate(360deg);
                    }
                }

                @keyframes pulse {
                    0%,
                    100% {
                    opacity: 0.35;
                    filter: blur(28px);
                    }

                    50% {
                    opacity: 0.95;
                    filter: blur(42px);
                    }
                }

                .blob {
                    position: absolute;

                    width: 120px;
                    height: 120px;

                    border-radius: 999px;

                    animation:
                    blobMove linear infinite,
                    pulse ease-in-out infinite;

                    will-change: transform;
                }

                .blob-1 {
                    background: #3b82f6;
                }

                .blob-2 {
                    background: #06b6d4;
                }

                .blob-3 {
                    background: #8b5cf6;
                }

                .blob-4 {
                    background: #60a5fa;
                }

                .blob-5 {
                    background: rgba(255, 255, 255, 0.18);
                }

                .blob-6 {
                    background: #38bdf8;
                }

                @keyframes beam {
                    0% {
                    transform: translateX(-120%) rotate(-15deg);
                    }

                    100% {
                    transform: translateX(180%) rotate(-15deg);
                    }
                }

                .light-beam {
                    position: absolute;

                    width: 220px;
                    height: 320px;

                    background: linear-gradient(
                    to right,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent
                    );

                    filter: blur(18px);

                    animation: beam 5s linear infinite;
                }

                .beam1 {
                    top: -120px;
                    left: -150px;
                }

                .beam2 {
                    top: -80px;

                    animation-delay: -2s;
                }

                .beam3 {
                    bottom: -120px;

                    animation-delay: -4s;
                }
                `}</style>

                    <div
                        className="relative max-w-lg mx-auto px-4 flex items-center justify-between"
                        style={{
                            height: 64,
                            background: "rgba(255,255,255,.02)",
                            borderBottom: "1px solid rgba(255,255,255,.08)",
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            {isAdmin && (
                                <button
                                    onClick={() => setAdminDrawerOpen(true)}
                                    title="Menu quản trị"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                    style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border: "0.5px solid rgba(255,255,255,0.12)",
                                        color: "rgba(255,255,255,0.75)",
                                    }}
                                >
                                    <Menu className="w-4.5 h-4.5" />
                                </button>
                            )}

                            <div className="flex-shrink-0 pt-3">
                                <BadmintonLogo size={85} />
                            </div>
                            <div>
                                <p
                                    className="font-bold text-white leading-none"
                                    style={{ fontSize: 16, letterSpacing: "-0.01em" }}
                                >
                                    BNB BADMINTON CLUB
                                </p>
                                <span
                                    className="inline-flex items-center gap-1 font-semibold"
                                    style={{
                                        marginTop: 4,
                                        padding: "2px 8px",
                                        fontSize: 9,
                                        borderRadius: 20,
                                        background: "rgba(255,255,255,0.08)",
                                        border: "0.5px solid rgba(255,255,255,0.14)",
                                        color: "rgba(255,255,255,0.5)",
                                        letterSpacing: "0.03em",
                                    }}
                                >
                                    🏸 Mùa giải {new Date().getFullYear()}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <NotificationBell />
                            <button
                                onClick={handleLogout}
                                title="Đăng xuất"
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                                style={{
                                    background: "rgba(255,255,255,0.07)",
                                    border: "0.5px solid rgba(255,255,255,0.12)",
                                    color: "rgba(255,255,255,0.4)",
                                }}
                                onMouseEnter={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.background = "rgba(239,68,68,0.2)";
                                    el.style.borderColor = "rgba(239,68,68,0.35)";
                                    el.style.color = "#fca5a5";
                                }}
                                onMouseLeave={(e) => {
                                    const el = e.currentTarget as HTMLElement;
                                    el.style.background = "rgba(255,255,255,0.07)";
                                    el.style.borderColor = "rgba(255,255,255,0.12)";
                                    el.style.color = "rgba(255,255,255,0.4)";
                                }}
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-5">{children}</main>

            {/* ── Bottom nav ── */}
            <BottomNav pathname={pathname} />

            {isAdmin && (
                <AdminMenuDrawer
                    open={adminDrawerOpen}
                    onClose={() => setAdminDrawerOpen(false)}
                />
            )}
        </div>
    );
}

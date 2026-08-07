"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/auth.store";
import { useNavLoadingStore } from "@/store/nav-loading.store";
import { authApi, sessionsApi } from "../../lib/api";
import {
    BirthdayModal,
    useBirthdayGreeting,
} from "../../components/member/modals/BirthdayModal";
import { MatchResultModal } from "../../components/member/matches/MatchResultModal";
import { ChallengeModal } from "../../components/member/matches/ChallengeModal";
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
import { TeamInviteModal } from "@/components/member/matches/TeamInviteModal";
import { NotificationBell } from "@/components/member/noti/NotificationBell";
import { useNotificationsRealtimeStore } from "@/store/notifications-realtime.store";
import { AdminMenuDrawer } from "@/components/admin/AdminMenuDrawer";
import { supabase } from "@/lib/supabase";
import { FeedbackWidget } from "@/components/member/feedback/FeedBackChats";
import { NavLoadingOverlay } from "@/components/common/NavLoadingOverlay";

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
            src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png"
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

function BottomNav({
    pathname,
    showActivityDot,
}: {
    pathname: string;
    showActivityDot: boolean;
}) {
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
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                }}
            >
                {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                    const isActive =
                        href === "/profile"
                            ? pathname === "/profile"
                            : pathname.startsWith(href);
                    const showDot = href === "/activity" && showActivityDot;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors min-w-0 active:opacity-60"
                            style={{ minHeight: 72 }}
                        >
                            <div
                                className="relative flex items-center justify-center rounded-xl transition-all"
                                style={{
                                    width: 40,
                                    height: 32,
                                    background: isActive ? "rgba(30,58,95,0.1)" : "transparent",
                                }}
                            >
                                <Icon
                                    style={{
                                        width: 21,
                                        height: 21,
                                        color: isActive ? "#0e56b5" : "#9ca3af",
                                        strokeWidth: isActive ? 2.2 : 1.8,
                                        transition: "color 0.2s",
                                    }}
                                />
                                {showDot && (
                                    <span
                                        className="absolute flex"
                                        style={{
                                            top: 0,
                                            right: 2,
                                            width: 12,
                                            height: 12,
                                        }}
                                    >
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
                                        />
                                        <span
                                            className="animate-pulse relative inline-flex rounded-full bg-red-500"
                                            style={{
                                                width: 12,
                                                height: 12,
                                                border: "2px solid #ffffff",
                                            }}
                                        />
                                    </span>
                                )}
                            </div>
                            <span
                                className="whitespace-nowrap"
                                style={{
                                    fontSize: 10,
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
    const [showLoading, setShowLoading] = useState(true);
    const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
    const [hasPendingPayment, setHasPendingPayment] = useState(false);
    const pendingSeqRef = useRef(0);
    const pendingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isAdmin = user?.role === "admin";

    const [isPending, startTransition] = useTransition();
    const startNavLoading = useNavLoadingStore((s) => s.start);
    const stopNavLoading = useNavLoadingStore((s) => s.stop);
    const navLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isPending) {
            if (navLoadingTimerRef.current) clearTimeout(navLoadingTimerRef.current);
            navLoadingTimerRef.current = setTimeout(() => {
                stopNavLoading();
            }, 400);
        }
        return () => {
            if (navLoadingTimerRef.current) clearTimeout(navLoadingTimerRef.current);
        };
    }, [isPending]);

    const handleAdminNavigate = (href: string) => {
        startNavLoading();
        startTransition(() => {
            router.push(href);
        });
    };

    const fetchPendingPaymentFlag = async () => {
        const mySeq = ++pendingSeqRef.current;
        try {
            const { data } = await sessionsApi.list({ limit: 50 });
            if (mySeq !== pendingSeqRef.current) return;
            const hasPending = (data.data ?? []).some(
                (s: any) =>
                    s.my_registration?.amount_override > 0 &&
                    s.my_registration?.payment_status === "pending" &&
                    !s.my_registration?.payment_reference,
            );
            setHasPendingPayment(hasPending);
        } catch {
        }
    };

    const schedulePendingFetch = () => {
        if (pendingDebounceRef.current) clearTimeout(pendingDebounceRef.current);
        pendingDebounceRef.current = setTimeout(fetchPendingPaymentFlag, 300);
    };

    useEffect(() => {
        if (!user?.id) return;
        useNotificationsRealtimeStore.getState().connect(user.id);
        return () => {
            useNotificationsRealtimeStore.getState().disconnect();
        };
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        fetchPendingPaymentFlag();

        const channel = supabase
            .channel(`layout-pending-payment:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "registrations" },
                schedulePendingFetch,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "sessions" },
                schedulePendingFetch,
            )
            .subscribe();

        return () => {
            if (pendingDebounceRef.current) clearTimeout(pendingDebounceRef.current);
            supabase.removeChannel(channel);
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
        const timer = setTimeout(() => setShowLoading(false), 900);
        return () => clearTimeout(timer);
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
        return <NavLoadingOverlay fadingOut={false} />;
    }

    if (!isAuthenticated) return null;


    return (
        <div className="app-shell min-h-screen pb-24 overflow-x-hidden">
            {showLoading && <NavLoadingOverlay fadingOut={false} />}

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

            <FeedbackWidget />

            <BottomNav pathname={pathname} showActivityDot={hasPendingPayment} />

            {isAdmin && (
                <AdminMenuDrawer
                    open={adminDrawerOpen}
                    onClose={() => setAdminDrawerOpen(false)}
                    onNavigateStart={handleAdminNavigate}
                />
            )}
        </div>
    );
}
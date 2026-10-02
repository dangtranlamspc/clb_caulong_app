"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useNavLoadingStore } from "@/store/nav-loading.store";
import {
    AdminMenuDrawer,
    ADMIN_MENU,
    isAdminMenuActive,
} from "@/components/admin/AdminMenuDrawer";
import { authApi } from "@/lib/api";
import { AdminNotificationBell } from "@/components/admin/notifications/AdminNotificationBell";
import { ThemeSwitch } from "@/components/common/ThemeSwitch";

function BadmintonLogo({ size = 72 }: { size?: number }) {
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

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, logout } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const [isPending, startTransition] = useTransition();
    const startNavLoading = useNavLoadingStore((s) => s.start);
    const stopNavLoading = useNavLoadingStore((s) => s.stop);
    const navLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) {
            router.replace("/auth/login");
            return;
        }
        if (user?.role !== "admin") {
            router.replace("/home");
            return;
        }
    }, [mounted, isAuthenticated, user, router]);

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

    const handleNavigate = (href: string) => {
        startNavLoading();
        startTransition(() => {
            router.push(href);
        });
    };

    if (!mounted || user?.role !== "admin") return null;

    const currentPage = ADMIN_MENU
        .flatMap((item) => {
            if (item.href) return [{ label: item.label, href: item.href }];
            if (item.children) {
                return item.children.map((c) => ({ label: item.label, href: c.href }));
            }
            return [];
        })
        .filter((entry) => isAdminMenuActive(entry.href, pathname ?? ""))
        .sort((a, b) => b.href.length - a.href.length)[0];

    const headerTitle = currentPage?.label ?? "Quản trị";

    return (
        <div className="fixed inset-0 flex flex-col bg-[var(--bg)] overflow-hidden">
            <header className="relative z-30 flex-shrink-0">
                <div
                    className="relative w-full overflow-hidden"
                    style={{
                        background: "var(--header-bg)",
                        borderBottomLeftRadius: 24,
                        borderBottomRightRadius: 24,
                        paddingTop: "env(safe-area-inset-top, 0px)",
                        boxShadow: "var(--shadow)",
                    }}
                >
                    <div
                        className="relative px-4 flex items-center justify-between"
                        style={{
                            height: 64,
                            borderBottom: "1px solid var(--header-border)",
                        }}
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <button
                                onClick={() => setMenuOpen(true)}
                                title="Menu quản trị"
                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                    background: "var(--header-btn-bg)",
                                    border: "0.5px solid var(--header-btn-border)",
                                    color: "var(--header-btn-text)",
                                }}
                            >
                                <Menu className="w-4.5 h-4.5" />
                            </button>

                            <div
                                className="flex-shrink-0 pt-3"
                                style={{ objectFit: "contain", filter: "var(--logo-filter)" }}
                            >
                                <BadmintonLogo size={68} />
                            </div>

                            <div className="min-w-0">
                                <p
                                    className="font-bold leading-none truncate"
                                    style={{
                                        fontSize: 14,
                                        letterSpacing: "-0.01em",
                                        color: "var(--header-text)",
                                    }}
                                >
                                    {headerTitle}
                                </p>
                                <span
                                    className="inline-flex items-center gap-1 font-semibold"
                                    style={{
                                        marginTop: 4,
                                        padding: "2px 8px",
                                        fontSize: 9,
                                        borderRadius: 20,
                                        background: "var(--header-btn-bg)",
                                        border: "0.5px solid var(--header-btn-border)",
                                        color: "var(--header-text-muted)",
                                        letterSpacing: "0.03em",
                                    }}
                                >
                                    🏸 BNB Administration
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <AdminNotificationBell />
                            <ThemeSwitch />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 w-full px-4 lg:px-8 py-5 overflow-y-auto hide-scrollbar">
                {children}
            </main>

            <AdminMenuDrawer
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onNavigateStart={handleNavigate}
            />
        </div >
    );
}
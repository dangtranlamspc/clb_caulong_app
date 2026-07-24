"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  AdminMenuDrawer,
  ADMIN_MENU,
  isAdminMenuActive,
} from "@/components/admin/AdminMenuDrawer";
import { AuroraHeaderBackground } from "@/components/ui/AuroraHeaderBackground";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";

function BadmintonLogo({ size = 72 }: { size?: number }) {
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

  if (!mounted || user?.role !== "admin") return null;

  const currentPage = ADMIN_MENU.filter((item) =>
    isAdminMenuActive(item.href ?? "", pathname ?? ""),
  ).sort((a, b) => (b.href ?? "").length - (a.href ?? "").length)[0];

  const headerTitle = currentPage?.label ?? "Quản trị";


  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      useAuthStore.getState().logout();
      window.location.href = "/auth/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <header className="sticky top-0 z-30 overflow-hidden bg-transparent">
        <AuroraHeaderBackground />

        <div
          className="relative flex items-center justify-between px-4"
          style={{
            height: 64,
            background: "rgba(255,255,255,.04)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            borderBottom: "1px solid rgba(255,255,255,.10)",
          }}
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              title="Menu quản trị"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.10)",
                color: "#fff",
              }}
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            <div className="flex-shrink-0 pt-2">
              <BadmintonLogo size={72} />
            </div>

            <div className="flex flex-col">
              <span
                className="font-bold text-white"
                style={{
                  fontSize: 16,
                  letterSpacing: "-0.01em",
                }}
              >
                {headerTitle}
              </span>

              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.6)",
                }}
              >
                BNB Administration
              </span>
            </div>
          </div>

          {/* Right */}
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.10)",
              color: "rgba(255,255,255,.75)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(239,68,68,.18)";
              el.style.borderColor = "rgba(239,68,68,.35)";
              el.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "rgba(255,255,255,.08)";
              el.style.borderColor = "rgba(255,255,255,.10)";
              el.style.color = "rgba(255,255,255,.75)";
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-5">
        {children}
      </main>

      <AdminMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

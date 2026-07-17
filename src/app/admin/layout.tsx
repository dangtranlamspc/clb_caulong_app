'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { AdminMenuDrawer, ADMIN_MENU, isAdminMenuActive } from '@/components/admin/AdminMenuDrawer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        if (!isAuthenticated) { router.replace('/auth/login'); return; }
        if (user?.role !== 'admin') { router.replace('/home'); return; }
    }, [mounted, isAuthenticated, user, router]);

    if (!mounted || user?.role !== 'admin') return null;

    const currentPage = ADMIN_MENU
        .filter((item) => isAdminMenuActive(item.href ?? '', pathname ?? ''))
        .sort((a, b) => (b.href ?? '').length - (a.href ?? '').length)[0];

    const headerTitle = currentPage?.label ?? 'Quản trị';

    return (
        <div className="min-h-screen bg-[#F4F6FA]">
            <header
                className="sticky top-0 z-30 px-4 flex items-center gap-3"
                style={{ height: 56, background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 40%, #1a1035 100%)' }}
            >
                <button
                    onClick={() => setMenuOpen(true)}
                    title="Menu quản trị"
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                >
                    <Menu className="w-4 h-4" />
                </button>
                <span className="text-white font-bold text-sm">{headerTitle}</span>
            </header>

            <main className="max-w-lg mx-auto px-4 py-5">{children}</main>

            <AdminMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
    );
}
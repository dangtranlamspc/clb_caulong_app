'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    X, Home, LayoutDashboard, Users, CalendarDays, Wallet, Megaphone, ChevronRight, ChevronDown,
    Swords,
    BookOpen,
} from 'lucide-react';

type AdminMenuChild = { href: string; label: string };
type AdminMenuItem = {
    href?: string;
    icon: any;
    label: string;
    desc: string;
    iconBg: string;
    children?: AdminMenuChild[];
};

export const ADMIN_MENU: AdminMenuItem[] = [
    { href: '/home', icon: Home, label: 'Trang chủ', desc: 'Về trang chính của thành viên', iconBg: 'bg-slate-500' },
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Tổng quan số liệu CLB', iconBg: 'bg-blue-500' },
    { href: '/admin/members', icon: Users, label: 'Quản lý thành viên', desc: 'Danh sách, phân loại, VIP', iconBg: 'bg-emerald-500' },
    { href: '/admin/sessions', icon: CalendarDays, label: 'Buổi đánh', desc: 'Lịch, đăng ký, điểm danh', iconBg: 'bg-violet-500' },
    { href: '/admin/matches', icon: Swords, label: 'Trận giao hữu', desc: 'Duyệt kết quả, tính điểm rank', iconBg: 'bg-orange-500' },
    { href: '/admin/rankings', icon: Swords, label: 'BXH', desc: 'Bảng xếp hạng', iconBg: 'bg-orange-500' },
    {
        icon: Wallet,
        label: 'Ví / Tài chính',
        desc: 'Nạp quỹ, thu chi, báo cáo',
        iconBg: 'bg-amber-500',
        children: [
            { href: '/admin/wallet/deposits', label: 'Duyệt nạp tiền' },
            { href: '/admin/wallet/summary', label: 'Tổng hợp' },
            { href: '/admin/wallet/penalties', label: 'Quỹ phạt' },
        ],
    },
    { href: '/admin/events', icon: Megaphone, label: 'Hoạt động', desc: 'Sự kiện, giải đấu, đặt áo', iconBg: 'bg-rose-500' },
    { href: '/admin/handbook', icon: BookOpen, label: 'Sổ tay CLB', desc: 'Quản lý các trang sổ tay', iconBg: 'bg-teal-500' },
    { href: '/admin/feedback', icon: BookOpen, label: 'Feedbacks', desc: 'Feedbacks', iconBg: 'bg-teal-500' },
    { href: '/admin/fund', icon: BookOpen, label: 'Quỹ', desc: 'Quỹ', iconBg: 'bg-teal-500' },
];

const ANIM_MS = 250;

export const isAdminMenuActive = (href: string, pathname: string) =>
    href === '/home' ? pathname === href : pathname === href || pathname.startsWith(href + '/');

const isChildActive = (children: AdminMenuChild[] | undefined, pathname: string) =>
    children?.some((c) => isAdminMenuActive(c.href, pathname)) ?? false;

export function AdminMenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router = useRouter();
    const pathname = usePathname();

    const [mounted, setMounted] = useState(open);
    const [closing, setClosing] = useState(false);
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (open) {
            setMounted(true);
            setClosing(false);
        } else if (mounted) {
            setClosing(true);
            const t = setTimeout(() => {
                setMounted(false);
                setClosing(false);
            }, ANIM_MS);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!mounted) return null;

    const go = (href: string) => {
        onClose();
        router.push(href);
    };

    const isActive = (href: string) => isAdminMenuActive(href, pathname);

    const toggleMenu = (label: string) => {
        setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <div className="fixed inset-0 z-[60]">
            <div
                className={`absolute inset-0 bg-black/50 ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={onClose}
            />
            <div
                className={`absolute top-0 left-0 h-full bg-[#F4F6FA] shadow-2xl overflow-y-auto rounded-r-3xl ${closing ? 'animate-slide-out-left' : 'animate-slide-in-left'
                    }`}
                style={{ width: 'min(85vw, 360px)' }}
            >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-tr-3xl">
                    <h2 className="font-bold text-gray-900 text-sm">⚙️ Khu vực quản trị</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2.5">
                    {ADMIN_MENU.map(({ href, icon: Icon, label, desc, iconBg, children }, idx) => {
                        // ── Mục có con: expand/collapse thay vì điều hướng thẳng ──
                        if (children) {
                            const childActive = isChildActive(children, pathname);
                            const isOpen = openMenus[label] ?? childActive;

                            return (
                                <div key={label}>
                                    <button
                                        onClick={() => toggleMenu(label)}
                                        className={`w-full rounded-2xl p-3.5 flex items-center gap-3 border shadow-sm active:scale-[0.98] transition-colors text-left ${childActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                                            }`}
                                    >
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-sm font-bold ${childActive ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
                                            <p className="text-xs mt-0.5 truncate text-gray-400">{desc}</p>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 flex-shrink-0 text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>

                                    <div
                                        className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                            }`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="mt-1.5 ml-5 pl-4 border-l-2 border-gray-200 space-y-1.5 py-0.5">
                                                {children.map((child) => {
                                                    const active = isActive(child.href);
                                                    return (
                                                        <button
                                                            key={child.href}
                                                            onClick={() => go(child.href)}
                                                            className={`relative w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${active
                                                                ? 'bg-blue-500 text-white font-semibold'
                                                                : 'bg-white border border-gray-100 text-gray-600'
                                                                }`}
                                                        >
                                                            <span className="flex-1">{child.label}</span>
                                                            <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-white/80' : 'text-gray-300'}`} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    {idx === 0 && <div className="h-px bg-gray-200 my-2.5" />}
                                </div>
                            );
                        }

                        // ── Mục thường: link thẳng ──
                        const active = isActive(href!);
                        return (
                            <div key={href}>
                                <button
                                    onClick={() => go(href!)}
                                    className={`w-full rounded-2xl p-3.5 flex items-center gap-3 border shadow-sm active:scale-[0.98] transition-colors text-left ${active
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-white border-gray-100'
                                        }`}
                                >
                                    <div
                                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : iconBg
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-900'}`}>
                                            {label}
                                        </p>
                                        <p
                                            className={`text-xs mt-0.5 truncate ${active ? 'text-white/80' : 'text-gray-400'
                                                }`}
                                        >
                                            {desc}
                                        </p>
                                    </div>
                                    <ChevronRight
                                        className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white/80' : 'text-gray-300'}`}
                                    />
                                </button>
                                {idx === 0 && <div className="h-px bg-gray-200 my-2.5" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                @keyframes slide-in-left {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
                }
                @keyframes slide-out-left {
                from { transform: translateX(0); }
                to { transform: translateX(-100%); }
                }
                .animate-slide-in-left {
                animation: slide-in-left 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
                }
                .animate-slide-out-left {
                animation: slide-out-left 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
                }
                @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
                }
                @keyframes fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
                }
                .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
                }
                .animate-fade-out {
                animation: fade-out 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, Search, User, X } from 'lucide-react';
import { userDrinksAdminApi } from '@/lib/api';

const LIMIT = 10;

type DrinkItem = { drink_id: string; name?: string; quantity: number; image_url?: string | null };
type HolderRow = {
    user_id: string; full_name: string; avatar_url?: string | null; phone?: string | null;
    total_quantity: number; drinks: DrinkItem[];
};

function Avatar({ src, name }: { src?: string | null; name: string }) {
    const [err, setErr] = useState(false);
    return (
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            {src && !err ? (
                <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
            ) : (
                <User className="w-5 h-5 text-[var(--text-muted)]" />
            )}
        </div>
    );
}

export function DrinkHoldersModal({ onClose }: { onClose: () => void }) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<HolderRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    // debounce ô tìm kiếm
    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        userDrinksAdminApi
            .getOverviewMembers({ search: search || undefined, page, limit: LIMIT })
            .then(({ data }) => {
                if (cancelled) return;
                setRows(data?.data ?? []);
                setTotal(data?.meta?.total ?? 0);
            })
            .catch(() => {
                if (cancelled) return;
                setRows([]);
                setTotal(0);
            })
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [search, page]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end sm:items-center sm:justify-center"
            style={{
                background: 'var(--overlay)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-lg bg-[var(--surface)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
                style={{
                    maxHeight: '85vh',
                    transform: visible ? 'translateY(0)' : 'translateY(24px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
                    <div>
                        <p className="text-sm font-bold text-[var(--text)]">Thành viên đang giữ nước</p>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5">{total} thành viên</p>
                    </div>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)]">
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="px-5 pt-3 pb-2 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Tìm theo tên hoặc số điện thoại..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] outline-none focus:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] focus:bg-[var(--surface)] transition-colors"
                        />
                    </div>
                </div>

                <div className="px-5 pb-3 overflow-y-auto flex-1 min-h-[200px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-14 text-[var(--text-faint)] gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-sm text-[var(--text-faint)] text-center py-14">Không có thành viên nào đang giữ nước</p>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {rows.map((m) => (
                                <div key={m.user_id} className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={m.avatar_url} name={m.full_name} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[var(--text)] truncate">{m.full_name}</p>
                                            {m.phone && <p className="text-[11px] text-[var(--text-faint)]">{m.phone}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-base font-bold text-[var(--primary)] tabular-nums">{m.total_quantity}</p>
                                            <p className="text-[10px] text-[var(--text-faint)]">chai</p>
                                        </div>
                                    </div>
                                    {m.drinks?.length > 0 && (
                                        <div className="mt-2 ml-[52px] flex flex-wrap gap-1.5">
                                            {m.drinks.map((d) => (
                                                <span
                                                    key={d.drink_id}
                                                    className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] font-medium"
                                                >
                                                    {d.name ?? 'Nước'} × {d.quantity}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)] disabled:opacity-40 disabled:hover:bg-[var(--surface-hover)]"
                        >
                            <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                        <span className="text-xs text-[var(--text-muted)]">Trang {page} / {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)] disabled:opacity-40 disabled:hover:bg-[var(--surface-hover)]"
                        >
                            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
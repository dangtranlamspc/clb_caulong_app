'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, TrendingDown, TrendingUp, Users, X } from 'lucide-react';
import { sessionsApi } from '@/lib/api';

export function fmt(n: number) {
    const val = n ?? 0;
    if (Math.abs(val) >= 1_000_000)
        return (val / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(val);
}

export function fmtFull(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n ?? 0) + 'đ';
}

function fmtDate(iso: string) {
    const d = new Date(iso);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `${days[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function FeeRow({
    name, amount, note, nested,
}: { name: string; amount: number; note?: string | null; nested?: boolean }) {
    const lines = (note ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
    return (
        <div className={nested ? 'pl-3 border-l-2 border-amber-200' : ''}>
            <div className="flex items-baseline gap-2">
                <span className={`truncate text-sm ${nested ? 'text-gray-700' : 'font-semibold text-gray-800'}`}>
                    {name}
                    {nested && <span className="ml-1.5 text-[11px] font-normal text-gray-400">đi cùng</span>}
                </span>
                <span className="flex-1 min-w-4 border-b border-dotted border-amber-300 -translate-y-[3px]" />
                <span className={`flex-shrink-0 tabular-nums text-sm text-amber-700 ${nested ? 'font-medium' : 'font-semibold'}`}>
                    {fmtFull(amount)}
                </span>
            </div>
            {lines.map((l, i) => (
                <p key={i} className="text-xs text-gray-500 mt-0.5">{l}</p>
            ))}
        </div>
    );
}

/* ───────────── Modal chi tiết ───────────── */
export function SessionCostDetailModal({
    sessionId, onClose,
}: { sessionId: string; onClose: () => void }) {
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        setLoading(true);
        sessionsApi
            .getCostDetail(sessionId)
            .then(({ data }) => setDetail(data))
            .finally(() => setLoading(false));
    }, [sessionId]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    if (typeof document === 'undefined') return null;

    const totalCost = detail?.summary?.total_cost ?? 0;
    const totalPaid = detail?.summary?.total_paid ?? 0;
    const profit = totalPaid - totalCost;
    const isProfit = profit > 0;
    const isBreakEven = profit === 0;
    const tone = isBreakEven
        ? 'text-blue-600 bg-blue-50 border-blue-200'
        : isProfit
            ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
            : 'text-red-500 bg-red-50 border-red-200';

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end sm:items-center sm:justify-center"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
                style={{
                    maxHeight: '85vh',
                    transform: visible ? 'translateY(0)' : 'translateY(24px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">Chi tiết chi phí buổi đánh</p>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : !detail ? (
                        <p className="text-sm text-gray-400 text-center py-8">Không tải được dữ liệu</p>
                    ) : (
                        <>
                            <div>
                                <p className="font-bold text-gray-900">{detail.session.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(detail.session.scheduled_at).toLocaleDateString('vi-VN', {
                                        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                                    })}
                                </p>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-3 space-y-1.5">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Chi phí thực tế</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">🏟 Tiền sân</span>
                                    <span className="font-medium text-gray-700">{fmtFull(detail.chi_phi.court_fee)}</span>
                                </div>
                                {detail.chi_phi.shuttle_count > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">
                                            🏸 Tiền cầu
                                            <span className="text-gray-400 text-xs ml-1">
                                                ({detail.chi_phi.shuttle_count} × {fmtFull(detail.chi_phi.shuttle_price)})
                                            </span>
                                        </span>
                                        <span className="font-medium text-gray-700">{fmtFull(detail.chi_phi.shuttle_cost)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 mt-1">
                                    <span className="font-semibold text-gray-700">Sân + cầu</span>
                                    <span className="font-black text-emerald-600">
                                        {fmtFull(detail.chi_phi.court_fee + detail.chi_phi.shuttle_cost)}
                                    </span>
                                </div>
                            </div>

                            {detail.chi_phi.other_fee > 0 && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 overflow-hidden">
                                    <div className="px-3.5 py-2.5 text-sm font-medium text-gray-600 border-b border-amber-100/70">
                                        💰 Khoản thu khác
                                    </div>
                                    {(detail.chi_phi.other_fee_list ?? []).length > 0 && (
                                        <div className="p-3 space-y-2.5">
                                            {detail.chi_phi.other_fee_list.map((item: any, i: number) => {
                                                const hasGuests = (item.guests?.length ?? 0) > 0;
                                                return (
                                                    <div key={i} className="rounded-xl border border-amber-200/80 bg-white overflow-hidden">
                                                        <div className="px-3 py-2.5 space-y-2">
                                                            <FeeRow name={item.name} amount={item.amount} note={item.note} />
                                                            {item.guests?.map((g: any, gi: number) => (
                                                                <FeeRow key={gi} name={g.name} amount={g.amount} note={g.note} nested />
                                                            ))}
                                                        </div>
                                                        {hasGuests && (
                                                            <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-t border-dashed border-amber-200">
                                                                <span className="text-xs font-medium text-amber-800">Tổng nhóm</span>
                                                                <span className="text-sm font-bold text-amber-800 tabular-nums">
                                                                    {fmtFull(item.total ?? item.amount)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center px-3.5 py-2.5 bg-amber-100/60">
                                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Tổng khoản thu khác</span>
                                        <span className="text-base font-bold text-amber-800 tabular-nums">{fmtFull(detail.chi_phi.other_fee)}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Khoản từng người cần thanh toán ({detail.paid_list?.length ?? 0} người)
                                </p>
                                {!detail.paid_list || detail.paid_list.length === 0 ? (
                                    <div className="rounded-xl border border-gray-100">
                                        <p className="text-sm text-gray-400 text-center py-4">Chưa có ai được chốt thanh toán</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                                            {detail.paid_list.map((p: any) => (
                                                <div key={p.registration_id} className="px-3.5 py-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm font-medium text-gray-800 truncate">
                                                            {p.full_name}
                                                            {p.is_guest && <span className="text-gray-400 text-xs ml-1">(khách)</span>}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                                                            {fmtFull(p.total_amount)}
                                                        </span>
                                                    </div>
                                                    {p.guest_names?.length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                                            <span className="text-[11px] text-gray-400">Gộp cùng</span>
                                                            {p.guest_names.map((n: string, i: number) => (
                                                                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                                                                    {n}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="px-3.5 py-2.5 space-y-1.5 bg-gray-50">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">💰 Tổng chi</span>
                                                    <span className="font-semibold text-gray-700 tabular-nums">{fmtFull(totalCost)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">💵 Tổng thu</span>
                                                    <span className="font-semibold text-gray-700 tabular-nums">{fmtFull(totalPaid)}</span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center justify-between px-3.5 py-3 border-t ${tone}`}>
                                                <span className="text-sm font-semibold flex items-center gap-1.5">
                                                    {isBreakEven ? null : isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                    {isBreakEven ? 'Hòa vốn' : isProfit ? 'Lãi' : 'Lỗ'}
                                                </span>
                                                <span className="text-base font-black tabular-nums">
                                                    {isProfit ? '+' : ''}{fmtFull(profit)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* ───────────── Card 1 buổi ───────────── */
export function SessionCostCard({ item, onClick }: { item: any; onClick: () => void }) {
    const { session, participants, chi_phi } = item;
    const isProfit = chi_phi.profit > 0;
    const isBreakEven = chi_phi.profit === 0;
    const border = isBreakEven ? 'border-blue-300' : isProfit ? 'border-emerald-300' : 'border-red-300';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left bg-white rounded-2xl overflow-hidden border-2 ${border} shadow-sm hover:shadow-md active:scale-[0.99] transition-all`}
        >
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{fmtDate(session.scheduled_at)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {participants.total} người · ♂ {participants.male_count} · ♀ {participants.female_count}
                    </p>
                </div>
                {!isBreakEven && (
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isProfit ? 'Lãi +' : 'Lỗ '}{fmt(chi_phi.profit)}
                    </span>
                )}
            </div>

            <div className="mx-4 mb-3 rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">🏟 Sân</span>
                    <span className="font-medium text-gray-700">{fmtFull(chi_phi.court_fee)}</span>
                </div>
                {chi_phi.shuttle_count > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                            🏸 Cầu <span className="text-gray-400 text-xs ml-1">{chi_phi.shuttle_count} × {fmt(chi_phi.shuttle_price)}</span>
                        </span>
                        <span className="font-medium text-gray-700">{fmtFull(chi_phi.shuttle_cost)}</span>
                    </div>
                )}
                {chi_phi.other_fee > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">📌 Khoản khác</span>
                        <span className="font-medium text-amber-600">{fmtFull(chi_phi.other_fee)}</span>
                    </div>
                )}
                <div className="pt-1.5 border-t border-gray-200 mt-1 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tổng chi</span>
                        <span className="font-semibold text-gray-700">{fmtFull(chi_phi.total_cost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tổng thu</span>
                        <span className={`font-semibold ${isBreakEven ? 'text-blue-600' : isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fmtFull(chi_phi.total_paid)}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}
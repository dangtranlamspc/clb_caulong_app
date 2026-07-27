"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Users, X, CalendarDays, ArrowDownToLine, ShoppingCart, PlusCircle, RotateCcw, Wallet, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { registrationsAdminApi } from '@/lib/api';

function fmt(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

const TX_TYPE_LABEL: Record<string, string> = {
    topup: 'Nạp tiền',
    session_payment: 'Thanh toán buổi đánh',
    manual_expense: 'Chi tiêu khác (admin ghi nhận)',
    manual_credit: 'Cộng tiền khác (admin ghi nhận)',
    refund: 'Hoàn tiền',
};

function txIcon(tx: any) {
    switch (tx.type) {
        case 'topup': return { Icon: ArrowDownToLine, cls: 'bg-emerald-50 text-emerald-600' };
        case 'session_payment': return { Icon: CalendarDays, cls: 'bg-red-50 text-red-500' };
        case 'manual_expense': return { Icon: ShoppingCart, cls: 'bg-amber-50 text-amber-600' };
        case 'manual_credit': return { Icon: PlusCircle, cls: 'bg-emerald-50 text-emerald-600' };
        case 'refund': return { Icon: RotateCcw, cls: 'bg-blue-50 text-blue-600' };
        default: return { Icon: Wallet, cls: 'bg-gray-50 text-gray-500' };
    }
}

export default function AdminTransactionDetailModal({ tx, onClose, transactions = [], }: { tx: any; onClose: () => void; transactions?: any[] }) {
    const isPositive = tx.amount > 0;
    const { Icon, cls } = txIcon(tx);

    const [detail, setDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [visible, setVisible] = useState(false);

    const isSessionPayment =
        tx.type === 'session_payment' && tx.reference_type === 'registration' && tx.reference_id;

    const hasSnapshot = isSessionPayment && Boolean(tx.metadata);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        if (!isSessionPayment) return;
        let ignore = false;
        setLoadingDetail(true);
        registrationsAdminApi.getAdminDetail(tx.reference_id)
            .then(({ data }: any) => { if (!ignore) setDetail(data); })
            .catch(() => { if (!ignore) setDetail(null); })
            .finally(() => { if (!ignore) setLoadingDetail(false); });
        return () => { ignore = true; };
    }, [tx.reference_id]);

    const reg = detail?.registration;
    const liveGuests = detail?.grouped_guests ?? [];

    const isRefunded = isSessionPayment && transactions.some((t: any) =>
        t.type === 'refund' &&
        new Date(t.created_at).getTime() > new Date(tx.created_at).getTime() &&
        typeof t.description === 'string' && tx.title && t.description.includes(tx.title)
    );

    const isReversed =
        isSessionPayment && (isRefunded || (!loadingDetail && (!reg || reg.payment_status !== 'confirmed')));

    const sessionStatus = reg?.sessions?.status;
    const isSessionCancelled = sessionStatus === 'cancelled';

    const isLoadingSessionDetail = isSessionPayment && loadingDetail;

    const displaySessionTitle = hasSnapshot ? tx.metadata.session_title : reg?.sessions?.title;
    const displayBase = hasSnapshot ? (tx.metadata.base_amount ?? 0) : (reg?.base_amount ?? 0);
    const displayOtherFee = hasSnapshot ? (tx.metadata.other_fee_amount ?? 0) : (reg?.other_fee_amount ?? 0);
    const displayOtherFeeNote = hasSnapshot ? tx.metadata.other_fee_note : reg?.other_fee_note;
    const displayGuests = hasSnapshot ? (tx.metadata.guests ?? []) : liveGuests;
    const displayTotal = hasSnapshot
        ? (tx.metadata.total_amount ?? 0)
        : displayBase +
        displayOtherFee +
        liveGuests.reduce(
            (s: number, g: any) => s + (g.base_amount ?? 0) + (g.other_fee_amount ?? 0),
            0,
        );

    const nameOf = (g: any) =>
        hasSnapshot ? g.name : (g.is_guest ? g.guest_full_name : g.users?.full_name);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
            }}
            onClick={e => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                style={{
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out',
                }}
                onClick={e => e.stopPropagation()}
            >
                <style jsx>{`
                    .hide-scrollbar {
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">Chi tiết giao dịch</p>
                    <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="relative flex-1 min-h-0">
                    <div className={`px-5 py-5 space-y-5 overflow-y-auto hide-scrollbar h-full ${isReversed ? 'blur-[1px] select-none pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cls}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <p className={`text-2xl font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{fmt(tx.amount)}
                            </p>
                            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                                {TX_TYPE_LABEL[tx.type] ?? tx.type}
                            </span>
                        </div>

                        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-gray-400">Tiêu đề</span>
                                <span className="font-semibold text-gray-900 text-right">{tx.title}</span>
                            </div>
                            {tx.description && (
                                <div className="px-4 py-3 text-sm">
                                    <p className="text-gray-400 mb-1">Diễn giải</p>
                                    <p className="text-gray-700">{tx.description}</p>
                                </div>
                            )}
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-gray-400">Thời gian</span>
                                <span className="font-medium text-gray-700">
                                    {format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi })}
                                </span>
                            </div>
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-gray-400">Số dư sau giao dịch</span>
                                <span className="font-bold text-gray-900">{fmt(tx.balance_after)}</span>
                            </div>
                        </div>

                        {isSessionPayment && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    Chi tiết khoản thanh toán
                                </p>

                                {isLoadingSessionDetail ? (
                                    <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                        {displaySessionTitle && (
                                            <div className="flex justify-between px-4 py-2.5 text-sm bg-blue-50/50">
                                                <span className="text-gray-500">Buổi đánh</span>
                                                <span className="font-semibold text-blue-700 text-right">{displaySessionTitle}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between px-4 py-2.5 text-sm">
                                            <span className="text-gray-500">Tiền sân + cầu của người này</span>
                                            <span className="font-medium text-gray-800">{fmt(displayBase)}</span>
                                        </div>

                                        {displayOtherFee > 0 ? (
                                            <div className="px-4 py-2.5 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Khoản khác</span>
                                                    <span className="font-medium text-amber-600">{fmt(displayOtherFee)}</span>
                                                </div>
                                                {displayOtherFeeNote && (
                                                    <p className="text-xs text-gray-400 italic mt-0.5">{displayOtherFeeNote}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between px-4 py-2.5 text-sm">
                                                <span className="text-gray-400">Khoản khác</span>
                                                <span className="text-gray-400">Không có</span>
                                            </div>
                                        )}

                                        {displayGuests.length > 0 ? (
                                            <div className="px-4 py-2.5">
                                                <p className="text-xs text-purple-600 font-medium mb-1.5 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> Gộp thanh toán cùng {displayGuests.length} khách
                                                </p>
                                                {displayGuests.map((g: any, idx: number) => {
                                                    const gName = nameOf(g);
                                                    const gBase = g.base_amount ?? 0;
                                                    const gOtherFee = g.other_fee_amount ?? 0;
                                                    const gTotal = gBase + gOtherFee;

                                                    return (
                                                        <div key={g.id ?? idx} className="py-1.5 border-t border-gray-50 first:border-t-0">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">+ {gName}</span>
                                                                <span className="font-medium text-gray-700">{fmt(gTotal)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-400 mt-0.5 pl-3">
                                                                <span>Tiền sân + cầu</span>
                                                                <span>{fmt(gBase)}</span>
                                                            </div>
                                                            {gOtherFee > 0 && (
                                                                <div className="flex justify-between text-xs mt-0.5 pl-3">
                                                                    <span className="text-amber-500">Khoản khác</span>
                                                                    <div className="text-right">
                                                                        <span className="text-amber-600 font-medium">{fmt(gOtherFee)}</span>
                                                                        {g.other_fee_note && (
                                                                            <p className="text-gray-400 italic">{g.other_fee_note}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between px-4 py-2.5 text-sm">
                                                <span className="text-gray-400">Gộp với khách</span>
                                                <span className="text-gray-400">Không, thanh toán riêng</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between px-4 py-3 text-sm bg-gray-50">
                                            <span className="font-semibold text-gray-700">Tổng đã trả</span>
                                            <span className="font-bold text-gray-900">{fmt(displayTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isReversed && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-white/70">
                            <Ban className="w-6 h-6 text-gray-400" />
                            <p className="text-base font-bold text-gray-600 text-center px-6">
                                {isSessionCancelled ? 'Buổi đánh đã bị hủy' : 'Hóa đơn đã được hoàn tác'}
                            </p>
                            <p className="text-sm font-semibold text-emerald-600">
                                Đã hoàn tiền
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Users, X, CalendarDays, ArrowDownToLine, ShoppingCart, PlusCircle, RotateCcw, Wallet, Ban, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { eventsAdminApi, registrationsAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';

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

    const isShirtOrder =
        tx.reference_type === 'shirt_order_registration' && tx.reference_id;

    const hasSnapshot = isSessionPayment && Boolean(tx.metadata);

    const shirtOrderLabel = isShirtOrder
        ? tx.amount > 0
            ? 'Hoàn tiền đặt áo'
            : 'Thanh toán đặt áo'
        : null;

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    useEffect(() => {
        const shouldFetch = isSessionPayment || isShirtOrder;
        if (!shouldFetch) return;
        let ignore = false;
        setLoadingDetail(true);

        const request = isShirtOrder
            ? (isShirtOrderBatch
                ? eventsAdminApi.getShirtOrderRegistrationsDetailBatch(shirtOrderRegIds)
                : eventsAdminApi.getShirtOrderRegistrationDetail(tx.reference_id))
            : registrationsAdminApi.getAdminDetail(tx.reference_id);

        request
            .then(({ data }: any) => { if (!ignore) setDetail(data); })
            .catch(() => { if (!ignore) setDetail(null); })
            .finally(() => { if (!ignore) setLoadingDetail(false); });
        return () => { ignore = true; };
    }, [tx.reference_id]);

    const reg = detail?.registration;
    const liveGuests = detail?.grouped_guests ?? [];
    const shirtOrderRegIds: string[] = isShirtOrder
        ? (tx.metadata?.registration_ids?.length ? tx.metadata.registration_ids : [tx.reference_id])
        : [];
    const isShirtOrderBatch = shirtOrderRegIds.length > 1;

    const shirtItems: any[] = isShirtOrderBatch
        ? (detail?.registrations ?? [])
        : (detail?.registration ? [detail.registration] : []);

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


    const receiptRef = useRef<HTMLDivElement>(null);
    const [sharing, setSharing] = useState(false);

    const handleShareImage = async () => {
        if (!receiptRef.current || sharing) return;
        setSharing(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });

            const blob: Blob | null = await new Promise((resolve) =>
                canvas.toBlob((b) => resolve(b), 'image/png'),
            );
            if (!blob) throw new Error('Không tạo được ảnh');

            const fileName = `bien-lai-${tx.id ?? Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            if (
                typeof navigator !== 'undefined' &&
                (navigator as any).canShare?.({ files: [file] })
            ) {
                await (navigator as any).share({
                    files: [file],
                    title: 'Biên lai giao dịch — Ví BNB',
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Đã tải ảnh biên lai xuống');
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                toast.error('Tạo ảnh biên lai thất bại');
            }
        } finally {
            setSharing(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
                overscrollBehavior: 'contain',
            }}
            onClick={e => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative"
                style={{
                    maxHeight: '90dvh',
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

                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0" id="tx-modal-header">
                    <p className="text-sm font-bold text-gray-900">Chi tiết giao dịch</p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleShareImage}
                            disabled={sharing}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-transform duration-150 active:scale-95 disabled:opacity-50"
                            title="Chia sẻ ảnh biên lai"
                        >
                            {sharing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Share2 className="w-3.5 h-3.5" />
                            )}
                            <span>Chia sẻ</span>
                        </button>
                        <button onClick={handleClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-transform duration-150 active:scale-90">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 min-h-0">
                    <div
                        className={`px-5 pt-5 pb-10 space-y-5 overflow-y-auto hide-scrollbar ${isReversed ? 'blur-[1px] select-none pointer-events-none' : ''}`}
                        style={{
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain',
                            maxHeight: 'calc(90dvh - 65px)',
                        }}
                    >
                        <div className="flex flex-col items-center text-center gap-2">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cls}`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <p className={`text-2xl font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{fmt(tx.amount)}
                            </p>
                            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                                {shirtOrderLabel ?? TX_TYPE_LABEL[tx.type] ?? tx.type}
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


                        {isShirtOrder && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    Chi tiết đơn đặt áo {shirtItems.length > 1 ? `(${shirtItems.length} sản phẩm)` : ''}
                                </p>

                                {loadingDetail ? (
                                    <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                    </div>
                                ) : shirtItems.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                        Không tải được chi tiết
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {shirtItems.map((item, idx) => (
                                            <div key={item.id ?? idx} className="rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-gray-500">Loại áo</span>
                                                    <span className="font-medium text-gray-800">{item.shirt_type_name}</span>
                                                </div>
                                                {item.color_name && (
                                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                                        <span className="text-gray-500">Màu sắc</span>
                                                        <span className="font-medium text-gray-800">{item.color_name}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-gray-500">Size</span>
                                                    <span className="font-medium text-gray-800">{item.size}</span>
                                                </div>
                                                {(item.jersey_number || item.print_name) && (
                                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                                        <span className="text-gray-500">Số áo / Tên in</span>
                                                        <span className="font-medium text-gray-800 text-right">
                                                            {item.jersey_number && `Số ${item.jersey_number}`}
                                                            {item.jersey_number && item.print_name && " · "}
                                                            {item.print_name && `"${item.print_name}"`}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-gray-500">Số lượng</span>
                                                    <span className="font-medium text-gray-800">{item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-gray-500">Đơn giá</span>
                                                    <span className="font-medium text-gray-800">{fmt(item.unit_price)}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3 text-sm bg-blue-50">
                                                    <span className="font-semibold text-blue-700">Thành tiền</span>
                                                    <span className="font-bold text-blue-700">{fmt(item.total_amount)}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {shirtItems.length > 1 && (
                                            <div className="flex justify-between px-4 py-3 text-sm bg-emerald-50 rounded-xl border border-emerald-100">
                                                <span className="font-semibold text-emerald-700">Tổng cộng ({shirtItems.length} sản phẩm)</span>
                                                <span className="font-bold text-emerald-700">
                                                    {fmt(shirtItems.reduce((s, it) => s + (it.total_amount ?? 0), 0))}
                                                </span>
                                            </div>
                                        )}

                                        {shirtItems[0]?.users?.full_name && (
                                            <div className="flex justify-between px-4 py-2.5 text-sm bg-blue-50/50 rounded-xl">
                                                <span className="text-gray-500">Người đặt</span>
                                                <span className="font-semibold text-blue-700">{shirtItems[0].users.full_name}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {isReversed && (
                        <div className="absolute left-0 right-0 bottom-0 z-10 flex flex-col items-center justify-center gap-1 bg-white/70" style={{ top: 65 }}>
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

                <div
                    style={{ position: 'fixed', left: -9999, top: 0, width: 420 }}
                    aria-hidden="true"
                >
                    <div ref={receiptRef} style={{ width: 420, background: '#ffffff', padding: 28, fontFamily: 'inherit' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: 0.5 }}>
                                VÍ BNB — CLB CẦU LÔNG
                            </p>
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Biên lai giao dịch</p>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <p style={{ fontSize: 30, fontWeight: 900, color: isPositive ? '#059669' : '#ef4444', margin: 0, lineHeight: 1.3 }}>
                                {isPositive ? '+' : ''}{fmt(tx.amount)}
                            </p>
                            <span style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#9ca3af', background: '#f9fafb', padding: '4px 10px', borderRadius: 999 }}>
                                {TX_TYPE_LABEL[tx.type] ?? tx.type}
                            </span>
                        </div>

                        <div style={{ background: '#f9fafb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                            <Row label="Tiêu đề" value={tx.title} />
                            {tx.description && <Row label="Diễn giải" value={tx.description} />}
                            <Row label="Thời gian" value={format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi })} />
                            <Row label="Số dư sau giao dịch" value={fmt(tx.balance_after)} bold />
                        </div>

                        {isSessionPayment && (
                            <div style={{ border: '1px solid #f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
                                {displaySessionTitle && <Row label="Buổi đánh" value={displaySessionTitle} highlight />}
                                <Row label="Tiền sân + cầu của người này" value={fmt(displayBase)} />
                                {displayOtherFee > 0 && (
                                    <Row label="Khoản khác" value={fmt(displayOtherFee)} note={displayOtherFeeNote} amber />
                                )}
                                {displayGuests.length > 0 && (
                                    <div style={{ padding: '10px 16px' }}>
                                        <p style={{ fontSize: 11, color: '#9333ea', fontWeight: 600, marginBottom: 6 }}>
                                            Gộp thanh toán cùng {displayGuests.length} khách
                                        </p>
                                        {displayGuests.map((g: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                                                <span style={{ color: '#4b5563' }}>+ {nameOf(g)}</span>
                                                <span style={{ fontWeight: 600, color: '#374151' }}>
                                                    {fmt((g.base_amount ?? 0) + (g.other_fee_amount ?? 0))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Row label="Tổng đã trả" value={fmt(displayTotal)} bold shaded />
                            </div>
                        )}

                        {isShirtOrder && shirtItems.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                {shirtItems.map((item, idx) => (
                                    <div
                                        key={item.id ?? idx}
                                        style={{
                                            border: '1px solid #f3f4f6',
                                            borderRadius: 12,
                                            overflow: 'hidden',
                                            marginBottom: 10,
                                        }}
                                    >
                                        <Row label="Loại áo" value={item.shirt_type_name} />
                                        {item.color_name && <Row label="Màu sắc" value={item.color_name} />}
                                        <Row label="Size" value={item.size} />
                                        {(item.jersey_number || item.print_name) && (
                                            <Row
                                                label="Số áo / Tên in"
                                                value={[
                                                    item.jersey_number ? `Số ${item.jersey_number}` : null,
                                                    item.print_name ? `"${item.print_name}"` : null,
                                                ].filter(Boolean).join(' · ')}
                                            />
                                        )}
                                        <Row label="Số lượng" value={String(item.quantity)} />
                                        <Row label="Đơn giá" value={fmt(item.unit_price)} />
                                        <Row label="Thành tiền" value={fmt(item.total_amount)} bold highlight />
                                    </div>
                                ))}

                                {shirtItems.length > 1 && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '10px 16px',
                                            fontSize: 13,
                                            background: '#ecfdf5',
                                            border: '1px solid #d1fae5',
                                            borderRadius: 12,
                                        }}
                                    >
                                        <span style={{ fontWeight: 700, color: '#047857' }}>
                                            Tổng cộng ({shirtItems.length} sản phẩm)
                                        </span>
                                        <span style={{ fontWeight: 700, color: '#047857' }}>
                                            {fmt(shirtItems.reduce((s, it) => s + (it.total_amount ?? 0), 0))}
                                        </span>
                                    </div>
                                )}

                                {shirtItems[0]?.users?.full_name && (
                                    <div style={{ marginTop: 10 }}>
                                        <Row label="Người đặt" value={shirtItems[0].users.full_name} highlight />
                                    </div>
                                )}
                            </div>
                        )}

                        <p style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', marginTop: 20 }}>
                            Xuất lúc {format(new Date(), 'HH:mm, dd/MM/yyyy', { locale: vi })}
                        </p>
                    </div>
                </div>
            </div>
        </div >,
        document.body
    );
}
function Row({
    label,
    value,
    note,
    bold,
    amber,
    highlight,
    shaded,
}: {
    label: string;
    value: string;
    note?: string;
    bold?: boolean;
    amber?: boolean;
    highlight?: boolean;
    shaded?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 16px',
                fontSize: 13,
                background: highlight ? 'rgba(239,246,255,0.7)' : shaded ? '#f9fafb' : 'transparent',
                borderTop: '1px solid #f3f4f6',
            }}
        >
            <span style={{ color: '#9ca3af' }}>{label}</span>
            <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: bold ? 700 : 500, color: amber ? '#d97706' : highlight ? '#1d4ed8' : '#111827' }}>
                    {value}
                </span>
                {note && <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>{note}</p>}
            </div>
        </div>
    );
}
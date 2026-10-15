"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Users, X, CalendarDays, ArrowDownToLine, ShoppingCart, PlusCircle, RotateCcw, Wallet, Ban, Share2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { eventsAdminApi, registrationsAdminApi, walletAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { drawReceiptBackground, ensureReceiptFonts } from '@/lib/receipt-canvas';

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
        case 'topup': return { Icon: ArrowDownToLine, cls: 'bg-[var(--success-soft)] text-[var(--success)]' };
        case 'session_payment': return { Icon: CalendarDays, cls: 'bg-[var(--danger-soft)] text-[var(--danger)]' };
        case 'manual_expense': return { Icon: ShoppingCart, cls: 'bg-[var(--warning-soft)] text-[var(--warning)]' };
        case 'manual_credit': return { Icon: PlusCircle, cls: 'bg-[var(--success-soft)] text-[var(--success)]' };
        case 'refund': return { Icon: RotateCcw, cls: 'bg-[var(--primary-soft)] text-[var(--primary)]' };
        default: return { Icon: Wallet, cls: 'bg-[var(--surface-muted)] text-[var(--text-muted)]' };
    }
}

export default function AdminTransactionDetailModal({
    tx,
    onClose,
    transactions = [],
    onDeleted,
}: {
    tx: any;
    onClose: () => void;
    transactions?: any[];
    onDeleted?: (txId: string) => void;
}) {
    const isPositive = tx.amount > 0;
    const { Icon, cls } = txIcon(tx);

    const [detail, setDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [visible, setVisible] = useState(false);

    const [deleting, setDeleting] = useState(false);

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
            .catch(() => { if (!ignore) setDetail({ deleted: true }); })
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

    const isShirtOrderDeleted = isShirtOrder && !loadingDetail && detail?.deleted === true;

    const isShirtOrderCancelled =
        isShirtOrder &&
        !loadingDetail &&
        !isShirtOrderDeleted &&
        tx.amount < 0 &&
        shirtItems.some((item: any) => Boolean(item.cancelled_at));

    const isShirtOrderReversed = isShirtOrderCancelled;

    const isRefunded = isSessionPayment && transactions.some((t: any) =>
        t.type === 'refund' &&
        new Date(t.created_at).getTime() > new Date(tx.created_at).getTime() &&
        typeof t.description === 'string' && tx.title && t.description.includes(tx.title)
    );

    const isSessionReversed =
        isSessionPayment && (isRefunded || (!loadingDetail && (!reg || reg.payment_status !== 'confirmed')));

    const showReversedOverlay = isSessionReversed || isShirtOrderReversed;

    const sessionStatus = reg?.sessions?.status;
    const isSessionCancelled = sessionStatus === 'cancelled';

    const isLoadingSessionDetail = isSessionPayment && loadingDetail;

    const displayHostName =
        (hasSnapshot && tx.metadata.member_name) ||
        (reg?.is_guest ? reg?.guest_full_name : reg?.users?.full_name) ||
        null;

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
        if (sharing) return;
        if (loadingDetail) {
            toast.error('Đang tải chi tiết, vui lòng thử lại sau giây lát');
            return;
        }
        setSharing(true);
        try {
            // ───────────── Cấu hình ─────────────
            const W = 390;
            const SVG_SCALE = 3;
            const PAD = 22;
            const CW = W - PAD * 2;

            const FALLBACK =
                "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
            const SANS =
                "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
            const HEAD = `'Barlow',${FALLBACK}`;
            const ROWNUM = `'Barlow Semi Condensed','Barlow',${FALLBACK}`;
            const AMOUNT = `'Barlow Condensed','Barlow',${FALLBACK}`;

            const NAVY = '#10294a';
            const ICON = '#1e3a5f';
            const MUTED = '#8a9bb5';
            const SOFT = '#445a7a'; // chữ phụ đủ đậm để nổi trên nền
            const LINE = 'rgba(16,41,74,0.14)';
            const STRONG_LINE = 'rgba(16,41,74,0.28)';
            const GREEN = '#059669';
            const RED = '#dc2626';
            const AMBER = '#b45309';

            const BG_SRC = '/bg/receipt-bg.webp';
            const QR_SRC = '/qr/qr-ng-ngoi.webp';
            const SHUTTLE_SRC = '/bg/cau-long-icon.webp';

            const MAX_CANVAS_PX = 14_000_000;
            const MAX_HEIGHT = 30000;

            const exportedAt = `Xuất lúc ${format(new Date(), 'HH:mm, dd/MM/yyyy', { locale: vi })}`;
            const typeLabel: string =
                shirtOrderLabel ??
                (badgeUsesDescription ? tx.description : (TX_TYPE_LABEL[tx.type] ?? tx.type));
            const splitNote = (n?: string) =>
                n ? n.split('\n').map((l: string) => l.trim()).filter(Boolean) : [];

            // ───────────── Ảnh / icon ─────────────
            const loadImg = (src: string, cors = false) =>
                new Promise<HTMLImageElement | null>((resolve) => {
                    const img = new Image();
                    if (cors) img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                    img.src = src;
                });

            const svgImg = (inner: string, color: string, size: number, vb = '0 0 24 24', h?: number) => {
                const px = size * SVG_SCALE;
                const py = (h ?? size) * SVG_SCALE;
                const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="${vb}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
                return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
            };

            const P = {
                user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>`,
                users: `<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/><path d="M16 5a3.2 3.2 0 0 1 0 6M18 14.8c1.8.7 3 2.3 3 5.2"/>`,
                calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
                clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
                chat: `<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>`,
                wallet: `<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3M17 14h.01"/>`,
                card: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
                bank: `<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>`,
                doc: `<path d="M6 3h10l3 3v15H6z"/><path d="M9 9h7M9 13h7M9 17h5"/>`,
                plus: `<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>`,
            };

            const [
                icUser, icUsers, icCal, icClock, icChat, icWallet, icCard, icBank, icDoc, icPlus,
                icCourt, qrImg, bgImg, shuttleImg,
            ] = await Promise.all([
                svgImg(P.user, ICON, 22),
                svgImg(P.users, ICON, 22),
                svgImg(P.calendar, ICON, 22),
                svgImg(P.clock, ICON, 22),
                svgImg(P.chat, ICON, 22),
                svgImg(P.wallet, ICON, 16),
                svgImg(P.card, ICON, 22),
                svgImg(P.bank, ICON, 22),
                svgImg(P.doc, ICON, 22),
                svgImg(P.plus, '#d97706', 22),
                svgImg(
                    `<rect x="1" y="1" width="42" height="28" rx="4" fill="#16a34a" stroke="none"/><rect x="5" y="5" width="34" height="20" stroke="#bbf7d0" stroke-width="1.5"/><path d="M22 5v20M5 15h34" stroke="#bbf7d0" stroke-width="1.5"/>`,
                    'none', 26, '0 0 44 30', 18,
                ),
                loadImg(QR_SRC, true),
                loadImg(BG_SRC, true),
                loadImg(SHUTTLE_SRC, true),
            ]);

            await ensureReceiptFonts();

            const render = (ctx: CanvasRenderingContext2D, H: number): number => {
                const fontStr = (size: number, weight = 500, italic = false, family = SANS) =>
                    `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;

                type TOpt = {
                    size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right';
                    italic?: boolean; family?: string; spacing?: number;
                };

                const measure = (s: string, o: TOpt = {}) => {
                    const { size = 13, weight = 500, italic = false, family = SANS, spacing = 0 } = o;
                    ctx.font = fontStr(size, weight, italic, family);
                    return ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1);
                };

                const text = (s: string, x: number, cy: number, o: TOpt = {}) => {
                    const { size = 13, weight = 500, color = NAVY, align = 'left', italic = false, family = SANS, spacing = 0 } = o;
                    ctx.font = fontStr(size, weight, italic, family);
                    ctx.fillStyle = color;
                    ctx.textBaseline = 'alphabetic';
                    const by = cy + size * 0.35;
                    if (!spacing) {
                        ctx.textAlign = align;
                        ctx.fillText(s, x, by);
                        return;
                    }
                    const total = measure(s, o);
                    let sx = x;
                    if (align === 'center') sx = x - total / 2;
                    else if (align === 'right') sx = x - total;
                    ctx.textAlign = 'left';
                    for (const ch of [...s]) {
                        ctx.fillText(ch, sx, by);
                        sx += ctx.measureText(ch).width + spacing;
                    }
                };

                const wrap = (s: string, maxW: number, o: TOpt = {}) => {
                    const words = String(s ?? '').split(/\s+/);
                    const lines: string[] = [];
                    let cur = '';
                    for (const w of words) {
                        const t = cur ? cur + ' ' + w : w;
                        if (measure(t, o) <= maxW || !cur) cur = t;
                        else { lines.push(cur); cur = w; }
                    }
                    if (cur) lines.push(cur);
                    return lines.length ? lines : [''];
                };

                const fit = (s: string, maxW: number, o: TOpt = {}) => {
                    if (measure(s, o) <= maxW) return s;
                    let t = s;
                    while (t.length > 1 && measure(t + '…', o) > maxW) t = t.slice(0, -1);
                    return t + '…';
                };

                const rr = (x: number, y: number, w: number, h: number, r: number) => {
                    ctx.beginPath();
                    ctx.moveTo(x + r, y);
                    ctx.arcTo(x + w, y, x + w, y + h, r);
                    ctx.arcTo(x + w, y + h, x, y + h, r);
                    ctx.arcTo(x, y + h, x, y, r);
                    ctx.arcTo(x, y, x + w, y, r);
                    ctx.closePath();
                };

                const fillRR = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
                    ctx.fillStyle = fill;
                    rr(x, y, w, h, r);
                    ctx.fill();
                };

                const hline = (x1: number, x2: number, y: number, color = LINE) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(x1, y, x2 - x1, 1);
                };

                const dline = (x1: number, x2: number, y: number) => {
                    ctx.save();
                    ctx.strokeStyle = LINE;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 3]);
                    ctx.beginPath();
                    ctx.moveTo(x1, y + 0.5);
                    ctx.lineTo(x2, y + 0.5);
                    ctx.stroke();
                    ctx.restore();
                };

                const vline = (x: number, y1: number, y2: number) => {
                    ctx.save();
                    ctx.strokeStyle = LINE;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 3]);
                    ctx.beginPath();
                    ctx.moveTo(x + 0.5, y1);
                    ctx.lineTo(x + 0.5, y2);
                    ctx.stroke();
                    ctx.restore();
                };

                const icon = (img: HTMLImageElement | null, x: number, cy: number, w: number, h = w) => {
                    if (img) ctx.drawImage(img, x, cy - h / 2, w, h);
                };

                drawReceiptBackground(ctx, bgImg, W, H);

                text('BIÊN LAI GIAO DỊCH', W / 2, 38, { size: 20, weight: 500, family: HEAD, align: 'center', spacing: 3 });
                text('BNB BADMINTON CLUB', W / 2, 62, { size: 9, weight: 500, family: HEAD, color: MUTED, align: 'center', spacing: 4 });
                hline(W / 2 - 22, W / 2 + 22, 74, 'rgba(16,41,74,0.35)');
                text('PLAY  •  FRIENDS  •  GOOD VIBES', W / 2, 92, {
                    size: 8, weight: 500, family: HEAD, color: '#42536e', align: 'center', spacing: 3.5,
                });

                text('SỐ TIỀN GIAO DỊCH', W / 2, 128, { size: 9, weight: 500, family: HEAD, align: 'center', spacing: 3 });
                const amountStr = `${isPositive ? '+' : ''}${fmt(tx.amount)}`;
                let amountSize = 62;
                while (amountSize > 28 && measure(amountStr, { size: amountSize, weight: 700, family: AMOUNT }) > CW) amountSize -= 2;
                text(amountStr, W / 2, 166, {
                    size: amountSize, weight: 700, family: AMOUNT, align: 'center', color: isPositive ? GREEN : RED,
                });

                const chipTxt = fit(typeLabel, CW - 70, { size: 12, weight: 500 });
                const chipW = measure(chipTxt, { size: 12, weight: 500 }) + 52;
                const chipY = 200;
                const chipX = W / 2 - chipW / 2;
                fillRR(chipX, chipY, chipW, 26, 13, 'rgba(205,218,236,0.75)');
                icon(icWallet, chipX + 12, chipY + 13, 15);
                text(chipTxt, chipX + 34, chipY + 13, { size: 12, weight: 500, color: ICON });

                const infoRows: { icon: HTMLImageElement | null; label: string; value: string; bold?: boolean }[] = [
                    { icon: icDoc, label: 'Tiêu đề', value: tx.title ?? '' },
                ];
                if (tx.description && !badgeUsesDescription)
                    infoRows.push({ icon: icChat, label: 'Diễn giải', value: tx.description });
                if (isSessionPayment && displaySessionTitle)
                    infoRows.push({ icon: icCal, label: 'Buổi đánh', value: displaySessionTitle });
                infoRows.push({
                    icon: icClock, label: 'Thời gian',
                    value: format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi }),
                });
                infoRows.push({ icon: icWallet, label: 'Số dư sau giao dịch', value: fmt(tx.balance_after), bold: true });

                const LABEL_X = PAD + 40;
                const VAL_W = CW - 40 - 125;
                let y = 244;
                infoRows.forEach((r, i) => {
                    const lines = wrap(r.value, VAL_W, { size: 13, weight: 600 });
                    const h = Math.max(42, lines.length * 17 + 16);
                    if (i > 0) hline(LABEL_X, W - PAD, y);
                    const cy = y + h / 2;
                    icon(r.icon, PAD, cy, 22);
                    text(r.label, LABEL_X, cy, { size: 13, color: SOFT });
                    lines.forEach((ln, li) =>
                        text(ln, W - PAD, cy + (li - (lines.length - 1) / 2) * 17, {
                            size: 13, weight: r.bold ? 700 : 600, align: 'right',
                        }));
                    y += h;
                });
                hline(PAD, W - PAD, y, STRONG_LINE);

                const section = (title: string) => {
                    const cy = y + 28;
                    const tw = measure(title, { size: 12, weight: 500, family: HEAD, spacing: 3 });
                    text(title, PAD, cy, { size: 12, weight: 500, family: HEAD, spacing: 3 });
                    hline(PAD + tw + 14, PAD + tw + 14 + 56, cy, 'rgba(16,41,74,0.35)');
                    y = cy + 16;
                };

                const totalRow = (label: string, value: string, labelSpacing = 4) => {
                    hline(PAD, W - PAD, y + 2, STRONG_LINE);
                    const cy = y + 34;
                    text(label, PAD, cy, { size: 15, weight: 500, family: HEAD, spacing: labelSpacing });
                    text(value, W - PAD, cy, { size: 30, weight: 700, family: AMOUNT, align: 'right' });
                    y += 68;
                };

                if (isSessionPayment) {
                    section('CHI TIẾT THANH TOÁN');

                    type PayRow = { amount: number; label: string; sub?: string; solo?: boolean; amber?: boolean; note?: string };
                    const payRows: PayRow[] = [];
                    displayGuests.forEach((g: any) => {
                        const gName = nameOf(g) ?? '?';
                        payRows.push({ amount: g.base_amount ?? 0, label: 'Tiền sân + cầu', sub: `${gName} (đi cùng)` });
                        if ((g.other_fee_amount ?? 0) > 0)
                            payRows.push({ amount: g.other_fee_amount, label: 'Khoản khác', sub: `${gName} (đi cùng)`, amber: true, note: g.other_fee_note });
                    });
                    const hostSub = displayGuests.length > 0 ? (displayHostName ?? undefined) : undefined;
                    payRows.push({ amount: displayBase, label: 'Tiền sân + cầu', sub: hostSub, solo: true });
                    if (displayOtherFee > 0)
                        payRows.push({ amount: displayOtherFee, label: 'Khoản khác', sub: hostSub, solo: true, amber: true, note: displayOtherFeeNote });

                    payRows.forEach((r, i) => {
                        const noteLines = splitNote(r.note);
                        const blockH = 22 + (r.sub ? 20 : 0) + noteLines.length * 14;
                        const h = Math.max(60, blockH + 22);
                        if (i > 0) dline(PAD, W - PAD, y);
                        const cy = y + h / 2;
                        const top = cy - blockH / 2;

                        if (r.amber) {
                            icon(icPlus, PAD + 18, cy, 22);
                        } else {
                            icon(icCourt, PAD, cy, 24, 17);
                            text('+', PAD + 31, cy, { size: 16, weight: 900, align: 'center' });
                            icon(shuttleImg, PAD + 40, cy, 26, 26);
                        }
                        vline(PAD + 74, top, top + blockH);

                        const tx0 = PAD + 88;
                        text(r.label, tx0, top + 11, { size: 15, weight: 500 });
                        let yy = top + 22;
                        if (r.sub) {
                            icon(r.solo ? icUser : icUsers, tx0, yy + 10, 14);
                            text(r.sub, tx0 + 20, yy + 10, { size: 12, color: SOFT });
                            yy += 20;
                        }
                        noteLines.forEach((ln) => {
                            text(ln, tx0, yy + 7, { size: 11, italic: true, color: SOFT });
                            yy += 14;
                        });
                        text(fmt(r.amount), W - PAD, cy, {
                            size: 19, weight: 500, family: ROWNUM, align: 'right', color: r.amber ? AMBER : NAVY,
                        });
                        y += h;
                    });

                    totalRow('Tổng đã trả', fmt(displayTotal));
                }

                else if (isShirtOrder && shirtItems.length > 0) {
                    section(`CHI TIẾT ĐƠN ĐẶT ÁO${shirtItems.length > 1 ? ` (${shirtItems.length})` : ''}`);

                    shirtItems.forEach((item: any, idx: number) => {
                        const kv: { label: string; value: string; hl?: boolean }[] = [
                            { label: 'Loại áo', value: String(item.shirt_type_name ?? '') },
                        ];
                        if (item.color_name) kv.push({ label: 'Màu sắc', value: String(item.color_name) });
                        kv.push({ label: 'Size', value: String(item.size ?? '') });
                        if (item.jersey_number || item.print_name)
                            kv.push({
                                label: 'Số áo / Tên in',
                                value: [
                                    item.jersey_number ? `Số ${item.jersey_number}` : null,
                                    item.print_name ? `"${item.print_name}"` : null,
                                ].filter(Boolean).join(' · '),
                            });
                        kv.push({ label: 'Số lượng', value: String(item.quantity ?? '') });
                        kv.push({ label: 'Đơn giá', value: fmt(item.unit_price ?? 0) });
                        kv.push({ label: 'Thành tiền', value: fmt(item.total_amount ?? 0), hl: true });

                        if (idx > 0) {
                            hline(PAD, W - PAD, y + 4, STRONG_LINE);
                            y += 10;
                        }
                        const VW = CW - 110;
                        kv.forEach((r, i) => {
                            const lines = wrap(r.value, VW, { size: 13, weight: 600 });
                            const h = Math.max(r.hl ? 40 : 32, lines.length * 17 + 14);
                            if (i > 0) dline(PAD, W - PAD, y);
                            const cy = y + h / 2;
                            text(r.label, PAD, cy, { size: 13, color: SOFT, weight: r.hl ? 600 : 500 });
                            if (r.hl) {
                                text(r.value, W - PAD, cy, { size: 20, weight: 500, family: ROWNUM, align: 'right' });
                            } else {
                                lines.forEach((ln, li) =>
                                    text(ln, W - PAD, cy + (li - (lines.length - 1) / 2) * 17, {
                                        size: 13, weight: 600, align: 'right',
                                    }));
                            }
                            y += h;
                        });
                    });

                    if (shirtItems.length > 1) {
                        const sum = shirtItems.reduce((s: number, it: any) => s + (it.total_amount ?? 0), 0);
                        totalRow(`Tổng cộng (${shirtItems.length} sản phẩm)`, fmt(sum), 2);
                    } else {
                        y += 6;
                    }

                    const orderer = shirtItems[0]?.users?.full_name;
                    if (orderer) {
                        const h = 42;
                        hline(PAD, W - PAD, y, STRONG_LINE);
                        const cy = y + h / 2;
                        icon(icUser, PAD, cy, 22);
                        text('Người đặt', LABEL_X, cy, { size: 13, color: SOFT });
                        text(fit(orderer, CW - 40 - 90, { size: 13, weight: 600 }), W - PAD, cy, { size: 13, weight: 600, align: 'right' });
                        y += h;
                    }
                }

                const qTop = y + 30;
                const qTitle = 'QUÉT MÃ ĐỂ CHUYỂN KHOẢN';
                const qTitleW = measure(qTitle, { size: 11, weight: 500, family: HEAD, spacing: 2.5 });
                text(qTitle, W / 2, qTop, { size: 11, weight: 500, family: HEAD, align: 'center', spacing: 2.5, color: '#2b3f63' });
                hline(W / 2 - qTitleW / 2 - 14 - 38, W / 2 - qTitleW / 2 - 14, qTop, 'rgba(16,41,74,0.4)');
                hline(W / 2 + qTitleW / 2 + 14, W / 2 + qTitleW / 2 + 14 + 38, qTop, 'rgba(16,41,74,0.4)');

                const FR = 140;
                const fx = PAD + 6;
                const fy = qTop + 22;

                ctx.save();
                ctx.shadowColor = 'rgba(16,41,74,0.14)';
                ctx.shadowBlur = 16;
                ctx.shadowOffsetY = 4;
                const panel = ctx.createLinearGradient(fx, fy, fx + FR, fy + FR);
                panel.addColorStop(0, 'rgba(248,251,255,0.93)');
                panel.addColorStop(1, 'rgba(222,233,248,0.93)');
                ctx.fillStyle = panel;
                rr(fx, fy, FR, FR, 12);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.75)';
                ctx.lineWidth = 1;
                rr(fx + 0.5, fy + 0.5, FR - 1, FR - 1, 12);
                ctx.stroke();
                ctx.restore();

                if (qrImg) {
                    const area = FR - 20;
                    const k = Math.min(area / qrImg.naturalWidth, area / qrImg.naturalHeight);
                    const dw = qrImg.naturalWidth * k;
                    const dh = qrImg.naturalHeight * k;
                    ctx.drawImage(qrImg, fx + 10 + (area - dw) / 2, fy + 10 + (area - dh) / 2, dw, dh);
                }

                ctx.save();
                ctx.strokeStyle = NAVY;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                const L = 20;
                const corner = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.lineTo(x3, y3);
                    ctx.stroke();
                };
                corner(fx, fy + L, fx, fy, fx + L, fy);
                corner(fx + FR - L, fy, fx + FR, fy, fx + FR, fy + L);
                corner(fx, fy + FR - L, fx, fy + FR, fx + L, fy + FR);
                corner(fx + FR - L, fy + FR, fx + FR, fy + FR, fx + FR, fy + FR - L);
                ctx.restore();

                const rx = fx + FR + 20;
                const bx = rx + 32;
                const bankItems: [HTMLImageElement | null, string, string][] = [
                    [icUser, 'Chủ tài khoản', 'NGO VAN NGOI'],
                    [icCard, 'Số tài khoản', '9961 0600 42'],
                    [icBank, 'Ngân hàng', 'Techcombank'],
                ];
                bankItems.forEach(([ic, label, val], i) => {
                    const t = fy + 14 + i * 38;
                    icon(ic, rx, t + 15, 20);
                    text(label, bx, t + 6, { size: 10, color: SOFT });
                    text(val, bx, t + 23, { size: 13, weight: 700 });
                });

                const fEnd = fy + FR + 26;
                hline(W / 2 - 22, W / 2 + 22, fEnd, 'rgba(16,41,74,0.3)');
                text(exportedAt, W / 2, fEnd + 18, { size: 10, color: SOFT, align: 'center' });

                return fEnd + 44;
            };

            const scratch = document.createElement('canvas');
            scratch.width = 2;
            scratch.height = 2;
            const totalH = Math.ceil(render(scratch.getContext('2d')!, 2000));

            if (totalH > MAX_HEIGHT) {
                toast.error('Biên lai quá dài để tạo thành 1 ảnh');
                return;
            }

            const scale = Math.max(1, Math.min(3, Math.sqrt(MAX_CANVAS_PX / (W * totalH))));

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(W * scale);
            canvas.height = Math.round(totalH * scale);
            const ctx = canvas.getContext('2d')!;
            ctx.scale(scale, scale);
            render(ctx, totalH);

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
                console.error('[handleShareImage]', err);
                toast.error('Tạo ảnh biên lai thất bại');
            }
        } finally {
            setSharing(false);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        if (!window.confirm('Xoá giao dịch này? Số dư ví sẽ được hoàn tác tương ứng.')) return;
        setDeleting(true);
        try {
            await walletAdminApi.deleteTransactions(tx.user_id, [tx.id]);
            toast.success('Đã xoá giao dịch');
            onDeleted?.(tx.id);
            handleClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Xoá giao dịch thất bại');
        } finally {
            setDeleting(false);
        }
    };

    const isManualType = tx.type === 'manual_expense' || tx.type === 'manual_credit';
    const badgeUsesDescription = !isShirtOrder && isManualType && Boolean(tx.description);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: 'var(--overlay)',
                backdropFilter: 'blur(2px)',
                opacity: visible ? 1 : 0,
                transition: 'opacity 200ms ease-out',
                overscrollBehavior: 'contain',
            }}
            onClick={e => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="w-full max-w-md bg-[var(--surface)] rounded-2xl shadow-xl overflow-hidden relative"
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

                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0" id="tx-modal-header">
                    <p className="text-sm font-bold text-[var(--text)]">Chi tiết giao dịch</p>

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
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-full bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold transition-transform duration-150 active:scale-95 disabled:opacity-50"
                            title="Xoá giao dịch"
                        >
                            {deleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Xoá</span>
                        </button>
                        <button onClick={handleClose} className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center hover:bg-[var(--border-strong)] transition-transform duration-150 active:scale-90">
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 min-h-0">
                    <div
                        className={`px-5 pt-5 pb-10 space-y-5 overflow-y-auto hide-scrollbar ${showReversedOverlay ? 'blur-[1px] select-none pointer-events-none' : ''}`}
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
                            <p className={`text-2xl font-black ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                {isPositive ? '+' : ''}{fmt(tx.amount)}
                            </p>
                            <span className="text-xs font-medium text-[var(--text-faint)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full">
                                {shirtOrderLabel
                                    ?? (badgeUsesDescription ? tx.description : (TX_TYPE_LABEL[tx.type] ?? tx.type))}
                            </span>
                        </div>

                        <div className="bg-[var(--surface-muted)] rounded-xl divide-y divide-[var(--border)] overflow-hidden">
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-[var(--text-faint)]">Tiêu đề</span>
                                <span className="font-semibold text-[var(--text)] text-right">{tx.title}</span>
                            </div>
                            {/* {tx.description && (
                                <div className="px-4 py-3 text-sm">
                                    <p className="text-[var(--text-faint)] mb-1">Diễn giải</p>
                                    <p className="text-[var(--text)]">{tx.description}</p>
                                </div>
                            )} */}
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-[var(--text-faint)]">Thời gian</span>
                                <span className="font-medium text-[var(--text)]">
                                    {format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi })}
                                </span>
                            </div>
                            <div className="flex justify-between px-4 py-3 text-sm">
                                <span className="text-[var(--text-faint)]">Số dư sau giao dịch</span>
                                <span className="font-bold text-[var(--text)]">{fmt(tx.balance_after)}</span>
                            </div>
                        </div>

                        {isSessionPayment && (
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-2">
                                    Chi tiết khoản thanh toán
                                </p>

                                {isLoadingSessionDetail ? (
                                    <div className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                                        {displaySessionTitle && (
                                            <div className="flex justify-between px-4 py-2.5 text-sm bg-[var(--primary-soft)]">
                                                <span className="text-[var(--text-muted)]">Buổi đánh</span>
                                                <span className="font-semibold text-[var(--primary)] text-right">{displaySessionTitle}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between px-4 py-2.5 text-sm">
                                            <span className="text-[var(--text-muted)]">
                                                Tiền sân + cầu của {displayHostName || "người này"}
                                            </span>
                                            <span className="font-medium text-[var(--text)]">{fmt(displayBase)}</span>
                                        </div>

                                        {displayOtherFee > 0 ? (
                                            <div className="px-4 py-2.5 text-sm">
                                                {displayOtherFeeNote ? (
                                                    <div className="space-y-1.5">
                                                        <span className="text-[var(--text-muted)]">Khoản khác</span>
                                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-2.5 py-1.5">
                                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                                {displayOtherFeeNote
                                                                    .split("\n")
                                                                    .map((l: string) => l.trim())
                                                                    .filter(Boolean)
                                                                    .map((line: string, i: number) => (
                                                                        <p key={i} className="text-xs text-[var(--text-faint)] italic">
                                                                            — {line}
                                                                        </p>
                                                                    ))}
                                                            </div>
                                                            <span className="font-medium text-[var(--warning)] flex-shrink-0">
                                                                {fmt(displayOtherFee)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[var(--text-muted)]">Khoản khác</span>
                                                        <span className="font-medium text-[var(--warning)]">{fmt(displayOtherFee)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between px-4 py-2.5 text-sm">
                                                <span className="text-[var(--text-faint)]">Khoản khác</span>
                                                <span className="text-[var(--text-faint)]">Không có</span>
                                            </div>
                                        )}

                                        {displayGuests.length > 0 ? (
                                            <div className="px-4 py-2.5">
                                                <p className="text-xs text-[var(--purple)] font-medium mb-1.5 flex items-center gap-1">
                                                    <Users className="w-3 h-3" /> Gộp thanh toán cùng {displayGuests.length} khách
                                                </p>
                                                {displayGuests.map((g: any, idx: number) => {
                                                    const gName = nameOf(g);
                                                    const gBase = g.base_amount ?? 0;
                                                    const gOtherFee = g.other_fee_amount ?? 0;
                                                    const gTotal = gBase + gOtherFee;

                                                    return (
                                                        <div key={g.id ?? idx} className="py-1.5 border-t border-[var(--border)] first:border-t-0">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-[var(--text-muted)]">+ {gName}</span>
                                                                <span className="font-medium text-[var(--text)]">{fmt(gTotal)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-[var(--text-faint)] mt-0.5 pl-3">
                                                                <span>Tiền sân + cầu</span>
                                                                <span>{fmt(gBase)}</span>
                                                            </div>
                                                            {gOtherFee > 0 && (
                                                                <div className="mt-0.5 pl-3 text-xs">
                                                                    {g.other_fee_note ? (
                                                                        <div className="space-y-1">
                                                                            <span className="text-[var(--warning)]">Khoản khác</span>
                                                                            <div className="flex items-center justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-2.5 py-1.5">
                                                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                                                    {g.other_fee_note
                                                                                        .split("\n")
                                                                                        .map((l: string) => l.trim())
                                                                                        .filter(Boolean)
                                                                                        .map((line: string, i: number) => (
                                                                                            <p key={i} className="text-[var(--text-faint)] italic">
                                                                                                {line}
                                                                                            </p>
                                                                                        ))}
                                                                                </div>
                                                                                <span className="text-[var(--warning)] font-medium flex-shrink-0">
                                                                                    {fmt(gOtherFee)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[var(--warning)]">Khoản khác</span>
                                                                            <span className="text-[var(--warning)] font-medium">{fmt(gOtherFee)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between px-4 py-2.5 text-sm">
                                                <span className="text-[var(--text-faint)]">Gộp với khách</span>
                                                <span className="text-[var(--text-faint)]">Không, thanh toán riêng</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between px-4 py-3 text-sm bg-[var(--surface-muted)]">
                                            <span className="font-semibold text-[var(--text)]">Tổng đã trả</span>
                                            <span className="font-bold text-[var(--text)]">{fmt(displayTotal)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {isShirtOrder && (
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide mb-2">
                                    Chi tiết đơn đặt áo {shirtItems.length > 1 ? `(${shirtItems.length} sản phẩm)` : ''}
                                </p>

                                {loadingDetail ? (
                                    <div className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                    </div>
                                ) : shirtItems.length === 0 ? (
                                    <p className="text-sm text-[var(--text-faint)] text-center py-4">
                                        {isShirtOrderDeleted ? 'Đăng ký đặt áo này đã bị xoá' : 'Không tải được chi tiết'}
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {shirtItems.map((item, idx) => (
                                            <div key={item.id ?? idx} className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-[var(--text-muted)]">Loại áo</span>
                                                    <span className="font-medium text-[var(--text)]">{item.shirt_type_name}</span>
                                                </div>
                                                {item.color_name && (
                                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                                        <span className="text-[var(--text-muted)]">Màu sắc</span>
                                                        <span className="font-medium text-[var(--text)]">{item.color_name}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-[var(--text-muted)]">Size</span>
                                                    <span className="font-medium text-[var(--text)]">{item.size}</span>
                                                </div>
                                                {(item.jersey_number || item.print_name) && (
                                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                                        <span className="text-[var(--text-muted)]">Số áo / Tên in</span>
                                                        <span className="font-medium text-[var(--text)] text-right">
                                                            {item.jersey_number && `Số ${item.jersey_number}`}
                                                            {item.jersey_number && item.print_name && " · "}
                                                            {item.print_name && `"${item.print_name}"`}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-[var(--text-muted)]">Số lượng</span>
                                                    <span className="font-medium text-[var(--text)]">{item.quantity}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                                    <span className="text-[var(--text-muted)]">Đơn giá</span>
                                                    <span className="font-medium text-[var(--text)]">{fmt(item.unit_price)}</span>
                                                </div>
                                                <div className="flex justify-between px-4 py-3 text-sm bg-[var(--primary-soft)]">
                                                    <span className="font-semibold text-[var(--primary)]">Thành tiền</span>
                                                    <span className="font-bold text-[var(--primary)]">{fmt(item.total_amount)}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {shirtItems.length > 1 && (
                                            <div className="flex justify-between px-4 py-3 text-sm bg-[var(--success-soft)] rounded-xl border border-[color-mix(in_srgb,var(--success)_30%,transparent)]">
                                                <span className="font-semibold text-[var(--success)]">Tổng cộng ({shirtItems.length} sản phẩm)</span>
                                                <span className="font-bold text-[var(--success)]">
                                                    {fmt(shirtItems.reduce((s, it) => s + (it.total_amount ?? 0), 0))}
                                                </span>
                                            </div>
                                        )}

                                        {shirtItems[0]?.users?.full_name && (
                                            <div className="flex justify-between px-4 py-2.5 text-sm bg-[var(--primary-soft)] rounded-xl">
                                                <span className="text-[var(--text-muted)]">Người đặt</span>
                                                <span className="font-semibold text-[var(--primary)]">{shirtItems[0].users.full_name}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {showReversedOverlay && (
                        <div className="absolute left-0 right-0 bottom-0 z-10 flex flex-col items-center justify-center gap-1 bg-[color-mix(in_srgb,var(--surface)_70%,transparent)]" style={{ top: 65 }}>
                            <Ban className="w-6 h-6 text-[var(--text-faint)]" />
                            <p className="text-base font-bold text-[var(--text-muted)] text-center px-6">
                                {isSessionCancelled
                                    ? 'Buổi đánh đã bị hủy'
                                    : isShirtOrderCancelled
                                        ? 'Đơn đặt hàng đã huỷ'
                                        : 'Hóa đơn đã được hoàn tác'}
                            </p>
                            <p className="text-sm font-semibold text-[var(--success)]">
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
                                {shirtOrderLabel
                                    ?? (badgeUsesDescription ? tx.description : (TX_TYPE_LABEL[tx.type] ?? tx.type))}
                            </span>
                        </div>

                        <div style={{ background: '#f9fafb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                            <Row label="Tiêu đề" value={tx.title} />
                            {tx.description && !badgeUsesDescription && <Row label="Diễn giải" value={tx.description} />}
                            <Row label="Thời gian" value={format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi })} />
                            <Row label="Số dư sau giao dịch" value={fmt(tx.balance_after)} bold />
                        </div>

                        {isSessionPayment && (
                            <div style={{ border: '1px solid #f3f4f6', borderRadius: 12, overflow: 'hidden' }}>
                                {displaySessionTitle && <Row label="Buổi đánh" value={displaySessionTitle} highlight />}
                                <Row
                                    label={`Tiền sân + cầu của ${displayHostName || "người này"}`}
                                    value={fmt(displayBase)}
                                />

                                {displayOtherFee > 0 && (
                                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                                        <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 6px' }}>Khoản khác</p>
                                        {displayOtherFeeNote ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: '8px 10px' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {displayOtherFeeNote
                                                        .split('\n')
                                                        .map((l: string) => l.trim())
                                                        .filter(Boolean)
                                                        .map((line: string, i: number) => (
                                                            <p key={i} style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                                                                — {line}
                                                            </p>
                                                        ))}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#d97706', fontSize: 13, flexShrink: 0 }}>
                                                    {fmt(displayOtherFee)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <span style={{ fontWeight: 600, color: '#d97706', fontSize: 13 }}>
                                                    {fmt(displayOtherFee)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {displayGuests.length > 0 && (
                                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                                        <p style={{ fontSize: 11, color: '#9333ea', fontWeight: 600, marginBottom: 6 }}>
                                            Gộp thanh toán cùng {displayGuests.length} khách
                                        </p>
                                        {displayGuests.map((g: any, idx: number) => {
                                            const gName = nameOf(g);
                                            const gBase = g.base_amount ?? 0;
                                            const gOtherFee = g.other_fee_amount ?? 0;
                                            const gTotal = gBase + gOtherFee;
                                            return (
                                                <div key={idx} style={{ padding: '6px 0', borderTop: idx > 0 ? '1px dashed #f3f4f6' : 'none' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                        <span style={{ color: '#4b5563' }}>+ {gName}</span>
                                                        <span style={{ fontWeight: 600, color: '#374151' }}>{fmt(gTotal)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af', paddingLeft: 12, marginTop: 2 }}>
                                                        <span>Tiền sân + cầu</span>
                                                        <span>{fmt(gBase)}</span>
                                                    </div>
                                                    {gOtherFee > 0 && (
                                                        <div style={{ paddingLeft: 12, marginTop: 4 }}>
                                                            <p style={{ fontSize: 12, color: '#d97706', margin: '0 0 4px' }}>Khoản khác</p>
                                                            {g.other_fee_note ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: '6px 8px' }}>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        {g.other_fee_note
                                                                            .split('\n')
                                                                            .map((l: string) => l.trim())
                                                                            .filter(Boolean)
                                                                            .map((line: string, i: number) => (
                                                                                <p key={i} style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                                                                                    {line}
                                                                                </p>
                                                                            ))}
                                                                    </div>
                                                                    <span style={{ fontWeight: 600, color: '#d97706', fontSize: 12, flexShrink: 0 }}>
                                                                        {fmt(gOtherFee)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                    <span style={{ fontWeight: 600, color: '#d97706', fontSize: 12 }}>
                                                                        {fmt(gOtherFee)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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

                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #e5e7eb', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontWeight: 600 }}>
                                Quét mã để chuyển khoản
                            </p>
                            <img
                                src="/qr/qr-ng-ngoi.png"
                                alt="QR chuyển khoản Techcombank"
                                crossOrigin="anonymous"
                                style={{ width: 160, height: 'auto', margin: '0 auto', display: 'block', borderRadius: 8 }}
                            />
                        </div>

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
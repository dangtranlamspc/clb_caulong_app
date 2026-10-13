"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Users, X, CalendarDays, ArrowDownToLine, ShoppingCart, PlusCircle, RotateCcw, Wallet, Ban, Share2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { eventsAdminApi, registrationsAdminApi, walletAdminApi } from '@/lib/api';
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
            const PAD = 14;
            const CW = W - PAD * 2;
            const FONT =
                "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
            const SCRIPT = "'Snell Roundhand','Brush Script MT','Segoe Script',cursive";

            const QR_SRC = '/qr/qr-ng-ngoi.png';
            const QR_CROP = { top: 0.17, bottom: 0, left: 0, right: 0 };
            const LOGO_SRC = '/bg/logo_team.webp';
            const LOGO_CROP = { top: 0.055, bottom: 0.125, left: 0.17, right: 0.16 };
            const LOGO_H = 68;
            const FOOTER_LOGO_H = 38;
            const HEADER_H = 80;

            const CARD_GRAD: [number, string][] = [
                [0, 'rgba(255,255,255,0.90)'],
                [1, 'rgba(214,231,255,0.84)'],
            ];
            const INNER_GRAD: [number, string][] = [
                [0, '#eef4ff'],
                [1, '#d3e3ff'],
            ];
            const INNER_SOFT: [number, string][] = [
                [0, '#f5f9ff'],
                [1, '#e1ecff'],
            ];
            const CARD_BORDER = 'rgba(255,255,255,0.6)';
            const ROW_LINE = 'rgba(110,150,220,0.22)';

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
                const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="${vb}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
                return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
            };

            const P = {
                user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>`,
                calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
                clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
                users: `<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/><path d="M16 5a3.2 3.2 0 0 1 0 6M18 14.8c1.8.7 3 2.3 3 5.2"/>`,
                card: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
                bank: `<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>`,
                chat: `<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>`,
                wallet: `<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7l12-3v3M17 14h.01"/>`,
                doc: `<path d="M6 3h10l3 3v15H6z"/><path d="M9 9h7M9 13h7M9 17h5"/>`,
                sigma: `<path d="M18 5H6l7 7-7 7h12"/>`,
                plus: `<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>`,
                shirt: `<path d="M8 3l-5 3 2 4 3-1v11h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>`,
            };
            const G = '#8a97b2';

            const [
                icUserG, icCalG, icClockG, icChatG, icWalletG, icCardG, icBankG, icDocG,
                icWalletW, icDoc, icSigma, icCalW, icPlus, icCourt, icShirt, icUsersAccent,
                qrImg, logoImg,
            ] = await Promise.all([
                svgImg(P.user, G, 18),
                svgImg(P.calendar, G, 18),
                svgImg(P.clock, G, 18),
                svgImg(P.chat, G, 18),
                svgImg(P.wallet, G, 18),
                svgImg(P.card, G, 18),
                svgImg(P.bank, G, 18),
                svgImg(P.doc, G, 18),
                svgImg(P.wallet, '#ffffff', 20),
                svgImg(P.doc, '#14306e', 20),
                svgImg(P.sigma, '#1d4ed8', 22),
                svgImg(P.calendar, '#ffffff', 14),
                svgImg(P.plus, '#d97706', 22),
                svgImg(
                    `<rect x="1" y="1" width="42" height="28" rx="4" fill="#16a34a" stroke="none"/><rect x="5" y="5" width="34" height="20" stroke="#bbf7d0" stroke-width="1.5"/><path d="M22 5v20M5 15h34" stroke="#bbf7d0" stroke-width="1.5"/>`,
                    'none', 34, '0 0 44 30', 23,
                ),
                svgImg(P.shirt, '#2563eb', 24),
                svgImg(P.users, '#2563eb', 14),
                loadImg(QR_SRC, true),
                loadImg(LOGO_SRC, true),
            ]);

            // ───────────── Hàm vẽ (trả về tổng chiều cao) ─────────────
            const render = (ctx: CanvasRenderingContext2D, H: number): number => {
                const fontStr = (size: number, weight = 500, italic = false, family = FONT) =>
                    `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;

                type TOpt = {
                    size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right';
                    italic?: boolean; family?: string; spacing?: number;
                };

                const measure = (s: string, o: TOpt = {}) => {
                    const { size = 13, weight = 500, italic = false, family = FONT, spacing = 0 } = o;
                    ctx.font = fontStr(size, weight, italic, family);
                    return ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1);
                };

                // `cy` = tâm theo chiều dọc của dòng
                const text = (s: string, x: number, cy: number, o: TOpt = {}) => {
                    const { size = 13, weight = 500, color = '#0f1f46', align = 'left', italic = false, family = FONT, spacing = 0 } = o;
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

                const box = (
                    x: number, y: number, w: number, h: number, r: number,
                    fill: string | CanvasGradient,
                    shadow?: { c: string; b: number; y: number },
                    stroke?: string,
                ) => {
                    ctx.save();
                    if (shadow) {
                        ctx.shadowColor = shadow.c;
                        ctx.shadowBlur = shadow.b;
                        ctx.shadowOffsetY = shadow.y;
                    }
                    ctx.fillStyle = fill;
                    rr(x, y, w, h, r);
                    ctx.fill();
                    ctx.restore();
                    if (stroke) {
                        ctx.save();
                        ctx.strokeStyle = stroke;
                        ctx.lineWidth = 1;
                        rr(x + 0.5, y + 0.5, w - 1, h - 1, r);
                        ctx.stroke();
                        ctx.restore();
                    }
                };

                const lg = (x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
                    const g = ctx.createLinearGradient(x0, y0, x1, y1);
                    stops.forEach(([o, c]) => g.addColorStop(o, c));
                    return g;
                };

                const hline = (x1: number, x2: number, y: number, color = ROW_LINE) => {
                    ctx.fillStyle = color;
                    ctx.fillRect(x1, y, x2 - x1, 1);
                };

                const icon = (img: HTMLImageElement | null, x: number, cy: number, w: number, h = w) => {
                    if (img) ctx.drawImage(img, x, cy - h / 2, w, h);
                };

                const drawLogo = (x: number, cy: number, dh: number) => {
                    if (!logoImg) return;
                    const sx = logoImg.naturalWidth * LOGO_CROP.left;
                    const sy = logoImg.naturalHeight * LOGO_CROP.top;
                    const sw = logoImg.naturalWidth * (1 - LOGO_CROP.left - LOGO_CROP.right);
                    const sh = logoImg.naturalHeight * (1 - LOGO_CROP.top - LOGO_CROP.bottom);
                    ctx.drawImage(logoImg, sx, sy, sw, sh, x, cy - dh / 2, dh * (sw / sh), dh);
                };

                // Pill nổi bật cho tên người
                const namePill = (x: number, cy: number, name: string, tag?: string) => {
                    const nameW = measure(name, { size: 12, weight: 700 });
                    const tagW = tag ? measure(tag, { size: 11 }) + 4 : 0;
                    const pw = 8 + 14 + 5 + nameW + tagW + 10;
                    box(x, cy - 10, pw, 20, 10, lg(x, 0, x + pw, 0, [[0, '#dbeafe'], [1, '#c3d9ff']]), undefined, 'rgba(59,130,246,0.4)');
                    icon(icUsersAccent, x + 8, cy, 14);
                    text(name, x + 8 + 14 + 5, cy, { size: 12, weight: 700, color: '#1d4ed8' });
                    if (tag) text(tag, x + 8 + 14 + 5 + nameW + 4, cy, { size: 11, color: '#5b6b8c' });
                };

                // --- nền ---
                const bg = ctx.createLinearGradient(0, 0, 0, H);
                bg.addColorStop(0, '#071a4a');
                bg.addColorStop(Math.min(0.18, 160 / H), '#0e2a70');
                bg.addColorStop(Math.min(0.32, 280 / H), '#2a56b8');
                bg.addColorStop(Math.min(0.52, 480 / H), '#bcd3f5');
                bg.addColorStop(Math.min(0.78, 700 / H), '#e6eefc');
                bg.addColorStop(1, '#f3f7ff');
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, W, H);
                const glow = ctx.createRadialGradient(W * 0.88, 10, 0, W * 0.88, 10, 100);
                glow.addColorStop(0, 'rgba(147,197,253,0.45)');
                glow.addColorStop(1, 'rgba(147,197,253,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, W, 140);

                // --- header ---
                drawLogo(PAD, HEADER_H / 2 - 2, LOGO_H);
                text('More Than', W - PAD, 24, { size: 19, italic: true, color: '#93c5fd', align: 'right', family: SCRIPT });
                text('Badminton', W - PAD, 46, { size: 19, italic: true, color: '#93c5fd', align: 'right', family: SCRIPT });
                text('PLAY • FRIENDS • GOOD VIBES', W - PAD, HEADER_H - 12, { size: 8, color: 'rgba(255,255,255,0.6)', align: 'right', spacing: 3 });

                const ix = PAD + 12;
                const iw = CW - 24;

                // ───────── CARD 1: số tiền + thông tin chung ─────────
                const c1Top = HEADER_H;
                const infoRows: { icon: HTMLImageElement | null; label: string; value: string; bold?: boolean }[] = [
                    { icon: icDocG, label: 'Tiêu đề', value: tx.title ?? '' },
                ];
                if (tx.description && !badgeUsesDescription)
                    infoRows.push({ icon: icChatG, label: 'Diễn giải', value: tx.description });
                infoRows.push({
                    icon: icClockG, label: 'Thời gian',
                    value: format(new Date(tx.created_at), 'HH:mm, dd/MM/yyyy', { locale: vi }),
                });
                infoRows.push({ icon: icWalletG, label: 'Số dư sau giao dịch', value: fmt(tx.balance_after), bold: true });

                const LABEL_COL = 112;
                const VAL_W = iw - 24 - 26 - LABEL_COL;
                const infoLayout = infoRows.map((r) => {
                    const lines = wrap(r.value, VAL_W, { size: 13, weight: 700 });
                    return { ...r, lines, h: Math.max(34, lines.length * 17 + 12) };
                });
                const infoH = infoLayout.reduce((s, r) => s + r.h, 0);

                const pillY = c1Top + 36;
                const chipY = pillY + 52 + 6;
                const infoY = chipY + 22 + 6;
                const c1H = infoY + infoH + 8 - c1Top;

                box(PAD, c1Top, CW, c1H, 20, lg(0, c1Top, 0, c1Top + c1H, CARD_GRAD), { c: 'rgba(7,26,74,0.18)', b: 24, y: 8 }, CARD_BORDER);
                text('BIÊN LAI GIAO DỊCH', W / 2, c1Top + 20, { size: 17, weight: 800, color: '#0f2a63', align: 'center', spacing: 0.5 });

                box(ix, pillY, iw, 52, 26, lg(ix, 0, ix + iw, 0, INNER_GRAD));
                ctx.fillStyle = '#0f2a63';
                ctx.beginPath();
                ctx.arc(ix + 26, pillY + 26, 18, 0, Math.PI * 2);
                ctx.fill();
                icon(icWalletW, ix + 16, pillY + 26, 20);
                text(`${isPositive ? '+' : ''}${fmt(tx.amount)}`, ix + iw / 2, pillY + 26, {
                    size: 32, weight: 900, color: isPositive ? '#059669' : '#dc2626', align: 'center',
                });

                const chipTxt = fit(typeLabel, iw - 40, { size: 12 });
                const chipW = measure(chipTxt, { size: 12 }) + 28;
                box(W / 2 - chipW / 2, chipY, chipW, 22, 11, lg(W / 2 - chipW / 2, 0, W / 2 + chipW / 2, 0, INNER_GRAD));
                text(chipTxt, W / 2, chipY + 11, { size: 12, color: '#1e3a8a', align: 'center' });

                box(ix, infoY, iw, infoH, 14, lg(ix, 0, ix + iw, 0, INNER_SOFT));
                let ry = infoY;
                infoLayout.forEach((r, i) => {
                    const cy = ry + r.h / 2;
                    if (i > 0) hline(ix + 12, ix + iw - 12, ry);
                    icon(r.icon, ix + 12, cy, 18);
                    text(r.label, ix + 12 + 26, cy, { size: 12, color: G });
                    r.lines.forEach((ln, li) => {
                        text(ln, ix + iw - 12, cy + (li - (r.lines.length - 1) / 2) * 17, {
                            size: 13, weight: r.bold ? 800 : 700, align: 'right',
                        });
                    });
                    ry += r.h;
                });

                let cursor = c1Top + c1H;

                // ───────── CARD 2: chi tiết (thanh toán buổi đánh / đặt áo) ─────────
                type Block = { h: number; draw: (y: number) => void };
                const blocks: Block[] = [];
                let c2Title = '';

                if (isSessionPayment) {
                    c2Title = 'CHI TIẾT THANH TOÁN';

                    if (displaySessionTitle) {
                        const lines = wrap(displaySessionTitle, iw - 24 - 26 - 70, { size: 13, weight: 700 });
                        const bh = Math.max(34, lines.length * 17 + 12);
                        blocks.push({
                            h: bh + 6,
                            draw: (y) => {
                                box(ix, y + 2, iw, bh, 12, lg(ix, 0, ix + iw, 0, INNER_GRAD));
                                const cy = y + 2 + bh / 2;
                                icon(icCalG, ix + 12, cy, 18);
                                text('Buổi đánh', ix + 12 + 26, cy, { size: 12, color: G });
                                lines.forEach((ln, i) =>
                                    text(ln, ix + iw - 12, cy + (i - (lines.length - 1) / 2) * 17, {
                                        size: 13, weight: 700, color: '#1d4ed8', align: 'right',
                                    }));
                            },
                        });
                    }

                    type PayRow = { amount: number; label: string; pill?: { name: string; tag?: string }; amber?: boolean; note?: string };
                    const payRows: PayRow[] = [
                        { amount: displayBase, label: 'Tiền sân + cầu', pill: displayHostName ? { name: displayHostName } : undefined },
                    ];
                    if (displayOtherFee > 0)
                        payRows.push({ amount: displayOtherFee, label: 'Khoản khác', amber: true, note: displayOtherFeeNote });
                    displayGuests.forEach((g: any) => {
                        const gName = nameOf(g) ?? '?';
                        payRows.push({ amount: g.base_amount ?? 0, label: 'Tiền sân + cầu', pill: { name: `+ ${gName}`, tag: '(đi cùng)' } });
                        if ((g.other_fee_amount ?? 0) > 0)
                            payRows.push({ amount: g.other_fee_amount, label: 'Khoản khác', pill: { name: `+ ${gName}` }, amber: true, note: g.other_fee_note });
                    });

                    payRows.forEach((r) => {
                        const noteLines = splitNote(r.note);
                        const blockH = 20 + (r.pill ? 22 : 0) + noteLines.length * 14;
                        const h = Math.max(36, blockH + 8);
                        blocks.push({
                            h,
                            draw: (y) => {
                                hline(ix, ix + iw, y);
                                const cy = y + h / 2;
                                icon(r.amber ? icPlus : icCourt, ix, cy, r.amber ? 22 : 34, r.amber ? 22 : 23);
                                const top = cy - blockH / 2;
                                text(r.label, ix + 46, top + 10, { size: 15, weight: 600 });
                                let yy = top + 20;
                                if (r.pill) {
                                    namePill(ix + 46, yy + 12, r.pill.name, r.pill.tag);
                                    yy += 22;
                                }
                                noteLines.forEach((ln) => {
                                    text(ln, ix + 46, yy + 7, { size: 11, italic: true, color: G });
                                    yy += 14;
                                });
                                text(fmt(r.amount), ix + iw, cy, {
                                    size: 15, weight: 700, align: 'right', color: r.amber ? '#d97706' : '#0f1f46',
                                });
                            },
                        });
                    });

                    blocks.push({
                        h: 6 + 38,
                        draw: (y) => {
                            const ty = y + 6;
                            box(ix, ty, iw, 38, 12, lg(ix, 0, ix + iw, 0, INNER_GRAD));
                            icon(icSigma, ix + 12, ty + 19, 22);
                            text('Tổng đã trả', ix + 44, ty + 19, { size: 16, weight: 800 });
                            text(fmt(displayTotal), ix + iw - 12, ty + 19, { size: 18, weight: 900, color: '#1d4ed8', align: 'right' });
                        },
                    });
                } else if (isShirtOrder && shirtItems.length > 0) {
                    c2Title = `CHI TIẾT ĐƠN ĐẶT ÁO${shirtItems.length > 1 ? ` (${shirtItems.length})` : ''}`;

                    shirtItems.forEach((item: any) => {
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

                        const VW = iw - 24 - 26 - 90;
                        const lay = kv.map((r) => {
                            const lines = wrap(r.value, VW, { size: 13, weight: 700 });
                            return { ...r, lines, h: Math.max(28, lines.length * 17 + 8) };
                        });
                        const bh = lay.reduce((s, r) => s + r.h, 0);
                        blocks.push({
                            h: bh + 8,
                            draw: (y) => {
                                box(ix, y + 2, iw, bh + 4, 12, lg(ix, 0, ix + iw, 0, INNER_SOFT));
                                let yy = y + 4;
                                lay.forEach((r, i) => {
                                    const cy = yy + r.h / 2;
                                    if (i > 0) hline(ix + 12, ix + iw - 12, yy);
                                    if (i === 0) icon(icShirt, ix + 10, cy, 18);
                                    text(r.label, ix + 12 + 26, cy, { size: 12, color: r.hl ? '#1d4ed8' : G, weight: r.hl ? 700 : 500 });
                                    r.lines.forEach((ln, li) =>
                                        text(ln, ix + iw - 12, cy + (li - (r.lines.length - 1) / 2) * 17, {
                                            size: r.hl ? 14 : 13, weight: r.hl ? 800 : 700, align: 'right', color: r.hl ? '#1d4ed8' : '#0f1f46',
                                        }));
                                    yy += r.h;
                                });
                            },
                        });
                    });

                    if (shirtItems.length > 1) {
                        const sum = shirtItems.reduce((s: number, it: any) => s + (it.total_amount ?? 0), 0);
                        blocks.push({
                            h: 38 + 4,
                            draw: (y) => {
                                box(ix, y, iw, 38, 12, lg(ix, 0, ix + iw, 0, INNER_GRAD));
                                icon(icSigma, ix + 12, y + 19, 22);
                                text(`Tổng cộng (${shirtItems.length} sản phẩm)`, ix + 44, y + 19, { size: 14, weight: 800 });
                                text(fmt(sum), ix + iw - 12, y + 19, { size: 16, weight: 900, color: '#1d4ed8', align: 'right' });
                            },
                        });
                    }

                    const orderer = shirtItems[0]?.users?.full_name;
                    if (orderer) {
                        blocks.push({
                            h: 34 + 6,
                            draw: (y) => {
                                box(ix, y + 6, iw, 34, 12, lg(ix, 0, ix + iw, 0, INNER_GRAD));
                                icon(icUserG, ix + 12, y + 6 + 17, 18);
                                text('Người đặt', ix + 12 + 26, y + 6 + 17, { size: 12, color: G });
                                text(fit(orderer, iw - 24 - 26 - 70, { size: 13, weight: 700 }), ix + iw - 12, y + 6 + 17, {
                                    size: 13, weight: 700, color: '#1d4ed8', align: 'right',
                                });
                            },
                        });
                    }
                }

                if (blocks.length > 0) {
                    const c2Top = cursor + 8;
                    const bodyTop = c2Top + 32;
                    const bodyH = blocks.reduce((s, b) => s + b.h, 0);
                    const c2H = 32 + bodyH + 8;
                    box(PAD, c2Top, CW, c2H, 20, lg(0, c2Top, 0, c2Top + c2H, CARD_GRAD), { c: 'rgba(7,26,74,0.12)', b: 24, y: 8 }, CARD_BORDER);
                    icon(icDoc, ix, c2Top + 18, 20);
                    text(c2Title, ix + 28, c2Top + 18, { size: 14, weight: 800, color: '#0f2a63', spacing: 0.3 });
                    let by = bodyTop;
                    blocks.forEach((b) => {
                        b.draw(by);
                        by += b.h;
                    });
                    cursor = c2Top + c2H;
                }

                // ───────── QR chuyển khoản ─────────
                const qTop = cursor + 8;
                const qTitle = 'QUÉT MÃ ĐỂ CHUYỂN KHOẢN';
                const qTitleW = measure(qTitle, { size: 12, weight: 800, spacing: 0.5 });
                text(qTitle, W / 2, qTop + 9, { size: 12, weight: 800, color: '#0f2a63', align: 'center', spacing: 0.5 });
                ctx.fillStyle = '#0f2a63';
                ctx.fillRect(W / 2 - qTitleW / 2 - 10 - 28, qTop + 9, 28, 1);
                ctx.fillRect(W / 2 + qTitleW / 2 + 10, qTop + 9, 28, 1);

                const bY = qTop + 22;
                const bH = 140;
                const LEFT_W = 150;
                box(PAD, bY, CW, bH, 18, lg(0, bY, 0, bY + bH, CARD_GRAD), { c: 'rgba(7,26,74,0.12)', b: 18, y: 6 }, CARD_BORDER);

                ctx.save();
                rr(PAD, bY, CW, bH, 18);
                ctx.clip();
                ctx.fillStyle = lg(PAD + LEFT_W, 0, PAD + CW, 0, INNER_SOFT);
                ctx.fillRect(PAD + LEFT_W, bY, CW - LEFT_W, bH);
                if (qrImg) {
                    const sx = qrImg.naturalWidth * QR_CROP.left;
                    const sy = qrImg.naturalHeight * QR_CROP.top;
                    const sw = qrImg.naturalWidth * (1 - QR_CROP.left - QR_CROP.right);
                    const sh = qrImg.naturalHeight * (1 - QR_CROP.top - QR_CROP.bottom);
                    const areaW = LEFT_W - 20;
                    const areaH = bH - 20;
                    const k = Math.min(areaW / sw, areaH / sh);
                    const dw = sw * k;
                    const dh = sh * k;
                    ctx.drawImage(qrImg, sx, sy, sw, sh, PAD + 10 + (areaW - dw) / 2, bY + 10 + (areaH - dh) / 2, dw, dh);
                }
                ctx.restore();

                const rx = PAD + LEFT_W + 10;
                const textX = rx + 26;
                const bankItems: [HTMLImageElement | null, string, string][] = [
                    [icUserG, 'Chủ tài khoản', 'NGO VAN NGOI'],
                    [icCardG, 'Số tài khoản', '9961 0600 42'],
                    [icBankG, 'Ngân hàng', 'Techcombank'],
                ];
                bankItems.forEach(([ic, label, val], i) => {
                    const t = bY + 14 + i * 40;
                    icon(ic, rx, t + 15, 18);
                    text(label, textX, t + 6, { size: 10, color: G });
                    text(val, textX, t + 24, { size: 13, weight: 700 });
                });

                // ───────── Footer ─────────
                const fTop = bY + bH + 8;
                const fH = 50;
                const fCy = fTop + fH / 2;
                box(PAD, fTop, CW, fH, 18, '#0f2a63', { c: 'rgba(7,26,74,0.2)', b: 14, y: 4 });
                if (logoImg) drawLogo(PAD + 14, fCy, FOOTER_LOGO_H);
                else text('BNB BADMINTON CLUB', PAD + 14, fCy, { size: 10, weight: 800, color: '#ffffff', spacing: 0.4 });
                const eW = measure(exportedAt, { size: 10 });
                text(exportedAt, W - PAD - 14, fCy, { size: 10, color: '#ffffff', align: 'right' });
                icon(icCalW, W - PAD - 14 - eW - 6 - 14, fCy, 14);

                return fTop + fH + 10;
            };

            // Pass 1: đo chiều cao
            const scratch = document.createElement('canvas');
            scratch.width = 2;
            scratch.height = 2;
            const totalH = Math.ceil(render(scratch.getContext('2d')!, 2000));

            if (totalH > MAX_HEIGHT) {
                toast.error('Biên lai quá dài để tạo thành 1 ảnh');
                return;
            }

            const scale = Math.max(1, Math.min(3, Math.sqrt(MAX_CANVAS_PX / (W * totalH))));

            // Pass 2: vẽ thật
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
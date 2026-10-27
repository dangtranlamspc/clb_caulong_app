import { format } from "date-fns";
import { vi } from "date-fns/locale";

const formatVnd = (n: number) =>
    Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";

interface BuildArgs {
    reg: any;
    session: any;
    hostName?: string;
    groupedGuests?: any[];
    /** "session" (mặc định): buổi đánh. "dining": buổi ăn uống. */
    variant?: "session" | "dining";
}

/** Vẽ biên lai ra canvas và trả về file PNG. */
export async function buildGuestReceipt({
    reg,
    session,
    hostName,
    groupedGuests,
    variant = "session",
}: BuildArgs): Promise<{ blob: Blob; fileName: string }> {
    const isDining = variant === "dining";
    // dining: chỉ hiện QR + thông tin ngân hàng khi khách chọn chuyển khoản
    const showQr = !isDining || reg.payment_method === "bank_transfer";

    const W = 390;
    const SCALE = 3;
    const PAD = 22;
    const CW = W - PAD * 2;

    const SANS =
        "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    // Font theo mẫu: tiêu đề/nhãn = Barlow, số tiền = Barlow Condensed đậm
    const FALLBACK =
        "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    const HEAD = `'Barlow',${FALLBACK}`;
    const ROWNUM = `'Barlow Semi Condensed','Barlow',${FALLBACK}`;
    const AMOUNT = `'Barlow Condensed','Barlow',${FALLBACK}`;

    const NAVY = "#10294a";
    const ICON = "#1e3a5f";
    const MUTED = "#8a9bb5";
    const LINE = "rgba(16,41,74,0.14)";

    const QR_CROP = { top: 0, bottom: 0, left: 0, right: 0 };
    const QR_SRC = "/qr/qr-ng-ngoi.webp";
    const BG_SRC = "/bg/receipt-bg.webp";
    const SHUTTLE_SRC = "/bg/cau-long-icon.webp";

    // ───────── dữ liệu ─────────
    const displayName: string =
        reg.users?.full_name ?? reg.guest_full_name ?? "?";
    const hostAmount = reg.amount_override ?? 0;
    const hostBaseAmount = reg.base_amount ?? hostAmount;
    const hostOtherFeeAmount = reg.other_fee_amount ?? 0;
    const hostOtherFeeNote: string | undefined = reg.other_fee_note;
    const isGroupedGuest = Boolean(reg.host_registration_id);

    const guestsList = (groupedGuests ?? []).map((g) => ({
        name: (g.users?.full_name ?? g.guest_full_name ?? "?") as string,
        baseAmount: g.base_amount ?? g.amount_override ?? 0,
        otherFeeAmount: g.other_fee_amount ?? 0,
        otherFeeNote: g.other_fee_note as string | undefined,
    }));
    const guestsTotal = guestsList.reduce(
        (s, g) => s + g.baseAmount + (g.otherFeeAmount ?? 0),
        0,
    );
    const totalAmount = hostAmount + guestsTotal;

    const lastName = displayName.trim().split(/\s+/).pop() ?? "";
    const noDiacritics = lastName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    const transferNote = `${isDining ? "BNB AN UONG" : "BNB"} ${noDiacritics} ${format(new Date(session.scheduled_at), "ddMMyyyy")}`;
    const sessionTime = format(
        new Date(session.scheduled_at),
        "HH:mm dd/MM/yyyy",
        { locale: vi },
    );

    // ───────── ảnh / icon ─────────
    const loadImg = (src: string, cors = false) =>
        new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            if (cors) img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });

    const svgImg = (
        inner: string,
        color: string,
        size: number,
        vb = "0 0 24 24",
        h?: number,
    ) => {
        const px = size * SCALE;
        const py = (h ?? size) * SCALE;
        const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="${vb}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
        return loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(s));
    };

    const P = {
        user: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>`,
        calendar: `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
        clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
        users: `<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/><path d="M16 5a3.2 3.2 0 0 1 0 6M18 14.8c1.8.7 3 2.3 3 5.2"/>`,
        card: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
        bank: `<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>`,
        chat: `<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>`,
        copy: `<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>`,
        utensils: `<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M18 3c-2 1.5-3 4-3 7 0 1.5 1 2 3 2v9"/>`,
    };

    const [
        icUser,
        icCalendar,
        icClock,
        icUsers,
        icCard,
        icBank,
        icChat,
        icCopy,
        icUtensils,
        icCourt,
        qrImg,
        bgImg,
        shuttleImg,
    ] = await Promise.all([
        svgImg(P.user, ICON, 22),
        svgImg(P.calendar, ICON, 22),
        svgImg(P.clock, ICON, 22),
        svgImg(P.users, ICON, 22),
        svgImg(P.card, ICON, 22),
        svgImg(P.bank, ICON, 22),
        svgImg(P.chat, ICON, 22),
        svgImg(P.copy, "#2563eb", 16),
        svgImg(P.utensils, ICON, 28),
        svgImg(
            // icon sân (xanh) như mẫu
            `<rect x="1" y="1" width="42" height="28" rx="4" fill="#16a34a" stroke="none"/><rect x="5" y="5" width="34" height="20" stroke="#bbf7d0" stroke-width="1.5"/><path d="M22 5v20M5 15h34" stroke="#bbf7d0" stroke-width="1.5"/>`,
            "none",
            26,
            "0 0 44 30",
            18,
        ),
        showQr ? loadImg(QR_SRC, true) : Promise.resolve(null),
        loadImg(BG_SRC, true),
        isDining ? Promise.resolve(null) : loadImg(SHUTTLE_SRC, true),
    ]);

    // nạp Google Fonts (có tiếng Việt) trước khi vẽ canvas
    const ensureReceiptFonts = async () => {
        try {
            if (!document.querySelector("link[data-receipt-fonts]")) {
                await new Promise<void>((resolve) => {
                    const l = document.createElement("link");
                    l.rel = "stylesheet";
                    l.setAttribute("data-receipt-fonts", "1");
                    l.href =
                        "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@500;600&family=Barlow+Condensed:wght@600;700&display=swap";
                    l.onload = () => resolve();
                    l.onerror = () => resolve();
                    document.head.appendChild(l);
                    setTimeout(resolve, 3000);
                });
            }
            const sample =
                "Biên lai thanh toán ĐđẾỂỄ Tiền sân cầu Tổng cộng QUÉT MÃ 0123456789.đ";
            await Promise.race([
                Promise.all([
                    document.fonts.load("500 20px 'Barlow'", sample),
                    document.fonts.load("600 20px 'Barlow'", sample),
                    document.fonts.load("500 18px 'Barlow Semi Condensed'", sample),
                    document.fonts.load("700 52px 'Barlow Condensed'", sample),
                ]),
                new Promise((r) => setTimeout(r, 3000)),
            ]);
        } catch {
            /* dùng font dự phòng */
        }
    };
    await ensureReceiptFonts();

    // ───────── vẽ ─────────
    const render = (ctx: CanvasRenderingContext2D, H: number): number => {
        const fontStr = (
            size: number,
            weight = 500,
            italic = false,
            family = SANS,
        ) => `${italic ? "italic " : ""}${weight} ${size}px ${family}`;

        type TOpt = {
            size?: number;
            weight?: number;
            color?: string;
            align?: "left" | "center" | "right";
            italic?: boolean;
            family?: string;
            spacing?: number;
        };

        const measure = (s: string, o: TOpt = {}) => {
            const {
                size = 13,
                weight = 500,
                italic = false,
                family = SANS,
                spacing = 0,
            } = o;
            ctx.font = fontStr(size, weight, italic, family);
            return (
                ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1)
            );
        };

        // `cy` là TÂM theo chiều dọc của dòng chữ
        const text = (s: string, x: number, cy: number, o: TOpt = {}) => {
            const {
                size = 13,
                weight = 500,
                color = NAVY,
                align = "left",
                italic = false,
                family = SANS,
                spacing = 0,
            } = o;
            ctx.font = fontStr(size, weight, italic, family);
            ctx.fillStyle = color;
            ctx.textBaseline = "alphabetic";
            const by = cy + size * 0.35;
            if (!spacing) {
                ctx.textAlign = align;
                ctx.fillText(s, x, by);
                return;
            }
            const total = measure(s, o);
            let sx = x;
            if (align === "center") sx = x - total / 2;
            else if (align === "right") sx = x - total;
            ctx.textAlign = "left";
            for (const ch of [...s]) {
                ctx.fillText(ch, sx, by);
                sx += ctx.measureText(ch).width + spacing;
            }
        };

        const wrap = (s: string, maxW: number, o: TOpt = {}) => {
            const words = s.split(/\s+/);
            const lines: string[] = [];
            let cur = "";
            for (const w of words) {
                const t = cur ? cur + " " + w : w;
                if (measure(t, o) <= maxW || !cur) cur = t;
                else {
                    lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines;
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

        const fillRR = (
            x: number,
            y: number,
            w: number,
            h: number,
            r: number,
            fill: string,
        ) => {
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

        const icon = (
            img: HTMLImageElement | null,
            x: number,
            cy: number,
            w: number,
            h = w,
        ) => {
            if (img) ctx.drawImage(img, x, cy - h / 2, w, h);
        };

        // ── nền: ảnh mẫu (cover, canh trên) ──
        const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
        baseGrad.addColorStop(0, "#f6f8fb");
        baseGrad.addColorStop(1, "#e7edf5");
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, W, H);

        if (bgImg) {
            const iw = bgImg.naturalWidth;
            const ih = bgImg.naturalHeight;
            const k = W / iw; // luôn khớp theo chiều rộng
            const fullH = ih * k;
            if (H <= fullH) {
                ctx.drawImage(bgImg, 0, 0, W, fullH);
            } else {
                // Biên lai dài hơn ảnh: giữ phần trên + phần dưới, chỉ kéo giãn dải giữa.
                const A = 0.55,
                    B = 0.68;
                const topH = ih * A * k;
                const botH = ih * (1 - B) * k;
                const midH = H - topH - botH;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(
                    bgImg,
                    0,
                    ih * A,
                    iw,
                    ih * (B - A),
                    0,
                    topH - 1,
                    W,
                    midH + 2,
                );
                ctx.drawImage(bgImg, 0, 0, iw, ih * A, 0, 0, W, topH);
                ctx.drawImage(
                    bgImg,
                    0,
                    ih * B,
                    iw,
                    ih * (1 - B),
                    0,
                    H - botH,
                    W,
                    botH,
                );
            }
        }

        // ── header ──
        text("BIÊN LAI THANH TOÁN", W / 2, 38, {
            size: 20,
            weight: 500,
            family: HEAD,
            align: "center",
            spacing: 3,
        });
        text("BNB BADMINTON CLUB", W / 2, 62, {
            size: 9,
            weight: 500,
            family: HEAD,
            color: MUTED,
            align: "center",
            spacing: 4,
        });
        hline(W / 2 - 22, W / 2 + 22, 74, "rgba(16,41,74,0.35)");
        text("PLAY  •  FRIENDS  •  GOOD VIBES", W / 2, 92, {
            size: 8,
            weight: 500,
            family: HEAD,
            color: "#42536e",
            align: "center",
            spacing: 3.5,
        });

        // ── số tiền ──
        text("SỐ TIỀN THANH TOÁN", W / 2, 128, {
            size: 9,
            weight: 500,
            family: HEAD,
            align: "center",
            spacing: 3,
        });
        const amountStr = formatVnd(totalAmount);
        let amountSize = 62;
        while (
            amountSize > 28 &&
            measure(amountStr, { size: amountSize, weight: 700, family: AMOUNT }) > CW
        ) {
            amountSize -= 2;
        }
        text(amountStr, W / 2, 166, {
            size: amountSize,
            weight: 700,
            family: AMOUNT,
            align: "center",
        });

        // ── badge: phương thức ──
        const isBank = reg.payment_method === "bank_transfer";
        const chipTxt = isDining
            ? isBank
                ? "Chuyển khoản"
                : "Tiền mặt"
            : `Chuyển khoản${isGroupedGuest ? " (tự thanh toán)" : ""}`;
        const chipW = measure(chipTxt, { size: 12, weight: 500 }) + 52;
        const chipY = 200;
        const chipX = W / 2 - chipW / 2;
        fillRR(chipX, chipY, chipW, 26, 13, "rgba(205,218,236,0.75)");
        icon(isDining && !isBank ? icCard : icBank, chipX + 12, chipY + 13, 15);
        text(chipTxt, chipX + 34, chipY + 13, {
            size: 12,
            weight: 500,
            color: "#1e3a5f",
        });

        // ── thông tin ──
        const infoRows: {
            icon: HTMLImageElement | null;
            label: string;
            value: string;
        }[] = [
                { icon: icUser, label: "Người thanh toán", value: displayName },
                {
                    icon: icCalendar,
                    label: isDining ? "Buổi ăn uống" : "Buổi đánh",
                    value: session.title,
                },
                { icon: icClock, label: "Thời gian buổi", value: sessionTime },
            ];
        if (isGroupedGuest && hostName) {
            infoRows.push({ icon: icUsers, label: "Đi cùng", value: hostName });
        }

        const LABEL_X = PAD + 40;
        const VAL_W = CW - 40 - 100;
        const infoLayout = infoRows.map((r) => {
            const lines = wrap(r.value, VAL_W, { size: 14, weight: 700 });
            return { ...r, lines, h: Math.max(42, lines.length * 17 + 16) };
        });

        const infoY = 244;
        let ry = infoY;
        infoLayout.forEach((r, i) => {
            if (i > 0) hline(LABEL_X, W - PAD, ry);
            const cy = ry + r.h / 2;
            icon(r.icon, PAD, cy, 22);
            text(r.label, LABEL_X, cy, { size: 14, weight: 600, color: "#4a5f80" });
            r.lines.forEach((ln, li) => {
                text(ln, W - PAD, cy + (li - (r.lines.length - 1) / 2) * 17, {
                    size: 14,
                    weight: 700,
                    align: "right",
                });
            });
            ry += r.h;
        });
        hline(PAD, W - PAD, ry, "rgba(16,41,74,0.28)");
        const infoBottom = ry;

        // ── chi tiết thanh toán ──
        const secCy = infoBottom + 28;
        const secTitle = "CHI TIẾT THANH TOÁN";
        const secW = measure(secTitle, {
            size: 12,
            weight: 500,
            family: HEAD,
            spacing: 3,
        });
        text(secTitle, PAD, secCy, {
            size: 12,
            weight: 500,
            family: HEAD,
            spacing: 3,
        });
        hline(PAD + secW + 14, PAD + secW + 14 + 56, secCy, "rgba(16,41,74,0.35)");

        type PayRow = {
            amount: number;
            label: string;
            sub?: string;
            solo?: boolean;
            amber?: boolean;
            note?: string;
        };
        const payRows: PayRow[] = [];
        guestsList.forEach((g) => {
            payRows.push({
                amount: g.baseAmount,
                label: "Tiền sân + cầu",
                sub: `${g.name} (đi cùng)`,
            });
            if (g.otherFeeAmount > 0)
                payRows.push({
                    amount: g.otherFeeAmount,
                    label: "Khoản khác",
                    sub: `${g.name} (đi cùng)`,
                    amber: true,
                    note: g.otherFeeNote,
                });
        });
        const hostSub = guestsList.length > 0 ? displayName : undefined;
        payRows.push({
            amount: hostBaseAmount,
            label: "Tiền sân + cầu",
            sub: hostSub,
            solo: true,
        });
        if (hostOtherFeeAmount > 0)
            payRows.push({
                amount: hostOtherFeeAmount,
                label: "Khoản khác",
                sub: hostSub,
                solo: true,
                amber: true,
                note: hostOtherFeeNote,
            });

        // dining: chỉ 1 dòng "Tiền ăn uống"
        if (isDining) {
            payRows.length = 0;
            payRows.push({ amount: totalAmount, label: "Tiền ăn uống" });
        }

        const payLayout = payRows.map((r) => {
            const noteLines = r.note
                ? r.note
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                : [];
            const blockH = 22 + (r.sub ? 20 : 0) + noteLines.length * 14;
            return { ...r, noteLines, blockH, h: Math.max(60, blockH + 22) };
        });

        const rowsTop = secCy + 16;
        let py = rowsTop;
        payLayout.forEach((r, i) => {
            if (i > 0) dline(PAD, W - PAD, py);
            const cy = py + r.h / 2;
            const top = cy - r.blockH / 2;

            if (isDining) {
                icon(icUtensils, PAD + 23, cy, 28);
            } else {
                icon(icCourt, PAD, cy, 24, 17);
                text("+", PAD + 31, cy, {
                    size: 16,
                    weight: 900,
                    color: NAVY,
                    align: "center",
                });
                icon(shuttleImg, PAD + 40, cy, 26, 26);
            }
            vline(PAD + 74, top, top + r.blockH);

            const tx = PAD + 88;
            text(r.label, tx, top + 11, { size: 15, weight: 500 });
            let yy = top + 22;
            if (r.sub) {
                icon(r.solo ? icUser : icUsers, tx, yy + 10, 14);
                text(r.sub, tx + 20, yy + 10, { size: 12, color: MUTED });
                yy += 20;
            }
            r.noteLines.forEach((ln) => {
                text(ln, tx, yy + 7, { size: 11, italic: true, color: MUTED });
                yy += 14;
            });

            text(formatVnd(r.amount), W - PAD, cy, {
                size: 19,
                weight: 500,
                family: ROWNUM,
                align: "right",
                color: r.amber ? "#b45309" : NAVY,
            });
            py += r.h;
        });

        // ── tổng cộng ──
        const totalY = py + 2;
        hline(PAD, W - PAD, totalY, "rgba(16,41,74,0.28)");
        const totalCy = totalY + 32;
        text("Tổng cộng", PAD, totalCy, {
            size: 15,
            weight: 500,
            family: HEAD,
            spacing: 4,
        });
        text(amountStr, W - PAD, totalCy, {
            size: Math.min(34, amountSize),
            weight: 700,
            family: AMOUNT,
            align: "right",
        });

        // dining + tiền mặt: không vẽ QR / thông tin ngân hàng
        if (!showQr) return totalY + 64;

        // ── QR + tài khoản ──
        const qTop = totalY + 64 + 14;
        const qTitle = "QUÉT MÃ ĐỂ CHUYỂN KHOẢN";
        const qTitleW = measure(qTitle, {
            size: 11,
            weight: 500,
            family: HEAD,
            spacing: 2.5,
        });
        text(qTitle, W / 2, qTop, {
            size: 11,
            weight: 500,
            family: HEAD,
            align: "center",
            spacing: 2.5,
            color: "#2b3f63",
        });
        hline(
            W / 2 - qTitleW / 2 - 14 - 38,
            W / 2 - qTitleW / 2 - 14,
            qTop,
            "rgba(16,41,74,0.4)",
        );
        hline(
            W / 2 + qTitleW / 2 + 14,
            W / 2 + qTitleW / 2 + 14 + 38,
            qTop,
            "rgba(16,41,74,0.4)",
        );

        const FR = 140;
        const fx = PAD + 6;
        const fy = qTop + 22;

        // nền kính mờ xanh nhạt hoà với bg + QR
        ctx.save();
        ctx.shadowColor = "rgba(16,41,74,0.14)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        const panel = ctx.createLinearGradient(fx, fy, fx + FR, fy + FR);
        panel.addColorStop(0, "rgba(248,251,255,0.93)");
        panel.addColorStop(1, "rgba(222,233,248,0.93)");
        ctx.fillStyle = panel;
        rr(fx, fy, FR, FR, 12);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1;
        rr(fx + 0.5, fy + 0.5, FR - 1, FR - 1, 12);
        ctx.stroke();
        ctx.restore();

        if (qrImg) {
            const sx = qrImg.naturalWidth * QR_CROP.left;
            const sy = qrImg.naturalHeight * QR_CROP.top;
            const sw = qrImg.naturalWidth * (1 - QR_CROP.left - QR_CROP.right);
            const sh = qrImg.naturalHeight * (1 - QR_CROP.top - QR_CROP.bottom);
            const area = FR - 20;
            const k = Math.min(area / sw, area / sh);
            const dw = sw * k;
            const dh = sh * k;
            ctx.drawImage(
                qrImg,
                sx,
                sy,
                sw,
                sh,
                fx + 10 + (area - dw) / 2,
                fy + 10 + (area - dh) / 2,
                dw,
                dh,
            );
        }

        // 4 góc khung
        ctx.save();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const L = 20;
        const corner = (
            x1: number,
            y1: number,
            x2: number,
            y2: number,
            x3: number,
            y3: number,
        ) => {
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

        // thông tin ngân hàng
        const rx = fx + FR + 20;
        const tx = rx + 32;
        const avail = W - PAD - tx;
        const bankItems: [HTMLImageElement | null, string, string][] = [
            [icUser, "Chủ tài khoản", "NGO VAN NGOI"],
            [icCard, "Số tài khoản", "9961 0600 42"],
            [icBank, "Ngân hàng", "Techcombank"],
        ];
        const STEP = 35;
        bankItems.forEach(([ic, label, val], i) => {
            const t = fy + 2 + i * STEP;
            icon(ic, rx, t + 15, 20);
            text(label, tx, t + 6, { size: 10, color: MUTED });
            text(val, tx, t + 23, { size: 13, weight: 700 });
        });

        const nt = fy + 2 + 3 * STEP;
        icon(icChat, rx, nt + 15, 20);
        text("Nội dung (tuỳ chọn)", tx, nt + 6, { size: 10, color: MUTED });

        let noteSize = 11;
        while (
            noteSize > 8 &&
            measure(transferNote, { size: noteSize, weight: 600 }) > avail - 40
        )
            noteSize--;
        const nW = Math.min(
            avail,
            measure(transferNote, { size: noteSize, weight: 600 }) + 42,
        );
        fillRR(tx, nt + 14, nW, 24, 12, "rgba(205,218,236,0.75)");
        text(transferNote, tx + 12, nt + 26, {
            size: noteSize,
            weight: 600,
            color: "#1e3a5f",
        });
        icon(icCopy, tx + nW - 24, nt + 26, 14);

        return fy + FR + 28;
    };

    // đo chiều cao thật rồi vẽ lại đúng khung
    const scratch = document.createElement("canvas");
    scratch.width = W * SCALE;
    scratch.height = 3000 * SCALE;
    const sctx = scratch.getContext("2d")!;
    sctx.scale(SCALE, SCALE);
    const totalH = Math.ceil(render(sctx, 2000));

    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = totalH * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(SCALE, SCALE);
    render(ctx, totalH);

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) throw new Error("Không tạo được ảnh");

    const fileName = `bien-lai-${displayName.replace(/\s+/g, "-")}-${reg.id}.png`;
    return { blob, fileName };
}
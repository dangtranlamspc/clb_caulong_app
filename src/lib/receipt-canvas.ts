export async function ensureReceiptFonts() {
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
            "Biên lai giao dịch Sao kê ví Số dư hiện tại ĐđẾỂỄ Tiền sân cầu Tổng cộng QUÉT MÃ Lịch sử 0123456789.đ";
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
    }
}

export function drawReceiptBackground(
    ctx: CanvasRenderingContext2D,
    bgImg: HTMLImageElement | null,
    W: number,
    H: number,
) {
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#f6f8fb");
    base.addColorStop(1, "#e7edf5");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    if (!bgImg) return;

    const iw = bgImg.naturalWidth;
    const ih = bgImg.naturalHeight;
    const k = W / iw;
    const fullH = ih * k;
    ctx.imageSmoothingQuality = "high";

    if (H <= fullH) {
        ctx.drawImage(bgImg, 0, 0, W, fullH);
        return;
    }

    const A = 0.55;
    const B = 0.68;
    const topH = ih * A * k;
    const botH = ih * (1 - B) * k;
    const bandH = ih * (B - A) * k;
    const midH = H - topH - botH;

    if (midH <= bandH * 4) {
        ctx.drawImage(bgImg, 0, ih * A, iw, ih * (B - A), 0, topH - 1, W, midH + 2);
    } else {
        let y = topH;
        let flip = false;
        while (y < topH + midH) {
            const h = Math.min(bandH, topH + midH - y);
            const srcH = h / k;
            if (!flip) {
                ctx.drawImage(bgImg, 0, ih * A, iw, srcH, 0, y - 0.5, W, h + 1);
            } else {
                ctx.save();
                ctx.translate(0, y);
                ctx.scale(1, -1);
                ctx.drawImage(bgImg, 0, ih * B - srcH, iw, srcH, 0, -h - 0.5, W, h + 1);
                ctx.restore();
            }
            y += h;
            flip = !flip;
        }
    }
    ctx.drawImage(bgImg, 0, 0, iw, ih * A, 0, 0, W, topH);
    ctx.drawImage(bgImg, 0, ih * B, iw, ih * (1 - B), 0, H - botH, W, botH);
}
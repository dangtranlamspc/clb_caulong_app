// generate-pwa-icons.mjs
//
// Script ghép logo (nền trong suốt) lên 1 nền màu đặc, xuất ra các icon PWA
// theo đúng kích thước cần cho manifest.json / apple-touch-icon.
//
// Cài đặt (chạy 1 lần trong thư mục frontend):
//   npm install sharp --save-dev
//
// Chạy:
//   node generate-pwa-icons.mjs
//
// Output sẽ nằm trong: public/icons/

import sharp from "sharp";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

// ====== CẤU HÌNH — sửa lại theo ý bạn ======
const LOGO_URL =
    "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png";
const BACKGROUND_COLOR = "#1d4ed8"; // trùng theme_color trong manifest.json
const OUTPUT_DIR = "public/icons";
const LOGO_PADDING_RATIO = 0.92; // logo chiếm 72% kích thước icon, còn lại là viền đệm
const SIZES = [192, 512]; // các kích thước cần cho manifest.json
const APPLE_TOUCH_SIZE = 180; // kích thước chuẩn cho apple-touch-icon
// ============================================

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Tải logo thất bại, status ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            })
            .on("error", reject);
    });
}

async function makeIcon(logoBuffer, size, outPath) {
    const logoSize = Math.round(size * LOGO_PADDING_RATIO);

    // Resize logo, giữ tỉ lệ, nền trong suốt để composite lên sau
    const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

    // Tạo nền màu đặc kích thước đầy đủ, rồi composite logo vào giữa
    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: BACKGROUND_COLOR,
        },
    })
        .composite([
            {
                input: resizedLogo,
                gravity: "center",
            },
        ])
        .png()
        .toFile(outPath);

    console.log(`✔ Đã tạo ${outPath} (${size}x${size})`);
}

async function main() {
    console.log("Đang tải logo gốc...");
    const logoBuffer = await downloadBuffer(LOGO_URL);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const size of SIZES) {
        const outPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
        await makeIcon(logoBuffer, size, outPath);
    }

    // apple-touch-icon: iOS không thích icon có bo góc sẵn hoặc alpha channel ở icon
    // ngoài cùng, nên xuất riêng 1 bản không có alpha ở nền (đã có nền đặc rồi nên ổn)
    const appleOutPath = path.join(OUTPUT_DIR, "apple-touch-icon.png");
    await makeIcon(logoBuffer, APPLE_TOUCH_SIZE, appleOutPath);

    console.log("\nHoàn tất! Cập nhật lại đường dẫn trong:");
    console.log("- public/manifest.json  → dùng /icons/icon-192x192.png, /icons/icon-512x512.png");
    console.log("- app/layout.tsx (metadata.icons) → dùng /icons/apple-touch-icon.png");
}

main().catch((err) => {
    console.error("Lỗi:", err.message);
    process.exit(1);
});
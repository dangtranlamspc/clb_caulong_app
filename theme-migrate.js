#!/usr/bin/env node
/**
 * theme-migrate.js
 * Đổi class màu Tailwind cứng (bg-white, text-gray-700, bg-blue-50...) sang token theme
 * (bg-[var(--surface)], text-[var(--text)]...).
 *
 * Cách dùng (nhớ commit git trước):
 *   node theme-migrate.js --dry "src/app/(member)/sessions/[id]/page.tsx"   # chỉ đếm, không ghi
 *   node theme-migrate.js "src/app/(member)/sessions/[id]/page.tsx"         # ghi đè file
 *   node theme-migrate.js src/app/(member)                                  # cả thư mục (quote nếu có ngoặc)
 *
 * - Dòng nào có chữ "theme-skip" sẽ bị bỏ qua.
 * - Chạy lại nhiều lần vẫn an toàn (không đổi lại thứ đã đổi).
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const targets = args.filter((a) => !a.startsWith("--"));

if (targets.length === 0) {
    console.log('Cách dùng: node theme-migrate.js [--dry] <file|thư mục> ...');
    process.exit(1);
}

const OP = "(?:/\\d+)?"; // hậu tố độ trong suốt: /40, /85...
const rules = [];
const add = (re, to, only) => rules.push({ re, to, only });

/* ── Nền, trắng, overlay ─────────────────────────────── */
add(/bg-white\/([5-9]\d)\b/g, "bg-[color-mix(in_srgb,var(--surface)_$1%,transparent)]");
add(/\bbg-white\b/g, "bg-[var(--surface)]");
add(/bg-\[#f4f6fa\]/gi, "bg-[var(--bg)]");
add(
    /rgba\(0,\s*0,\s*0,\s*0\.(?:4|5|55)\)/g,
    "var(--overlay)",
    (line) => line.includes("background"),
);

/* ── Xám trung tính ──────────────────────────────────── */
add(new RegExp(`((?:hover:|active:))bg-gray-(?:50|100)${OP}\\b`, "g"), "$1bg-[var(--surface-hover)]");
add(new RegExp(`\\bbg-gray-(?:50|100)${OP}\\b`, "g"), "bg-[var(--surface-muted)]");
add(/\bbg-gray-200\b/g, "bg-[var(--border-strong)]");
add(new RegExp(`\\b(border|divide)-gray-(?:50|100|200)${OP}\\b`, "g"), "$1-[var(--border)]");
add(new RegExp(`\\b(border|divide)-gray-300${OP}\\b`, "g"), "$1-[var(--border-strong)]");
add(/\btext-gray-(?:900|800|700)\b/g, "text-[var(--text)]");
add(/\btext-gray-(?:600|500)\b/g, "text-[var(--text-muted)]");
add(/\btext-gray-(?:400|300|200)\b/g, "text-[var(--text-faint)]");

/* ── Các họ màu → token ──────────────────────────────── */
const family = (names, token, soft) => {
    const F = `(?:${names.join("|")})`;
    add(new RegExp(`((?:hover:|active:)?)bg-${F}-(?:50|100)${OP}\\b`, "g"), `$1bg-[var(--${soft})]`);
    add(
        new RegExp(`\\b(border|divide)-${F}-(?:100|200|300)${OP}\\b`, "g"),
        `$1-[color-mix(in_srgb,var(--${token})_30%,transparent)]`,
    );
    add(new RegExp(`\\b(hover|focus):border-${F}-(?:400|500)\\b`, "g"), `$1:border-[var(--${token})]`);
    add(new RegExp(`\\btext-${F}-(?:400|500|600|700|800|900)\\b`, "g"), `text-[var(--${token})]`);
};

family(["blue", "indigo", "sky"], "primary", "primary-soft");
family(["emerald", "green"], "success", "success-soft");
family(["amber", "orange"], "warning", "warning-soft");
family(["red"], "danger", "danger-soft");
family(["purple", "violet"], "purple", "purple-soft");
family(["pink", "rose"], "pink", "pink-soft");

add(/\bfocus:ring-(?:blue|indigo)-(?:100|200)\b/g, "focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]");

/* ── slate / zinc → trung tính ───────────────────────── */
add(new RegExp(`\\bbg-(?:slate|zinc)-(?:50|100)${OP}\\b`, "g"), "bg-[var(--surface-muted)]");
add(new RegExp(`\\b(border|divide)-(?:slate|zinc)-(?:100|200|300)${OP}\\b`, "g"), "$1-[var(--border)]");
add(/\btext-(?:slate|zinc)-(?:400|500|600|700)\b/g, "text-[var(--text-muted)]");

/* ── Chạy ────────────────────────────────────────────── */
const SHADOW_RE = /"0 4px 16px rgba\(0,\s*0,\s*0,\s*0\.06\), 0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.04\)"/g;

function processFile(file) {
    const original = fs.readFileSync(file, "utf8");
    let count = 0;

    let src = original.replace(SHADOW_RE, () => {
        count++;
        return '"var(--shadow)"';
    });

    const out = src.split("\n").map((line) => {
        if (line.includes("theme-skip")) return line;
        for (const r of rules) {
            if (r.only && !r.only(line)) continue;
            const m = line.match(r.re);
            if (m) {
                count += m.length;
                line = line.replace(r.re, r.to);
            }
        }
        return line;
    });

    const result = out.join("\n");
    if (result !== original && !dry) fs.writeFileSync(file, result, "utf8");
    return count;
}

function walk(p, acc = []) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
        for (const name of fs.readdirSync(p)) {
            if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
            walk(path.join(p, name), acc);
        }
    } else if (/\.(tsx|jsx|ts|js)$/.test(p) && path.basename(p) !== "theme.tsx") {
        acc.push(p);
    }
    return acc;
}

let files = [];
for (const t of targets) {
    if (!fs.existsSync(t)) {
        console.log(`Không tìm thấy: ${t}`);
        continue;
    }
    files = files.concat(walk(t));
}

let totalFiles = 0;
let totalChanges = 0;
for (const f of files) {
    const n = processFile(f);
    if (n > 0) {
        totalFiles++;
        totalChanges += n;
        console.log(`${dry ? "[dry] " : ""}${String(n).padStart(4)}  ${f}`);
    }
}
console.log(
    `\n${dry ? "Sẽ đổi" : "Đã đổi"} ${totalChanges} chỗ trong ${totalFiles} file.` +
    (dry ? " (chạy lại không có --dry để ghi file)" : ""),
);
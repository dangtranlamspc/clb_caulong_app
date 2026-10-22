"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { c, alpha } from "@/lib/theme";

/**
 * Khu "Sinh nhật trong tháng" ở trang chủ.
 * Đặt file này ở: components/member/home/BirthdaySection.tsx
 *
 * Cách dùng trong page.tsx:
 *   {!loading && birthdays.length > 0 && (
 *     <BirthdaySection birthdays={birthdays} onSelect={setSelectedBirthdayMember} />
 *   )}
 */

type Birthday = {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
    date_of_birth: string;
    [key: string]: any;
};

type Item = {
    m: Birthday;
    day: number;
    month: number; // 0-11
    diff: number; // số ngày tới sinh nhật: 0 = hôm nay, >0 sắp tới, <0 đã qua
    weekday: string;
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const NEAR_DAYS = 3; // trong vòng 3 ngày thì nhấn mạnh màu cam

// Đọc ngày/tháng trực tiếp từ chuỗi YYYY-MM-DD để không bị lệch múi giờ
function parseDob(dob: string) {
    const mt = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
    if (mt) return { month: Number(mt[2]) - 1, day: Number(mt[3]) };
    const d = new Date(dob);
    return { month: d.getMonth(), day: d.getDate() };
}

function initialsOf(name?: string) {
    return (
        name
            ?.trim()
            .split(/\s+/)
            .slice(-2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() || "?"
    );
}

function buildItems(birthdays: Birthday[]) {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const items: Item[] = birthdays.map((m) => {
        const { month, day } = parseDob(m.date_of_birth);
        const date = new Date(today0.getFullYear(), month, day);
        const diff = Math.round((date.getTime() - today0.getTime()) / 86400000);
        return { m, day, month, diff, weekday: WEEKDAYS[date.getDay()] };
    });

    return {
        today: items.filter((i) => i.diff === 0),
        upcoming: items.filter((i) => i.diff > 0).sort((a, b) => a.diff - b.diff),
        past: items.filter((i) => i.diff < 0).sort((a, b) => b.diff - a.diff),
        monthLabel: now.getMonth() + 1,
    };
}

function relativeLabel(diff: number) {
    if (diff === 1) return "Ngày mai";
    return `Còn ${diff} ngày`;
}

function BirthdayAvatar({
    url,
    name,
    size,
    background,
    color,
}: {
    url?: string | null;
    name?: string;
    size: number;
    background: string;
    color: string;
}) {
    const [failed, setFailed] = useState(false);
    return (
        <span
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black"
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.36),
                background: url && !failed ? "transparent" : background,
                color,
            }}
        >
            {url && !failed ? (
                <img
                    src={url}
                    alt={name ?? ""}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                initialsOf(name)
            )}
        </span>
    );
}

// Vị trí cố định (không random) để tránh lệch khi render server/client
const CONFETTI = [
    { l: 6, d: 0, t: 3.6, col: "#fde047", w: 6, h: 9, dx: 14 },
    { l: 15, d: -1.4, t: 4.2, col: "#ffffff", w: 5, h: 5, dx: -10 },
    { l: 27, d: -2.6, t: 3.9, col: "#67e8f9", w: 6, h: 10, dx: 12 },
    { l: 39, d: -0.7, t: 4.6, col: "#fde047", w: 5, h: 8, dx: -14 },
    { l: 52, d: -3.1, t: 3.5, col: "#ffffff", w: 6, h: 6, dx: 10 },
    { l: 63, d: -1.9, t: 4.4, col: "#a5f3fc", w: 5, h: 9, dx: -12 },
    { l: 74, d: -0.3, t: 3.8, col: "#fde047", w: 6, h: 8, dx: 14 },
    { l: 84, d: -2.2, t: 4.1, col: "#ffffff", w: 5, h: 5, dx: -8 },
    { l: 93, d: -3.4, t: 3.7, col: "#67e8f9", w: 6, h: 9, dx: -14 },
];

const BD_CSS = `
@keyframes bd-in { from { opacity: 0; transform: translateY(10px) scale(.96) } to { opacity: 1; transform: none } }
@keyframes bd-ring { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes bd-confetti {
  0%   { transform: translate3d(0,-12px,0) rotate(0deg); opacity: 0 }
  15%  { opacity: 1 }
  100% { transform: translate3d(var(--bd-dx,10px),130px,0) rotate(320deg); opacity: 0 }
}
.bd-scroll { scrollbar-width: none }
.bd-scroll::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) {
  .bd-anim { animation: none !important }
  .bd-confetti { display: none }
}
`;

/* ───────────── Thẻ "Hôm nay sinh nhật" ───────────── */
function TodayCard({
    item,
    index,
    onSelect,
}: {
    item: Item;
    index: number;
    onSelect: (m: Birthday) => void;
}) {
    const { m } = item;
    return (
        <button
            type="button"
            onClick={() => onSelect(m)}
            aria-label={`Gửi lời chúc sinh nhật tới ${m.full_name ?? "thành viên"}`}
            className="bd-anim relative flex w-full items-center gap-3.5 overflow-hidden rounded-3xl p-4 text-left active:scale-[0.98]"
            style={{
                background:
                    "linear-gradient(135deg,#f857a6 0%,#ec4899 55%,#a855f7 100%)",
                boxShadow: "0 8px 24px rgba(236,72,153,0.32)",
                animation: `bd-in .45s cubic-bezier(.22,1,.36,1) ${index * 80}ms both`,
                transition: "transform .15s ease",
            }}
        >
            {CONFETTI.map((p, i) => (
                <span
                    key={i}
                    className="bd-confetti bd-anim pointer-events-none absolute top-0"
                    style={
                        {
                            left: `${p.l}%`,
                            width: p.w,
                            height: p.h,
                            background: p.col,
                            borderRadius: 1.5,
                            opacity: 0,
                            "--bd-dx": `${p.dx}px`,
                            animation: `bd-confetti ${p.t}s linear ${p.d}s infinite`,
                        } as React.CSSProperties
                    }
                />
            ))}

            <span className="relative shrink-0">
                <BirthdayAvatar
                    url={m.avatar_url}
                    name={m.full_name}
                    size={56}
                    background="rgba(255,255,255,0.25)"
                    color="#fff"
                />
                <span
                    className="bd-anim absolute inset-0 rounded-full border-2 border-white/80"
                    style={{ animation: "bd-ring 1.9s ease-out infinite" }}
                />
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm shadow">
                    🎂
                </span>
            </span>

            <span className="relative min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-white/85">
                    Hôm nay sinh nhật 🎉
                </span>
                <span className="mt-0.5 block truncate text-base font-black leading-tight text-white">
                    {m.full_name}
                </span>
                <span className="mt-0.5 block text-xs text-white/85">
                    Chạm để gửi lời chúc
                </span>
            </span>
        </button>
    );
}

/* ───────────── Thẻ "Sắp tới" (cuộn ngang) ───────────── */
function UpcomingCard({
    item,
    index,
    onSelect,
}: {
    item: Item;
    index: number;
    onSelect: (m: Birthday) => void;
}) {
    const { m, day, month, diff, weekday } = item;
    const near = diff <= NEAR_DAYS;

    return (
        <button
            type="button"
            onClick={() => onSelect(m)}
            aria-label={`${m.full_name ?? "Thành viên"}, sinh nhật ${day}/${month + 1}`}
            className="bd-anim flex w-[108px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center active:scale-95"
            style={{
                background: near
                    ? `linear-gradient(160deg, ${c.warningSoft} 0%, ${alpha("warning", 14)} 100%), ${c.surface}`
                    : c.surface,
                border: `1px solid ${near ? alpha("warning", 40) : c.border}`,
                boxShadow: near ? undefined : c.shadow,
                animation: `bd-in .4s cubic-bezier(.22,1,.36,1) ${index * 60}ms both`,
                transition: "transform .15s ease",
            }}
        >
            <BirthdayAvatar
                url={m.avatar_url}
                name={m.full_name}
                size={48}
                background={near ? c.warningSoft : c.primarySoft}
                color={near ? c.warning : c.primary}
            />

            <span
                className="w-full text-[12px] font-bold leading-tight"
                style={{
                    color: c.text,
                    minHeight: "2.1em",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}
            >
                {m.full_name}
            </span>

            <span
                className="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                style={{
                    background: near ? c.warningSoft : c.surfaceMuted,
                    color: near ? c.warning : c.textMuted,
                }}
            >
                {weekday} · {day}/{month + 1}
            </span>

            <span
                className="text-[10px] font-semibold"
                style={{ color: near ? c.warning : c.textMuted }}
            >
                {relativeLabel(diff)}
            </span>
        </button>
    );
}

/* ───────────── Khu chính ───────────── */
export function BirthdaySection({
    birthdays,
    onSelect,
}: {
    birthdays: Birthday[];
    onSelect: (m: Birthday) => void;
}) {
    const [showPast, setShowPast] = useState(false);
    const { today, upcoming, past, monthLabel } = buildItems(birthdays);

    return (
        <section className="space-y-3">
            <style>{BD_CSS}</style>

            {/* Tiêu đề */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                        style={{
                            background: "linear-gradient(135deg, #f857a6, #ec4899)",
                            boxShadow: "0 2px 8px rgba(248,87,166,0.35)",
                        }}
                    >
                        🎂
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: c.textMuted }}>
                        Sinh nhật tháng {monthLabel}
                    </h3>
                </div>
                <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: c.pinkSoft, color: c.pink }}
                >
                    {birthdays.length} người
                </span>
            </div>

            {/* Hôm nay */}
            {today.length > 0 && (
                <div className="space-y-2.5">
                    {today.map((it, i) => (
                        <TodayCard
                            key={it.m.id ?? `t${i}`}
                            item={it}
                            index={i}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}

            {/* Sắp tới */}
            {upcoming.length > 0 && (
                <div className="space-y-2">
                    <p className="px-0.5 text-xs font-semibold" style={{ color: c.textMuted }}>
                        Sắp tới
                    </p>
                    <div className="bd-scroll flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
                        {upcoming.map((it, i) => (
                            <UpcomingCard
                                key={it.m.id ?? `u${i}`}
                                item={it}
                                index={i}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Đã qua (thu gọn) */}
            {past.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowPast((v) => !v)}
                        aria-expanded={showPast}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                        style={{ background: c.surfaceMuted, color: c.textMuted }}
                    >
                        <span>Đã qua · {past.length} người</span>
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-300 ${showPast ? "rotate-180" : ""}`}
                        />
                    </button>

                    <div
                        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                        style={{ gridTemplateRows: showPast ? "1fr" : "0fr" }}
                    >
                        <div className="overflow-hidden">
                            <div className="flex flex-wrap gap-2 pt-2.5">
                                {past.map((it) => (
                                    <button
                                        key={it.m.id ?? it.m.full_name}
                                        type="button"
                                        onClick={() => onSelect(it.m)}
                                        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[11px] font-semibold opacity-80 active:scale-95"
                                        style={{
                                            background: c.surface,
                                            border: `1px solid ${c.border}`,
                                            color: c.text,
                                            transition: "transform .15s ease",
                                        }}
                                    >
                                        <BirthdayAvatar
                                            url={it.m.avatar_url}
                                            name={it.m.full_name}
                                            size={24}
                                            background={c.primarySoft}
                                            color={c.primary}
                                        />
                                        <span className="max-w-[120px] truncate">
                                            {it.m.full_name}
                                        </span>
                                        <span style={{ color: c.textMuted }}>
                                            {it.day}/{it.month + 1}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
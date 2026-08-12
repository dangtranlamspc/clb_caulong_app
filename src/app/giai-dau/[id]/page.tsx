"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { guestShirtOrderApi } from "@/lib/api";
import {
    ArrowRight,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Clock3,
    ListChecks,
    Loader2,
    MapPin,
    Scale,
    ShieldCheck,
    Target,
    Trophy,
    Users,
    Wallet as WalletIcon,
} from "lucide-react";

/**
 * REDESIGN
 * Premium badminton tournament landing page:
 * - Hero ảnh lớn + gradient tối, thay cho poster dạng editorial cũ.
 * - Card kính / border mờ, hierarchy rõ hơn.
 * - Desktop: nội dung 2 cột, sidebar thông tin giải đấu sticky.
 * - Mobile: stack tự nhiên, CTA luôn nổi ở đáy.
 * - Giữ nguyên toàn bộ data/API/business logic của trang cũ.
 */

function formatCurrency(n: number) {
    return (n ?? 0).toLocaleString("vi-VN") + "đ";
}

function formatDateTime(iso?: string | null) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

function useCountdown(target?: string | null) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    if (!target) return null;

    const diff = new Date(target).getTime() - now;
    if (diff <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0 };

    return {
        done: false,
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
    };
}

function StatCard({
    value,
    label,
    icon,
    accent = "red",
}: {
    value: string | number;
    label: string;
    icon: React.ReactNode;
    accent?: "red" | "gold" | "dark";
}) {
    const accentClass =
        accent === "gold"
            ? "text-[#F7C65B] bg-[#F7C65B]/10 border-[#F7C65B]/20"
            : accent === "dark"
                ? "text-white bg-white/10 border-white/10"
                : "text-[#FF5969] bg-[#FF5969]/10 border-[#FF5969]/20";

    return (
        <div className="group rounded-2xl border border-black/[0.07] bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl border ${accentClass}`}>
                {icon}
            </div>
            <div className="text-2xl font-black tracking-tight text-[#151313] sm:text-3xl">
                {value}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C8580]">
                {label}
            </div>
        </div>
    );
}

function SectionCard({
    icon,
    eyebrow,
    title,
    children,
    accent = "red",
}: {
    icon: React.ReactNode;
    eyebrow?: string;
    title: string;
    children: React.ReactNode;
    accent?: "red" | "gold" | "dark";
}) {
    const iconClass =
        accent === "gold"
            ? "border-[#F0B23E]/30 bg-[#F0B23E]/10 text-[#B8791E]"
            : accent === "dark"
                ? "border-black/10 bg-[#1A1715] text-white"
                : "border-[#D91C2E]/20 bg-[#D91C2E]/[0.07] text-[#D91C2E]";

    return (
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-[0_12px_40px_rgba(28,20,16,0.045)] sm:p-7">
            <div className="mb-6 flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconClass}`}>
                    {icon}
                </div>
                <div>
                    {eyebrow && (
                        <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A19A94]">
                            {eyebrow}
                        </p>
                    )}
                    <h2 className="text-xl font-black tracking-tight text-[#171413] sm:text-2xl">
                        {title}
                    </h2>
                </div>
            </div>
            {children}
        </section>
    );
}

function RosterRow({
    index,
    role,
    level,
}: {
    index: number;
    role: string;
    level?: string | null;
}) {
    const isNu = role === "nu";

    return (
        <div className="flex items-center gap-3 px-4 py-3.5">
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${isNu
                    ? "bg-[#D91C2E]/10 text-[#D91C2E]"
                    : "bg-black/[0.045] text-[#27211E]"
                    }`}
            >
                {index}
            </div>
            <div>
                <p className="text-sm font-bold text-[#201B18]">
                    {isNu ? "Nữ" : "Nam"}
                </p>
                <p className="text-[11px] text-[#99918A]">
                    Vị trí {index}
                </p>
            </div>
            {level && (
                <span className="ml-auto rounded-full bg-[#F7F3EF] px-3 py-1 text-[11px] font-bold text-[#625A54]">
                    Trình {level}
                </span>
            )}
        </div>
    );
}

function InfoLine({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.045] text-[#D91C2E]">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A928C]">
                    {label}
                </p>
                <div className="mt-0.5 text-sm font-semibold leading-6 text-[#29221F]">
                    {value}
                </div>
            </div>
        </div>
    );
}

function Accordion({
    title,
    icon,
    children,
    defaultOpen = false,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-[#FBF9F7]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[#F5F1EE]"
            >
                <span className="flex items-center gap-2.5 text-sm font-bold text-[#29221F]">
                    <span className="text-[#D91C2E]">{icon}</span>
                    {title}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#D91C2E] transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {open && (
                <div
                    className="border-t border-black/[0.06] px-4 py-5 text-sm leading-7 text-[#554D47] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                        __html: typeof children === "string" ? children : "",
                    }}
                />
            )}
        </div>
    );
}

function CountdownBox({
    value,
    label,
    size = "md",
}: {
    value: number;
    label: string;
    size?: "sm" | "md";
}) {
    const isSm = size === "sm";
    return (
        <div
            className={`flex flex-col items-center justify-center border border-[#E7B84B]/25 bg-[#E7B84B]/[.06] ${isSm ? "w-11 py-2" : "flex-1 py-3"
                }`}
        >
            <span
                className={`condensed font-black leading-none text-white tabular-nums ${isSm ? "text-lg" : "text-2xl"
                    }`}
            >
                {String(value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-[.14em] text-white/40">
                {label}
            </span>
        </div>
    );
}

export default function TournamentLandingPage() {
    const params = useParams<{ id: string }>();
    const activityId = params?.id;
    const router = useRouter();

    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!activityId) return;

        setLoading(true);
        guestShirtOrderApi
            .getActivity(activityId)
            .then(({ data }) => {
                if (data.type !== "tournament") {
                    setLoadError("Hoạt động này không phải giải đấu.");
                    return;
                }
                setActivity(data);
            })
            .catch((err) => {
                setLoadError(
                    err?.response?.data?.message ||
                    "Không tải được thông tin giải đấu",
                );
            })
            .finally(() => setLoading(false));
    }, [activityId]);

    const composition: any[] = activity?.detail?.composition ?? [];
    const matchContents: { id: string; label: string }[] =
        activity?.detail?.rules?.match_contents ?? [];
    const entryFee: number = activity?.detail?.entry_fee_per_person ?? 0;
    const hasFee = entryFee > 0;
    const maxTeams: number = activity?.detail?.max_teams ?? 0;
    const teamSize: number =
        activity?.detail?.team_size ?? composition.length;
    const rules = activity?.detail?.rules ?? {};
    const scoring = rules?.scoring ?? {};

    const hasNamRole = composition.some((c) => c.role === "nam");
    const hasNuRole = composition.some((c) => c.role === "nu");

    const contentSummary = useMemo(() => {
        if (matchContents.length) {
            return matchContents.map((m) => m.label).join(" · ");
        }

        const parts: string[] = [];

        if (hasNamRole) {
            const levels = [
                ...new Set(
                    composition
                        .filter((c) => c.role === "nam")
                        .map((c) => c.level),
                ),
            ];
            parts.push(
                `Nam${levels.length ? ` (${levels.join(", ")})` : ""}`,
            );
        }

        if (hasNuRole) parts.push("Nữ");

        return parts.join(" · ") || "—";
    }, [matchContents, composition, hasNamRole, hasNuRole]);

    const countdown = useCountdown(activity?.event_date);
    const deadlineCountdown = useCountdown(
        activity?.deadline ?? activity?.registration_end_date,
    );
    const isClosed = activity?.status && activity.status !== "open";

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F2EF]">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D91C2E] text-white shadow-xl shadow-[#D91C2E]/20">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                    <p className="text-sm font-semibold text-[#8C8580]">
                        Đang tải giải đấu...
                    </p>
                </div>
            </div>
        );
    }

    if (loadError || !activity) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F5F2EF] px-4">
                <div className="w-full max-w-md rounded-[28px] border border-black/[0.07] bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D91C2E]/10 text-[#D91C2E]">
                        <Trophy className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-[#7A736A]">
                        {loadError || "Không tìm thấy giải đấu"}
                    </p>
                    <button
                        type="button"
                        onClick={() => router.push("/activities")}
                        className="mt-6 rounded-full bg-[#171413] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#2C2622]"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    const registerPath = `/giai-dau/${activityId}/dang-ky`;

    return (
        <main className="min-h-screen bg-[#0B0B0C] text-[#171717] pb-28">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

                .champ-page { font-family: 'Be Vietnam Pro', sans-serif; }
                .condensed { font-family: 'Barlow Condensed', sans-serif; }
                .hero-reveal { animation: heroReveal .75s cubic-bezier(.22,1,.36,1) both; }
                .hero-reveal-2 { animation: heroReveal .75s .12s cubic-bezier(.22,1,.36,1) both; }
                .hero-reveal-3 { animation: heroReveal .75s .22s cubic-bezier(.22,1,.36,1) both; }

                @keyframes heroReveal {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes drift {
                    0%,100% { transform: translate3d(0,0,0) rotate(-8deg); }
                    50% { transform: translate3d(18px,-8px) rotate(-4deg); }
                }

                .drift { animation: drift 7s ease-in-out infinite; }

                @media (prefers-reduced-motion: reduce) {
                    .hero-reveal,.hero-reveal-2,.hero-reveal-3,.drift { animation:none; }
                }
            `}</style>

            <div className="champ-page">
                {/* HERO / CHAMPIONSHIP STAGE */}
                <section className="relative overflow-hidden bg-[#0B0B0C] text-white">
                    {activity.cover_image_url && (
                        <img
                            src={activity.cover_image_url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-55"
                        />
                    )}

                    <div className="absolute inset-0 bg-[linear-gradient(90deg,#080808_0%,rgba(8,8,8,.86)_34%,rgba(8,8,8,.34)_72%,rgba(8,8,8,.82)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.2),#0B0B0C_98%)]" />

                    {/* graphic court lines */}
                    <div className="pointer-events-none absolute -right-20 top-20 h-[520px] w-[520px] rotate-[-14deg] border-[1px] border-white/10 sm:h-[700px] sm:w-[700px]">
                        <div className="absolute left-1/2 top-0 h-full border-l border-white/10" />
                        <div className="absolute left-0 right-0 top-1/2 border-t border-white/10" />
                        <div className="absolute left-[18%] right-[18%] top-1/2 border-t border-white/10" />
                    </div>
                    <div className="drift pointer-events-none absolute right-[12%] top-[23%] hidden h-28 w-28 rounded-full border border-[#E7B84B]/30 sm:block" />

                    <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-7 sm:px-8 lg:px-10 lg:pb-20 lg:pt-9">

                        <div className="grid min-h-[650px] items-end gap-12 pt-24 lg:grid-cols-[minmax(0,1fr)_280px] lg:pt-28">
                            <div>
                                <div className="hero-reveal mb-7 flex items-center gap-3">
                                    <span className="h-[2px] w-10 bg-[#D91C2E]" />
                                    <span className="text-[10px] font-extrabold uppercase tracking-[.25em] text-[#E7B84B]">
                                        Mùa giải 2026
                                    </span>
                                </div>

                                <h1 className="hero-reveal condensed max-w-5xl text-[62px] font-black uppercase leading-[.82] tracking-[-.025em] sm:text-[94px] lg:text-[128px]">
                                    {activity.title}
                                </h1>

                                {activity.description && (
                                    <p className="hero-reveal-2 mt-8 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
                                        {activity.description}
                                    </p>
                                )}

                                <div className="hero-reveal-2 mt-8 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-white/70">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-[#D91C2E]" />
                                        {formatDateTime(activity.event_date)}
                                    </span>
                                    {activity.location && (
                                        <span className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-[#D91C2E]" />
                                            {activity.location}
                                        </span>
                                    )}
                                </div>

                                <div className="hero-reveal-3 mt-10 flex flex-wrap items-center gap-4">
                                    <button
                                        type="button"
                                        disabled={isClosed}
                                        onClick={() => router.push(registerPath)}
                                        className="group inline-flex items-center gap-4 bg-[#D91C2E] px-7 py-4 text-xs font-extrabold uppercase tracking-[.12em] text-white transition hover:bg-[#F02B3D] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isClosed ? "Đã đóng đăng ký" : "Đăng ký tham gia"}
                                        {!isClosed && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
                                    </button>

                                    {!isClosed && countdown && !countdown.done && (
                                        <div className="border-l border-white/20 pl-4">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">
                                                Khai mạc sau
                                            </p>
                                            <div className="flex gap-1.5">
                                                <CountdownBox value={countdown.d} label="Ngày" size="sm" />
                                                <CountdownBox value={countdown.h} label="Giờ" size="sm" />
                                                <CountdownBox value={countdown.m} label="Phút" size="sm" />
                                                <CountdownBox value={countdown.s} label="Giây" size="sm" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden border-l border-white/10 pl-7 lg:block">
                                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-white/35">
                                    Tournament data
                                </p>
                                <div className="mt-8 space-y-7">
                                    <div>
                                        <p className="condensed text-5xl font-black leading-none text-[#E7B84B]">
                                            {matchContents.length || "—"}
                                        </p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Nội dung</p>
                                    </div>
                                    <div>
                                        <p className="condensed text-5xl font-black leading-none">
                                            {maxTeams ? maxTeams * teamSize : "—"}
                                        </p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Vận động viên</p>
                                    </div>
                                    <div>
                                        <p className="condensed text-5xl font-black leading-none">
                                            {teamSize || "—"}
                                        </p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Người / đội</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative border-y border-white/10 bg-white/[.025]">
                        <div className="mx-auto flex max-w-7xl overflow-x-auto px-5 sm:px-8 lg:px-10">
                            {[
                                ["01", "Thể thức", "sec-the-thuc"],
                                ["02", "Đội hình", "sec-doi-hinh"],
                                ["03", "Bốc thăm", "sec-boc-tham"],
                                ["04", "Xếp hạng", "sec-xep-hang"],
                                ["05", "Lệ phí", "sec-le-phi"],
                                ["06", "Điều lệ", "sec-dieu-le"],
                            ].map(([n, label, targetId]) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                        document
                                            .getElementById(targetId)
                                            ?.scrollIntoView({ behavior: "smooth", block: "start" })
                                    }
                                    className="flex min-w-max items-center gap-3 border-r border-white/10 px-5 py-4 text-left transition-colors hover:bg-white/[.06] first:pl-0"
                                >
                                    <span className="condensed text-sm font-bold text-[#D91C2E]">{n}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-[.16em] text-white/45">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CONTENT */}
                <section className="bg-[#F3F0EB]">
                    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-10 lg:py-20">
                        <div className="space-y-0">
                            {/* 01 */}
                            <section id="sec-the-thuc" className="scroll-mt-6 border-b border-black/10 pb-12">
                                <div className="flex gap-6">
                                    <div className="hidden shrink-0 sm:block">
                                        <span className="condensed text-6xl font-black leading-none text-[#D91C2E]/20">01</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-6 flex items-center gap-3">
                                            <Target className="h-5 w-5 text-[#D91C2E]" />
                                            <div>
                                                <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Competition</p>
                                                <h2 className="condensed text-3xl font-black uppercase tracking-tight">Thể thức thi đấu</h2>
                                            </div>
                                        </div>
                                        {rules.format_content ? (
                                            <div
                                                className="prose prose-sm max-w-none text-sm leading-7 text-[#554E48]"
                                                dangerouslySetInnerHTML={{ __html: rules.format_content }}
                                            />
                                        ) : (
                                            <p className="text-sm text-[#9C9187]">BTC sẽ cập nhật thể thức chi tiết trước ngày thi đấu.</p>
                                        )}
                                        {(scoring.points_per_set || scoring.set_type) && (
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                {scoring.set_type && <span className="bg-[#171515] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">{scoring.set_type}</span>}
                                                {scoring.points_per_set && <span className="bg-[#E7B84B] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#171515]">{scoring.points_per_set} điểm/set</span>}
                                                {scoring.win_margin != null && <span className="bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4A433E]">Thắng cách {scoring.win_margin}</span>}
                                                {scoring.max_score && <span className="bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#4A433E]">Tối đa {scoring.max_score} điểm</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* 02 */}
                            <section id="sec-doi-hinh" className="scroll-mt-6 border-b border-black/10 py-12">
                                <div className="flex gap-6">
                                    <div className="hidden shrink-0 sm:block">
                                        <span className="condensed text-6xl font-black leading-none text-black/10">02</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-5 flex items-center gap-3">
                                            <Users className="h-5 w-5 text-[#171515]" />
                                            <div>
                                                <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Team setup</p>
                                                <h2 className="condensed text-3xl font-black uppercase tracking-tight">Cơ cấu đội hình</h2>
                                            </div>
                                        </div>
                                        <p className="mb-6 text-sm leading-6 text-[#766E67]">
                                            Mỗi đội <strong className="text-[#171515]">{teamSize}</strong> người · {contentSummary}
                                        </p>
                                        {composition.length > 0 ? (
                                            <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
                                                {composition.map((c, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-[#F9F7F3] px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`condensed text-xl font-bold ${c.role === "nu" ? "text-[#D91C2E]" : "text-[#171515]"}`}>{String(idx + 1).padStart(2, "0")}</span>
                                                            <span className="text-sm font-bold">{c.role === "nu" ? "Nữ" : "Nam"}</span>
                                                        </div>
                                                        {c.role === "nam" && c.level && (
                                                            <span className="text-[9px] font-extrabold uppercase tracking-wide text-[#8B827A]">Trình {c.level}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[#9C9187]">Chưa có thông tin cơ cấu đội hình.</p>
                                        )}
                                        {!!maxTeams && (
                                            <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-[#9B938B]">
                                                Tối đa {maxTeams} đội đăng ký
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* 03 */}
                            {(rules.captain_female_content || rules.draw_teams_content) && (
                                <section id="sec-boc-tham" className="scroll-mt-6 border-b border-black/10 py-12">
                                    <div className="flex gap-6">
                                        <div className="hidden shrink-0 sm:block"><span className="condensed text-6xl font-black leading-none text-[#E7B84B]/50">03</span></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-6 flex items-center gap-3">
                                                <ShieldCheck className="h-5 w-5 text-[#B98216]" />
                                                <div>
                                                    <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Tournament setup</p>
                                                    <h2 className="condensed text-3xl font-black uppercase tracking-tight">Đội trưởng & bốc thăm</h2>
                                                </div>
                                            </div>
                                            <div className="grid gap-8 sm:grid-cols-2">
                                                {rules.captain_female_content && (
                                                    <div>
                                                        <p className="mb-3 border-l-2 border-[#D91C2E] pl-3 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#8C837B]">Đội trưởng nữ</p>
                                                        <div className="prose prose-sm max-w-none text-sm leading-7 text-[#554E48]" dangerouslySetInnerHTML={{ __html: rules.captain_female_content }} />
                                                    </div>
                                                )}
                                                {rules.draw_teams_content && (
                                                    <div>
                                                        <p className="mb-3 border-l-2 border-[#E7B84B] pl-3 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#8C837B]">Bốc thăm chia đội</p>
                                                        <div className="prose prose-sm max-w-none text-sm leading-7 text-[#554E48]" dangerouslySetInnerHTML={{ __html: rules.draw_teams_content }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* 04 */}
                            {rules.ranking_rules_content && (
                                <section id="sec-xep-hang" className="scroll-mt-6 border-b border-black/10 py-12">
                                    <div className="flex gap-6">
                                        <div className="hidden shrink-0 sm:block"><span className="condensed text-6xl font-black leading-none text-[#E7B84B]/50">04</span></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-6 flex items-center gap-3">
                                                <Trophy className="h-5 w-5 text-[#B98216]" />
                                                <div>
                                                    <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Ranking</p>
                                                    <h2 className="condensed text-3xl font-black uppercase tracking-tight">Cách xếp hạng</h2>
                                                </div>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-sm leading-7 text-[#554E48]" dangerouslySetInnerHTML={{ __html: rules.ranking_rules_content }} />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* 05 */}
                            {hasFee && (
                                <section id="sec-le-phi" className="scroll-mt-6 border-b border-black/10 py-12">
                                    <div className="flex gap-6">
                                        <div className="hidden shrink-0 sm:block"><span className="condensed text-6xl font-black leading-none text-[#D91C2E]/20">05</span></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-6 flex items-center gap-3">
                                                <WalletIcon className="h-5 w-5 text-[#D91C2E]" />
                                                <div>
                                                    <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Registration</p>
                                                    <h2 className="condensed text-3xl font-black uppercase tracking-tight">Lệ phí thi đấu</h2>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-between gap-5 bg-[#171515] p-6 text-white sm:flex-row sm:items-end">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/35">Entry fee</p>
                                                    <p className="condensed mt-1 text-5xl font-black text-[#E7B84B]">{formatCurrency(entryFee)}</p>
                                                </div>
                                                <p className="max-w-xs text-xs leading-6 text-white/50">/ người · thanh toán ở bước đăng ký tiếp theo</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* 06 */}
                            {rules.rules_content && (
                                <section id="sec-dieu-le" className="scroll-mt-6 pt-12">
                                    <div className="flex gap-6">
                                        <div className="hidden shrink-0 sm:block"><span className="condensed text-6xl font-black leading-none text-black/10">06</span></div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-6 flex items-center gap-3">
                                                <Scale className="h-5 w-5 text-[#171515]" />
                                                <div>
                                                    <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#A49D95]">Regulations</p>
                                                    <h2 className="condensed text-3xl font-black uppercase tracking-tight">Điều lệ giải đấu</h2>
                                                </div>
                                            </div>
                                            <Accordion title="Xem điều lệ chi tiết" icon={<ListChecks className="h-4 w-4" />}>
                                                {rules.rules_content}
                                            </Accordion>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* REGISTRATION RAIL */}
                        <aside className="lg:block">
                            <div className="lg:sticky lg:top-6">
                                <div className="overflow-hidden bg-[#171515] text-white">
                                    <div className="h-1.5 bg-[#D91C2E]" />
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-white/35">Registration</p>
                                                <h3 className="condensed mt-2 text-4xl font-black uppercase leading-none">Tham gia<br />giải đấu</h3>
                                            </div>
                                            <Trophy className="h-6 w-6 text-[#E7B84B]" />
                                        </div>

                                        <div className="mt-8 space-y-5 border-t border-white/10 pt-6">
                                            <div className="flex gap-3">
                                                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#D91C2E]" />
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/30">Ngày thi đấu</p>
                                                    <p className="mt-1 text-xs font-semibold text-white/80">{formatDateTime(activity.event_date)}</p>
                                                </div>
                                            </div>
                                            {activity.location && (
                                                <div className="flex gap-3">
                                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D91C2E]" />
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/30">Địa điểm</p>
                                                        <p className="mt-1 text-xs font-semibold leading-5 text-white/80">{activity.location}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#D91C2E]" />
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/30">Quy mô</p>
                                                    <p className="mt-1 text-xs font-semibold text-white/80">{maxTeams ? `${maxTeams} đội · ` : ""}{teamSize} người/đội</p>
                                                </div>
                                            </div>
                                        </div>

                                        {!isClosed && deadlineCountdown && !deadlineCountdown.done && (
                                            <div className="mt-7 border border-[#E7B84B]/25 bg-[#E7B84B]/[.08] p-4">
                                                <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[.15em] text-[#E7B84B]">
                                                    <Clock3 className="h-3.5 w-3.5" /> Hạn đăng ký
                                                </div>
                                                <div className="mt-3 grid grid-cols-4 gap-1.5">
                                                    <CountdownBox value={deadlineCountdown.d} label="Ngày" />
                                                    <CountdownBox value={deadlineCountdown.h} label="Giờ" />
                                                    <CountdownBox value={deadlineCountdown.m} label="Phút" />
                                                    <CountdownBox value={deadlineCountdown.s} label="Giây" />
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            disabled={isClosed}
                                            onClick={() => router.push(registerPath)}
                                            className="mt-7 flex w-full items-center justify-center gap-3 bg-[#D91C2E] px-5 py-4 text-xs font-extrabold uppercase tracking-[.12em] transition hover:bg-[#F02B3D] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {isClosed ? "Đã đóng đăng ký" : "Đăng ký ngay"}
                                            {!isClosed && <ArrowRight className="h-4 w-4" />}
                                        </button>

                                        <p className="mt-4 text-center text-[9px] font-medium text-white/30">
                                            {hasFee ? `${formatCurrency(entryFee)} / người` : "Miễn phí tham gia"}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 border border-black/10 bg-white p-5">
                                    <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-[#A49D95]">Quick facts</p>
                                    <div className="mt-5 grid grid-cols-2 gap-px bg-black/10">
                                        <div className="bg-white p-4">
                                            <p className="condensed text-3xl font-black">{matchContents.length || "—"}</p>
                                            <p className="mt-1 text-[8px] font-bold uppercase tracking-[.12em] text-[#9A9189]">Nội dung</p>
                                        </div>
                                        <div className="bg-white p-4">
                                            <p className="condensed text-3xl font-black">{teamSize || "—"}</p>
                                            <p className="mt-1 text-[8px] font-bold uppercase tracking-[.12em] text-[#9A9189]">Người / đội</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>

                {/* MOBILE CTA */}
                <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:hidden">
                    <div className="mx-auto flex max-w-xl items-center gap-3 border border-white/10 bg-[#111112]/95 p-2 shadow-[0_-12px_40px_rgba(0,0,0,.25)] backdrop-blur-xl">
                        <div className="min-w-0 flex-1 pl-2">
                            <p className="truncate text-xs font-bold text-white">{isClosed ? "Đã đóng đăng ký" : "Sẵn sàng tham gia?"}</p>
                            <p className="truncate text-[9px] text-white/40">
                                {isClosed ? "Không nhận đăng ký mới" : hasFee ? `${formatCurrency(entryFee)} / người` : "Miễn phí tham gia"}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={isClosed}
                            onClick={() => router.push(registerPath)}
                            className="flex shrink-0 items-center gap-2 bg-[#D91C2E] px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-white disabled:opacity-40"
                        >
                            Đăng ký
                            {!isClosed && <ArrowRight className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
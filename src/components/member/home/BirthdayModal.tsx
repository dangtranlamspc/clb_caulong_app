"use client";

import { createPortal } from "react-dom";
import { X, Cake, PartyPopper, Sparkles, Send, Gift } from "lucide-react";
import { useEffect, useState } from "react";

interface Member {
    id: string;
    full_name?: string;
    date_of_birth: string | Date;
    avatar_url?: string;
    level?: string | number;
}

interface BirthdayModalProps {
    open: boolean;
    member: Member | null;
    currentUserId?: string;
    onClose: () => void;
    onSendWishes?: (memberId: string, message: string) => Promise<void> | void;
}

const CONFETTI_COLORS = [
    "#f857a6", "#fbbf24", "#60a5fa", "#34d399",
    "#a78bfa", "#fb7185", "#38bdf8", "#f43f5e"
];

const FLOATERS = ["🎈", "✨", "🎉", "⭐", "🎊", "🎁"];

export function BirthdayModal({ open, member, currentUserId, onClose, onSendWishes }: BirthdayModalProps) {
    const [confetti, setConfetti] = useState<
        { id: number; left: number; delay: number; duration: number; color: string; size: number; rotate: number }[]
    >([]);
    const [sparks, setSparks] = useState<
        { id: number; angle: number; distance: number; delay: number; color: string }[]
    >([]);
    const [wishText, setWishText] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (!open) {
            setSent(false);
            setSending(false);
            setWishText("");
            return;
        }

        setConfetti(
            Array.from({ length: 40 }).map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 1.2,
                duration: 2.5 + Math.random() * 2,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                size: 6 + Math.random() * 6,
                rotate: Math.random() * 360,
            }))
        );

        setSparks(
            Array.from({ length: 16 }).map((_, i) => ({
                id: i,
                angle: (360 / 16) * i,
                distance: 65 + Math.random() * 30,
                delay: (i % 4) * 0.06,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            }))
        );
    }, [open]);

    if (!open || !member) return null;

    const dob = new Date(member.date_of_birth);
    const day = dob.getDate();
    const month = dob.getMonth() + 1;
    const today = new Date();

    const isOwnBirthday = !!currentUserId && currentUserId === member.id;

    const isToday = day === today.getDate() && month === today.getMonth() + 1;
    const isPast =
        !isToday &&
        (month < today.getMonth() + 1 ||
            (month === today.getMonth() + 1 && day < today.getDate()));

    const initials =
        member.full_name
            ?.split(" ")
            .filter(Boolean)
            .slice(-2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() ?? "?";

    const handleSend = async () => {
        if (!wishText.trim() || sending) return;
        setSending(true);
        try {
            await onSendWishes?.(member.id, wishText.trim());
            setSent(true);
        } catch {
        } finally {
            setSending(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 transition-all duration-300"
            onClick={onClose}
            style={{ animation: "fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
            <div
                className="rounded-[2.5rem] w-full max-w-sm overflow-hidden relative shadow-2xl bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
                style={{
                    animation: "modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: isToday
                        ? "0 25px 50px -12px rgba(248, 87, 166, 0.35), 0 0 0 1px rgba(248, 87, 166, 0.15)"
                        : "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 z-30 w-8 h-8 rounded-full bg-slate-900/20 hover:bg-slate-900/40 dark:bg-black/40 dark:hover:bg-black/60 flex items-center justify-center backdrop-blur-md transition-all text-white active:scale-95"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div
                    className="h-40 relative overflow-hidden flex items-center justify-center"
                    style={{
                        background: isToday
                            ? "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%)"
                            : isPast
                                ? "linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)"
                                : "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
                        backgroundSize: "200% 200%",
                        animation: "gradientShift 8s ease infinite",
                    }}
                >
                    <div
                        className="absolute inset-0 opacity-40 mix-blend-overlay"
                        style={{
                            background: "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.8), transparent 70%)",
                        }}
                    />
                    <div className="absolute -top-12 -left-10 w-36 h-36 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute -bottom-10 -right-8 w-40 h-40 rounded-full bg-white/15 blur-xl" />

                    {isToday &&
                        confetti.map((c) => (
                            <span
                                key={c.id}
                                className="absolute top-0 rounded-sm pointer-events-none"
                                style={{
                                    left: `${c.left}%`,
                                    width: c.size,
                                    height: c.size * 0.4,
                                    backgroundColor: c.color,
                                    animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
                                    transform: `rotate(${c.rotate}deg)`,
                                }}
                            />
                        ))}

                    {isToday &&
                        FLOATERS.map((emoji, i) => (
                            <span
                                key={i}
                                className="absolute text-xl pointer-events-none select-none drop-shadow-md"
                                style={{
                                    left: `${8 + i * 15}%`,
                                    top: `${12 + (i % 3) * 18}%`,
                                    animation: `floatBob ${2.4 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
                                }}
                            >
                                {emoji}
                            </span>
                        ))}
                </div>

                <div className="px-6 pb-6 -mt-16 flex flex-col items-center text-center relative z-10">
                    <div className="relative w-28 h-28">
                        {isToday &&
                            sparks.map((s) => {
                                const rad = (s.angle * Math.PI) / 180;
                                const x = Math.cos(rad) * s.distance;
                                const y = Math.sin(rad) * s.distance;
                                return (
                                    <span
                                        key={s.id}
                                        className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
                                        style={{
                                            width: 6,
                                            height: 6,
                                            backgroundColor: s.color,
                                            boxShadow: `0 0 8px ${s.color}`,
                                            animation: `burst 1.6s ease-out ${s.delay}s infinite`,
                                            willChange: "transform, opacity",
                                            ["--tx" as any]: `${x}px`,
                                            ["--ty" as any]: `${y}px`,
                                        }}
                                    />
                                );
                            })}

                        <div
                            className="absolute inset-0 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center font-extrabold text-3xl overflow-hidden shadow-xl"
                            style={{
                                background: member.avatar_url
                                    ? "transparent"
                                    : "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                                color: "#0284c7",
                                animation: isToday ? "avatarPulse 2.5s ease-in-out infinite" : undefined,
                            }}
                        >
                            {member.avatar_url ? (
                                <img
                                    src={member.avatar_url}
                                    alt={member.full_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : isToday ? (
                                <span className="text-4xl">🎂</span>
                            ) : (
                                initials
                            )}
                        </div>
                    </div>

                    {isToday ? (
                        <div
                            className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm"
                            style={{
                                background: "linear-gradient(90deg, #f43f5e, #ec4899, #f43f5e)",
                                backgroundSize: "200% auto",
                                color: "#ffffff",
                                animation: "textShine 3s linear infinite",
                            }}
                        >
                            <PartyPopper className="w-3.5 h-3.5" />
                            <span>Chúc Mừng Sinh Nhật</span>
                            <PartyPopper className="w-3.5 h-3.5 scale-x-[-1]" />
                        </div>
                    ) : isPast ? (
                        <div className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Cake className="w-3.5 h-3.5 text-slate-400" />
                            <span>Đã qua ngày sinh nhật</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-slate-400 dark:text-slate-500">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Sắp tới sinh nhật</span>
                        </div>
                    )}

                    <h3 className="mt-2 text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                        {member.full_name}
                    </h3>

                    <div
                        className={`flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${isToday
                            ? "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/40"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                    >
                        <Cake className={`w-3.5 h-3.5 ${isToday ? "text-pink-500" : "text-slate-400"}`} />
                        <span>
                            {day} tháng {month}
                            {isToday && " · Hôm nay 🎉"}
                        </span>
                    </div>

                    {member.level && (
                        <span className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Cấp độ: <span className="text-slate-600 dark:text-slate-300 font-semibold">{member.level}</span>
                        </span>
                    )}

                    {isToday && !isOwnBirthday && (
                        <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {sent ? (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
                                    <Gift className="w-4 h-4 animate-bounce" />
                                    <span>Đã gửi lời chúc yêu thương! ❤️</span>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Viết lời chúc..."
                                        value={wishText}
                                        onChange={(e) => setWishText(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        disabled={sending}
                                        className="flex-1 px-4 py-3 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all disabled:opacity-60"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!wishText.trim() || sending}
                                        className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 text-white rounded-2xl transition-all shadow-md shadow-pink-500/25 flex items-center justify-center active:scale-95"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isToday && isOwnBirthday && (
                        <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                Hôm nay là sinh nhật của bạn 🎂 Chúc bạn thật nhiều niềm vui!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalPop {
                    from { opacity: 0; transform: scale(0.9) translateY(12px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes gradientShift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes confettiFall {
                    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(180px) rotate(360deg); opacity: 0; }
                }
                @keyframes floatBob {
                    0%, 100% { transform: translateY(0) rotate(-3deg); }
                    50% { transform: translateY(-10px) rotate(3deg); }
                }
                @keyframes avatarPulse {
                    0%, 100% { box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.4); }
                    50% { box-shadow: 0 15px 35px 0px rgba(244, 63, 94, 0.7); }
                }
                @keyframes textShine {
                    to { background-position: 200% center; }
                }
                @keyframes burst {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% {
                        transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.1);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
}
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Loader2, Check, CheckCheck, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuthStore } from "@/store/auth.store";
import { feedbackApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

type Feedback = {
    id: string;
    message: string;
    is_read: boolean;
    created_at: string;
};

type FlyingPlane = { id: number; x: number; y: number; dx: number; dy: number };

const NAVY_GRADIENT = "linear-gradient(135deg,#1d3a5f,#12283f)";
const MAX_LEN = 500;
const TRANSITION_MS = 340;
const PLANE_FLIGHT_MS = 2000;

const LOOP_RADIUS = 42;
const LOOPS = 1.5;
const LOOP_END_FRAC = 0.55;

function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

const ICON_BASE_ANGLE = 45;

function bearingDeg(vx: number, vy: number) {
    return (Math.atan2(vx, -vy) * 180) / Math.PI;
}

function planeStateAt(rawT: number, dx: number, dy: number) {

    if (rawT <= LOOP_END_FRAC) {
        const u = rawT / LOOP_END_FRAC;
        const angle = u * LOOPS * 2 * Math.PI;
        const x = LOOP_RADIUS * Math.sin(angle);
        const y = -LOOP_RADIUS * (1 - Math.cos(angle));

        const vx = Math.cos(angle);
        const vy = -Math.sin(angle);
        const rot = bearingDeg(vx, vy) - ICON_BASE_ANGLE;

        return { x, y, rot, scale: 1, opacity: 1 };
    }

    const v = (rawT - LOOP_END_FRAC) / (1 - LOOP_END_FRAC);
    const ve = easeOutCubic(v);

    const lastAngle = LOOPS * 2 * Math.PI;
    const lastX = LOOP_RADIUS * Math.sin(lastAngle);
    const lastY = -LOOP_RADIUS * (1 - Math.cos(lastAngle));

    const x = lastX + (dx - lastX) * ve;
    const y = lastY + (dy - lastY) * ve;

    const vx2 = dx - lastX;
    const vy2 = dy - lastY;
    const rot = bearingDeg(vx2, vy2) - ICON_BASE_ANGLE;

    const scale = 1 - ve * 0.75;
    const opacity = v < 0.75 ? 1 : 1 - (v - 0.75) / 0.25;

    return { x, y, rot, scale, opacity };
}

export function FeedbackWidget() {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Feedback[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [flyingPlane, setFlyingPlane] = useState<FlyingPlane | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sendBtnRef = useRef<HTMLButtonElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const planeDotRef = useRef<HTMLDivElement>(null);
    const planeSeqRef = useRef(0);
    const planeRafRef = useRef<number | null>(null);

    const fetchMine = useCallback(async () => {
        try {
            const { data } = await feedbackApi.getMine();
            setItems(data ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`feedback-status:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "feedback_messages",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const row = payload.new as Feedback;
                    setItems((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_read: row.is_read } : f)));
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    useEffect(() => {
        if (!open) return;
        const el = sheetRef.current;
        if (el) {
            void el.offsetHeight
        }
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, [open]);

    const openWidget = () => {
        setOpen(true);
        setLoading(true);
        fetchMine();
    };
    const closeWidget = () => {
        setVisible(false);
        setTimeout(() => setOpen(false), TRANSITION_MS);
    };

    useEffect(() => {
        if (!flyingPlane) return;
        const start = performance.now();
        const { dx, dy } = flyingPlane;

        const tick = (now: number) => {
            const rawT = Math.min(1, (now - start) / PLANE_FLIGHT_MS);
            const { x, y, rot, scale, opacity } = planeStateAt(rawT, dx, dy);
            const el = planeDotRef.current;
            if (el) {
                el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
                el.style.opacity = String(opacity);
            }
            if (rawT < 1) {
                planeRafRef.current = requestAnimationFrame(tick);
            }
        };

        planeRafRef.current = requestAnimationFrame(tick);
        return () => {
            if (planeRafRef.current) cancelAnimationFrame(planeRafRef.current);
        };
    }, [flyingPlane]);

    const handleSend = async () => {
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setText("");
        try {
            const { data } = await feedbackApi.send(content);
            setItems((prev) => [data, ...prev]);
            requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }));

            const rect = sendBtnRef.current?.getBoundingClientRect();
            if (rect) {
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                const dx = window.innerWidth - 28 - x;
                const dy = 28 - y;
                const id = ++planeSeqRef.current;
                setFlyingPlane({ id, x, y, dx, dy });
                setTimeout(() => setFlyingPlane((cur) => (cur?.id === id ? null : cur)), PLANE_FLIGHT_MS + 50);
            }

            closeWidget();
        } catch {
            toast.error("Gửi thất bại, vui lòng thử lại");
            setText(content);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const charPct = Math.min(100, (text.length / MAX_LEN) * 100);
    const nearLimit = text.length > MAX_LEN * 0.85;

    return (
        <>
            <button
                onClick={openWidget}
                aria-label="Gửi góp ý"
                className="fixed right-4 z-[999] rounded-full text-white flex items-center justify-center active:scale-90 transition-transform"
                style={{
                    width: 54,
                    height: 54,
                    bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
                    background: NAVY_GRADIENT,
                    boxShadow: "0 8px 24px -6px rgba(18,40,63,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset",
                }}
            >
                <span
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: "radial-gradient(circle,rgba(255,255,255,0.18),transparent 65%)",
                        animation: "feedbackPulse 2.6s ease-in-out infinite",
                    }}
                />
                <MessageCircle className="w-5 h-5 relative" strokeWidth={2.25} />
            </button>

            {open &&
                createPortal(
                    <div
                        className="fixed inset-0 flex flex-col justify-end"
                        style={{
                            zIndex: 99999,
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                            backgroundColor: visible ? "rgba(12,20,32,0.55)" : "rgba(12,20,32,0)",
                            transition: `background-color ${TRANSITION_MS}ms ease`,
                            pointerEvents: visible ? "auto" : "none",
                        }}
                        onClick={(e) => e.target === e.currentTarget && closeWidget()}
                    >
                        <div
                            ref={sheetRef}
                            className="w-full bg-white rounded-t-[28px] flex flex-col overflow-hidden"
                            style={{
                                height: "84vh",
                                maxWidth: 480,
                                margin: "0 auto",
                                boxShadow: "0 -16px 48px -8px rgba(18,40,63,0.3)",
                                transform: visible ? "translate3d(0,0,0)" : "translate3d(0,100%,0)",
                                transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.22,1,0.36,1)`,
                                willChange: "transform",
                                backfaceVisibility: "hidden",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                className="flex-shrink-0 relative overflow-hidden"
                                style={{ background: NAVY_GRADIENT }}
                            >
                                <div className="absolute -top-6 -right-4 w-24 h-24 rounded-full bg-white/5" />
                                <div className="absolute -bottom-8 left-10 w-20 h-20 rounded-full bg-white/5" />

                                <div className="flex justify-center pt-3 pb-1 relative">
                                    <div className="w-9 h-1 rounded-full bg-white/25" />
                                </div>

                                <div className="flex items-center gap-3 px-5 pt-1 pb-4 relative">
                                    <div className="w-10 h-10 rounded-2xl bg-white/12 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4.5 h-4.5 text-white/90" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-bold text-white tracking-tight">Gửi góp ý</p>
                                        <p className="text-[11.5px] text-white/55 mt-0.5">Admin sẽ xem và phản hồi sớm nhất</p>
                                    </div>
                                    <button
                                        onClick={closeWidget}
                                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                                    >
                                        <X className="w-4 h-4 text-white/80" />
                                    </button>
                                </div>
                            </div>

                            {/* Composer */}
                            <div className="px-4 pt-4 pb-3.5 flex-shrink-0 bg-white">
                                <div className="rounded-2xl border border-gray-150 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#183153]/12 focus-within:border-[#183153]/30 transition-all overflow-hidden">
                                    <textarea
                                        ref={textareaRef}
                                        value={text}
                                        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                                        onKeyDown={handleKeyDown}
                                        rows={3}
                                        placeholder="Nhập góp ý của bạn cho admin..."
                                        className="w-full bg-transparent px-3.5 pt-3 pb-1.5 text-sm leading-relaxed outline-none resize-none placeholder:text-gray-400"
                                    />
                                    <div className="flex items-center justify-between px-3.5 pb-2.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-8 h-1 rounded-full bg-gray-200 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${charPct}%`,
                                                        background: nearLimit ? "#ef4444" : "#183153",
                                                    }}
                                                />
                                            </div>
                                            <span className={`text-[10.5px] ${nearLimit ? "text-red-400 font-semibold" : "text-gray-300"}`}>
                                                {text.length}/{MAX_LEN}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-300">Enter để gửi</span>
                                    </div>
                                </div>
                                <button
                                    ref={sendBtnRef}
                                    onClick={handleSend}
                                    disabled={!text.trim() || sending}
                                    className="mt-2.5 w-full h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-35 active:scale-[0.99] transition-all shadow-sm shadow-[#183153]/20"
                                    style={{ background: NAVY_GRADIENT }}
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Gửi góp ý
                                </button>
                            </div>

                            <div className="px-5 pb-2.5 pt-1 flex-shrink-0 flex items-center gap-2">
                                <div className="h-px flex-1 bg-gray-100" />
                                <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    Đã gửi trước đây
                                </p>
                                <div className="h-px flex-1 bg-gray-100" />
                            </div>

                            <div
                                ref={listRef}
                                className="flex-1 min-h-0 overflow-y-auto px-4 pb-5 space-y-2.5"
                                style={{ background: "linear-gradient(180deg,#F7F8FA,#F2F4F7)" }}
                            >
                                {loading ? (
                                    <div className="py-14 flex flex-col items-center gap-2.5">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                                        <span className="text-xs text-gray-300">Đang tải...</span>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <div
                                            className="w-16 h-16 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-3.5"
                                            style={{ boxShadow: "0 6px 18px -6px rgba(24,49,83,0.15)" }}
                                        >
                                            <MessageCircle className="w-6.5 h-6.5 text-gray-300" strokeWidth={1.75} />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-600">Chưa có góp ý nào</p>
                                        <p className="text-xs text-gray-400 mt-1">Gửi góp ý đầu tiên cho admin nhé</p>
                                    </div>
                                ) : (
                                    items.map((f, idx) => (
                                        <div
                                            key={f.id}
                                            className="bg-white rounded-2xl rounded-tr-md border border-gray-100 px-4 py-3.5"
                                            style={{
                                                boxShadow: "0 2px 10px -4px rgba(18,40,63,0.08)",
                                                animation: `feedbackItemIn 0.28s cubic-bezier(.32,.72,0,1) ${idx * 0.03}s both`,
                                            }}
                                        >
                                            <p className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                                                {f.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
                                                <span className="text-[10.5px] text-gray-400 font-medium">
                                                    {format(new Date(f.created_at), "HH:mm · dd/MM/yyyy", { locale: vi })}
                                                </span>
                                                <span
                                                    className={`flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${f.is_read
                                                        ? "text-emerald-600 bg-emerald-50"
                                                        : "text-gray-400 bg-gray-50"
                                                        }`}
                                                >
                                                    {f.is_read ? (
                                                        <>
                                                            <CheckCheck className="w-3 h-3" /> Admin đã xem
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-3 h-3" /> Đã gửi
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            {flyingPlane &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            left: flyingPlane.x,
                            top: flyingPlane.y,
                            zIndex: 100000,
                            pointerEvents: "none",
                        }}
                    >
                        <div
                            ref={planeDotRef}
                            className="w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
                            style={{
                                background: NAVY_GRADIENT,
                                boxShadow: "0 6px 18px -4px rgba(18,40,63,0.55)",
                                willChange: "transform, opacity",
                            }}
                        >
                            <Send className="w-4 h-4 text-white" />
                        </div>
                    </div>,
                    document.body,
                )}

            <style jsx global>{`
                @keyframes feedbackPulse {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.08); }
                }
                @keyframes feedbackItemIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Loader2, Check, CheckCheck } from "lucide-react";
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

const NAVY_GRADIENT = "linear-gradient(135deg,#1d3a5f,#12283f)";
const MAX_LEN = 500;

export function FeedbackWidget() {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Feedback[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const fetchMine = useCallback(async () => {
        try {
            const { data } = await feedbackApi.getMine();
            setItems(data ?? []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cập nhật realtime khi admin đánh dấu đã xem góp ý của mình
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

    const openWidget = () => {
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        setLoading(true);
        fetchMine();
    };
    const closeWidget = () => {
        setVisible(false);
        setTimeout(() => setOpen(false), 250);
    };

    const handleSend = async () => {
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setText("");
        try {
            const { data } = await feedbackApi.send(content);
            setItems((prev) => [data, ...prev]);
            requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
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

    return (
        <>
            {/* ---------- Floating trigger ---------- */}
            <button
                onClick={openWidget}
                aria-label="Gửi góp ý"
                className="fixed bottom-20 right-4 z-[999] rounded-full text-white flex items-center justify-center active:scale-90 transition-transform"
                style={{
                    width: 54,
                    height: 54,
                    background: NAVY_GRADIENT,
                    boxShadow: "0 8px 20px -6px rgba(18,40,63,0.55)",
                }}
            >
                <MessageCircle className="w-5 h-5" strokeWidth={2.25} />
            </button>

            {open &&
                createPortal(
                    <div
                        className="fixed inset-0 flex flex-col justify-end"
                        style={{
                            zIndex: 99999,
                            background: visible ? "rgba(12,20,32,0.55)" : "rgba(12,20,32,0)",
                            backdropFilter: visible ? "blur(3px)" : "none",
                            transition: "background .3s, backdrop-filter .3s",
                        }}
                        onClick={(e) => e.target === e.currentTarget && closeWidget()}
                    >
                        <div
                            className="w-full bg-white rounded-t-[28px] flex flex-col overflow-hidden"
                            style={{
                                height: "84vh",
                                maxWidth: 480,
                                margin: "0 auto",
                                boxShadow: "0 -12px 40px -8px rgba(18,40,63,0.25)",
                                transform: visible ? "translateY(0)" : "translateY(100%)",
                                transition: "transform .32s cubic-bezier(0.32,0.72,0,1)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Grab handle */}
                            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                                <div className="w-9 h-1 rounded-full bg-gray-200" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0">
                                <div>
                                    <p className="text-[15px] font-bold text-gray-900 tracking-tight">Gửi góp ý</p>
                                    <p className="text-[12px] text-gray-400 mt-0.5">Admin sẽ xem và phản hồi sớm nhất</p>
                                </div>
                                <button
                                    onClick={closeWidget}
                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            {/* Composer */}
                            <div className="px-4 pb-4 flex-shrink-0">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#183153]/10 focus-within:border-[#183153]/25 transition-all overflow-hidden">
                                    <textarea
                                        ref={textareaRef}
                                        value={text}
                                        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                                        onKeyDown={handleKeyDown}
                                        rows={3}
                                        placeholder="Nhập góp ý của bạn cho admin..."
                                        className="w-full bg-transparent px-3.5 pt-2.5 pb-1 text-sm outline-none resize-none placeholder:text-gray-400"
                                    />
                                    <div className="flex items-center justify-between px-3.5 pb-2">
                                        <span className="text-[10.5px] text-gray-300">{text.length}/{MAX_LEN}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!text.trim() || sending}
                                    className="mt-2.5 w-full h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-35 active:scale-[0.99] transition-all"
                                    style={{ background: NAVY_GRADIENT }}
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Gửi góp ý
                                </button>
                            </div>

                            <div className="px-5 pb-2 flex-shrink-0">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Đã gửi trước đây
                                </p>
                            </div>

                            {/* History */}
                            <div
                                ref={listRef}
                                className="flex-1 min-h-0 overflow-y-auto px-4 pb-5 space-y-2.5"
                                style={{ background: "linear-gradient(180deg,#F7F8FA,#F3F5F8)" }}
                            >
                                {loading ? (
                                    <div className="py-10 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="py-14 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
                                            <MessageCircle className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">Chưa có góp ý nào</p>
                                        <p className="text-xs text-gray-400 mt-1">Gửi góp ý đầu tiên cho admin nhé</p>
                                    </div>
                                ) : (
                                    items.map((f) => (
                                        <div
                                            key={f.id}
                                            className={`bg-white rounded-2xl border px-3.5 py-3 shadow-sm ${f.is_read ? "border-gray-100" : "border-[#183153]/10"
                                                }`}
                                        >
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                                                {f.message}
                                            </p>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                                <span className="text-[10.5px] text-gray-400">
                                                    {format(new Date(f.created_at), "HH:mm · dd/MM/yyyy", { locale: vi })}
                                                </span>
                                                <span
                                                    className={`flex items-center gap-1 text-[10.5px] font-semibold ${f.is_read ? "text-emerald-600" : "text-gray-400"
                                                        }`}
                                                >
                                                    {f.is_read ? (
                                                        <>
                                                            <CheckCheck className="w-3.5 h-3.5" /> Admin đã xem
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" /> Đã gửi
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
        </>
    );
}
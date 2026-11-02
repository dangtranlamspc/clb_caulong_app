"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, ChevronRight, Loader2, UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { diningApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { c, alpha, type ThemeTokens } from "@/lib/theme";

const STATUS: Record<string, { label: string; tone: keyof ThemeTokens }> = {
    approved: { label: "Đã tham gia", tone: "success" },
    pending: { label: "Chờ duyệt", tone: "warning" },
    rejected: { label: "Bị từ chối", tone: "danger" },
};

export function UpcomingDining() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = async () => {
        try {
            const { data } = await diningApi.open();
            setEvents(data ?? []);
        } catch {
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        let t: ReturnType<typeof setTimeout> | null = null;
        const refetch = () => {
            if (t) clearTimeout(t);
            t = setTimeout(load, 250);
        };

        const ch = supabase
            .channel("dining-open")
            .on("broadcast", { event: "dining_changed" }, refetch)
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_events" }, refetch)
            .on("postgres_changes", { event: "*", schema: "public", table: "dining_participants" }, refetch)
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
            if (t) clearTimeout(t);
        };
    }, []);

    const handleRegister = async (id: string) => {
        setBusyId(id);
        try {
            const { data } = await diningApi.register(id);
            toast.success(data?.message ?? "Đã gửi đăng ký");
            await load();
        } catch { } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div
                className="h-28 animate-pulse rounded-2xl"
                style={{ background: c.surface, border: `1px solid ${c.border}` }}
            />
        );
    }

    if (events.length === 0) return null;

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: c.text }}>
                    <UtensilsCrossed className="h-4 w-4" style={{ color: c.primary }} />
                    Ăn uống đang mở
                </h2>
                <Link href="/dining" className="text-xs font-semibold" style={{ color: c.primary }}>
                    Xem tất cả
                </Link>
            </div>

            <div className="space-y-2.5">
                {events.map((e) => {
                    const s = e.my_status ? STATUS[e.my_status] : null;
                    const busy = busyId === e.id;

                    const cardStyle = {
                        background: `linear-gradient(180deg, ${alpha("primary", 10)} 0%, transparent 65%), ${c.surface}`,
                        border: `1px solid ${c.border}`,
                        boxShadow: c.shadow,
                    };

                    const content = (
                        <>
                            <div
                                className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none"
                                style={{ background: c.primarySoft, color: c.primary }}
                            >
                                <span className="text-[10px] font-semibold">
                                    Thg {format(new Date(e.event_date), "M")}
                                </span>
                                <span className="mt-0.5 text-lg font-black">
                                    {format(new Date(e.event_date), "dd")}
                                </span>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold" style={{ color: c.text }}>
                                    {e.title}
                                </p>
                                <div
                                    className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
                                    style={{ color: c.textMuted }}
                                >
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {format(new Date(e.event_date), "EEE HH:mm", { locale: vi })}
                                    </span>
                                    {e.location && (
                                        <span className="flex min-w-0 items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{e.location}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {s ? (
                                <span
                                    className="flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                    style={{ background: alpha(s.tone, 15), color: c[s.tone] }}
                                >
                                    {s.label} <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            ) : (
                                <button
                                    disabled={busy}
                                    onClick={() => handleRegister(e.id)}
                                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white active:scale-95 disabled:opacity-50"
                                    style={{ background: c.primary }}
                                >
                                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Đăng ký
                                </button>
                            )}
                        </>
                    );

                    if (s) {
                        return (
                            <Link
                                key={e.id}
                                href={`/dining/${e.id}`}
                                className="flex items-center gap-3 rounded-2xl p-4 transition-transform active:scale-[0.99]"
                                style={cardStyle}
                            >
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <div key={e.id} className="flex items-center gap-3 rounded-2xl p-4" style={cardStyle}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { activitiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

function getMatchStatus(m: any): "completed" | "ongoing" | "pending" {
    if (m.status === "completed") return "completed";
    if (m.status === "ongoing") return "ongoing";
    return "pending";
}

function scoreColorClass(mine: number, other: number) {
    if (mine > other) return "text-emerald-600";
    if (mine < other) return "text-red-400";
    return "text-gray-900";
}

function MatchStatusPill({ status }: { status: "completed" | "ongoing" | "pending" }) {
    const cfg = {
        completed: { color: "#16a34a", bg: "#f0fdf4", label: "Đã xong", icon: "✓" },
        ongoing: { color: "#d97706", bg: "#fffbeb", label: "Đang thi đấu", icon: "●" },
        pending: { color: "#9ca3af", bg: "#f9fafb", label: "Chưa thi đấu", icon: "○" },
    }[status];

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
        >
            <span className="text-[10px]">{cfg.icon}</span>
            {cfg.label}
        </span>
    );
}

export default function TournamentMatchDetailPage() {
    const params = useParams<{ id: string; matchId: string }>();
    const id = params?.id;
    const matchId = params?.matchId;
    const router = useRouter();

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const load = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!id || !matchId) return;
            const silent = opts?.silent ?? false;
            if (!silent) setLoading(true);
            try {
                const { data } = await activitiesApi.getTournamentSchedule(id);
                const found = (data.matches ?? []).find((m: any) => m.id === matchId);
                if (found) {
                    setMatch(found);
                    setNotFound(false);
                } else {
                    setNotFound(true);
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [id, matchId],
    );

    useEffect(() => {
        load();
    }, [load]);

    const loadRef = useRef(load);
    useEffect(() => {
        loadRef.current = load;
    }, [load]);

    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`tournament-schedule:${id}`)
            .on("broadcast", { event: "schedule_changed" }, () => {
                loadRef.current({ silent: true });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const contentScores: { content_id: string; label: string; score1: number; score2: number }[] =
        match?.content_scores ?? [];

    const dateLabel = match?.scheduled_at
        ? format(new Date(match.scheduled_at), "dd/MM/yyyy", { locale: vi })
        : null;

    const metaParts = match
        ? [`Lượt ${match.round_number}`, match.court_number ? `Sân ${match.court_number}` : null, dateLabel].filter(
            Boolean,
        )
        : [];

    const isCompleted = match?.status === "completed";
    const team1Won = isCompleted && match.team1_score > match.team2_score;
    const isDraw = isCompleted && match.team1_score === match.team2_score;

    return (
        <div className="min-h-screen bg-[#F4F6FA]">
            <div
                className="sticky top-0 z-30"
                style={{
                    background: "rgba(244,246,250,0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    paddingTop: "env(safe-area-inset-top)",
                }}
            >
                <div className="max-w-lg lg:max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1">Chi tiết trận đấu</h1>
                </div>
            </div>

            <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                ) : notFound || !match ? (
                    <div className="bg-white rounded-2xl py-16 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">Không tìm thấy trận đấu</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-gray-900">{match.team1?.name ?? "—"}</span>
                            <span className="text-xs text-gray-300 font-medium">vs</span>
                            <span className="text-base font-bold text-gray-900">{match.team2?.name ?? "—"}</span>
                        </div>
                        {metaParts.length > 0 && (
                            <p className="text-center text-xs text-gray-400 mt-1 mb-5">{metaParts.join(" · ")}</p>
                        )}

                        {contentScores.length > 0 && (
                            <div className="space-y-3 mb-5">
                                {contentScores.map((cs) => (
                                    <div key={cs.content_id} className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-gray-600">{cs.label}</span>
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 min-w-[128px] justify-center">
                                            <span className={`text-2xl font-black tabular-nums ${scoreColorClass(cs.score1, cs.score2)}`}>
                                                {cs.score1}
                                            </span>
                                            <span className="text-gray-300 font-semibold">-</span>
                                            <span className={`text-2xl font-black tabular-nums ${scoreColorClass(cs.score2, cs.score1)}`}>
                                                {cs.score2}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isCompleted && (
                            <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4">
                                <p className="text-xs font-semibold text-blue-500 mb-1">Tổng điểm</p>
                                <div className="flex items-center justify-center gap-4">
                                    <span className={`text-4xl font-black tabular-nums ${scoreColorClass(match.team1_score, match.team2_score)}`}>
                                        {match.team1_score}
                                    </span>
                                    <span className="text-gray-300 font-semibold text-2xl">-</span>
                                    <span className={`text-4xl font-black tabular-nums ${scoreColorClass(match.team2_score, match.team1_score)}`}>
                                        {match.team2_score}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            {isCompleted ? (
                                isDraw ? (
                                    <span
                                        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                                        style={{ background: "#f9fafb", color: "#9ca3af" }}
                                    >
                                        Hoà
                                    </span>
                                ) : (
                                    <span
                                        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                                        style={{ background: "#f0fdf4", color: "#16a34a" }}
                                    >
                                        <span>✓</span>
                                        {team1Won ? match.team1?.name : match.team2?.name} thắng
                                    </span>
                                )
                            ) : (
                                <MatchStatusPill status={getMatchStatus(match)} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
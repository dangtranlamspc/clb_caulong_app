"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { createPortal } from "react-dom";

const HIDE_SCROLLBAR_CLASS =
    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function computeStandings(teams: any[], rounds: any[]) {
    const statsMap = new Map<
        string,
        {
            id: string;
            name: string;
            played: number;
            wins: number;
            losses: number;
            pointsFor: number;
            pointsAgainst: number;
        }
    >();

    for (const t of teams ?? []) {
        statsMap.set(t.id, {
            id: t.id,
            name: t.name,
            played: 0,
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
        });
    }

    for (const r of rounds ?? []) {
        for (const m of r.matches ?? []) {
            if (m.status !== "completed") continue;
            const t1 = statsMap.get(m.team1?.id);
            const t2 = statsMap.get(m.team2?.id);
            if (!t1 || !t2) continue;

            t1.played += 1;
            t2.played += 1;
            t1.pointsFor += m.team1_score ?? 0;
            t1.pointsAgainst += m.team2_score ?? 0;
            t2.pointsFor += m.team2_score ?? 0;
            t2.pointsAgainst += m.team1_score ?? 0;

            if (m.team1_score > m.team2_score) {
                t1.wins += 1;
                t2.losses += 1;
            } else if (m.team2_score > m.team1_score) {
                t2.wins += 1;
                t1.losses += 1;
            }
        }
    }

    return Array.from(statsMap.values())
        .map((t) => ({ ...t, diff: t.pointsFor - t.pointsAgainst }))
        .sort((a, b) => {
            if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.wins - a.wins;
        });
}

function RankBadge({ rank }: { rank: number }) {
    const topStyles: Record<number, string> = {
        1: "bg-amber-400 text-white",
        2: "bg-gray-300 text-white",
        3: "bg-orange-400 text-white",
    };
    return (
        <span
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${topStyles[rank] ?? "bg-gray-100 text-gray-500"
                }`}
        >
            {rank}
        </span>
    );
}


function TeamStatsModal({
    team,
    rank,
    isMyTeam,
    onClose,
}: {
    team: any;
    rank: number;
    isMyTeam: boolean;
    onClose: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 180);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const rows = [
        { label: "Trận đã đấu", value: team.played, color: "text-gray-900" },
        { label: "Thắng", value: team.wins, color: "text-emerald-600" },
        { label: "Thua", value: team.losses, color: "text-red-500" },
        { label: "Điểm ghi được", value: team.pointsFor, color: "text-blue-600" },
        { label: "Điểm thua", value: team.pointsAgainst, color: "text-gray-700" },
        {
            label: "Hiệu số",
            value: team.diff > 0 ? `+${team.diff}` : team.diff,
            color: team.diff > 0 ? "text-emerald-600" : team.diff < 0 ? "text-red-500" : "text-gray-500",
        },
    ];

    return typeof document === "undefined"
        ? null
        : createPortal(
            <div
                className={`fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) handleClose();
                }}
            >
                <div
                    className={`bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
                        }`}
                >
                    <div className="px-5 pt-5 pb-4 text-center border-b border-gray-100 relative">
                        <button
                            onClick={handleClose}
                            className="absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <RankBadge rank={rank} />
                            <h3 className="font-black text-gray-900 text-lg truncate">{team.name}</h3>
                        </div>
                        {isMyTeam && (
                            <span className="inline-block text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full">
                                Đội bạn
                            </span>
                        )}
                    </div>

                    <div className="p-4 space-y-2">
                        {rows.map((r) => (
                            <div
                                key={r.label}
                                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50"
                            >
                                <span className="text-sm text-gray-500">{r.label}</span>
                                <span className={`text-base font-bold tabular-nums ${r.color}`}>{r.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="px-5 pb-5">
                        <button
                            onClick={handleClose}
                            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        );
}

export default function TournamentStandingsPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const router = useRouter();

    const [teams, setTeams] = useState<any[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [ended, setEnded] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);

    const load = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!id) return;
            const silent = opts?.silent ?? false;
            if (!silent) setLoading(true);
            try {
                const [{ data: act }, { data: teamsData }, { data: scheduleData }, { data: myStatus }] =
                    await Promise.all([
                        activitiesApi.get(id),
                        activitiesApi.getTournamentTeams(id),
                        activitiesApi.getTournamentSchedule(id),
                        activitiesApi.getMyStatus(id),
                    ]);
                setTeams(teamsData.teams ?? []);
                setRounds(scheduleData.rounds ?? []);
                setMyTeamId(myStatus?.my_registration?.team?.id ?? null);
                setEnded(Boolean(act?.ended_at));
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [id],
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

    const standings = useMemo(() => computeStandings(teams, rounds), [teams, rounds]);
    const totalPlayed = standings.reduce((s, t) => s + t.played, 0);

    return (
        <div className={`min-h-screen bg-[#F4F6FA] overflow-y-auto ${HIDE_SCROLLBAR_CLASS}`}>
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
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1">Bảng xếp hạng</h1>
                </div>
            </div>

            <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2.5 mb-4">
                            <div
                                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${ended ? "bg-slate-100" : "bg-emerald-100"
                                    }`}
                            >
                                <Trophy className={`h-4 w-4 ${ended ? "text-slate-500" : "text-emerald-600"}`} />
                            </div>
                            <p className="text-xs text-gray-400">
                                {totalPlayed > 0 ? `Đã tính ${totalPlayed} trận đấu` : "Chưa có trận nào hoàn thành"}
                            </p>
                        </div>

                        {standings.length === 0 ? (
                            <div className="bg-white rounded-2xl py-16 text-center border border-dashed border-gray-200">
                                <Trophy className="w-9 h-9 mx-auto text-gray-200 mb-3" />
                                <p className="text-gray-400 text-sm">Chưa có đội nào</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-[2.5rem_1fr_5rem] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                                    <span></span>
                                    <span>Đội</span>
                                    <span className="text-center">Tổng điểm</span>
                                </div>

                                <div className="space-y-2">
                                    {standings.map((t, idx) => {
                                        const isMine = !!myTeamId && t.id === myTeamId;
                                        return (
                                            <button
                                                type="button"
                                                key={t.id}
                                                onClick={() => setSelectedTeam({ team: t, rank: idx + 1 })}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border shadow-sm text-left transition-colors active:bg-gray-50 ${isMine ? "border-blue-300 bg-blue-50/50" : "border-gray-100 bg-white"
                                                    }`}
                                            >
                                                <RankBadge rank={idx + 1} />
                                                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                    <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                                                    {isMine && (
                                                        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                            Đội bạn
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-base font-bold text-blue-600 tabular-nums flex-shrink-0">
                                                    {t.pointsFor}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
            {selectedTeam && (
                <TeamStatsModal
                    team={selectedTeam.team}
                    rank={selectedTeam.rank}
                    isMyTeam={!!myTeamId && selectedTeam.team.id === myTeamId}
                    onClose={() => setSelectedTeam(null)}
                />
            )}
        </div>
    );
}
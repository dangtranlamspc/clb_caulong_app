"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { activitiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const TEAM_BADGE_COLORS = [
    "#2563eb", // blue
    "#dc2626", // red
    "#059669", // emerald
    "#d97706", // amber
    "#7c3aed", // violet
    "#db2777", // pink
    "#0891b2", // cyan
    "#65a30d", // lime
    "#ea580c", // orange
    "#4f46e5", // indigo
];

const COURT_BAR_COLORS = ["#dc2626", "#059669", "#4f46e5", "#d97706", "#7c3aed", "#0891b2"];

const HIDE_SCROLLBAR_CLASS =
    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function TeamBadge({ index }: { index: number | undefined }) {
    if (index === undefined) {
        return (
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-gray-500 bg-gray-200 flex-shrink-0">
                ?
            </span>
        );
    }
    return (
        <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: TEAM_BADGE_COLORS[index % TEAM_BADGE_COLORS.length] }}
        >
            {index + 1}
        </span>
    );
}

function TeamNameLabel({ name, isMine }: { name?: string; isMine: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            {isMine && (
                <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Đội bạn
                </span>
            )}
        </span>
    );
}

function getMatchStatus(m: any): "completed" | "ongoing" | "pending" {
    if (m.status === "completed") return "completed";
    if (m.status === "ongoing") return "ongoing";
    return "pending";
}

function MatchScoreRow({ m }: { m: any }) {
    const isCompleted = m.status === "completed";
    if (!isCompleted) return null;

    const team1Won = m.team1_score > m.team2_score;
    const team2Won = m.team2_score > m.team1_score;

    return (
        <div className="flex items-center justify-center gap-3 mt-1.5">
            <span
                className={`text-xl font-black tabular-nums ${team1Won ? "text-emerald-600" : team2Won ? "text-red-400" : "text-gray-400"
                    }`}
            >
                {m.team1_score}
            </span>
            <span className="text-gray-300 font-semibold">-</span>
            <span
                className={`text-xl font-black tabular-nums ${team2Won ? "text-emerald-600" : team1Won ? "text-red-400" : "text-gray-400"
                    }`}
            >
                {m.team2_score}
            </span>
        </div>
    );
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

function DetailButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="absolute bottom-2.5 right-3 inline-flex items-center gap-0.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full px-3 py-1.5 shadow-sm shadow-blue-200 transition-colors"
        >
            Chi tiết
            <ChevronRight className="w-3.5 h-3.5" />
        </button>
    );
}

function MatchWinnerLine({ m }: { m: any }) {
    if (m.status !== "completed") return null;

    const team1Won = m.team1_score > m.team2_score;
    const team2Won = m.team2_score > m.team1_score;

    if (!team1Won && !team2Won) {
        return <p className="text-center text-[11px] font-bold text-gray-400 mt-1">Hoà</p>;
    }

    return (
        <p className="text-center text-[15px] font-bold text-emerald-600 mt-1">
            {team1Won ? m.team1?.name : m.team2?.name} thắng
        </p>
    );
}

export default function TournamentSchedulePage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const router = useRouter();

    const [activity, setActivity] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRound, setActiveRound] = useState<number | null>(null);

    const [myTeamId, setMyTeamId] = useState<string | null>(null);


    const hasAutoSelectedRef = useRef(false);

    const load = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!id) return;
            const silent = opts?.silent ?? false;
            if (!silent) setLoading(true);
            try {
                const [{ data: act }, { data: teamsData }, { data: scheduleData }, { data: myStatus }] = await Promise.all([
                    activitiesApi.get(id),
                    activitiesApi.getTournamentTeams(id),
                    activitiesApi.getTournamentSchedule(id),
                    activitiesApi.getMyStatus(id),
                ]);
                setActivity(act);
                setTeams(teamsData.teams ?? []);
                const r = scheduleData.rounds ?? [];
                setRounds(r);
                setMyTeamId(myStatus?.my_registration?.team?.id ?? null);

                if (!hasAutoSelectedRef.current) {
                    const firstUnfinished = r.find((round: any) =>
                        (round.matches ?? []).some((m: any) => m.status !== "completed"),
                    );
                    setActiveRound((firstUnfinished ?? r[0])?.round_number ?? null);
                    hasAutoSelectedRef.current = true;
                }
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

    const teamIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        teams.forEach((t, idx) => map.set(t.id, idx));
        return map;
    }, [teams]);

    const currentRound = rounds.find((r) => r.round_number === activeRound);

    const byCourtMap = new Map<number, any[]>();
    const noCourt: any[] = [];
    if (currentRound) {
        for (const m of currentRound.matches ?? []) {
            if (m.court_number) {
                if (!byCourtMap.has(m.court_number)) byCourtMap.set(m.court_number, []);
                byCourtMap.get(m.court_number)!.push(m);
            } else {
                noCourt.push(m);
            }
        }
    }
    const courtGroups = [...byCourtMap.entries()].sort((a, b) => a[0] - b[0]);

    const roundDateLabel = currentRound?.matches?.find((m: any) => m.scheduled_at)?.scheduled_at
        ? format(new Date(currentRound.matches.find((m: any) => m.scheduled_at).scheduled_at), "EEEE, dd/MM/yyyy", {
            locale: vi,
        })
        : null;

    const goToMatchDetail = (matchId: string) => {
        router.push(`/events/${id}/schedule/${matchId}`);
    };

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
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1">Lịch thi đấu</h1>
                </div>
            </div>

            <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                ) : rounds.length === 0 ? (
                    <div className="bg-white rounded-2xl py-16 text-center border border-dashed border-gray-200">
                        <CalendarDays className="w-9 h-9 mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">Chưa có lịch thi đấu</p>
                    </div>
                ) : (
                    <>
                        <div className={`flex items-center gap-2 overflow-x-auto pb-1 mb-4 ${HIDE_SCROLLBAR_CLASS}`}>
                            {rounds.map((r) => {
                                const isActive = r.round_number === activeRound;
                                return (
                                    <button
                                        key={r.round_number}
                                        onClick={() => setActiveRound(r.round_number)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isActive
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                            : "bg-white text-gray-500 border border-gray-200"
                                            }`}
                                    >
                                        Lượt {r.round_number}
                                    </button>
                                );
                            })}
                        </div>

                        {roundDateLabel && (
                            <p className="text-sm font-bold text-gray-900 mb-3 capitalize">{roundDateLabel}</p>
                        )}

                        {currentRound?.bye_team_name && (
                            <div className="mb-3 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                Nghỉ: <span className="font-semibold text-gray-600">{currentRound.bye_team_name}</span>
                            </div>
                        )}

                        <div className="space-y-5">
                            {courtGroups.map(([courtNumber, matches], idx) => (
                                <div key={courtNumber}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span
                                            className="w-1 h-4 rounded-full flex-shrink-0"
                                            style={{ background: COURT_BAR_COLORS[idx % COURT_BAR_COLORS.length] }}
                                        />
                                        <p className="text-sm font-bold text-gray-900">Sân {courtNumber}</p>
                                    </div>
                                    <div className="space-y-2">
                                        {matches.map((m: any) => {
                                            const st = getMatchStatus(m);
                                            return (
                                                <div
                                                    key={m.id}
                                                    className="relative bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-3.5 pb-9"
                                                >
                                                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                                                        <TeamBadge index={teamIndexMap.get(m.team1?.id)} />
                                                        <TeamNameLabel name={m.team1?.name} isMine={!!myTeamId && m.team1?.id === myTeamId} />
                                                        <span className="text-xs text-gray-300 font-medium">vs</span>
                                                        <TeamBadge index={teamIndexMap.get(m.team2?.id)} />
                                                        <TeamNameLabel name={m.team2?.name} isMine={!!myTeamId && m.team2?.id === myTeamId} />
                                                    </div>
                                                    <MatchScoreRow m={m} />
                                                    <MatchWinnerLine m={m} />
                                                    <div className="flex justify-center mt-2.5">
                                                        <MatchStatusPill status={st} />
                                                    </div>
                                                    <DetailButton onClick={() => goToMatchDetail(m.id)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {noCourt.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-1 h-4 rounded-full flex-shrink-0 bg-gray-300" />
                                        <p className="text-sm font-bold text-gray-900">Chưa xếp sân</p>
                                    </div>
                                    <div className="space-y-2">
                                        {noCourt.map((m: any) => {
                                            const st = getMatchStatus(m);
                                            return (
                                                <div
                                                    key={m.id}
                                                    className="relative bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-3.5 pb-9"
                                                >
                                                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                                                        <TeamBadge index={teamIndexMap.get(m.team1?.id)} />
                                                        <span className="text-sm font-semibold text-gray-900">{m.team1?.name}</span>
                                                        <span className="text-xs text-gray-300 font-medium">vs</span>
                                                        <TeamBadge index={teamIndexMap.get(m.team2?.id)} />
                                                        <span className="text-sm font-semibold text-gray-900">{m.team2?.name}</span>
                                                    </div>
                                                    <MatchScoreRow m={m} />
                                                    <MatchWinnerLine m={m} />
                                                    <div className="flex justify-center mt-2.5">
                                                        <MatchStatusPill status={st} />
                                                    </div>
                                                    <DetailButton onClick={() => goToMatchDetail(m.id)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
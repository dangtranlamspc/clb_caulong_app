"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CalendarDays, ChevronRight, Trophy, Home } from "lucide-react";
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

type TabKey = "round" | "playoff";

function computeStandings(teams: any[], matches: any[]) {
    const map = new Map<string, { id: string; pointsFor: number; pointsAgainst: number; wins: number }>();
    teams.forEach((t) => map.set(t.id, { id: t.id, pointsFor: 0, pointsAgainst: 0, wins: 0 }));

    for (const m of matches) {
        if (m.status !== "completed") continue;
        const t1 = map.get(m.team1_id);
        const t2 = map.get(m.team2_id);
        if (!t1 || !t2) continue;
        const s1 = m.team1_score ?? 0;
        const s2 = m.team2_score ?? 0;
        t1.pointsFor += s1;
        t1.pointsAgainst += s2;
        t2.pointsFor += s2;
        t2.pointsAgainst += s1;
        if (s1 > s2) t1.wins += 1;
        else if (s2 > s1) t2.wins += 1;
    }

    return [...map.values()].sort((a, b) => {
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
        const diffA = a.pointsFor - a.pointsAgainst;
        const diffB = b.pointsFor - b.pointsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.wins - a.wins;
    });
}

function getMatchStatus(m: any): "completed" | "ongoing" | "pending" {
    if (m.status === "completed") return "completed";
    if (m.status === "ongoing") return "ongoing";
    return "pending";
}


function TeamBadge({ index, size = "sm" }: { index: number | undefined; size?: "sm" | "lg" }) {
    const sizeCls = size === "lg" ? "w-11 h-11 text-base" : "w-6 h-6 text-[11px]";
    if (index === undefined) {
        return (
            <span
                className={`${sizeCls} rounded-full flex items-center justify-center font-bold text-gray-500 bg-gray-200 flex-shrink-0`}
            >
                ?
            </span>
        );
    }
    return (
        <span
            className={`${sizeCls} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
            style={{ background: TEAM_BADGE_COLORS[index % TEAM_BADGE_COLORS.length] }}
        >
            {index + 1}
        </span>
    );
}

function MineTag() {
    return (
        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
            Đội bạn
        </span>
    );
}

function TeamNameLabel({ name, isMine }: { name?: string; isMine: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{name}</span>
            {isMine && <MineTag />}
        </span>
    );
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

function DetailButton({ onClick, floating = true }: { onClick: () => void; floating?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`${floating ? "absolute bottom-2.5 right-3 " : ""
                }inline-flex items-center gap-0.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full px-3 py-1.5 shadow-sm shadow-blue-200 transition-colors`}
        >
            Chi tiết
            <ChevronRight className="w-3.5 h-3.5" />
        </button>
    );
}

function MatchWinnerLine({ m, myTeamId }: { m: any; myTeamId?: string | null }) {
    if (m.status !== "completed") return null;

    const team1Won = m.team1_score > m.team2_score;
    const team2Won = m.team2_score > m.team1_score;

    if (!team1Won && !team2Won) {
        return <p className="text-center text-[11px] font-bold text-gray-400 mt-1">Hoà</p>;
    }

    const winner = team1Won ? m.team1 : m.team2;
    const isMyTeamWinner = !!myTeamId && winner?.id === myTeamId;

    return (
        <p className="text-center text-[15px] font-bold text-emerald-600 mt-1">
            {isMyTeamWinner ? "Đội bạn đã thắng" : `${winner?.name} thắng`}
        </p>
    );
}


function MatchCard({
    m,
    teamIndexMap,
    myTeamId,
    onDetail,
}: {
    m: any;
    teamIndexMap: Map<string, number>;
    myTeamId: string | null;
    onDetail: () => void;
}) {
    const st = getMatchStatus(m);
    return (
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-3.5 pb-9">
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
                <TeamBadge index={teamIndexMap.get(m.team1?.id)} />
                <TeamNameLabel name={m.team1?.name} isMine={!!myTeamId && m.team1?.id === myTeamId} />
                <span className="text-xs text-gray-300 font-medium">vs</span>
                <TeamBadge index={teamIndexMap.get(m.team2?.id)} />
                <TeamNameLabel name={m.team2?.name} isMine={!!myTeamId && m.team2?.id === myTeamId} />
            </div>
            <MatchScoreRow m={m} />
            <MatchWinnerLine m={m} myTeamId={myTeamId} />
            <div className="flex justify-center mt-2.5">
                <MatchStatusPill status={st} />
            </div>
            <DetailButton onClick={onDetail} />
        </div>
    );
}

function PlayoffTeam({
    team,
    index,
    rank,
    isMine,
    highlight,
}: {
    team?: { id: string; name: string };
    index: number | undefined;
    rank?: number;
    isMine: boolean;
    highlight: boolean;
}) {
    return (
        <div
            className={`flex-1 min-w-0 flex flex-col items-center text-center gap-1.5 rounded-xl py-3 px-1.5 transition-colors ${highlight ? "bg-emerald-50 ring-1 ring-emerald-200" : ""
                }`}
        >
            <TeamBadge index={index} size="lg" />
            <p className="text-sm font-bold text-gray-900 leading-tight break-words w-full">{team?.name ?? "—"}</p>
            {rank && <p className="text-[10px] font-semibold text-gray-400">Hạng {rank} vòng tròn</p>}
            {isMine && <MineTag />}
        </div>
    );
}

function PlayoffMatchCard({
    m,
    variant,
    rankByTeam,
    teamIndexMap,
    myTeamId,
    onDetail,
}: {
    m: any;
    variant: "final" | "third";
    rankByTeam: Map<string, number>;
    teamIndexMap: Map<string, number>;
    myTeamId: string | null;
    onDetail: () => void;
}) {
    const cfg =
        variant === "final"
            ? {
                icon: "🏆",
                title: "Tranh hạng Nhất - Nhì",
                bg: "linear-gradient(135deg,#f59e0b,#d97706)",
                topLabel: "🥇 Nhất",
                botLabel: "🥈 Nhì",
            }
            : {
                icon: "🥉",
                title: "Tranh hạng Ba - Tư",
                bg: "linear-gradient(135deg,#fb923c,#c2410c)",
                topLabel: "🥉 Hạng Ba",
                botLabel: "Hạng Tư",
            };

    const st = getMatchStatus(m);
    const completed = st === "completed";
    const team1Won = completed && m.team1_score > m.team2_score;
    const team2Won = completed && m.team2_score > m.team1_score;
    const winner = team1Won ? m.team1 : team2Won ? m.team2 : null;
    const loser = team1Won ? m.team2 : team2Won ? m.team1 : null;

    const metaParts: string[] = [];
    if (m.court_number) metaParts.push(`Sân ${m.court_number}`);
    if (m.scheduled_at) metaParts.push(format(new Date(m.scheduled_at), "HH:mm, dd/MM", { locale: vi }));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between gap-2" style={{ background: cfg.bg }}>
                <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <span className="text-base">{cfg.icon}</span>
                    {cfg.title}
                </p>
                {metaParts.length > 0 && (
                    <p className="text-[11px] font-semibold text-white/90">{metaParts.join(" • ")}</p>
                )}
            </div>

            <div className="px-3 pt-3 pb-3">
                <div className="flex items-stretch gap-1">
                    <PlayoffTeam
                        team={m.team1}
                        index={teamIndexMap.get(m.team1?.id)}
                        rank={rankByTeam.get(m.team1?.id)}
                        isMine={!!myTeamId && m.team1?.id === myTeamId}
                        highlight={team1Won}
                    />

                    <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center">
                        {completed ? (
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={`text-2xl font-black tabular-nums ${team1Won ? "text-emerald-600" : team2Won ? "text-red-400" : "text-gray-400"
                                        }`}
                                >
                                    {m.team1_score}
                                </span>
                                <span className="text-gray-300 font-semibold">-</span>
                                <span
                                    className={`text-2xl font-black tabular-nums ${team2Won ? "text-emerald-600" : team1Won ? "text-red-400" : "text-gray-400"
                                        }`}
                                >
                                    {m.team2_score}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs font-black text-gray-300 tracking-widest">VS</span>
                        )}
                    </div>

                    <PlayoffTeam
                        team={m.team2}
                        index={teamIndexMap.get(m.team2?.id)}
                        rank={rankByTeam.get(m.team2?.id)}
                        isMine={!!myTeamId && m.team2?.id === myTeamId}
                        highlight={team2Won}
                    />
                </div>

                {completed && (
                    <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-center space-y-0.5">
                        {winner ? (
                            <>
                                <p className="text-[13px] font-bold text-gray-900">
                                    {cfg.topLabel}: <span className="text-emerald-600">{winner.name}</span>
                                </p>
                                <p className="text-xs font-semibold text-gray-500">
                                    {cfg.botLabel}: {loser?.name}
                                </p>
                            </>
                        ) : (
                            <p className="text-xs font-bold text-gray-400">Hoà</p>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between mt-3">
                    <MatchStatusPill status={st} />
                    <DetailButton onClick={onDetail} floating={false} />
                </div>
            </div>
        </div>
    );
}

const viewStateKey = (id: string) => `tournament-schedule-view:${id}`;

function readSavedView(id: string): { tab?: TabKey; round?: number | null } | null {
    try {
        const raw = sessionStorage.getItem(viewStateKey(id));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
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
    const [tab, setTab] = useState<TabKey>("round");

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
                    const rawPr = act?.detail?.rules?.playoff_round_number;
                    const pr = rawPr != null ? Number(rawPr) : null;
                    const rr = pr == null ? r : r.filter((x: any) => x.round_number !== pr);
                    const hasPlayoffRound = pr != null && r.some((x: any) => x.round_number === pr);

                    const saved = readSavedView(id);

                    const savedRoundValid =
                        saved?.round != null && rr.some((x: any) => x.round_number === saved.round);
                    if (savedRoundValid) {
                        setActiveRound(saved!.round as number);
                    } else {
                        const firstUnfinished = rr.find((round: any) =>
                            (round.matches ?? []).some((m: any) => m.status !== "completed"),
                        );
                        setActiveRound((firstUnfinished ?? rr[0])?.round_number ?? null);
                    }

                    if (saved?.tab) {
                        setTab(saved.tab);
                    } else if (hasPlayoffRound) {
                        setTab("playoff");
                    }

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

    useEffect(() => {
        if (!id || !hasAutoSelectedRef.current) return;
        try {
            sessionStorage.setItem(viewStateKey(id), JSON.stringify({ tab, round: activeRound }));
        } catch { }
    }, [id, tab, activeRound]);

    const teamIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        teams.forEach((t, idx) => map.set(t.id, idx));
        return map;
    }, [teams]);

    const playoffRound = useMemo<number | null>(() => {
        const v = activity?.detail?.rules?.playoff_round_number;
        return v != null ? Number(v) : null;
    }, [activity]);

    const roundRobinRounds = useMemo(
        () => (playoffRound == null ? rounds : rounds.filter((r) => r.round_number !== playoffRound)),
        [rounds, playoffRound],
    );

    const playoffMatches = useMemo<any[]>(
        () =>
            playoffRound == null
                ? []
                : (rounds.find((r) => r.round_number === playoffRound)?.matches ?? []),
        [rounds, playoffRound],
    );

    const hasPlayoff = playoffMatches.length > 0;
    const activeTab: TabKey = hasPlayoff ? tab : "round";

    const standings = useMemo(
        () => computeStandings(teams, roundRobinRounds.flatMap((r) => r.matches ?? [])),
        [teams, roundRobinRounds],
    );

    const rankByTeam = useMemo(() => {
        const map = new Map<string, number>();
        standings.forEach((s, idx) => map.set(s.id, idx + 1));
        return map;
    }, [standings]);

    const { finalMatch, thirdMatch } = useMemo(() => {
        if (!playoffMatches.length) return { finalMatch: null as any, thirdMatch: null as any };
        const top2 = new Set(standings.slice(0, 2).map((s) => s.id));
        let final = playoffMatches.find((m) => top2.has(m.team1_id) && top2.has(m.team2_id));
        if (!final) final = playoffMatches[0]; // fallback
        const third = playoffMatches.find((m) => m.id !== final.id) ?? null;
        return { finalMatch: final, thirdMatch: third };
    }, [playoffMatches, standings]);

    const currentRound = roundRobinRounds.find((r) => r.round_number === activeRound) ?? roundRobinRounds[0];
    const currentRoundNumber = currentRound?.round_number ?? null;

    const roundHasMyTeam = (r: any) =>
        !!myTeamId &&
        (r.matches ?? []).some((m: any) => m.team1?.id === myTeamId || m.team2?.id === myTeamId);

    const playoffHasMyTeam =
        !!myTeamId && playoffMatches.some((m) => m.team1?.id === myTeamId || m.team2?.id === myTeamId);

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

    const goToActivityEventsTab = () => {
        try {
            sessionStorage.setItem("activity:return-tab", "events");
        } catch { }
        router.push("/activity");
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
                    <button
                        onClick={goToActivityEventsTab}
                        title="Về trang hoạt động"
                        aria-label="Về trang hoạt động"
                        className="p-2 -mr-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                        <Home className="w-5 h-5 text-gray-600" />
                    </button>
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
                        {hasPlayoff && (
                            <div className="flex p-1 mb-4 bg-gray-200/70 rounded-full">
                                <button
                                    onClick={() => setTab("round")}
                                    className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "round"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                        }`}
                                >
                                    Vòng tròn
                                </button>
                                <button
                                    onClick={() => setTab("playoff")}
                                    className={`relative flex-1 py-2 rounded-full text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${activeTab === "playoff"
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                        }`}
                                >
                                    <Trophy className="w-3.5 h-3.5" />
                                    Tranh hạng
                                    {playoffHasMyTeam && (
                                        <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                                    )}
                                </button>
                            </div>
                        )}

                        {activeTab === "round" && (
                            <>
                                <div
                                    className={`flex items-center gap-2 overflow-x-auto pt-1.5 pb-1 px-1 -mx-1 mb-4 ${HIDE_SCROLLBAR_CLASS}`}
                                >
                                    {roundRobinRounds.map((r) => {
                                        const isActive = r.round_number === currentRoundNumber;
                                        const mine = roundHasMyTeam(r);
                                        return (
                                            <div key={r.round_number} className="relative flex-shrink-0">
                                                <button
                                                    onClick={() => setActiveRound(r.round_number)}
                                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isActive
                                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                                        : "bg-white text-gray-500 border border-gray-200"
                                                        }`}
                                                >
                                                    Lượt {r.round_number}
                                                </button>
                                                {mine && (
                                                    <span
                                                        className="absolute -top-1 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#F4F6FA] pointer-events-none"
                                                        aria-label="Đội của bạn thi đấu lượt này"
                                                    />
                                                )}
                                            </div>
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
                                                {matches.map((m: any) => (
                                                    <MatchCard
                                                        key={m.id}
                                                        m={m}
                                                        teamIndexMap={teamIndexMap}
                                                        myTeamId={myTeamId}
                                                        onDetail={() => goToMatchDetail(m.id)}
                                                    />
                                                ))}
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
                                                {noCourt.map((m: any) => (
                                                    <MatchCard
                                                        key={m.id}
                                                        m={m}
                                                        teamIndexMap={teamIndexMap}
                                                        myTeamId={myTeamId}
                                                        onDetail={() => goToMatchDetail(m.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === "playoff" && (
                            <div className="space-y-4">
                                {finalMatch && (
                                    <PlayoffMatchCard
                                        m={finalMatch}
                                        variant="final"
                                        rankByTeam={rankByTeam}
                                        teamIndexMap={teamIndexMap}
                                        myTeamId={myTeamId}
                                        onDetail={() => goToMatchDetail(finalMatch.id)}
                                    />
                                )}
                                {thirdMatch && (
                                    <PlayoffMatchCard
                                        m={thirdMatch}
                                        variant="third"
                                        rankByTeam={rankByTeam}
                                        teamIndexMap={teamIndexMap}
                                        myTeamId={myTeamId}
                                        onDetail={() => goToMatchDetail(thirdMatch.id)}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
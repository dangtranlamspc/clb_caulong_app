"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock, Trophy, Home } from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { CustomSelect, CustomSelectOption } from "@/components/admin/sessions/CustomSelect";

type Match = any;
type Round = { round_number: number; bye_team_name: string | null; matches: Match[] };

const BADGE_COLORS = [
    { bg: "bg-emerald-500" },
    { bg: "bg-sky-500" },
    { bg: "bg-indigo-500" },
    { bg: "bg-amber-500" },
    { bg: "bg-rose-500" },
    { bg: "bg-violet-500" },
    { bg: "bg-cyan-500" },
    { bg: "bg-orange-500" },
];

export default function TournamentResultsPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const activityId = params.id;

    const goToActivityEventsTab = () => {
        try {
            sessionStorage.setItem("activity:return-tab", "events");
        } catch { }
        router.push("/activity");
    };

    const [rounds, setRounds] = useState<Round[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "byTeam">("all");
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    const [playoffRoundNumber, setPlayoffRoundNumber] = useState<number | null>(null);
    const [adjustments, setAdjustments] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            activitiesApi.getTournamentSchedule(activityId),
            activitiesApi.getTournamentTeams(activityId),
            activitiesApi.get(activityId),
            activitiesApi.getPointAdjustments(activityId),
        ])
            .then(([sch, tms, act, adj]) => {
                if (!mounted) return;
                const rs: Round[] = sch.data.rounds ?? [];
                setRounds(rs);
                const teamList = tms.data.teams ?? [];
                setTeams(teamList);
                if (teamList.length) setSelectedTeamId(teamList[0].id);

                const pr = act.data?.detail?.rules?.playoff_round_number;
                setPlayoffRoundNumber(pr != null ? Number(pr) : null);
                setAdjustments(adj.data.adjustments ?? []);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [activityId]);

    const teamMeta = useMemo(() => {
        const map = new Map<string, { number: number; color: string }>();
        teams.forEach((t, idx) => {
            map.set(t.id, {
                number: idx + 1,
                color: BADGE_COLORS[idx % BADGE_COLORS.length].bg,
            });
        });
        return map;
    }, [teams]);

    const playoffLabelByMatch = useMemo(() => {
        const labels = new Map<string, string>();
        if (playoffRoundNumber == null) return labels;

        const stats = new Map<
            string,
            { id: string; pointsFor: number; pointsAgainst: number; wins: number; adj: number }
        >();
        teams.forEach((t) =>
            stats.set(t.id, { id: t.id, pointsFor: 0, pointsAgainst: 0, wins: 0, adj: 0 }),
        );

        for (const r of rounds) {
            if (r.round_number >= playoffRoundNumber) continue;
            for (const m of r.matches ?? []) {
                if (m.status !== "completed") continue;
                const t1 = stats.get(m.team1?.id);
                const t2 = stats.get(m.team2?.id);
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
        }
        for (const a of adjustments) {
            const s = stats.get(a.team_id);
            if (s) s.adj += a.delta;
        }

        const ranked = [...stats.values()].sort((a, b) => {
            const ta = a.pointsFor + a.adj;
            const tb = b.pointsFor + b.adj;
            if (tb !== ta) return tb - ta;
            const da = a.pointsFor - a.pointsAgainst;
            const db = b.pointsFor - b.pointsAgainst;
            if (db !== da) return db - da;
            return b.wins - a.wins;
        });
        const [r1, r2, r3, r4] = ranked.map((s) => s.id);

        const playoffRound = rounds.find((r) => r.round_number === playoffRoundNumber);
        for (const m of playoffRound?.matches ?? []) {
            const ids = [m.team1?.id, m.team2?.id];
            if (ids.includes(r1) && ids.includes(r2)) labels.set(m.id, "Tranh hạng Nhất - Nhì");
            else if (ids.includes(r3) && ids.includes(r4)) labels.set(m.id, "Tranh hạng Ba - Tư");
            else labels.set(m.id, "Trận tranh hạng");
        }
        return labels;
    }, [rounds, teams, adjustments, playoffRoundNumber]);

    const formatDate = (iso?: string | null) => {
        if (!iso) return null;
        return new Date(iso).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const roundDate = (round: Round) => {
        const withDate = (round.matches ?? []).find((m: any) => m.scheduled_at);
        return withDate ? formatDate(withDate.scheduled_at) : null;
    };

    const teamOptions: CustomSelectOption[] = useMemo(
        () =>
            teams.map((t) => ({
                value: t.id,
                label: t.name,
            })),
        [teams],
    );

    const filteredRounds = useMemo(() => {
        if (tab === "all" || !selectedTeamId) return rounds;
        return rounds
            .map((r) => ({
                ...r,
                matches: (r.matches ?? []).filter(
                    (m: any) => m.team1?.id === selectedTeamId || m.team2?.id === selectedTeamId,
                ),
            }))
            .filter((r) => r.matches.length > 0);
    }, [rounds, tab, selectedTeamId]);

    if (loading) {
        return (
            <div className="mx-auto min-h-screen w-full max-w-md bg-[var(--surface)] p-4">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-[var(--surface-muted)]" />
                <div className="mt-4 h-10 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                <div className="mt-4 h-64 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            </div>
        );
    }

    return (
        <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-[var(--surface)]">
            <div className="flex-shrink-0">
                <Header onBack={() => router.back()} onHome={goToActivityEventsTab} />

                {/* Tabs */}
                <div className="px-4 pt-1">
                    <div className="flex gap-1 rounded-2xl bg-[var(--surface-muted)] p-1">
                        <button
                            onClick={() => setTab("all")}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === "all"
                                ? "bg-[var(--surface)] text-[var(--text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                                }`}
                        >
                            Tất cả lượt
                        </button>
                        <button
                            onClick={() => setTab("byTeam")}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === "byTeam"
                                ? "bg-[var(--surface)] text-[var(--text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                                : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                                }`}
                        >
                            Theo đội
                        </button>
                    </div>
                </div>

                {tab === "byTeam" && (
                    <div className="mt-3 px-4">
                        <div className="flex items-center gap-2">
                            {selectedTeamId && (
                                <span
                                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${teamMeta.get(selectedTeamId)?.color ?? "bg-gray-400"
                                        }`}
                                >
                                    {teamMeta.get(selectedTeamId)?.number}
                                </span>
                            )}
                            <div className="flex-1">
                                <CustomSelect
                                    value={selectedTeamId ?? ""}
                                    onChange={(val) => setSelectedTeamId(val)}
                                    options={teamOptions}
                                    placeholder="Chọn đội"
                                    triggerClassName="w-full flex items-center justify-between rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text)] text-left"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-10 pt-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="space-y-6 px-4">
                    {filteredRounds.map((round) => {
                        const date = roundDate(round);
                        const isPlayoff =
                            playoffRoundNumber != null && round.round_number === playoffRoundNumber;

                        const matches = isPlayoff
                            ? [...round.matches].sort((a: any, b: any) => {
                                const order = (m: any) =>
                                    playoffLabelByMatch.get(m.id)?.includes("Nhất") ? 0 : 1;
                                return order(a) - order(b);
                            })
                            : round.matches;

                        const doneCount = matches.filter((m: any) => m.status === "completed").length;
                        const allDone = doneCount === matches.length && matches.length > 0;

                        return (
                            <section
                                key={round.round_number}
                                className={`overflow-hidden rounded-2xl border shadow-sm ${isPlayoff ? "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)]" : "border-[var(--border)] bg-[var(--surface)]"
                                    }`}
                            >
                                <div
                                    className={`flex items-center justify-between gap-2 px-4 py-2.5 ${isPlayoff
                                        ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                        : "bg-gradient-to-r from-blue-50 to-white border-b border-[var(--border)]"
                                        }`}
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        {isPlayoff ? (
                                            <Trophy className="h-4 w-4 flex-shrink-0 text-white" />
                                        ) : (
                                            <span className="flex h-6 min-w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-black text-white">
                                                {round.round_number}
                                            </span>
                                        )}
                                        <h2
                                            className={`truncate text-sm font-black ${isPlayoff ? "text-white" : "text-[var(--text)]"
                                                }`}
                                        >
                                            {isPlayoff ? "Tranh hạng" : `Lượt ${round.round_number}`}
                                        </h2>
                                    </div>

                                    <div className="flex flex-shrink-0 items-center gap-2">
                                        {date && (
                                            <span
                                                className={`text-[11px] font-semibold ${isPlayoff ? "text-white/90" : "text-[var(--text-faint)]"
                                                    }`}
                                            >
                                                {date}
                                            </span>
                                        )}
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isPlayoff
                                                ? "bg-[color-mix(in_srgb,var(--surface)_25%,transparent)] text-white"
                                                : allDone
                                                    ? "bg-[var(--success-soft)] text-[var(--success)]"
                                                    : "bg-[var(--warning-soft)] text-[var(--warning)]"
                                                }`}
                                        >
                                            {doneCount}/{matches.length} trận
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-[var(--border)]">
                                    {matches.map((m: any) => (
                                        <MatchRow
                                            key={m.id}
                                            match={m}
                                            teamMeta={teamMeta}
                                            label={isPlayoff ? playoffLabelByMatch.get(m.id) : undefined}
                                        />
                                    ))}
                                </div>

                                {round.bye_team_name && !isPlayoff && (
                                    <p className="border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-[11px] text-[var(--text-faint)]">
                                        Nghỉ: <span className="font-semibold text-[var(--text-muted)]">{round.bye_team_name}</span>
                                    </p>
                                )}
                            </section>
                        );
                    })}

                    {filteredRounds.length === 0 && (
                        <div className="py-10 text-center text-sm text-[var(--text-faint)]">
                            Chưa có kết quả thi đấu
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TeamBadge({ meta }: { meta?: { number: number; color: string } }) {
    return (
        <span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${meta?.color ?? "bg-gray-400"
                }`}
        >
            {meta?.number ?? ""}
        </span>
    );
}

function MatchRow({
    match,
    teamMeta,
    label,
}: {
    match: any;
    teamMeta: Map<string, { number: number; color: string }>;
    label?: string;
}) {
    const completed = match.status === "completed";
    const ongoing = match.status === "ongoing";
    const s1 = match.team1_score ?? 0;
    const s2 = match.team2_score ?? 0;
    const team1Won = completed && s1 > s2;
    const team2Won = completed && s2 > s1;

    const nameCls = (won: boolean, lost: boolean) =>
        `truncate text-sm ${won
            ? "font-black text-[var(--success)]"
            : lost
                ? "font-semibold text-[var(--text-faint)]"
                : "font-bold text-[var(--text)]"
        }`;

    const scoreCls = (won: boolean, lost: boolean) =>
        won ? "text-[var(--success)]" : lost ? "text-[var(--danger)]" : "text-[var(--text)]";

    return (
        <div className="px-3 py-3">
            {label && (
                <p className="mb-2 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--warning)]">
                        <Trophy className="h-3 w-3" />
                        {label}
                    </span>
                </p>
            )}

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className={nameCls(team1Won, team2Won)}>{match.team1?.name ?? "—"}</span>
                    <TeamBadge meta={teamMeta.get(match.team1?.id)} />
                </div>

                <div className="flex w-[76px] flex-col items-center gap-0.5">
                    {completed ? (
                        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--surface-muted)] px-3 py-1 text-base font-black tabular-nums ring-1 ring-gray-100">
                            <span className={scoreCls(team1Won, team2Won)}>{s1}</span>
                            <span className="text-[var(--text-faint)]">-</span>
                            <span className={scoreCls(team2Won, team1Won)}>{s2}</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center rounded-xl bg-[var(--surface-muted)] px-3 py-1 text-xs font-black tracking-widest text-[var(--text-faint)] ring-1 ring-gray-100">
                            VS
                        </div>
                    )}

                    {completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                    ) : ongoing ? (
                        <span className="text-[10px] font-bold text-[var(--warning)] animate-pulse">
                            Đang đấu
                        </span>
                    ) : (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-faint)]">
                            <Clock className="h-3 w-3" /> Chưa đấu
                        </span>
                    )}
                </div>

                <div className="flex min-w-0 items-center gap-2">
                    <TeamBadge meta={teamMeta.get(match.team2?.id)} />
                    <span className={nameCls(team2Won, team1Won)}>{match.team2?.name ?? "—"}</span>
                </div>
            </div>
        </div>
    );
}

function Header({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
    return (
        <div className="flex items-center gap-2 bg-[var(--surface)] px-3 pb-2 pt-3">
            <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
                aria-label="Quay lại"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 truncate text-lg font-black text-[var(--text)]">Kết quả giải đấu</h1>
            <button
                onClick={onHome}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
                title="Về trang hoạt động"
                aria-label="Về trang hoạt động"
            >
                <Home className="h-5 w-5" />
            </button>
        </div>
    );
}
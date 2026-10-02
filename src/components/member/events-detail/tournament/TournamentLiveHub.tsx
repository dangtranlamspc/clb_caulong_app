"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, BarChart3, Users2, ChevronRight, Trophy, Swords } from "lucide-react";
import { activitiesApi } from "@/lib/api";

function computeRanking(rounds: any[]) {
    const map = new Map<string, { id: string; pf: number; pa: number; wins: number }>();
    const ensure = (id: string) => {
        if (!map.has(id)) map.set(id, { id, pf: 0, pa: 0, wins: 0 });
        return map.get(id)!;
    };

    for (const r of rounds) {
        for (const m of r.matches ?? []) {
            if (m.status !== "completed") continue;
            const t1 = m.team1?.id && ensure(m.team1.id);
            const t2 = m.team2?.id && ensure(m.team2.id);
            if (!t1 || !t2) continue;
            t1.pf += m.team1_score ?? 0;
            t1.pa += m.team2_score ?? 0;
            t2.pf += m.team2_score ?? 0;
            t2.pa += m.team1_score ?? 0;
            if ((m.team1_score ?? 0) > (m.team2_score ?? 0)) t1.wins += 1;
            else if ((m.team2_score ?? 0) > (m.team1_score ?? 0)) t2.wins += 1;
        }
    }

    return [...map.values()].sort((a, b) => {
        if (b.pf !== a.pf) return b.pf - a.pf;
        const da = a.pf - a.pa;
        const db = b.pf - b.pa;
        if (db !== da) return db - da;
        return b.wins - a.wins;
    });
}

function getPlayoffLabel(match: any, ranking: { id: string }[]) {
    const ids = [match.team1?.id, match.team2?.id];
    const [r1, r2, r3, r4] = ranking.map((t) => t.id);
    if (ids.includes(r1) && ids.includes(r2)) return "Tranh hạng Nhất - Nhì";
    if (ids.includes(r3) && ids.includes(r4)) return "Tranh hạng Ba - Tư";
    return "Tranh hạng";
}

function useTournamentProgress(
    activityId: string,
    playoffRoundNumber: number | null,
    myTeamId: string | null,
) {
    const [rounds, setRounds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        activitiesApi
            .getTournamentSchedule(activityId)
            .then(({ data }) => {
                if (mounted) setRounds(data.rounds ?? []);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [activityId]);

    const summary = useMemo(() => {
        if (!rounds.length) return null;
        const currentRound =
            rounds.find((r) => (r.matches ?? []).some((m: any) => m.status !== "completed")) ??
            rounds[rounds.length - 1];

        const matches = currentRound.matches ?? [];
        const total = matches.length;
        const done = matches.filter((m: any) => m.status === "completed").length;

        const allDone = rounds.every((r) =>
            (r.matches ?? []).every((m: any) => m.status === "completed"),
        );

        const isPlayoff =
            playoffRoundNumber != null && currentRound.round_number === playoffRoundNumber;

        let title = `Lượt ${currentRound.round_number}`;
        let labelByMatchId = new Map<string, string>();

        if (isPlayoff) {
            const ranking = computeRanking(
                rounds.filter((r) => r.round_number < playoffRoundNumber!),
            );
            matches.forEach((m: any) => labelByMatchId.set(m.id, getPlayoffLabel(m, ranking)));

            const myMatch = myTeamId
                ? matches.find((m: any) => m.team1?.id === myTeamId || m.team2?.id === myTeamId)
                : null;
            title = myMatch ? labelByMatchId.get(myMatch.id)! : "Tranh hạng";
        }

        return {
            roundNumber: currentRound.round_number,
            title,
            isPlayoff,
            labelByMatchId,
            done,
            total,
            allDone,
            matches,
        };
    }, [rounds, playoffRoundNumber, myTeamId]);

    return { summary, loading };
}

export function TournamentLiveHub({ activity, myStatus }: { activity: any; myStatus: any }) {
    const router = useRouter();
    const ended = Boolean(activity.ended_at);

    const myTeamId = myStatus?.my_registration?.team?.id ?? null;
    const hasTeamAssigned = Boolean(myTeamId);
    const playoffRoundNumber = activity.detail?.rules?.playoff_round_number ?? null;

    const { summary, loading } = useTournamentProgress(activity.id, playoffRoundNumber, myTeamId);

    const myOngoingMatch = useMemo(() => {
        if (!myTeamId || !summary) return null;
        return (
            summary.matches.find(
                (m: any) =>
                    m.status === "ongoing" &&
                    (m.team1?.id === myTeamId || m.team2?.id === myTeamId),
            ) ?? null
        );
    }, [summary, myTeamId]);

    const menuItems = [
        {
            key: "schedule",
            label: "Lịch thi đấu",
            icon: CalendarDays,
            iconBg: "bg-cyan-50",
            iconColor: "text-cyan-600",
            path: `/events/${activity.id}/schedule`,
        },
        {
            key: "results",
            label: "Kết quả",
            icon: CheckCircle2,
            iconBg: "bg-[var(--success-soft)]",
            iconColor: "text-[var(--success)]",
            path: `/events/${activity.id}/results`,
        },
        {
            key: "standings",
            label: "Bảng xếp hạng",
            icon: BarChart3,
            iconBg: "bg-[var(--purple-soft)]",
            iconColor: "text-[var(--purple)]",
            path: `/events/${activity.id}/standings`,
        },
        ...(hasTeamAssigned
            ? [
                {
                    key: "my-team",
                    label: "Đội của tôi",
                    icon: Users2,
                    iconBg: "bg-[var(--warning-soft)]",
                    iconColor: "text-[var(--warning)]",
                    path: `/events/${activity.id}/my-team`,
                },
            ]
            : []),
    ];

    return (
        <div className="space-y-4">

            <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${ended ? "bg-[var(--surface-muted)]" : "bg-[var(--success-soft)]"
                            }`}
                    >
                        {ended ? (
                            <Trophy className="h-5 w-5 text-[var(--text-muted)]" />
                        ) : (
                            <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                            </span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className={`text-sm font-black ${ended ? "text-[var(--text-muted)]" : "text-[var(--success)]"}`}>
                            {ended ? "Đã kết thúc" : "Đang thi đấu"}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-faint)]">
                            {loading
                                ? "Đang tải..."
                                : summary
                                    ? `${summary.title} - ${summary.done}/${summary.total} trận đã xong`
                                    : "Chưa có lịch thi đấu"}
                        </p>
                    </div>
                </div>

                {!loading && summary && summary.total > 0 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                        <div
                            className={`h-full rounded-full transition-all ${ended ? "bg-slate-400" : "bg-emerald-500"
                                }`}
                            style={{ width: `${Math.round((summary.done / summary.total) * 100)}%` }}
                        />
                    </div>
                )}

                {!loading && myOngoingMatch && (
                    <button
                        onClick={() => router.push(`/events/${activity.id}/schedule`)}
                        className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-3.5 py-3 text-left transition hover:bg-[var(--warning-soft)]"
                    >
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                            <Swords className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-[var(--warning)]">
                                Đội bạn đang thi đấu!
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--warning)]">
                                {summary?.isPlayoff && summary.labelByMatchId.get(myOngoingMatch.id)
                                    ? `${summary.labelByMatchId.get(myOngoingMatch.id)} · `
                                    : ""}
                                {myOngoingMatch.team1?.name} vs {myOngoingMatch.team2?.name}
                                {myOngoingMatch.court_number ? ` · Sân ${myOngoingMatch.court_number}` : ""}
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
                    </button>
                )}
            </section>

            {!hasTeamAssigned && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] px-3.5 py-3">
                    <Users2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-faint)]" />
                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                        Bạn chưa được xếp vào đội thi đấu nào. BTC sẽ sớm cập nhật danh sách đội.
                    </p>
                </div>
            )}

            <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-sm divide-y divide-[var(--border)]">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.key}
                            onClick={() => router.push(item.path)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]"
                        >
                            <div
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                            >
                                <Icon className={`h-5 w-5 ${item.iconColor}`} />
                            </div>
                            <span className="flex-1 text-sm font-bold text-[var(--text)]">{item.label}</span>
                            <ChevronRight className="h-4 w-4 text-[var(--text-faint)]" />
                        </button>
                    );
                })}
            </section>
        </div>
    );
}
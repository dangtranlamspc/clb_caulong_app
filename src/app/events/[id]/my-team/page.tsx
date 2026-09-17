"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { activitiesApi } from "@/lib/api";

type Match = any;
type Round = { round_number: number; bye_team_name: string | null; matches: Match[] };

export default function MyTeamPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const activityId = params.id;

    const [rounds, setRounds] = useState<Round[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            activitiesApi.getTournamentSchedule(activityId),
            activitiesApi.getTournamentTeams(activityId),
            activitiesApi.getMyStatus(activityId),
        ])
            .then(([sch, tms, mine]) => {
                if (!mounted) return;
                setRounds(sch.data.rounds ?? []);
                setTeams(tms.data.teams ?? []);
                setMyTeamId(mine.data?.my_registration?.team?.id ?? null);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [activityId]);

    const allMatches = useMemo(
        () => rounds.flatMap((r) => (r.matches ?? []).map((m) => ({ ...m, round_number: r.round_number }))),
        [rounds],
    );

    const standings = useMemo(() => {
        const stats = new Map<string, { points: number; wins: number; played: number; total: number }>();
        const ensure = (id: string) => {
            if (!stats.has(id)) stats.set(id, { points: 0, wins: 0, played: 0, total: 0 });
            return stats.get(id)!;
        };

        for (const t of teams) ensure(t.id);

        for (const m of allMatches) {
            if (!m.team1?.id || !m.team2?.id) continue;
            const s1 = ensure(m.team1.id);
            const s2 = ensure(m.team2.id);
            s1.total += 1;
            s2.total += 1;
            if (m.status !== "completed") continue;
            s1.played += 1;
            s2.played += 1;
            s1.points += m.team1_score ?? 0;
            s2.points += m.team2_score ?? 0;
            if (m.winner_team_id === m.team1.id) s1.wins += 1;
            if (m.winner_team_id === m.team2.id) s2.wins += 1;
        }

        const sorted = [...stats.entries()].sort((a, b) => {
            if (b[1].points !== a[1].points) return b[1].points - a[1].points;
            return b[1].wins - a[1].wins;
        });

        const rankMap = new Map<string, number>();
        sorted.forEach(([id], idx) => rankMap.set(id, idx + 1));

        return { stats, rankMap };
    }, [allMatches, teams]);

    const myTeam = teams.find((t) => t.id === myTeamId) ?? null;
    const myStats = myTeamId ? standings.stats.get(myTeamId) : undefined;
    const myRank = myTeamId ? standings.rankMap.get(myTeamId) : undefined;

    /** Điểm của đội mình theo từng lượt */
    const roundScores = useMemo(() => {
        if (!myTeamId) return [];
        return rounds.map((r) => {
            const m = (r.matches ?? []).find(
                (x: any) => x.team1?.id === myTeamId || x.team2?.id === myTeamId,
            );
            if (!m) return { round: r.round_number, score: null, bye: true };
            if (m.status !== "completed") return { round: r.round_number, score: null, bye: false };
            const score = m.team1?.id === myTeamId ? m.team1_score : m.team2_score;
            return { round: r.round_number, score: score ?? 0, bye: false };
        });
    }, [rounds, myTeamId]);

    /** Trận kế tiếp chưa đá */
    const nextMatch = useMemo(() => {
        if (!myTeamId) return null;
        return (
            allMatches
                .filter(
                    (m) =>
                        m.status !== "completed" &&
                        (m.team1?.id === myTeamId || m.team2?.id === myTeamId),
                )
                .sort((a, b) => a.round_number - b.round_number)[0] ?? null
        );
    }, [allMatches, myTeamId]);

    const formatDate = (iso?: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        return d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="mx-auto min-h-screen w-full max-w-md bg-white p-4">
                <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
                <div className="mt-4 h-40 animate-pulse rounded-[24px] bg-gray-100" />
                <div className="mt-4 h-64 animate-pulse rounded-[24px] bg-gray-100" />
            </div>
        );
    }

    if (!myTeam) {
        return (
            <div className="mx-auto min-h-screen w-full max-w-md bg-white">
                <Header onBack={() => router.back()} />
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                    Bạn chưa được xếp vào đội thi đấu nào.
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10">
            <Header onBack={() => router.back()} />

            <div className="px-4">
                <div className="rounded-[20px] bg-rose-50 px-4 pb-4 pt-4 text-center">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-sm font-black text-white">
                        {myRank ?? "-"}
                    </div>
                    <p className="mt-2 text-xl font-black text-gray-900">{myTeam.name}</p>
                </div>
            </div>

            <div className="mt-3 px-4">
                <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-gray-200">
                    <div className="border-r border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500">Hạng hiện tại</p>
                        <p className="mt-1 text-2xl font-black text-rose-600">
                            #{myRank ?? "-"}
                        </p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-gray-500">Tổng điểm</p>
                        <p className="mt-1 text-2xl font-black text-rose-600">
                            {myStats?.points ?? 0}
                        </p>
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between rounded-[16px] border border-gray-200 px-4 py-3">
                    <span className="text-sm text-gray-500">Đã thi đấu</span>
                    <span className="text-sm font-black text-gray-900">
                        {myStats?.played ?? 0} / {myStats?.total ?? 0}
                    </span>
                </div>
            </div>

            {/* Điểm theo lượt */}
            <div className="mt-5 px-4">
                <h2 className="text-base font-black text-gray-900">Điểm theo lượt</h2>
                <div className="mt-2 overflow-hidden rounded-[16px] border border-gray-200">
                    {roundScores.map((r, idx) => {
                        const hasScore = r.score !== null;
                        return (
                            <div
                                key={r.round}
                                className={`flex items-center gap-3 px-4 py-2.5 ${idx % 2 === 1 ? "bg-slate-50" : "bg-white"
                                    } ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                            >
                                <span className="w-4 text-xs font-bold text-gray-400">{r.round}</span>
                                <span
                                    className={`flex-1 text-sm ${hasScore ? "font-bold text-gray-800" : "text-gray-400"
                                        }`}
                                >
                                    Lượt {r.round}
                                </span>
                                <span
                                    className={`text-sm font-black ${hasScore ? "text-gray-900" : "text-gray-300"
                                        }`}
                                >
                                    {hasScore ? r.score : "-"}
                                </span>
                            </div>
                        );
                    })}
                    {roundScores.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-gray-400">
                            Chưa có lịch thi đấu
                        </div>
                    )}
                </div>
            </div>

            {/* Trận tiếp theo */}
            {nextMatch && (
                <div className="mt-5 px-4">
                    <h2 className="text-base font-black text-gray-900">Trận tiếp theo</h2>
                    <div className="mt-2 rounded-[16px] border border-gray-200 px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-sm font-black text-gray-900">
                                {nextMatch.team1?.name ?? "—"}
                            </span>
                            <span className="text-xs font-bold text-gray-400">vs</span>
                            <span className="text-sm font-black text-gray-900">
                                {nextMatch.team2?.name ?? "—"}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            {[
                                `Lượt ${nextMatch.round_number}`,
                                formatDate(nextMatch.scheduled_at),
                                nextMatch.court_number ? `Sân ${nextMatch.court_number}` : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function Header({ onBack }: { onBack: () => void }) {
    return (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 py-3">
            <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                aria-label="Quay lại"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-black text-gray-900">Đội của tôi</h1>
        </div>
    );
}
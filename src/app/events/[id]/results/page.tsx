"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock } from "lucide-react";
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

    const [rounds, setRounds] = useState<Round[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"all" | "byTeam">("all");
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            activitiesApi.getTournamentSchedule(activityId),
            activitiesApi.getTournamentTeams(activityId),
        ])
            .then(([sch, tms]) => {
                if (!mounted) return;
                const rs: Round[] = sch.data.rounds ?? [];
                setRounds(rs);
                const teamList = tms.data.teams ?? [];
                setTeams(teamList);
                if (teamList.length) setSelectedTeamId(teamList[0].id);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [activityId]);

    // Gán số thứ tự + màu cố định cho từng đội theo thứ tự tạo đội
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
            <div className="mx-auto min-h-screen w-full max-w-md bg-white p-4">
                <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
                <div className="mt-4 h-10 animate-pulse rounded-full bg-gray-100" />
                <div className="mt-4 h-64 animate-pulse rounded-2xl bg-gray-100" />
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10">
            <Header onBack={() => router.back()} />

            {/* Tabs */}
            <div className="px-4 pt-1">
                <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
                    <button
                        onClick={() => setTab("all")}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === "all"
                            ? "bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                            : "text-gray-400 hover:text-gray-500"
                            }`}
                    >
                        Tất cả lượt
                    </button>
                    <button
                        onClick={() => setTab("byTeam")}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === "byTeam"
                            ? "bg-white text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                            : "text-gray-400 hover:text-gray-500"
                            }`}
                    >
                        Theo đội
                    </button>
                </div>
            </div>

            {/* Chọn đội (chỉ hiện ở tab Theo đội) */}
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
                                triggerClassName="w-full flex items-center justify-between rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-800 text-left"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Danh sách lượt đấu */}
            <div className="mt-4 space-y-6 px-4">
                {filteredRounds.map((round) => {
                    const date = roundDate(round);
                    return (
                        <div key={round.round_number}>
                            <h2 className="text-[15px] font-black text-blue-700">
                                Lượt {round.round_number}
                                {date ? ` - ${date}` : ""}
                            </h2>
                            <div className="mt-2 space-y-2">
                                {round.matches.map((m: any) => (
                                    <MatchRow key={m.id} match={m} teamMeta={teamMeta} />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {filteredRounds.length === 0 && (
                    <div className="py-10 text-center text-sm text-gray-400">
                        Chưa có kết quả thi đấu
                    </div>
                )}
            </div>
        </div>
    );
}

function MatchRow({
    match,
    teamMeta,
}: {
    match: any;
    teamMeta: Map<string, { number: number; color: string }>;
}) {
    const completed = match.status === "completed";
    const team2Meta = teamMeta.get(match.team2?.id);

    return (
        <div className="flex items-center justify-center gap-2 rounded-2xl px-1 py-2">
            <span className="w-20 flex-shrink-0 truncate text-right text-sm font-bold text-gray-800 sm:w-24">
                {match.team1?.name ?? "—"}
            </span>

            {completed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
            ) : (
                <Clock className="h-4 w-4 flex-shrink-0 text-gray-300" />
            )}

            <span
                className={`w-14 flex-shrink-0 text-center text-sm font-black ${completed ? "text-gray-900" : "text-gray-300"
                    }`}
            >
                {completed ? `${match.team1_score} - ${match.team2_score}` : "- - -"}
            </span>

            <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${team2Meta?.color ?? "bg-gray-400"
                    }`}
            >
                {team2Meta?.number ?? ""}
            </span>

            <span className="w-20 flex-shrink-0 truncate text-left text-sm font-bold text-gray-800 sm:w-24">
                {match.team2?.name ?? "—"}
            </span>
        </div>
    );
}

function Header({ onBack }: { onBack: () => void }) {
    return (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 pb-2 pt-3">
            <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                aria-label="Quay lại"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-black text-gray-900">Kết quả giải đấu</h1>
        </div>
    );
}
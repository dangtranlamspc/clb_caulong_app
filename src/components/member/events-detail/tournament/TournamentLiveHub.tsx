"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, BarChart3, Users2, ChevronRight, Trophy } from "lucide-react";
import { activitiesApi } from "@/lib/api";

function useTournamentProgress(activityId: string) {
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

        const total = currentRound.matches?.length ?? 0;
        const done = (currentRound.matches ?? []).filter((m: any) => m.status === "completed").length;

        const allDone = rounds.every((r) =>
            (r.matches ?? []).every((m: any) => m.status === "completed"),
        );

        return {
            roundNumber: currentRound.round_number,
            done,
            total,
            allDone,
        };
    }, [rounds]);

    return { summary, loading };
}

export function TournamentLiveHub({ activity }: { activity: any }) {
    const router = useRouter();
    const { summary, loading } = useTournamentProgress(activity.id);
    const ended = Boolean(activity.ended_at);

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
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            path: `/events/${activity.id}/results`,
        },
        {
            key: "standings",
            label: "Bảng xếp hạng",
            icon: BarChart3,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-600",
            path: `/events/${activity.id}/standings`,
        },
        {
            key: "my-team",
            label: "Đội của tôi",
            icon: Users2,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            path: `/events/${activity.id}/my-team`,
        },
    ];

    return (
        <div className="space-y-4">

            <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${ended ? "bg-slate-100" : "bg-emerald-100"
                            }`}
                    >
                        {ended ? (
                            <Trophy className="h-5 w-5 text-slate-500" />
                        ) : (
                            <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                            </span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className={`text-sm font-black ${ended ? "text-slate-700" : "text-emerald-700"}`}>
                            {ended ? "Đã kết thúc" : "Đang thi đấu"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                            {loading
                                ? "Đang tải..."
                                : summary
                                    ? `Lượt ${summary.roundNumber} - ${summary.done}/${summary.total} trận đã xong`
                                    : "Chưa có lịch thi đấu"}
                        </p>
                    </div>
                </div>

                {!loading && summary && summary.total > 0 && (
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                            className={`h-full rounded-full transition-all ${ended ? "bg-slate-400" : "bg-emerald-500"
                                }`}
                            style={{ width: `${Math.round((summary.done / summary.total) * 100)}%` }}
                        />
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.key}
                            onClick={() => router.push(item.path)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50 active:bg-gray-100"
                        >
                            <div
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                            >
                                <Icon className={`h-5 w-5 ${item.iconColor}`} />
                            </div>
                            <span className="flex-1 text-sm font-bold text-gray-800">{item.label}</span>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                        </button>
                    );
                })}
            </section>
        </div>
    );
}
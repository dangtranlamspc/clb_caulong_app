"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { activitiesApi } from "@/lib/api";

import { TournamentHeroCard } from "./TournamentHeroCard";
import { ShirtOrderSection } from "./shirt-order/ShirtOrderSection";
import { TournamentSection } from "./tournament/TournamentSection";
import { OfflineEventSection } from "./OfflineEventSection";
import { PollSection } from "./PollSection";
import { BirthdaySection } from "./BirthdaySection";
import { TYPE_META } from "@/constants/constants";

export default function EventsDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [activity, setActivity] = useState<any>(null);
    const [myStatus, setMyStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            const [{ data: a }, { data: s }] = await Promise.all([
                activitiesApi.get(id),
                activitiesApi.getMyStatus(id),
            ]);
            setActivity(a);
            setMyStatus(s);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [id]);

    const handleBack = () => {
        sessionStorage.setItem("activity:return-tab", "events");
        router.push("/activity");
    };

    if (loading) {
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
                            onClick={handleBack}
                            className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
                    </div>
                </div>

                <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-4">
                    <div className="bg-white rounded-2xl h-40 animate-pulse" />
                    <div className="bg-white rounded-2xl h-56 animate-pulse" />
                </div>
            </div>
        );
    }
    if (!activity) return null;

    const meta = TYPE_META[activity.type];
    const Icon = meta?.icon ?? CalendarDays;

    return (
        <div className="min-h-screen bg-[#F4F6FA] pb-[calc(env(safe-area-inset-bottom)+32px)]">
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
                        onClick={handleBack}
                        className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1">{activity.title}</h1>
                    {activity.type === "shirt_order" && (
                        <div
                            id="shirt-cart-slot-desktop"
                            className="hidden lg:flex items-center flex-shrink-0"
                        />
                    )}
                </div>
            </div>

            <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 space-y-4">
                {activity.type === "tournament" ? (
                    <TournamentHeroCard activity={activity} />
                ) : (
                    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
                                {activity.cover_image_url ? (
                                    <img src={activity.cover_image_url} className="w-full h-full object-cover" />
                                ) : (
                                    (activity.emoji ?? "📌")
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <Icon className="w-3 h-3" /> {meta?.label}
                                </p>
                                <p className="font-bold text-gray-900 truncate">{activity.title}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5 text-sm text-gray-600 border-t border-gray-50 pt-3">
                            {(activity.event_date || activity.deadline) && (
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span>
                                        {activity.deadline ? "Deadline: " : "Ngày diễn ra: "}
                                        {format(
                                            new Date(activity.deadline ?? activity.event_date),
                                            "EEEE, dd/MM/yyyy HH:mm",
                                            { locale: vi },
                                        )}
                                    </span>
                                </div>
                            )}
                            {activity.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span>{activity.location}</span>
                                </div>
                            )}
                        </div>

                        {activity.description && (
                            <p className="text-sm text-gray-500 border-t border-gray-50 pt-3 whitespace-pre-line">
                                {activity.description}
                            </p>
                        )}
                    </div>
                )}

                {activity.type === "shirt_order" && (
                    <ShirtOrderSection activity={activity} myStatus={myStatus} onChanged={fetchAll} />
                )}
                {activity.type === "tournament" && (
                    <TournamentSection activity={activity} myStatus={myStatus} onChanged={fetchAll} />
                )}
                {activity.type === "offline_event" && (
                    <OfflineEventSection activity={activity} myStatus={myStatus} onChanged={fetchAll} />
                )}
                {activity.type === "poll" && (
                    <PollSection activity={activity} myStatus={myStatus} onChanged={fetchAll} />
                )}
                {activity.type === "birthday" && <BirthdaySection myStatus={myStatus} />}
            </div>
        </div>
    );
}

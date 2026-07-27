"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarDays, MapPin } from "lucide-react";

export function TournamentHeroCard({ activity }: { activity: any }) {
    return (
        <div className="rounded-[28px] overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 shadow-lg shadow-fuchsia-200/60">
            <div className="px-5 pt-5 pb-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm ring-2 ring-white/40 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {activity.cover_image_url ? (
                        <img
                            src={activity.cover_image_url}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        (activity.emoji ?? "🏆")
                    )}
                </div>
                <div className="min-w-0 pt-0.5">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-white bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
                        Giải đấu chính thức
                    </span>
                    <p className="text-lg font-black leading-tight text-white truncate mt-1.5">
                        {activity.title}
                    </p>
                </div>
            </div>

            {(activity.event_date || activity.location) && (
                <div className="border-t border-white/20 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/85 bg-black/5">
                    {activity.event_date && (
                        <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {format(
                                new Date(activity.event_date),
                                "EEEE, dd/MM/yyyy · HH:mm",
                                { locale: vi },
                            )}
                        </span>
                    )}
                    {activity.location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {activity.location}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

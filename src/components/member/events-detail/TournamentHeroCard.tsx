"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    CalendarDays,
    MapPin,
    Trophy,
} from "lucide-react";

export function TournamentHeroCard({
    activity,
}: {
    activity: any;
}) {
    return (
        <section className="relative overflow-hidden rounded-[30px] bg-[#0B1220] shadow-[0_18px_45px_rgba(15,23,42,0.18)] w-full mx-auto">

            <div className="absolute inset-0 overflow-hidden">

                <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-violet-600/30 blur-[100px]" />

                <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-[110px]" />

                <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />

                <div
                    className="absolute inset-0 opacity-[0.045]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />

                <div className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 z-10" />
            </div>

            <div className="relative">

                {activity.cover_image_url ? (
                    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
                        <img
                            src={activity.cover_image_url}
                            alt={activity.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/10 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center pt-14">
                        <div className="relative">
                            <div className="absolute -inset-8 rounded-[48px] bg-violet-500/25 blur-3xl" />
                            <div className="relative flex h-[190px] w-[190px] items-center justify-center overflow-hidden rounded-[40px] border border-white/20 bg-white/10 p-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-md">
                                <div className="flex h-full w-full items-center justify-center rounded-[32px] bg-white/10">
                                    <Trophy className="h-16 w-16 text-white" />
                                </div>
                            </div>
                            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-[#172033]/90 px-5 py-2 shadow-lg backdrop-blur-md">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    Official Tournament
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center px-6 sm:px-10 lg:px-16 pt-10 pb-10 lg:pb-14">

                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300 text-center">
                        GIẢI ĐẤU CẦU LÔNG
                    </p>

                    <h1 className="mt-4 w-full text-center text-[32px] sm:text-[38px] lg:text-[44px] font-black leading-[1.1] tracking-[-0.03em] text-white">
                        {activity.title}
                    </h1>

                    <div className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    {(activity.event_date || activity.location) && (
                        <div className="mt-7 flex flex-col sm:flex-row flex-wrap justify-center gap-5 sm:gap-9 w-full sm:w-auto">

                            {activity.event_date && (
                                <div className="flex items-center gap-3.5 justify-center">

                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                                        <CalendarDays className="h-5 w-5 text-cyan-300" />
                                    </div>

                                    <div className="min-w-0 text-left">
                                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                                            Thời gian thi đấu
                                        </p>

                                        <p className="mt-1 truncate text-sm font-semibold text-white/85">
                                            {format(
                                                new Date(activity.event_date),
                                                "EEEE, dd/MM/yyyy · HH:mm",
                                                { locale: vi }
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activity.location && (
                                <div className="flex items-center gap-3.5 justify-center">

                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
                                        <MapPin className="h-5 w-5 text-violet-300" />
                                    </div>

                                    <div className="min-w-0 text-left">
                                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                                            Địa điểm
                                        </p>

                                        <p className="mt-1 truncate text-sm font-semibold text-white/85">
                                            {activity.location}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-6 sm:px-10 lg:px-16 py-4">

                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-white/40" />

                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                            CHUỖI GIẢI ĐẤU BnB
                        </span>
                    </div>

                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-bold tracking-wider text-emerald-300">
                        CHÍNH THỨC
                    </span>
                </div>
            </div>
        </section>
    );
}
"use client";

import { pad2 } from "@/utils/utils";

export function CountBox({
    value,
    label,
    accent,
    tone = "cool",
}: {
    value: number;
    label: string;
    accent?: boolean;
    tone?: "cool" | "warm";
}) {
    const display = pad2(value);
    const numberClass = accent
        ? tone === "warm"
            ? "text-rose-600"
            : "text-indigo-600"
        : "text-white";
    const labelClass = accent
        ? tone === "warm"
            ? "text-rose-600/70"
            : "text-indigo-600/70"
        : "text-white/80";
    return (
        <div
            className={`rounded-2xl py-2.5 text-center border transition-colors ${accent ? "bg-white border-white shadow-sm" : "bg-white/15 border-white/25"
                }`}
        >
            <div className="count-rotate-wrap h-8 flex items-center justify-center">
                <span
                    key={display}
                    className={`count-rotate text-2xl font-black leading-8 ${numberClass}`}
                >
                    {display}
                </span>
            </div>
            <p className={`text-[10px] mt-0.5 ${labelClass}`}>{label}</p>
        </div>
    );
}

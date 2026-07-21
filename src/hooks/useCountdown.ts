"use client";

import { useEffect, useState } from "react";

export function useCountdown(target?: string | null) {
    const [time, setTime] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        expired: true,
    });

    useEffect(() => {
        if (!target) return;
        const targetMs = new Date(target).getTime();

        const tick = () => {
            const diff = targetMs - Date.now();
            if (diff <= 0) {
                setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }
            setTime({
                days: Math.floor(diff / 86_400_000),
                hours: Math.floor((diff % 86_400_000) / 3_600_000),
                minutes: Math.floor((diff % 3_600_000) / 60_000),
                seconds: Math.floor((diff % 60_000) / 1000),
                expired: false,
            });
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [target]);

    return time;
}

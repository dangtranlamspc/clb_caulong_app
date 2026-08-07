"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNavLoadingStore } from "@/store/nav-loading.store";
import { NavLoadingOverlay } from "./NavLoadingOverlay";

export function GlobalNavLoading() {
    const isNavigating = useNavLoadingStore((s) => s.isNavigating);
    const stop = useNavLoadingStore((s) => s.stop);
    const pathname = usePathname();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => stop(), 400);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pathname]);

    useEffect(() => {
        if (isNavigating) {
            safetyTimerRef.current = setTimeout(() => stop(), 6000);
        } else if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
        }
        return () => {
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, [isNavigating]);

    if (!isNavigating) return null;
    return <NavLoadingOverlay fadingOut={false} />;
}
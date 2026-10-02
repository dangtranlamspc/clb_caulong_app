"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { Moon, Sun, Monitor } from "lucide-react";
import { flushSync } from "react-dom";

export const lightTokens = {
    bg: "#f4f6fa",
    surface: "#ffffff",
    surfaceMuted: "#f3f4f6",
    surfaceHover: "#eef1f6",
    border: "#e5e7eb",
    borderStrong: "#d1d5db",

    text: "#111827",
    textMuted: "#4b5563",
    textFaint: "#9ca3af",
    textOnBrand: "#ffffff",

    primary: "#2563eb",
    primarySoft: "#dbeafe",
    accent: "#06b6d4",
    success: "#059669",
    successSoft: "#d1fae5",
    warning: "#d97706",
    warningSoft: "#fef3c7",
    danger: "#ef4444",
    dangerSoft: "#fee2e2",
    pink: "#ec4899",
    pinkSoft: "#fce7f3",

    purple: "#7c3aed",
    purpleSoft: "#ede9fe",

    shimmer: "rgba(255,255,255,0.6)",


    headerBg: "#ffffff",
    headerBorder: "#e5e7eb",
    headerText: "#10192f",
    headerTextMuted: "#6b7280",
    headerBtnBg: "rgba(16,25,47,0.05)",
    headerBtnBorder: "rgba(16,25,47,0.10)",
    headerBtnText: "#374151",
    logoFilter: "brightness(0)",

    brandGradient:
        "linear-gradient(135deg,#183153 0%,#102744 40%,#10192f 70%,#1a1035 100%)",
    heroGradient: "linear-gradient(135deg,#2563eb 0%,#1d4ed8 50%,#0d9488 100%)",

    overlay: "rgba(15,23,42,0.5)",
    shadow: "0 4px 16px rgba(16,25,47,0.10)",
    shadowStrong: "0 10px 24px rgba(16,25,47,0.35)",
} as const;

export type ThemeTokens = { [K in keyof typeof lightTokens]: string };

export const darkTokens: ThemeTokens = {
    bg: "#0b1220",
    surface: "#131c2e",
    surfaceMuted: "#1b2638",
    surfaceHover: "#222f45",
    border: "#25324a",
    borderStrong: "#34445f",

    text: "#e8edf6",
    textMuted: "#aab6cb",
    textFaint: "#6b7a93",
    textOnBrand: "#ffffff",

    primary: "#60a5fa",
    primarySoft: "#1e3a6e",
    accent: "#22d3ee",
    success: "#34d399",
    successSoft: "#124034",
    warning: "#fbbf24",
    warningSoft: "#4a3410",
    danger: "#f87171",
    dangerSoft: "#3a1717",
    pink: "#f472b6",
    pinkSoft: "#3a1730",

    purple: "#a78bfa",
    purpleSoft: "#33245f",

    shimmer: "rgba(255,255,255,0.07)",

    headerBg: "linear-gradient(135deg,#101f38 0%,#0a1a30 40%,#080f1f 70%,#120b26 100%)",
    headerBorder: "rgba(255,255,255,0.08)",
    headerText: "#ffffff",
    headerTextMuted: "rgba(255,255,255,0.5)",
    headerBtnBg: "rgba(255,255,255,0.07)",
    headerBtnBorder: "rgba(255,255,255,0.12)",
    headerBtnText: "rgba(255,255,255,0.75)",
    logoFilter: "none",

    brandGradient:
        "linear-gradient(135deg,#101f38 0%,#0a1a30 40%,#080f1f 70%,#120b26 100%)",
    heroGradient: "linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#0f766e 100%)",

    overlay: "rgba(0,0,0,0.65)",
    shadow: "0 4px 16px rgba(0,0,0,0.45)",
    shadowStrong: "0 10px 24px rgba(0,0,0,0.6)",
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

const toVars = (t: ThemeTokens) =>
    Object.entries(t)
        .map(([k, v]) => `--${kebab(k)}:${v};`)
        .join("");

export const THEME_CSS = `
:root{${toVars(lightTokens)}color-scheme:light;}
.dark{${toVars(darkTokens)}color-scheme:dark;}
body{background:var(--bg);color:var(--text);}
`;

export const c = Object.fromEntries(
    Object.keys(lightTokens).map((k) => [k, `var(--${kebab(k)})`]),
) as ThemeTokens;

export const alpha = (token: keyof ThemeTokens, percent: number) =>
    `color-mix(in srgb, var(--${kebab(token)}) ${percent}%, transparent)`;


export type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "bnb-theme";

const systemPrefersDark = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

const resolve = (mode: ThemeMode): "light" | "dark" =>
    mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

function applyToDom(resolved: "light" | "dark") {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#080f1f" : "#183153");
}

type ThemeState = {
    mode: ThemeMode;
    resolved: "light" | "dark";
    setMode: (m: ThemeMode) => void;
    toggle: () => void;
    hydrate: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    mode: "system",
    resolved: "light",
    setMode: (mode) => {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch { }
        const resolved = resolve(mode);
        applyToDom(resolved);
        set({ mode, resolved });
    },
    toggle: () => get().setMode(get().resolved === "dark" ? "light" : "dark"),
    hydrate: () => {
        let mode: ThemeMode = "system";
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
            if (saved === "light" || saved === "dark" || saved === "system") {
                mode = saved;
            }
        } catch { }
        const resolved = resolve(mode);
        applyToDom(resolved);
        set({ mode, resolved });
    },
}));

export const THEME_INIT_SCRIPT = `
(function(){try{
  var m=localStorage.getItem("${STORAGE_KEY}")||"system";
  var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  var r=document.documentElement;
  if(d){r.classList.add("dark");}
  r.style.colorScheme=d?"dark":"light";
}catch(e){}})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const hydrate = useThemeStore((s) => s.hydrate);
    const mode = useThemeStore((s) => s.mode);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (mode !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => useThemeStore.getState().setMode("system");
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, [mode]);

    return <>{children}</>;
}

export const useTheme = () => useThemeStore();

export function ThemeToggle({ className = "" }: { className?: string }) {
    const { mode, setMode } = useThemeStore();
    const next: Record<ThemeMode, ThemeMode> = {
        light: "dark",
        dark: "system",
        system: "light",
    };
    const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
    const label =
        mode === "light" ? "Giao diện sáng" : mode === "dark" ? "Giao diện tối" : "Theo hệ thống";

    return (
        <button
            type="button"
            onClick={() => setMode(next[mode])}
            title={label}
            aria-label={label}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${className}`}
            style={{
                background: "rgba(255,255,255,0.07)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.75)",
            }}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}


/** Đổi theme với hiệu ứng lan tròn từ điểm origin (toạ độ màn hình). */
export function changeThemeAnimated(
    mode: ThemeMode,
    origin?: { x: number; y: number },
) {
    const { setMode } = useThemeStore.getState();
    const doc = document as Document & {
        startViewTransition?: (cb: () => void) => {
            ready: Promise<void>;
            finished: Promise<void>;
        };
    };
    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!doc.startViewTransition || reduceMotion || !origin) {
        setMode(mode);
        return;
    }

    const { x, y } = origin;
    // Bán kính đủ lớn để phủ tới góc xa nhất của màn hình
    const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
    );

    const root = document.documentElement;
    root.classList.add("theme-switching");

    const transition = doc.startViewTransition(() => {
        // flushSync để React cập nhật xong trước khi trình duyệt chụp giao diện mới
        flushSync(() => setMode(mode));
    });

    transition.ready.then(() => {
        root.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${radius}px at ${x}px ${y}px)`,
                ],
            },
            {
                duration: 650,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement: "::view-transition-new(root)",
            },
        );
    });

    transition.finished.finally(() => root.classList.remove("theme-switching"));
}
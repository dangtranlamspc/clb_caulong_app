import { COLOR_SWATCH_MAP, SIZE_ORDER } from "@/constants/constants";


export function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

export function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function colorSwatchFromName(name?: string) {
    if (!name) return "#9ca3af";
    const lower = name.toLowerCase();
    const keys = Object.keys(COLOR_SWATCH_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) return COLOR_SWATCH_MAP[key];
    }
    return "#9ca3af";
}

export function sortSizes(arr: string[]) {
    return [...arr].sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a);
        const ib = SIZE_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

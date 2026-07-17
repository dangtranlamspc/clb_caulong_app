export const TIERS = [
    "Tân thủ",
    "Phong trào",
    "Cứng cựa",
    "Chủ lực",
    "Cao thủ",
    "Kiện tướng",
    "Đại Kiện Tướng",
    "Huyền Thoại",
] as const;
export type Tier = (typeof TIERS)[number];

export interface TierConfig {
    label: string;
    color: string;
    bg: string;
    border: string;
    gradient: string;
    icon: string;
    img_old: string;
    frame: string;
}

export const TIER_CONFIG: Record<string, TierConfig> = {
    "Tân thủ": {
        label: "Tân thủ",
        color: "text-zinc-500",
        bg: "bg-zinc-100",
        border: "border-zinc-300",
        gradient: "from-zinc-300 to-zinc-500",
        icon: "⚙️",
        frame:
            "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203453/sat_frame_sjcdg2.webp",
        img_old:
            "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176681/sat_phoi_fn_an1p7q.png",
    },
    "Phong trào": {
        label: "Phong trào",
        color: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-300",
        gradient: "from-orange-300 to-orange-600",
        icon: "🥉",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203449/dong_frame_s3nbx6.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176908/dong_phoi_fn_wxcnpy.png",
    },
    "Cứng cựa": {
        label: "Cứng cựa",
        color: "text-slate-500",
        bg: "bg-slate-100",
        border: "border-slate-300",
        gradient: "from-slate-300 to-slate-500",
        icon: "🥈",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203449/bac_frame_tvdjpw.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782177164/bac_phoi_fn_t5lepk.png",
    },
    "Chủ lực": {
        label: "Chủ lực",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        border: "border-yellow-400",
        gradient: "from-yellow-300 to-yellow-500",
        icon: "🥇",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203452/vang_frame_t1xqgf.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176929/vang_phoi_fn_ciifmj.png",
    },
    "Cao thủ": {
        label: "Cao thủ",
        color: "text-sky-600",
        bg: "bg-sky-50",
        border: "border-sky-400",
        gradient: "from-sky-200 to-sky-500",
        icon: "💠",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203448/bachkim_frame_wg452j.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176791/bk_phoi_fn_ay5z4k.png",
    },
    "Kiện tướng": {
        label: "Kiện tướng",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-400",
        gradient: "from-emerald-300 to-emerald-600",
        icon: "💚",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203451/lucbao_frame_skokel.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176864/lucbao_phoi_fn_lmvmjm.png",
    },
    "Đại Kiện Tướng": {
        label: "Đại Kiện Tướng",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-400",
        gradient: "from-blue-300 to-purple-500",
        icon: "💎",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203450/kimcuong_frame_lqps4s.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176814/kc_phoi_fn_konsmv.png",
    },
    "Huyền Thoại": {
        label: "Huyền Thoại",
        color: "text-purple-700",
        bg: "bg-purple-50",
        border: "border-purple-500",
        gradient: "from-purple-400 to-pink-500",
        icon: "👑",
        frame: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203454/caothu_frame_mom7dj.webp",
        img_old: "https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782176623/caothu_phoi_fn_ummqst.png",
    },
};

export function getTierConfig(tier: string): TierConfig {
    return TIER_CONFIG[tier] ?? TIER_CONFIG["Tân thủ"];
}

export function lpProgress(lp: number): number {
    return Math.min(Math.max(lp, 0), 49);
}

export function rankLabel(tier: string, lp: number): string {
    return `${tier} • ${lp} LP`;
}
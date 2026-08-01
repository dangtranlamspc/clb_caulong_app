import {
    AlertTriangle, Users, Gift, ShoppingCart, PartyPopper, MoreHorizontal,
} from "lucide-react";

export function fmt(n: number) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
}

export const CATEGORY_LABELS: Record<string, string> = {
    phat: "Tiền phạt",
    dong_gop: "Đóng góp",
    tai_tro: "Tài trợ",
    mua_sam: "Mua sắm",
    tiec_team: "Tiệc Team",
    chi_khac: "Chi khác",
};

export const CATEGORY_ICONS: Record<string, any> = {
    phat: AlertTriangle,
    dong_gop: Users,
    tai_tro: Gift,
    mua_sam: ShoppingCart,
    tiec_team: PartyPopper,
    chi_khac: MoreHorizontal,
};

export const CATEGORY_COLORS: Record<string, { bg: string; ic: string }> = {
    phat: { bg: "bg-amber-100", ic: "text-amber-600" },
    dong_gop: { bg: "bg-emerald-100", ic: "text-emerald-600" },
    tai_tro: { bg: "bg-blue-100", ic: "text-blue-600" },
    mua_sam: { bg: "bg-purple-100", ic: "text-purple-600" },
    tiec_team: { bg: "bg-orange-100", ic: "text-orange-600" },
    chi_khac: { bg: "bg-gray-100", ic: "text-gray-500" },
};

export const THU_CATEGORIES = ["phat", "dong_gop", "tai_tro"];
export const CHI_CATEGORIES = ["mua_sam", "tiec_team", "chi_khac"];
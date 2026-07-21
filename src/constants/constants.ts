import { BarChart3, Gift, Shirt, Trophy, Flame } from "lucide-react";

export const TYPE_META: Record<string, { icon: any; label: string }> = {
    shirt_order: { icon: Shirt, label: "Đặt áo nhóm" },
    tournament: { icon: Trophy, label: "Giải nội bộ" },
    birthday: { icon: Gift, label: "Sinh nhật thành viên" },
    offline_event: { icon: Flame, label: "Offline / Giao lưu" },
    poll: { icon: BarChart3, label: "Bình chọn" },
};

export const BANK_DISPLAY_NAMES: Record<string, string> = {
    MB: "MB Bank",
    VCB: "Vietcombank",
    TCB: "Techcombank",
    ACB: "ACB",
    BIDV: "BIDV",
    VTB: "VietinBank",
    TPB: "TPBank",
    STB: "Sacombank",
    VPB: "VPBank",
    MSB: "MSB",
};

export const COLOR_SWATCH_MAP: Record<string, string> = {
    "xanh dương": "#2563eb",
    "xanh nước biển": "#1d4ed8",
    "xanh navy": "#1e3a8a",
    "xanh lá cây": "#16a34a",
    "xanh lá": "#16a34a",
    "xanh ngọc": "#0d9488",
    "xanh": "#2563eb",
    "trắng": "#ffffff",
    "đen": "#111827",
    "đỏ": "#dc2626",
    "vàng": "#eab308",
    "cam": "#f97316",
    "tím": "#9333ea",
    "hồng": "#ec4899",
    "xám": "#9ca3af",
    "nâu": "#92400e",
    "be": "#d6c7a1",
    "bạc": "#c0c0c0",
};

export const TOURNAMENT_LEVEL_LABEL: Record<string, string> = {
    A: "Trình A",
    "B+": "Trình B+",
    B: "Trình B",
    C: "Trình C",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
    wallet: "Ví BNB",
    transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

import type { Tone } from "@/components/admin/sessions/session-ui";

export const DINING_STATUS: Record<string, { label: string; tone: Tone }> = {
    open: { label: "Đang nhận người", tone: "primary" },
    billed: { label: "Chờ thanh toán", tone: "warning" },
    completed: { label: "Hoàn thành", tone: "success" },
};

export const PAY_STATUS: Record<string, { label: string; tone: Tone }> = {
    pending: { label: "Chưa thanh toán", tone: "warning" },
    submitted: { label: "Chờ admin xác nhận", tone: "primary" },
    processing: { label: "Đang xử lý", tone: "neutral" },
    confirmed: { label: "Đã thanh toán", tone: "success" },
};

export const METHOD_LABEL: Record<string, string> = {
    wallet: "💳 Ví BNB",
    bank_transfer: "🏦 Chuyển khoản",
    cash: "💵 Tiền mặt",
};

export const pName = (p: any) => p.users?.full_name ?? p.guest_full_name ?? "?";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Search, Check } from "lucide-react";

const ICON_OPTIONS = [
    // Người / nhóm
    "check-circle", "users", "users-round", "user",
    "user-round", "user-check", "user-round-check",
    // Cân bằng / mục tiêu / thành tích
    "scale", "target", "trophy", "award", "medal", "crown", "star", "zap",
    "trending-up", "activity",
    // Lịch / thời gian
    "calendar", "calendar-days", "calendar-check", "calendar-clock", "clock", "timer",
    // Thiết bị / công nghệ
    "smartphone", "smartphone-charging", "wallet", "credit-card", "banknote",
    // Liên lạc
    "phone", "mail", "message-circle", "headphones", "bell", "megaphone",
    // Trạng thái / cảnh báo
    "shield", "shield-check", "alert-triangle", "alert-circle", "info",
    "help-circle", "lock", "unlock",
    // Thể thao / hoạt động
    "swords", "feather", "footprints", "arrow-left-right",
    // Khác
    "map-pin", "map", "gift", "heart", "flag", "book-open", "file-text",
    "clipboard-list", "smile", "thumbs-up", "home", "settings", "list-checks",
    "badge-check",
    "badge-alert", "X", "circle-x", "chart-no-axes-combined", "circle-dollar-sign",
    "flame", "ban", "award", "bell-ring", "shirt", "biceps-flexed", "sport-shoe"
];

function toPascalCase(kebab: string) {
    return kebab.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

type LucideIconByNameProps = {
    name?: string;
    className?: string;
} & Omit<LucideIcons.LucideProps, "name">;

export function LucideIconByName({ name, className, ...rest }: LucideIconByNameProps) {
    if (!name) return null;
    const Comp = (LucideIcons as any)[toPascalCase(name)];
    if (!Comp) return null;
    return <Comp className={className} {...rest} />;
}

export function IconPicker({ value, onChange }: { value?: string; onChange: (name: string) => void }) {
    const [query, setQuery] = useState("");
    const filtered = ICON_OPTIONS.filter((n) => n.includes(query.trim().toLowerCase()));

    return (
        <div>
            <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm icon... (vd: check-circle)"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                />
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                {filtered.map((name) => {
                    const active = value === name;
                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => onChange(name)}
                            title={name}
                            className={`relative aspect-square rounded-xl flex items-center justify-center border transition-colors ${active ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-100 text-gray-500 hover:border-blue-300"
                                }`}
                        >
                            <LucideIconByName name={name} className="w-4 h-4" />
                            {active && <Check className="w-3 h-3 absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5" />}
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="col-span-6 text-xs text-gray-400 text-center py-3">Không tìm thấy icon</p>
                )}
            </div>
            {value && (
                <p className="mt-1.5 text-xs text-gray-400">
                    Đã chọn: <span className="font-mono text-gray-600">{value}</span>
                </p>
            )}
        </div>
    );
}
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

export function CompactActionButton({
    icon,
    label,
    badge,
    colorClass,
    onClick,
    disabled,
    loading,
}: {
    icon: ReactNode;
    label: string;
    badge?: number;
    colorClass: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-2 text-white shadow-sm active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100 ${colorClass}`}
        >
            {badge != null && badge > 0 && !loading && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-white/25 text-[10px] font-bold text-white flex items-center justify-center">
                    {badge}
                </span>
            )}
            <span className="w-4.5 h-4.5 flex items-center justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
            </span>
            <span className="text-[11.5px] font-semibold whitespace-nowrap">
                {label}
            </span>
        </button>
    );
}
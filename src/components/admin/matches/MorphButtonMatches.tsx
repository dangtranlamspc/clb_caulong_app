import { CheckCircle2, Loader2 } from "lucide-react";

export type ActionPhase = "idle" | "loading" | "success";

export function MorphButtonMatches({
    phase,
    idleIcon = null,
    label,
    colorClass,
    idleClassName,
    successColorClass,
    successClassName,
    idleWidthClass = "w-[7rem]",
    onClick,
    disabled,
}: {
    phase: ActionPhase;
    idleIcon?: React.ReactNode;
    label: string;
    colorClass?: string;
    idleClassName?: string;
    successColorClass?: string;
    successClassName?: string;
    idleWidthClass?: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    const isMorphed = phase === "loading" || phase === "success";

    const resolvedIdleClass =
        idleClassName ?? colorClass ?? "bg-blue-600 hover:bg-blue-700 text-white";
    const resolvedSuccessClass =
        successClassName ?? successColorClass ?? "bg-green-500 text-white";

    return (
        <button
            onClick={onClick}
            disabled={disabled || isMorphed}
            className={`flex items-center justify-center gap-1.5 text-sm font-medium overflow-hidden
                transition-[width,border-radius,background-color] duration-[800ms] ease-[cubic-bezier(0.65,0,0.35,1)]
                h-10 flex-shrink-0
                ${isMorphed ? "w-10 rounded-full p-0" : `${idleWidthClass} rounded-lg px-3 whitespace-nowrap`}
                ${phase === "success" ? resolvedSuccessClass : resolvedIdleClass}
                disabled:cursor-not-allowed disabled:opacity-60`}
        >
            {phase === "loading" && (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            )}
            {phase === "success" && (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 morph-tick" />
            )}
            {phase === "idle" && (
                <>
                    {idleIcon}
                    <span className="whitespace-nowrap">{label}</span>
                </>
            )}
        </button>
    );
}
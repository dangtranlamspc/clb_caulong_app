import { CheckCircle2, Loader2 } from "lucide-react";

type ActionPhase = "idle" | "loading" | "success";

export function MorphButton({
  phase,
  idleIcon = null,
  label,
  colorClass,
  idleClassName,
  successColorClass,
  successClassName,
  idleWidthClass = "min-w-[7rem]",
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
                transition-[width,border-radius,background-color] duration-300 ease-out
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

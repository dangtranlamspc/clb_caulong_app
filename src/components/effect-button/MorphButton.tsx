// src/components/effect-button/MorphButton.tsx
import { CheckCircle2, Loader2 } from "lucide-react";

type ActionPhase = 'idle' | 'loading' | 'success';

export function MorphButton({
    phase,
    label,
    idleIcon,
    onClick,
    disabled,
    idleClassName = 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]',
    successClassName = 'bg-green-500 text-white',
}: {
    phase: ActionPhase;
    label: string;
    idleIcon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    idleClassName?: string;
    successClassName?: string;
}) {
    const isMorphed = phase === 'loading' || phase === 'success';

    return (
        <div className="flex justify-center w-full">
            <button
                onClick={onClick}
                disabled={disabled || isMorphed}
                className={`flex items-center justify-center gap-2 font-bold text-base
                    transition-[width,height,border-radius,background-color,color,border-color] duration-300 ease-out
                    disabled:cursor-not-allowed
                    ${isMorphed
                        ? 'w-14 h-14 rounded-full p-0 shadow-lg'
                        : 'w-full py-4 rounded-2xl'
                    }
                    ${phase === 'success' ? successClassName : idleClassName}`}
            >
                {phase === 'loading' && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
                {phase === 'success' && <CheckCircle2 className="w-6 h-6 flex-shrink-0 morph-tick" />}
                {phase === 'idle' && (
                    <>
                        {idleIcon}
                        <span>{label}</span>
                    </>
                )}
            </button>

            <style jsx global>{`
                @keyframes morphTickPop {
                    0%   { transform: scale(0); opacity: 0; }
                    60%  { transform: scale(1.25); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .morph-tick {
                    animation: morphTickPop 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
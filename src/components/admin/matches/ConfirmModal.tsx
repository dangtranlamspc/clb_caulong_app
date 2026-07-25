"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ActionPhase, MorphButtonMatches } from "./MorphButtonMatches";

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    confirmColor = "bg-red-500 hover:bg-red-600",
    loading,
    phase,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirmColor?: string;
    loading?: boolean;
    phase?: ActionPhase;
}) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            requestAnimationFrame(() => setVisible(true));
        } else if (mounted) {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), 200);
            return () => clearTimeout(t);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!mounted || typeof document === "undefined") return null;

    const resolvedPhase: ActionPhase = phase ?? (loading ? "loading" : "idle");

    return createPortal(
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
                }`}
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-2xl w-full max-w-sm shadow-xl transition-all duration-200 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 space-y-2">
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                        {description}
                    </p>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        disabled={resolvedPhase !== "idle"}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <MorphButtonMatches
                        phase={resolvedPhase}
                        label={confirmLabel}
                        idleClassName={`${confirmColor} text-white`}
                        idleWidthClass="min-w-[9rem]"
                        onClick={onConfirm}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
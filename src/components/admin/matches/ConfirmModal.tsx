"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    confirmColor = "bg-red-500 hover:bg-red-600",
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    confirmColor?: string;
    loading?: boolean;
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
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition-colors ${confirmColor}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
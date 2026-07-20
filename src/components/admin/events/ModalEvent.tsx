"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalActiviesProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}

export default function ModalEvent({
    open,
    onClose,
    children,
    maxWidth = "max-w-lg",
}: ModalActiviesProps) {
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else if (mounted) {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), 200);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
                backdropFilter: visible ? "blur(2px)" : "none",
                transition: "background .2s ease, backdrop-filter .2s ease",
            }}
        >
            <div
                className={`w-full ${maxWidth} bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-auto hide-scrollbar relative`}
                style={{
                    transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(12px)",
                    opacity: visible ? 1 : 0,
                    transition: "transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s ease",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-20 h-0">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 shadow-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}
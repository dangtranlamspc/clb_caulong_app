"use client";

import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

export function ImageLightbox({
    src,
    visible,
    onClose,
}: {
    src: string | null;
    visible: boolean;
    onClose: () => void;
}) {
    if (!src || typeof document === "undefined") return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-opacity duration-200 ease-out ${visible ? "bg-black/80 opacity-100" : "bg-black/0 opacity-0"
                }`}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 ${visible ? "opacity-100 scale-100" : "opacity-0 scale-75"
                    }`}
            >
                <XIcon className="w-5 h-5 text-white" />
            </button>
            <img
                src={src}
                alt="Ảnh mẫu áo"
                className={`max-w-full max-h-full object-contain rounded-lg transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
                    }`}
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body,
    );
}

// components/ui/Modal.tsx
'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let raf1: number, raf2: number;

        if (isOpen) {
            setShouldRender(true);
            raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setIsVisible(true));
            });
        } else {
            setIsVisible(false);
            const t = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(t);
        }

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!shouldRender) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [shouldRender, onClose]);

    if (!shouldRender) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            <div
                className={`hide-scrollbar relative w-full sm:w-auto sm:min-w-[420px] sm:max-w-xl
                    max-h-[92vh] overflow-y-auto
                    bg-white rounded-t-2xl sm:rounded-2xl shadow-xl
                    transition-all duration-300 ease-out
                    ${isVisible
                        ? 'translate-y-0 opacity-100 sm:scale-100'
                        : 'translate-y-full opacity-0 sm:translate-y-4 sm:scale-95'
                    }`}
            >
                <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100 rounded-t-2xl z-10">
                    <h2 className="text-base font-bold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
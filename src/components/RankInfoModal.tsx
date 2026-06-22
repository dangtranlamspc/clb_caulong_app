'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { RankIcon } from '@/components/Rank';

const RANK_ORDER = ['Sắt', 'Đồng', 'Bạc', 'Vàng', 'Bạch Kim', 'Lục Bảo', 'Kim Cương', 'Cao Thủ'];

const RANK_DESC: Record<string, string> = {
    'Sắt': 'Hạng khởi đầu',
    'Đồng': 'Mới làm quen',
    'Bạc': 'Có nền tảng cơ bản',
    'Vàng': 'Chơi tốt, ổn định',
    'Bạch Kim': 'Trình độ khá',
    'Lục Bảo': 'Trình độ cao',
    'Kim Cương': 'Trình độ rất cao',
    'Cao Thủ': 'Đỉnh cao của CLB',
};

const RANK_GRADIENT: Record<string, string> = {
    'Sắt': 'from-zinc-700 via-zinc-800 to-zinc-900',
    'Đồng': 'from-orange-700 via-orange-900 to-zinc-900',
    'Bạc': 'from-slate-500 via-slate-700 to-zinc-900',
    'Vàng': 'from-yellow-500 via-amber-700 to-zinc-900',
    'Bạch Kim': 'from-sky-500 via-sky-700 to-zinc-900',
    'Lục Bảo': 'from-emerald-500 via-emerald-700 to-zinc-900',
    'Kim Cương': 'from-blue-500 via-indigo-700 to-zinc-900',
    'Cao Thủ': 'from-purple-500 via-pink-700 to-zinc-900',
};

interface RankInfoModalProps {
    onClose: () => void;
}

export function RankInfoModal({ onClose }: RankInfoModalProps) {
    const [index, setIndex] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const ANIM_DURATION = 220;

    useEffect(() => {
        setMounted(true);
        // Khoá scroll nền khi modal mở
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, []);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, ANIM_DURATION);
    };

    const tier = RANK_ORDER[index];
    const isFirst = index === 0;
    const isLast = index === RANK_ORDER.length - 1;

    const goNext = () => setIndex(i => Math.min(i + 1, RANK_ORDER.length - 1));
    const goPrev = () => setIndex(i => Math.max(i - 1, 0));

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const SWIPE_THRESHOLD = 50;
        if (deltaX > SWIPE_THRESHOLD) goPrev();
        else if (deltaX < -SWIPE_THRESHOLD) goNext();
        touchStartX.current = null;
    };

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                animation: `${isClosing ? 'rim-backdrop-out' : 'rim-backdrop-in'} ${ANIM_DURATION}ms ease forwards`,
            }}
            onClick={handleClose}
        >
            <style>{`
                @keyframes rim-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes rim-backdrop-out { from { opacity: 1; } to { opacity: 0; } }
                @keyframes rim-card-in {
                    from { opacity: 0; transform: scale(0.92) translateY(12px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes rim-card-out {
                    from { opacity: 1; transform: scale(1) translateY(0); }
                    to { opacity: 0; transform: scale(0.92) translateY(12px); }
                }
            `}</style>
            <div
                className="relative w-full max-w-sm rounded-3xl overflow-hidden flex flex-col mx-4"
                style={{
                    animation: `${isClosing ? 'rim-card-out' : 'rim-card-in'} ${ANIM_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Slide */}
                <div
                    className={`flex flex-col items-center justify-center px-8 py-6 bg-gradient-to-br ${RANK_GRADIENT[tier]} transition-colors duration-300`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <span className="text-white/40 text-xs font-semibold tracking-widest mb-2">
                        HẠNG {index + 1} / {RANK_ORDER.length}
                    </span>

                    <div className="my-1 drop-shadow-2xl">
                        <RankIcon tier={tier} size={240} />
                    </div>

                    <h3 className="text-white text-2xl font-black mt-1">{tier}</h3>
                    <p className="text-white/60 text-sm mt-1">{RANK_DESC[tier]}</p>
                </div>

                {/* Nav arrows */}
                {!isFirst && (
                    <button
                        onClick={goPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
                {!isLast && (
                    <button
                        onClick={goNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}

                {/* Dots */}
                <div className="flex items-center justify-center gap-1.5 py-4 bg-black/30">
                    {RANK_ORDER.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className="transition-all rounded-full"
                            style={{
                                width: i === index ? 20 : 6,
                                height: 6,
                                background: i === index ? '#fff' : 'rgba(255,255,255,0.3)',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
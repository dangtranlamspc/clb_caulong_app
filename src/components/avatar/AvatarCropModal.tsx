'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, Check, Loader2 } from 'lucide-react';

interface Props {
    /** URL ảnh gốc cần crop (thường là object URL từ file người dùng chọn) */
    imageSrc: string;
    /** Kích thước vùng crop hiển thị trên màn hình (px) */
    cropSize?: number;
    /** Kích thước ảnh output cuối cùng (px, ảnh vuông) */
    outputSize?: number;
    onCancel: () => void;
    /** Trả về File đã crop (jpeg) để upload */
    onConfirm: (file: File) => void;
}

interface ImgState {
    img: HTMLImageElement;
    /** scale tối thiểu để ảnh phủ kín khung crop tròn */
    baseScale: number;
    naturalW: number;
    naturalH: number;
}

export function AvatarCropModal({
    imageSrc,
    cropSize = 280,
    outputSize = 480,
    onCancel,
    onConfirm,
}: Props) {
    const [visible, setVisible] = useState(false);
    const [imgState, setImgState] = useState<ImgState | null>(null);
    const [zoom, setZoom] = useState(1); // hệ số nhân thêm trên baseScale, 1 = vừa khung
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // px lệch tâm, theo không gian hiển thị
    const [processing, setProcessing] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{ startX: number; startY: number; origOffset: { x: number; y: number } } | null>(null);

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, []);

    // Load ảnh để biết kích thước thật + tính scale tối thiểu phủ khung tròn
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;
            const baseScale = cropSize / Math.min(naturalW, naturalH);
            setImgState({ img, baseScale, naturalW, naturalH });
            setZoom(1);
            setOffset({ x: 0, y: 0 });
        };
        img.src = imageSrc;
    }, [imageSrc, cropSize]);

    const clampOffset = useCallback((x: number, y: number, currentZoom: number) => {
        if (!imgState) return { x, y };
        const scale = imgState.baseScale * currentZoom;
        const dispW = imgState.naturalW * scale;
        const dispH = imgState.naturalH * scale;
        // Khoảng dịch tối đa để ảnh vẫn phủ kín khung crop
        const maxX = Math.max(0, (dispW - cropSize) / 2);
        const maxY = Math.max(0, (dispH - cropSize) / 2);
        return {
            x: Math.min(maxX, Math.max(-maxX, x)),
            y: Math.min(maxY, Math.max(-maxY, y)),
        };
    }, [imgState, cropSize]);

    const handlePointerDown = (e: React.PointerEvent) => {
        dragState.current = { startX: e.clientX, startY: e.clientY, origOffset: offset };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState.current) return;
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        const next = clampOffset(
            dragState.current.origOffset.x + dx,
            dragState.current.origOffset.y + dy,
            zoom,
        );
        setOffset(next);
    };

    const handlePointerUp = () => {
        dragState.current = null;
    };

    const handleZoomChange = (newZoom: number) => {
        setZoom(newZoom);
        setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const next = Math.min(3, Math.max(1, zoom + delta));
        handleZoomChange(next);
    };

    const animateClose = (cb: () => void) => {
        setVisible(false);
        setTimeout(cb, 200);
    };

    const handleConfirm = async () => {
        if (!imgState) return;
        setProcessing(true);
        try {
            const scale = imgState.baseScale * zoom;
            // Vùng crop trong không gian ảnh gốc (natural pixels)
            const srcCropSize = cropSize / scale;
            const centerX = imgState.naturalW / 2 - offset.x / scale;
            const centerY = imgState.naturalH / 2 - offset.y / scale;
            const sx = centerX - srcCropSize / 2;
            const sy = centerY - srcCropSize / 2;

            const canvas = document.createElement('canvas');
            canvas.width = outputSize;
            canvas.height = outputSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');

            // Mặt nạ tròn
            ctx.save();
            ctx.beginPath();
            ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
                imgState.img,
                sx, sy, srcCropSize, srcCropSize,
                0, 0, outputSize, outputSize,
            );
            ctx.restore();

            const blob: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    b => (b ? resolve(b) : reject(new Error('Crop thất bại'))),
                    'image/jpeg',
                    0.92,
                );
            });

            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            animateClose(() => onConfirm(file));
        } catch {
            setProcessing(false);
        }
    };

    const scale = imgState ? imgState.baseScale * zoom : 1;
    const dispW = imgState ? imgState.naturalW * scale : 0;
    const dispH = imgState ? imgState.naturalH * scale : 0;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
            style={{
                background: visible ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
                backdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !processing) animateClose(onCancel); }}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white"
                style={{
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.96)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.25s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">Chỉnh ảnh đại diện</p>
                    {!processing && (
                        <button
                            onClick={() => animateClose(onCancel)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Crop area */}
                <div
                    ref={containerRef}
                    className="relative mx-auto select-none touch-none"
                    style={{
                        width: cropSize,
                        height: cropSize,
                        marginTop: 16,
                        marginBottom: 16,
                        background: '#111',
                        cursor: dragState.current ? 'grabbing' : 'grab',
                        overflow: 'hidden',
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                >
                    {imgState ? (
                        <img
                            src={imgState.img.src}
                            alt="Crop preview"
                            draggable={false}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: dispW,
                                height: dispH,
                                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                                pointerEvents: 'none',
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
                        </div>
                    )}

                    {/* Overlay tối + lỗ tròn để thấy vùng crop */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            boxShadow: `0 0 0 ${cropSize}px rgba(0,0,0,0.55)`,
                            borderRadius: '50%',
                        }}
                    />
                    <div
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.85)' }}
                    />
                </div>

                {/* Zoom slider */}
                <div className="flex items-center gap-3 px-5 pb-2">
                    <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="w-full accent-brand-600"
                        disabled={!imgState}
                    />
                </div>
                <p className="text-center text-[11px] text-gray-400 px-5 pb-3">
                    Kéo để di chuyển · Cuộn hoặc kéo thanh trượt để zoom
                </p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                    <button
                        type="button"
                        onClick={() => animateClose(onCancel)}
                        disabled={processing}
                        className="py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!imgState || processing}
                        className="py-2.5 rounded-xl font-semibold text-sm bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Xong
                    </button>
                </div>
            </div>
        </div>
    );
}
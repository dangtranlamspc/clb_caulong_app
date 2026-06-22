'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Upload, Smile, Check, Loader2 } from 'lucide-react';

interface Props {
    onCancel: () => void;
    /** Trả về File ảnh cuối cùng (từ upload+crop hoặc từ emoji) */
    onConfirm: (file: File) => void;
    /** Gọi khi người dùng chọn 1 file ảnh từ máy — cha sẽ mở AvatarCropModal */
    onFilePicked: (file: File) => void;
}

type Tab = 'upload' | 'emoji';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

const EMOJI_OPTIONS = [
    '😀', '😎', '🥳', '😇', '🤓', '😺', '🐶', '🐼',
    '🦊', '🐸', '🐵', '🦁', '🐯', '🐰', '🦄', '🐙',
    '🏸', '⚽', '🏀', '🎮', '🎵', '⭐', '🔥', '💎',
];

const BG_COLORS = [
    '#FEE2E2', '#FFEDD5', '#FEF3C7', '#D9F99D',
    '#BBF7D0', '#A7F3D0', '#A5F3FC', '#BAE6FD',
    '#C7D2FE', '#DDD6FE', '#FBCFE8', '#E5E7EB',
];

export function AvatarPickerModal({ onCancel, onConfirm, onFilePicked }: Props) {
    const [visible, setVisible] = useState(false);
    const [tab, setTab] = useState<Tab>('upload');
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);
    const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, []);

    const animateClose = (cb: () => void) => {
        setVisible(false);
        setTimeout(cb, 200);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (!ALLOWED_MIME.includes(file.type)) {
            alert('Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP');
            return;
        }
        if (file.size > MAX_SIZE) {
            alert('Kích thước ảnh tối đa là 5MB');
            return;
        }

        // Đóng picker, đẩy file lên cho component cha mở AvatarCropModal
        animateClose(() => onFilePicked(file));
    };

    /** Vẽ emoji + màu nền lên canvas tròn, xuất ra File png */
    const handleEmojiConfirm = async () => {
        setProcessing(true);
        try {
            const size = 480;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');

            // Nền tròn
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = selectedBg;
            ctx.fill();

            // Emoji ở giữa
            ctx.font = `${size * 0.55}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Dịch nhẹ theo baseline thực tế của font emoji (thường lệch xuống một chút)
            ctx.fillText(selectedEmoji, size / 2, size / 2 + size * 0.04);

            const blob: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Tạo ảnh thất bại'))), 'image/png');
            });

            const file = new File([blob], 'avatar-emoji.png', { type: 'image/png' });
            animateClose(() => onConfirm(file));
        } catch {
            setProcessing(false);
        }
    };

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
                    <p className="font-bold text-gray-900 text-sm">Chọn ảnh đại diện</p>
                    {!processing && (
                        <button
                            onClick={() => animateClose(onCancel)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 mx-4 mt-3 rounded-xl bg-gray-100">
                    <button
                        type="button"
                        onClick={() => setTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        <Upload className="w-3.5 h-3.5" /> Tải ảnh lên
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('emoji')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${tab === 'emoji' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        <Smile className="w-3.5 h-3.5" /> Emoji
                    </button>
                </div>

                {tab === 'upload' ? (
                    <div className="px-5 py-8 flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Upload className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-400 text-center">PNG, JPG hoặc WEBP, tối đa 5MB</p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                        >
                            Chọn ảnh từ máy
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="px-5 py-5 space-y-4">
                        {/* Preview */}
                        <div className="flex justify-center">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                                style={{ background: selectedBg }}
                            >
                                {selectedEmoji}
                            </div>
                        </div>

                        {/* Emoji grid */}
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Chọn emoji</p>
                            <div className="grid grid-cols-8 gap-1.5">
                                {EMOJI_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setSelectedEmoji(emoji)}
                                        className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${selectedEmoji === emoji ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color grid */}
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Màu nền</p>
                            <div className="grid grid-cols-6 gap-2">
                                {BG_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedBg(color)}
                                        className="aspect-square rounded-full transition-all"
                                        style={{
                                            background: color,
                                            outline: selectedBg === color ? '2px solid #6366f1' : 'none',
                                            outlineOffset: 2,
                                        }}
                                        aria-label={color}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleEmojiConfirm}
                            disabled={processing}
                            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Dùng ảnh này
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
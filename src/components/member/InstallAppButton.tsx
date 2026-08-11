'use client';
import { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

function isIos() {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );
}

export function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installed, setInstalled] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        setInstalled(isStandalone());
        setIos(isIos());

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const handleInstalled = () => {
            setInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setInstalled(true);
            setDeferredPrompt(null);
            return;
        }
        if (ios) {
            setShowIosGuide(true);
            return;
        }
    };

    if (installed) return null;
    // Không có cách nào cài (không phải iOS, không có beforeinstallprompt) → ẩn luôn
    if (!ios && !deferredPrompt) return null;

    return (
        <>
            <button
                onClick={handleClick}
                className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-50"
            >
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">Cài đặt ứng dụng</span>
                    <p className="text-xs text-gray-400">Thêm vào màn hình chính để dùng như app</p>
                </div>
            </button>

            {showIosGuide && (
                <div
                    className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50"
                    onClick={() => setShowIosGuide(false)}
                >
                    <div
                        className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8"
                        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Cài đặt ứng dụng</h3>
                            <button onClick={() => setShowIosGuide(false)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
                                    1
                                </div>
                                <p className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                                    Bấm nút <Share className="w-4 h-4 text-blue-600 inline" /> <b>Chia sẻ</b> ở thanh công cụ Safari
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
                                    2
                                </div>
                                <p className="text-sm text-gray-600 flex items-center gap-1.5 flex-wrap">
                                    Chọn <PlusSquare className="w-4 h-4 text-blue-600 inline" /> <b>"Thêm vào MH chính"</b>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
                                    3
                                </div>
                                <p className="text-sm text-gray-600">Bấm <b>"Thêm"</b> ở góc trên bên phải</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
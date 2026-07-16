'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Users } from 'lucide-react';
import type { TeamInviteInfo } from '@/hooks/useTeamInviteNotification';

interface Props {
    invite: TeamInviteInfo;
    onClose: () => void;
}

export function TeamInviteModal({ invite, onClose }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, []);

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const isTeamA = invite.team === 'A';

    return (
        <div
            className="fixed inset-0 z-[9997] flex items-center justify-center px-4"
            style={{
                background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                backdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
            }}
            onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    background: 'linear-gradient(160deg, #0f1e3a 0%, #0a1628 50%, #110a2a 100%)',
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.94)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ height: 3, background: isTeamA ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : 'linear-gradient(90deg, #ef4444, #f59e0b)' }} />

                <div className="px-5 pt-5 pb-6 space-y-4">
                    <button
                        onClick={close}
                        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Icon */}
                    <div className="flex flex-col items-center text-center gap-2 pt-1">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'rgba(59,130,246,0.15)',
                                border: '1.5px solid rgba(59,130,246,0.3)',
                                boxShadow: '0 0 28px rgba(59,130,246,0.2)',
                            }}
                        >
                            <Users className="w-8 h-8" style={{ color: '#60a5fa' }} />
                        </div>
                        <div>
                            <p className="font-black" style={{ fontSize: 20, color: '#e2e8f0' }}>
                                Bạn được thêm vào trận!
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {isTeamA
                                    ? `${invite.creatorName} đã thêm bạn làm đồng đội`
                                    : `Bạn được chọn vào đội đối thủ`}
                            </p>
                        </div>
                    </div>

                    {/* Info card */}
                    <div
                        className="rounded-xl p-4 space-y-2"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Đội A</span>
                            <span className="text-sm font-semibold" style={{ color: '#93c5fd' }}>
                                {invite.creatorName}{isTeamA ? ' & Bạn' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Đội B</span>
                            <span className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
                                {invite.opponentName}{!isTeamA ? ' & Bạn' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            👥 Đôi
                        </span>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Best of {invite.bestOf}
                        </span>
                    </div>

                    {invite.note && (
                        <div className="rounded-xl px-4 py-2.5 text-sm italic"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(253,230,138,0.75)' }}>
                            💬 "{invite.note}"
                        </div>
                    )}

                    <button
                        onClick={close}
                        className="w-full py-3 rounded-xl font-bold text-sm"
                        style={{
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                        }}
                    >
                        OK, đã biết! 👍
                    </button>
                </div>
            </div>
        </div>
    );
}
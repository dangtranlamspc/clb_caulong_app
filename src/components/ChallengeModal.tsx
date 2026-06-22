'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Swords, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { RankPodiumAvatarList, RankPodiumAvatarModal } from '@/components/Rank';

interface PlayerInfo {
    name: string;
    tier?: string;
    avatar?: string | null;
}

interface ChallengeInfo {
    matchId: string;
    challengers?: PlayerInfo[];
    partners?: PlayerInfo[];
    challengerNames?: string[];
    partnerNames?: string[];
    myTier?: string;
    myAvatar?: string | null;
    myName?: string;
    matchType: 'singles' | 'doubles';
    bestOf: number;
    note?: string;
}

interface Props {
    challenge: ChallengeInfo;
    onAccept: (matchId: string) => Promise<void>;
    onReject: (matchId: string) => Promise<void>;
    onClose: () => void;
}

function Shuttlecocks() {
    const items = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        top: `${10 + Math.random() * 75}%`,
        left: `${5 + Math.random() * 85}%`,
        delay: `${i * 0.4}s`,
        size: 10 + Math.random() * 8,
        rotate: Math.random() * 360,
    }));
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {items.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        top: p.top,
                        left: p.left,
                        fontSize: p.size,
                        opacity: 0.07,
                        transform: `rotate(${p.rotate}deg)`,
                        animation: `floatBob 3s ${p.delay} ease-in-out infinite alternate`,
                        userSelect: 'none',
                    }}
                >
                    🏸
                </div>
            ))}
            <style>{`
                @keyframes floatBob {
                    0%   { transform: translateY(0px) rotate(0deg);   }
                    100% { transform: translateY(-8px) rotate(15deg);  }
                }
            `}</style>
        </div>
    );
}

const CHALLENGE_LINES = [
    'Đây là lời thách đấu chính thức từ một đối thủ đáng gờm! 😤',
    'Ai dám thách đấu thì ta dám đánh! Bạn chấp nhận không? 🔥',
    'Sân đấu đang chờ — chỉ cần một chữ "Đồng ý" từ bạn! ⚡',
    'Gauntlet đã được ném ra. Đây là thời khắc quyết định! 🏸',
];

function pickRandom(arr: string[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}


function ChallengeAvatar({
    player,
    colorStyle,
}: {
    player: PlayerInfo;
    colorStyle: React.CSSProperties;
}) {
    const hasTier = Boolean(player.tier);
    return (
        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
            {hasTier ? (
                <RankPodiumAvatarModal
                    tier={player.tier!}
                    avatar={player.avatar}
                    name={player.name}
                    size={40}
                    frameScale={5.5}
                />
            ) : (
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                    style={colorStyle}
                >
                    {player.name?.[0]?.toUpperCase()}
                </div>
            )}
        </div>
    );
}

export function ChallengeModal({ challenge, onAccept, onReject, onClose }: Props) {
    const { matchId, challengers, partners, challengerNames, partnerNames, myTier, myAvatar, myName, matchType, bestOf, note } = challenge;

    const resolvedChallengers: PlayerInfo[] =
        challengers && challengers.length > 0
            ? challengers
            : (challengerNames ?? []).map(name => ({ name }));

    const resolvedPartners: PlayerInfo[] =
        partners && partners.length > 0
            ? partners
            : (partnerNames ?? []).map(name => ({ name }));

    const [visible, setVisible] = useState(false);
    const [accepting, setAccepting] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const tagline = useRef(pickRandom(CHALLENGE_LINES)).current;

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, []);

    const animateClose = (cb: () => void) => {
        setVisible(false);
        setTimeout(cb, 300);
    };

    const handleAccept = async () => {
        setAccepting(true);
        try {
            await onAccept(matchId);
            animateClose(onClose);
        } finally {
            setAccepting(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            await onReject(matchId);
            animateClose(onClose);
        } finally {
            setRejecting(false);
        }
    };

    const challengerLabel = resolvedChallengers.map(p => p.name).join(' & ');
    const isBusy = accepting || rejecting;

    const mePlayer: PlayerInfo = {
        name: myName ?? 'Bạn',
        tier: myTier,
        avatar: myAvatar,
    };

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center sm:items-center justify-center px-4 pb-6 sm:pb-0"
            style={{
                background: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
                backdropFilter: visible ? 'blur(4px)' : 'blur(0px)',
                transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
            }}
            onClick={(e) => { if (e.target === e.currentTarget && !isBusy) animateClose(onClose); }}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    background: 'linear-gradient(160deg, #0f1e3a 0%, #0a1628 50%, #110a2a 100%)',
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(70px) scale(0.94)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient glows */}
                <div className="pointer-events-none absolute" style={{ top: -60, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)' }} />
                <div className="pointer-events-none absolute" style={{ bottom: -40, right: -20, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />

                <Shuttlecocks />

                {/* ── Top accent bar ── */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)' }} />

                <div className="relative px-5 pt-5 pb-6 space-y-5">
                    {/* Close */}
                    {!isBusy && (
                        <button
                            onClick={() => animateClose(onClose)}
                            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2 pt-1">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'rgba(59,130,246,0.15)',
                                border: '1.5px solid rgba(59,130,246,0.3)',
                                boxShadow: '0 0 28px rgba(59,130,246,0.2)',
                                animation: 'challengePulse 2.5s ease-in-out infinite',
                            }}
                        >
                            <Swords className="w-8 h-8" style={{ color: '#60a5fa' }} />
                        </div>
                        <div>
                            <p className="font-black" style={{ fontSize: 22, letterSpacing: '-0.02em', color: '#e2e8f0' }}>
                                Lời thách đấu!
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {tagline}
                            </p>
                        </div>
                    </div>

                    {/* Challenge card */}
                    <div
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <div className="flex items-center gap-3 ml-4">
                            <div className="ml-3" style={{ position: 'relative', width: 40, height: 40, flexShrink: 0, overflow: 'visible' }}>
                                <ChallengeAvatar
                                    player={resolvedChallengers[0] ?? { name: '?', tier: undefined }}
                                    colorStyle={{
                                        background: 'rgba(239,68,68,0.2)',
                                        color: '#fca5a5',
                                        border: '1px solid rgba(239,68,68,0.25)',
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0 ml-6">
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Thách đấu bởi</p>
                                <p className="text-base font-bold truncate" style={{ color: '#fca5a5' }}>{challengerLabel}</p>
                            </div>
                            <div
                                className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                Đội A
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                            <div className="ml-3" style={{ position: 'relative', width: 40, height: 40, flexShrink: 0, overflow: 'visible' }}>
                                <ChallengeAvatar
                                    player={mePlayer}
                                    colorStyle={{
                                        background: 'rgba(59,130,246,0.2)',
                                        color: '#93c5fd',
                                        border: '1px solid rgba(59,130,246,0.25)',
                                    }}
                                />
                            </div>
                            <div className="flex-1 min-w-0 ml-6">
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {resolvedPartners.length > 0 ? 'Đội của bạn' : 'Bạn'}
                                </p>
                                <p className="text-base font-bold" style={{ color: '#93c5fd' }}>
                                    {mePlayer.name}
                                    {resolvedPartners.length > 0 ? ` & ${resolvedPartners.map(p => p.name).join(' & ')}` : ''}
                                </p>
                            </div>
                            <div
                                className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                                style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}
                            >
                                Đội B
                            </div>
                        </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-center gap-3">
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            {matchType === 'doubles' ? '👥 Đôi' : '👤 Đơn'}
                        </span>
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            Best of {bestOf}
                        </span>
                    </div>

                    {/* Note */}
                    {note && (
                        <div
                            className="rounded-xl px-4 py-2.5 text-sm italic"
                            style={{
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.15)',
                                color: 'rgba(253,230,138,0.75)',
                            }}
                        >
                            💬 "{note}"
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                            onClick={handleReject}
                            disabled={isBusy}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                            style={{
                                background: 'rgba(239,68,68,0.1)',
                                border: '1.5px solid rgba(239,68,68,0.25)',
                                color: '#fca5a5',
                            }}
                        >
                            {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Từ chối
                        </button>

                        <button
                            onClick={handleAccept}
                            disabled={isBusy}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                            style={{
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                border: '1.5px solid rgba(99,102,241,0.4)',
                                color: '#fff',
                                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                            }}
                        >
                            {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Chấp nhận!
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes challengePulse {
                        0%, 100% { box-shadow: 0 0 28px rgba(59,130,246,0.2); }
                        50%       { box-shadow: 0 0 44px rgba(59,130,246,0.4); }
                    }
                `}</style>
            </div>
        </div>
    );
}
'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Trophy, Swords } from 'lucide-react';
import { RankAvatarMatchResult, RankPodiumAvatarList, RankPodiumAvatarModal } from '@/components/Rank';

interface PlayerInfo {
    name: string;
    tier?: string;
    avatar?: string | null;
}

interface MatchResult {
    matchId: string;
    isWinner: boolean;
    myScore: number;
    oppScore: number;
    opponents?: PlayerInfo[];
    myTeam?: PlayerInfo[];
    opponentNames?: string[];
    matchType: 'singles' | 'doubles';
}

interface Props {
    result: MatchResult;
    onClose: () => void;
}

function Confetti() {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const pieces = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        color: colors[i % colors.length],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 0.6}s`,
        duration: `${0.9 + Math.random() * 0.8}s`,
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
    }));
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {pieces.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        top: '-10%',
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        background: p.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        transform: `rotate(${p.rotate}deg)`,
                        animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
                        opacity: 0,
                    }}
                />
            ))}
            <style>{`
                @keyframes confettiFall {
                    0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
                    100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

function RainDrops() {
    const drops = Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: `${(i / 16) * 100 + Math.random() * 4}%`,
        delay: `${Math.random() * 1.2}s`,
        duration: `${0.7 + Math.random() * 0.5}s`,
    }));
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {drops.map(d => (
                <div
                    key={d.id}
                    style={{
                        position: 'absolute',
                        top: '-5%',
                        left: d.left,
                        width: 1.5,
                        height: 12,
                        background: 'rgba(99,130,190,0.35)',
                        borderRadius: 2,
                        animation: `rainFall ${d.duration} ${d.delay} linear infinite`,
                    }}
                />
            ))}
            <style>{`
                @keyframes rainFall {
                    0%   { transform: translateY(0);     opacity: 0.7; }
                    100% { transform: translateY(440px); opacity: 0;   }
                }
            `}</style>
        </div>
    );
}

const WIN_QUOTES = [
    'Cú smash của bạn hôm nay không có đối thủ nào đỡ được! 🏸',
    'Thống trị sân đấu — đẳng cấp thực sự của bạn!',
    'Chiến thắng xứng đáng! Tiếp tục tỏa sáng nhé!',
    'Từng điểm số đều là mồ hôi và nỗ lực. Xứng đáng lắm! 💪',
];

const LOSE_QUOTES = [
    'Thất bại hôm nay là bước đệm cho chiến thắng ngày mai. Cố lên! 💙',
    'Mỗi trận thua là một bài học. Bạn sẽ mạnh hơn sau này!',
    'Không sao cả — ngay cả cao thủ cũng có ngày tệ. Hẹn trận sau nhé! 🏸',
    'Hãy nghỉ ngơi, tập luyện thêm và quay lại mạnh mẽ hơn!',
];

function pickRandom(arr: string[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function ResultAvatarGroup({
    players,
    isWinner,
}: {
    players: PlayerInfo[];
    isWinner: boolean;
}) {
    const fallbackBg = isWinner
        ? 'rgba(245,158,11,0.2)'
        : 'rgba(99,102,241,0.2)';
    const fallbackColor = isWinner ? '#fde68a' : '#a5b4fc';

    return (
        <div className="flex flex-col items-center gap-7">
            {players.map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                    {p.tier ? (
                        <RankAvatarMatchResult
                            tier={p.tier}
                            avatar={p.avatar}
                            name={p.name}
                            size={players.length > 1 ? 56 : 72}
                            frameScale={5}
                        />
                    ) : (
                        <div
                            style={{
                                width: players.length > 1 ? 56 : 72,
                                height: players.length > 1 ? 56 : 72,
                                borderRadius: '50%',
                                background: fallbackBg,
                                color: fallbackColor,
                                border: `2px solid ${isWinner ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.3)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: players.length > 1 ? 20 : 26,
                            }}
                        >
                            {p.name?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <span
                        className="text-[10px] truncate max-w-[64px] text-center"
                        style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                        {p.name}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function MatchResultModal({ result, onClose }: Props) {
    const { isWinner, myScore, oppScore, opponents, myTeam, opponentNames, matchType } = result;

    const [visible, setVisible] = useState(false);
    const quote = useRef(isWinner ? pickRandom(WIN_QUOTES) : pickRandom(LOSE_QUOTES)).current;

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    const resolvedOpponents: PlayerInfo[] =
        opponents && opponents.length > 0
            ? opponents
            : (opponentNames ?? []).map(name => ({ name }));

    const oppLabel = resolvedOpponents.map(p => p.name).join(' & ');

    const mePlayers: PlayerInfo[] = myTeam && myTeam.length > 0 ? myTeam : [{ name: 'Bạn ' }]
    const oppPlayers = resolvedOpponents.length > 0 ? resolvedOpponents : [{ name: '?' }];

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center sm:items-center justify-center px-4 pb-6 sm:pb-0"
            style={{
                background: visible ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                backdropFilter: visible ? 'blur(3px)' : 'blur(0px)',
                pointerEvents: visible ? 'auto' : 'none',
                transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.95)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1), opacity 0.3s ease',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Background gradient ── */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: isWinner
                            ? 'linear-gradient(160deg, #0f2744 0%, #1a3a6b 45%, #0d3320 100%)'
                            : 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f1a2e 100%)',
                    }}
                />

                {/* Ambient glow */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        top: '-40px', left: '50%', transform: 'translateX(-50%)',
                        width: 280, height: 280, borderRadius: '50%',
                        background: isWinner
                            ? 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
                    }}
                />

                {/* Particles */}
                {isWinner ? <Confetti /> : <RainDrops />}

                {/* ── Content ── */}
                <div className="relative px-6 pt-7 pb-6">
                    {/* Close */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Icon & headline */}
                    <div className="flex flex-col items-center text-center gap-3">
                        {/* ── Trophy / Swords icon ── */}
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center"
                            style={{
                                background: isWinner
                                    ? 'radial-gradient(circle, rgba(245,158,11,0.25), rgba(16,185,129,0.15))'
                                    : 'rgba(255,255,255,0.06)',
                                border: isWinner
                                    ? '2px solid rgba(245,158,11,0.4)'
                                    : '2px solid rgba(255,255,255,0.1)',
                                boxShadow: isWinner ? '0 0 32px rgba(245,158,11,0.3)' : 'none',
                                animation: isWinner ? 'pulseGlow 2s ease-in-out infinite' : undefined,
                            }}
                        >
                            {isWinner
                                ? <Trophy className="w-9 h-9" style={{ color: '#fbbf24' }} />
                                : <Swords className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.4)' }} />
                            }
                        </div>

                        <div>
                            <p
                                className="font-black leading-none"
                                style={{
                                    fontSize: 26,
                                    letterSpacing: '-0.02em',
                                    color: isWinner ? '#fde68a' : 'rgba(255,255,255,0.55)',
                                }}
                            >
                                {isWinner ? '🏆 Chiến thắng!' : 'Thua cuộc 😔'}
                            </p>
                            <p className="mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {matchType === 'doubles' ? '👥 Trận đôi' : '👤 Trận đơn'} đã được xác nhận
                            </p>
                        </div>

                        <div
                            className="flex items-center gap-4 px-5 py-3 rounded-2xl w-full justify-center"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {/* Đội mình */}
                            <div className="flex flex-col items-center gap-1 mr-6">
                                <ResultAvatarGroup players={mePlayers} isWinner={isWinner} />
                                {/* <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Bạn</span> */}
                            </div>

                            {/* Score */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                    className="font-black"
                                    style={{
                                        fontSize: 36,
                                        lineHeight: 1,
                                        color: isWinner ? '#34d399' : 'rgba(255,255,255,0.35)',
                                    }}
                                >
                                    {myScore}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20, fontWeight: 700 }}>–</span>
                                <span
                                    className="font-black"
                                    style={{
                                        fontSize: 36,
                                        lineHeight: 1,
                                        color: isWinner ? 'rgba(255,255,255,0.35)' : '#f87171',
                                    }}
                                >
                                    {oppScore}
                                </span>
                            </div>

                            {/* Đội đối thủ */}
                            <div className="flex flex-col items-center gap-1 ml-6">
                                <ResultAvatarGroup players={oppPlayers} isWinner={!isWinner} />
                                {/* <span
                                    className="text-[10px] max-w-[72px] truncate text-center"
                                    style={{ color: 'rgba(255,255,255,0.35)' }}
                                >
                                    {oppLabel}
                                </span> */}
                            </div>
                        </div>

                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {isWinner ? 'Thắng trước' : 'Thua trước'}{' '}
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{oppLabel}</span>
                        </p>

                        {/* Quote card */}
                        <div
                            className="w-full rounded-xl px-4 py-3 mt-1 text-center text-sm leading-relaxed"
                            style={{
                                background: isWinner ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.12)',
                                border: isWinner ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(99,102,241,0.2)',
                                color: isWinner ? 'rgba(254,240,138,0.9)' : 'rgba(165,180,252,0.9)',
                                fontStyle: 'italic',
                            }}
                        >
                            {quote}
                        </div>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleClose}
                        className="mt-5 w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
                        style={{
                            background: isWinner
                                ? 'linear-gradient(135deg, #f59e0b, #10b981)'
                                : 'rgba(255,255,255,0.08)',
                            color: isWinner ? '#fff' : 'rgba(255,255,255,0.6)',
                            border: isWinner ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        }}
                    >
                        {isWinner ? 'Tuyệt vời! 🎉' : 'Cố lên lần sau! 💪'}
                    </button>
                </div>

                <style>{`
                    @keyframes pulseGlow {
                        0%, 100% { box-shadow: 0 0 32px rgba(245,158,11,0.3); }
                        50%       { box-shadow: 0 0 52px rgba(245,158,11,0.5); }
                    }
                `}</style>
            </div>
        </div>
    );
}
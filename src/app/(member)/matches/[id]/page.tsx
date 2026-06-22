'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft, CheckCircle2, XCircle, Hourglass,
    Clock, Trophy, Loader2, Plus, Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { matchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

function Revive({ size = 24, className = '' }: { size?: number; className?: string }) {
    return (
        <Image
            src="/images/revive.png"
            alt="chai Revive"
            width={size}
            height={size * 2.4}
            className={`object-contain inline-block ${className}`}
            style={{ imageRendering: 'auto' }}
        />
    );
}

const STATUS_CFG: Record<string, { label: string; cls: string; bg: string }> = {
    pending_opponent: { label: 'Chờ đối thủ chấp nhận', cls: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
    pending_result: { label: 'Chờ nhập kết quả', cls: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    pending_approval: { label: 'Chờ admin duyệt', cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    approved: { label: 'Đã duyệt — Điểm đã tính', cls: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    rejected: { label: 'Đã từ chối', cls: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

function SetRow({
    setNum, scoreA, scoreB,
    onChangeA, onChangeB, isMe,
}: {
    setNum: number; scoreA: number; scoreB: number;
    onChangeA: (v: number) => void; onChangeB: (v: number) => void;
    isMe: boolean;
}) {
    const myScore = isMe ? scoreA : scoreB;
    const oppScore = isMe ? scoreB : scoreA;
    const iWon = myScore > oppScore;

    const Stepper = ({ val, onChange, color }: { val: number; onChange: (v: number) => void; color: string }) => {
        const [raw, setRaw] = useState(String(val));

        useEffect(() => {
            // Chỉ sync khi không đang edit (raw không phải prefix hợp lệ)
            if (document.activeElement?.tagName !== 'INPUT') {
                setRaw(String(val));
            }
        }, [val]);

        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => { const next = Math.max(0, val - 1); onChange(next); setRaw(String(next)); }}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <input
                    type="number"
                    min={0}
                    value={raw}
                    onChange={e => {
                        const str = e.target.value;
                        setRaw(str);
                        const v = parseInt(str);
                        if (!isNaN(v) && v >= 0) onChange(v);
                    }}
                    onBlur={() => setRaw(String(val))}
                    className={`w-10 text-center text-xl font-black bg-transparent border-none outline-none ${color}`}
                />
                <button
                    onClick={() => { const next = val + 1; onChange(next); setRaw(String(next)); }}
                    className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                </button>
            </div>
        );
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl border ${myScore === oppScore ? 'bg-gray-50 border-gray-100' : iWon ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <span className={`text-xs font-bold w-8 text-center ${myScore === oppScore ? 'text-gray-500' : iWon ? 'text-emerald-600' : 'text-red-500'}`}>
                S{setNum}
            </span>
            <div className="flex-1 flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-blue-500 font-semibold">Bạn</span>
                    <Stepper val={isMe ? scoreA : scoreB} onChange={v => isMe ? onChangeA(v) : onChangeB(v)} color={iWon ? 'text-emerald-600' : 'text-gray-700'} />
                </div>
                <span className="text-gray-300 font-bold text-lg">–</span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-red-400 font-semibold">Đối thủ</span>
                    <Stepper val={isMe ? scoreB : scoreA} onChange={v => isMe ? onChangeB(v) : onChangeA(v)} color={!iWon && myScore !== oppScore ? 'text-red-500' : 'text-gray-700'} />
                </div>
            </div>
            <span className={`text-[10px] font-bold w-12 text-center ${myScore === oppScore ? 'text-gray-400' : iWon ? 'text-emerald-600' : 'text-red-500'}`}>
                {myScore === oppScore ? '—' : iWon ? 'Thắng' : 'Thua'}
            </span>
        </div>
    );
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function MatchDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [sets, setSets] = useState<{ score_a: number; score_b: number }[]>(
        Array.from({ length: 5 }, () => ({ score_a: 0, score_b: 0 }))
    );
    const [activeSets, setActiveSets] = useState(2);

    const fetchMatch = async () => {
        try {
            const { data } = await matchesApi.get(id);
            setMatch(data);
            if (data.sets?.length) {
                const filled = Array.from({ length: 5 }, (_, i) => {
                    const s = data.sets.find((x: any) => x.set_number === i + 1);
                    return s ? { score_a: s.score_a, score_b: s.score_b } : { score_a: 0, score_b: 0 };
                });
                setSets(filled);
                setActiveSets(Math.max(data.sets.length, 2));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMatch(); }, [id]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`match-detail:${user.id}:${id}`)
            .on(
                'broadcast',
                { event: 'match_result' },
                async (payload) => {
                    if (payload.payload?.matchId === id) {
                        await fetchMatch();
                    }
                },
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }
    }, [user?.id, id]);

    useEffect(() => {
        if (!match) return;

        const setsToWin = Math.ceil(match.best_of / 2);
        let aWon = 0, bWon = 0;
        for (let i = 0; i < activeSets; i++) {
            if (sets[i].score_a > sets[i].score_b) aWon++;
            else if (sets[i].score_b > sets[i].score_a) bWon++;
        }

        if (
            aWon === bWon &&
            aWon > 0 &&
            activeSets < match.best_of &&
            Math.max(aWon, bWon) < setsToWin
        ) {
            setActiveSets(prev => Math.min(prev + 1, match.best_of));
        }
    }, [sets, activeSets, match])

    if (loading || !match) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-64 animate-pulse" />
            </div>
        );
    }

    const isTeamA = match.player_a1?.id === user?.id || match.player_a2?.id === user?.id;
    const isTeamB = match.player_b1?.id === user?.id || match.player_b2?.id === user?.id;
    const isCreator = match.created_by === user?.id;
    const isInvited = match.player_b1?.id === user?.id;
    const cfg = STATUS_CFG[match.status] ?? STATUS_CFG.pending_opponent;

    const activeSetsData = sets.slice(0, activeSets);
    let myWon = 0, oppWon = 0;
    activeSetsData.forEach(s => {
        const myScore = isTeamA ? s.score_a : s.score_b;
        const oppScore = isTeamA ? s.score_b : s.score_a;
        if (myScore > oppScore) myWon++;
        else if (oppScore > myScore) oppWon++;
    });

    const setsToWin = Math.ceil(match.best_of / 2);
    const isValidResult = Math.max(myWon, oppWon) >= setsToWin;
    const revivePreview = (myWon - oppWon) * 5;

    const mySetWins = isTeamA ? match.team_a_sets_won : match.team_b_sets_won;
    const oppSetWins = isTeamA ? match.team_b_sets_won : match.team_a_sets_won;
    const reviveNet = (mySetWins - oppSetWins) * 5;

    const handleAccept = async () => {
        setSubmitting(true);
        try {
            await matchesApi.accept(id);
            toast.success('Đã chấp nhận lời thách đấu! 🏸');
            fetchMatch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thất bại');
        } finally { setSubmitting(false); }
    };

    const handleDecline = async () => {
        if (!confirm('Từ chối lời thách đấu này?')) return;
        setSubmitting(true);
        try {
            await matchesApi.decline(id, 'Đối thủ từ chối');
            toast.success('Đã từ chối');
            router.push('/activity?tab=matches');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thất bại');
        } finally { setSubmitting(false); }
    };

    const handleSubmitResult = async () => {
        if (!isValidResult) { toast.error(`Cần có đội thắng ${setsToWin} set (BO${match.best_of})`); return; }
        setSubmitting(true);
        try {
            const setsPayload = activeSetsData
                .map((s, i) => ({ set_number: i + 1, score_a: s.score_a, score_b: s.score_b }))
                .filter(s => s.score_a > 0 || s.score_b > 0);
            await matchesApi.submitResult(id, { sets: setsPayload });
            toast.success('Đã gửi kết quả, chờ admin duyệt 📋');
            fetchMatch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Gửi thất bại');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <style>{`
            @keyframes setPopIn {
                from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0)   scale(1);    }
            }
        `}</style>

            <button onClick={() => router.push('/activity?tab=matches')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>

            {/* Status banner */}
            <div className={`rounded-2xl px-4 py-3 border flex items-center gap-2 ${cfg.bg}`}>
                {match.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                {match.status === 'pending_approval' && <Hourglass className="w-4 h-4 text-amber-600   flex-shrink-0" />}
                {match.status === 'rejected' && <XCircle className="w-4 h-4 text-red-500     flex-shrink-0" />}
                {match.status === 'pending_result' && <Clock className="w-4 h-4 text-blue-600    flex-shrink-0" />}
                <span className={`text-sm font-semibold ${cfg.cls}`}>{cfg.label}</span>
                {match.reject_reason && <span className="text-xs text-red-400 ml-1">— {match.reject_reason}</span>}
            </div>

            {/* Match info card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm overflow-hidden">
                {/* Type + date */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        {match.match_type === 'doubles' ? '👥 Đôi' : '👤 Đơn'} · Best of {match.best_of}
                    </span>
                    {match.played_at && (
                        <span className="text-xs text-gray-400">
                            {format(new Date(match.played_at), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                    )}
                </div>

                {/* ── Teams VS ── */}
                <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                    {/* Đội A */}
                    <div className="min-w-0 space-y-2">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">
                            {isTeamA ? 'Đội A (bạn)' : 'Đội A'}
                        </p>
                        {[match.player_a1, match.player_a2].filter(Boolean).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 min-w-0">
                                {/* <div className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${p.id === user?.id ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                    {p.full_name?.[0]?.toUpperCase()}
                                </div> */}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{p.full_name}</p>
                                    {p.id === user?.id && <p className="text-[10px] text-blue-500 leading-none mt-0.5">Bạn</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score / VS */}
                    <div className="flex flex-col items-center gap-1 pt-5 px-1 flex-shrink-0">
                        {(match.status === 'approved' || match.status === 'pending_approval') ? (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'A' ? 'text-emerald-600' : 'text-gray-300'}`}>
                                        {match.team_a_sets_won}
                                    </span>
                                    <span className="text-gray-300 text-lg leading-none">–</span>
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'B' ? 'text-emerald-600' : 'text-gray-300'}`}>
                                        {match.team_b_sets_won}
                                    </span>
                                </div>
                                {match.status === 'approved' && match.winner_team && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                                            {match.winner_team === 'A' ? 'Đội A' : 'Đội B'} thắng
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-gray-300 font-bold text-xl leading-none">VS</span>
                        )}
                    </div>

                    {/* Đội B */}
                    <div className="min-w-0 space-y-2 text-right">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                            {isTeamB ? 'Đội B (bạn)' : 'Đội B'}
                        </p>
                        {[match.player_b1, match.player_b2].filter(Boolean).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-end gap-2 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{p.full_name}</p>
                                    {p.id === user?.id && <p className="text-[10px] text-blue-500 leading-none mt-0.5">Bạn</p>}
                                </div>
                                {/* <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${p.id === user?.id ? 'bg-blue-600 text-white' : 'bg-red-100 text-red-600'}`}>
                                    {p.full_name?.[0]?.toUpperCase()}
                                </div> */}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Set results read-only */}
                {match.sets?.length > 0 && match.status !== 'pending_result' && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Tỉ số từng set</p>
                        <div className="flex gap-2 flex-wrap">
                            {[...match.sets].sort((a: any, b: any) => a.set_number - b.set_number).map((s: any) => {
                                const myScore = isTeamA ? s.score_a : s.score_b;
                                const oppScore = isTeamA ? s.score_b : s.score_a;
                                const iWon = myScore > oppScore;
                                return (
                                    <div key={s.set_number} className={`px-3 py-1.5 rounded-xl border text-center ${iWon ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className="text-[10px] text-gray-400">Set {s.set_number}</p>
                                        <p className={`text-sm font-black ${iWon ? 'text-emerald-600' : 'text-red-500'}`}>{myScore}–{oppScore}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Revive summary (approved) ── */}
                {match.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Revive size={12} />
                            <p className="text-xs font-semibold text-gray-500">Chai Revive nhận được</p>
                        </div>

                        <div className="flex gap-3">
                            {/* Set thắng */}
                            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-center">
                                <p className="text-[10px] text-emerald-500 font-medium mb-1">Set thắng</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="font-black text-emerald-600 text-base">+{mySetWins * 5}</span>
                                    <Revive size={12} />
                                </div>
                            </div>

                            {/* Set thua */}
                            <div className="flex-1 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-center">
                                <p className="text-[10px] text-red-400 font-medium mb-1">Set thua</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="font-black text-red-500 text-base">-{oppSetWins * 5}</span>
                                    <Revive size={12} />
                                </div>
                            </div>

                            {/* Tổng */}
                            <div className={`flex-1 rounded-xl px-3 py-2.5 text-center border ${reviveNet >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-[10px] text-gray-400 font-medium mb-1">Tổng</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className={`font-black text-base ${reviveNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {reviveNet > 0 ? '+' : ''}{reviveNet}
                                    </span>
                                    <Revive size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invited — accept/decline */}
            {match.status === 'pending_opponent' && isInvited && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-center text-gray-600">Bạn có muốn chấp nhận lời thách đấu?</p>
                    <button onClick={handleAccept} disabled={submitting} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Chấp nhận thách đấu
                    </button>
                    <button onClick={handleDecline} disabled={submitting} className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                </div>
            )}

            {/* Creator waiting */}
            {match.status === 'pending_opponent' && isCreator && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-center">
                    <Hourglass className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Chờ đối thủ chấp nhận</p>
                    <p className="text-xs text-gray-400 mt-1">Đã gửi lời thách đến <span className="font-medium">{match.player_b1?.full_name}</span></p>
                </div>
            )}

            {/* Enter result */}
            {match.status === 'pending_result' && isCreator && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">Nhập tỉ số từng set</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Số set:</span>
                            <div className="flex gap-1">
                                {Array.from({ length: match.best_of }, (_, i) => i + 1).map(n => (
                                    <button key={n} onClick={() => setActiveSets(n)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${activeSets === n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {Array.from({ length: activeSets }, (_, i) => (
                            <div
                                key={i}
                                style={{ animation: 'setPopIn 0.25s cubic-bezier(0.32,0.72,0,1) both' }}
                            >
                                <SetRow
                                    setNum={i + 1}
                                    scoreA={sets[i].score_a}
                                    scoreB={sets[i].score_b}
                                    onChangeA={v => setSets(prev => prev.map((s, j) => j === i ? { ...s, score_a: v } : s))}
                                    onChangeB={v => setSets(prev => prev.map((s, j) => j === i ? { ...s, score_b: v } : s))}
                                    isMe={isTeamA}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Preview revive */}
                    <div className={`rounded-xl px-4 py-3 border text-center ${!isValidResult ? 'bg-gray-50 border-gray-200' : myWon > oppWon ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        {!isValidResult ? (
                            <p className="text-xs text-gray-500">Cần thắng {setsToWin} set để kết thúc (BO{match.best_of})</p>
                        ) : (
                            <div className="space-y-1">
                                <p className={`text-sm font-bold ${myWon > oppWon ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {myWon > oppWon ? '🏆 Bạn thắng!' : '😅 Bạn thua'} ({myWon}–{oppWon} set)
                                </p>
                                <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${revivePreview >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <span>Chai Revive: {revivePreview > 0 ? '+' : ''}{revivePreview}</span>
                                    <Revive size={14} />
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleSubmitResult} disabled={!isValidResult || submitting} className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Gửi kết quả để duyệt 📋
                    </button>
                </div>
            )}

            {/* Not creator waiting */}
            {match.status === 'pending_result' && !isCreator && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 text-center">
                    <Clock className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                    <p className="text-sm font-semibold text-blue-700">Chờ đối thủ nhập kết quả</p>
                    <p className="text-xs text-blue-400 mt-1"><span className="font-medium">{match.player_a1?.full_name}</span> sẽ nhập tỉ số</p>
                </div>
            )}
        </div>
    );
}
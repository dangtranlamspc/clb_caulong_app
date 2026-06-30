'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft, CheckCircle2, XCircle, Hourglass,
    Clock, Trophy, Loader2, Gem,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { matchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const WIN_POINTS = 5;
const LOSE_POINTS = -1;

const STATUS_CFG: Record<string, { label: string; cls: string; bg: string }> = {
    pending_opponent: { label: 'Chờ đối thủ chấp nhận', cls: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
    pending_result: { label: 'Chờ nhập kết quả', cls: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    pending_approval: { label: 'Chờ admin duyệt', cls: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    approved: { label: 'Đã duyệt — Điểm đã tính', cls: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    rejected: { label: 'Đã từ chối', cls: 'text-red-600', bg: 'bg-red-50 border-red-200' },
};

function ScoreInput({ val, onChange, color }: { val: number; onChange: (v: number) => void; color: string }) {
    const [raw, setRaw] = useState(String(val));
    const isFocused = useRef(false);

    useEffect(() => {
        if (!isFocused.current) {
            setRaw(String(val));
        }
    }, [val]);

    return (
        <input
            type="number"
            inputMode="numeric"
            min={0}
            max={21}
            value={raw}
            onFocus={() => { isFocused.current = true; }}
            onChange={e => {
                const str = e.target.value;
                if (str.length > 2) return;
                setRaw(str);
                const v = parseInt(str);
                if (!isNaN(v) && v >= 0) onChange(Math.min(v, 21));
            }}
            onBlur={() => {
                isFocused.current = false;
                setRaw(String(val));
            }}
            className={`w-20 h-16 text-center text-4xl font-black bg-white rounded-2xl border-2 border-gray-200 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all ${color}`}
        />
    );
}

function ScoreRow({
    scoreA, scoreB,
    onChangeA, onChangeB, isMe,
}: {
    scoreA: number; scoreB: number;
    onChangeA: (v: number) => void; onChangeB: (v: number) => void;
    isMe: boolean;
}) {
    const myScore = isMe ? scoreA : scoreB;
    const oppScore = isMe ? scoreB : scoreA;
    const iWon = myScore > oppScore;

    return (
        <div className={`flex items-center justify-center gap-6 p-4 rounded-2xl border ${myScore === oppScore ? 'bg-gray-50 border-gray-100' : iWon ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-blue-500 font-semibold">Bạn</span>
                <ScoreInput val={isMe ? scoreA : scoreB} onChange={v => isMe ? onChangeA(v) : onChangeB(v)} color={iWon ? 'text-emerald-600' : 'text-gray-700'} />
            </div>
            <span className="text-gray-300 font-bold text-2xl">–</span>
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-red-400 font-semibold">Đối thủ</span>
                <ScoreInput val={isMe ? scoreB : scoreA} onChange={v => isMe ? onChangeB(v) : onChangeA(v)} color={!iWon && myScore !== oppScore ? 'text-red-500' : 'text-gray-700'} />
            </div>
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
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);

    const fetchMatch = async () => {
        try {
            const { data } = await matchesApi.get(id);
            setMatch(data);
            if (typeof data.score_a === 'number') setScoreA(data.score_a);
            if (typeof data.score_b === 'number') setScoreB(data.score_b);
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

    const myScore = isTeamA ? scoreA : scoreB;
    const oppScore = isTeamA ? scoreB : scoreA;

    const isValidResult = scoreA !== scoreB;
    const pointsPreview = isTeamA
        ? (scoreA > scoreB ? WIN_POINTS : LOSE_POINTS)
        : (scoreB > scoreA ? WIN_POINTS : LOSE_POINTS);

    const myFinalScore = isTeamA ? match.score_a : match.score_b;
    const oppFinalScore = isTeamA ? match.score_b : match.score_a;
    const iWonFinal = match.winner_team === (isTeamA ? 'A' : 'B');
    const pointsNet = iWonFinal ? WIN_POINTS : LOSE_POINTS;

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
            sessionStorage.setItem('activity:return-tab', 'matches');
            router.push('/activity');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thất bại');
        } finally { setSubmitting(false); }
    };

    const handleSubmitResult = async () => {
        if (!isValidResult) { toast.error('Trận đấu không được hoà, phải có đội thắng'); return; }
        setSubmitting(true);
        try {
            await matchesApi.submitResult(id, { score_a: scoreA, score_b: scoreB });
            toast.success('Đã gửi kết quả, chờ admin duyệt 📋');
            fetchMatch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Gửi thất bại');
        } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-4">
            <button onClick={() => {
                sessionStorage.setItem('activity:return-tab', 'matches');
                router.push('/activity');
            }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
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
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                        {match.match_type === 'doubles' ? '👥 Đôi' : '👤 Đơn'} · 1 set
                    </span>
                    {match.played_at && (
                        <span className="text-xs text-gray-400">
                            {format(new Date(match.played_at), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                    )}
                </div>

                <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                    <div className="min-w-0 space-y-2">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">
                            {isTeamA ? 'Đội A (bạn)' : 'Đội A'}
                        </p>
                        {[match.player_a1, match.player_a2].filter(Boolean).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{p.full_name}</p>
                                    {p.id === user?.id && <p className="text-[10px] text-blue-500 leading-none mt-0.5">Bạn</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-1 pt-5 px-1 flex-shrink-0">
                        {(match.status === 'approved' || match.status === 'pending_approval') ? (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'A' ? 'text-emerald-600' : 'text-gray-300'}`}>
                                        {match.score_a}
                                    </span>
                                    <span className="text-gray-300 text-lg leading-none">–</span>
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'B' ? 'text-emerald-600' : 'text-gray-300'}`}>
                                        {match.score_b}
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Điểm nhận được (approved) ── */}
                {match.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Gem className="w-3.5 h-3.5 text-cyan-500" />
                            <p className="text-xs font-semibold text-gray-500">Điểm nhận được</p>
                        </div>

                        <div className={`rounded-xl px-3 py-2.5 text-center border ${pointsNet >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-[10px] text-gray-400 font-medium mb-1">
                                {iWonFinal ? 'Thắng trận' : 'Thua trận'} ({myFinalScore}–{oppFinalScore})
                            </p>
                            <div className="flex items-center justify-center gap-1">
                                <span className={`font-black text-base ${pointsNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {pointsNet > 0 ? '+' : ''}{pointsNet} point
                                </span>
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
                    <p className="text-sm font-bold text-gray-900">Nhập tỉ số (1 set)</p>

                    <ScoreRow
                        scoreA={scoreA}
                        scoreB={scoreB}
                        onChangeA={setScoreA}
                        onChangeB={setScoreB}
                        isMe={isTeamA}
                    />

                    {/* Preview điểm */}
                    <div className={`rounded-xl px-4 py-3 border text-center ${!isValidResult ? 'bg-gray-50 border-gray-200' : myScore > oppScore ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        {!isValidResult ? (
                            <p className="text-xs text-gray-500">Tỉ số không được hoà, phải có đội thắng</p>
                        ) : (
                            <div className="space-y-1">
                                <p className={`text-sm font-bold ${myScore > oppScore ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {myScore > oppScore ? '🏆 Bạn thắng!' : '😅 Bạn thua'} ({myScore}–{oppScore})
                                </p>
                                <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${pointsPreview >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <span>Điểm: {pointsPreview > 0 ? '+' : ''}{pointsPreview}</span>
                                    <Gem className="w-3.5 h-3.5 text-cyan-500" />
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
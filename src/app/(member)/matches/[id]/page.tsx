'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft, CheckCircle2, XCircle, Hourglass,
    Clock, Trophy, Loader2, Gem, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { matchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const WIN_POINTS = 5;
const LOSE_POINTS = 2;

const STATUS_CFG: Record<string, { label: string; cls: string; bg: string }> = {
    pending_opponent: { label: 'Chờ đối thủ chấp nhận', cls: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-muted)] border-[var(--border)]' },
    pending_result: { label: 'Chờ nhập kết quả', cls: 'text-[var(--primary)]', bg: 'bg-[var(--primary-soft)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]' },
    pending_approval: { label: 'Chờ admin duyệt', cls: 'text-[var(--warning)]', bg: 'bg-[var(--warning-soft)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]' },
    approved: { label: 'Đã duyệt — Điểm đã tính', cls: 'text-[var(--success)]', bg: 'bg-[var(--success-soft)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]' },
    rejected: { label: 'Đã từ chối', cls: 'text-[var(--danger)]', bg: 'bg-[var(--danger-soft)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]' },
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
            className={`w-20 h-16 text-center text-4xl font-black bg-[var(--surface)] rounded-2xl border-2 border-[var(--border)] outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] transition-all ${color}`}
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
        <div className={`flex items-center justify-center gap-6 p-4 rounded-2xl border ${myScore === oppScore ? 'bg-[var(--surface-muted)] border-[var(--border)]' : iWon ? 'bg-[var(--success-soft)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]' : 'bg-[var(--danger-soft)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]'}`}>
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-[var(--primary)] font-semibold">Bạn</span>
                <ScoreInput val={isMe ? scoreA : scoreB} onChange={v => isMe ? onChangeA(v) : onChangeB(v)} color={iWon ? 'text-[var(--success)]' : 'text-[var(--text)]'} />
            </div>
            <span className="text-[var(--text-faint)] font-bold text-2xl">–</span>
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-[var(--danger)] font-semibold">Đối thủ</span>
                <ScoreInput val={isMe ? scoreB : scoreA} onChange={v => isMe ? onChangeB(v) : onChangeA(v)} color={!iWon && myScore !== oppScore ? 'text-[var(--danger)]' : 'text-[var(--text)]'} />
            </div>
        </div>
    );
}

export default function MatchDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
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
            .on(
                'broadcast',
                { event: 'match_status_changed' },
                async (payload) => {
                    if (payload.payload?.matchId === id) {
                        await fetchMatch();
                    }
                },
            )
            .on(
                'broadcast',
                { event: 'match_deleted' },
                (payload) => {
                    if (payload.payload?.matchId === id) {
                        toast.error('Trận đấu này đã bị admin xóa');
                        sessionStorage.setItem('activity:return-tab', 'matches');
                        router.push('/activity');
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
                <div className="h-8 bg-[var(--border-strong)] rounded-xl w-48 animate-pulse" />
                <div className="bg-[var(--surface)] rounded-2xl h-48 animate-pulse" />
                <div className="bg-[var(--surface)] rounded-2xl h-64 animate-pulse" />
            </div>
        );
    }

    const isTeamA = match.player_a1?.id === user?.id || match.player_a2?.id === user?.id || match.player_a3?.id === user?.id;
    const isTeamB = match.player_b1?.id === user?.id || match.player_b2?.id === user?.id || match.player_b3?.id === user?.id;
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

    const canCancel = isCreator && (match.status === 'pending_result' || match.status === 'pending_approval');

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

    const handleCancel = async () => {
        if (!confirm('Huỷ trận đấu này? Hành động không thể hoàn tác.')) return;
        setCancelling(true);
        try {
            await matchesApi.cancel(id);
            toast.success('Đã huỷ trận đấu');
            sessionStorage.setItem('activity:return-tab', 'matches');
            router.push('/activity');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Huỷ trận thất bại');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="space-y-4">
            <button onClick={() => {
                sessionStorage.setItem('activity:return-tab', 'matches');
                router.push('/activity');
            }} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>

            <div className={`rounded-2xl px-4 py-3 border flex items-center gap-2 ${cfg.bg}`}>
                {match.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-[var(--success)] flex-shrink-0" />}
                {match.status === 'pending_approval' && <Hourglass className="w-4 h-4 text-[var(--warning)]   flex-shrink-0" />}
                {match.status === 'rejected' && <XCircle className="w-4 h-4 text-[var(--danger)]     flex-shrink-0" />}
                {match.status === 'pending_result' && <Clock className="w-4 h-4 text-[var(--primary)]    flex-shrink-0" />}
                <span className={`text-sm font-semibold ${cfg.cls}`}>{cfg.label}</span>
                {match.reject_reason && <span className="text-xs text-[var(--danger)] ml-1">— {match.reject_reason}</span>}
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold bg-[var(--primary-soft)] text-[var(--primary)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] px-3 py-1 rounded-full">
                        {match.match_type === 'triples' ? '👥 3v3' : match.match_type === 'doubles' ? '👥 Đôi' : '👤 Đơn'} · 1 set
                    </span>
                    {match.played_at && (
                        <span className="text-xs text-[var(--text-faint)]">
                            {format(new Date(match.played_at), 'dd/MM/yyyy', { locale: vi })}
                        </span>
                    )}
                </div>

                <div className="grid items-start gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                    <div className="min-w-0 space-y-2">
                        <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wide">
                            {isTeamA ? 'Đội A (bạn)' : 'Đội A'}
                        </p>
                        {[match.player_a1, match.player_a2, match.player_a3].filter(Boolean).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{p.full_name}</p>
                                    {p.id === user?.id && <p className="text-[10px] text-[var(--primary)] leading-none mt-0.5">Bạn</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-1 pt-5 px-1 flex-shrink-0">
                        {(match.status === 'approved' || match.status === 'pending_approval') ? (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'A' ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'}`}>
                                        {match.score_a}
                                    </span>
                                    <span className="text-[var(--text-faint)] text-lg leading-none">–</span>
                                    <span className={`text-2xl font-black leading-none ${match.winner_team === 'B' ? 'text-[var(--success)]' : 'text-[var(--text-faint)]'}`}>
                                        {match.score_b}
                                    </span>
                                </div>
                                {match.status === 'approved' && match.winner_team && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                                            {match.winner_team === 'A' ? 'Đội A' : 'Đội B'} thắng
                                        </span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-[var(--text-faint)] font-bold text-xl leading-none">VS</span>
                        )}
                    </div>

                    <div className="min-w-0 space-y-2 text-right">
                        <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wide">
                            {isTeamB ? 'Đội B (bạn)' : 'Đội B'}
                        </p>
                        {[match.player_b1, match.player_b2, match.player_b3].filter(Boolean).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-end gap-2 min-w-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{p.full_name}</p>
                                    {p.id === user?.id && <p className="text-[10px] text-[var(--primary)] leading-none mt-0.5">Bạn</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {match.status === 'approved' && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1.5 mb-3">
                            <Gem className="w-3.5 h-3.5 text-cyan-500" />
                            <p className="text-xs font-semibold text-[var(--text-muted)]">Điểm nhận được</p>
                        </div>

                        <div className={`rounded-xl px-3 py-2.5 text-center border ${pointsNet >= 0 ? 'bg-[var(--success-soft)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]' : 'bg-[var(--danger-soft)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]'}`}>
                            <p className="text-[10px] text-[var(--text-faint)] font-medium mb-1">
                                {iWonFinal ? 'Thắng trận' : 'Thua trận'} ({myFinalScore}–{oppFinalScore})
                            </p>
                            <div className="flex items-center justify-center gap-1">
                                <span className={`font-black text-base ${pointsNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {pointsNet > 0 ? '+' : ''}{pointsNet} point
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {match.status === 'pending_opponent' && isInvited && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-center text-[var(--text-muted)]">Bạn có muốn chấp nhận lời thách đấu?</p>
                    <button onClick={handleAccept} disabled={submitting} className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Chấp nhận thách đấu
                    </button>
                    <button onClick={handleDecline} disabled={submitting} className="w-full py-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-sm font-semibold hover:bg-[var(--danger-soft)] transition-colors flex items-center justify-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                </div>
            )}

            {match.status === 'pending_opponent' && isCreator && (
                <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl px-4 py-4 text-center">
                    <Hourglass className="w-6 h-6 mx-auto text-[var(--text-faint)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Chờ đối thủ chấp nhận</p>
                    <p className="text-xs text-[var(--text-faint)] mt-1">Đã gửi lời thách đến <span className="font-medium">{match.player_b1?.full_name}</span></p>
                </div>
            )}

            {match.status === 'pending_result' && isCreator && (
                <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-sm space-y-4">
                    <p className="text-sm font-bold text-[var(--text)]">Nhập tỉ số (1 set)</p>

                    <ScoreRow
                        scoreA={scoreA}
                        scoreB={scoreB}
                        onChangeA={setScoreA}
                        onChangeB={setScoreB}
                        isMe={isTeamA}
                    />

                    <div className={`rounded-xl px-4 py-3 border text-center ${!isValidResult ? 'bg-[var(--surface-muted)] border-[var(--border)]' : myScore > oppScore ? 'bg-[var(--success-soft)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]' : 'bg-[var(--danger-soft)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]'}`}>
                        {!isValidResult ? (
                            <p className="text-xs text-[var(--text-muted)]">Tỉ số không được hoà, phải có đội thắng</p>
                        ) : (
                            <div className="space-y-1">
                                <p className={`text-sm font-bold ${myScore > oppScore ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {myScore > oppScore ? '🏆 Bạn thắng!' : '😅 Bạn thua'} ({myScore}–{oppScore})
                                </p>
                                <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${pointsPreview >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
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

                    <button onClick={handleCancel} disabled={cancelling || submitting} className="w-full py-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-sm font-semibold hover:bg-[var(--danger-soft)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        Huỷ trận đấu
                    </button>
                </div>
            )}

            {match.status === 'pending_result' && !isCreator && (
                <div className="bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-2xl px-4 py-4 text-center">
                    <Clock className="w-6 h-6 mx-auto text-[var(--primary)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--primary)]">Chờ đối thủ nhập kết quả</p>
                    <p className="text-xs text-[var(--primary)] mt-1"><span className="font-medium">{match.player_a1?.full_name}</span> sẽ nhập tỉ số</p>
                </div>
            )}

            {match.status === 'pending_approval' && isCreator && (
                <div className="space-y-2">
                    <div className="bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-2xl px-4 py-4 text-center">
                        <Hourglass className="w-6 h-6 mx-auto text-[var(--warning)] mb-2" />
                        <p className="text-sm font-semibold text-[var(--warning)]">Đang chờ admin duyệt kết quả</p>
                        <p className="text-xs text-[var(--warning)] mt-1">Bạn có thể huỷ trận nếu nhập nhầm tỉ số</p>
                    </div>
                    <button onClick={handleCancel} disabled={cancelling} className="w-full py-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger)] text-sm font-semibold hover:bg-[var(--danger-soft)] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        Huỷ trận đấu
                    </button>
                </div>
            )}

            {match.status === 'pending_approval' && !isCreator && (
                <div className="bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-2xl px-4 py-4 text-center">
                    <Hourglass className="w-6 h-6 mx-auto text-[var(--warning)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--warning)]">Đang chờ admin duyệt kết quả</p>
                </div>
            )}
        </div>
    );
}
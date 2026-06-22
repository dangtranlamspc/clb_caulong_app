'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Plus, Swords, CheckCircle2, XCircle,
    Hourglass, Clock, ChevronRight, ChevronDown,
    SlidersHorizontal, X,
} from 'lucide-react';
import { matchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const STATUS_CFG: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
    pending_opponent: { label: 'Chờ đối thủ', icon: Hourglass, cls: 'text-gray-500', dot: 'bg-gray-400' },
    pending_result: { label: 'Chờ kết quả', icon: Clock, cls: 'text-blue-600', dot: 'bg-blue-500' },
    pending_approval: { label: 'Chờ admin duyệt', icon: Hourglass, cls: 'text-amber-600', dot: 'bg-amber-400' },
    approved: { label: 'Đã duyệt', icon: CheckCircle2, cls: 'text-emerald-600', dot: 'bg-emerald-500' },
    rejected: { label: 'Từ chối', icon: XCircle, cls: 'text-red-500', dot: 'bg-red-400' },
};

const FILTER_OPTS = [
    { value: '', label: 'Tất cả trận', dot: 'bg-gray-400' },
    { value: 'pending_opponent', label: 'Chờ đối thủ', dot: 'bg-gray-400' },
    { value: 'pending_result', label: 'Đang diễn ra', dot: 'bg-blue-500' },
    { value: 'pending_approval', label: 'Chờ admin duyệt', dot: 'bg-amber-400' },
    { value: 'approved', label: 'Đã hoàn thành', dot: 'bg-emerald-500' },
    { value: 'rejected', label: 'Bị từ chối', dot: 'bg-red-400' },
];

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function MatchesPage() {
    const { user } = useAuthStore();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const openSheet = () => {
        setSheetOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true)));
    };

    const closeSheet = () => {
        setSheetVisible(false);
        setTimeout(() => setSheetOpen(false), 300);
    };

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 30 };
            if (tab) params.status = tab;
            const { data } = await matchesApi.list(params);
            setMatches(data.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    const fetchMatchesRef = useRef<() => Promise<void>>(async () => { });

    useEffect(() => {
        fetchMatchesRef.current = fetchMatches;
    }, [fetchMatches])


    useEffect(() => { fetchMatches(); }, [fetchMatches]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`matches-list:${user.id}`)
            .on('broadcast', { event: 'match_result' }, () => {
                fetchMatchesRef.current();
            })
            .on('broadcast', { event: 'new_challenge' }, () => {
                fetchMatchesRef.current();
            })
            .on('broadcast', { event: 'match_status_changed' }, () => {
                fetchMatchesRef.current();
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [user?.id]);

    useEffect(() => {
        document.body.style.overflow = sheetOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sheetOpen]);

    const activeOpt = FILTER_OPTS.find(o => o.value === tab) ?? FILTER_OPTS[0];

    const selectFilter = (value: string) => {
        setTab(value);
        closeSheet();
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Swords className="w-5 h-5 text-blue-600" /> Trận giao hữu
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Tạo và theo dõi trận đấu của bạn</p>
                </div>
                <Link href="/matches/create">
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-blue-200 active:scale-95 transition-transform">
                        <Plus className="w-4 h-4" /> Tạo trận
                    </div>
                </Link>
            </div>

            {/* Filter trigger — thay thế tabs cũ */}
            <button
                type="button"
                onClick={() => openSheet()}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 transition-colors hover:border-gray-300 active:bg-gray-50"
            >
                <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">{activeOpt.label}</span>
                    {tab && (
                        <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                            Đang lọc
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    Lọc <ChevronDown className="w-3.5 h-3.5" />
                </div>
            </button>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
                    ))}
                </div>
            ) : matches.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center border border-dashed border-gray-200">
                    <Swords className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Chưa có trận nào</p>
                    <Link href="/matches/create">
                        <span className="inline-block mt-3 text-xs text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-full">
                            Thách đấu ngay →
                        </span>
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.map((m) => {
                        const cfg = STATUS_CFG[m.status] ?? STATUS_CFG.pending_opponent;
                        const Icon = cfg.icon;
                        const isTeamA = m.player_a1?.id === user?.id || m.player_a2?.id === user?.id;
                        const myTeam = isTeamA ? 'A' : 'B';
                        const iWon = m.status === 'approved' && m.winner_team === myTeam;
                        const iLost = m.status === 'approved' && m.winner_team && m.winner_team !== myTeam;

                        const myNames = isTeamA ? [m.player_a1, m.player_a2].filter(Boolean) : [m.player_b1, m.player_b2].filter(Boolean);
                        const oppNames = isTeamA ? [m.player_b1, m.player_b2].filter(Boolean) : [m.player_a1, m.player_a2].filter(Boolean);

                        const isPendingMe = m.status === 'pending_opponent' && m.player_b1?.id === user?.id;

                        return (
                            <Link key={m.id} href={`/matches/${m.id}`}>
                                <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.99] ${isPendingMe ? 'border-blue-200 border-[1.5px]' : 'border-transparent'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                            <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                                            {isPendingMe && (
                                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                                                    Bạn được mời!
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                                {m.match_type === 'doubles' ? '👥 Đôi' : '👤 Đơn'} · BO{m.best_of}
                                            </span>
                                            {iWon && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">🏆 Thắng</span>}
                                            {iLost && <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Thua</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            {myNames.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-1.5">
                                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 flex-shrink-0">
                                                        {p.full_name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900 truncate">{p.full_name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex-shrink-0 text-center">
                                            {m.status === 'approved' || m.status === 'pending_approval' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xl font-black ${isTeamA ? m.winner_team === 'A' ? 'text-emerald-600' : 'text-gray-400' : m.winner_team === 'B' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {isTeamA ? m.team_a_sets_won : m.team_b_sets_won}
                                                    </span>
                                                    <span className="text-gray-300">–</span>
                                                    <span className={`text-xl font-black ${isTeamA ? m.winner_team === 'B' ? 'text-emerald-600' : 'text-gray-400' : m.winner_team === 'A' ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {isTeamA ? m.team_b_sets_won : m.team_a_sets_won}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 font-bold text-sm">VS</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 text-right">
                                            {oppNames.map((p: any) => (
                                                <div key={p.id} className="flex items-center justify-end gap-1.5">
                                                    <span className="text-sm font-semibold text-gray-900 truncate">{p.full_name}</span>
                                                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-[11px] font-bold text-red-600 flex-shrink-0">
                                                        {p.full_name?.[0]?.toUpperCase()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {m.sets?.length > 0 && (
                                        <div className="flex gap-1.5 mt-3 flex-wrap">
                                            {[...m.sets].sort((a: any, b: any) => a.set_number - b.set_number).map((s: any) => {
                                                const myScore = isTeamA ? s.score_a : s.score_b;
                                                const oppScore = isTeamA ? s.score_b : s.score_a;
                                                const iWonSet = myScore > oppScore;
                                                return (
                                                    <span key={s.set_number} className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${iWonSet ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                        S{s.set_number}: {myScore}–{oppScore}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400">
                                            {m.played_at
                                                ? format(new Date(m.played_at), 'EEE dd/MM/yyyy', { locale: vi })
                                                : format(new Date(m.created_at), 'dd/MM/yyyy', { locale: vi })}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* ── Bottom sheet filter ── */}
            {sheetOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end"
                    style={{
                        background: sheetVisible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
                        backdropFilter: sheetVisible ? 'blur(2px)' : 'blur(0px)',
                        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeSheet(); }}
                >
                    <div
                        className="w-full bg-white rounded-t-2xl overflow-hidden"
                        style={{
                            maxWidth: 480,
                            margin: '0 auto',
                            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
                            transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-9 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* Sheet header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900">Lọc theo trạng thái</span>
                            <button
                                onClick={closeSheet}
                                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>

                        {/* Options */}
                        <div className="py-2">
                            {FILTER_OPTS.map((opt) => {
                                const isActive = tab === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => selectFilter(opt.value)}
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                                            <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {opt.label}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-gray-100">
                            <button
                                onClick={closeSheet}
                                className="w-full py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                Xong
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
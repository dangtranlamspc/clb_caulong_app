'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../lib/api';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

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
    opponents: PlayerInfo[];
    myTeam?: PlayerInfo[];
    matchType: 'singles' | 'doubles';
}

function shortName(p: any): string {
    return p?.full_name?.split(' ').pop() ?? p?.full_name ?? '?';
}

function toPlayerInfo(p: any): PlayerInfo {
    return {
        name: shortName(p),
        tier: p?.player_ranks?.tier ?? p?.rank_tier ?? p?.tier ?? undefined,
        avatar: p?.avatar_url ?? p?.avatar ?? null,
    };
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function buildResult(m: any, userId: string): MatchResult | null {
    const isTeamA = m.player_a1?.id === userId || m.player_a2?.id === userId;
    const isTeamB = m.player_b1?.id === userId || m.player_b2?.id === userId;
    if (!isTeamA && !isTeamB) return null;

    const myTeam = isTeamA ? 'A' : 'B';
    const myPlayers = isTeamA ? [m.player_a1, m.player_a2] : [m.player_b1, m.player_b2];
    const oppPlayers = isTeamA ? [m.player_b1, m.player_b2] : [m.player_a1, m.player_a2];

    return {
        matchId: m.id,
        isWinner: m.winner_team === myTeam,
        myScore: isTeamA ? (m.score_a ?? 0) : (m.score_b ?? 0),
        oppScore: isTeamA ? (m.score_b ?? 0) : (m.score_a ?? 0),
        opponents: oppPlayers.filter(Boolean).map(toPlayerInfo),
        myTeam: myPlayers.filter(Boolean).map(toPlayerInfo),
        matchType: m.match_type === 'doubles' ? 'doubles' : 'singles',
    };
}

export function useMatchResultNotification() {
    const { user, isAuthenticated } = useAuthStore();
    const userId = user?.id;
    const [current, setCurrent] = useState<MatchResult | null>(null);
    const pendingRef = useRef<MatchResult[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const pushResult = useCallback((result: MatchResult) => {
        if (pendingRef.current.some(r => r.matchId === result.matchId)) return;
        pendingRef.current.push(result);
        setCurrent(c => c ?? pendingRef.current[0]);
    }, []);

    const check = useCallback(async () => {
        if (!isAuthenticated || !userId) return;
        try {
            const { data } = await matchesApi.getUnseenResults();
            const rows: any[] = data ?? [];
            if (rows.length === 0) return;

            // BE đã order created_at desc -> rows[0] là mới nhất
            const [latestRow, ...rest] = rows;

            // Các trận cũ hơn: đánh dấu đã xem ngay, KHÔNG hiện modal,
            // tránh phải bấm "Tuyệt vời" liên tục cho backlog
            await Promise.allSettled(
                rest.map(r => matchesApi.markResultSeen(r.match_id))
            );

            const result = buildResult(latestRow.match, userId);
            if (result) pushResult(result);
        } catch { }
    }, [isAuthenticated, userId, pushResult]);

    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        check();

        const channel = supabase
            .channel(`match-result-notification:${userId}`)
            .on('broadcast', { event: 'match_result' }, async (payload) => {
                const matchId = payload.payload?.matchId;
                if (!matchId) return;
                try {
                    const { data } = await matchesApi.getOne(matchId);
                    const result = buildResult(data, userId);
                    if (result) pushResult(result);
                } catch { }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isAuthenticated, userId, check]);

    const dismiss = useCallback(() => {
        if (!current) return;
        matchesApi.markResultSeen(current.matchId).catch(() => { });
        pendingRef.current = pendingRef.current.filter(r => r.matchId !== current.matchId);
        setCurrent(pendingRef.current[0] ?? null);
    }, [current]);

    return { current, dismiss };
}
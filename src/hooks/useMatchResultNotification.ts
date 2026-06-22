'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../lib/api';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const SEEN_KEY = 'seen_match_results';

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

function getSeenIds(): Set<string> {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
}

function markSeen(id: string) {
    try {
        const seen = getSeenIds();
        seen.add(id);
        localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-100)));
    } catch { }
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

    const myPlayers = isTeamA
        ? [m.player_a1, m.player_a2]
        : [m.player_b1, m.player_b2];
    const oppPlayers = isTeamA
        ? [m.player_b1, m.player_b2]
        : [m.player_a1, m.player_a2];

    return {
        matchId: m.id,
        isWinner: m.winner_team === myTeam,
        myScore: isTeamA ? (m.team_a_sets_won ?? 0) : (m.team_b_sets_won ?? 0),
        oppScore: isTeamA ? (m.team_b_sets_won ?? 0) : (m.team_a_sets_won ?? 0),
        opponents: oppPlayers.filter(Boolean).map(toPlayerInfo),
        myTeam: myPlayers.filter(Boolean).map(toPlayerInfo),
        matchType: m.match_type === 'doubles' ? 'doubles' : 'singles',
    };
}

export function useMatchResultNotification() {
    const { user, isAuthenticated } = useAuthStore();
    const [pending, setPending] = useState<MatchResult[]>([]);
    const [current, setCurrent] = useState<MatchResult | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const pushResult = useCallback((result: MatchResult) => {
        const seen = getSeenIds();
        if (seen.has(result.matchId)) return;
        setPending(prev => {
            if (prev.some(r => r.matchId === result.matchId)) return prev;
            const next = [...prev, result];
            setCurrent(c => c ?? next[0]);
            return next;
        });
    }, []);

    const check = useCallback(async () => {
        if (!isAuthenticated || !user) return;
        try {
            const { data } = await matchesApi.list({ status: 'approved', limit: 20 });
            const matches: any[] = data.data ?? [];
            const seen = getSeenIds();
            for (const m of matches) {
                if (seen.has(m.id)) continue;
                const result = buildResult(m, user.id);
                if (result) pushResult(result);
            }
        } catch { }
    }, [isAuthenticated, user, pushResult]);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        check();

        const channel = supabase
            .channel(`match-result-notification:${user.id}`)
            .on(
                'broadcast',
                { event: 'match_result' },
                async (payload) => {
                    const matchId = payload.payload?.matchId;
                    if (!matchId) return;
                    try {
                        const { data } = await matchesApi.getOne(matchId);
                        const result = buildResult(data, user.id);
                        if (result) pushResult(result);
                    } catch { }
                },
            )
            .subscribe((status) => {
                // console.log('[Realtime] match_result channel status:', status);
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isAuthenticated, user?.id, check, pushResult]);

    const dismiss = useCallback(() => {
        if (!current) return;
        markSeen(current.matchId);
        setPending(prev => {
            const remaining = prev.filter(r => r.matchId !== current.matchId);
            setCurrent(remaining[0] ?? null);
            return remaining;
        });
    }, [current]);

    return { current, dismiss };
}
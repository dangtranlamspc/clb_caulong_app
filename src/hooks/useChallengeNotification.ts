'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../lib/api';
import toast from 'react-hot-toast';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const SEEN_CHALLENGES_KEY = 'seen_challenge_invites';

interface PlayerInfo {
    name: string;
    tier?: string;
    avatar?: string | null;
}

interface ChallengeInfo {
    matchId: string;
    challengers: PlayerInfo[];
    partners: PlayerInfo[];
    myTier?: string;
    myAvatar?: string | null;
    myName?: string;
    matchType: 'singles' | 'doubles';
    bestOf: number;
    note?: string;
}

function getSeenIds(): Set<string> {
    try {
        const raw = localStorage.getItem(SEEN_CHALLENGES_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
}

function markSeen(id: string) {
    try {
        const seen = getSeenIds();
        seen.add(id);
        localStorage.setItem(SEEN_CHALLENGES_KEY, JSON.stringify(Array.from(seen).slice(-100)));
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

function buildChallenge(m: any, currentUserId?: string): ChallengeInfo {
    const challengers = [m.player_a1, m.player_a2]
        .filter(Boolean)
        .map(toPlayerInfo);

    const partners = [m.player_b2]
        .filter(Boolean)
        .map(toPlayerInfo);

    const me = m.player_b1 ?? null;
    const myTier = me?.player_ranks?.tier ?? me?.rank_tier ?? me?.tier ?? undefined;
    const myAvatar = me?.avatar_url ?? me?.avatar ?? null;
    const myName = me ? shortName(me) : undefined;

    return {
        matchId: m.id,
        challengers,
        partners,
        myTier,
        myAvatar,
        myName,
        matchType: m.match_type === 'doubles' ? 'doubles' : 'singles',
        bestOf: m.best_of ?? 3,
        note: m.note ?? undefined,
    };
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function useChallengeNotification() {
    const { user, isAuthenticated } = useAuthStore();
    const [pending, setPending] = useState<ChallengeInfo[]>([]);
    const [current, setCurrent] = useState<ChallengeInfo | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const pushInvite = useCallback((invite: ChallengeInfo) => {
        const seen = getSeenIds();
        if (seen.has(invite.matchId)) return;
        setPending(prev => {
            if (prev.some(c => c.matchId === invite.matchId)) return prev;
            const next = [...prev, invite];
            setCurrent(c => c ?? next[0]);
            return next;
        });
    }, []);

    const check = useCallback(async () => {
        if (!isAuthenticated || !user) return;
        try {
            const { data } = await matchesApi.list({ status: 'pending_opponent', limit: 20 });
            const matches: any[] = data.data ?? [];
            const seen = getSeenIds();
            for (const m of matches) {
                if (seen.has(m.id)) continue;
                if (m.player_b1?.id !== user.id) continue;
                pushInvite(buildChallenge(m, user.id));
            }
        } catch { }
    }, [isAuthenticated, user, pushInvite]);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        check();

        const channel = supabase
            .channel(`challenge-notification:${user.id}`)
            .on(
                'broadcast',
                { event: 'new_challenge' },
                async (payload) => {
                    const matchId = payload.payload?.matchId;
                    if (!matchId) return;
                    try {
                        const { data } = await matchesApi.getOne(matchId);
                        pushInvite(buildChallenge(data, user.id));
                    } catch {
                        pushInvite({
                            matchId,
                            challengers: [{ name: 'Đối thủ' }],
                            partners: [],
                            matchType: 'singles',
                            bestOf: 3,
                        });
                    }
                },
            )
            .subscribe((status) => {
                // console.log('[Realtime] status:', status);
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isAuthenticated, user?.id, check, pushInvite]);

    const advance = useCallback((matchId: string) => {
        markSeen(matchId);
        setPending(prev => {
            const remaining = prev.filter(c => c.matchId !== matchId);
            setCurrent(remaining[0] ?? null);
            return remaining;
        });
    }, []);

    const handleAccept = useCallback(async (matchId: string) => {
        await matchesApi.accept(matchId);
        toast.success('Đã chấp nhận thách đấu! 🏸');
        advance(matchId);
    }, [advance]);

    const handleReject = useCallback(async (matchId: string) => {
        await matchesApi.decline(matchId);
        toast('Đã từ chối lời thách đấu.', { icon: '👋' });
        advance(matchId);
    }, [advance]);

    const dismiss = useCallback(() => {
        if (current) advance(current.matchId);
    }, [current, advance]);

    return { current, handleAccept, handleReject, dismiss };
}
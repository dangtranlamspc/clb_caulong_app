'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { matchesApi } from '../lib/api';
import toast from 'react-hot-toast';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const SEEN_KEY = 'seen_team_invites';

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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export interface TeamInviteInfo {
    matchId: string;
    creatorName: string;
    opponentName: string;
    matchType: 'singles' | 'doubles';
    bestOf: number;
    note?: string;
    team: 'A' | 'B';
}

function buildInvite(m: any, userId: string): TeamInviteInfo | null {
    const isTeamA = m.player_a2?.id === userId;
    const isTeamB = m.player_b2?.id === userId;
    if (!isTeamA && !isTeamB) return null;

    const creatorName = m.player_a1?.full_name?.split(' ').pop() ?? '?';
    const opponentName = m.player_b1?.full_name?.split(' ').pop() ?? '?';

    return {
        matchId: m.id,
        creatorName,
        opponentName,
        matchType: m.match_type === 'doubles' ? 'doubles' : 'singles',
        bestOf: m.best_of ?? 3,
        note: m.note ?? undefined,
        team: isTeamA ? 'A' : 'B',
    };
}

export function useTeamInviteNotification() {
    const { user, isAuthenticated } = useAuthStore();
    const [current, setCurrent] = useState<TeamInviteInfo | null>(null);
    const [pending, setPending] = useState<TeamInviteInfo[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const push = useCallback((invite: TeamInviteInfo) => {
        const seen = getSeenIds();
        if (seen.has(invite.matchId)) return;
        setPending(prev => {
            if (prev.some(i => i.matchId === invite.matchId)) return prev;
            const next = [...prev, invite];
            setCurrent(c => c ?? next[0]);
            return next;
        });
    }, []);

    const dismiss = useCallback(() => {
        setCurrent(prev => {
            if (!prev) return null;
            markSeen(prev.matchId);
            setPending(p => {
                const remaining = p.filter(i => i.matchId !== prev.matchId);
                setCurrent(remaining[0] ?? null);
                return remaining;
            });
            return null;
        });
    }, []);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const channel = supabase
            .channel(`challenge-notification:${user.id}`)
            .on('broadcast', { event: 'new_challenge_info' }, async (payload) => {
                const matchId = payload.payload?.matchId;
                if (!matchId) return;
                try {
                    const { data } = await matchesApi.getOne(matchId);
                    const invite = buildInvite(data, user.id);
                    if (invite) push(invite);
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
    }, [isAuthenticated, user?.id, push]);

    return { current, dismiss };
}
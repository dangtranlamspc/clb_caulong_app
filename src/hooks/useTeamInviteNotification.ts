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
    /** Tên các đồng đội cùng team (KHÔNG bao gồm chính mình), đã join bằng ' & ' */
    teamAName: string;
    teamBName: string;
    matchType: 'singles' | 'doubles' | 'triples';
    bestOf: number;
    note?: string;
    team: 'A' | 'B';
}

function shortName(p: any): string {
    return p?.full_name?.split(' ').pop() ?? p?.full_name ?? '?';
}

function buildInvite(m: any, userId: string): TeamInviteInfo | null {
    const isTeamA = m.player_a2?.id === userId || m.player_a3?.id === userId;
    const isTeamB = m.player_b2?.id === userId || m.player_b3?.id === userId;
    if (!isTeamA && !isTeamB) return null;

    const teamAName = [m.player_a1, m.player_a2, m.player_a3]
        .filter(p => p && p.id !== userId)
        .map(shortName)
        .join(' & ');

    const teamBName = [m.player_b1, m.player_b2, m.player_b3]
        .filter(p => p && p.id !== userId)
        .map(shortName)
        .join(' & ');

    let matchType: TeamInviteInfo['matchType'] = 'singles';
    if (m.match_type === 'triples') matchType = 'triples';
    else if (m.match_type === 'doubles') matchType = 'doubles';

    return {
        matchId: m.id,
        teamAName,
        teamBName,
        matchType,
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
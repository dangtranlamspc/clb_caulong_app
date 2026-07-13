import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type NotificationsRealtimeState = {
    lastNotification: any | null;
    channel: RealtimeChannel | null;
    connect: (userId: string) => void;
    disconnect: () => void;
};

export const useNotificationsRealtimeStore = create<NotificationsRealtimeState>((set, get) => ({
    lastNotification: null,
    channel: null,
    connect: (userId: string) => {
        if (get().channel) return;
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on('broadcast', { event: 'new_notification' }, ({ payload }) => {
                set({ lastNotification: payload });
            })
            .subscribe();
        set({ channel });
    },
    disconnect: () => {
        const ch = get().channel;
        if (ch) {
            supabase.removeChannel(ch);
            set({ channel: null });
        }
    },
}));
/**
 * Thay thế @supabase/supabase-js cho phần Realtime.
 *
 * Frontend chỉ dùng: supabase.channel(name).on(...).subscribe(), supabase.removeChannel(ch).
 * File này giữ nguyên các hàm đó nhưng nói chuyện với WebSocket của backend (/realtime)
 * thay vì Supabase Realtime, nên các component hiện có không cần sửa.
 *
 * Một kết nối WebSocket dùng chung cho mọi channel, tự kết nối lại và join lại khi mất mạng.
 * Mỗi lần (re)join thành công, callback subscribe((status)) nhận 'SUBSCRIBED'.
 */

export type ChannelStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';
export type SendResult = 'ok' | 'error' | 'timed out';

export interface PostgresChangesFilter {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema?: string;
    table: string;
    filter?: string;
}
export interface BroadcastFilter {
    event: string;
}
export interface BroadcastMessage {
    type: 'broadcast';
    event: string;
    payload: any;
}

type StatusCallback = (status: ChannelStatus, err?: Error) => void;

interface PgHandler {
    id: string;
    cfg: PostgresChangesFilter;
    cb: (payload: any) => void;
}
interface BroadcastHandler {
    cfg: BroadcastFilter;
    cb: (msg: BroadcastMessage) => void;
}

let refCounter = 0;

export class RealtimeChannel {
    readonly ref: string;
    private pgHandlers: PgHandler[] = [];
    private bcHandlers: BroadcastHandler[] = [];
    private statusCb?: StatusCallback;
    private subscribed = false;

    /** @internal */
    constructor(readonly topic: string, private readonly conn: Connection) {
        this.ref = `c${++refCounter}`;
    }

    on(type: 'postgres_changes', filter: PostgresChangesFilter, cb: (payload: any) => void): this;
    on(type: 'broadcast', filter: BroadcastFilter, cb: (msg: BroadcastMessage) => void): this;
    on(type: string, filter: any, cb: (arg: any) => void): this {
        if (type === 'postgres_changes') {
            this.pgHandlers.push({ id: `${this.ref}:${this.pgHandlers.length}`, cfg: filter, cb });
        } else if (type === 'broadcast') {
            this.bcHandlers.push({ cfg: filter, cb });
        }
        return this;
    }

    subscribe(cb?: StatusCallback): this {
        this.statusCb = cb;
        this.subscribed = true;
        this.conn.join(this);
        return this;
    }

    async unsubscribe(): Promise<'ok'> {
        if (this.subscribed) {
            this.subscribed = false;
            this.conn.leave(this);
        }
        return 'ok';
    }

    async send(msg: { type?: string; event: string; payload?: unknown }): Promise<SendResult> {
        return this.conn.sendBroadcast(this.topic, msg.event, msg.payload ?? {});
    }

    /** @internal */
    bindings() {
        return [
            ...this.pgHandlers.map((h) => ({
                id: h.id,
                type: 'postgres_changes',
                event: h.cfg.event,
                schema: h.cfg.schema ?? 'public',
                table: h.cfg.table,
                filter: h.cfg.filter,
            })),
            ...this.bcHandlers.map((h) => ({ type: 'broadcast', event: h.cfg.event })),
        ];
    }

    /** @internal */
    setStatus(status: ChannelStatus) {
        try {
            this.statusCb?.(status);
        } catch (e) {
            console.error('[realtime] subscribe callback lỗi:', e);
        }
    }

    /** @internal */
    dispatchPg(id: string, payload: any) {
        const h = this.pgHandlers.find((x) => x.id === id);
        if (!h) return;
        try {
            h.cb(payload);
        } catch (e) {
            console.error('[realtime] handler lỗi:', e);
        }
    }

    /** @internal */
    dispatchBroadcast(event: string, payload: any) {
        for (const h of this.bcHandlers) {
            if (h.cfg.event !== event && h.cfg.event !== '*') continue;
            try {
                h.cb({ type: 'broadcast', event, payload });
            } catch (e) {
                console.error('[realtime] handler lỗi:', e);
            }
        }
    }
}

function realtimeUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_REALTIME_URL;
    if (explicit) return explicit;
    const u = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/realtime';
    u.search = '';
    u.hash = '';
    return u.toString();
}

const PING_EVERY_MS = 25_000;
const DEAD_AFTER_MS = 60_000;
const IDLE_CLOSE_MS = 30_000;

class Connection {
    private ws: WebSocket | null = null;
    private open = false;
    private channels = new Map<string, RealtimeChannel>();
    private retry = 0;
    private reconnectTimer?: ReturnType<typeof setTimeout>;
    private idleTimer?: ReturnType<typeof setTimeout>;
    private pingTimer?: ReturnType<typeof setInterval>;
    private lastRecv = 0;
    private listening = false;

    channel(name: string) {
        return new RealtimeChannel(name, this);
    }

    getChannels() {
        return [...this.channels.values()];
    }

    join(ch: RealtimeChannel) {
        this.channels.set(ch.ref, ch);
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = undefined;
        }
        this.listenBrowserEvents();
        if (this.open) this.sendJoin(ch);
        else this.connect();
    }

    leave(ch: RealtimeChannel) {
        if (!this.channels.delete(ch.ref)) return;
        if (this.open) this.raw({ op: 'leave', ref: ch.ref });
        if (this.channels.size === 0 && !this.idleTimer) {
            this.idleTimer = setTimeout(() => {
                this.idleTimer = undefined;
                if (this.channels.size === 0) this.close();
            }, IDLE_CLOSE_MS);
        }
    }

    async sendBroadcast(topic: string, event: string, payload: unknown): Promise<SendResult> {
        if (!this.open) return 'error';
        this.raw({ op: 'broadcast', topic, event, payload });
        return 'ok';
    }

    // ------------------------------------------------------------------ internals

    private raw(data: unknown) {
        if (this.ws && this.open) this.ws.send(JSON.stringify(data));
    }

    private sendJoin(ch: RealtimeChannel) {
        this.raw({ op: 'join', ref: ch.ref, topic: ch.topic, bindings: ch.bindings() });
    }

    private connect() {
        if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return; // SSR
        if (this.ws) return; // đang kết nối hoặc đã mở
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        let ws: WebSocket;
        try {
            ws = new WebSocket(realtimeUrl());
        } catch (e) {
            console.error('[realtime] URL WebSocket không hợp lệ:', e);
            return;
        }
        this.ws = ws;

        ws.onopen = () => {
            this.open = true;
            this.retry = 0;
            this.lastRecv = Date.now();
            this.startPing();
            for (const ch of this.channels.values()) this.sendJoin(ch);
        };

        ws.onmessage = (ev) => {
            this.lastRecv = Date.now();
            let msg: any;
            try {
                msg = JSON.parse(String(ev.data));
            } catch {
                return;
            }
            const ch = msg.ref ? this.channels.get(msg.ref) : undefined;
            switch (msg.op) {
                case 'joined':
                    ch?.setStatus('SUBSCRIBED');
                    break;
                case 'pg':
                    ch?.dispatchPg(msg.id, msg.payload);
                    break;
                case 'broadcast':
                    ch?.dispatchBroadcast(msg.event, msg.payload);
                    break;
            }
        };

        const onDown = () => {
            if (this.ws !== ws) return; // socket cũ đã bị thay
            this.ws = null;
            this.open = false;
            this.stopPing();
            for (const ch of this.channels.values()) ch.setStatus('CLOSED');
            if (this.channels.size > 0) this.scheduleReconnect();
        };
        ws.onclose = onDown;
        ws.onerror = () => {
            try {
                ws.close();
            } catch {
                /* đã đóng */
            }
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        const delay = Math.min(1000 * 2 ** this.retry, 15_000) + Math.random() * 500;
        this.retry++;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
        }, delay);
    }

    private close() {
        this.stopPing();
        const ws = this.ws;
        this.ws = null;
        this.open = false;
        try {
            ws?.close();
        } catch {
            /* đã đóng */
        }
    }

    private startPing() {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            if (Date.now() - this.lastRecv > DEAD_AFTER_MS) {
                // Kết nối "chết" (ví dụ máy ngủ) -> đóng để kích hoạt kết nối lại
                try {
                    this.ws?.close();
                } catch {
                    /* ignore */
                }
                return;
            }
            this.raw({ op: 'ping' });
        }, PING_EVERY_MS);
    }

    private stopPing() {
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = undefined;
    }

    /** Có mạng lại / quay lại tab thì kết nối ngay thay vì chờ backoff. */
    private listenBrowserEvents() {
        if (this.listening || typeof window === 'undefined') return;
        this.listening = true;
        const wake = () => {
            if (this.channels.size === 0) return;
            if (!this.ws) {
                this.retry = 0;
                this.connect();
            } else if (this.open && Date.now() - this.lastRecv > DEAD_AFTER_MS / 2) {
                this.raw({ op: 'ping' });
            }
        };
        window.addEventListener('online', wake);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') wake();
        });
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __realtimeConnection: Connection | undefined;
}

// Giữ 1 kết nối duy nhất khi Next.js hot-reload ở môi trường dev
const connection = globalThis.__realtimeConnection ?? new Connection();
if (process.env.NODE_ENV !== 'production') {
    globalThis.__realtimeConnection = connection;
}

export const supabase = {
    channel(name: string) {
        return connection.channel(name);
    },
    async removeChannel(channel: RealtimeChannel): Promise<'ok'> {
        return channel.unsubscribe();
    },
    async removeAllChannels(): Promise<'ok'[]> {
        return Promise.all(connection.getChannels().map((c) => c.unsubscribe()));
    },
    getChannels() {
        return connection.getChannels();
    },
};

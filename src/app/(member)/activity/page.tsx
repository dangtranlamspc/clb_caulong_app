'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    CalendarDays, MapPin, Clock, ChevronRight, AlertCircle,
    CheckCircle2, Hourglass, Users, X, Zap, Plus,
    Swords, Clock3, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { sessionsApi, matchesApi } from '@/lib/api';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import { PaymentModal } from '@/components/PaymentModal';
import { MembersModal } from '@/components/MemberModalConponent';


type MainTab = 'sessions' | 'matches';


const SESSION_STATUS_CFG: Record<string, { label: string; dotCls: string }> = {
    open: { label: 'Mở đăng ký', dotCls: 'bg-emerald-400' },
    full: { label: 'Đã đầy', dotCls: 'bg-amber-400' },
    waiting_payment: { label: 'Đang chốt thanh toán', dotCls: 'bg-blue-400' },
    cancelled: { label: 'Đã hủy', dotCls: 'bg-red-400' },
    completed: { label: 'Hoàn thành', dotCls: 'bg-gray-400' },
};


const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
    awaiting_checkin: { label: 'Chờ điểm danh', icon: Hourglass, cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    pending: { label: 'Chờ thanh toán', icon: Hourglass, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending_review: { label: 'Chờ admin xác nhận', icon: Clock3, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    confirmed: { label: 'Đã xác nhận thanh toán', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Thanh toán bị từ chối', icon: AlertCircle, cls: 'bg-red-50 text-red-500 border-red-200' },
};

const SESSION_FILTER_TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'open', label: 'Mở', dot: 'bg-emerald-400' },
    { value: 'full', label: 'Đầy', dot: 'bg-amber-400' },
    { value: 'waiting_payment', label: 'Chờ TT', dot: 'bg-blue-400' },
    { value: 'completed', label: 'Xong', dot: 'bg-gray-400' },
];

const MATCH_STATUS_CFG: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
    pending_opponent: { label: 'Chờ đối thủ', icon: Hourglass, cls: 'text-gray-500', dot: 'bg-gray-400' },
    pending_result: { label: 'Chờ kết quả', icon: Clock3, cls: 'text-blue-600', dot: 'bg-blue-500' },
    pending_approval: { label: 'Chờ admin duyệt', icon: Hourglass, cls: 'text-amber-600', dot: 'bg-amber-400' },
    approved: { label: 'Đã duyệt', icon: CheckCircle2, cls: 'text-emerald-600', dot: 'bg-emerald-500' },
    rejected: { label: 'Từ chối', icon: X, cls: 'text-red-500', dot: 'bg-red-400' },
};

const MATCH_FILTER_OPTS = [
    { value: '', label: 'Tất cả trận', dot: 'bg-gray-400' },
    { value: 'pending_opponent', label: 'Chờ đối thủ', dot: 'bg-gray-400' },
    { value: 'pending_result', label: 'Đang diễn ra', dot: 'bg-blue-500' },
    { value: 'pending_approval', label: 'Chờ admin duyệt', dot: 'bg-amber-400' },
    { value: 'approved', label: 'Đã hoàn thành', dot: 'bg-emerald-500' },
    { value: 'rejected', label: 'Bị từ chối', dot: 'bg-red-400' },
];

const BLOCKING_STATUSES = ['pending_opponent', 'pending_result', 'pending_approval'];

function useFadeIn(trigger: boolean) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!trigger) { setVisible(false); return; }
        const t = setTimeout(() => setVisible(true), 30);
        return () => clearTimeout(t);
    }, [trigger]);
    return visible;
}

function SessionSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-4 overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
            <div className="flex justify-between mb-3">
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-100 rounded-lg w-3/5" />
                    <div className="h-3 bg-gray-100 rounded-lg w-2/5" />
                </div>
                <div className="h-5 w-16 bg-gray-100 rounded-lg ml-4" />
            </div>
            <div className="flex gap-4 mb-3">
                <div className="h-3 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full w-full mb-1" />
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-6" />
            </div>
        </div>
    );
}

function MatchSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-4 overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
            <div className="flex justify-between mb-3">
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100" />
                        <div className="h-3.5 bg-gray-100 rounded w-24" />
                    </div>
                </div>
                <div className="h-6 w-12 bg-gray-100 rounded" />
                <div className="flex-1 space-y-1.5 flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <div className="h-3.5 bg-gray-100 rounded w-24" />
                        <div className="w-7 h-7 rounded-full bg-gray-100" />
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t border-gray-50">
                <div className="h-3 bg-gray-100 rounded w-20" />
                <div className="h-3 bg-gray-100 rounded w-4" />
            </div>
        </div>
    );
}

function EnergyBar({ filled, max }: { filled: number; max: number }) {
    const ratio = max > 0 ? filled / max : 0;
    const color = ratio >= 1 ? '#ef4444' : ratio >= 0.6 ? '#f59e0b' : '#22c55e';
    return (
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(ratio * 100)}%`, background: color }} />
        </div>
    );
}

function energyTextCls(ratio: number) {
    if (ratio >= 1) return 'text-red-500 font-medium';
    if (ratio >= 0.6) return 'text-amber-500 font-medium';
    return 'text-emerald-600';
}



function SessionsTab() {
    const { user } = useAuthStore();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open');
    const [modalSession, setModalSession] = useState<{ id: string; title: string } | null>(null);
    const fadeIn = useFadeIn(!loading);
    const [pendingBills, setPendingBills] = useState<any[]>([]);
    const [payModalSession, setPayModalSession] = useState<any>(null);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 30 };
            if (filter && filter !== 'waiting_payment') params.status = filter;

            const { data } = await sessionsApi.list(params);
            let list = data.data ?? [];

            if (filter === 'waiting_payment') {
                list = list.filter((s: any) => s.my_registration?.payment_status === 'pending');
            }

            const sorted = [...list].sort((a: any, b: any) => {
                const aTime = new Date(a.created_at ?? a.scheduled_at).getTime();
                const bTime = new Date(b.created_at ?? b.scheduled_at).getTime();
                return bTime - aTime;
            });
            setSessions(sorted);
        } finally { setLoading(false); }
    }, [filter]);

    const fetchPendingBills = useCallback(async () => {
        try {
            const { data } = await sessionsApi.list({ limit: 50 });
            const bills = (data.data ?? []).filter(
                (s: any) =>
                    s.my_registration?.amount_override > 0 &&
                    s.my_registration?.payment_status === 'pending' &&
                    !s.my_registration?.payment_reference
            );
            setPendingBills(bills);
        } catch { }
    }, []);

    useEffect(() => { fetchPendingBills(); }, [fetchPendingBills]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`activity-realtime:${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `user_id=eq.${user.id}` },
                () => { fetchSessions(); fetchPendingBills(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' },
                () => { fetchSessions(); fetchPendingBills(); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, fetchSessions, fetchPendingBills]);

    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {SESSION_FILTER_TABS.map(({ value, label, dot }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${filter === value ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 scale-105' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
                    >
                        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                        {label}
                    </button>
                ))}
            </div>

            {pendingBills.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-500 flex items-center gap-1">
                        💳 Cần thanh toán ({pendingBills.length})
                    </p>
                    {pendingBills.map(s => (
                        <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-4 py-3 active:bg-red-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {format(new Date(s.scheduled_at), 'EEE dd/MM', { locale: vi })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-sm font-bold text-red-600">
                                        {s.my_registration.amount_override.toLocaleString('vi-VN')}đ
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-red-400" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <div className="space-y-4" style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} style={{ animationDelay: `${i * 60}ms`, animation: 'fadeSlideUp .3s ease both' }}>
                            <SessionSkeleton />
                        </div>
                    ))
                ) : sessions.length === 0 ? (
                    <div className="bg-white rounded-2xl py-14 text-center" style={{ animation: 'fadeSlideUp .3s ease both' }}>
                        <CalendarDays className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">Không có buổi đánh nào</p>
                    </div>
                ) : (
                    sessions.map((s, idx) => {
                        const cfg = SESSION_STATUS_CFG[s.status] ?? SESSION_STATUS_CFG.open;
                        const myReg = s.my_registration;
                        const effectiveStatus = myReg?.participation_status === 'awaiting_checkin'
                            ? 'awaiting_checkin'
                            : myReg?.payment_status === 'pending' && myReg?.payment_reference
                                ? 'pending_review'
                                : myReg?.payment_status;
                        const regCfg = effectiveStatus ? (REG_CFG[effectiveStatus] ?? REG_CFG.pending) : null;
                        const RegIcon = regCfg?.icon;
                        const filled = (s.max_slots ?? 0) - (s.available_slots ?? 0);
                        const ratio = s.max_slots > 0 ? filled / s.max_slots : 0;
                        const isFull = s.available_slots <= 0;
                        const canRegister = s.status === 'open' && !isFull && !myReg;
                        const priceDisplay = (() => {
                            if (s.price_male && s.price_female) {
                                const g = user?.gender;
                                if (g === 'male') return { text: `${s.price_male.toLocaleString('vi-VN')}đ`, sub: '(Nam)' };
                                if (g === 'female') return { text: `${s.price_female.toLocaleString('vi-VN')}đ`, sub: '(Nữ)' };
                                return { text: `${s.price_male.toLocaleString('vi-VN')}đ / ${s.price_female.toLocaleString('vi-VN')}đ`, sub: 'Nam / Nữ' };
                            }
                            return { text: `${(s.price_per_slot ?? 0).toLocaleString('vi-VN')}đ`, sub: '/slot' };
                        })();

                        return (
                            <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                                <div
                                    className={`bg-white rounded-2xl p-4 border transition-all active:scale-[0.99] ${myReg ? 'border-blue-100' : 'border-transparent'}`}
                                    style={{ animation: 'fadeSlideUp .35s ease both', animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 leading-tight truncate">{s.title}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
                                                <span className="text-xs text-gray-500">{cfg.label}</span>
                                            </div>
                                        </div>
                                        {/* <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-blue-600 text-sm">{priceDisplay.text}</p>
                                            <p className="text-[10px] text-gray-400">{priceDisplay.sub}</p>
                                        </div> */}

                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                                        <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{format(new Date(s.scheduled_at), 'EEE dd/MM, HH:mm', { locale: vi })}</span>
                                        {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /><span className="truncate max-w-[120px]">{s.location}</span></span>}
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.duration_minutes} phút</span>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="flex items-center gap-1 text-xs text-gray-400"><Zap className="w-3 h-3" />Chỗ trống</span>
                                            <span className={`text-xs ${energyTextCls(ratio)}`}>{isFull ? 'Hết chỗ' : `Còn ${s.available_slots} / ${s.max_slots}`}</span>
                                        </div>
                                        <EnergyBar filled={filled} max={s.max_slots} />
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            {myReg && regCfg ? (
                                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${regCfg.cls}`}>
                                                    <RegIcon className="w-3.5 h-3.5" />{regCfg.label}
                                                </span>
                                            ) : canRegister ? (
                                                <span className="text-xs text-blue-600 font-medium">Nhấn để đăng ký →</span>
                                            ) : isFull ? (
                                                <span className="text-xs text-gray-400">Đã hết chỗ</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">{cfg.label}</span>
                                            )}
                                            <button
                                                onClick={e => { e.preventDefault(); e.stopPropagation(); setModalSession({ id: s.id, title: s.title }); }}
                                                className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 active:bg-gray-100 transition-colors"
                                            >
                                                <Users className="w-3.5 h-3.5" />{filled} người
                                            </button>
                                            {myReg && myReg.amount_override > 0 && myReg.payment_status === 'pending'
                                                && !myReg.payment_reference && myReg.participation_status === 'confirmed' && (
                                                    <button
                                                        onClick={e => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setPayModalSession({ session: s, reg: myReg });
                                                        }}
                                                        className="flex items-center gap-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-full animate-pulse"
                                                    >
                                                        💳 Thanh toán {myReg.amount_override.toLocaleString('vi-VN')}đ
                                                    </button>
                                                )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {modalSession && (
                <MembersModal
                    sessionId={modalSession.id}
                    sessionTitle={modalSession.title}
                    onClose={() => setModalSession(null)}
                />
            )}

            {payModalSession && (
                <PaymentModal
                    session={payModalSession.session}
                    reg={payModalSession.reg}
                    userFullName={user?.full_name ?? ''}
                    onClose={() => setPayModalSession(null)}
                    onSuccess={() => {
                        setPayModalSession(null);
                        setTimeout(() => {
                            fetchSessions();
                            fetchPendingBills();
                        }, 300);
                    }}
                />
            )}
        </div>
    );
}

function MatchesTab({ onActiveMatchChange }: { onActiveMatchChange: (m: any) => void }) {
    const { user } = useAuthStore();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [activeMatch, setActiveMatch] = useState<any>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const fadeIn = useFadeIn(!loading);

    const openSheet = () => { setSheetOpen(true); requestAnimationFrame(() => requestAnimationFrame(() => setSheetVisible(true))); };
    const closeSheet = () => { setSheetVisible(false); setTimeout(() => setSheetOpen(false), 300); };

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 30 };
            if (filter) params.status = filter;
            const { data } = await matchesApi.list(params);
            const list = data.data ?? [];
            setMatches(list);

            const { data: allData } = await matchesApi.list({ limit: 50 });
            const allList = allData.data ?? [];
            const active = allList.find((m: any) => BLOCKING_STATUSES.includes(m.status)) ?? null;
            setActiveMatch(active);
            onActiveMatchChange(active);
        } finally { setLoading(false); }
    }, [filter, onActiveMatchChange]);

    const fetchMatchesRef = useRef<() => Promise<void>>(async () => { });
    useEffect(() => { fetchMatchesRef.current = fetchMatches }, [fetchMatches]);
    useEffect(() => { fetchMatches(); }, [fetchMatches]);

    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`matches-list:${user.id}`)
            .on('broadcast', { event: 'match_result' }, () => { fetchMatchesRef.current(); })
            .on('broadcast', { event: 'new_challenge' }, () => { fetchMatchesRef.current(); })
            .on('broadcast', { event: 'match_status_changed' }, () => { fetchMatchesRef.current(); })
            .on('broadcast', { event: 'admin_match_created' }, () => { fetchMatchesRef.current(); })
            .subscribe();
        channelRef.current = channel;
        return () => {
            if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
        };
    }, [user?.id]);

    useEffect(() => { document.body.style.overflow = sheetOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [sheetOpen]);

    const activeOpt = MATCH_FILTER_OPTS.find(o => o.value === filter) ?? MATCH_FILTER_OPTS[0];

    return (
        <div className="space-y-4">
            <button
                type="button" onClick={openSheet}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:border-gray-300 active:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">{activeOpt.label}</span>
                    {filter && <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">Đang lọc</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">Lọc <ChevronDown className="w-3.5 h-3.5" /></div>
            </button>

            {activeMatch && (
                <Link href={`/matches/${activeMatch.id}`}>
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 active:bg-amber-100 transition-colors"
                        style={{ animation: 'fadeSlideUp .3s ease both' }}>
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Clock3 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-800">Có trận chưa hoàn thành</p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                {MATCH_STATUS_CFG[activeMatch.status]?.label} · Nhấp vào để thêm tỉ số
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    </div>
                </Link>
            )}

            <div className="space-y-4" style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.3s ease' }}>
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} style={{ animation: 'fadeSlideUp .3s ease both', animationDelay: `${i * 60}ms` }}>
                            <MatchSkeleton />
                        </div>
                    ))
                ) : matches.length === 0 ? (
                    <div className="bg-white rounded-2xl py-14 text-center border border-dashed border-gray-200" style={{ animation: 'fadeSlideUp .3s ease both' }}>
                        <Swords className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">Chưa có trận nào</p>
                        <Link href="/matches/create">
                            <span className="inline-block mt-3 text-xs text-blue-600 font-semibold bg-blue-50 px-4 py-2 rounded-full">Thách đấu ngay →</span>
                        </Link>
                    </div>
                ) : (
                    matches.map((m, idx) => {
                        const cfg = MATCH_STATUS_CFG[m.status] ?? MATCH_STATUS_CFG.pending_opponent;
                        const isTeamA = m.player_a1?.id === user?.id || m.player_a2?.id === user?.id;
                        const myTeam = isTeamA ? 'A' : 'B';
                        const iWon = m.status === 'approved' && m.winner_team === myTeam;
                        const iLost = m.status === 'approved' && m.winner_team && m.winner_team !== myTeam;
                        const myNames = isTeamA ? [m.player_a1, m.player_a2].filter(Boolean) : [m.player_b1, m.player_b2].filter(Boolean);
                        const oppNames = isTeamA ? [m.player_b1, m.player_b2].filter(Boolean) : [m.player_a1, m.player_a2].filter(Boolean);
                        const isPendingMe = m.status === 'pending_opponent' && m.player_b1?.id === user?.id;

                        return (
                            <Link key={m.id} href={`/matches/${m.id}`} className='block mb-1'>
                                <div
                                    className={`bg-white rounded-2xl p-4 shadow border transition-all active:scale-[0.99] ${isPendingMe ? 'border-blue-200 border-[1.5px]' : 'border-gray-100'}`}
                                    style={{ animation: 'fadeSlideUp .35s ease both', animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                            <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                                            {isPendingMe && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">Bạn được mời!</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                                {m.match_type === 'doubles' ? '👥 Đôi' : '👤 Đơn'} · 1 set
                                            </span>
                                            {iWon && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">🏆 Thắng</span>}
                                            {iLost && <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Thua</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            {myNames.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-1.5">
                                                    {p.avatar_url ? (
                                                        <img src={p.avatar_url} alt={p.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 mb-2" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-700 flex-shrink-0 mb-2">
                                                            {p.full_name?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-semibold text-gray-900 leading-tight break-words">{p.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex-shrink-0 text-center">
                                            {(m.status === 'approved' || m.status === 'pending_approval') && m.sets?.length > 0 ? (() => {
                                                const s = m.sets[0];
                                                const myScore = isTeamA ? s.score_a : s.score_b;
                                                const oppScore = isTeamA ? s.score_b : s.score_a;
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-xl font-black ${iWon ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                            {myScore}
                                                        </span>
                                                        <span className="text-gray-300">–</span>
                                                        <span className={`text-xl font-black ${iLost ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                            {oppScore}
                                                        </span>
                                                    </div>
                                                );
                                            })() : (
                                                <span className="text-gray-300 font-bold text-sm">VS</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-right">
                                            {oppNames.map((p: any) => (
                                                <div key={p.id} className="flex items-center justify-end gap-1.5">
                                                    <span className="text-xs font-semibold text-gray-900 leading-tight break-words text-right">{p.full_name}</span>
                                                    {p.avatar_url ? (
                                                        <img src={p.avatar_url} alt={p.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 mb-2" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-[11px] font-bold text-red-600 flex-shrink-0 mb-2">
                                                            {p.full_name?.[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                        <span className="text-[10px] text-gray-400">
                                            {m.played_at ? format(new Date(m.played_at), 'EEE dd/MM/yyyy', { locale: vi }) : format(new Date(m.created_at), 'dd/MM/yyyy', { locale: vi })}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {sheetOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex flex-col justify-end"
                    style={{
                        background: sheetVisible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                        backdropFilter: sheetVisible ? 'blur(2px)' : 'none',
                        transition: 'background .3s, backdrop-filter .3s',
                    }}
                    onClick={e => e.target === e.currentTarget && closeSheet()}
                >
                    <div
                        className="w-full bg-white rounded-t-2xl"
                        style={{
                            maxWidth: 480,
                            margin: '0 auto',
                            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
                            transition: 'transform .3s cubic-bezier(0.32,0.72,0,1)',
                            paddingBottom: 'env(safe-area-inset-bottom)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-9 h-1 bg-gray-200 rounded-full" />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-900">Lọc theo trạng thái</span>
                            <button onClick={closeSheet} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <X className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                        </div>
                        <div className="py-2">
                            {MATCH_FILTER_OPTS.map(opt => {
                                const isActive = filter === opt.value;
                                return (
                                    <button key={opt.value} type="button"
                                        onClick={() => { setFilter(opt.value); closeSheet(); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                                            <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{opt.label}</span>
                                        </div>
                                        {isActive && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-4 pt-3 pb-8 border-t border-gray-100">
                            <button onClick={closeSheet} className="w-full py-2.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700">
                                Xong
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function ActivityPage() {
    const [tab, setTab] = useState<MainTab>('sessions');
    const [tabVisible, setTabVisible] = useState(true);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: '4px', width: 'calc(50% - 4px)' });
    const tabRef = useRef<MainTab>('sessions');
    const [activeMatch, setActiveMatch] = useState<any>(null);

    const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const switchTab = (next: MainTab) => {
        if (next === tabRef.current) return;
        if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
        setTabVisible(false);
        setIndicatorStyle({
            left: next === 'sessions' ? '4px' : 'calc(50%)',
            width: 'calc(50% - 4px)',
        });
        switchTimerRef.current = setTimeout(() => {
            tabRef.current = next;
            setTab(next);
            setTabVisible(true);
            switchTimerRef.current = null;
        }, 150);
    };

    useEffect(() => {
        const remembered = sessionStorage.getItem('activity:return-tab');
        if (remembered === 'matches') {
            sessionStorage.removeItem('activity:return-tab');
            tabRef.current = 'matches';
            setTab('matches');
            setIndicatorStyle({ left: 'calc(50%)', width: 'calc(50% - 4px)' });
        }
    }, []);

    useEffect(() => { tabRef.current = tab; }, [tab]);

    useEffect(() => {
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0);    }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(200%); }
                }
            `}</style>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div style={{ transition: 'opacity .2s', opacity: tabVisible ? 1 : 0 }}>
                        <h1 className="text-xl font-bold text-gray-900">
                            {tab === 'sessions' ? 'Buổi đánh cầu' : 'Trận giao hữu'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {tab === 'sessions' ? 'Chọn buổi và đăng ký tham gia' : 'Tạo và theo dõi trận đấu của bạn'}
                        </p>
                    </div>

                    <div style={{
                        transition: 'opacity .2s, transform .2s',
                        opacity: tab === 'matches' && tabVisible ? 1 : 0,
                        transform: tab === 'matches' ? 'scale(1)' : 'scale(0.85)',
                        pointerEvents: tab === 'matches' ? 'auto' : 'none',
                    }}>
                        <Link href="/matches/create">
                            <div className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-blue-200 active:scale-95 transition-transform">
                                <Plus className="w-4 h-4" /> Tạo trận
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="relative flex bg-gray-100 rounded-2xl p-1">
                    <div
                        className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm"
                        style={{ ...indicatorStyle, transition: 'left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1)' }}
                    />
                    <button
                        onClick={() => switchTab('sessions')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10 ${tab === 'sessions' ? 'text-blue-600' : 'text-gray-500'}`}
                    >
                        <CalendarDays className="w-4 h-4" /> Buổi đánh
                    </button>
                    <button
                        onClick={() => switchTab('matches')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 z-10 ${tab === 'matches' ? 'text-blue-600' : 'text-gray-500'}`}
                    >
                        <Swords className="w-4 h-4" />
                        Giao hữu
                        {activeMatch && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-6" />
                        )}
                    </button>
                </div>

                <div style={{
                    opacity: tabVisible ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                }}>
                    {tab === 'sessions'
                        ? <SessionsTab />
                        : <MatchesTab onActiveMatchChange={setActiveMatch} />
                    }
                </div>
            </div>
        </>
    );
}
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    CalendarDays, MapPin, Clock,
    ChevronRight, AlertCircle, CheckCircle2, Hourglass,
    Users, X, Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { sessionsApi, registrationsApi } from '@/lib/api';

const STATUS_CFG: Record<string, { label: string; dotCls: string }> = {
    open: { label: 'Mở đăng ký', dotCls: 'bg-emerald-400' },
    full: { label: 'Đã đầy', dotCls: 'bg-amber-400' },
    cancelled: { label: 'Đã hủy', dotCls: 'bg-red-400' },
    completed: { label: 'Hoàn thành', dotCls: 'bg-gray-400' },
};

const REG_CFG: Record<string, { label: string; icon: any; cls: string }> = {
    pending: { label: 'Chờ xác nhận', icon: Hourglass, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    confirmed: { label: 'Đã xác nhận', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Từ chối', icon: AlertCircle, cls: 'bg-red-50 text-red-500 border-red-200' },
};

const FILTER_TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'open', label: 'Mở' },
    { value: 'full', label: 'Đầy' },
    { value: 'completed', label: 'Xong' },
];

const TAB_DOT: Record<string, string> = {
    open: 'bg-emerald-400',
    full: 'bg-amber-400',
    completed: 'bg-gray-400',
};

function EnergyBar({ filled, max }: { filled: number; max: number }) {
    const ratio = max > 0 ? filled / max : 0;
    const pct = Math.round(ratio * 100);
    const color =
        ratio >= 1 ? '#ef4444' :
            ratio >= 0.6 ? '#f59e0b' :
                '#22c55e';
    return (
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: color }}
            />
        </div>
    );
}

function energyTextCls(ratio: number) {
    if (ratio >= 1) return 'text-red-500 font-medium';
    if (ratio >= 0.6) return 'text-amber-500 font-medium';
    return 'text-emerald-600';
}

interface MembersModalProps {
    sessionId: number;
    sessionTitle: string;
    onClose: () => void;
}

function MembersModal({ sessionId, sessionTitle, onClose }: MembersModalProps) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        registrationsApi.listBySession(sessionId)
            .then(({ data }) => setMembers(data.data ?? []))
            .finally(() => setLoading(false));
    }, [sessionId]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-md bg-white rounded-t-2xl overflow-hidden animate-slide-up">
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-gray-200" />
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Thành viên đăng ký</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">{sessionTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[55vh] px-4 pb-6">
                    {loading ? (
                        <div className="space-y-3 pt-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-9 h-9 rounded-full bg-gray-100" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                                        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : members.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">Chưa có thành viên nào</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 pt-1">
                            {members.map((m) => {
                                const user = m.users;
                                const fullName = user?.full_name ?? '?';
                                const gender = user?.gender;
                                const avatar = user?.avatar_url;

                                const parts = fullName.trim().split(' ').filter(Boolean);
                                const initials = parts.length >= 2
                                    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                                    : fullName.slice(0, 2).toUpperCase();

                                const regCfg = REG_CFG[m.payment_status] ?? REG_CFG.pending;
                                const RegIcon = regCfg.icon;

                                return (
                                    <li key={m.id} className="flex items-center gap-3 py-3">
                                        {/* Avatar: ảnh nếu có, fallback initials */}
                                        {avatar ? (
                                            <img
                                                src={avatar}
                                                alt={fullName}
                                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                {initials}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {fullName}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : ''}
                                            </p>
                                        </div>

                                        <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${regCfg.cls}`}>
                                            <RegIcon className="w-3 h-3" />
                                            {regCfg.label}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SessionsPage() {
    const { user } = useAuthStore();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open');
    const [modalSession, setModalSession] = useState<{ id: number; title: string } | null>(null);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 30 };
            if (filter) params.status = filter;
            const { data } = await sessionsApi.list(params);
            setSessions(data.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-gray-900">Buổi đánh cầu</h1>
                <p className="text-sm text-gray-500 mt-0.5">Chọn buổi và đăng ký tham gia</p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILTER_TABS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === value
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'bg-white text-gray-500 border border-gray-200'
                            }`}
                    >
                        {TAB_DOT[value] && (
                            <span className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[value]}`} />
                        )}
                        {label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                            <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                            <div className="h-2 bg-gray-100 rounded w-full mb-1" />
                        </div>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <CalendarDays className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Không có buổi đánh nào</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((s) => {
                        const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.open;
                        const myReg = s.my_registration;
                        const regCfg = myReg ? REG_CFG[myReg.payment_status] : null;
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
                            <Link key={s.id} href={`/sessions/${s.id}`}>
                                <div className={`bg-white rounded-2xl p-4 border transition-all active:scale-[0.99] ${myReg ? 'border-blue-100' : 'border-transparent'
                                    }`}>
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 leading-tight truncate">{s.title}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
                                                <span className="text-xs text-gray-500">{cfg.label}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-blue-600 text-sm">{priceDisplay.text}</p>
                                            <p className="text-[10px] text-gray-400">{priceDisplay.sub}</p>
                                        </div>
                                    </div>

                                    {/* Info row */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            {format(new Date(s.scheduled_at), 'EEE dd/MM, HH:mm', { locale: vi })}
                                        </span>
                                        {s.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[120px]">{s.location}</span>
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {s.duration_minutes} phút
                                        </span>
                                    </div>

                                    {/* Energy bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="flex items-center gap-1 text-xs text-gray-400">
                                                <Zap className="w-3 h-3" />
                                                Chỗ trống
                                            </span>
                                            <span className={`text-xs ${energyTextCls(ratio)}`}>
                                                {isFull ? 'Hết chỗ' : `Còn ${s.available_slots} / ${s.max_slots}`}
                                            </span>
                                        </div>
                                        <EnergyBar filled={filled} max={s.max_slots} />
                                    </div>

                                    {/* Bottom row */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            {myReg && regCfg ? (
                                                <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${regCfg.cls}`}>
                                                    <RegIcon className="w-3.5 h-3.5" />
                                                    {regCfg.label}
                                                </span>
                                            ) : canRegister ? (
                                                <span className="text-xs text-blue-600 font-medium">Nhấn để đăng ký →</span>
                                            ) : isFull ? (
                                                <span className="text-xs text-gray-400">Đã hết chỗ</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">{cfg.label}</span>
                                            )}

                                            {/* Members button */}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setModalSession({ id: s.id, title: s.title });
                                                }}
                                                className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 active:bg-gray-100 transition-colors"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                {filled} người
                                            </button>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Members modal */}
            {modalSession && (
                <MembersModal
                    sessionId={modalSession.id}
                    sessionTitle={modalSession.title}
                    onClose={() => setModalSession(null)}
                />
            )}
        </div>
    );
}
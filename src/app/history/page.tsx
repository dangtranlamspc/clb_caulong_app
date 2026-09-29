'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    CheckCircle2, Hourglass, AlertCircle, XCircle,
    CalendarDays, ChevronRight, Trophy, ArrowLeft,
} from 'lucide-react';
import { registrationsApi } from '@/lib/api';

const STATUS_CFG: Record<
    string,
    { label: string; icon: any; pill: string; stripe: string; iconBg: string }
> = {
    pending: {
        label: 'Chờ xác nhận',
        icon: Hourglass,
        pill: 'bg-amber-50 text-amber-700',
        stripe: 'bg-amber-400',
        iconBg: 'bg-amber-50 text-amber-500',
    },
    confirmed: {
        label: 'Đã xác nhận',
        icon: CheckCircle2,
        pill: 'bg-emerald-50 text-emerald-700',
        stripe: 'bg-emerald-500',
        iconBg: 'bg-emerald-50 text-emerald-600',
    },
    rejected: {
        label: 'Từ chối',
        icon: AlertCircle,
        pill: 'bg-red-50 text-red-600',
        stripe: 'bg-red-400',
        iconBg: 'bg-red-50 text-red-500',
    },
    refunded: {
        label: 'Hoàn tiền',
        icon: XCircle,
        pill: 'bg-gray-100 text-gray-500',
        stripe: 'bg-gray-300',
        iconBg: 'bg-gray-100 text-gray-500',
    },
};

const TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'rejected', label: 'Từ chối' },
];

const SHUTTLE_ICON =
    'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png';

export default function HistoryPage() {
    const router = useRouter();
    const [regs, setRegs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('');
    const [totalPoints, setTotal] = useState(0);

    const fetchRegs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (tab) params.payment_status = tab;
            const { data } = await registrationsApi.getMyRegistrations(params);
            const list = data.data ?? [];
            setRegs(list);
            setTotal(
                list.filter((r: any) => r.payment_status === 'confirmed' && r.points_awarded).length,
            );
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchRegs(); }, [fetchRegs]);

    // Gom theo tháng
    const groups = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const r of regs) {
            const d = r.sessions?.scheduled_at ? new Date(r.sessions.scheduled_at) : null;
            const key = d ? format(d, 'yyyy-MM') : 'unknown';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(r);
        }
        return Array.from(map.entries()).map(([key, items]) => ({
            key,
            label:
                key === 'unknown'
                    ? 'Không rõ ngày'
                    : `Tháng ${format(new Date(`${key}-01`), 'M/yyyy')}`,
            items,
        }));
    }, [regs]);

    return (
        <div className="min-h-screen bg-[#F4F6FA] pb-8">
            {/* Header */}
            <div
                className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100/80 px-4 pb-3 flex items-center gap-3"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
            >
                <button
                    onClick={() => router.back()}
                    className="w-9 h-9 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-base font-bold text-gray-900 leading-tight">Lịch sử đăng ký</h1>
                    <p className="text-xs text-gray-400">Các buổi bạn đã tham gia</p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
                {/* Points summary */}
                {!tab && (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-teal-500 p-5 text-white shadow-lg shadow-blue-200/60">
                        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
                        <div className="absolute right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white/80 text-xs">Tổng cầu lông tích lũy</p>
                                <p className="text-3xl font-black flex items-center gap-1.5 leading-tight">
                                    {totalPoints}
                                    <img
                                        src={SHUTTLE_ICON}
                                        alt="cầu lông"
                                        className="w-8 h-8 object-contain"
                                        style={{ mixBlendMode: 'screen' }}
                                    />
                                </p>
                                <p className="text-white/70 text-xs">từ các buổi đã xác nhận thanh toán</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs (segmented) */}
                <div className="flex gap-1 p-1 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
                    {TABS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setTab(value)}
                            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-xl text-sm font-semibold transition-all ${tab === value
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3">
                                <div className="w-12 h-14 rounded-xl bg-gray-100" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-5 bg-gray-100 rounded-full w-24" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : regs.length === 0 ? (
                    <div className="bg-white rounded-3xl py-14 text-center shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                            <CalendarDays className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Chưa có lịch sử đăng ký</p>
                        <p className="text-gray-400 text-xs mt-1">Các buổi bạn đăng ký sẽ hiện ở đây</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groups.map((group) => (
                            <section key={group.key} className="space-y-2.5">
                                <h2 className="px-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    {group.label}
                                </h2>

                                {group.items.map((reg) => {
                                    const cfg = STATUS_CFG[reg.payment_status] ?? STATUS_CFG.pending;
                                    const Icon = cfg.icon;
                                    const sess = reg.sessions;
                                    const d = sess?.scheduled_at ? new Date(sess.scheduled_at) : null;

                                    return (
                                        <Link key={reg.id} href={`/sessions/${sess?.id}`} className="block">
                                            <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.99] transition-all hover:border-blue-100">
                                                {/* Vạch màu trạng thái */}
                                                <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.stripe}`} />

                                                <div className="flex items-center gap-3 pl-5 pr-3 py-3.5">
                                                    {/* Khối ngày */}
                                                    <div className="w-12 flex-shrink-0 rounded-xl bg-gray-50 py-1.5 text-center">
                                                        {d ? (
                                                            <>
                                                                <p className="text-lg font-black text-gray-900 leading-none">
                                                                    {format(d, 'dd')}
                                                                </p>
                                                                <p className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">
                                                                    {format(d, 'MMM', { locale: vi })}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <CalendarDays className="w-5 h-5 mx-auto text-gray-300" />
                                                        )}
                                                    </div>

                                                    {/* Nội dung */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate text-sm">
                                                            {sess?.title ?? 'Buổi đánh'}
                                                        </p>
                                                        {d && (
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {format(d, 'EEEE · HH:mm', { locale: vi })}
                                                            </p>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            <span
                                                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.pill}`}
                                                            >
                                                                <Icon className="w-3 h-3" />
                                                                {cfg.label}
                                                            </span>
                                                            {reg.points_awarded && (
                                                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                                                    +1
                                                                    <img
                                                                        src={SHUTTLE_ICON}
                                                                        alt="cầu lông"
                                                                        className="w-4 h-4 object-contain"
                                                                        style={{ mixBlendMode: 'multiply' }}
                                                                    />
                                                                </span>
                                                            )}
                                                        </div>

                                                        {reg.payment_reference && (
                                                            <p className="text-[10px] font-mono text-gray-400 mt-1.5 bg-gray-50 px-2 py-0.5 rounded-lg inline-block max-w-full truncate">
                                                                Mã: {reg.payment_reference}
                                                            </p>
                                                        )}

                                                        {reg.payment_status === 'pending' &&
                                                            !reg.payment_reference &&
                                                            reg.qr_url && (
                                                                <p className="text-xs text-blue-500 mt-1.5 font-medium">
                                                                    ⚠️ Chưa gửi mã — nhấn để thanh toán
                                                                </p>
                                                            )}
                                                    </div>

                                                    {/* Giá + mũi tên */}
                                                    <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                                                        {sess?.price_per_slot > 0 ? (
                                                            <span className="text-sm font-bold text-gray-800 tabular-nums">
                                                                {sess.price_per_slot.toLocaleString('vi-VN')}đ
                                                            </span>
                                                        ) : (
                                                            <span />
                                                        )}
                                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
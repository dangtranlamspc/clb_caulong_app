'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { vi } from 'date-fns/locale';
import {
    CheckCircle2, Hourglass, AlertCircle, XCircle,
    CalendarDays, ChevronRight, Trophy,
    ArrowLeft,
} from 'lucide-react';
import { registrationsApi } from '../../../lib/api';

const STATUS_CFG: Record<string, { label: string; icon: any; cls: string; dot: string }> = {
    pending: { label: 'Chờ xác nhận', icon: Hourglass, cls: 'text-amber-600', dot: 'bg-amber-400' },
    confirmed: { label: 'Đã xác nhận', icon: CheckCircle2, cls: 'text-emerald-600', dot: 'bg-emerald-400' },
    rejected: { label: 'Từ chối', icon: AlertCircle, cls: 'text-red-500', dot: 'bg-red-400' },
    refunded: { label: 'Hoàn tiền', icon: XCircle, cls: 'text-gray-500', dot: 'bg-gray-400' },
};

const TABS = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: '⏳ Chờ' },
    { value: 'confirmed', label: '✅ Xác nhận' },
    { value: 'rejected', label: '❌ Từ chối' },
];

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
            setRegs(data.data ?? []);
            const confirmed = (data.data ?? []).filter((r: any) => r.payment_status === 'confirmed' && r.points_awarded);
            setTotal(confirmed.length);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchRegs(); }, [fetchRegs]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="w-9 h-9 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Lịch sử đăng ký</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Theo dõi các buổi bạn đã tham gia</p>
                </div>
            </div>

            {/* Points summary */}
            {!tab && (
                <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl p-4 text-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-white/80 text-xs">Tổng cầu lông tích lũy</p>
                        <p className="text-2xl font-black flex items-center gap-1.5">
                            {totalPoints}
                            <img
                                src="/icons/cau-long-icon.png"
                                alt="cầu lông"
                                className="w-8 h-8 object-contain"
                                style={{ mixBlendMode: 'screen' }}
                            />
                        </p>
                        <p className="text-white/70 text-xs">từ các buổi đã xác nhận thanh toán</p>
                    </div>
                </div>
            )}
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {TABS.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === value
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'bg-white text-gray-500 border border-gray-200'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                            <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : regs.length === 0 ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <CalendarDays className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">Chưa có lịch sử đăng ký</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {regs.map((reg) => {
                        const cfg = STATUS_CFG[reg.payment_status] ?? STATUS_CFG.pending;
                        const Icon = cfg.icon;
                        const sess = reg.sessions;

                        return (
                            <Link key={reg.id} href={`/sessions/${sess?.id}`}>
                                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-all mx-0.5 hover:border-blue-100">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${reg.payment_status === 'confirmed' ? 'bg-emerald-50' :
                                            reg.payment_status === 'pending' ? 'bg-amber-50' :
                                                reg.payment_status === 'rejected' ? 'bg-red-50' : 'bg-gray-50'
                                            }`}>
                                            <Icon className={`w-4 h-4 ${cfg.cls}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate text-sm">
                                                {sess?.title ?? 'Buổi đánh'}
                                            </p>

                                            {sess?.scheduled_at && (
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {format(new Date(sess.scheduled_at), 'EEEE, dd/MM/yyyy — HH:mm', { locale: vi })}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-1.5 mt-2">
                                                <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                                                {reg.points_awarded && (
                                                    <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                        +1 <img src="/icons/cau-long-icon.png" alt="cầu lông" className="w-5 h-5 object-contain" style={{ mixBlendMode: 'multiply' }} />
                                                    </span>
                                                )}
                                            </div>

                                            {reg.payment_reference && (
                                                <p className="text-[10px] font-mono text-gray-400 mt-1.5 bg-gray-50 px-2 py-0.5 rounded-lg inline-block">
                                                    Mã: {reg.payment_reference}
                                                </p>
                                            )}

                                            {reg.payment_status === 'pending' && !reg.payment_reference && reg.qr_url && (
                                                <p className="text-xs text-blue-500 mt-1 font-medium">
                                                    ⚠️ Chưa gửi mã — nhấn để thanh toán
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            {sess?.price_per_slot != null && sess.price_per_slot > 0 && (
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {sess.price_per_slot.toLocaleString('vi-VN')}đ
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
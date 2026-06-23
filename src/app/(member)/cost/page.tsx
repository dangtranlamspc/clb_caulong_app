'use client';
import { useEffect, useState } from 'react';
import { sessionsApi } from '../../../lib/api';
import { RefreshCw, Wallet } from 'lucide-react';

function fmt(n: number) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(n);
}
function fmtFull(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}
function fmtDate(iso: string) {
    const d = new Date(iso);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
        dayNum: d.getDate(),
        dayLabel: days[d.getDay()],
        full: `${days[d.getDay()]} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
    };
}
function groupByMonth(items: any[]): { month: string; items: any[] }[] {
    const map: Record<string, any[]> = {};
    for (const s of items) {
        const d = new Date(s.session.scheduled_at);
        const key = `Tháng ${d.getMonth() + 1} · ${d.getFullYear()}`;
        if (!map[key]) map[key] = [];
        map[key].push(s);
    }
    return Object.keys(map).map(month => ({ month, items: map[month] }));
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(t);
    }, [delay]);
    return (
        <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
            {children}
        </div>
    );
}

const STATUS_CFG: Record<string, { label: string; dot: string; border: string }> = {
    completed: { label: 'Xong', dot: 'bg-emerald-400', border: 'border-l-emerald-400' },
    open: { label: 'Sắp', dot: 'bg-blue-400', border: 'border-l-blue-400' },
    full: { label: 'Đầy', dot: 'bg-orange-400', border: 'border-l-orange-400' },
    cancelled: { label: 'Hủy', dot: 'bg-gray-300', border: 'border-l-gray-300' },
};

function SessionCostCard({ item }: { item: any }) {
    const { session, chi_phi, thu_vang_lai, co_dinh, summary: sum } = item;
    const { full } = fmtDate(session.scheduled_at);
    const cfg = STATUS_CFG[session.status] ?? STATUS_CFG.open;
    const hasPhanDu = co_dinh.count > 0 && sum.phan_du_co_dinh > 0;
    const isBreakEven = co_dinh.count > 0 && sum.phan_du_co_dinh <= 0;

    return (
        <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.border}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{full}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sum.total_members} người tham gia</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                </span>
            </div>

            <div className="mx-4 mb-3 rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Chi phí thực tế</p>
                {chi_phi.shuttle_count > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                            <img
                                src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782118304/cau-long-icon_qeymuc.png"
                                alt="cầu lông"
                                className="w-8 h-8 inline-block"
                            />
                            Cầu
                            <span className="text-gray-400 text-xs ml-1">{chi_phi.shuttle_count} × {new Intl.NumberFormat('vi-VN').format(chi_phi.shuttle_price / 1000)}k</span>
                        </span>
                        <span className="font-medium text-gray-700">{fmtFull(chi_phi.shuttle_cost)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">🏟 Sân</span>
                    <span className="font-medium text-gray-700">{fmtFull(chi_phi.court_fee)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200 mt-1">
                    <span className="font-semibold text-gray-700">Tổng chi phí</span>
                    <span className="font-black text-emerald-600">{fmtFull(sum.total_cost)}</span>
                </div>
            </div>

            {(thu_vang_lai.male_count > 0 || thu_vang_lai.female_count > 0) && (
                <div className="mx-4 mb-3 rounded-xl bg-blue-50 px-3 py-2.5 space-y-1.5">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Thu vãng lai</p>
                    {thu_vang_lai.male_count > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                                ♂ Nam
                                <span className="text-gray-400 text-xs ml-1">{thu_vang_lai.male_count} × {new Intl.NumberFormat('vi-VN').format(thu_vang_lai.price_male / 1000)}k</span>
                            </span>
                            <span className="font-medium text-blue-600">{fmtFull(thu_vang_lai.male_total)}</span>
                        </div>
                    )}
                    {thu_vang_lai.female_count > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">
                                ♀ Nữ
                                <span className="text-gray-400 text-xs ml-1">{thu_vang_lai.female_count} × {new Intl.NumberFormat('vi-VN').format(thu_vang_lai.price_female / 1000)}k</span>
                            </span>
                            <span className="font-medium text-pink-500">{fmtFull(thu_vang_lai.female_total)}</span>
                        </div>
                    )}
                    {co_dinh.count > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">🔵 {co_dinh.count} cố định</span>
                            <span className="text-xs text-gray-400 italic">phí tháng riêng</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm pt-1.5 border-t border-blue-200 mt-1">
                        <span className="font-semibold text-gray-700">Thu vãng lai</span>
                        <span className="font-black text-blue-600">{fmtFull(thu_vang_lai.total)}</span>
                    </div>
                </div>
            )}

            {hasPhanDu && (
                <div className="mx-4 mb-3 rounded-xl bg-violet-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1.5">Cố định bù</p>
                    <p className="text-xs text-violet-700 leading-relaxed">
                        {fmtFull(sum.total_cost)} − {fmtFull(thu_vang_lai.total)} = <strong>{fmtFull(sum.phan_du_co_dinh)}</strong>
                        <span className="text-violet-400"> → bù qua phí tháng</span>
                    </p>
                </div>
            )}
            {isBreakEven && (
                <div className="mx-4 mb-3 rounded-xl bg-emerald-50 px-3 py-2">
                    <p className="text-xs text-emerald-600">🎉 Vãng lai đã đủ chi phí buổi này</p>
                </div>
            )}
        </div>
    );
}

function SkeletonStats() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-28 bg-white rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map(i => <div key={i} className="h-16 bg-white rounded-2xl" />)}
            </div>
            <div className="h-20 bg-white rounded-2xl" />
            {[0, 1, 2].map(i => <div key={i} className="h-40 bg-white rounded-2xl" />)}
        </div>
    );
}

export default function CostPage() {
    const [data, setData] = useState<{ sessions: any[]; summary: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data: res } = await sessionsApi.getAllCosts();
            setData(res);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const grouped = data ? groupByMonth(data.sessions) : [];
    const s = data?.summary;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-violet-500" /> Chi phí
                </h1>
                <button
                    onClick={() => load(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? <SkeletonStats /> : !data ? (
                <div className="bg-white rounded-2xl py-14 text-center">
                    <p className="text-gray-400 text-sm">Không thể tải dữ liệu</p>
                </div>
            ) : (
                <>
                    {/* Hero stats — delay 0 */}
                    <FadeIn delay={0}>
                        <div className="bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl p-4 text-white">
                            <p className="text-white/60 text-xs mb-3">Tổng quan tài chính</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/15 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-emerald-300">{fmt(s.total_thu_vang_lai)}</p>
                                    <p className="text-white/60 text-[10px] mt-0.5">Tổng thu</p>
                                </div>
                                <div className="bg-white/15 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black">{fmt(s.total_cost)}</p>
                                    <p className="text-white/60 text-[10px] mt-0.5">Tổng chi</p>
                                </div>
                                <div className={`rounded-xl p-3 text-center ${s.total_phan_du_co_dinh > 0 ? 'bg-red-500/30' : 'bg-emerald-500/30'}`}>
                                    <p className={`text-xl font-black ${s.total_phan_du_co_dinh > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                        {s.total_phan_du_co_dinh > 0 ? '-' : '+'}{fmt(Math.abs(s.total_phan_du_co_dinh))}
                                    </p>
                                    <p className="text-white/60 text-[10px] mt-0.5">
                                        {s.total_phan_du_co_dinh > 0 ? 'CĐ bù' : 'Dư'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Mini stats — delay 80ms */}
                    <FadeIn delay={80}>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                <p className="text-2xl font-black text-gray-800">{s.total_sessions}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Buổi đánh</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                <p className="text-2xl font-black text-gray-800">{s.total_shuttle_count}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Quả cầu</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
                                <p className="text-xl font-black text-gray-800">{fmt(s.avg_cost_per_session)}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">TB/buổi</p>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Chú thích — delay 160ms */}
                    <FadeIn delay={160}>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cách đọc</p>
                            <p className="text-xs text-gray-500">💰 Chi phí thực = tiền cầu + tiền sân</p>
                            <p className="text-xs text-gray-500">🤝 Thu vãng lai = số người × đơn giá</p>
                            <p className="text-xs text-gray-500">ℹ️ Phần chênh lệch = cố định bù qua phí tháng</p>
                        </div>
                    </FadeIn>

                    {/* List theo tháng — mỗi group và card delay tăng dần */}
                    {grouped.map(({ month, items }, groupIdx) => (
                        <div key={month} className="space-y-3">
                            <FadeIn delay={220 + groupIdx * 40}>
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{month}</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                            </FadeIn>
                            {items.map((item: any, idx: number) => (
                                <FadeIn key={item.session.id} delay={260 + groupIdx * 40 + idx * 80}>
                                    <SessionCostCard item={item} />
                                </FadeIn>
                            ))}
                        </div>
                    ))}

                    {data.sessions.length === 0 && (
                        <FadeIn delay={200}>
                            <div className="bg-white rounded-2xl py-14 text-center">
                                <p className="text-gray-400 text-sm">Chưa có buổi đánh nào</p>
                            </div>
                        </FadeIn>
                    )}
                </>
            )}
        </div>
    );
}
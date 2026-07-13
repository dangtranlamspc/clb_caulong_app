'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Check, Hourglass, Wallet } from 'lucide-react';
import { sessionsApi, registrationsApi, walletApi } from '@/lib/api';

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString('vi-VN') + 'đ';
}

const METHOD_LABEL: Record<string, string> = {
    wallet: 'Ví BNB',
    transfer: 'Chuyển khoản',
    cash: 'Tiền mặt',
};

export default function BillPage() {
    const { id } = useParams<{ id: string }>();
    const searchParams = useSearchParams();
    const method = searchParams.get('method') ?? '';
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [myReg, setMyReg] = useState<any>(null);
    const [groupedGuests, setGroupedGuests] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const { data: sessionData } = await sessionsApi.get(id);
                setSession(sessionData);

                const myRegId = sessionData?.my_registration?.id;
                if (!myRegId) return;

                const requests: Promise<any>[] = [registrationsApi.getDetail(myRegId)];
                if (method === 'wallet') requests.push(walletApi.getMe());

                const results = await Promise.all(requests);
                const detail = results[0].data;
                setMyReg(detail.registration);
                setGroupedGuests(detail.grouped_guests ?? []);

                if (method === 'wallet') setWalletBalance(results[1]?.data?.wallet?.balance ?? 0);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, method]);

    if (loading) {
        return (
            <div className="max-w-sm mx-auto">
                <div className="bg-white rounded-3xl h-[70vh] animate-pulse" />
            </div>
        );
    }

    if (!session || !myReg) return <div className="text-center py-20 text-gray-400">Không tìm thấy hóa đơn</div>;

    const isInstant = method === 'wallet';
    const paid = isInstant || myReg?.payment_status === 'confirmed';

    const total =
        (myReg?.amount_override ?? 0) +
        groupedGuests.reduce((s: number, g: any) => s + (g.amount_override ?? 0), 0);

    const lineItems = [
        {
            label: session.title,
            sub: format(new Date(session.scheduled_at), 'dd/MM/yyyy', { locale: vi }),
            amount: myReg?.amount_override ?? 0,
            base_amount: myReg?.base_amount,
            other_fee_amount: myReg?.other_fee_amount,
            other_fee_note: myReg?.other_fee_note,
        },
        ...groupedGuests.map((g: any) => ({
            label: `+ ${g.guest_full_name}`,
            sub: 'Khách đi cùng',
            amount: g.amount_override ?? 0,
            base_amount: g.base_amount,
            other_fee_amount: g.other_fee_amount,
            other_fee_note: g.other_fee_note,
        })),
    ];

    const peopleCount = lineItems.length || 1;
    const courtFeePerPerson = (session.court_fee ?? 0) / peopleCount;
    const shuttleCount = session.shuttle_count ?? 0;
    const shuttlePrice = session.shuttle_price ?? 0;
    const shuttleFeePerPerson = (shuttleCount * shuttlePrice) / peopleCount;

    return (
        <div className="max-w-sm mx-auto space-y-4" style={{ animation: 'fadeSlideUp .35s ease both' }}>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes popIn {
                    0%   { transform: scale(0.6); opacity: 0; }
                    70%  { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); }
                }
                @keyframes confettiFloat {
                    from { transform: translateY(0) rotate(0deg); opacity: 1; }
                    to   { transform: translateY(-6px) rotate(20deg); opacity: 0.85; }
                }
            `}</style>

            <div className="bg-white rounded-3xl shadow-sm p-6 pt-8">
                <div className="relative flex flex-col items-center text-center mb-6">
                    <div className="relative w-20 h-20">
                        {paid && (
                            <>
                                <span className="absolute -top-2 -left-3 w-2 h-2 rounded-sm bg-amber-400" style={{ animation: 'confettiFloat 1.6s ease-in-out infinite alternate' }} />
                                <span className="absolute -top-3 right-0 w-1.5 h-3 rounded-sm bg-blue-400 rotate-12" style={{ animation: 'confettiFloat 1.8s ease-in-out infinite alternate-reverse' }} />
                                <span className="absolute top-1 -right-4 w-2 h-2 rounded-sm bg-rose-400" style={{ animation: 'confettiFloat 1.4s ease-in-out infinite alternate' }} />
                                <span className="absolute -bottom-1 -left-4 w-1.5 h-1.5 rounded-full bg-emerald-300" style={{ animation: 'confettiFloat 2s ease-in-out infinite alternate-reverse' }} />
                            </>
                        )}
                        <div
                            className={`w-20 h-20 rounded-full flex items-center justify-center ${paid ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ animation: 'popIn .5s cubic-bezier(0.34,1.56,0.64,1) both' }}
                        >
                            {paid ? <Check className="w-10 h-10 text-white" strokeWidth={3} /> : <Hourglass className="w-9 h-9 text-white" />}
                        </div>
                    </div>

                    <h1 className={`text-lg font-bold mt-4 ${paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {paid ? 'Thanh toán thành công!' : 'Đã gửi yêu cầu thanh toán!'}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                        {paid
                            ? 'Buổi đánh đã được thanh toán thành công. Cảm ơn bạn đã sử dụng dịch vụ của CLB.'
                            : 'Admin sẽ xác nhận sau khi nhận được thanh toán của bạn.'}
                    </p>
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                        <span className="text-sm font-bold text-gray-900">Chi tiết thanh toán</span>
                        <span className="text-sm font-bold text-emerald-600">{METHOD_LABEL[method] ?? 'Chuyển khoản'}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {lineItems.map((item, i) => (
                            <div key={i} className="px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                        <p className="text-xs text-gray-400">{item.sub}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">{fmt(item.amount)}</span>
                                </div>

                                <div className="mt-2 pl-3 space-y-1 border-l-2 border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>Tiền sân</span>
                                        <span>{fmt(courtFeePerPerson)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>Cầu {shuttleCount} × {fmt(shuttlePrice)}</span>
                                        <span>{fmt(shuttleFeePerPerson)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>
                                            Khoản khác
                                            {item.other_fee_note ? ` (${item.other_fee_note})` : ''}
                                        </span>
                                        <span>{fmt(item.other_fee_amount ?? 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3.5 bg-gray-50 border-t border-gray-100">
                        <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
                        <span className="text-lg font-black text-emerald-600">{fmt(total)}</span>
                    </div>
                </div>

                {isInstant && walletBalance !== null && (
                    <div
                        className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 border ${walletBalance < 0
                            ? 'bg-red-50/60 border-red-100'
                            : 'bg-emerald-50/60 border-emerald-100'
                            }`}
                    >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                            <Wallet className={`w-5 h-5 ${walletBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Số dư ví hiện tại</p>
                            <p className={`text-lg font-black ${walletBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {fmt(walletBalance)}
                            </p>
                            {walletBalance < 0 && (
                                <p className="text-xs text-red-500 mt-0.5">
                                    Ví đang âm, bạn cần nạp thêm tiền để tiếp tục sử dụng dịch vụ
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {isInstant && walletBalance !== null && walletBalance < 0 && (
                    <button
                        onClick={() => router.push('/wallet')}
                        className="w-full mt-3 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
                    >
                        <Wallet className="w-4 h-4" />
                        NẠP TIỀN NGAY
                    </button>
                )}

                {/* Actions */}
                <div className="mt-6 space-y-3">
                    <button
                        onClick={() => router.push('/wallet')}
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide transition-colors"
                    >
                        XEM LỊCH SỬ
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full text-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        Quay về trang chủ
                    </button>
                </div>
            </div>
        </div>
    );
}
'use client';
import { useEffect, useState } from 'react';
import {
    Wallet, Eye, EyeOff, ChevronRight, PlusCircle, History,
    ArrowDownToLine, ArrowUpFromLine, CalendarDays, ShoppingCart,
    Loader2, X as XIcon, CheckCircle2, ImagePlus, Copy, RotateCcw,
    Banknote, Users, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { walletApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';

function fmt(n: number) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';
}

const TX_FILTER_OPTS = [
    { value: '', label: 'Tất cả' },
    { value: 'topup', label: 'Nạp tiền' },
    { value: 'session_payment', label: 'Thanh toán buổi' },
    { value: 'manual_expense', label: 'Chi tiêu khác' },
    { value: 'manual_credit', label: 'Cộng tiền khác' },
    { value: 'refund', label: 'Hoàn tiền' },
];

function txIcon(tx: any) {
    switch (tx.type) {
        case 'topup': return { Icon: ArrowDownToLine, cls: 'bg-emerald-50 text-emerald-600' };
        case 'session_payment': return { Icon: CalendarDays, cls: 'bg-red-50 text-red-500' };
        case 'manual_expense': return { Icon: ShoppingCart, cls: 'bg-amber-50 text-amber-600' };
        case 'manual_credit': return { Icon: PlusCircle, cls: 'bg-emerald-50 text-emerald-600' };
        case 'refund': return { Icon: RotateCcw, cls: 'bg-blue-50 text-blue-600' };
        default: return { Icon: Wallet, cls: 'bg-gray-50 text-gray-500' };
    }
}

function QuickAmountBtn({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
        >
            {fmt(value)}
        </button>
    );
}

function TopupModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [step, setStep] = useState<'amount' | 'transfer' | 'cash'>('amount');
    const [amount, setAmount] = useState(0);
    const [payRef, setPayRef] = useState('');
    const [billUrl, setBillUrl] = useState<string | null>(null);
    const [billPreview, setBillPreview] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const suggestedRef = `NAPVI ${Date.now().toString().slice(-8)}`;
    const qrUrl = amount > 0
        ? `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '0000000000'}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(suggestedRef)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? 'CLB CAU LONG')}`
        : null;

    const handleSubmitTransfer = async () => {
        if (!payRef.trim()) { toast.error('Vui lòng nhập nội dung chuyển khoản'); return; }
        setSubmitting(true);
        try {
            await walletApi.requestTopup({
                amount, payment_method: 'transfer',
                payment_reference: payRef.trim(), payment_proof_url: billUrl ?? undefined, note: note || undefined,
            });
            toast.success('Đã gửi yêu cầu nạp tiền, chờ admin duyệt');
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Gửi yêu cầu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitCash = async () => {
        setSubmitting(true);
        try {
            await walletApi.requestTopup({ amount, payment_method: 'cash', note: note || undefined });
            toast.success('Đã gửi yêu cầu nạp tiền tiền mặt, chờ admin duyệt');
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Gửi yêu cầu thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full bg-white rounded-t-2xl" style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900">
                        {step === 'amount' ? 'Nạp tiền vào ví' : step === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                    </p>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <XIcon className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {step === 'amount' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Số tiền muốn nạp</label>
                                <input
                                    type="number" value={amount || ''}
                                    onChange={e => setAmount(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-lg font-bold text-center focus:outline-none focus:border-blue-400"
                                    placeholder="0"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[100000, 200000, 500000].map(v => (
                                    <QuickAmountBtn key={v} value={v} active={amount === v} onClick={() => setAmount(v)} />
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[1000000, 2000000].map(v => (
                                    <QuickAmountBtn key={v} value={v} active={amount === v} onClick={() => setAmount(v)} />
                                ))}
                            </div>
                            <button
                                onClick={() => amount >= 1000 ? setStep('transfer') : toast.error('Số tiền tối thiểu 1.000đ')}
                                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                Tiếp tục
                            </button>
                        </>
                    )}

                    {step === 'transfer' && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                                    <img src={qrUrl!} alt="VietQR" className="w-44 h-44 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                                <div className="flex justify-between"><span className="text-gray-500">Số tiền</span><span className="font-bold text-blue-600">{fmt(amount)}</span></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Nội dung CK</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-semibold">{suggestedRef}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(suggestedRef); toast.success('Đã copy'); }} className="p-1 hover:bg-gray-200 rounded">
                                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <input value={payRef} onChange={e => setPayRef(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                placeholder={`Nhập nội dung: ${suggestedRef}`} />

                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1.5">Ảnh bill (tuỳ chọn)</p>
                                {!billPreview ? (
                                    <label className="w-full py-5 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-1.5 text-gray-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer">
                                        <ImagePlus className="w-6 h-6" /><span className="text-xs">Chọn ảnh bill</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const f = e.target.files?.[0]; if (!f) return;
                                            const reader = new FileReader();
                                            reader.onload = () => setBillPreview(reader.result as string);
                                            reader.readAsDataURL(f);
                                        }} />
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                        <img src={billPreview} className="w-full max-h-40 object-contain bg-gray-50" />
                                        <button onClick={() => { setBillPreview(null); setBillUrl(null); }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                            <XIcon className="w-3.5 h-3.5 text-white" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep('amount')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                <button onClick={handleSubmitTransfer} disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi yêu cầu
                                </button>
                            </div>
                            <button onClick={() => setStep('cash')} className="w-full text-xs text-gray-400 underline">
                                Tôi nạp bằng tiền mặt
                            </button>
                        </div>
                    )}

                    {step === 'cash' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
                                <span className="text-sm text-gray-600">Số tiền nạp</span>
                                <span className="text-lg font-black text-green-600">{fmt(amount)}</span>
                            </div>
                            <input value={note} onChange={e => setNote(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                                placeholder="Ghi chú (tuỳ chọn)" />
                            <div className="flex gap-2">
                                <button onClick={() => setStep('transfer')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                <button onClick={handleSubmitCash} disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi yêu cầu
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function WalletPage() {
    const { user } = useAuthStore();
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hideBalance, setHideBalance] = useState(false);
    const [txFilter, setTxFilter] = useState('');
    const [showTopupModal, setShowTopupModal] = useState(false);

    const fetchAll = async () => {
        const [{ data: s }, { data: t }] = await Promise.all([
            walletApi.getMe(),
            walletApi.getTransactions({ type: txFilter || undefined }),
        ]);
        setSummary(s);
        setTransactions(t.data ?? []);
    };

    useEffect(() => {
        setLoading(true);
        fetchAll().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        walletApi.getTransactions({ type: txFilter || undefined }).then(({ data }) => setTransactions(data.data ?? []));
    }, [txFilter]);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`wallet:${user.id}`)
            .on('broadcast', { event: 'wallet_updated' }, () => {
                fetchAll();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    if (loading || !summary) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded-xl w-32 animate-pulse" />
                <div className="bg-white rounded-3xl h-56 animate-pulse" />
                <div className="bg-white rounded-2xl h-24 animate-pulse" />
            </div>
        );
    }

    const { wallet, attended_sessions, avg_session_cost, sessions_left, target_balance, progress_ratio, pending_topup } = summary;
    const isDebt = wallet.balance < 0;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Ví BNB</h1>
                <p className="text-sm text-gray-500 mt-0.5">Quản lý số dư và lịch sử giao dịch</p>
            </div>

            {pending_topup && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                        Yêu cầu nạp <strong>{fmt(pending_topup.amount)}</strong> đang chờ admin duyệt
                    </p>
                </div>
            )}

            <div
                className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 60%, #312e81 100%)' }}
            >
                <div aria-hidden className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between mb-3">
                    <span className="text-sm text-white/80 flex items-center gap-1.5">
                        Số dư hiện tại
                        <button onClick={() => setHideBalance(h => !h)}>
                            {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </span>
                    <button className="flex items-center gap-1 text-xs font-medium bg-white/15 px-2.5 py-1 rounded-full hover:bg-white/25 transition-colors">
                        Chi tiết <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
                <p className="relative text-3xl font-black mb-3">
                    {hideBalance ? '••••••••' : fmt(wallet.balance)}
                </p>
                <span className={`relative inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isDebt ? 'bg-red-500/30' : 'bg-white/15'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDebt ? 'bg-red-300' : 'bg-emerald-300'}`} />
                    Trạng thái: {isDebt ? 'Đang ghi nợ' : 'Bình thường'}
                </span>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-lg">🏸</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                            Đủ cho khoảng <strong className="text-gray-900">{sessions_left}</strong> buổi đánh nữa
                        </p>
                        <p className="text-xs text-gray-400">(Dựa trên chi phí trung bình {fmt(avg_session_cost)}/buổi)</p>
                    </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{fmt(Math.max(wallet.balance, 0))} / {fmt(target_balance)}</span>
                    <span>{Math.round(progress_ratio * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress_ratio * 100}%` }} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setShowTopupModal(true)}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 transition-colors"
                >
                    <PlusCircle className="w-4 h-4" /> Nạp thêm
                </button>
                <a
                    href="#history"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                >
                    <History className="w-4 h-4" /> Lịch sử giao dịch
                </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Tổng nạp', value: fmt(wallet.total_topup), Icon: ArrowDownToLine, cls: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Tổng đã chi', value: fmt(wallet.total_spent), Icon: ArrowUpFromLine, cls: 'bg-red-50 text-red-500' },
                    { label: 'Số buổi đã tham gia', value: String(attended_sessions), Icon: Users, cls: 'bg-blue-50 text-blue-600' },
                    { label: 'Công nợ', value: fmt(wallet.debt), Icon: AlertCircle, cls: wallet.debt > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400' },
                ].map(({ label, value, Icon, cls }) => (
                    <div key={label} className="bg-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cls}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] text-gray-400 truncate">{label}</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div id="history" className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Lịch sử giao dịch</h3>
                    <select
                        value={txFilter}
                        onChange={e => setTxFilter(e.target.value)}
                        className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                    >
                        {TX_FILTER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {transactions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chưa có giao dịch nào</p>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {transactions.map(tx => {
                            const { Icon, cls } = txIcon(tx);
                            const isPositive = tx.amount > 0;
                            return (
                                <li key={tx.id} className="flex items-start gap-3 py-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cls}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{tx.title}</p>
                                            <span className={`text-sm font-bold flex-shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {isPositive ? '+' : ''}{fmt(tx.amount)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[11px] text-gray-400">
                                                {format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                            </span>
                                            <span className="text-[11px] text-gray-400">Số dư: {fmt(tx.balance_after)}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {
                showTopupModal && (
                    <TopupModal
                        onClose={() => setShowTopupModal(false)}
                        onSuccess={() => { setShowTopupModal(false); fetchAll(); }}
                    />
                )
            }
        </div >
    );
}
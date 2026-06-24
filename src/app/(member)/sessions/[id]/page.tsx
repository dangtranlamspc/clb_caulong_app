'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft, CalendarDays, MapPin, Clock, Users,
    CheckCircle2, Hourglass, AlertCircle, Copy, ExternalLink,
    Loader2, XCircle, ImagePlus, X as XIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi, registrationsApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: 'Chờ admin xác nhận', icon: Hourglass, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    confirmed: { label: 'Đã xác nhận', icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    rejected: { label: 'Đã bị từ chối', icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-600' },
};

export default function SessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [payRef, setPayRef] = useState('');
    const [submittingRef, setSubmittingRef] = useState(false);
    const [showPayInput, setShowPayInput] = useState(false);

    // ── Bill image upload state ──
    const [billFile, setBillFile] = useState<File | null>(null);
    const [billPreview, setBillPreview] = useState<string | null>(null);
    const [billUrl, setBillUrl] = useState<string | null>(null);
    const [uploadingBill, setUploadingBill] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchSession = async () => {
        try {
            const { data } = await sessionsApi.get(id);
            setSession(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSession(); }, [id]);

    const price = (() => {
        if (!session) return 0;
        if (session.price_male && user?.gender === 'male') return session.price_male;
        if (session.price_female && user?.gender === 'female') return session.price_female;
        return session.price_per_slot ?? 0;
    })();

    const priceLabel = (() => {
        if (session?.price_male && session?.price_female) {
            if (user?.gender === 'male') return '👨 Giá Nam';
            if (user?.gender === 'female') return '👩 Giá Nữ';
            return 'Giá / slot';
        }
        return 'Giá / slot';
    })();

    const handleRegister = async () => {
        setRegistering(true);
        try {
            const { data } = await registrationsApi.register({ session_id: id });
            toast.success('Đăng ký thành công! Vui lòng thanh toán.');
            setSession((prev: any) => ({
                ...prev,
                my_registration: data.registration,
                available_slots: prev.available_slots - 1,
                _payment_info: data.payment_info,
            }));
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Đăng ký thất bại');
        } finally {
            setRegistering(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy đăng ký buổi này?')) return;
        setCancelling(true);
        try {
            await registrationsApi.cancel(session.my_registration.id);
            toast.success('Đã hủy đăng ký');
            fetchSession();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Không thể hủy');
        } finally {
            setCancelling(false);
        }
    };

    const handlePickBill = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error('Ảnh quá lớn (tối đa 8MB)');
            return;
        }
        setBillFile(file);
        setBillUrl(null);
        const reader = new FileReader();
        reader.onload = () => setBillPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleClearBill = () => {
        setBillFile(null);
        setBillPreview(null);
        setBillUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUploadBill = async () => {
        if (!billFile || !session?.my_registration?.id) return;
        setUploadingBill(true);
        try {
            const { data } = await registrationsApi.uploadPaymentProof(session.my_registration.id, billFile);
            setBillUrl(data.payment_proof_url);
            toast.success('Đã tải ảnh bill lên!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Tải ảnh thất bại, thử lại');
            console.error(err);
        } finally {
            setUploadingBill(false);
        }
    };

    const handleSubmitRef = async () => {
        if (!payRef.trim()) { toast.error('Vui lòng nhập mã chuyển khoản'); return; }
        if (!billUrl) { toast.error('Vui lòng tải ảnh bill chuyển khoản trước'); return; }
        setSubmittingRef(true);
        try {
            await registrationsApi.submitPayment(session.my_registration.id, {
                payment_reference: payRef.trim(),
            });
            toast.success('Đã gửi mã thanh toán!');
            setShowPayInput(false);
            handleClearBill();
            fetchSession();
        } catch {
            toast.error('Gửi thất bại, thử lại');
        } finally {
            setSubmittingRef(false);
        }
    };

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Đã copy ${label}`);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-32 animate-pulse" />
            </div>
        );
    }

    if (!session) return (
        <div className="text-center py-20 text-gray-400">Không tìm thấy buổi đánh</div>
    );

    const myReg = session.my_registration;
    const regCfg = myReg ? STATUS_CFG[myReg.payment_status] : null;
    const RegIcon = regCfg?.icon;
    const isFull = session.available_slots <= 0;
    const canRegister = session.status === 'open' && !isFull && !myReg;

    const paymentInfo = session._payment_info;
    const suggestedRef = paymentInfo?.suggested_reference
        ?? (myReg ? `DANGKY ${myReg.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` : '');
    const qrUrl = paymentInfo?.qr_url
        ?? (myReg && price > 0
            ? `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '0000000000'}-compact.png?amount=${price}&addInfo=${encodeURIComponent(suggestedRef)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? 'CLB CAU LONG')}`
            : null);

    const canConfirmSubmit = !!billUrl && !!payRef.trim() && !submittingRef;

    return (
        <div className="space-y-4">
            {/* Back */}
            <button
                onClick={() => {
                    sessionStorage.setItem('activity:return-tab', 'sessions');
                    router.push('/activity');
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Quay lại
            </button>

            {/* Session info card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-4">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">{session.title}</h1>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${session.status === 'open' ? 'bg-emerald-50 text-emerald-700' :
                        session.status === 'full' ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                        }`}>
                        {session.status === 'open' ? 'Mở đăng ký' :
                            session.status === 'full' ? 'Đã đầy' :
                                session.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                    </span>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span>{format(new Date(session.scheduled_at), 'EEEE, dd/MM/yyyy — HH:mm', { locale: vi })}</span>
                    </div>
                    {session.location && (
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <span>{session.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <span>{session.duration_minutes} phút</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            <Users className={`w-3.5 h-3.5 ${isFull ? 'text-red-500' : 'text-emerald-600'}`} />
                        </div>
                        <span className={isFull ? 'text-red-500 font-medium' : ''}>
                            {isFull ? 'Đã hết chỗ' : `Còn ${session.available_slots}/${session.max_slots} chỗ trống`}
                        </span>
                    </div>
                </div>

                {session.description && (
                    <p className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500 leading-relaxed">
                        {session.description}
                    </p>
                )}

                {/* Price */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">{priceLabel}</span>
                    <span className="text-xl font-bold text-blue-600">
                        {price.toLocaleString('vi-VN')}đ
                    </span>
                </div>
            </div>

            {/* Registration status card */}
            {myReg && regCfg && (
                <div className={`rounded-2xl p-4 border ${regCfg.cls}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <RegIcon className="w-4 h-4" />
                        <span className="font-semibold text-sm">{regCfg.label}</span>
                    </div>
                    {myReg.payment_reference && (
                        <p className="text-xs opacity-70">Mã TK: <span className="font-mono font-semibold">{myReg.payment_reference}</span></p>
                    )}
                </div>
            )}

            {/* QR Payment section — hiện khi đã đăng ký và pending */}
            {myReg && myReg.payment_status === 'pending' && qrUrl && price > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-1">Thanh toán chuyển khoản</h3>
                    <p className="text-xs text-gray-400 mb-4">Quét mã QR hoặc chuyển khoản theo thông tin bên dưới</p>

                    {/* QR Code */}
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                            <img
                                src={qrUrl}
                                alt="VietQR"
                                className="w-48 h-48 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    </div>

                    {/* Bank info */}
                    <div className="space-y-2 bg-gray-50 rounded-xl p-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Số tiền</span>
                            <span className="font-bold text-blue-600">{price.toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Nội dung CK</span>
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-gray-900">{suggestedRef}</span>
                                <button onClick={() => copyText(suggestedRef, 'nội dung')} className="p-1 hover:bg-gray-200 rounded-lg">
                                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            </div>
                        </div>
                        {paymentInfo?.bank_id && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Ngân hàng</span>
                                <span className="font-semibold">{paymentInfo.bank_id}</span>
                            </div>
                        )}
                        {paymentInfo?.account_no && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Số TK</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold">{paymentInfo.account_no}</span>
                                    <button onClick={() => copyText(paymentInfo.account_no, 'số tài khoản')} className="p-1 hover:bg-gray-200 rounded-lg">
                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit payment reference */}
                    <div className="mt-4">
                        {!showPayInput ? (
                            <button
                                onClick={() => setShowPayInput(true)}
                                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Tôi đã chuyển khoản — Gửi mã xác nhận
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    value={payRef}
                                    onChange={e => setPayRef(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    placeholder={`Nhập: ${suggestedRef}`}
                                />

                                {/* ── Upload ảnh bill ── */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 mb-1.5">
                                        Ảnh bill chuyển khoản <span className="text-red-400">*</span>
                                    </p>

                                    {!billPreview ? (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                                        >
                                            <ImagePlus className="w-6 h-6" />
                                            <span className="text-xs font-medium">Chọn ảnh bill chuyển khoản</span>
                                        </button>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                            <img src={billPreview} alt="Bill preview" className="w-full max-h-56 object-contain bg-gray-50" />
                                            <button
                                                onClick={handleClearBill}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                                            >
                                                <XIcon className="w-3.5 h-3.5 text-white" />
                                            </button>

                                            {billUrl ? (
                                                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" /> Đã tải lên
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={handleUploadBill}
                                                    disabled={uploadingBill}
                                                    className="absolute bottom-2 left-2 right-2 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                                                >
                                                    {uploadingBill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                                                    {uploadingBill ? 'Đang tải lên...' : 'Tải ảnh lên'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePickBill}
                                        className="hidden"
                                    />

                                    {!billUrl && (
                                        <p className="text-[11px] text-amber-600 mt-1.5">
                                            ⓘ Cần tải ảnh bill lên trước khi gửi xác nhận
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowPayInput(false); handleClearBill(); }}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleSubmitRef}
                                        disabled={!canConfirmSubmit}
                                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-opacity"
                                    >
                                        {submittingRef && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action button */}
            <div className="space-y-2">
                {canRegister && (
                    <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        {registering && <Loader2 className="w-4 h-4 animate-spin" />}
                        {registering ? 'Đang đăng ký...' : '🏸 Đăng ký tham gia'}
                    </button>
                )}

                {myReg && myReg.payment_status === 'pending' && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                        {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Hủy đăng ký
                    </button>
                )}

                {isFull && !myReg && (
                    <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-medium text-center text-sm">
                        Buổi đã đầy chỗ
                    </div>
                )}
            </div>
        </div>
    );
}
import { buildTransferNote } from "@/hooks/payment-ref";
import { registrationsApi } from "@/lib/api";
import { CheckCircle2Icon, Copy, ImagePlus, Loader2, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from 'react-hot-toast';

export function PaymentModal({ session, reg, userFullName, onClose, onSuccess }: {
    session: any;
    reg: any;
    userFullName: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState<'choose' | 'transfer' | 'cash'>('choose');
    const [payRef, setPayRef] = useState('');
    const [billFile, setBillFile] = useState<File | null>(null);
    const [billPreview, setBillPreview] = useState<string | null>(null);
    const [billUrl, setBillUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sendingCash, setSendingCash] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const amount = reg.amount_override ?? 0;
    const suggestedRef = buildTransferNote(userFullName, session.title, session.scheduled_at);
    const qrUrl = `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '0000000000'}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(suggestedRef)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? 'CLB CAU LONG')}`;

    const handlePickBill = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBillFile(file);
        setBillUrl(null);
        const reader = new FileReader();
        reader.onload = () => setBillPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadBill = async () => {
        if (!billFile) return;
        setUploading(true);
        try {
            const { data } = await registrationsApi.uploadPaymentProof(reg.id, billFile);
            setBillUrl(data.payment_proof_url);
            toast.success('Đã tải ảnh bill lên!');
        } catch {
            toast.error('Tải ảnh thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitTransfer = async () => {
        if (!payRef.trim()) { toast.error('Vui lòng nhập mã chuyển khoản'); return; }
        setSubmitting(true);
        try {
            await registrationsApi.submitPayment(reg.id, {
                payment_reference: payRef.trim(),
                ...(billUrl ? { payment_proof_url: billUrl } : {}),
            });
            toast.success('Đã gửi xác nhận thanh toán!');
            onSuccess();
        } catch {
            toast.error('Gửi thất bại, thử lại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCash = async () => {
        setSendingCash(true);
        try {
            await registrationsApi.requestCash(reg.id);
            toast.success('Đã thông báo cho admin!');
            onSuccess();
        } catch {
            toast.error('Gửi thất bại, thử lại');
        } finally {
            setSendingCash(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col justify-end"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div
                className="w-full bg-white rounded-t-2xl"
                style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div>
                        <p className="text-sm font-bold text-gray-900">
                            {step === 'choose' ? 'Chọn hình thức thanh toán' :
                                step === 'transfer' ? 'Chuyển khoản' : 'Thanh toán tiền mặt'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <XIcon className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Số tiền */}
                    <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                        <span className="text-sm text-gray-600">Số tiền cần thanh toán</span>
                        <span className="text-lg font-black text-red-600">{amount.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {/* Step: choose */}
                    {step === 'choose' && (
                        <div className="space-y-3">
                            <button
                                onClick={() => setStep('transfer')}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xl">🏦</div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Chuyển khoản</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Quét QR VietQR, gửi ảnh bill xác nhận</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setStep('cash')}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                            >
                                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">💵</div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Tiền mặt</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Thông báo admin, nộp tiền trực tiếp</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Step: transfer */}
                    {step === 'transfer' && (
                        <div className="space-y-4">
                            {/* QR */}
                            <div className="flex justify-center">
                                <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                                    <img src={qrUrl} alt="VietQR" className="w-44 h-44 object-contain"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                            </div>
                            {/* Bank info */}
                            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Số tiền</span>
                                    <span className="font-bold text-blue-600">{amount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Nội dung CK</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-semibold">{suggestedRef}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(suggestedRef); toast.success('Đã copy'); }}
                                            className="p-1 hover:bg-gray-200 rounded">
                                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* Mã CK */}
                            <input value={payRef} onChange={e => setPayRef(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                placeholder={`Nhập nội dung: ${suggestedRef}`} />
                            {/* Upload bill */}
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                                    Ảnh bill <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                                </p>
                                {!billPreview ? (
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-5 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-1.5 text-gray-400 hover:border-blue-300 hover:text-blue-500">
                                        <ImagePlus className="w-6 h-6" />
                                        <span className="text-xs">Chọn ảnh bill</span>
                                    </button>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                        <img src={billPreview} className="w-full max-h-48 object-contain bg-gray-50" />
                                        <button onClick={() => { setBillFile(null); setBillPreview(null); setBillUrl(null); }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                            <XIcon className="w-3.5 h-3.5 text-white" />
                                        </button>
                                        {billUrl ? (
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
                                                <CheckCircle2Icon className="w-3 h-3" /> Đã tải lên
                                            </div>
                                        ) : (
                                            <button onClick={handleUploadBill} disabled={uploading}
                                                className="absolute bottom-2 left-2 right-2 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                                                {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickBill} className="hidden" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep('choose')}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                                    Quay lại
                                </button>
                                <button onClick={handleSubmitTransfer} disabled={!payRef.trim() || submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Gửi xác nhận
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: cash */}
                    {step === 'cash' && (
                        <div className="space-y-4">
                            <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800">
                                <p className="font-semibold mb-1">💵 Thanh toán tiền mặt</p>
                                <p className="text-xs text-green-600">Nhấn "Thông báo admin" để admin biết bạn sẽ trả tiền mặt. Admin sẽ xác nhận sau khi nhận tiền.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setStep('choose')}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">
                                    Quay lại
                                </button>
                                <button onClick={handleCash} disabled={sendingCash}
                                    className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                                    {sendingCash && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Thông báo admin
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
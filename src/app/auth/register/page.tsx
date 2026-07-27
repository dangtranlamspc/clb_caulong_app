'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Camera, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { AvatarCropModal } from '@/components/member/avatars/AvatarCropModal';
import { AvatarPickerModal } from '@/components/member/avatars/AvatarPickerModal';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const RESEND_COOLDOWN = 60;

function OtpInput({ value, onChange, onComplete, hasError = false, shakeSignal = 0, disabled = false }: {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  hasError?: boolean;
  shakeSignal?: number;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  const [shaking, setShaking] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(t);
  }, [shakeSignal]);

  const setDigit = (index: number, val: string) => {
    const next = digits.slice();
    next[index] = val;
    const joined = next.join('');
    onChange(joined);
    if (joined.length === 6) onComplete?.(joined);
  };

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;
    const val = raw.replace(/\D/g, '');
    if (!val) {
      setDigit(index, '');
      return;
    }
    const char = val[val.length - 1];
    setDigit(index, char);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '');
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
        setDigit(index - 1, '');
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === 6) {
      onComplete?.(pasted);
      inputsRef.current[5]?.focus();
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  return (
    <>
      <div
        className={`flex justify-center gap-2 mb-4 ${shaking ? 'otp-shake' : ''}`}
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            disabled={disabled}
            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all
              ${hasError
                ? 'border-red-400 ring-2 ring-red-100 text-red-600'
                : 'border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes otpShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .otp-shake {
          animation: otpShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </>
  );
}

const VERIFICATION_STORAGE_KEY = 'bnb_pending_email_verification';
const CODE_TTL_MS = 5 * 60 * 1000; // đồng bộ với CODE_TTL_MS bên backend

type PendingVerification = {
  email: string;
  sentAt: number; // thời điểm mã gần nhất được gửi (đăng ký hoặc resend)
  resendAvailableAt: number;
};

function savePendingVerification(data: PendingVerification) {
  try {
    sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage có thể bị chặn (private mode nghiêm ngặt) — bỏ qua, không crash app
  }
}

function loadPendingVerification(): PendingVerification | null {
  try {
    const raw = sessionStorage.getItem(VERIFICATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingVerification() {
  try {
    sessionStorage.removeItem(VERIFICATION_STORAGE_KEY);
  } catch { }
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [step, setStep] = useState<'form' | 'verify' | 'done'>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verifyingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [avatarPreview]);

  useEffect(() => {
    const pending = loadPendingVerification();
    if (!pending) return;

    const elapsedSinceSent = Date.now() - pending.sentAt;
    if (elapsedSinceSent >= CODE_TTL_MS) {
      clearPendingVerification();
      return;
    }

    setRegisteredEmail(pending.email);
    setStep('verify');

    const remainingCooldown = Math.max(
      0,
      Math.ceil((pending.resendAvailableAt - Date.now()) / 1000),
    );
    if (remainingCooldown > 0) startCooldown(remainingCooldown);
  }, []);

  const startCooldown = (fromSeconds: number = RESEND_COOLDOWN) => {
    setResendCooldown(fromSeconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1 && cooldownRef.current) clearInterval(cooldownRef.current);
        return s - 1;
      });
    }, 1000);
  };

  const verifyCode = async (val: string) => {
    if (val.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    try {
      await authApi.verifyEmail({ email: registeredEmail, code: val });
      clearPendingVerification();
      setStep('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;

      if (text === 'Email không tồn tại') {
        clearPendingVerification();
        toast.error('Mã xác thực đã hết hạn quá lâu, vui lòng đăng ký lại');
        setStep('form');
        setCode('');
        setCodeError(false);
        return;
      }

      toast.error(text || 'Mã xác thực không đúng');
      setCodeError(true);
      setShakeSignal((s) => s + 1);
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  const handleCodeChange = (val: string) => {
    setCode(val);
    if (codeError) setCodeError(false);
  };

  const handleFilePicked = (file: File) => {
    setRawImageSrc(URL.createObjectURL(file));
  };

  const handleAvatarReady = (file: File) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCropCancel = () => {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
  };

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { confirm_password, ...rest } = values;
      const { data } = await authApi.register(rest);
      const email = data.email ?? rest.email;

      setRegisteredEmail(email);
      setStep('verify');
      startCooldown();
      savePendingVerification({
        email,
        sentAt: Date.now(),
        resendAvailableAt: Date.now() + RESEND_COOLDOWN * 1000,
      });
      toast.success('Đã gửi mã xác thực đến email của bạn');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = () => {
    if (code.length !== 6) {
      toast.error('Vui lòng nhập đủ 6 số');
      return;
    }
    verifyCode(code);
  };

  const onResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendCode({ email: registeredEmail });
      toast.success('Đã gửi lại mã xác thực');
      setCode('');
      setCodeError(false);
      startCooldown();
      savePendingVerification({
        email: registeredEmail,
        sentAt: Date.now(),
        resendAvailableAt: Date.now() + RESEND_COOLDOWN * 1000,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gửi lại mã thất bại');
    }
  };

  if (step === 'verify') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-6 h-6 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Xác thực email</h2>
        <p className="text-gray-500 text-sm mb-6">
          Nhập mã 6 số vừa được gửi đến <span className="font-medium text-gray-700">{registeredEmail}</span>
        </p>
        <OtpInput
          value={code}
          onChange={handleCodeChange}
          onComplete={(val) => verifyCode(val)}
          hasError={codeError}
          shakeSignal={shakeSignal}
          disabled={verifying}
        />
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onVerify}
          disabled={verifying || code.length !== 6}
          className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
          Xác nhận
        </motion.button>
        <button
          onClick={onResend}
          disabled={resendCooldown > 0}
          className="text-sm text-brand-600 font-medium mt-4 disabled:text-gray-300"
        >
          {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã'}
        </button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Xác thực thành công!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tài khoản của bạn đang chờ quản trị viên duyệt. Bạn sẽ có thể đăng nhập ngay
          sau khi được duyệt.
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.replace('/auth/login')}
          className="btn-primary w-full"
        >
          Về trang đăng nhập
        </motion.button>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Tạo tài khoản</h2>
      <p className="text-gray-500 text-sm mb-6">Điền thông tin để đăng ký</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-400">
                  {watch('full_name')?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors"
              aria-label="Chọn ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {avatarFile ? 'Bạn có thể cập nhật lại ảnh sau khi đăng nhập' : 'Ảnh đại diện (không bắt buộc)'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên *</label>
          <input
            {...register('full_name', { required: 'Vui lòng nhập họ tên' })}
            className="input-field"
            autoComplete="name"
          />
          {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
          <input
            {...register('email', {
              required: 'Vui lòng nhập email',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
            })}
            type="email"
            className="input-field"
            autoComplete="email"
            inputMode="email"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại *</label>
          <input
            {...register('phone', {
              required: 'Vui lòng nhập số điện thoại',
              pattern: { value: /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/, message: 'SĐT không hợp lệ' },
            })}
            className="input-field"
            autoComplete="tel"
            inputMode="tel"
            type="tel"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ngày sinh</label>
            <input {...register('date_of_birth')} type="date" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giới tính</label>
            <select {...register('gender')} className="input-field">
              <option value="">Chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Size áo</label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(size => (
              <label key={size} className="cursor-pointer">
                <input {...register('shirt_size')} type="radio" value={size} className="sr-only peer" />
                <span className="block px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                  peer-checked:bg-brand-600 peer-checked:text-white peer-checked:border-brand-600
                  hover:border-brand-400 transition-colors">
                  {size}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu *</label>
          <div className="relative">
            <input
              {...register('password', {
                required: 'Vui lòng nhập mật khẩu',
                minLength: { value: 8, message: 'Tối thiểu 8 ký tự' },
              })}
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 p-1"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Xác nhận mật khẩu *</label>
          <input
            {...register('confirm_password', {
              required: 'Vui lòng xác nhận mật khẩu',
              validate: (val) => val === watch('password') || 'Mật khẩu không khớp',
            })}
            type="password"
            className="input-field"
            autoComplete="new-password"
          />
          {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại thành viên</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'vang_lai', label: '⚪ Vãng lai', desc: 'Tham gia không thường xuyên' },
              { value: 'co_dinh', label: '🔵 Thành viên', desc: 'Thành viên\ncâu lạc bộ' },
            ].map(opt => (
              <label key={opt.value} className="cursor-pointer">
                <input {...register('member_type')} type="radio" value={opt.value} className="sr-only peer" defaultChecked={opt.value === 'vang_lai'} />
                <div className="p-3 rounded-xl border-2 border-gray-200 peer-checked:border-brand-500 peer-checked:bg-brand-50 transition-all text-center">
                  <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-line">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trình độ</label>
          <select {...register('level')} className="input-field">
            <option value="">-- Chọn trình độ --</option>
            <option value="yeu">Yếu</option>
            <option value="tb_yeu">Trung bình yếu</option>
            <option value="tb">Trung bình</option>
            <option value="tb_plus">Trung bình+</option>
            <option value="ban_chuyen">Bán chuyên</option>
            <option value="chuyen_nghiep">Chuyên nghiệp</option>
          </select>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 !mt-6"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Tạo tài khoản
        </motion.button>
      </form>

      {pickerOpen && (
        <AvatarPickerModal
          onCancel={() => setPickerOpen(false)}
          onFilePicked={(file) => { setPickerOpen(false); handleFilePicked(file); }}
          onConfirm={(file) => { setPickerOpen(false); handleAvatarReady(file); }}
        />
      )}

      {rawImageSrc && (
        <AvatarCropModal
          imageSrc={rawImageSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
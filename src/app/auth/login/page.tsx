'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { OtpInput } from '@/components/auth/OtpInput';

const RESEND_COOLDOWN = 60;

type ForgotStep = 'closed' | 'email' | 'code' | 'newPassword' | 'done';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { identifier: '', password: '', rememberMe: false },
  });

  // ── Quên mật khẩu ──
  const [forgotStep, setForgotStep] = useState<ForgotStep>('closed');
  const [forgotEmail, setForgotEmail] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const verifyingRef = useRef(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

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

  const resetForgotState = () => {
    setForgotStep('closed');
    setForgotEmail('');
    setCode('');
    setCodeError(false);
    setNewPw('');
    setConfirmPw('');
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(0);
  };

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success(`Chào mừng, ${data.user.full_name}! 👋`);
      router.replace('/home');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 1: nhập email ──
  const onSubmitForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      toast.error('Email không hợp lệ');
      return;
    }
    setEmailSubmitting(true);
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      toast.success('Đã gửi mã xác thực đến email của bạn (nếu email tồn tại)');
      setForgotStep('code');
      startCooldown();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gửi mã thất bại, vui lòng thử lại');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // ── Bước 2: xác thực mã ──
  const verifyResetCode = async (val: string) => {
    if (val.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    try {
      await authApi.verifyResetCode({ email: forgotEmail, code: val });
      setForgotStep('newPassword');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Mã xác thực không đúng');
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

  const onResendResetCode = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.forgotPassword({ email: forgotEmail });
      toast.success('Đã gửi lại mã xác thực');
      setCode('');
      setCodeError(false);
      startCooldown();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gửi lại mã thất bại');
    }
  };

  // ── Bước 3: đặt mật khẩu mới ──
  const onSubmitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setResetSubmitting(true);
    try {
      await authApi.resetPassword({ email: forgotEmail, code, new_password: newPw });
      setForgotStep('done');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đặt lại mật khẩu thất bại');
    } finally {
      setResetSubmitting(false);
    }
  };

  // ══════════════ RENDER: QUÊN MẬT KHẨU ══════════════

  if (forgotStep === 'email') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
        <button
          onClick={resetForgotState}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Quên mật khẩu</h2>
        <p className="text-gray-500 text-sm mb-6">
          Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác thực để bạn đặt lại mật khẩu.
        </p>
        <form onSubmit={onSubmitForgotEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                type="email"
                className="input-field pl-10"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={emailSubmitting}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {emailSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Gửi mã xác thực
          </motion.button>
        </form>
      </div>
    );
  }

  if (forgotStep === 'code') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 text-center">
        <button
          onClick={() => setForgotStep('email')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Đổi email khác
        </button>
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Nhập mã xác thực</h2>
        <p className="text-gray-500 text-sm mb-6">
          Mã 6 số đã được gửi đến <span className="font-medium text-gray-700">{forgotEmail}</span>
        </p>
        <OtpInput
          value={code}
          onChange={handleCodeChange}
          onComplete={(val) => verifyResetCode(val)}
          hasError={codeError}
          shakeSignal={shakeSignal}
          disabled={verifying}
        />
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => verifyResetCode(code)}
          disabled={verifying || code.length !== 6}
          className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
          Xác nhận
        </motion.button>
        <button
          onClick={onResendResetCode}
          disabled={resendCooldown > 0}
          className="text-sm text-brand-600 font-medium mt-4 disabled:text-gray-300"
        >
          {resendCooldown > 0 ? `Gửi lại mã sau ${resendCooldown}s` : 'Gửi lại mã'}
        </button>
      </div>
    );
  }

  if (forgotStep === 'newPassword') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Đặt mật khẩu mới</h2>
        <p className="text-gray-500 text-sm mb-6">
          Tạo mật khẩu mới cho tài khoản <span className="font-medium text-gray-700">{forgotEmail}</span>
        </p>
        <form onSubmit={onSubmitNewPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                type={showNewPw ? 'text' : 'password'}
                className="input-field pr-12"
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
            <input
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              type="password"
              className="input-field"
              autoComplete="new-password"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={resetSubmitting}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resetSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Đặt lại mật khẩu
          </motion.button>
        </form>
      </div>
    );
  }

  if (forgotStep === 'done') {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Đặt lại mật khẩu thành công!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
        </p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={resetForgotState}
          className="btn-primary w-full"
        >
          Về trang đăng nhập
        </motion.button>
      </div>
    );
  }

  // ══════════════ RENDER: ĐĂNG NHẬP (mặc định) ══════════════

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng nhập</h2>
      <p className="text-gray-500 text-sm mb-6">Chào mừng bạn quay trở lại</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email hoặc số điện thoại
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex gap-1 text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              {...register('identifier', { required: 'Vui lòng nhập email hoặc số điện thoại' })}
              className="input-field pl-10"
              autoComplete="username"
              inputMode="email"
            />
          </div>
          {errors.identifier && (
            <p className="text-red-500 text-xs mt-1">{errors.identifier.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
          <div className="relative">
            <input
              {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
              type={showPw ? 'text' : 'password'}
              className="input-field pr-12"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>
          )}
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input {...register('rememberMe')} type="checkbox" className="sr-only peer" />
            <div className="w-10 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-gray-600">
            Ghi nhớ đăng nhập <span className="text-gray-400">(7 ngày)</span>
          </span>
        </label>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 mt-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Đăng nhập
        </motion.button>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setForgotStep('email')}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Quên mật khẩu?
          </button>
        </div>
      </form>
    </div>
  );
}
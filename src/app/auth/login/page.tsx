'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { identifier: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const { data } = await authApi.login(values);
      setAuth(data.user, data.access_token, data.refresh_token, values.rememberMe);
      toast.success(`Chào mừng, ${data.user.full_name}! 👋`);
      router.replace('/home');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Đăng nhập</h2>
      <p className="text-gray-500 text-sm mb-6">Chào mừng bạn quay trở lại</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Identifier */}
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

        {/* Password */}
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

        {/* Remember me */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-200 peer-checked:bg-brand-500 rounded-full transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-gray-600">Ghi nhớ đăng nhập <span className="text-gray-400">(7 ngày)</span></span>
        </label>

        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 mt-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Đăng nhập
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

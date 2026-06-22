'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { profileApi } from '../../../../lib/api';

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await profileApi.updatePassword({ new_password: values.new_password });
      toast.success('Đổi mật khẩu thành công!');
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h1>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">Mật khẩu mới phải có ít nhất 8 ký tự</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu mới *</label>
            <div className="relative">
              <input
                {...register('new_password', {
                  required: 'Vui lòng nhập mật khẩu mới',
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
            {errors.new_password && (
              <p className="text-red-500 text-xs mt-1">{errors.new_password.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Xác nhận mật khẩu mới *</label>
            <input
              {...register('confirm_password', {
                required: 'Vui lòng xác nhận mật khẩu',
                validate: val => val === watch('new_password') || 'Mật khẩu không khớp',
              })}
              type="password"
              className="input-field"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirm_password && (
              <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message as string}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 !mt-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Xác nhận đổi mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
}

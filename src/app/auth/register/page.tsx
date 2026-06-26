'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authApi, profileApi } from '@/lib/api';
import { AvatarCropModal } from '@/components/AvatarCropModal';
import { AvatarPickerModal } from '@/components/AvatarPickerModal';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, setUser } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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

      setAuth(data.user, data.access_token, data.refresh_token, false);

      if (avatarFile) {
        try {
          const { data: avatarData } = await profileApi.uploadAvatar(avatarFile);
          setUser({ ...data.user, avatar_url: avatarData.avatar_url });
        } catch {
          toast.error('Đăng ký thành công nhưng tải ảnh đại diện thất bại. Bạn có thể thêm sau ở Hồ sơ.');
        }
      }

      toast.success('Đăng ký thành công! Chào mừng bạn 🎉');
      router.replace('/home');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Tạo tài khoản</h2>
      <p className="text-gray-500 text-sm mb-6">Điền thông tin để đăng ký</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ── Avatar picker ── */}
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
          <p className="text-xs text-gray-400">Ảnh đại diện (không bắt buộc)</p>
        </div>

        {/* Full name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên *</label>
          <input
            {...register('full_name', { required: 'Vui lòng nhập họ tên' })}
            className="input-field"
            autoComplete="name"
          />
          {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message as string}</p>}
        </div>

        {/* Email */}
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

        {/* Phone */}
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

        {/* DOB + Gender */}
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

        {/* Shirt size */}
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

        {/* Password */}
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

        {/* Confirm password */}
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

        {/* Loại thành viên */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại thành viên</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: 'vang_lai',
                label: '⚪ Vãng lai',
                desc: 'Tham gia không thường xuyên',
              },
              {
                value: 'co_dinh',
                label: '🔵 Thành viên',
                desc: 'Thành viên\ncâu lạc bộ',
              },
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

        {/* Trình độ */}
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

        <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 !mt-6">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Tạo tài khoản
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

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
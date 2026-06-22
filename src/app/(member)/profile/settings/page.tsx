'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, Camera } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { profileApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { AvatarCropModal } from '../../../../components/AvatarCropModal';
import { AvatarPickerModal } from '../../../../components/AvatarPickerModal';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    profileApi.getMe()
      .then(({ data }) => {
        reset({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth?.split('T')[0] || '',
          gender: data.gender || '',
          shirt_size: data.shirt_size || '',
        });
        setCurrentAvatarUrl(data.avatar_url || null);
      })
      .finally(() => setFetching(false));
  }, []);

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
      // 1. Upload avatar trước nếu người dùng đã chọn ảnh mới
      let newAvatarUrl: string | undefined;
      if (avatarFile) {
        const { data: avatarData } = await profileApi.uploadAvatar(avatarFile);
        newAvatarUrl = avatarData.avatar_url;
      }

      // 2. Cập nhật thông tin profile (chỉ khi có thay đổi trên form)
      let updatedUser = null;
      if (isDirty) {
        const { data } = await profileApi.updateMe(values);
        updatedUser = data;
      }

      // 3. Đồng bộ lại store + state cục bộ
      if (updatedUser) {
        setUser(newAvatarUrl ? { ...updatedUser, avatar_url: newAvatarUrl } : updatedUser);
      } else if (newAvatarUrl) {
        setUser({ ...(user as any), avatar_url: newAvatarUrl });
      }

      if (newAvatarUrl) {
        setCurrentAvatarUrl(newAvatarUrl);
        setAvatarFile(null);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      toast.success('Cập nhật thông tin thành công!');
      reset(values);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const selectedSize = watch('shirt_size');
  const displayedAvatar = avatarPreview || currentAvatarUrl;
  const canSubmit = isDirty || Boolean(avatarFile);

  if (fetching) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="card space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profile" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Chỉnh sửa hồ sơ</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ── Avatar card ── */}
        <div className="card flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {displayedAvatar ? (
                <img src={displayedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {watch('full_name')?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors"
              aria-label="Đổi ảnh đại diện"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {avatarFile ? 'Ảnh mới sẽ được lưu khi bạn bấm "Lưu thay đổi"' : 'Ảnh thật hoặc emoji, tối đa 5MB'}
          </p>
        </div>

        {/* Personal info card */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Thông tin cơ bản</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Họ và tên *</label>
            <input
              {...register('full_name', { required: 'Vui lòng nhập họ tên' })}
              className="input-field"
              placeholder="Nguyễn Văn A"
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
              inputMode="email"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Số điện thoại *</label>
            <input
              {...register('phone', {
                required: 'Vui lòng nhập SĐT',
                pattern: { value: /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/, message: 'SĐT không hợp lệ' },
              })}
              className="input-field"
              inputMode="tel"
              type="tel"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
          </div>
        </div>

        {/* Additional info card */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Thông tin bổ sung</h2>

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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Size áo</label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(size => (
                <label key={size} className="cursor-pointer">
                  <input {...register('shirt_size')} type="radio" value={size} className="sr-only" />
                  <span className={`block px-3 py-2 rounded-xl border text-sm font-semibold transition-all
                    ${selectedSize === size
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-400'
                    }`}>
                    {size}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu thay đổi
        </button>
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
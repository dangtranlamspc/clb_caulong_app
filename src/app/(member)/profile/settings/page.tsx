'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, Camera } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { profileApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { AvatarCropModal } from '../../../../components/member/avatars/AvatarCropModal';
import { AvatarPickerModal } from '../../../../components/member/avatars/AvatarPickerModal';

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

  const [locked, setLocked] = useState(true);
  const baseRef = useRef<any>({});

  const { register, handleSubmit, reset, watch, getValues, setValue, formState: { errors, isDirty } } = useForm();

  useEffect(() => {
    profileApi.getMe()
      .then(({ data }) => {
        const initial = {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth?.split('T')[0] || '',
          gender: data.gender || '',
          shirt_size: data.shirt_size || '',
          member_type: data.member_type || 'vang_lai',
          level: data.level || '',
        };
        baseRef.current = initial;
        reset(initial);
        setLocked(data.profile_locked !== false);
        setCurrentAvatarUrl(data.avatar_url || null);
      })
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);


  const lockedRef = useRef(true);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  const LOCKED_FIELDS = ['full_name', 'date_of_birth', 'gender', 'shirt_size', 'member_type', 'level'] as const;

  const syncLock = useCallback(async () => {
    try {
      const { data } = await profileApi.getMe();
      const nowLocked = data.profile_locked !== false;

      if (nowLocked && !lockedRef.current) {
        const server: Record<string, any> = {
          full_name: data.full_name,
          date_of_birth: data.date_of_birth?.split('T')[0] || '',
          gender: data.gender || '',
          shirt_size: data.shirt_size || '',
          member_type: data.member_type || 'vang_lai',
          level: data.level || '',
        };
        LOCKED_FIELDS.forEach((k) => {
          setValue(k, server[k]);
          baseRef.current[k] = server[k];
        });
        toast('Admin vừa khóa chỉnh sửa hồ sơ của bạn', { icon: '🔒' });
      } else if (!nowLocked && lockedRef.current) {
        toast('Admin đã cho phép bạn sửa toàn bộ hồ sơ', { icon: '🔓' });
      }
      setLocked(nowLocked);
    } catch {
    }
  }, [setValue]);


  useEffect(() => {
    const interval = setInterval(syncLock, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') syncLock(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', syncLock);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', syncLock);
    };
  }, [syncLock]);

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
      let newAvatarUrl: string | undefined;
      if (avatarFile) {
        const { data: avatarData } = await profileApi.uploadAvatar(avatarFile);
        newAvatarUrl = avatarData.avatar_url;
      }


      let updatedUser = null;
      if (isDirty) {
        const payload = locked
          ? { email: values.email, phone: values.phone }
          : values;
        const { data } = await profileApi.updateMe(payload);
        updatedUser = data;
      }

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
      const next = locked
        ? { ...baseRef.current, email: values.email, phone: values.phone }
        : values;
      baseRef.current = next;
      reset(next);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Cập nhật thất bại');
      if (err?.response?.status === 403) syncLock();
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
        <div className="h-8 w-40 bg-[var(--border-strong)] rounded animate-pulse" />
        <div className="card space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[var(--surface-muted)] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const lockedCls = 'disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface-hover)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Chỉnh sửa hồ sơ</h1>
      </div>

      {locked && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--warning-soft)] text-[var(--warning)] text-xs font-medium px-3 py-2.5">
          🔒 Hồ sơ đang được khóa. Bạn chỉ có thể đổi email, số điện thoại và mật khẩu. Liên hệ admin nếu cần chỉnh sửa thông tin khác.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card flex flex-col items-center gap-3 py-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--surface-muted)] border-2 border-[var(--border)] flex items-center justify-center">
              {displayedAvatar ? (
                <img src={displayedAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[var(--text-faint)]">
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
          <p className="text-xs text-[var(--text-faint)] text-center">
            {avatarFile ? 'Ảnh mới sẽ được lưu khi bạn bấm "Lưu thay đổi"' : 'Ảnh thật hoặc emoji, tối đa 5MB'}
          </p>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-[var(--text)] text-sm uppercase tracking-wide">Thông tin cơ bản</h2>

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Họ và tên *</label>
            <input
              {...register('full_name', { required: 'Vui lòng nhập họ tên' })}
              disabled={locked}
              className={`input-field ${lockedCls}`}
            />
            {errors.full_name && <p className="text-[var(--danger)] text-xs mt-1">{errors.full_name.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Email *</label>
            <input
              {...register('email', {
                required: 'Vui lòng nhập email',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
              })}
              type="email"
              className="input-field"
              inputMode="email"
            />
            {errors.email && <p className="text-[var(--danger)] text-xs mt-1">{errors.email.message as string}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Số điện thoại *</label>
            <input
              {...register('phone', {
                required: 'Vui lòng nhập SĐT',
                pattern: { value: /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/, message: 'SĐT không hợp lệ' },
              })}
              className="input-field"
              inputMode="tel"
              type="tel"
            />
            {errors.phone && <p className="text-[var(--danger)] text-xs mt-1">{errors.phone.message as string}</p>}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-[var(--text)] text-sm uppercase tracking-wide">Thông tin bổ sung</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Ngày sinh</label>
              <input {...register('date_of_birth')} type="date" disabled={locked} className={`input-field ${lockedCls}`} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Giới tính</label>
              <select {...register('gender')} disabled={locked} className={`input-field ${lockedCls}`}>
                <option value="">Chọn</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">Size áo</label>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(size => (
                <label key={size} className={locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
                  <input {...register('shirt_size')} type="radio" value={size} disabled={locked} className="sr-only" />
                  <span className={`block px-3 py-2 rounded-xl border text-sm font-semibold transition-all
                    ${selectedSize === size
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)] hover:border-brand-400'
                    }`}>
                    {size}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="card space-y-4">
            <h2 className="font-semibold text-[var(--text)] text-sm uppercase tracking-wide">Thành viên & trình độ</h2>

            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Loại thành viên</label>
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
                  <label key={opt.value} className={locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
                    <input {...register('member_type')} type="radio" value={opt.value} disabled={locked} className="sr-only peer" />
                    <div className="p-3 rounded-xl border-2 border-[var(--border)] peer-checked:border-brand-500 peer-checked:bg-brand-50 transition-all text-center">
                      <p className="text-sm font-semibold text-[var(--text)]">{opt.label}</p>
                      <p className="text-xs text-[var(--text-faint)] mt-0.5 whitespace-pre-line">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">Trình độ</label>
              <select {...register('level')} disabled={locked} className={`input-field ${lockedCls}`}>
                <option value="">-- Chọn trình độ --</option>
                <option value="yeu">Yếu</option>
                <option value="tb_yeu">Trung bình yếu</option>
                <option value="tb">Trung bình</option>
                <option value="tb_plus">Trung bình+</option>
                <option value="ban_chuyen">Bán chuyên</option>
                <option value="chuyen_nghiep">Chuyên nghiệp</option>
              </select>
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
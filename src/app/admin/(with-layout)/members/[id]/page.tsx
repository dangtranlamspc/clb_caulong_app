'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { membersAdminApi } from '@/lib/api';
import { CustomSelect } from '@/components/admin/sessions/CustomSelect';

const GENDER_OPTIONS = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
];

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => ({ value: s, label: s }));

const LEVEL_OPTIONS = [
    { value: 'yeu', label: 'Yếu' },
    { value: 'tb_yeu', label: 'TB yếu' },
    { value: 'tb', label: 'TB' },
    { value: 'tb_plus', label: 'TB+' },
    { value: 'ban_chuyen', label: 'Bán chuyên (BC)' },
    { value: 'chuyen_nghiep', label: 'Chuyên nghiệp' },
];

const MEMBER_TYPE_OPTIONS = [
    { value: 'vang_lai', label: 'Vãng lai' },
    { value: 'co_dinh', label: 'Thành viên' },
];

const MEMBER_SUBTYPE_OPTIONS = [
    { value: 'thuong', label: 'Thường' },
    { value: 'vip', label: 'VIP' },
];

const ROLE_OPTIONS = [
    { value: 'member', label: 'Thành viên' },
    { value: 'admin', label: 'Admin' },
];

const inputCls = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-400';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5';

export default function AdminMemberEditPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: '', email: '', phone: '',
        date_of_birth: '', gender: '', shirt_size: '',
        level: '', member_type: 'vang_lai', member_subtype: 'thuong', role: 'member',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        membersAdminApi.get(id)
            .then(({ data }) => {
                setForm({
                    full_name: data.full_name ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                    date_of_birth: data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '',
                    gender: data.gender ?? '',
                    shirt_size: data.shirt_size ?? '',
                    level: data.level ?? '',
                    member_type: data.member_type ?? 'vang_lai',
                    member_subtype: data.member_subtype ?? 'thuong',
                    role: data.role ?? 'member',
                });
            })
            .catch(() => {
                toast.error('Không tải được thông tin thành viên');
                router.push('/admin/members');
            })
            .finally(() => setLoading(false));
    }, [id, router]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Bắt buộc';
        if (!form.email.trim()) e.email = 'Bắt buộc';
        if (!form.phone.trim()) e.phone = 'Bắt buộc';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!id || !validate()) return;
        setSaving(true);
        try {
            const payload = {
                full_name: form.full_name,
                email: form.email,
                phone: form.phone,
                date_of_birth: form.date_of_birth || undefined,
                gender: form.gender || undefined,
                shirt_size: form.shirt_size || undefined,
                member_type: form.member_type,
                member_subtype: form.member_type === 'co_dinh' ? form.member_subtype : undefined,
                level: form.level || undefined,
                role: form.role,
            };
            await membersAdminApi.update(id, payload);
            toast.success('Cập nhật thành công!');
            router.push('/admin/members');
        } catch {
        } finally {
            setSaving(false);
        }
    };

    const onChangePassword = async () => {
        if (!id) return;
        if (!newPassword || newPassword.length < 8) {
            setPasswordError('Tối thiểu 8 ký tự');
            return;
        }
        setPasswordError('');
        setPasswordSaving(true);
        try {
            await membersAdminApi.updatePassword(id, { new_password: newPassword });
            toast.success('Đã đổi mật khẩu!');
            setNewPassword('');
            setShowPasswordForm(false);
        } catch {
        } finally {
            setPasswordSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-56 animate-pulse" />
                <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/admin/members')} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">Chỉnh sửa thành viên</h1>
            </div>

            <form onSubmit={onSubmit} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                <div>
                    <label className={labelCls}>Họ và tên *</label>
                    <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCls} placeholder="Nguyễn Văn A" />
                    {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                </div>

                <div>
                    <label className={labelCls}>Email *</label>
                    <input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" className={inputCls} placeholder="user@example.com" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                    <label className={labelCls}>Số điện thoại *</label>
                    <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} placeholder="0901234567" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Ngày sinh</label>
                        <input value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} type="date" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Giới tính</label>
                        <CustomSelect
                            value={form.gender}
                            onChange={(val) => set('gender', val)}
                            options={GENDER_OPTIONS}
                            placeholder="Chọn giới tính"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Size áo</label>
                        <CustomSelect
                            value={form.shirt_size}
                            onChange={(val) => set('shirt_size', val)}
                            options={SIZE_OPTIONS}
                            placeholder="Chọn size"
                        />
                    </div>
                    <div>
                        <label className={labelCls}>Trình độ</label>
                        <CustomSelect
                            value={form.level}
                            onChange={(val) => set('level', val)}
                            options={LEVEL_OPTIONS}
                            placeholder="Chưa xác định"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Phân cấp thành viên</label>
                        <CustomSelect
                            value={form.member_type}
                            onChange={(val) => set('member_type', val)}
                            options={MEMBER_TYPE_OPTIONS}
                        />
                    </div>
                    {form.member_type === 'co_dinh' && (
                        <div>
                            <label className={labelCls}>Loại thành viên</label>
                            <CustomSelect
                                value={form.member_subtype}
                                onChange={(val) => set('member_subtype', val)}
                                options={MEMBER_SUBTYPE_OPTIONS}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelCls}>Vai trò</label>
                    <CustomSelect
                        value={form.role}
                        onChange={(val) => set('role', val)}
                        options={ROLE_OPTIONS}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => router.push('/admin/members')} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100">
                        Hủy
                    </button>
                    <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 flex items-center gap-2 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </button>
                </div>
            </form>

            {/* Đổi mật khẩu — tách riêng vì là action độc lập */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                <button
                    type="button"
                    onClick={() => setShowPasswordForm((s) => !s)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                >
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    Đổi mật khẩu
                </button>

                {showPasswordForm && (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                        <div>
                            <label className={labelCls}>Mật khẩu mới</label>
                            <input
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                                type="password"
                                className={inputCls}
                                placeholder="Tối thiểu 8 ký tự"
                            />
                            {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onChangePassword}
                                disabled={passwordSaving}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 flex items-center gap-2 disabled:opacity-60"
                            >
                                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                Cập nhật mật khẩu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
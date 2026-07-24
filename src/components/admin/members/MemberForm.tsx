'use client';
import { useEffect, useState } from 'react';
import { Loader2, Save, KeyRound } from 'lucide-react';
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

const emptyForm = {
    full_name: '', email: '', phone: '', password: '',
    date_of_birth: '', gender: '', shirt_size: '',
    level: '', member_type: 'vang_lai', member_subtype: 'thuong', role: 'member',
};

type MemberFormProps = {
    mode: 'create' | 'edit';
    memberId?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onOpenChangePassword?: () => void;
};

export default function MemberForm({ mode, memberId, onSuccess, onCancel, onOpenChangePassword }: MemberFormProps) {
    const isEdit = mode === 'edit';
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        if (!isEdit || !memberId) return;
        setLoading(true);
        membersAdminApi.get(memberId)
            .then(({ data }) => {
                setForm({
                    full_name: data.full_name ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                    password: '',
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
                onCancel();
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, memberId]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Bắt buộc';
        if (!form.email.trim()) e.email = 'Bắt buộc';
        if (!form.phone.trim()) e.phone = 'Bắt buộc';
        if (!isEdit && (!form.password || form.password.length < 8)) e.password = 'Tối thiểu 8 ký tự';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const payload: any = {
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

            if (isEdit) {
                await membersAdminApi.update(memberId as string, payload);
                toast.success('Cập nhật thành công!');
            } else {
                payload.password = form.password;
                await membersAdminApi.create(payload);
                toast.success('Tạo tài khoản thành công!');
            }
            onSuccess();
        } catch {
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
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

            {!isEdit && (
                <div>
                    <label className={labelCls}>Mật khẩu *</label>
                    <input value={form.password} onChange={(e) => set('password', e.target.value)} type="password" className={inputCls} placeholder="••••••••" />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Ngày sinh</label>
                    <input value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} type="date" className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Giới tính</label>
                    <CustomSelect value={form.gender} onChange={(val) => set('gender', val)} options={GENDER_OPTIONS} placeholder="Chọn giới tính" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Size áo</label>
                    <CustomSelect value={form.shirt_size} onChange={(val) => set('shirt_size', val)} options={SIZE_OPTIONS} placeholder="Chọn size" />
                </div>
                <div>
                    <label className={labelCls}>Trình độ</label>
                    <CustomSelect value={form.level} onChange={(val) => set('level', val)} options={LEVEL_OPTIONS} placeholder="Chưa xác định" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Phân cấp thành viên</label>
                    <CustomSelect value={form.member_type} onChange={(val) => set('member_type', val)} options={MEMBER_TYPE_OPTIONS} />
                </div>
                {form.member_type === 'co_dinh' && (
                    <div>
                        <label className={labelCls}>Loại thành viên</label>
                        <CustomSelect value={form.member_subtype} onChange={(val) => set('member_subtype', val)} options={MEMBER_SUBTYPE_OPTIONS} />
                    </div>
                )}
            </div>

            <div>
                <label className={labelCls}>Vai trò</label>
                <CustomSelect value={form.role} onChange={(val) => set('role', val)} options={ROLE_OPTIONS} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100">
                    Hủy
                </button>

                {isEdit && (
                    <button
                        type="button"
                        onClick={onOpenChangePassword}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <KeyRound className="w-4 h-4" />
                        Đổi mật khẩu
                    </button>
                )}

                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 flex items-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isEdit ? 'Cập nhật' : 'Tạo tài khoản'}
                </button>
            </div>
        </form>
    );
}
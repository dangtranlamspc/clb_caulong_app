'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { membersAdminApi } from '@/lib/api';

const GENDER_OPTIONS = [
    { value: '', label: 'Chọn giới tính' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
];

const SIZE_OPTIONS = ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const LEVEL_OPTIONS = [
    { value: '', label: 'Chưa xác định' },
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

export default function AdminMemberCreatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        full_name: '', email: '', phone: '', password: '',
        date_of_birth: '', gender: '', shirt_size: '',
        level: '', member_type: 'vang_lai', member_subtype: 'thuong', role: 'member',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.full_name.trim()) e.full_name = 'Bắt buộc';
        if (!form.email.trim()) e.email = 'Bắt buộc';
        if (!form.phone.trim()) e.phone = 'Bắt buộc';
        if (!form.password || form.password.length < 8) e.password = 'Tối thiểu 8 ký tự';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                full_name: form.full_name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                date_of_birth: form.date_of_birth || undefined,
                gender: form.gender || undefined,
                shirt_size: form.shirt_size || undefined,
                member_type: form.member_type,
                member_subtype: form.member_type === 'co_dinh' ? form.member_subtype : undefined,
                level: form.level || undefined,
                role: form.role,
            };
            await membersAdminApi.create(payload);
            toast.success('Tạo tài khoản thành công!');
            router.push('/admin/members');
        } catch {
            // lỗi đã được xử lý ở interceptor
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/admin/members')} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">Thêm thành viên mới</h1>
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

                <div>
                    <label className={labelCls}>Mật khẩu *</label>
                    <input value={form.password} onChange={(e) => set('password', e.target.value)} type="password" className={inputCls} placeholder="••••••••" />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Ngày sinh</label>
                        <input value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} type="date" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Giới tính</label>
                        <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
                            {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Size áo</label>
                        <select value={form.shirt_size} onChange={(e) => set('shirt_size', e.target.value)} className={inputCls}>
                            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s || 'Chọn size'}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Trình độ</label>
                        <select value={form.level} onChange={(e) => set('level', e.target.value)} className={inputCls}>
                            {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Phân cấp thành viên</label>
                        <select
                            value={form.member_type}
                            onChange={(e) => set('member_type', e.target.value)}
                            className={inputCls}
                        >
                            {MEMBER_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    {form.member_type === 'co_dinh' && (
                        <div>
                            <label className={labelCls}>Loại thành viên</label>
                            <select value={form.member_subtype} onChange={(e) => set('member_subtype', e.target.value)} className={inputCls}>
                                {MEMBER_SUBTYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelCls}>Vai trò</label>
                    <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
                        {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => router.push('/admin/members')} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100">
                        Hủy
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 flex items-center gap-2 disabled:opacity-60">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Tạo tài khoản
                    </button>
                </div>
            </form>
        </div>
    );
}
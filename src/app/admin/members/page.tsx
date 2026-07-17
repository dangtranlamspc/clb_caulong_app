'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search, Plus, Download, Filter, ChevronLeft, ChevronRight,
    Trash2, ToggleLeft, ToggleRight, Eye,
    PencilIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { membersAdminApi } from '@/lib/api';

const LEVEL_LABEL: Record<string, string> = {
    yeu: 'Yếu', tb_yeu: 'TB yếu', tb: 'TB', tb_plus: 'TB+',
    ban_chuyen: 'BC', chuyen_nghiep: 'Chuyên nghiệp',
};

const ROLE_OPTIONS = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'member', label: 'Thành viên' },
    { value: 'admin', label: 'Admin' },
];

const MEMBER_TYPE_OPTIONS = [
    { value: '', label: 'Tất cả phân cấp' },
    { value: 'vang_lai', label: 'Vãng lai' },
    { value: 'co_dinh', label: 'Thành viên' },
];

const LEVEL_OPTIONS = [
    { value: '', label: 'Tất cả trình độ' },
    { value: 'yeu', label: 'Yếu' },
    { value: 'tb_yeu', label: 'TB yếu' },
    { value: 'tb', label: 'TB' },
    { value: 'tb_plus', label: 'TB+' },
    { value: 'ban_chuyen', label: 'Bán chuyên (BC)' },
    { value: 'chuyen_nghiep', label: 'Chuyên nghiệp' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'true', label: 'Đang hoạt động' },
    { value: 'false', label: 'Vô hiệu hóa' },
];

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-xs font-medium text-gray-700 border border-gray-200 rounded-xl px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

function Avatar({ user, sizeClass = 'w-10 h-10 text-sm' }: { user: any; sizeClass?: string }) {
    const [imgError, setImgError] = useState(false);
    const initial = user.full_name?.[0]?.toUpperCase() ?? '?';

    if (user.avatar_url && !imgError) {
        return (
            <img
                src={user.avatar_url}
                alt={user.full_name}
                className={`rounded-full object-cover flex-shrink-0 ${sizeClass}`}
                onError={() => setImgError(true)}
            />
        );
    }
    return (
        <div className={`rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0 ${sizeClass}`}>
            {initial}
        </div>
    );
}

function MemberTypeBadge({ user }: { user: any }) {
    if (user.member_type === 'co_dinh') {
        const isVip = user.member_subtype === 'vip';
        return (
            <div className="flex flex-col gap-1 items-end">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 w-fit">
                    Thành viên
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${isVip ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isVip ? '⭐ VIP' : 'Thường'}
                </span>
            </div>
        );
    }
    const isQuen = user.vang_lai_status === 'khach_quen';
    return (
        <div className="flex flex-col gap-1 items-end">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 w-fit">
                Vãng lai
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${isQuen ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                {user.vang_lai_label ?? (isQuen ? 'Khách quen' : 'Khách mới')}
                {typeof user.attendance_count === 'number' && <span className="opacity-60"> · {user.attendance_count}</span>}
            </span>
        </div>
    );
}

export default function AdminMembersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialMemberType = searchParams.get('member_type') ?? '';
    const initialMemberSubtype = searchParams.get('member_subtype') ?? '';

    const [users, setUsers] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState({
        search: '', role: '', is_active: '',
        member_type: initialMemberType,
        member_subtype: initialMemberSubtype,
        level: '',
        page: 1, limit: 20,
    });
    const [showFilters, setShowFilters] = useState(!!initialMemberType);
    const [exporting, setExporting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ''));
            const { data } = await membersAdminApi.list(params);
            setUsers(data.data);
            setMeta(data.meta);
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ''));
            const { data } = await membersAdminApi.export(params);
            const url = URL.createObjectURL(new Blob([data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `members_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Xuất Excel thành công!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Xuất Excel thất bại');
        } finally {
            setExporting(false);
        }
    };

    const handleToggleActive = async (id: string) => {
        setActionLoading(id);
        try {
            const { data } = await membersAdminApi.toggleActive(id);
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: data.is_active } : u)));
            toast.success(`Đã ${data.is_active ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thao tác thất bại');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa thành viên "${name}"? Hành động này không thể hoàn tác.`)) return;
        setActionLoading(id);
        try {
            await membersAdminApi.delete(id);
            toast.success('Đã xóa thành viên');
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Xóa thất bại');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Quản lý thành viên</h1>
                    <p className="text-gray-400 text-xs mt-0.5">{meta.total ?? 0} người dùng</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-50"
                        title="Xuất Excel"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <Link
                        href="/admin/members/create"
                        className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200"
                        title="Thêm mới"
                    >
                        <Plus className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* Search + filter */}
            <div className="bg-white rounded-2xl p-3 border border-gray-100 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={query.search}
                            onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value, page: 1 }))}
                            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="Tìm tên, email, SĐT..."
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                        <Select value={query.role} onChange={(v) => setQuery((q) => ({ ...q, role: v, page: 1 }))} options={ROLE_OPTIONS} />
                        <Select
                            value={query.member_type}
                            onChange={(v) => setQuery((q) => ({ ...q, member_type: v, member_subtype: v === 'co_dinh' ? q.member_subtype : '', page: 1 }))}
                            options={MEMBER_TYPE_OPTIONS}
                        />
                        <Select value={query.level} onChange={(v) => setQuery((q) => ({ ...q, level: v, page: 1 }))} options={LEVEL_OPTIONS} />
                        <Select value={query.is_active} onChange={(v) => setQuery((q) => ({ ...q, is_active: v, page: 1 }))} options={STATUS_OPTIONS} />
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-2.5">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                    ))
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-2xl py-10 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">Không tìm thấy dữ liệu</p>
                    </div>
                ) : users.map((user) => (
                    <div key={user.id} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar user={user} sizeClass="w-11 h-11 text-sm" />
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                                </div>
                            </div>
                            <MemberTypeBadge user={user} />
                        </div>

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {user.role === 'admin' ? 'Admin' : 'Thành viên'}
                                </span>
                                {user.level && (
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-semibold">
                                        {LEVEL_LABEL[user.level] ?? user.level}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2.5 border-t border-gray-100">
                            <Link
                                href={`/admin/members/${user.id}`}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                            >
                                <PencilIcon className="w-3.5 h-3.5" /> Chỉnh sửa
                            </Link>
                            <button
                                onClick={() => handleToggleActive(user.id)}
                                disabled={actionLoading === user.id}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50 ${user.is_active ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            >
                                {user.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                {user.is_active ? 'Tạm ẩn' : 'Kích hoạt'}
                            </button>
                            <button
                                onClick={() => handleDelete(user.id, user.full_name)}
                                disabled={actionLoading === user.id}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {meta.total_pages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-gray-100">
                    <p className="text-xs text-gray-500">
                        Trang {meta.page} / {meta.total_pages} ({meta.total})
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
                            disabled={meta.page <= 1}
                            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
                            disabled={meta.page >= meta.total_pages}
                            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
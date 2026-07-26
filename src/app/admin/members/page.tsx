'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search, Plus, Download, Filter, ChevronLeft, ChevronRight,
    Trash2, ToggleLeft, ToggleRight, Eye,
    Check,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { membersAdminApi } from '@/lib/api';
import GradientBorderButton from '@/components/ui/GradientBorderButton';
import Modal from '@/components/ui/Modal';
import MemberForm from '@/components/admin/members/MemberForm';
import ChangePasswordModal from '@/components/admin/members/ChangePasswordModal';

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => ({ value: s, label: s }));

const LEVEL_LABEL: Record<string, string> = {
    yeu: 'Yếu', tb_yeu: 'TB yếu', tb: 'TB', tb_plus: 'TB+',
    ban_chuyen: 'BC', chuyen_nghiep: 'Chuyên nghiệp',
};

const ROLE_OPTIONS = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'member', label: 'Thành viên' },
    { value: 'admin', label: 'Admin' },
];

const GENDER_OPTIONS = [
    { value: '', label: 'Tất cả giới tính' },
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Khác' },
];

const SHIRT_SIZE_OPTIONS = [
    { value: '', label: 'Tất cả size' },
    ...SIZE_OPTIONS,
];

const MEMBER_TYPE_OPTIONS = [
    { value: '', label: 'Tất cả phân cấp' },
    { value: 'vang_lai', label: 'Vãng lai' },
    { value: 'co_dinh', label: 'Thành viên' },
];

const MEMBER_SUBTYPE_OPTIONS = [
    { value: '', label: 'Tất cả loại' },
    { value: 'thuong', label: 'Thường' },
    { value: 'vip', label: 'VIP' },
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

const APPROVAL_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả duyệt' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Đã từ chối' },
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

function ApprovalBadge({ user }: { user: any }) {
    if (user.email_verified === false) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit bg-sky-50 text-sky-700">
                ✉️ Chưa xác thực email
            </span>
        );
    }
    if (!user.approval_status || user.approval_status === 'approved') return null;
    const isPending = user.approval_status === 'pending';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit ${isPending ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
            }`}>
            {isPending ? '⏳ Chờ duyệt' : '✕ Đã từ chối'}
        </span>
    );
}

function MemberTypeBadge({ user }: { user: any }) {
    if (user.member_type === 'co_dinh') {
        const isVip = user.member_subtype === 'vip';
        return (
            <div className="flex flex-col gap-1">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 w-fit">
                    Thành viên
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${isVip ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isVip ? '⭐ VIP' : 'Thường'}
                </span>
            </div>
        );
    }
    const isQuen = user.vang_lai_status === 'khach_quen';
    return (
        <div className="flex flex-col gap-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 w-fit">
                Vãng lai
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${isQuen ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                {user.vang_lai_label ?? (isQuen ? 'Khách quen' : 'Khách mới')}
                {typeof user.attendance_count === 'number' && <span className="opacity-60"> · {user.attendance_count}</span>}
            </span>
        </div>
    );
}

function RowActions({
    user,
    actionLoading,
    onEdit,
    onToggleActive,
    onDelete,
    onApprove,
    onReject,
    variant = 'table',
}: {
    user: any;
    actionLoading: string | null;
    onEdit: (id: string) => void;
    onToggleActive: (id: string) => void;
    onDelete: (id: string, name: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string, name: string) => void;
    variant?: 'table' | 'mobile';
}) {
    const busy = actionLoading === user.id;
    const canReview = user.approval_status === 'pending' && user.email_verified !== false;

    if (variant === 'mobile') {
        return (
            <div className="flex flex-col gap-2">
                {canReview && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onApprove(user.id)}
                            disabled={busy}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                            <Check className="w-3.5 h-3.5" /> Duyệt
                        </button>
                        <button
                            onClick={() => onReject(user.id, user.full_name)}
                            disabled={busy}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            <X className="w-3.5 h-3.5" /> Từ chối
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(user.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" /> Xem
                    </button>
                    <button
                        onClick={() => onToggleActive(user.id)}
                        disabled={busy}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50 ${user.is_active ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
                            }`}
                    >
                        {user.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {user.is_active ? 'Tạm ẩn' : 'Kích hoạt'}
                    </button>
                    <button
                        onClick={() => onDelete(user.id, user.full_name)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-end gap-1">
            {canReview && (
                <>
                    <button
                        onClick={() => onApprove(user.id)}
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Duyệt"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onReject(user.id, user.full_name)}
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Từ chối"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </>
            )}
            <button
                onClick={() => onEdit(user.id)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Xem / Sửa"
            >
                <Eye className="w-4 h-4" />
            </button>
            <button
                onClick={() => onToggleActive(user.id)}
                disabled={busy}
                className={`p-1.5 rounded-lg transition-colors ${user.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                title={user.is_active ? 'Tạm ẩn' : 'Kích hoạt'}
            >
                {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
            <button
                onClick={() => onDelete(user.id, user.full_name)}
                disabled={busy}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Xóa"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function AdminMembersPage() {
    const searchParams = useSearchParams();

    const initialMemberType = searchParams.get('member_type') ?? '';
    const initialMemberSubtype = searchParams.get('member_subtype') ?? '';

    const [users, setUsers] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [query, setQuery] = useState({
        search: '', role: '', gender: '', shirt_size: '', is_active: '',
        approval_status: '',
        member_type: initialMemberType,
        member_subtype: initialMemberSubtype,
        level: '',
        page: 1, limit: 20,
    });
    const [showFilters, setShowFilters] = useState(!!initialMemberType);
    const [exporting, setExporting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [formModal, setFormModal] = useState<{ open: boolean; mode: 'create' | 'edit'; memberId: string | null }>({
        open: false,
        mode: 'create',
        memberId: null,
    });
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [rejectConfirm, setRejectConfirm] = useState<{ id: string; name: string } | null>(null);


    const openCreateModal = () => setFormModal({ open: true, mode: 'create', memberId: null });
    const openEditModal = (id: string) => setFormModal({ open: true, mode: 'edit', memberId: id });
    const closeFormModal = () => setFormModal((f) => ({ ...f, open: false }));

    useEffect(() => {
        const t = setTimeout(() => {
            setQuery((q) => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 }));
        }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== ''));
            const { data } = await membersAdminApi.list(params);
            setUsers(data.data);
            setMeta(data.meta);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                toast.error('Thao tác quá nhanh, vui lòng thử lại sau vài giây');
            }
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

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        try {
            await membersAdminApi.approve(id);
            toast.success('Đã duyệt tài khoản');
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Duyệt thất bại');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = (id: string, name: string) => {
        setRejectConfirm({ id, name });
    };

    const confirmReject = async () => {
        if (!rejectConfirm) return;
        const { id } = rejectConfirm;
        setActionLoading(id);
        try {
            await membersAdminApi.reject(id);
            toast.success('Đã từ chối tài khoản đăng ký');
            fetchUsers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thao tác thất bại');
        } finally {
            setActionLoading(null);
            setRejectConfirm(null);
        }
    };


    const handleOpenChangePassword = () => {
        setFormModal((f) => ({ ...f, open: false }));
        setPasswordModalOpen(true);
    };

    const handleClosePasswordModal = () => {
        setPasswordModalOpen(false);
        setFormModal((f) => ({ ...f, open: true }));
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý thành viên</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{meta.total ?? 0} người dùng</p>
                </div>
                <div className="flex-1" />
                <GradientBorderButton
                    onClick={handleExport}
                    disabled={exporting}
                    className="relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
                </GradientBorderButton>
                <GradientBorderButton
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Thêm mới</span>
                </GradientBorderButton>
            </div>

            {/* Search + filter */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="Tìm kiếm tên, email, SĐT..."
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Bộ lọc</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-gray-100">
                        <Select value={query.role} onChange={(v) => setQuery((q) => ({ ...q, role: v, page: 1 }))} options={ROLE_OPTIONS} />
                        <Select value={query.gender} onChange={(v) => setQuery((q) => ({ ...q, gender: v, page: 1 }))} options={GENDER_OPTIONS} />
                        <Select value={query.shirt_size} onChange={(v) => setQuery((q) => ({ ...q, shirt_size: v, page: 1 }))} options={SHIRT_SIZE_OPTIONS} />
                        <Select
                            value={query.member_type}
                            onChange={(v) => setQuery((q) => ({ ...q, member_type: v, member_subtype: v === 'co_dinh' ? q.member_subtype : '', page: 1 }))}
                            options={MEMBER_TYPE_OPTIONS}
                        />
                        {query.member_type === 'co_dinh' && (
                            <Select
                                value={query.member_subtype}
                                onChange={(v) => setQuery((q) => ({ ...q, member_subtype: v, page: 1 }))}
                                options={MEMBER_SUBTYPE_OPTIONS}
                            />
                        )}
                        <Select value={query.level} onChange={(v) => setQuery((q) => ({ ...q, level: v, page: 1 }))} options={LEVEL_OPTIONS} />
                        <Select value={query.is_active} onChange={(v) => setQuery((q) => ({ ...q, is_active: v, page: 1 }))} options={STATUS_OPTIONS} />
                        <Select value={query.approval_status} onChange={(v) => setQuery((q) => ({ ...q, approval_status: v, page: 1 }))} options={APPROVAL_STATUS_OPTIONS} />
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Mobile card view */}
                <div className="md:hidden bg-gray-50 p-3 space-y-3">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="p-4 space-y-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                                        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : users.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
                            Không tìm thấy dữ liệu
                        </div>
                    ) : users.map((user) => (
                        <div key={user.id} className="p-4 space-y-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar user={user} sizeClass="w-10 h-10 text-sm" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                                    </div>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {user.is_active ? 'Hoạt động' : 'Vô hiệu hoá'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {user.role === 'admin' ? 'Admin' : 'Thành viên'}
                                    </span>
                                    {user.level && (
                                        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">
                                            {LEVEL_LABEL[user.level] ?? user.level}
                                        </span>
                                    )}
                                    <ApprovalBadge user={user} />
                                </div>
                                <MemberTypeBadge user={user} />

                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <RowActions
                                    user={user}
                                    actionLoading={actionLoading}
                                    onEdit={openEditModal}
                                    onToggleActive={handleToggleActive}
                                    onDelete={handleDelete}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    variant="mobile"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Họ và tên</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Email</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">SĐT</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Trình độ</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Vai trò</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden sm:table-cell">Phân cấp</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(8)].map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                        Không tìm thấy dữ liệu
                                    </td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar user={user} sizeClass="w-9 h-9 text-sm" />
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                                                <p className="text-xs text-gray-400 md:hidden truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{user.email}</td>
                                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.phone}</td>
                                    <td className="px-4 py-3 hidden lg:table-cell">
                                        {user.level ? (
                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">
                                                {LEVEL_LABEL[user.level] ?? user.level}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {user.role === 'admin' ? 'Admin' : 'Thành viên'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <MemberTypeBadge user={user} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                                        </span>
                                        <div className="mt-1"><ApprovalBadge user={user} /></div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <RowActions
                                            user={user}
                                            actionLoading={actionLoading}
                                            onEdit={openEditModal}
                                            onToggleActive={handleToggleActive}
                                            onDelete={handleDelete}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination — chung cho cả mobile & desktop */}
                {meta.total_pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Trang {meta.page} / {meta.total_pages} ({meta.total} kết quả)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
                                disabled={meta.page <= 1}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
                                disabled={meta.page >= meta.total_pages}
                                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                <Modal
                    isOpen={formModal.open}
                    onClose={closeFormModal}
                    title={formModal.mode === 'create' ? 'Thêm thành viên mới' : 'Chỉnh sửa thành viên'}
                >
                    <MemberForm
                        key={formModal.mode === 'edit' ? formModal.memberId ?? 'edit' : 'create'}
                        mode={formModal.mode}
                        memberId={formModal.memberId ?? undefined}
                        onSuccess={() => {
                            closeFormModal();
                            fetchUsers();
                        }}
                        onCancel={closeFormModal}
                        onOpenChangePassword={formModal.mode === 'edit' ? handleOpenChangePassword : undefined}
                    />
                </Modal>

                <ChangePasswordModal
                    isOpen={passwordModalOpen}
                    onClose={handleClosePasswordModal}
                    memberId={formModal.memberId}
                />

                <Modal
                    isOpen={!!rejectConfirm}
                    onClose={() => setRejectConfirm(null)}
                    title="Từ chối đăng ký"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Từ chối yêu cầu đăng ký của{' '}
                            <span className="font-semibold text-gray-900">{rejectConfirm?.name}</span>?
                            Tài khoản sẽ chuyển sang trạng thái <span className="font-medium text-red-600">Đã từ chối</span> và
                            bị vô hiệu hóa, không thể đăng nhập.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setRejectConfirm(null)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={actionLoading === rejectConfirm?.id}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading === rejectConfirm?.id && (
                                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                )}
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>


    );
}
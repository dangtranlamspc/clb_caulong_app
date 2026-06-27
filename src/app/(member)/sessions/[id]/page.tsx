'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft, CalendarDays, MapPin, Clock, Users,
    CheckCircle2, Hourglass, AlertCircle, Copy, ExternalLink,
    Loader2, XCircle, ImagePlus, X as XIcon,
    UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi, registrationsApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';
import { supabase } from '@/lib/supabase';

const STATUS_CFG: Record<string, { label: string; cls: string; icon: any }> = {
    pending: { label: 'Chờ thanh toán', icon: Hourglass, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    confirmed: { label: 'Đã xác nhận thanh toán', icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    rejected: { label: 'Thanh toán bị từ chối', icon: AlertCircle, cls: 'bg-red-50 border-red-200 text-red-600' },
};

const SKILL_OPTIONS = [
    { value: '', label: '-- Chọn --' },
    { value: 'yeu', label: 'Yếu' },
    { value: 'trung_binh_yeu', label: 'TB yếu' },
    { value: 'trung_binh', label: 'TB' },
    { value: 'trung_binh_cong', label: 'TB+' },
    { value: 'ban_chuyen', label: 'Bán chuyên' },
    { value: 'chuyen_nghiep', label: 'Chuyên nghiệp' },
];

const SKILL_LABEL: Record<string, string> = {
    yeu: 'Yếu',
    trung_binh_yeu: 'TB yếu',
    trung_binh: 'TB',
    trung_binh_cong: 'TB+',
    ban_chuyen: 'Bán chuyên',
    chuyen_nghiep: 'Chuyên nghiệp',
};

export default function SessionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestForm, setGuestForm] = useState({ full_name: '', gender: 'male', skill_level: '' });
    const [addingGuest, setAddingGuest] = useState(false);

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(true);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState<'choose' | 'transfer' | 'cash'>('choose');
    const [payRefBill, setPayRefBill] = useState('');
    const [billFilePay, setBillFilePay] = useState<File | null>(null);
    const [billPreviewPay, setBillPreviewPay] = useState<string | null>(null);
    const [billUrlPay, setBillUrlPay] = useState<string | null>(null);
    const [uploadingPay, setUploadingPay] = useState(false);
    const [submittingPay, setSubmittingPay] = useState(false);
    const [sendingCash, setSendingCash] = useState(false);
    const fileInputPayRef = useRef<HTMLInputElement>(null);

    const fetchSession = async () => {
        try {
            const { data } = await sessionsApi.get(id);
            setSession(data);
        } finally {
            setLoading(false);
        }
    };

    const fetchRegistrations = async () => {
        setLoadingRegs(true);
        try {
            const { data } = await registrationsApi.listBySession(id);
            setRegistrations(data.data ?? []);
        } finally {
            setLoadingRegs(false);
        }
    };

    useEffect(() => {
        fetchSession();
        fetchRegistrations();
    }, [id]);


    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`registrations-session-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'registrations',
                    filter: `session_id=eq.${id}`,
                },
                () => {
                    fetchSession();
                    fetchRegistrations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const handleRegister = async () => {
        setRegistering(true);
        try {
            const { data } = await registrationsApi.register({ session_id: id });
            toast.success('Đăng ký thành công! Vui lòng chờ admin điểm danh.');
            setSession((prev: any) => ({
                ...prev,
                my_registration: data.registration,
                available_slots: prev.available_slots - 1,
            }));
            fetchRegistrations();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Đăng ký thất bại');
        } finally {
            setRegistering(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy đăng ký buổi này?')) return;
        setCancelling(true);
        try {
            await registrationsApi.cancel(session.my_registration.id);
            toast.success('Đã hủy đăng ký');
            fetchSession();
            fetchRegistrations();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Không thể hủy');
        } finally {
            setCancelling(false);
        }
    };

    const closeGuestModal = () => {
        setShowGuestModal(false);
        setGuestForm({ full_name: '', gender: 'male', skill_level: '' });
    };

    const handleAddGuest = async () => {
        if (!myReg?.id) return;
        if (!guestForm.full_name.trim()) {
            toast.error('Vui lòng nhập họ tên khách');
            return;
        }
        setAddingGuest(true);
        try {
            await registrationsApi.addGuest(myReg.id, {
                guest_full_name: guestForm.full_name.trim(),
                guest_gender: guestForm.gender,
                guest_skill_level: guestForm.skill_level || undefined,
            });
            toast.success(`Đã thêm khách ${guestForm.full_name} đi cùng bạn`);
            closeGuestModal();
            fetchSession();
            fetchRegistrations();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Thêm khách thất bại');
        } finally {
            setAddingGuest(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-48 animate-pulse" />
                <div className="bg-white rounded-2xl h-32 animate-pulse" />
            </div>
        );
    }

    if (!session) return (
        <div className="text-center py-20 text-gray-400">Không tìm thấy buổi đánh</div>
    );

    const myReg = session.my_registration;
    const effectiveStatus = session.status;
    const isFull = session.available_slots <= 0;
    const canRegister = session.status === 'open' && !isFull && !myReg;

    return (
        <div className="space-y-4">
            {/* Back + Add guest */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => {
                        sessionStorage.setItem('activity:return-tab', 'sessions');
                        router.push('/activity');
                    }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại
                </button>

                {myReg && (session.status === 'open' || session.status === 'full') && (
                    <button
                        onClick={() => setShowGuestModal(true)}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm khách đi cùng
                    </button>
                )}
            </div>

            {/* Session info card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-4">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">{session.title}</h1>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${effectiveStatus === 'open' ? 'bg-emerald-50 text-emerald-700' :
                        effectiveStatus === 'full' ? 'bg-amber-50 text-amber-700' :
                            effectiveStatus === 'waiting_payment' ? 'bg-orange-50 text-orange-700' :
                                effectiveStatus === 'completed' ? 'bg-gray-100 text-gray-500' :
                                    effectiveStatus === 'cancelled' ? 'bg-red-50 text-red-600' :
                                        'bg-gray-100 text-gray-500'
                        }`}>
                        {effectiveStatus === 'open' ? 'Mở đăng ký' :
                            effectiveStatus === 'full' ? 'Đã đầy' :
                                effectiveStatus === 'waiting_payment' ? 'Chờ thanh toán' :
                                    effectiveStatus === 'completed' ? 'Hoàn thành' :
                                        effectiveStatus === 'cancelled' ? 'Đã hủy' : effectiveStatus}
                    </span>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span>{format(new Date(session.scheduled_at), 'EEEE, dd/MM/yyyy — HH:mm', { locale: vi })}</span>
                    </div>
                    {session.location && (
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <span>{session.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <span>{session.duration_minutes} phút</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isFull ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            <Users className={`w-3.5 h-3.5 ${isFull ? 'text-red-500' : 'text-emerald-600'}`} />
                        </div>
                        <span className={isFull ? 'text-red-500 font-medium' : ''}>
                            {isFull ? 'Đã hết chỗ' : `Còn ${session.available_slots}/${session.max_slots} chỗ trống`}
                        </span>
                    </div>
                </div>

                {session.description && (
                    <p className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500 leading-relaxed">
                        {session.description}
                    </p>
                )}
            </div>

            {/* Danh sách người đã đăng ký — giữ nguyên không đổi */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Đã đăng ký ({registrations.length})
                </h3>

                {loadingRegs ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-9 h-9 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : registrations.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Chưa có ai đăng ký buổi này</p>
                ) : (
                    (() => {
                        const roots = registrations.filter((m: any) => !m.host_registration_id);
                        const guestsOf = (hostId: string) =>
                            registrations.filter((m: any) => m.host_registration_id === hostId);

                        const renderPerson = (m: any, opts?: { nested?: boolean }) => {
                            const u = m.users;
                            const fullName = u?.full_name ?? m.guest_full_name ?? '?';
                            const gender = u?.gender ?? m.guest_gender;
                            const skillLevel = m.is_guest ? m.guest_skill_level : null;
                            const parts = fullName.trim().split(' ').filter(Boolean);
                            const initials = parts.length >= 2
                                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                                : fullName.slice(0, 2).toUpperCase();

                            return (
                                <li
                                    key={m.id}
                                    className={`flex items-center gap-3 ${opts?.nested ? 'py-2 pl-6' : 'py-2.5'}`}
                                >
                                    {opts?.nested && (
                                        <span className="w-3 h-px bg-gray-200 flex-shrink-0 -ml-3 mr-[-2px]" />
                                    )}
                                    {u?.avatar_url ? (
                                        <img
                                            src={u.avatar_url}
                                            alt={fullName}
                                            className={`rounded-full object-cover flex-shrink-0 ${opts?.nested ? 'w-7 h-7' : 'w-9 h-9'}`}
                                        />
                                    ) : (
                                        <div className={`rounded-full flex items-center justify-center flex-shrink-0 font-semibold ${opts?.nested
                                            ? 'w-7 h-7 text-[10px] bg-purple-100 text-purple-700'
                                            : 'w-9 h-9 text-xs bg-blue-100 text-blue-700'
                                            }`}>
                                            {initials}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium text-gray-900 truncate ${opts?.nested ? 'text-xs' : 'text-sm'}`}>
                                            {fullName}
                                            {m.is_guest && <span className="text-xs text-gray-400 ml-1">(khách)</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : ''}
                                            {skillLevel && <span> · {SKILL_LABEL[skillLevel] ?? skillLevel}</span>}
                                        </p>
                                    </div>
                                </li>
                            );
                        };

                        return (
                            <ul className="divide-y divide-gray-50">
                                {roots.map((root: any) => {
                                    const guests = guestsOf(root.id);
                                    return (
                                        <div key={root.id}>
                                            {renderPerson(root)}
                                            {guests.length > 0 && (
                                                <ul>
                                                    {guests.map((g: any) => renderPerson(g, { nested: true }))}
                                                </ul>
                                            )}
                                        </div>
                                    );
                                })}
                            </ul>
                        );
                    })()
                )}
            </div>

            {myReg && myReg.participation_status === 'awaiting_checkin' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Hourglass className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Đang chờ điểm danh</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Admin sẽ điểm danh khi buổi bắt đầu. Sau khi buổi kết thúc, số tiền cần thanh toán sẽ hiện ở đây.
                        </p>
                    </div>
                </div>
            )}

            {myReg && myReg.participation_status === 'confirmed' && myReg.payment_status === 'pending' && !myReg.amount_override && (
                <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Hourglass className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Đã điểm danh có mặt</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Số tiền cần thanh toán sẽ được admin thông báo sau khi buổi kết thúc.
                        </p>
                    </div>
                </div>
            )}


            {myReg && myReg.payment_status === 'confirmed' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Đã thanh toán thành công</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Số tiền đã đóng: <span className="font-semibold text-emerald-600">
                                {(myReg.amount_override ?? 0).toLocaleString('vi-VN')}đ
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {myReg && myReg.payment_status === 'rejected' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Thanh toán bị từ chối</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Vui lòng liên hệ admin để được hỗ trợ thanh toán lại.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Modal thêm khách đi cùng — giữ nguyên không đổi ── */}
            {showGuestModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
                    onClick={(e) => e.target === e.currentTarget && closeGuestModal()}
                >
                    <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Thêm khách đi cùng</h3>
                            <button onClick={closeGuestModal} className="p-1 text-gray-400 hover:text-gray-600">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                                <input
                                    autoFocus
                                    value={guestForm.full_name}
                                    onChange={e => setGuestForm(f => ({ ...f, full_name: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Tên khách đi cùng"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                                    <select
                                        value={guestForm.gender}
                                        onChange={e => setGuestForm(f => ({ ...f, gender: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        <option value="male">Nam</option>
                                        <option value="female">Nữ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trình độ</label>
                                    <select
                                        value={guestForm.skill_level}
                                        onChange={e => setGuestForm(f => ({ ...f, skill_level: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        {SKILL_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                                ⓘ Tiền của khách đi cùng sẽ được gộp vào số tiền bạn cần thanh toán sau khi buổi kết thúc.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                            <button onClick={closeGuestModal} className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                                Hủy
                            </button>
                            <button
                                onClick={handleAddGuest}
                                disabled={addingGuest || !guestForm.full_name.trim()}
                                className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {addingGuest && <Loader2 className="w-4 h-4 animate-spin" />}
                                Thêm khách
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action button */}
            <div className="space-y-2">
                {canRegister && (
                    <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                        {registering && <Loader2 className="w-4 h-4 animate-spin" />}
                        {registering ? 'Đang đăng ký...' : '🏸 Đăng ký tham gia'}
                    </button>
                )}

                {/* Có bill cần thanh toán → hiện nút thanh toán thay vì hủy */}
                {myReg && myReg.payment_status === 'pending' && myReg.amount_override > 0 && !myReg.payment_reference && (
                    <button
                        onClick={() => { setShowPayModal(true); setPayMethod('choose'); }}
                        className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
                    >
                        💳 Thanh toán {myReg.amount_override.toLocaleString('vi-VN')}đ
                    </button>
                )}

                {/* Chưa có bill → hiện hủy đăng ký (chỉ khi tự đăng ký, không phải admin thêm) */}
                {myReg && myReg.payment_status === 'pending' && !myReg.amount_override && !myReg.added_by_user_id && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                        {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Hủy đăng ký
                    </button>
                )}

                {isFull && !myReg && (
                    <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-medium text-center text-sm">
                        Buổi đã đầy chỗ
                    </div>
                )}
            </div>

            {/* Modal thanh toán (chuyển khoản/tiền mặt) — giữ nguyên không đổi, vì chỉ kích hoạt khi đã có amount_override */}
            {showPayModal && myReg && (
                <div
                    className="fixed inset-0 z-[9999] flex flex-col justify-end"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                    onClick={e => e.target === e.currentTarget && setShowPayModal(false)}
                >
                    <div className="w-full bg-white rounded-t-2xl" style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {payMethod === 'choose' ? 'Chọn hình thức thanh toán' : payMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                <XIcon className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                                <span className="text-sm text-gray-600">Số tiền cần thanh toán</span>
                                <span className="text-lg font-black text-red-600">{(myReg.amount_override ?? 0).toLocaleString('vi-VN')}đ</span>
                            </div>

                            {payMethod === 'choose' && (
                                <div className="space-y-3">
                                    <button onClick={() => setPayMethod('transfer')}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                                        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-xl">🏦</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Chuyển khoản</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Quét QR VietQR, gửi ảnh bill xác nhận</p>
                                        </div>
                                    </button>
                                    <button onClick={() => setPayMethod('cash')}
                                        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors text-left">
                                        <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-xl">💵</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Tiền mặt</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Thông báo admin, nộp tiền trực tiếp</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {payMethod === 'transfer' && (() => {
                                const amt = myReg.amount_override ?? 0;
                                const ref = `DANGKY ${myReg.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
                                const qr = `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '0000000000'}-compact.png?amount=${amt}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? 'CLB CAU LONG')}`;
                                return (
                                    <div className="space-y-4">
                                        <div className="flex justify-center">
                                            <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                                                <img src={qr} alt="VietQR" className="w-44 h-44 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                                            <div className="flex justify-between"><span className="text-gray-500">Số tiền</span><span className="font-bold text-blue-600">{amt.toLocaleString('vi-VN')}đ</span></div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Nội dung CK</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-semibold">{ref}</span>
                                                    <button onClick={() => { navigator.clipboard.writeText(ref); toast.success('Đã copy'); }} className="p-1 hover:bg-gray-200 rounded">
                                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <input value={payRefBill} onChange={e => setPayRefBill(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                            placeholder={`Nhập nội dung: ${ref}`} />
                                        <div>
                                            <p className="text-xs font-semibold text-gray-600 mb-1.5">Ảnh bill <span className="text-red-400">*</span></p>
                                            {!billPreviewPay ? (
                                                <button onClick={() => fileInputPayRef.current?.click()}
                                                    className="w-full py-5 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-1.5 text-gray-400 hover:border-blue-300 hover:text-blue-500">
                                                    <ImagePlus className="w-6 h-6" /><span className="text-xs">Chọn ảnh bill</span>
                                                </button>
                                            ) : (
                                                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                                    <img src={billPreviewPay} className="w-full max-h-48 object-contain bg-gray-50" />
                                                    <button onClick={() => { setBillFilePay(null); setBillPreviewPay(null); setBillUrlPay(null); }}
                                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                                                        <XIcon className="w-3.5 h-3.5 text-white" />
                                                    </button>
                                                    {billUrlPay ? (
                                                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-semibold px-2 py-1 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" /> Đã tải lên
                                                        </div>
                                                    ) : (
                                                        <button onClick={async () => {
                                                            if (!billFilePay) return;
                                                            setUploadingPay(true);
                                                            try {
                                                                const { data } = await registrationsApi.uploadPaymentProof(myReg.id, billFilePay);
                                                                setBillUrlPay(data.payment_proof_url);
                                                                toast.success('Đã tải ảnh lên!');
                                                            } catch { toast.error('Tải ảnh thất bại'); }
                                                            finally { setUploadingPay(false); }
                                                        }} disabled={uploadingPay}
                                                            className="absolute bottom-2 left-2 right-2 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                                                            {uploadingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                                                            {uploadingPay ? 'Đang tải...' : 'Tải ảnh lên'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <input ref={fileInputPayRef} type="file" accept="image/*" onChange={e => {
                                                const f = e.target.files?.[0]; if (!f) return;
                                                setBillFilePay(f); setBillUrlPay(null);
                                                const reader = new FileReader();
                                                reader.onload = () => setBillPreviewPay(reader.result as string);
                                                reader.readAsDataURL(f);
                                            }} className="hidden" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPayMethod('choose')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                            <button onClick={async () => {
                                                if (!payRefBill.trim()) { toast.error('Nhập mã CK'); return; }
                                                if (!billUrlPay) { toast.error('Tải ảnh bill trước'); return; }
                                                setSubmittingPay(true);
                                                try {
                                                    await registrationsApi.submitPayment(myReg.id, { payment_reference: payRefBill.trim() });
                                                    toast.success('Đã gửi xác nhận!');
                                                    setShowPayModal(false);
                                                    fetchSession();
                                                } catch { toast.error('Gửi thất bại'); }
                                                finally { setSubmittingPay(false); }
                                            }} disabled={!billUrlPay || !payRefBill.trim() || submittingPay}
                                                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                                                {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi xác nhận
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {payMethod === 'cash' && (
                                <div className="space-y-4">
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <p className="text-sm font-semibold text-green-800 mb-1">💵 Thanh toán tiền mặt</p>
                                        <p className="text-xs text-green-600">Admin sẽ xác nhận sau khi nhận tiền trực tiếp.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPayMethod('choose')} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                        <button onClick={async () => {
                                            setSendingCash(true);
                                            try {
                                                await registrationsApi.requestCash(myReg.id);
                                                toast.success('Đã thông báo admin!');
                                                setShowPayModal(false);
                                                fetchSession();
                                            } catch { toast.error('Gửi thất bại'); }
                                            finally { setSendingCash(false); }
                                        }} disabled={sendingCash}
                                            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                                            {sendingCash && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Thông báo admin
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
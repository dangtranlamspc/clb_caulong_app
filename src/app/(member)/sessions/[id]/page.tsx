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
import { supabase } from '@/lib/supabase';
import { MorphButton } from '@/components/effect-button/MorphButton';
import { buildTransferNote } from '@/hooks/payment-ref';
import { useAuthStore } from '@/store/auth.store';

type ActionPhase = 'idle' | 'loading' | 'success';

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

    const { user } = useAuthStore();
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [registerPhase, setRegisterPhase] = useState<ActionPhase>('idle');
    const [cancelPhase, setCancelPhase] = useState<ActionPhase>('idle');
    const [payType, setPayType] = useState<'solo' | 'grouped' | null>(null);

    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestForm, setGuestForm] = useState({ full_name: '', gender: 'male', skill_level: '' });
    const [addingGuest, setAddingGuest] = useState(false);

    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(true);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState<'choose' | 'transfer' | 'cash'>('choose');
    const [payRefBill, setPayRefBill] = useState('');
    const [billUrlPay, setBillUrlPay] = useState<string | null>(null);
    const [submittingPay, setSubmittingPay] = useState(false);
    const [sendingCash, setSendingCash] = useState(false);

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
        setRegisterPhase('loading');
        try {
            const { data } = await registrationsApi.register({ session_id: id });
            setRegisterPhase('success');
            toast.success('Đăng ký thành công! Vui lòng chờ admin điểm danh.');

            setTimeout(() => {
                setSession((prev: any) => ({
                    ...prev,
                    my_registration: data.registration,
                    available_slots: prev.available_slots - 1,
                }));
                fetchRegistrations();
                setRegisterPhase('idle');
            }, 700);
        } catch (err: any) {
            setRegisterPhase('idle');
            toast.error(err?.response?.data?.message ?? 'Đăng ký thất bại');
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy đăng ký buổi này?')) return;
        setCancelPhase('loading');
        try {
            await registrationsApi.cancel(session.my_registration.id);
            setCancelPhase('success');
            toast.success('Đã hủy đăng ký');

            setTimeout(() => {
                fetchSession();
                fetchRegistrations();
                setCancelPhase('idle');
            }, 700);
        } catch (err: any) {
            setCancelPhase('idle');
            toast.error(err?.response?.data?.message ?? 'Không thể hủy');
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

    const myGuests = registrations.filter(
        (r: any) => r.host_registration_id === myReg?.id
    );
    const guestTotal = myGuests.reduce(
        (sum: number, g: any) => sum + (g.amount_override ?? 0), 0
    );
    const soloAmount = myReg?.amount_override ?? 0;
    const groupedAmount = soloAmount + guestTotal;

    return (
        <>
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
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

                <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ animation: registrations.length > 0 ? 'fadeSlideUp .3s ease both' : undefined }}>
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
                                        style={{ animation: 'fadeSlideUp .3s ease both' }}
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


                {/* ── Chi phí buổi — chỉ hiện khi đã kết thúc và có data ── */}
                {(session.status === 'waiting_payment' || session.status === 'completed') &&
                    (session.court_fee > 0 || session.shuttle_count > 0 || session.other_fee > 0) && (
                        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3"
                            style={{ animation: 'fadeSlideUp .3s ease both' }}>
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                🧾 Chi phí buổi đánh
                            </h3>

                            {/* Chi phí thực tế */}
                            <div className="space-y-1.5 text-sm">
                                {session.shuttle_count > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>🏸 Cầu {session.shuttle_count} × {(session.shuttle_price ?? 0).toLocaleString('vi-VN')}đ</span>
                                        <span className="font-medium">
                                            {((session.shuttle_count ?? 0) * (session.shuttle_price ?? 0)).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                )}
                                {session.court_fee > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>🏟 Tiền sân</span>
                                        <span className="font-medium">{(session.court_fee ?? 0).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                )}
                                {session.other_fee > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>
                                            💰 Khoản thu khác
                                            {session.other_fee_note && (
                                                <span className="text-gray-400 italic text-xs ml-1">({session.other_fee_note})</span>
                                            )}
                                        </span>
                                        <span className="font-medium">{(session.other_fee ?? 0).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold border-t border-gray-100 pt-2 text-gray-900">
                                    <span>Tổng chi phí</span>
                                    <span>
                                        {((session.court_fee ?? 0) +
                                            (session.shuttle_count ?? 0) * (session.shuttle_price ?? 0) +
                                            (session.other_fee ?? 0)).toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </div>

                            {/* Số tiền từng người */}
                            {registrations.filter(r => r.participation_status === 'confirmed').length > 0 && (
                                <>
                                    <div className="border-t border-gray-100 pt-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                            Số tiền từng người
                                        </p>
                                        <div className="space-y-2">
                                            {registrations
                                                .filter(r => !r.host_registration_id && r.participation_status === 'confirmed')
                                                .map((r: any) => {
                                                    const guests = registrations.filter(
                                                        g => g.host_registration_id === r.id && g.participation_status === 'confirmed'
                                                    );
                                                    const name = r.users?.full_name ?? r.guest_full_name ?? '?';
                                                    const isMe = r.id === myReg?.id;

                                                    const gender = r.users?.gender ?? r.guest_gender;
                                                    const defaultPrice = gender === 'female'
                                                        ? (session.price_female ?? session.price_per_slot ?? 0)
                                                        : (session.price_male ?? session.price_per_slot ?? 0);
                                                    const amount = r.amount_override ?? defaultPrice;

                                                    return (
                                                        <div key={r.id} className={`rounded-xl px-3 py-2 ${isMe ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                                                            <div className="flex justify-between items-center">
                                                                <span className={`text-sm font-medium ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                                                    {name} {isMe && <span className="text-xs font-normal text-blue-400">(bạn)</span>}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {r.payment_status === 'confirmed'
                                                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                        : <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                                                                    }
                                                                    <span className={`text-sm font-bold ${isMe ? 'text-blue-600' : 'text-gray-900'}`}>
                                                                        {amount.toLocaleString('vi-VN')}đ
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {guests.map((g: any) => {
                                                                const gGender = g.guest_gender;
                                                                const gDefaultPrice = gGender === 'female'
                                                                    ? (session.price_female ?? session.price_per_slot ?? 0)
                                                                    : (session.price_male ?? session.price_per_slot ?? 0);
                                                                const gAmount = g.amount_override ?? gDefaultPrice;

                                                                const hostReg = registrations.find((rr: any) => rr.id === g.host_registration_id);
                                                                const isGroupedPaid = g.payment_method === 'grouped_with_host' && g.payment_status === 'confirmed';
                                                                const guestActuallyConfirmed = isGroupedPaid;

                                                                return (
                                                                    <div key={g.id} className="flex justify-between items-center mt-1.5 pl-3 border-l-2 border-purple-100">
                                                                        <span className="text-xs text-purple-600">
                                                                            + {g.guest_full_name}
                                                                            <span className="text-gray-400 ml-1">(đi cùng)</span>
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            {guestActuallyConfirmed
                                                                                ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                                : <Hourglass className="w-3 h-3 text-amber-400" />
                                                                            }
                                                                            <span className="text-xs font-semibold text-gray-600">
                                                                                {gAmount.toLocaleString('vi-VN')}đ
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                {myReg && myReg.participation_status === 'awaiting_checkin' && (
                    <div
                        className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3"
                        style={{ animation: 'fadeSlideUp .35s ease both' }} // ← thêm
                    >
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
                <div className="space-y-2" style={{ animation: 'fadeSlideUp .35s ease both', animationDelay: '80ms' }}>
                    {canRegister && (
                        <MorphButton
                            phase={registerPhase}
                            label="🏸 Đăng ký tham gia"
                            onClick={handleRegister}
                        />
                    )}

                    {myReg && myReg.payment_status === 'pending' && myReg.amount_override > 0 && !myReg.payment_reference && (
                        <button
                            onClick={() => {
                                setPayType(null);
                                setPayMethod('choose');
                                setShowPayModal(true);
                            }}
                            className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-[0.98] transition-all"
                        >
                            💳 Thanh toán
                        </button>
                    )}

                    {myReg && myReg.payment_status === 'pending' && !myReg.amount_override && !myReg.added_by_user_id && (
                        <MorphButton
                            phase={cancelPhase}
                            label="Hủy đăng ký"
                            idleIcon={<XCircle className="w-3.5 h-3.5" />}
                            onClick={handleCancel}
                            idleClassName="bg-white border border-red-200 text-red-500 hover:bg-red-50"
                            successClassName="bg-red-500 text-white"
                        />
                    )}

                    {isFull && !myReg && (
                        <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-medium text-center text-sm">
                            Buổi đã đầy chỗ
                        </div>
                    )}
                </div>

                {showPayModal && myReg && (
                    <div className="fixed inset-0 z-[9999] flex flex-col justify-end"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                        onClick={e => e.target === e.currentTarget && setShowPayModal(false)}
                    >
                        <div className="w-full bg-white rounded-t-2xl"
                            style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-9 h-1 rounded-full bg-gray-200" />
                            </div>
                            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {!payType ? 'Chọn hình thức thanh toán' :
                                            payMethod === 'choose' ? 'Chọn phương thức' :
                                                payMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
                                </div>
                                <button onClick={() => setShowPayModal(false)}
                                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                    <XIcon className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>

                            <div className="px-5 py-4 space-y-4">

                                {!payType && myGuests.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-500 font-medium">Bạn muốn thanh toán:</p>

                                        <button
                                            onClick={() => { setPayType('solo'); setPayMethod('choose'); }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-xl">👤</div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Tiền của riêng tôi</p>
                                                <p className="text-lg font-black text-blue-600 mt-0.5">
                                                    {soloAmount.toLocaleString('vi-VN')}đ
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Khách đi cùng ({myGuests.map((g: any) => g.guest_full_name).join(', ')}) tự thanh toán riêng
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => { setPayType('grouped'); setPayMethod('choose'); }}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-xl">👥</div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">Gộp cả khách đi cùng</p>
                                                <p className="text-lg font-black text-purple-600 mt-0.5">
                                                    {groupedAmount.toLocaleString('vi-VN')}đ
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Bao gồm: {myGuests.map((g: any) => `${g.guest_full_name} (${(g.amount_override ?? 0).toLocaleString('vi-VN')}đ)`).join(', ')}
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {!payType && myGuests.length === 0 && (() => {
                                    setPayType('solo');
                                    return null;
                                })()}

                                {payType && (() => {
                                    const amt = payType === 'grouped' ? groupedAmount : soloAmount;
                                    return (
                                        <>
                                            <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3">
                                                <span className="text-sm text-gray-600">Số tiền thanh toán</span>
                                                <span className="text-lg font-black text-red-600">{amt.toLocaleString('vi-VN')}đ</span>
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
                                                    {myGuests.length > 0 && (
                                                        <button onClick={() => { setPayType(null); }}
                                                            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600">
                                                            ← Quay lại chọn kiểu thanh toán
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {payMethod === 'transfer' && (() => {
                                                const ref = buildTransferNote(user?.full_name ?? '', session.title, session.scheduled_at);
                                                const qr = `https://img.vietqr.io/image/${process.env.NEXT_PUBLIC_BANK_ID ?? 'MB'}-${process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '0000000000'}-compact.png?amount=${amt}&addInfo=${encodeURIComponent(ref)}&accountName=${encodeURIComponent(process.env.NEXT_PUBLIC_BANK_NAME ?? 'CLB CAU LONG')}`;
                                                return (
                                                    <div className="space-y-4">
                                                        <div className="flex justify-center">
                                                            <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                                                                <img src={qr} alt="VietQR" className="w-44 h-44 object-contain"
                                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-500">Số tiền</span>
                                                                <span className="font-bold text-blue-600">{amt.toLocaleString('vi-VN')}đ</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500">Nội dung CK</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono font-semibold">{ref}</span>
                                                                    <button onClick={() => { navigator.clipboard.writeText(ref); toast.success('Đã copy'); }}
                                                                        className="p-1 hover:bg-gray-200 rounded">
                                                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <input value={payRefBill} onChange={e => setPayRefBill(e.target.value)}
                                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
                                                            placeholder={`Nhập nội dung: ${ref}`} />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setPayMethod('choose')}
                                                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                                            <button onClick={async () => {
                                                                if (!payRefBill.trim()) { toast.error('Nhập mã CK'); return; }
                                                                setSubmittingPay(true);
                                                                try {
                                                                    await registrationsApi.submitPayment(myReg.id, {
                                                                        payment_reference: payRefBill.trim(),
                                                                        pay_type: payType,
                                                                        grouped_amount: payType === 'grouped' ? groupedAmount : undefined,
                                                                        ...(billUrlPay ? { payment_proof_url: billUrlPay } : {}),
                                                                    });
                                                                    toast.success('Đã gửi xác nhận!');
                                                                    setShowPayModal(false);
                                                                    fetchSession();
                                                                } catch { toast.error('Gửi thất bại'); }
                                                                finally { setSubmittingPay(false); }
                                                            }} disabled={!payRefBill.trim() || submittingPay}
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
                                                        <button onClick={() => setPayMethod('choose')}
                                                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">Quay lại</button>
                                                        <button onClick={async () => {
                                                            setSendingCash(true);
                                                            try {
                                                                await registrationsApi.requestCash(myReg.id, {
                                                                    pay_type: payType,
                                                                    grouped_amount: payType === 'grouped' ? groupedAmount : undefined,
                                                                });
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
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
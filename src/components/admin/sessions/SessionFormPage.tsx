'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Save, Loader2, CalendarDays, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionsApi } from '@/api';
import { DateTimePicker } from '@/components/DateTimePicker';

function fmt(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

export default function SessionFormPage() {
    const params = useParams<{ id?: string }>();
    const id = params?.id;
    const isEdit = Boolean(id);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [isCompleted, setIsCompleted] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            title: '',
            description: '',
            scheduled_at: '',
            duration_minutes: 90,
            location: '',
            max_slots: 20,
            court_fee: 0,
            shuttle_count: 0,
            shuttle_price: 0,
        },
    });

    useEffect(() => {
        if (isEdit && id) {
            sessionsApi.get(id).then(({ data }) => {
                setIsCompleted(data.status === 'completed');
                reset({
                    title: data.title,
                    description: data.description ?? '',
                    scheduled_at: data.scheduled_at,
                    duration_minutes: data.duration_minutes,
                    location: data.location ?? '',
                    max_slots: data.max_slots,
                    court_fee: data.court_fee ?? 0,
                    shuttle_count: data.shuttle_count ?? 0,
                    shuttle_price: data.shuttle_price ?? 0,
                });
            }).finally(() => setFetching(false));
        }
    }, [id, isEdit]);

    const courtFee = Number(watch('court_fee')) || 0;
    const shuttleCount = Number(watch('shuttle_count')) || 0;
    const shuttlePrice = Number(watch('shuttle_price')) || 0;
    const shuttleCost = shuttleCount * shuttlePrice;
    const totalCost = courtFee + shuttleCost;

    const onSubmit = async (values: any) => {
        setLoading(true);
        try {
            const payload: any = {
                title: values.title,
                description: values.description || undefined,
                scheduled_at: new Date(values.scheduled_at).toISOString(),
                duration_minutes: Number(values.duration_minutes),
                location: values.location || undefined,
                max_slots: Number(values.max_slots),
            };

            // Chỉ gửi chi phí khi là buổi đã hoàn thành
            if (isCompleted) {
                payload.court_fee = Number(values.court_fee) || 0;
                payload.shuttle_count = Number(values.shuttle_count) || 0;
                payload.shuttle_price = Number(values.shuttle_price) || 0;
            }

            if (isEdit && id) {
                await sessionsApi.update(id, payload);
                toast.success('Đã cập nhật buổi đánh');
            } else {
                await sessionsApi.create(payload);
                toast.success('Tạo buổi đánh thành công');
            }
            router.push(`/sessions/${id ?? ''}`);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="space-y-4 max-w-xl mx-auto">
                <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
                <div className="card space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.push(`/sessions/${id ?? ''}`)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-900">
                        {isEdit ? 'Chỉnh sửa buổi đánh' : 'Tạo buổi đánh mới'}
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* ── Thông tin cơ bản ── */}
                <div className="card space-y-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Thông tin buổi</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên buổi đánh *</label>
                        <input
                            {...register('title', { required: 'Bắt buộc' })}
                            className="input-field"
                            placeholder="VD: Buổi đánh thứ 2 tuần này"
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea
                            {...register('description')}
                            className="input-field resize-none"
                            rows={2}
                            placeholder="Ghi chú thêm: mang vợt cá nhân, chia đội..."
                        />
                    </div>

                    <Controller
                        name="scheduled_at"
                        control={control}
                        rules={{ required: 'Vui lòng chọn thời gian' }}
                        render={({ field }) => (
                            <DateTimePicker
                                label="Thời gian"
                                required
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.scheduled_at?.message as string | undefined}
                            />
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
                            <input {...register('duration_minutes', { min: 30 })} type="number" className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số chỗ tối đa</label>
                            <input {...register('max_slots', { min: 1 })} type="number" className="input-field" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                        <input {...register('location')} className="input-field" placeholder="Sân ABC - 123 Nguyễn Huệ" />
                    </div>

                    <p className="text-xs text-gray-400 italic">
                        ℹ️ Giá tiền từng người sẽ được nhập riêng lúc "Kết thúc buổi"
                    </p>
                </div>

                {/* ── Chi phí thực tế — chỉ hiện khi buổi đã completed ── */}
                {isCompleted && (
                    <div className="card space-y-4 border border-blue-100 bg-blue-50/40">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-700">Chi phí thực tế buổi</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🏟 Tiền sân (VNĐ)</label>
                            <input
                                {...register('court_fee', { min: 0 })}
                                type="number"
                                step="10000"
                                className="input-field"
                                placeholder="600000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">🏸 Cầu lông</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Số bông sử dụng</label>
                                    <input
                                        {...register('shuttle_count', { min: 0 })}
                                        type="number"
                                        className="input-field"
                                        placeholder="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Giá 1 bông (VNĐ)</label>
                                    <input
                                        {...register('shuttle_price', { min: 0 })}
                                        type="number"
                                        step="1000"
                                        className="input-field"
                                        placeholder="315000"
                                    />
                                </div>
                            </div>
                        </div>

                        {totalCost > 0 && (
                            <div className="rounded-lg bg-white border border-blue-200 p-3 space-y-1.5 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>🏟 Tiền sân</span>
                                    <span>{fmt(courtFee)}</span>
                                </div>
                                {shuttleCost > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>🏸 {shuttleCount} bông × {fmt(shuttlePrice)}</span>
                                        <span>{fmt(shuttleCost)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-1.5">
                                    <span>Tổng chi phí</span>
                                    <span>{fmt(totalCost)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={() => router.push(`/sessions/${id ?? ''}`)}
                        className="btn-secondary text-sm"
                    >
                        Hủy
                    </button>
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? 'Lưu thay đổi' : 'Tạo buổi'}
                    </button>
                </div>
            </form>
        </div>
    );
}

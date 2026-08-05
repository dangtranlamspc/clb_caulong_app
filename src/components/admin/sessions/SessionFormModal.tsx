"use client";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Save, Loader2, CalendarDays, Calculator } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { sessionsAdminApi } from "@/lib/api";
import { DateTimePicker } from "./DateTimePicker";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

interface SessionFormModalProps {
  target: { id?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionFormModal({
  target,
  onClose,
  onSuccess,
}: SessionFormModalProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const id = target?.id;
  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      scheduled_at: "",
      duration_minutes: 90,
      location: "",
      max_slots: 20,
      court_fee: 0,
      shuttle_count: 0,
      shuttle_price: 0,
    },
  });

  useEffect(() => {
    if (!target) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [target]);

  useEffect(() => {
    if (!target) return;

    if (isEdit && id) {
      setFetching(true);
      sessionsAdminApi
        .get(id)
        .then(({ data }) => {
          setIsCompleted(data.status === "completed");
          reset({
            title: data.title,
            description: data.description ?? "",
            scheduled_at: data.scheduled_at,
            duration_minutes: data.duration_minutes,
            location: data.location ?? "",
            max_slots: data.max_slots,
            court_fee: data.court_fee ?? 0,
            shuttle_count: data.shuttle_count ?? 0,
            shuttle_price: data.shuttle_price ?? 0,
          });
        })
        .finally(() => setFetching(false));
    } else {
      setIsCompleted(false);
      reset({
        title: "",
        description: "",
        scheduled_at: "",
        duration_minutes: 90,
        location: "",
        max_slots: 20,
        court_fee: 0,
        shuttle_count: 0,
        shuttle_price: 0,
      });
    }
  }, [target?.id]);

  const courtFee = Number(watch("court_fee")) || 0;
  const shuttleCount = Number(watch("shuttle_count")) || 0;
  const shuttlePrice = Number(watch("shuttle_price")) || 0;
  const shuttleCost = shuttleCount * shuttlePrice;
  const totalCost = courtFee + shuttleCost;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

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

      if (isCompleted) {
        payload.court_fee = Number(values.court_fee) || 0;
        payload.shuttle_count = Number(values.shuttle_count) || 0;
        payload.shuttle_price = Number(values.shuttle_price) || 0;
      }

      if (isEdit && id) {
        await sessionsAdminApi.update(id, payload);
        toast.success("Đã cập nhật buổi đánh");
      } else {
        await sessionsAdminApi.create(payload);
        toast.success("Tạo buổi đánh thành công");
      }
      setVisible(false);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 200);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!target || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-xl my-8 max-h-[90vh] flex flex-col"
        style={{
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(8px)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">
              {isEdit ? "Chỉnh sửa buổi đánh" : "Tạo buổi đánh mới"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4">
          {fetching ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <form
              id="session-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Thông tin buổi
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên buổi đánh *
                  </label>
                  <input
                    {...register("title", { required: "Bắt buộc" })}
                    className="input-field"
                    placeholder="VD: Buổi đánh thứ 2 tuần này"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.title.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    {...register("description")}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Ghi chú thêm: mang vợt cá nhân, chia đội..."
                  />
                </div>

                <Controller
                  name="scheduled_at"
                  control={control}
                  rules={{ required: "Vui lòng chọn thời gian" }}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời lượng (phút)
                    </label>
                    <input
                      {...register("duration_minutes", { min: 30 })}
                      type="number"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số chỗ tối đa
                    </label>
                    <input
                      {...register("max_slots", { min: 1 })}
                      type="number"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa điểm
                  </label>
                  <input
                    {...register("location")}
                    className="input-field"
                    placeholder="Sân ABC - 123 Nguyễn Huệ"
                  />
                </div>

                <p className="text-xs text-gray-400 italic">
                  ℹ️ Giá tiền từng người sẽ được nhập riêng lúc "Kết thúc buổi"
                </p>
              </div>

              {isCompleted && (
                <div className="space-y-4 border border-blue-100 bg-blue-50/40 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-700">
                      Chi phí thực tế buổi
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏟 Tiền sân (VNĐ)
                    </label>
                    <input
                      {...register("court_fee", { min: 0 })}
                      type="number"
                      step="10000"
                      className="input-field"
                      placeholder="600000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🏸 Cầu lông
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Số bông sử dụng
                        </label>
                        <input
                          {...register("shuttle_count", { min: 0 })}
                          type="number"
                          className="input-field"
                          placeholder="4"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Giá 1 bông (VNĐ)
                        </label>
                        <input
                          {...register("shuttle_price", { min: 0 })}
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
                          <span>
                            🏸 {shuttleCount} bông × {fmt(shuttlePrice)}
                          </span>
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
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary text-sm flex-none w-auto"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="session-form"
            disabled={loading || fetching}
            className="btn-primary flex items-center justify-center gap-2 text-sm flex-none w-auto"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? "Lưu thay đổi" : "Tạo buổi"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

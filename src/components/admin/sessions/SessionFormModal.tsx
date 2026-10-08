"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { X, Save, Loader2, CalendarDays, Calculator, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { locationsAdminApi, sessionsAdminApi } from "@/lib/api";
import { DateTimePicker } from "./DateTimePicker";
import LocationManagerModal, { LocationItem } from "./LocationManagerModal";
import { CustomSelect } from "./CustomSelect";

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

interface SessionFormModalProps {
  target: { id?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_DURATION = 120;
const WEEKDAYS = ["chủ nhật", "thứ 2", "thứ 3", "thứ 4", "thứ 5", "thứ 6", "thứ 7"];

function buildAutoTitle(value: string) {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Buổi đánh ${WEEKDAYS[d.getDay()]} (${dd}/${mm}/${d.getFullYear()})`;
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

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [showLocManager, setShowLocManager] = useState(false);
  const lastAutoTitleRef = useRef("");

  const continueAfterSaveRef = useRef(false);

  const id = target?.id;
  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    getValues,
    setValue,
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

  const loadLocations = useCallback(async () => {
    try {
      const { data } = await locationsAdminApi.list();
      setLocations(data);
    } catch { }
  }, []);
  useEffect(() => {
    if (target) loadLocations();
  }, [target, loadLocations]);

  const handleScheduledChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    if (isEdit) return;
    const current = getValues("title");
    if (!current || current === lastAutoTitleRef.current) {
      const t = buildAutoTitle(value);
      lastAutoTitleRef.current = t;
      setValue("title", t, { shouldValidate: true });
    }
  };

  const locationOptions = () => {
    const opts = locations.map((l) => ({
      value: l.name, label: l.name, subLabel: l.address ?? undefined,
    }));
    const cur = getValues("location");
    if (cur && !opts.some((o) => o.value === cur)) {
      opts.unshift({ value: cur, label: cur, subLabel: undefined });
    }
    return opts;
  };

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
        duration_minutes: DEFAULT_DURATION,
        location: "",
        max_slots: 20,
        court_fee: 0,
        shuttle_count: 0,
        shuttle_price: 0,
      });
      lastAutoTitleRef.current = "";
    }
  }, [Boolean(target), target?.id]);

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
    const shouldContinue = continueAfterSaveRef.current;
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
        setVisible(false);
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 200);
      } else {
        await sessionsAdminApi.create(payload);
        onSuccess();

        if (shouldContinue) {
          toast.success("Đã tạo buổi, tiếp tục tạo buổi mới");
          reset({
            title: "",
            description: "",
            scheduled_at: "",
            duration_minutes: values.duration_minutes,
            location: values.location,
            max_slots: values.max_slots,
            court_fee: 0,
            shuttle_count: 0,
            shuttle_price: 0,
          });
        } else {
          toast.success("Tạo buổi đánh thành công");
          setVisible(false);
          setTimeout(() => {
            onClose();
          }, 200);
        }
      }
    } catch {
    } finally {
      setLoading(false);
      continueAfterSaveRef.current = false;
    }
  };

  if (!target || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{
        background: "var(--overlay)",
        backdropFilter: "blur(2px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="bg-[var(--surface)] w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        style={{
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(24px) scale(0.97)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 240ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <h3 className="font-bold text-[var(--text)]">
              {isEdit ? "Chỉnh sửa buổi đánh" : "Tạo buổi đánh mới"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 flex-1 min-h-0">
          {fetching ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-[var(--surface-muted)] rounded animate-pulse"
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
                <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wide">
                  Thông tin buổi
                </p>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    Tên buổi đánh *
                  </label>
                  <input
                    {...register("title", { required: "Bắt buộc" })}
                    className="input-field"
                    placeholder="VD: Buổi đánh thứ 2 tuần này"
                  />
                  {errors.title && (
                    <p className="text-[var(--danger)] text-xs mt-1">
                      {errors.title.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
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
                      onChange={(v: string) => handleScheduledChange(v, field.onChange)}
                      error={errors.scheduled_at?.message as string | undefined}
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                      Thời lượng (phút)
                    </label>
                    <input {...register("duration_minutes", { min: 30 })} type="number" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
                      Số chỗ tối đa
                    </label>
                    <input {...register("max_slots", { min: 1 })} type="number" className="input-field" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-h-8">
                    <label className="block text-sm font-medium text-[var(--text)]">Địa điểm</label>
                    <button
                      type="button"
                      onClick={() => setShowLocManager(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-[var(--primary)] bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:brightness-110 active:scale-95 transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Quản lý
                    </button>
                  </div>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={locationOptions()}
                        placeholder="-- Chọn địa điểm --"
                      />
                    )}
                  />
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
                  <span>ℹ️</span>
                  <span>Giá tiền từng người sẽ được nhập riêng lúc "Kết thúc buổi"</span>
                </div>
              </div>

              {isCompleted && (
                <div className="space-y-4 border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] bg-[var(--primary-soft)] rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[var(--primary)]" />
                    <p className="text-sm font-semibold text-[var(--primary)]">
                      Chi phí thực tế buổi
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">
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
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                      🏸 Cầu lông
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">
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
                        <label className="block text-xs text-[var(--text-muted)] mb-1">
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
                    <div className="rounded-lg bg-[var(--surface)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-[var(--text-muted)]">
                        <span>🏟 Tiền sân</span>
                        <span>{fmt(courtFee)}</span>
                      </div>
                      {shuttleCost > 0 && (
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>
                            🏸 {shuttleCount} bông × {fmt(shuttlePrice)}
                          </span>
                          <span>{fmt(shuttleCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-[var(--text)] border-t border-[var(--border)] pt-1.5">
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
        <div
          className="px-5 py-4 border-t border-[var(--border)] flex-shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:items-center sm:gap-3">
            <button
              type="submit"
              form="session-form"
              onClick={() => { continueAfterSaveRef.current = false; }}
              disabled={loading || fetching}
              className="col-span-2 sm:order-3 h-11 sm:h-10 px-5 rounded-xl sm:rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {loading && !continueAfterSaveRef.current ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "Lưu thay đổi" : "Tạo buổi"}
            </button>

            {!isEdit && (
              <button
                type="submit"
                form="session-form"
                onClick={() => { continueAfterSaveRef.current = true; }}
                disabled={loading || fetching}
                className="sm:order-2 h-11 sm:h-10 px-4 rounded-xl sm:rounded-lg border border-[color-mix(in_srgb,var(--primary)_55%,transparent)] text-[var(--primary)] hover:bg-[var(--primary-soft)] text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && continueAfterSaveRef.current ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Lưu và tiếp tục
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className={`sm:order-1 h-11 sm:h-10 px-4 rounded-xl sm:rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] text-sm font-medium flex items-center justify-center active:scale-95 transition-all ${isEdit ? "col-span-2" : ""}`}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
      <LocationManagerModal
        open={showLocManager}
        onClose={() => setShowLocManager(false)}
        onChanged={loadLocations}
      />
    </div>,
    document.body,
  );
}

"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

const VI_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const VI_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const PRESETS = [
  [6, 0],
  [7, 0],
  [8, 0],
  [17, 0],
  [18, 0],
  [19, 0],
  [20, 0],
] as [number, number][];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface DateTimePickerProps {
  value?: string;
  onChange: (iso: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  minDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  label = "Thời gian",
  required,
  error,
  minDate,
}: DateTimePickerProps) {
  const now = new Date();

  const parseValue = (v?: string) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const initial = parseValue(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    initial?.getFullYear() ?? now.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    initial?.getMonth() ?? now.getMonth(),
  );
  const [selDate, setSelDate] = useState<Date | null>(initial);
  const [hours, setHours] = useState(initial?.getHours() ?? 7);
  const [mins, setMins] = useState(initial?.getMinutes() ?? 0);

  useEffect(() => {
    const d = parseValue(value);
    if (d) {
      setSelDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setHours(d.getHours());
      setMins(d.getMinutes());
    }
  }, [value]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const confirm = () => {
    if (!selDate) return;
    const result = new Date(selDate);
    result.setHours(hours, mins, 0, 0);
    onChange(result.toISOString());
    setOpen(false);
  };

  const clear = () => {
    setSelDate(null);
    onChange("");
    setOpen(false);
  };

  const displayLabel = (() => {
    const d = selDate ?? parseValue(value);
    if (!d) return null;
    const dt = new Date(d);
    dt.setHours(hours, mins, 0, 0);
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}  ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  })();

  // Calendar data
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const trailingCells = (7 - ((firstDow + daysInMonth) % 7)) % 7;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chọn ngày và giờ"
    >
      <div
        className="w-full bg-white rounded-2xl overflow-hidden"
        style={{ maxWidth: 320, boxShadow: "0 24px 56px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            {VI_MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5 px-3 pt-2 pb-1">
          {VI_DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-semibold text-gray-400 py-1"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: firstDow }, (_, i) => (
            <div
              key={`p${i}`}
              className="h-9 flex items-center justify-center text-xs text-gray-200"
            >
              {prevMonthDays - firstDow + 1 + i}
            </div>
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayDate = new Date(viewYear, viewMonth, day);
            const isToday =
              day === now.getDate() &&
              viewMonth === now.getMonth() &&
              viewYear === now.getFullYear();
            const isSel =
              selDate?.getDate() === day &&
              selDate?.getMonth() === viewMonth &&
              selDate?.getFullYear() === viewYear;
            const isDisabled = minDate ? dayDate < minDate : false;
            return (
              <button
                type="button"
                key={day}
                disabled={isDisabled}
                onClick={() => setSelDate(new Date(viewYear, viewMonth, day))}
                className={`h-9 w-full rounded-lg text-sm font-medium transition-all
                                    ${isSel
                    ? "bg-blue-600 text-white"
                    : isToday
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : isDisabled
                        ? "text-gray-200 cursor-not-allowed"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {day}
              </button>
            );
          })}

          {Array.from({ length: trailingCells }, (_, i) => (
            <div
              key={`n${i}`}
              className="h-9 flex items-center justify-center text-xs text-gray-200"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Time picker */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 flex-shrink-0">
            <Clock className="w-3.5 h-3.5" /> Giờ
          </span>
          <div className="flex items-center gap-2 flex-1">
            {/* Hour */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => setHours((h) => (h + 1) % 24)}
                className="w-9 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="w-11 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-base font-bold text-gray-900 select-none">
                {pad(hours)}
              </div>
              <button
                type="button"
                onClick={() => setHours((h) => (h + 23) % 24)}
                className="w-9 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            <span className="text-xl font-bold text-gray-400 mb-1">:</span>

            {/* Minute */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => setMins((m) => (m + 15) % 60)}
                className="w-9 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="w-11 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-base font-bold text-gray-900 select-none">
                {pad(mins)}
              </div>
              <button
                type="button"
                onClick={() => setMins((m) => (m + 45) % 60)}
                className="w-9 h-6 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5 ml-1">
              {PRESETS.map(([ph, pm]) => (
                <button
                  type="button"
                  key={`${ph}${pm}`}
                  onClick={() => {
                    setHours(ph);
                    setMins(pm);
                  }}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors font-medium
                                        ${hours === ph && mins === pm
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                >
                  {pad(ph)}:{pad(pm)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={clear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Xóa
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Hủy
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!selDate}
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5
                                ${selDate ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              <Check className="w-3.5 h-3.5" /> Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all
                    ${displayLabel
            ? "border-blue-400 bg-white ring-1 ring-blue-100"
            : error
              ? "border-red-300 bg-white"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
          }`}
      >
        <span
          className={`flex items-center gap-2 ${displayLabel ? "text-gray-900 font-medium" : "text-gray-400"}`}
        >
          <CalendarDays
            className={`w-4 h-4 flex-shrink-0 ${displayLabel ? "text-blue-500" : "text-gray-400"}`}
          />
          {displayLabel ?? "Chọn ngày & giờ"}
        </span>
        {displayLabel ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Portal modal — renders at document.body, always centered */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(modal, document.body)}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

export default function EventTypeFilterDropdown({
  value,
  onChange,
  options,
  allLabel = "Tất cả loại hoạt động",
}: {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    };
    if (mounted) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mounted]);

  const close = () => {
    setOpen(false);
    setTimeout(() => setMounted(false), 150);
  };

  const toggle = () => {
    if (open) close();
    else setOpen(true);
  };

  const selected = options.find((o) => o.value === value);
  const currentLabel = value ? selected?.label : allLabel;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-xl px-4 py-3 text-sm font-medium text-gray-900 transition-colors ${open
            ? "border-blue-400 ring-2 ring-blue-100"
            : "border-gray-200 hover:border-gray-300"
          }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {mounted && (
        <div
          className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden origin-top"
          style={{
            transform: open
              ? "scale(1) translateY(0)"
              : "scale(0.96) translateY(-6px)",
            opacity: open ? 1 : 0,
            transition:
              "transform .16s cubic-bezier(.34,1.56,.64,1), opacity .12s ease",
          }}
        >
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${!value
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                }`}
            >
              {allLabel}
              {!value && <Check className="w-4 h-4" />}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${value === opt.value
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {opt.label}
                {value === opt.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

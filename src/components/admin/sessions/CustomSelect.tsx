"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export interface CustomSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  imageUrl?: string | null;
}

const DEFAULT_TRIGGER =
  "w-full flex items-center justify-between text-left rounded-xl px-4 py-3 text-sm transition-all " +
  "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)] " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent";

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "-- Chọn --",
  triggerClassName,
}: {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxH: 224,
    up: false,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();

    const MIN_LIST_WIDTH = 240;
    const GAP = 6;
    const EDGE = 8;
    const DESIRED_MAX = 224; // = max-h-56

    const width = Math.max(rect.width, MIN_LIST_WIDTH);
    const maxLeft = window.innerWidth - width - EDGE;
    const left = Math.max(EDGE, Math.min(rect.left, maxLeft));

    // Dùng visualViewport để tính đúng khi bàn phím mở / thanh địa chỉ co giãn
    const vv = window.visualViewport;
    const vTop = vv ? vv.offsetTop : 0;
    const vBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

    const spaceBelow = vBottom - rect.bottom - GAP - EDGE;
    const spaceAbove = rect.top - vTop - GAP - EDGE;

    // Mở lên trên nếu phía dưới chật mà phía trên rộng hơn
    const up = spaceBelow < 160 && spaceAbove > spaceBelow;
    const room = up ? spaceAbove : spaceBelow;
    const maxH = Math.max(96, Math.min(DESIRED_MAX, room));

    setPos({
      top: up ? rect.top - GAP : rect.bottom + GAP,
      left,
      width,
      maxH,
      up,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = (e: Event) => {
      if (listRef.current && listRef.current.contains(e.target as Node)) return;
      updatePosition();
    };
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open) updatePosition();
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={triggerClassName ?? DEFAULT_TRIGGER}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {current?.imageUrl && (
            <img
              src={current.imageUrl}
              alt=""
              className="w-5 h-5 rounded object-cover flex-shrink-0"
            />
          )}
          <span
            className={`truncate ${current ? "text-[var(--text)]" : "text-[var(--text-faint)]"
              }`}
          >
            {current?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-faint)] flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {mounted &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.up ? "translateY(-100%)" : undefined,
              zIndex: 9999,
              pointerEvents: open ? "auto" : "none",
            }}
          >
            <div
              ref={listRef}
              style={{
                maxHeight: pos.maxH,
                boxShadow: "var(--shadow-strong)",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
              className={`overflow-y-auto hide-scrollbar bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1 transition-[opacity,transform] duration-150 ease-out ${pos.up ? "origin-bottom" : "origin-top"
                } ${open
                  ? "opacity-100 scale-100 translate-y-0"
                  : `opacity-0 scale-95 ${pos.up ? "translate-y-1" : "-translate-y-1"}`
                }`}
            >
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    ref={isActive ? activeRef : undefined}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm transition-colors duration-150 ${isActive
                      ? "bg-[var(--primary-soft)] text-[var(--primary)] font-medium"
                      : "text-[var(--text)] hover:bg-[var(--surface-hover)]"
                      }`}
                  >
                    {opt.imageUrl && (
                      <img
                        src={opt.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-[var(--border)]"
                      />
                    )}
                    <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                    {opt.subLabel && (
                      <span className="flex-shrink-0 text-xs text-[var(--text-faint)]">
                        {opt.subLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
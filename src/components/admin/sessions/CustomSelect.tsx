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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const MIN_LIST_WIDTH = 240;
    const width = Math.max(rect.width, MIN_LIST_WIDTH);
    const maxLeft = window.innerWidth - width - 8;
    const left = Math.max(8, Math.min(rect.left, maxLeft));
    setPos({
      top: rect.bottom + 6,
      left,
      width,
    });
  };

  useLayoutEffect(() => {
    updatePosition();
  }, []);

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
        className={
          triggerClassName ??
          "input-field w-full flex items-center justify-between text-left"
        }
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
            className={`truncate ${current ? "text-gray-900" : "text-gray-400"}`}
          >
            {current?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {mounted &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
            className={`max-h-56 overflow-y-auto hide-scrollbar bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] py-1 origin-top transition-[opacity,transform] duration-150 ease-out ${open
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              }`}
          >
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm transition-colors duration-150 ${isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-gray-100"
                    />
                  )}
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {opt.subLabel && (
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {opt.subLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
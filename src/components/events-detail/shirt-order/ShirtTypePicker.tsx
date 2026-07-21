"use client";

import { colorSwatchFromName, fmt } from "@/utils/utils";
import { CheckCircle2, Shirt } from "lucide-react";

export function ShirtTypePicker({
  shirtTypes,
  selectedType,
  selectedTypeId,
  setSelectedTypeId,
  activeColor,
  activeColorImage,
  selectedColorId,
  setSelectedColorId,
  cart,
  myRegistrations,
  openLightbox,
}: {
  shirtTypes: any[];
  selectedType: any;
  selectedTypeId: string | null;
  setSelectedTypeId: (id: string) => void;
  activeColor: any;
  activeColorImage: string | null;
  selectedColorId: string | null;
  setSelectedColorId: (id: string) => void;
  cart: any[];
  myRegistrations: any[];
  openLightbox: (src: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">1. Chọn mẫu áo</h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {shirtTypes.map((type) => {
          const images: string[] = (type.colors ?? []).flatMap((c: any) =>
            (c.images ?? []).map((img: any) => (typeof img === "string" ? img : img.url)),
          );
          const active = selectedType?.id === type.id;
          const alreadyInCartOrOrder =
            cart.some((c) => c.shirt_type_id === type.id) ||
            myRegistrations.some((r: any) => r.shirt_type_id === type.id);
          const previewSrc = active ? (activeColorImage ?? images[0]) : images[0];

          return (
            <div
              key={type.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTypeId(type.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedTypeId(type.id)}
              className={`relative text-left rounded-2xl border-2 p-2 w-[104px] sm:w-[140px] lg:w-[160px] flex-shrink-0 transition-colors cursor-pointer ${active ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"
                }`}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </span>
              )}
              {alreadyInCartOrOrder && (
                <span className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded-full z-10">
                  Đã chọn
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (previewSrc) openLightbox(previewSrc);
                }}
                className="w-full aspect-square rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center mb-2"
              >
                {previewSrc ? (
                  <img src={previewSrc} className="w-full h-full object-cover" />
                ) : (
                  <Shirt className="w-7 h-7 text-gray-300" />
                )}
              </button>

              <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{type.name}</p>
              {(type.price_per_shirt ?? 0) > 0 && (
                <p className="text-[11px] sm:text-sm font-medium text-blue-600 mt-0.5">
                  {fmt(type.price_per_shirt)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(selectedType?.colors ?? []).length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 mb-2">Màu sắc</p>
          <div className="flex flex-wrap gap-3">
            {(selectedType.colors ?? []).map((c: any) => {
              const isActive = activeColor?.id === c.id;
              const swatch = colorSwatchFromName(c.name);
              const isLightSwatch =
                swatch.toLowerCase() === "#ffffff" || swatch.toLowerCase() === "#eab308";

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedColorId(c.id)}
                  className="flex flex-col items-center gap-1"
                  title={c.name}
                >
                  <span
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                      }`}
                    style={{
                      backgroundColor: swatch,
                      boxShadow:
                        swatch.toLowerCase() === "#ffffff"
                          ? "inset 0 0 0 1px rgba(0,0,0,0.08)"
                          : undefined,
                    }}
                  >
                    {isActive && (
                      <CheckCircle2
                        className={`w-4 h-4 ${isLightSwatch ? "text-gray-700" : "text-white"}`}
                      />
                    )}
                  </span>
                  <span className="text-[10px] text-gray-500 max-w-[64px] truncate">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

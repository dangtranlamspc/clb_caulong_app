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
      <h3 className="font-bold text-gray-900">1. Chọn mẫu áo</h3>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {shirtTypes.map((type) => {
          const active = selectedType?.id === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedTypeId(type.id)}
              className={`relative flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap tab-btn ${active
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 tab-btn-active"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
            >
              {type.name}
            </button>
          );
        })}
      </div>

      {selectedType && (
        <div className="flex flex-col-reverse sm:flex-row gap-5">
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-lg font-bold text-gray-900">{selectedType.name}</p>
              {(selectedType.price_per_shirt ?? 0) > 0 && (
                <p className="text-blue-600 font-bold">{fmt(selectedType.price_per_shirt)}</p>
              )}
            </div>

            {(selectedType.colors ?? []).length > 0 && (
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
                          className={`color-dot relative w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-sm transition-colors ${isActive
                            ? "border-blue-500 ring-2 ring-blue-200 color-dot-pop"
                            : "border-gray-200"
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
                        <span
                          className={`text-[10px] max-w-[64px] truncate ${isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                            }`}
                        >
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => activeColorImage && openLightbox(activeColorImage)}
            className="w-full sm:w-[320px] aspect-[16/10] rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-zoom-in"
          >
            {activeColorImage ? (
              <img
                key={activeColorImage}
                src={activeColorImage}
                className="w-full h-full object-contain shirt-image-pop"
                alt=""
              />
            ) : (
              <Shirt className="w-10 h-10 text-gray-300" />
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        .tab-btn {
          transition: background-color 0.25s ease, color 0.25s ease,
            box-shadow 0.25s ease, transform 0.2s ease;
        }
        .tab-btn:active {
          transform: scale(0.96);
        }
        .tab-btn-active {
          animation: tabPop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .color-dot-pop {
          animation: colorPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .shirt-image-pop {
          animation: imageFadeIn 0.3s ease-out;
        }
        @keyframes tabPop {
          0% {
            transform: scale(0.92);
          }
          60% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes colorPop {
          0% {
            transform: scale(0.8);
          }
          55% {
            transform: scale(1.18);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes imageFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
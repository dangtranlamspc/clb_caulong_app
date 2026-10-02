"use client";
import { BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";
import { c, alpha } from "@/lib/theme";

export function HandbookEntryCard({
    onClick,
    seen,
}: {
    onClick: () => void;
    seen?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            style={{
                background: `linear-gradient(135deg, ${alpha("primary", 10)} 0%, transparent 60%), ${c.surface}`,
                border: `1px solid ${c.border}`,
                boxShadow: c.shadow,
            }}
        >
            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: c.primarySoft }}
            >
                <BookOpen className="w-5 h-5" style={{ color: c.primary }} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-sm" style={{ color: c.text }}>
                        Sổ tay CLB
                    </p>
                    {seen && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: c.successSoft, color: c.success }}
                        >
                            <CheckCircle2 className="w-3 h-3" />
                            Đã đọc
                        </span>
                    )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>
                    Quy định, quy tắc &amp; thông tin CLB
                </p>
            </div>

            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: c.textFaint }} />
        </button>
    );
}
"use client";
import { BookOpen, ChevronRight } from "lucide-react";

export function HandbookEntryCard({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full rounded-2xl p-4 flex items-center gap-3 text-left shadow-lg shadow-black/10 active:scale-[0.99] transition-transform"
            style={{ background: "linear-gradient(135deg, #183153, #0d2340)" }}
        >
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Sổ tay CLB</p>
                <p className="text-white/60 text-xs mt-0.5">
                    Quy định, quy tắc &amp; thông tin CLB
                </p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" />
        </button>
    );
}
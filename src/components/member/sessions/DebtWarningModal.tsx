"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { c } from "@/lib/theme";

export default function DebtWarningModal({
    debt,
    onClose,
}: {
    debt: number;
    onClose: () => void;
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const close = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            style={{
                background: visible ? c.overlay : "rgba(0,0,0,0)",
                transition: "background 250ms ease-out",
            }}
            onClick={(e) => e.target === e.currentTarget && close()}
        >
            <div
                className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center"
                style={{
                    boxShadow: c.shadowStrong,
                    transform: visible ? "scale(1)" : "scale(0.95)",
                    opacity: visible ? 1 : 0,
                    transition: "transform 250ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
            >
                <div className="w-12 h-12 mx-auto rounded-full bg-[var(--danger-soft)] flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-[var(--danger)]" />
                </div>
                <h3 className="font-bold text-[var(--text)]">Không thể đăng ký buổi đánh</h3>
                <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-snug">
                    Bạn còn khoản chi phí{" "}
                    <span className="font-bold text-[var(--danger)]">
                        {Math.round(debt).toLocaleString("vi-VN")}đ
                    </span>{" "}
                    chưa thanh toán (ví đang ghi nợ). Vui lòng thanh toán để tiếp tục đăng ký.
                </p>
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={close}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                    >
                        Để sau
                    </button>
                    <Link
                        href="/wallet?topup=1"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center"
                    >
                        Thanh toán
                    </Link>
                </div>
            </div>
        </div>,
        document.body,
    );
}
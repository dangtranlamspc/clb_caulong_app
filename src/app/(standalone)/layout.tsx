"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function StandaloneLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [ready, setReady] = useState(false);

    // Guard đăng nhập: copy đúng đoạn kiểm tra token/redirect đang dùng trong
    // layout của (member) vào đây. Dưới đây chỉ là ví dụ.
    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (!token && !user) {
            router.replace("/login");
            return;
        }
        setReady(true);
    }, [user, router]);

    if (!ready) return null;

    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <main className="mx-auto w-full max-w-xl px-4 py-5">{children}</main>
        </div>
    );
}
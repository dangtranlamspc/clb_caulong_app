"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { eventsAdminApi } from "@/lib/api";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function BirthdayFormPage({
    activityId,
    onSaved,
    onClose,
}: {
    activityId?: string;
    onSaved?: () => void;
    onClose?: () => void;
} = {}) {
    const params = useParams<{ id?: string }>();
    const router = useRouter();
    const id = activityId ?? params?.id;
    const now = new Date();
    const [form, setForm] = useState({
        title: `Sinh nhật thành viên tháng ${now.getMonth() + 1}`,
        emoji: "🎂",
        event_date: "",
        status: "upcoming",
        month: now.getMonth() + 1,
        year: now.getFullYear(),
    });
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        eventsAdminApi
            .get(id)
            .then(({ data }: any) => {
                setForm({
                    title: data.title,
                    emoji: data.emoji ?? "🎂",
                    event_date: data.event_date ? data.event_date.slice(0, 16) : "",
                    status: data.status,
                    month: data.detail?.month ?? now.getMonth() + 1,
                    year: data.detail?.year ?? now.getFullYear(),
                });
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async () => {
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");

        setSaving(true);
        try {
            const payload = {
                type: "birthday",
                title: form.title,
                emoji: form.emoji,
                event_date: form.event_date || undefined,
                status: form.status,
                detail: { month: form.month, year: form.year },
            };
            if (id) await eventsAdminApi.update(id, payload);
            else await eventsAdminApi.create(payload);
            toast.success("Đã lưu hoạt động");
            if (onSaved) onSaved();
            else router.push("/admin/events");
        } catch {
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="max-w-lg mx-auto p-8 text-center text-gray-400">Đang tải...</div>
        );

    return (
        <div className="max-w-lg mx-auto space-y-4 p-6">
            <h1 className="text-xl font-bold text-gray-900">🎂 Sinh nhật thành viên</h1>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                <input
                    className="input-field"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                    <select
                        className="input-field"
                        value={form.month}
                        onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                    >
                        {MONTHS.map((m) => (
                            <option key={m} value={m}>
                                Tháng {m}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                    <input
                        type="number"
                        className="input-field"
                        value={form.year}
                        onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày tổ chức mừng SN (tuỳ chọn)
                </label>
                <input
                    type="datetime-local"
                    className="input-field"
                    value={form.event_date}
                    onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="completed">Đã diễn ra</option>
                    <option value="cancelled">Đã huỷ</option>
                </select>
            </div>

            <p className="text-xs text-gray-400 italic">
                Danh sách thành viên có sinh nhật sẽ tự động lấy từ hồ sơ thành viên theo
                tháng/năm đã chọn, không cần đăng ký.
            </p>

            <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
            >
                {saving ? "Đang lưu..." : "Lưu hoạt động"}
            </button>
        </div>
    );
}
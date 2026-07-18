"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { eventsAdminApi } from "@/lib/api";

export default function OfflineEventFormPage({
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
    const [form, setForm] = useState({
        title: "",
        emoji: "🔥",
        location: "",
        event_date: "",
        status: "ongoing",
        max_participants: "",
        fee_per_person: "0",
        description: "",
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
                    emoji: data.emoji ?? "🔥",
                    location: data.location ?? "",
                    event_date: data.event_date ? data.event_date.slice(0, 16) : "",
                    status: data.status,
                    description: data.description ?? "",
                    max_participants:
                        data.detail?.max_participants != null
                            ? String(data.detail.max_participants)
                            : "",
                    fee_per_person: String(data.detail?.fee_per_person ?? "0"),
                });
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async () => {
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");
        if (!form.event_date) return toast.error("Vui lòng chọn ngày diễn ra");

        setSaving(true);
        try {
            const payload = {
                type: "offline_event",
                title: form.title,
                emoji: form.emoji,
                location: form.location || undefined,
                event_date: form.event_date,
                status: form.status,
                description: form.description || undefined,
                detail: {
                    max_participants: form.max_participants ? Number(form.max_participants) : null,
                    fee_per_person: Number(form.fee_per_person) || 0,
                },
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
            <h1 className="text-xl font-bold text-gray-900">🔥 Offline / BBQ & Giao lưu</h1>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                <input
                    className="input-field"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                <input
                    className="input-field"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày diễn ra
                    </label>
                    <input
                        type="datetime-local"
                        className="input-field"
                        value={form.event_date}
                        onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số người tối đa
                    </label>
                    <input
                        type="number"
                        className="input-field"
                        placeholder="Không giới hạn"
                        value={form.max_participants}
                        onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value }))}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phí / người</label>
                <input
                    type="number"
                    className="input-field"
                    placeholder="0"
                    value={form.fee_per_person}
                    onChange={(e) => setForm((f) => ({ ...f, fee_per_person: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả (tuỳ chọn)
                </label>
                <textarea
                    className="input-field"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                    <option value="draft">Nháp</option>
                    <option value="open">Mở đăng ký</option>
                    <option value="upcoming">Sắp diễn ra</option>
                    <option value="ongoing">Đang diễn ra</option>
                    <option value="closed">Đã đóng đăng ký</option>
                    <option value="completed">Đã kết thúc</option>
                    <option value="cancelled">Đã huỷ</option>
                </select>
            </div>

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
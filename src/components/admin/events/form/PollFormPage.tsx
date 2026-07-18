"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { eventsAdminApi } from "@/lib/api";

type OptionForm = { id?: string; label: string; image_url?: string };

export default function PollFormPage({
    activityId,
    onSaved,
    onClose,
}: {
    activityId?: string;
    onSaved?: () => void;
    onClose?: () => void;
} = {}) {
    const params = useParams();
    const router = useRouter();
    const id = activityId ?? (params?.id as string | undefined);
    const [form, setForm] = useState({
        title: "",
        emoji: "📊",
        deadline: "",
        status: "open",
        allow_multiple: false,
        description: "",
    });
    const [options, setOptions] = useState<OptionForm[]>([
        { label: "" },
        { label: "" },
    ]);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            eventsAdminApi.get(id),
            eventsAdminApi.getPollOptions(id),
        ])
            .then(([{ data }, { data: opts }]) => {
                setForm({
                    title: data.title,
                    emoji: data.emoji ?? "📊",
                    deadline: data.deadline ? data.deadline.slice(0, 16) : "",
                    status: data.status,
                    description: data.description ?? "",
                    allow_multiple: data.detail?.allow_multiple ?? false,
                });
                setOptions((opts ?? []).length ? opts : [{ label: "" }, { label: "" }]);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const updateOption = (idx: number, label: string) => {
        setOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, label } : o)));
    };
    const addOption = () => setOptions((opts) => [...opts, { label: "" }]);
    const removeOption = (idx: number) =>
        setOptions((opts) => opts.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");
        if (!form.deadline) return toast.error("Vui lòng chọn hạn bình chọn");
        const validOptions = options.filter((o) => o.label.trim());
        if (validOptions.length < 2) return toast.error("Cần ít nhất 2 lựa chọn");

        setSaving(true);
        try {
            const activityFields = {
                type: "poll",
                title: form.title,
                emoji: form.emoji,
                deadline: form.deadline,
                status: form.status,
                description: form.description || undefined,
                detail: { allow_multiple: form.allow_multiple },
            };

            if (id) {
                await eventsAdminApi.update(id, activityFields);
                await eventsAdminApi.updatePollOptions(id, validOptions);
            } else {
                await eventsAdminApi.createPoll({
                    ...activityFields,
                    options: validOptions,
                });
            }
            toast.success("Đã lưu bình chọn");
            if (onSaved) onSaved();
            else router.push("/activities");
        } catch {
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="max-w-lg mx-auto p-8 text-center text-gray-400">
                Đang tải...
            </div>
        );

    return (
        <div className="max-w-lg mx-auto space-y-4 p-6">
            <h1 className="text-xl font-bold text-gray-900">📊 Bình chọn</h1>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề
                </label>
                <input
                    className="input-field"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hạn bình chọn
                </label>
                <input
                    type="datetime-local"
                    className="input-field"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Các lựa chọn
                </label>
                <div className="space-y-2">
                    {options.map((opt, idx) => (
                        <div key={opt.id ?? idx} className="flex gap-2">
                            <input
                                className="input-field flex-1"
                                placeholder={`Lựa chọn ${idx + 1}`}
                                value={opt.label}
                                onChange={(e) => updateOption(idx, e.target.value)}
                            />
                            {options.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => removeOption(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 font-medium"
                >
                    <Plus className="w-4 h-4" /> Thêm lựa chọn
                </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                    type="checkbox"
                    checked={form.allow_multiple}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, allow_multiple: e.target.checked }))
                    }
                />
                Cho phép chọn nhiều lựa chọn
            </label>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả (tuỳ chọn)
                </label>
                <textarea
                    className="input-field"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                    }
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                </label>
                <select
                    className="input-field"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                    <option value="draft">Nháp</option>
                    <option value="open">Đang mở bình chọn</option>
                    <option value="closed">Đã đóng</option>
                    <option value="cancelled">Đã huỷ</option>
                </select>
            </div>

            <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn-primary w-full disabled:opacity-50"
            >
                {saving ? "Đang lưu..." : "Lưu bình chọn"}
            </button>
        </div>
    );
}
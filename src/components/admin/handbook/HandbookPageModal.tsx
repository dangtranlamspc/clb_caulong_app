"use client";
import { useEffect, useState } from "react";
import { X, FileText, BookOpen as BookOpenIcon, LayoutList } from "lucide-react";
import toast from "react-hot-toast";
import { handbookAdminApi, uploadsAdminApi } from "@/lib/api";
import { IconPicker, LucideIconByName } from "./IconPicker";
import { HandbookItemsEditor, HandbookItem } from "./HandbookItemsEditor";

type PageType = "cover" | "toc" | "content";

type HandbookPage = {
    id?: string;
    type: PageType;
    title: string;
    subtitle?: string;
    icon?: string;
    color_theme?: string;
    background_image_url?: string;
    items?: HandbookItem[];
    is_active?: boolean;
    meta?: Record<string, any>;
};

const TYPE_OPTIONS: { value: PageType; label: string; desc: string; icon: any }[] = [
    { value: "cover", label: "Trang bìa", desc: "Trang mở đầu, ảnh nền + tiêu đề", icon: FileText },
    { value: "toc", label: "Mục lục", desc: "Trang danh sách các mục", icon: LayoutList },
    { value: "content", label: "Nội dung", desc: "Trang nội dung với các mục chi tiết", icon: BookOpenIcon },
];

const COLOR_THEMES = [
    { value: "default", label: "Mặc định", className: "bg-slate-500" },
    { value: "success", label: "Xanh lá", className: "bg-emerald-500" },
    { value: "danger", label: "Đỏ", className: "bg-red-500" },
    { value: "warning", label: "Vàng", className: "bg-amber-500" },
    { value: "info", label: "Xanh dương", className: "bg-blue-500" },
];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400";

export function HandbookPageModal({
    open,
    onClose,
    onSaved,
    page,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    page?: HandbookPage | null;
}) {
    const [type, setType] = useState<PageType>("content");
    const [form, setForm] = useState<HandbookPage>({ type: "content", title: "", items: [] });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (open) {
            if (page) {
                setType(page.type);
                setForm({ ...page, items: page.items ?? [] });
            } else {
                setType("content");
                setForm({ type: "content", title: "", items: [] });
            }
        }
    }, [open, page]);
    if (!open) return null;

    const isEdit = !!page?.id;
    const update = (patch: Partial<HandbookPage>) => setForm((f) => ({ ...f, ...patch }));

    const handleUploadBackground = async (file: File) => {
        setUploading(true);
        try {
            const { data } = await uploadsAdminApi.upload(file, "handbook");
            // Response thực tế: { message, url, path } — không lồng trong data.data
            update({
                background_image_url: data?.url,
                meta: { ...(form.meta ?? {}), background_path: data?.path },
            });
            toast.success("Tải ảnh nền thành công");
        } catch {
            // interceptor đã toast lỗi
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error("Vui lòng nhập tiêu đề trang");
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, type };
            if (isEdit && page?.id) {
                await handbookAdminApi.update(page.id, payload);
                toast.success("Đã cập nhật trang sổ tay");
            } else {
                await handbookAdminApi.create(payload);
                toast.success("Đã tạo trang sổ tay");
            }
            onSaved();
            onClose();
        } catch {
            // interceptor đã toast lỗi
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-[#F4F6FA] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col">
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 text-sm">{isEdit ? "Sửa trang sổ tay" : "Thêm trang sổ tay"}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    {!isEdit && (
                        <Field label="Loại trang" required>
                            <div className="grid grid-cols-3 gap-2">
                                {TYPE_OPTIONS.map((t) => {
                                    const active = type === t.value;
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setType(t.value)}
                                            className={`rounded-2xl p-3 border flex flex-col items-center gap-1.5 text-center transition-colors ${active ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-100 text-gray-600"
                                                }`}
                                        >
                                            <Icon className="w-4.5 h-4.5" />
                                            <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">{TYPE_OPTIONS.find((t) => t.value === type)?.desc}</p>
                        </Field>
                    )}

                    <Field label="Tiêu đề" required>
                        <input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="VD: Quy định chung" className={inputClass} />
                    </Field>

                    <Field label="Phụ đề">
                        <input value={form.subtitle ?? ""} onChange={(e) => update({ subtitle: e.target.value })} placeholder="Mô tả ngắn (không bắt buộc)" className={inputClass} />
                    </Field>

                    <Field label="Icon trang">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <LucideIconByName name={form.icon} className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <IconPicker value={form.icon} onChange={(name) => update({ icon: name })} />
                            </div>
                        </div>
                    </Field>

                    {type === "cover" && (
                        <Field label="Ảnh nền">
                            <div className="space-y-2">
                                {form.background_image_url && (
                                    <img src={form.background_image_url} alt="background" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                                )}
                                <label className="block">
                                    <span className="inline-flex items-center justify-center w-full rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm text-gray-400 cursor-pointer hover:border-blue-300 hover:text-blue-500">
                                        {uploading ? "Đang tải lên..." : "Chọn ảnh nền"}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploading}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUploadBackground(file);
                                        }}
                                    />
                                </label>
                            </div>
                        </Field>
                    )}

                    {type === "content" && (
                        <>
                            <Field label="Màu chủ đề">
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_THEMES.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => update({ color_theme: c.value })}
                                            className={`w-9 h-9 rounded-full ${c.className} flex items-center justify-center border-2 ${form.color_theme === c.value ? "border-gray-900" : "border-transparent"
                                                }`}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </Field>

                            <Field label="Danh sách mục">
                                <HandbookItemsEditor items={form.items ?? []} onChange={(items) => update({ items })} />
                            </Field>
                        </>
                    )}

                    {type === "toc" && (
                        <p className="text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-3">
                            Trang mục lục sẽ tự động liệt kê các trang nội dung theo thứ tự hiển thị.
                        </p>
                    )}

                    <Field label="Trạng thái">
                        <button
                            type="button"
                            onClick={() => update({ is_active: !(form.is_active ?? true) })}
                            className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-left flex items-center justify-between border ${(form.is_active ?? true) ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400"
                                }`}
                        >
                            {(form.is_active ?? true) ? "Đang hiển thị" : "Đang ẩn"}
                            <span className="text-xs font-normal">(bấm để đổi)</span>
                        </button>
                    </Field>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex gap-2">
                    <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-gray-500 bg-gray-50">
                        Huỷ
                    </button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-blue-500 disabled:opacity-60">
                        {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                </div>
            </div>
        </div>
    );
}
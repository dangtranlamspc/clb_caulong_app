import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { handbookAdminApi, uploadsAdminApi } from "@/lib/api";
import { IconPicker, LucideIconByName } from "./IconPicker";
import { HandbookItemsEditor, HandbookItem } from "./HandbookItemsEditor";

export type HandbookPageMode = "cover" | "toc" | "content";

type HandbookPage = {
    id?: string;
    type?: HandbookPageMode;
    parent_id?: string | null;
    page_code?: string;
    title: string;
    subtitle?: string;
    icon?: string;
    color_theme?: string;
    background_image_url?: string;
    items?: HandbookItem[];
    is_active?: boolean;
    meta?: Record<string, any>;
};

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

const MODE_TITLE: Record<HandbookPageMode, { create: string; edit: string }> = {
    cover: { create: "Tạo trang bìa", edit: "Sửa trang bìa" },
    toc: { create: "Tạo trang mục lục", edit: "Sửa trang mục lục" },
    content: { create: "Thêm mục nội dung", edit: "Sửa nội dung" },
};

export function HandbookPageModal({
    open,
    onClose,
    onSaved,
    mode,
    page,
    parentId = null,
}: {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    mode: HandbookPageMode;
    page?: HandbookPage | null;
    parentId?: string | null;
}) {
    const [form, setForm] = useState<HandbookPage>({ title: "" });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [savedId, setSavedId] = useState<string | undefined>(page?.id);

    const [mounted, setMounted] = useState(open);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            setClosing(false);
        } else if (mounted) {
            setClosing(true);
            const t = setTimeout(() => {
                setMounted(false);
                setClosing(false);
            }, 250);
            return () => clearTimeout(t);
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            if (page) setForm({ ...page, items: page.items ?? [] });
            else setForm({ title: "", items: [], is_active: true });
            setSavedId(page?.id);
        }
    }, [open, page]);

    if (!mounted) return null;

    const isEdit = !!savedId;
    const isChildPage = mode === "content" && (isEdit ? !!page?.parent_id : !!parentId);
    const update = (patch: Partial<HandbookPage>) => setForm((f) => ({ ...f, ...patch }));

    const handleUploadBackground = async (file: File) => {
        setUploading(true);
        try {
            const { data } = await uploadsAdminApi.upload(file, "handbook");
            update({
                background_image_url: data?.url,
                meta: { ...(form.meta ?? {}), background_path: data?.path },
            });
            toast.success("Tải ảnh nền thành công");
        } catch {
        } finally {
            setUploading(false);
        }
    };

    const ALLOWED_KEYS = [
        "order_index", "page_code", "type", "title", "subtitle", "icon",
        "color_theme", "background_image_url", "items", "meta", "is_active",
    ] as const;

    const buildPayload = () => {
        const payload: any = {};
        for (const key of ALLOWED_KEYS) {
            if (form[key as keyof HandbookPage] !== undefined) payload[key] = form[key as keyof HandbookPage];
        }
        payload.type = mode;
        if (mode === "content" && !isEdit) payload.parent_id = parentId;
        if (mode === "content" && Array.isArray(payload.items)) {
            payload.items = payload.items.map((it: HandbookItem) => ({
                id: it.id,
                icon: it.icon,
                text: it.text,
                variant: it.variant,
                highlight: it.highlight,
            }));
        }
        if (mode !== "content") {
            delete payload.items;
            delete payload.page_code;
            delete payload.color_theme;
        }
        if (mode !== "cover") delete payload.background_image_url;
        return payload;
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error("Vui lòng nhập tiêu đề trang");
            return;
        }
        setSaving(true);
        try {
            const payload = buildPayload();
            if (isEdit && savedId) {
                await handbookAdminApi.update(savedId, payload);
                toast.success("Đã cập nhật trang");
            } else {
                const { data } = await handbookAdminApi.create(payload);
                setSavedId(data?.id);
                toast.success("Đã tạo trang");
            }
            onSaved();
            onClose();
        } catch (err: any) {
            console.error("Handbook save failed:", err?.response?.data ?? err);
            const apiMessage = err?.response?.data?.message;
            const detail = Array.isArray(apiMessage) ? apiMessage.join(", ") : apiMessage;
            toast.error(detail || "Lưu trang thất bại, vui lòng thử lại");
        } finally {
            setSaving(false);
        }
    };

    const heading = MODE_TITLE[mode][isEdit ? "edit" : "create"];

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <div
                className={`absolute inset-0 bg-black/50 transition-opacity duration-250 ${closing ? "opacity-0" : "opacity-100"}`}
                style={{ animation: closing ? undefined : "handbookPageFadeIn 0.25s ease-out" }}
                onClick={onClose}
            />
            <div
                className={`relative w-full sm:max-w-lg max-h-[90vh] bg-[#F4F6FA] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col ${closing ? "animate-handbook-page-out" : "animate-handbook-page-in"
                    }`}
            >
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">{heading}</h2>
                        {isChildPage && <p className="text-[11px] text-gray-400 mt-0.5">Nội dung con — sẽ mở khi bấm vào mục cha</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    <div className="grid grid-cols-[1fr,auto] gap-3">
                        <Field label="Tiêu đề" required>
                            <input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="VD: Quy định chung" className={inputClass} />
                        </Field>
                        {mode === "content" && (
                            <Field label="Số mục">
                                <input
                                    value={form.page_code ?? ""}
                                    onChange={(e) => update({ page_code: e.target.value })}
                                    placeholder={isChildPage ? "3.1" : "03"}
                                    className={`${inputClass} w-20 text-center`}
                                />
                            </Field>
                        )}
                    </div>

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

                    {mode === "cover" && (
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

                    {mode === "content" && (
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
                                <HandbookItemsEditor
                                    items={form.items ?? []}
                                    onChange={(items) => update({ items })}
                                    richText
                                />
                            </Field>
                        </>
                    )}

                    {mode === "toc" && (
                        <p className="text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-3">
                            Danh sách mục lục được lấy tự động từ các mục nội dung cấp 1 (xem ở màn hình quản lý).
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
            <style jsx global>{`
                @keyframes handbookPageFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes handbookPageSlideUp {
                    from { transform: translateY(24px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes handbookPageSlideDown {
                    from { transform: translateY(0) scale(1); opacity: 1; }
                    to { transform: translateY(24px) scale(0.98); opacity: 0; }
                }
                .animate-handbook-page-in {
                    animation: handbookPageSlideUp 0.25s cubic-bezier(0.34, 1.2, 0.64, 1);
                }
                .animate-handbook-page-out {
                    animation: handbookPageSlideDown 0.22s ease-in forwards;
                }
            `}</style>
        </div>
    );
}
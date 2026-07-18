"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { X, ImagePlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { eventsAdminApi, uploadsAdminApi } from "@/lib/api";

const ALL_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const MAX_IMAGES = 8;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function ShirtOrderFormPage({
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
        title: "Đặt áo nhóm",
        emoji: "👕",
        deadline: "",
        status: "open",
        price_per_shirt: "",
        available_sizes: {
            nam: ["S", "M", "L", "XL", "XXL"] as string[],
            nu: ["S", "M", "L", "XL"] as string[],
        },
        description: "",
    });
    const [images, setImages] = useState<{ url: string; path?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!id) return;
        eventsAdminApi
            .get(id)
            .then(({ data }: any) => {
                const rawSizes = data.detail?.available_sizes;
                const normalizedSizes = Array.isArray(rawSizes)
                    ? { nam: rawSizes, nu: rawSizes }
                    : {
                        nam: rawSizes?.nam ?? ["S", "M", "L", "XL", "XXL"],
                        nu: rawSizes?.nu ?? ["S", "M", "L", "XL"],
                    };
                setForm({
                    title: data.title,
                    emoji: data.emoji ?? "👕",
                    deadline: data.deadline ? data.deadline.slice(0, 16) : "",
                    status: data.status,
                    description: data.description ?? "",
                    price_per_shirt: String(data.detail?.price_per_shirt ?? ""),
                    available_sizes: normalizedSizes,
                });
                const existingImages = data.detail?.images ?? [];
                setImages(
                    existingImages.map((img: any) => (typeof img === "string" ? { url: img } : img)),
                );
            })
            .finally(() => setLoading(false));
    }, [id]);

    const toggleSize = (gender: "nam" | "nu", size: string) => {
        setForm((f) => ({
            ...f,
            available_sizes: {
                ...f.available_sizes,
                [gender]: f.available_sizes[gender].includes(size)
                    ? f.available_sizes[gender].filter((s) => s !== size)
                    : [...f.available_sizes[gender], size],
            },
        }));
    };

    const handleFilesSelected = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList);

        if (images.length + files.length > MAX_IMAGES) {
            toast.error(`Chỉ được tối đa ${MAX_IMAGES} ảnh`);
            return;
        }

        const validFiles: File[] = [];
        for (const file of files) {
            if (!ALLOWED_MIME.includes(file.type)) {
                toast.error(`${file.name}: định dạng ảnh không hợp lệ`);
                continue;
            }
            if (file.size > MAX_SIZE_BYTES) {
                toast.error(`${file.name}: vượt quá 5MB`);
                continue;
            }
            validFiles.push(file);
        }
        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const uploaded: { url: string; path: string }[] = [];
            for (const file of validFiles) {
                try {
                    const { data } = await uploadsAdminApi.upload(file, "uploads");
                    uploaded.push({ url: data.url, path: data.path });
                } catch {
                    // interceptor already shows a toast for this failure
                }
            }
            if (uploaded.length) {
                setImages((prev) => [...prev, ...uploaded]);
            }
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");
        if (!form.deadline) return toast.error("Vui lòng chọn deadline");
        if (form.available_sizes.nam.length === 0 && form.available_sizes.nu.length === 0)
            return toast.error("Chọn ít nhất 1 size cho Nam hoặc Nữ");

        setSaving(true);
        try {
            const payload = {
                type: "shirt_order",
                title: form.title,
                emoji: form.emoji,
                deadline: form.deadline,
                status: form.status,
                description: form.description || undefined,
                detail: {
                    price_per_shirt: Number(form.price_per_shirt) || 0,
                    available_sizes: form.available_sizes,
                    images: images.map((img) => img.url),
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
            <h1 className="text-xl font-bold text-gray-900 pr-8">👕 Đặt áo nhóm</h1>

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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deadline đăng ký
                    </label>
                    <input
                        type="datetime-local"
                        className="input-field"
                        value={form.deadline}
                        onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá / áo (đ)
                    </label>
                    <input
                        type="number"
                        className="input-field"
                        value={form.price_per_shirt}
                        onChange={(e) => setForm((f) => ({ ...f, price_per_shirt: e.target.value }))}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Size Nam</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_SIZES.map((size) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize("nam", size)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.available_sizes.nam.includes(size)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-500 border-gray-200"
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Size Nữ</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_SIZES.map((size) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize("nu", size)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.available_sizes.nu.includes(size)
                                ? "bg-pink-600 text-white border-pink-600"
                                : "bg-white text-gray-500 border-gray-200"
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ảnh mẫu áo ({images.length}/{MAX_IMAGES})
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {images.map((img, index) => (
                        <div
                            key={img.url + index}
                            className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                        >
                            <img src={img.url} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}

                    {images.length < MAX_IMAGES && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                        >
                            {uploading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <ImagePlus size={20} />
                                    <span className="text-xs mt-1">Thêm ảnh</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <p className="text-xs text-gray-400 mt-1">
                    PNG/JPEG/WEBP/SVG, tối đa 5MB mỗi ảnh, tối đa {MAX_IMAGES} ảnh
                </p>
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
                    <option value="open">Đang nhận đăng ký</option>
                    <option value="closed">Đã đóng</option>
                    <option value="cancelled">Đã huỷ</option>
                </select>
            </div>

            <button
                onClick={handleSubmit}
                disabled={saving || uploading}
                className="btn-primary w-full disabled:opacity-50"
            >
                {saving ? "Đang lưu..." : "Lưu hoạt động"}
            </button>
        </div>
    );
}
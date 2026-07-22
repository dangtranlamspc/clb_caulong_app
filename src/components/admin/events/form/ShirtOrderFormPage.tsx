"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { X, ImagePlus, Loader2, Plus, Trash2, Palette } from "lucide-react";
import toast from "react-hot-toast";
import { eventsAdminApi, uploadsAdminApi } from "@/lib/api";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const MAX_IMAGES_PER_COLOR = 8;
const MAX_SHIRT_TYPES = 6;
const MAX_COLORS_PER_TYPE = 6;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const genId = () => "st_" + Math.random().toString(36).slice(2, 10);
const genColorId = () => "cl_" + Math.random().toString(36).slice(2, 10);

interface ShirtImage {
    url: string;
    path?: string;
}

interface ColorState {
    id: string;
    name: string;
    images: ShirtImage[];
}

interface ShirtTypeState {
    id: string;
    name: string;
    price_per_shirt: string;
    colors: ColorState[];
    available_sizes: { nam: string[]; nu: string[] };
}

function newColor(name = "Mặc định"): ColorState {
    return { id: genColorId(), name, images: [] };
}

function newShirtType(name = ""): ShirtTypeState {
    return {
        id: genId(),
        name,
        price_per_shirt: "",
        colors: [newColor()],
        available_sizes: {
            nam: ["S", "M", "L", "XL"],
            nu: ["S", "M", "L"],
        },
    };
}

const DEFAULT_SHIRT_TYPES = [
    newShirtType("Loại áo 1"),
    newShirtType("Loại áo 2"),
    newShirtType("Loại áo 3"),
];

const fileKey = (typeId: string, colorId: string) => `${typeId}:${colorId}`;

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
        description: "",
    });
    const [shirtTypes, setShirtTypes] = useState<ShirtTypeState[]>(
        DEFAULT_SHIRT_TYPES,
    );
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        if (!id) return;
        eventsAdminApi
            .get(id)
            .then(({ data }: any) => {
                setForm({
                    title: data.title,
                    emoji: data.emoji ?? "👕",
                    deadline: data.deadline ? data.deadline.slice(0, 16) : "",
                    status: data.status,
                    description: data.description ?? "",
                });

                const rawTypes = data.detail?.shirt_types;
                if (Array.isArray(rawTypes) && rawTypes.length > 0) {
                    setShirtTypes(
                        rawTypes.map((t: any) => {
                            const rawColors = t.colors;
                            const colors: ColorState[] =
                                Array.isArray(rawColors) && rawColors.length > 0
                                    ? rawColors.map((c: any) => ({
                                        id: c.id ?? genColorId(),
                                        name: c.name ?? "Mặc định",
                                        images: (c.images ?? []).map((img: any) =>
                                            typeof img === "string" ? { url: img } : img,
                                        ),
                                    }))
                                    : [
                                        {
                                            id: genColorId(),
                                            name: "Mặc định",
                                            images: (t.images ?? []).map((img: any) =>
                                                typeof img === "string" ? { url: img } : img,
                                            ),
                                        },
                                    ];
                            return {
                                id: t.id ?? genId(),
                                name: t.name ?? "",
                                price_per_shirt: String(t.price_per_shirt ?? ""),
                                colors,
                                available_sizes: {
                                    nam: t.available_sizes?.nam ?? [],
                                    nu: t.available_sizes?.nu ?? [],
                                },
                            };
                        }),
                    );
                } else {
                    const rawSizes = data.detail?.available_sizes;
                    const legacyImages = data.detail?.images ?? [];
                    if (data.detail) {
                        setShirtTypes([
                            {
                                id: genId(),
                                name: "Áo mẫu",
                                price_per_shirt: String(
                                    data.detail?.price_per_shirt ?? "",
                                ),
                                colors: [
                                    {
                                        id: genColorId(),
                                        name: "Mặc định",
                                        images: legacyImages.map((img: any) =>
                                            typeof img === "string" ? { url: img } : img,
                                        ),
                                    },
                                ],
                                available_sizes: Array.isArray(rawSizes)
                                    ? { nam: rawSizes, nu: rawSizes }
                                    : {
                                        nam: rawSizes?.nam ?? [],
                                        nu: rawSizes?.nu ?? [],
                                    },
                            },
                        ]);
                    }
                }
            })
            .finally(() => setLoading(false));
    }, [id]);

    const updateShirtType = (typeId: string, patch: Partial<ShirtTypeState>) => {
        setShirtTypes((prev) =>
            prev.map((t) => (t.id === typeId ? { ...t, ...patch } : t)),
        );
    };

    const toggleSize = (typeId: string, gender: "nam" | "nu", size: string) => {
        setShirtTypes((prev) =>
            prev.map((t) => {
                if (t.id !== typeId) return t;
                const current = t.available_sizes[gender];
                return {
                    ...t,
                    available_sizes: {
                        ...t.available_sizes,
                        [gender]: current.includes(size)
                            ? current.filter((s) => s !== size)
                            : [...current, size],
                    },
                };
            }),
        );
    };

    const addShirtType = () => {
        if (shirtTypes.length >= MAX_SHIRT_TYPES) {
            toast.error(`Tối đa ${MAX_SHIRT_TYPES} loại áo`);
            return;
        }
        setShirtTypes((prev) => [
            ...prev,
            newShirtType(`Loại áo ${prev.length + 1}`),
        ]);
    };

    const removeShirtType = (typeId: string) => {
        if (shirtTypes.length <= 1) {
            toast.error("Cần ít nhất 1 loại áo");
            return;
        }
        setShirtTypes((prev) => prev.filter((t) => t.id !== typeId));
    };

    // ── Màu sắc ──
    const addColor = (typeId: string) => {
        setShirtTypes((prev) =>
            prev.map((t) => {
                if (t.id !== typeId) return t;
                if (t.colors.length >= MAX_COLORS_PER_TYPE) {
                    toast.error(`Tối đa ${MAX_COLORS_PER_TYPE} màu mỗi loại áo`);
                    return t;
                }
                return {
                    ...t,
                    colors: [...t.colors, newColor(`Màu ${t.colors.length + 1}`)],
                };
            }),
        );
    };

    const removeColor = (typeId: string, colorId: string) => {
        setShirtTypes((prev) =>
            prev.map((t) => {
                if (t.id !== typeId) return t;
                if (t.colors.length <= 1) {
                    toast.error("Cần ít nhất 1 màu cho mỗi loại áo");
                    return t;
                }
                return { ...t, colors: t.colors.filter((c) => c.id !== colorId) };
            }),
        );
    };

    const updateColorName = (typeId: string, colorId: string, name: string) => {
        setShirtTypes((prev) =>
            prev.map((t) =>
                t.id !== typeId
                    ? t
                    : {
                        ...t,
                        colors: t.colors.map((c) =>
                            c.id === colorId ? { ...c, name } : c,
                        ),
                    },
            ),
        );
    };

    const handleFilesSelected = async (
        typeId: string,
        colorId: string,
        fileList: FileList | null,
    ) => {
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList);
        const type = shirtTypes.find((t) => t.id === typeId);
        const color = type?.colors.find((c) => c.id === colorId);
        if (!type || !color) return;

        if (color.images.length + files.length > MAX_IMAGES_PER_COLOR) {
            toast.error(`Chỉ được tối đa ${MAX_IMAGES_PER_COLOR} ảnh mỗi màu`);
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

        const key = fileKey(typeId, colorId);
        setUploadingKey(key);
        try {
            const uploaded: ShirtImage[] = [];
            for (const file of validFiles) {
                try {
                    const { data } = await uploadsAdminApi.upload(file, "uploads");
                    uploaded.push({ url: data.url, path: data.path });
                } catch {
                }
            }
            if (uploaded.length) {
                setShirtTypes((prev) =>
                    prev.map((t) =>
                        t.id !== typeId
                            ? t
                            : {
                                ...t,
                                colors: t.colors.map((c) =>
                                    c.id !== colorId
                                        ? c
                                        : { ...c, images: [...c.images, ...uploaded] },
                                ),
                            },
                    ),
                );
            }
        } finally {
            setUploadingKey(null);
            const inputEl = fileInputRefs.current[key];
            if (inputEl) inputEl.value = "";
        }
    };

    const removeImage = (typeId: string, colorId: string, index: number) => {
        setShirtTypes((prev) =>
            prev.map((t) =>
                t.id !== typeId
                    ? t
                    : {
                        ...t,
                        colors: t.colors.map((c) =>
                            c.id !== colorId
                                ? c
                                : { ...c, images: c.images.filter((_, i) => i !== index) },
                        ),
                    },
            ),
        );
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");
        if (!form.deadline) return toast.error("Vui lòng chọn deadline");
        if (shirtTypes.length === 0)
            return toast.error("Cần ít nhất 1 loại áo");

        for (const t of shirtTypes) {
            if (!t.name.trim())
                return toast.error("Vui lòng nhập tên cho từng loại áo");
            if (
                t.available_sizes.nam.length === 0 &&
                t.available_sizes.nu.length === 0
            )
                return toast.error(
                    `Loại áo "${t.name}" cần chọn ít nhất 1 size (Nam hoặc Nữ)`,
                );
            if (!t.colors.length)
                return toast.error(`Loại áo "${t.name}" cần ít nhất 1 màu`);
            for (const c of t.colors) {
                if (!c.name.trim())
                    return toast.error(
                        `Vui lòng nhập tên màu cho loại áo "${t.name}"`,
                    );
            }
        }

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
                    shirt_types: shirtTypes.map((t) => ({
                        id: t.id,
                        name: t.name.trim(),
                        price_per_shirt: Number(t.price_per_shirt) || 0,
                        colors: t.colors.map((c) => ({
                            id: c.id,
                            name: c.name.trim(),
                            images: c.images,
                        })),
                        available_sizes: t.available_sizes,
                    })),
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

    const formatThousand = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "";
        return Number(digits).toLocaleString("vi-VN");
    };

    const stripThousand = (value: string) => value.replace(/\D/g, "");

    if (loading)
        return (
            <div className="max-w-lg mx-auto p-8 text-center text-gray-400">
                Đang tải...
            </div>
        );

    return (
        <div className="w-full space-y-4 p-6 pt-10">
            <h1 className="text-xl font-bold text-gray-900 pr-8">👕 Đặt áo nhóm</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-1">
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
                        Deadline đăng ký
                    </label>
                    <input
                        type="datetime-local"
                        className="input-field"
                        value={form.deadline}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, deadline: e.target.value }))
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
                        onChange={(e) =>
                            setForm((f) => ({ ...f, status: e.target.value }))
                        }
                    >
                        <option value="draft">Nháp</option>
                        <option value="open">Đang nhận đăng ký</option>
                        <option value="closed">Đã đóng</option>
                        <option value="cancelled">Đã huỷ</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả (tuỳ chọn)
                </label>
                <textarea
                    className="input-field"
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                    }
                />
            </div>

            <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold text-gray-700">
                    Các loại áo ({shirtTypes.length})
                </p>
                <button
                    type="button"
                    onClick={addShirtType}
                    disabled={shirtTypes.length >= MAX_SHIRT_TYPES}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                >
                    <Plus className="w-3.5 h-3.5" /> Thêm loại áo
                </button>
            </div>

            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 items-start">
                {shirtTypes.map((t, idx) => (
                    <div
                        key={t.id}
                        className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <input
                                className="input-field flex-1 font-medium"
                                placeholder={`Tên loại áo ${idx + 1}`}
                                value={t.name}
                                onChange={(e) =>
                                    updateShirtType(t.id, { name: e.target.value })
                                }
                            />
                            {shirtTypes.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeShirtType(t.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Giá / áo (đ)
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="input-field"
                                value={formatThousand(t.price_per_shirt)}
                                onChange={(e) =>
                                    updateShirtType(t.id, {
                                        price_per_shirt: stripThousand(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Size Nam
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_SIZES.map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => toggleSize(t.id, "nam", size)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${t.available_sizes.nam.includes(size)
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
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Size Nữ
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {ALL_SIZES.map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => toggleSize(t.id, "nu", size)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${t.available_sizes.nu.includes(size)
                                            ? "bg-pink-600 text-white border-pink-600"
                                            : "bg-white text-gray-500 border-gray-200"
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Màu sắc, mỗi màu có ảnh riêng ── */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                    <Palette className="w-3.5 h-3.5" /> Màu sắc (
                                    {t.colors.length}/{MAX_COLORS_PER_TYPE})
                                </label>
                                <button
                                    type="button"
                                    onClick={() => addColor(t.id)}
                                    disabled={t.colors.length >= MAX_COLORS_PER_TYPE}
                                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Thêm màu
                                </button>
                            </div>

                            <div className="space-y-3">
                                {t.colors.map((c, cIdx) => {
                                    const key = fileKey(t.id, c.id);
                                    return (
                                        <div
                                            key={c.id}
                                            className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    className="input-field flex-1 text-sm"
                                                    placeholder={`Tên màu ${cIdx + 1}`}
                                                    value={c.name}
                                                    onChange={(e) =>
                                                        updateColorName(t.id, c.id, e.target.value)
                                                    }
                                                />
                                                {t.colors.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeColor(t.id, c.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-[11px] text-gray-400 mb-1">
                                                    Ảnh ({c.images.length}/{MAX_IMAGES_PER_COLOR})
                                                </p>
                                                <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                                                    {c.images.map((img, index) => (
                                                        <div
                                                            key={img.url + index}
                                                            className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                                                        >
                                                            <img
                                                                src={img.url}
                                                                alt={`${c.name} ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeImage(t.id, c.id, index)
                                                                }
                                                                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {c.images.length < MAX_IMAGES_PER_COLOR && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                fileInputRefs.current[key]?.click()
                                                            }
                                                            disabled={uploadingKey === key}
                                                            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50 bg-white"
                                                        >
                                                            {uploadingKey === key ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <ImagePlus size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    ref={(el) => {
                                                        fileInputRefs.current[key] = el;
                                                    }}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        handleFilesSelected(t.id, c.id, e.target.files)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={saving || uploadingKey !== null}
                className="btn-primary w-full disabled:opacity-50"
            >
                {saving ? "Đang lưu..." : "Lưu hoạt động"}
            </button>
        </div>
    );
}
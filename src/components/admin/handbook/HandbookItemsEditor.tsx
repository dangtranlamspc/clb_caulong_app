import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { IconPicker, LucideIconByName } from "./IconPicker";
import RichTextEditor from "@/components/ui/RichTextEditor";

export type HandbookItem = {
    id: string;
    icon?: string;
    text: string;
    variant?: "default" | "success" | "danger" | "warning" | "highlight";
    highlight?: boolean;
};

const VARIANTS: { value: NonNullable<HandbookItem["variant"]>; label: string; className: string }[] = [
    { value: "default", label: "Mặc định", className: "bg-[var(--surface-muted)] text-[var(--text-muted)]" },
    { value: "success", label: "Thành công", className: "bg-[var(--success-soft)] text-[var(--success)]" },
    { value: "danger", label: "Cảnh báo lỗi", className: "bg-[var(--danger-soft)] text-[var(--danger)]" },
    { value: "warning", label: "Lưu ý", className: "bg-[var(--warning-soft)] text-[var(--warning)]" },
    { value: "highlight", label: "Nổi bật", className: "bg-[var(--primary-soft)] text-[var(--primary)]" },
];

function genId() {
    return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function HandbookItemsEditor({
    items,
    onChange,
    richText = false,
}: {
    items: HandbookItem[];
    onChange: (items: HandbookItem[]) => void;
    richText?: boolean;
}) {
    const [openPicker, setOpenPicker] = useState<string | null>(null);

    const addItem = () => onChange([...items, { id: genId(), text: "", variant: "default" }]);
    const updateItem = (id: string, patch: Partial<HandbookItem>) =>
        onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const removeItem = (id: string) => onChange(items.filter((it) => it.id !== id));
    const move = (index: number, dir: -1 | 1) => {
        const next = [...items];
        const target = index + dir;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    return (
        <div className="space-y-2.5">
            {items.map((item, idx) => (
                <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                        <button type="button" onClick={() => move(idx, -1)} className="text-[var(--text-faint)] hover:text-[var(--text-muted)] pt-1.5">
                            <GripVertical className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setOpenPicker(openPicker === item.id ? null : item.id)}
                            className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center flex-shrink-0"
                            title="Chọn icon"
                        >
                            <LucideIconByName name={item.icon} className="w-4.5 h-4.5 text-[var(--text-muted)]" />
                        </button>

                        {richText ? (
                            <div className="flex-1">
                                <RichTextEditor
                                    value={item.text}
                                    onChange={(html) => updateItem(item.id, { text: html })}
                                    placeholder="Nội dung mục..."
                                    minHeight={70}
                                />
                            </div>
                        ) : (
                            <textarea
                                value={item.text}
                                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                                placeholder="Nội dung mục..."
                                rows={2}
                                className="flex-1 resize-none rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                            />
                        )}

                        <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] flex-shrink-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {openPicker === item.id && (
                        <div className="pl-12">
                            <IconPicker value={item.icon} onChange={(name) => updateItem(item.id, { icon: name })} />
                        </div>
                    )}

                    <div className="pl-12 flex flex-wrap gap-1.5">
                        {VARIANTS.map((v) => (
                            <button
                                key={v.value}
                                type="button"
                                onClick={() => updateItem(item.id, { variant: v.value })}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${item.variant === v.value ? `${v.className} border-transparent font-semibold` : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-faint)]"
                                    }`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                className="w-full rounded-2xl border-2 border-dashed border-[var(--border)] py-3 flex items-center justify-center gap-1.5 text-sm text-[var(--text-faint)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:text-[var(--primary)] transition-colors"
            >
                <Plus className="w-4 h-4" /> Thêm mục
            </button>
        </div>
    );
}
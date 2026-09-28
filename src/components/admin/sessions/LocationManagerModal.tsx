"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, Pencil, Check, Save } from "lucide-react";
import toast from "react-hot-toast";
import { locationsAdminApi } from "@/lib/api";

export interface LocationItem { id: string; name: string; address?: string | null }

export default function LocationManagerModal({
    open, onClose, onChanged,
}: { open: boolean; onClose: () => void; onChanged: () => void }) {
    const [items, setItems] = useState<LocationItem[]>([]);
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [editId, setEditId] = useState<string | null>(null);

    const load = async () => {
        const { data } = await locationsAdminApi.list();
        setItems(data);
    };
    useEffect(() => { if (open) load(); }, [open]);

    const reset = () => { setName(""); setAddress(""); setEditId(null); };

    const submit = async (keepOpen: boolean) => {
        if (!name.trim()) return;
        try {
            if (editId) await locationsAdminApi.update(editId, { name, address });
            else await locationsAdminApi.create({ name, address });
            toast.success(editId ? "Đã cập nhật địa điểm" : "Đã thêm địa điểm");
            reset();
            await load();
            onChanged();
            if (!keepOpen) onClose();
        } catch { }
    };

    const remove = async (id: string) => {
        if (!confirm("Xóa địa điểm này?")) return;
        try {
            await locationsAdminApi.delete(id);
            toast.success("Đã xóa");
            await load(); onChanged();
        } catch { }
    };

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Quản lý địa điểm</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-2 border-b border-gray-100">
                    <input className="input-field" placeholder="Tên sân *" value={name}
                        onChange={(e) => setName(e.target.value)} />
                    <input className="input-field" placeholder="Địa chỉ" value={address}
                        onChange={(e) => setAddress(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                        {editId && (
                            <button
                                type="button"
                                onClick={reset}
                                className="btn-secondary text-sm w-auto flex-none"
                            >
                                Hủy sửa
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => submit(true)}
                            className="flex items-center justify-center gap-1 text-sm flex-none w-auto px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium"
                        >
                            <Save className="w-4 h-4" />
                            Lưu và tiếp tục
                        </button>

                        <button
                            type="button"
                            onClick={() => submit(false)}
                            className="btn-primary text-sm w-auto flex-none flex items-center gap-1"
                        >
                            {editId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editId ? "Lưu" : "Thêm"}
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto px-5 py-3 space-y-2">
                    {items.length === 0 && <p className="text-sm text-gray-400">Chưa có địa điểm nào</p>}
                    {items.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
                                {l.address && <p className="text-xs text-gray-400 truncate">{l.address}</p>}
                            </div>
                            <button type="button" className="p-1 text-gray-400 hover:text-blue-600"
                                onClick={() => { setEditId(l.id); setName(l.name); setAddress(l.address ?? ""); }}>
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" className="p-1 text-gray-400 hover:text-red-600"
                                onClick={() => remove(l.id)}>
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
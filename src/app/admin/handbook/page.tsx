"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { handbookAdminApi } from "@/lib/api";
import { LucideIconByName } from "@/components/admin/handbook/IconPicker";
import { HandbookPageModal } from "@/components/admin/handbook/HandbookPageModal";

const TYPE_LABEL: Record<string, string> = { cover: "Bìa", toc: "Mục lục", content: "Nội dung" };
const TYPE_BADGE: Record<string, string> = {
    cover: "bg-violet-100 text-violet-700",
    toc: "bg-blue-100 text-blue-700",
    content: "bg-emerald-100 text-emerald-700",
};

export default function HandbookAdminPage() {
    const [pages, setPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<any | null>(null);
    const [reordering, setReordering] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await handbookAdminApi.list();
            setPages(data ?? []);
        } catch {
            // interceptor đã toast lỗi
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditingPage(null); setModalOpen(true); };
    const openEdit = (page: any) => { setEditingPage(page); setModalOpen(true); };

    const handleDelete = async (page: any) => {
        if (!confirm(`Xoá trang "${page.title}"?`)) return;
        try {
            await handbookAdminApi.delete(page.id);
            toast.success("Đã xoá trang");
            load();
        } catch {
            // interceptor đã toast lỗi
        }
    };

    const move = async (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= pages.length) return;
        const next = [...pages];
        [next[index], next[target]] = [next[target], next[index]];
        setPages(next);
        setReordering(true);
        try {
            await handbookAdminApi.reorder(next.map((p) => p.id));
        } catch {
            load();
        } finally {
            setReordering(false);
        }
    };

    const toggleActive = async (page: any) => {
        try {
            await handbookAdminApi.update(page.id, { is_active: !page.is_active });
            setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, is_active: !p.is_active } : p)));
        } catch {
            // interceptor đã toast lỗi
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Sổ tay CLB</h1>
                    <p className="text-xs text-gray-400 mt-0.5">Quản lý nội dung sổ tay hiển thị cho thành viên</p>
                </div>
                <button onClick={openCreate} className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm active:scale-[0.96]">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="py-16 text-center text-sm text-gray-400">Đang tải...</div>
            ) : pages.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
                    Chưa có trang nào. Bấm nút + để thêm trang đầu tiên.
                </div>
            ) : (
                <div className="space-y-2.5">
                    {pages.map((page, idx) => (
                        <div key={page.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <button onClick={() => move(idx, -1)} disabled={idx === 0 || reordering} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 disabled:opacity-30 hover:bg-gray-50">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => move(idx, 1)} disabled={idx === pages.length - 1 || reordering} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 disabled:opacity-30 hover:bg-gray-50">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                                <LucideIconByName name={page.icon} className="w-5 h-5 text-gray-500" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-bold text-gray-900 truncate">{page.title}</p>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[page.type]}`}>
                                        {TYPE_LABEL[page.type] ?? page.type}
                                    </span>
                                </div>
                                {page.subtitle && <p className="text-xs text-gray-400 truncate">{page.subtitle}</p>}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => toggleActive(page)} title={page.is_active ? "Đang hiển thị" : "Đang ẩn"} className={`w-8 h-8 rounded-lg flex items-center justify-center ${page.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50"}`}>
                                    {page.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button onClick={() => openEdit(page)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(page)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <HandbookPageModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} page={editingPage} />
        </div>
    );
}
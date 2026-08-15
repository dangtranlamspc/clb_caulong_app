"use client";
import { useEffect, useState } from "react";
import {
    Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronRight,
    Eye, EyeOff, ImageIcon, ListTree,
} from "lucide-react";
import toast from "react-hot-toast";
import { handbookAdminApi } from "@/lib/api";
import { LucideIconByName } from "@/components/admin/handbook/IconPicker";
import { HandbookPageModal, HandbookPageMode } from "@/components/admin/handbook/HandbookPageModal";

type ModalState = {
    mode: HandbookPageMode;
    page?: any | null;
    parentId?: string | null;
};

type Tree = { cover: any; toc: any; sections: any[] };

export default function HandbookAdminPage() {
    const [tree, setTree] = useState<Tree>({ cover: null, toc: null, sections: [] });
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState<ModalState | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [reordering, setReordering] = useState(false);

    const openModal = (cfg: ModalState) => {
        setModalConfig(cfg);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await handbookAdminApi.tree();
            setTree({ cover: data?.cover ?? null, toc: data?.toc ?? null, sections: data?.sections ?? [] });
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const handleDelete = async (page: any) => {
        const hasChildren = page.children?.length > 0;
        const msg = hasChildren
            ? `Xoá "${page.title}"? ${page.children.length} nội dung con bên trong cũng sẽ bị xoá.`
            : `Xoá "${page.title}"?`;
        if (!confirm(msg)) return;
        try {
            await handbookAdminApi.delete(page.id);
            toast.success("Đã xoá trang");
            load();
        } catch {
            // interceptor đã toast lỗi
        }
    };

    const toggleActive = async (page: any) => {
        try {
            await handbookAdminApi.update(page.id, { is_active: !page.is_active });
            load();
        } catch {
            // interceptor đã toast lỗi
        }
    };

    // Reorders within a sibling list only (top-level sections, or one section's children).
    const moveSibling = async (siblings: any[], index: number, dir: -1 | 1, parentId: string | null) => {
        const target = index + dir;
        if (target < 0 || target >= siblings.length) return;
        const next = [...siblings];
        [next[index], next[target]] = [next[target], next[index]];
        setReordering(true);
        try {
            await handbookAdminApi.reorder(next.map((p) => p.id), parentId);
            await load();
        } catch {
            load();
        } finally {
            setReordering(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div>
                <h1 className="text-lg font-bold text-gray-900">Sổ tay CLB</h1>
                <p className="text-xs text-gray-400 mt-0.5">Bìa → Mục lục → Nội dung → Nội dung con</p>
            </div>

            {loading ? (
                <div className="py-16 text-center text-sm text-gray-400">Đang tải...</div>
            ) : (
                <div className="space-y-5">
                    <SingletonCard
                        label="Trang bìa"
                        icon={ImageIcon}
                        page={tree.cover}
                        emptyText="Chưa có trang bìa. Bấm để tạo trang mở đầu (ảnh nền + tiêu đề)."
                        thumbnail={tree.cover?.background_image_url}
                        onEdit={() => openModal({ mode: "cover", page: tree.cover })}
                    />

                    <SingletonCard
                        label="Trang mục lục"
                        icon={ListTree}
                        page={tree.toc}
                        emptyText="Chưa có trang mục lục. Bấm để tạo — danh sách các mục bên dưới sẽ tự hiển thị trong đó."
                        onEdit={() => openModal({ mode: "toc", page: tree.toc })}
                        onAdd={() => openModal({ mode: "content", parentId: null })}
                        addLabel="Thêm mục mới vào mục lục"
                    />

                    {/* SECTIONS */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500">Các mục nội dung</p>
                            <button
                                onClick={() => openModal({ mode: "content", parentId: null })}
                                className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-sm active:scale-[0.96]"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {tree.sections.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
                                Chưa có mục nào. Bấm nút + để thêm mục đầu tiên (VD: "01 Mục tiêu Team").
                            </div>
                        ) : (
                            tree.sections.map((section, idx) => (
                                <div key={section.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                                    <PageRow
                                        page={section}
                                        canUp={idx > 0}
                                        canDown={idx < tree.sections.length - 1}
                                        reordering={reordering}
                                        onUp={() => moveSibling(tree.sections, idx, -1, null)}
                                        onDown={() => moveSibling(tree.sections, idx, 1, null)}
                                        onToggleActive={() => toggleActive(section)}
                                        onEdit={() => openModal({ mode: "content", page: section })}
                                        onDelete={() => handleDelete(section)}
                                        expandable
                                        expanded={!!expanded[section.id]}
                                        onToggleExpand={() => toggleExpand(section.id)}
                                        childCount={section.children?.length ?? 0}
                                    />

                                    {expanded[section.id] && (
                                        <div className="bg-[#F7F8FA] border-t border-gray-100 p-2.5 pl-8 space-y-2">
                                            {(section.children ?? []).map((child: any, cIdx: number) => (
                                                <div key={child.id} className="rounded-xl bg-white border border-gray-100 shadow-sm">
                                                    <PageRow
                                                        page={child}
                                                        compact
                                                        canUp={cIdx > 0}
                                                        canDown={cIdx < section.children.length - 1}
                                                        reordering={reordering}
                                                        onUp={() => moveSibling(section.children, cIdx, -1, section.id)}
                                                        onDown={() => moveSibling(section.children, cIdx, 1, section.id)}
                                                        onToggleActive={() => toggleActive(child)}
                                                        onEdit={() => openModal({ mode: "content", page: child })}
                                                        onDelete={() => handleDelete(child)}
                                                    />
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => openModal({ mode: "content", parentId: section.id })}
                                                className="w-full rounded-xl border-2 border-dashed border-gray-200 py-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Thêm nội dung con
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <HandbookPageModal
                open={modalOpen}
                onClose={closeModal}
                onSaved={load}
                mode={modalConfig?.mode ?? "content"}
                page={modalConfig?.page}
                parentId={modalConfig?.parentId ?? null}
            />
        </div>
    );
}

function SingletonCard({
    label, icon: Icon, page, emptyText, thumbnail, onEdit, onAdd, addLabel,
}: {
    label: string;
    icon: any;
    page: any | null;
    emptyText: string;
    thumbnail?: string;
    onEdit: () => void;
    onAdd?: () => void;
    addLabel?: string;
}) {
    if (!page) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-4 flex items-center gap-3">
                <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-300">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{emptyText}</p>
                    </div>
                </button>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        title={addLabel}
                        className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0 active:scale-[0.96]"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3 flex items-center gap-3 hover:border-blue-200">
            <button onClick={onEdit} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                {thumbnail ? (
                    <img src={thumbnail} alt={label} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                ) : (
                    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        <LucideIconByName name={page.icon} className="w-5 h-5 text-gray-500" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                        {!page.is_active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Đang ẩn</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{page.title}</p>
                </div>
            </button>
            <div className="flex items-center gap-1 flex-shrink-0">
                {onAdd && (
                    <button onClick={onAdd} title={addLabel} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500">
                        <Plus className="w-4 h-4" />
                    </button>
                )}
                <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300">
                    <Pencil className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function PageRow({
    page, canUp, canDown, reordering, onUp, onDown, onToggleActive, onEdit, onDelete,
    expandable, expanded, onToggleExpand, childCount, compact,
}: {
    page: any;
    canUp: boolean;
    canDown: boolean;
    reordering: boolean;
    onUp: () => void;
    onDown: () => void;
    onToggleActive: () => void;
    onEdit: () => void;
    onDelete: () => void;
    expandable?: boolean;
    expanded?: boolean;
    onToggleExpand?: () => void;
    childCount?: number;
    compact?: boolean;
}) {
    return (
        <div className={`flex items-center gap-2.5 ${compact ? "p-2" : "p-3"}`}>
            <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={onUp} disabled={!canUp || reordering} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 disabled:opacity-30 hover:bg-gray-50">
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDown} disabled={!canDown || reordering} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 disabled:opacity-30 hover:bg-gray-50">
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>

            {expandable && (
                <button onClick={onToggleExpand} className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-gray-400">
                    <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                </button>
            )}

            <div className={`${compact ? "w-9 h-9" : "w-11 h-11"} rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0`}>
                <LucideIconByName name={page.icon} className="w-4.5 h-4.5 text-gray-500" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    {page.page_code && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">{page.page_code}</span>
                    )}
                    <p className={`${compact ? "text-xs" : "text-sm"} font-bold text-gray-900 truncate`}>{page.title}</p>
                    {expandable && !!childCount && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{childCount} mục con</span>
                    )}
                </div>
                {page.subtitle && <p className="text-xs text-gray-400 truncate">{page.subtitle}</p>}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={onToggleActive} title={page.is_active ? "Đang hiển thị" : "Đang ẩn"} className={`w-8 h-8 rounded-lg flex items-center justify-center ${page.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50"}`}>
                    {page.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-blue-500">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
"use client";
import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronLeft, BookOpen, Smartphone, UserCheck, Feather, CalendarCheck } from "lucide-react";
import { handbookPublicApi } from "@/lib/api";
import { LucideIconByName } from "@/components/admin/handbook/IconPicker";
import { createPortal } from "react-dom";

type HandbookItem = {
    id: string;
    icon?: string;
    text: string;
    variant?: string;
    highlight?: boolean;
};

type HandbookNode = {
    id: string;
    type?: string;
    page_code?: string;
    title: string;
    subtitle?: string;
    icon?: string;
    color_theme?: string;
    background_image_url?: string;
    items?: HandbookItem[];
    children?: HandbookNode[];
};



type Tree = { cover: HandbookNode | null; toc: HandbookNode | null; sections: HandbookNode[] };

const THEME_STYLES: Record<string, { bg: string }> = {
    default: { bg: "from-slate-600 to-slate-700" },
    success: { bg: "from-emerald-500 to-emerald-600" },
    danger: { bg: "from-red-500 to-red-600" },
    warning: { bg: "from-amber-500 to-amber-600" },
    info: { bg: "from-blue-500 to-blue-600" },
};

const THEME_ACCENT: Record<string, { badge: string; iconBorder: string; iconText: string }> = {
    default: { badge: "bg-slate-600", iconBorder: "border-slate-200", iconText: "text-slate-500" },
    success: { badge: "bg-emerald-500", iconBorder: "border-emerald-200", iconText: "text-emerald-500" },
    danger: { badge: "bg-red-500", iconBorder: "border-red-200", iconText: "text-red-500" },
    warning: { badge: "bg-amber-500", iconBorder: "border-amber-200", iconText: "text-amber-500" },
    info: { badge: "bg-blue-500", iconBorder: "border-blue-200", iconText: "text-blue-500" },
};

const ITEM_VARIANT_STYLES: Record<string, string> = {
    default: "bg-gray-50 text-gray-600 border-gray-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    highlight: "bg-blue-50 text-blue-700 border-blue-100",
};

type ViewState =
    | { screen: "cover" }
    | { screen: "toc" }
    | { screen: "page"; stack: HandbookNode[] };


function viewKey(view: ViewState): string {
    if (view.screen === "page") {
        return `page:${view.stack[view.stack.length - 1].id}`;
    }
    return view.screen;
}

export function HandbookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [tree, setTree] = useState<Tree | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<ViewState>({ screen: "cover" });

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
        if (!open) return;
        setLoading(true);
        handbookPublicApi
            .tree()
            .then(({ data }) => {
                const t: Tree = {
                    cover: data?.cover ?? null,
                    toc: data?.toc ?? null,
                    sections: data?.sections ?? [],
                };
                setTree(t);
                setView(t.cover ? { screen: "cover" } : { screen: "toc" });
            })
            .catch(() => setTree({ cover: null, toc: null, sections: [] }))
            .finally(() => setLoading(false));
    }, [open]);



    useEffect(() => {
        if (!open) return;
        setLoading(true);
        handbookPublicApi
            .tree()
            .then(({ data }) => {
                const t: Tree = {
                    cover: data?.cover ?? null,
                    toc: data?.toc ?? null,
                    sections: data?.sections ?? [],
                };
                setTree(t);
                setView(t.cover ? { screen: "cover" } : { screen: "toc" });
            })
            .catch(() => setTree({ cover: null, toc: null, sections: [] }))
            .finally(() => setLoading(false));
    }, [open]);

    if (!open) return null;

    if (!mounted) return null;

    const openSection = (node: HandbookNode) => setView({ screen: "page", stack: [node] });
    const openChild = (child: HandbookNode) => {
        if (view.screen !== "page") return;
        setView({ screen: "page", stack: [...view.stack, child] });
    };
    const goBack = () => {
        if (view.screen === "page") {
            if (view.stack.length > 1) setView({ screen: "page", stack: view.stack.slice(0, -1) });
            else setView(tree?.cover ? { screen: "toc" } : { screen: "toc" });
            return;
        }
        if (view.screen === "toc" && tree?.cover) setView({ screen: "cover" });
    };
    const canGoBack = view.screen === "page" || (view.screen === "toc" && !!tree?.cover);

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4">
            <div
                className={`absolute inset-0 bg-black/50 transition-opacity duration-250 ${closing ? "opacity-0" : "opacity-100"
                    }`}
                style={{ animation: closing ? undefined : "handbookFadeIn 0.25s ease-out" }}
            />
            <div
                className={`relative w-[94%] sm:w-full sm:max-w-md mx-auto bg-[#F4F6FA] rounded-3xl overflow-hidden flex flex-col ${closing ? "animate-handbook-out" : "animate-handbook-in"
                    }`}
                style={{
                    height: "min(94dvh, 100%)",
                    maxHeight: "94dvh",
                }}
            >
                <div
                    className={
                        view.screen === "cover"
                            ? "absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-4 py-3"
                            : "sticky top-0 z-10 flex items-center gap-2 px-4 py-3"
                    }
                >
                    {view.screen !== "cover" && (
                        <>
                            {canGoBack ? (
                                <button onClick={goBack} className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-blue-600/30">
                                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                                </button>
                            ) : (
                                <div className="w-8 h-8 flex items-center justify-center text-blue-500 flex-shrink-0">
                                    <BookOpen className="w-4.5 h-4.5" />
                                </div>
                            )}
                            <div className="flex-1" />
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className={
                            view.screen === "cover"
                                ? "w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white flex-shrink-0"
                                : "w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-red-500/30"
                        }
                    >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                </div>

                <div className="overflow-y-auto overflow-x-hidden flex-1 no-scrollbar">
                    {loading ? (
                        <div
                            className="h-full flex flex-col items-center justify-center gap-3"
                            style={{
                                background:
                                    "radial-gradient(circle at 30% 20%, #14532d 0%, #052e16 55%, #01150a 100%)",
                            }}
                        >
                            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-emerald-100/70 text-sm font-medium">Đang tải...</p>
                        </div>
                    ) : !tree || (!tree.cover && !tree.toc && tree.sections.length === 0) ? (
                        <div className="py-16 text-center text-sm text-gray-400">Sổ tay chưa có nội dung</div>
                    ) : (
                        <div key={viewKey(view)} className="h-full animate-handbook-content">
                            {view.screen === "cover" && tree.cover ? (
                                <CoverScreen cover={tree.cover} onNext={() => setView({ screen: "toc" })} />
                            ) : view.screen === "toc" ? (
                                <TocScreen
                                    tree={tree}
                                    title={tree.toc?.title ?? "Mục lục"}
                                    onOpenSection={openSection}
                                />
                            ) : view.screen === "page" ? (
                                <PageScreen tree={tree} node={view.stack[view.stack.length - 1]} onOpenChild={openChild} />
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`
                @keyframes handbookFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes handbookSlideUp {
                    from { transform: translateY(24px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes handbookSlideDown {
                    from { transform: translateY(0) scale(1); opacity: 1; }
                    to { transform: translateY(24px) scale(0.98); opacity: 0; }
                }
                @keyframes handbookContentIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-handbook-in {
                    animation: handbookSlideUp 0.25s cubic-bezier(0.34, 1.2, 0.64, 1);
                }
                .animate-handbook-out {
                    animation: handbookSlideDown 0.22s ease-in forwards;
                }
                .animate-handbook-content {
                    animation: handbookContentIn 0.2s ease-out;
                }
                .no-scrollbar {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE/Edge */
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none; /* Chrome/Safari/Edge Chromium */
                }
            `}</style>
        </div>,
        document.body
    );
}

function CoverScreen({ cover, onNext }: { cover: HandbookNode; onNext: () => void }) {
    const [imgError, setImgError] = useState(false);
    const hasImage = !!cover.background_image_url && !imgError;

    const pageIndex = 0;
    const totalPages = 1;

    return (
        <div className="relative h-full overflow-hidden">
            {hasImage ? (
                <img
                    src={cover.background_image_url}
                    alt={cover.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg,#183153,#102744)" }}
                />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/85" />

            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
                <p className="text-white text-5xl font-black leading-[1.05] tracking-tight drop-shadow-md">
                    SỔ TAY
                </p>
                <p className="text-emerald-400 text-5xl font-black italic leading-[1.05] tracking-tight drop-shadow-md">
                    THÀNH VIÊN
                </p>
                <p className="text-white text-5xl font-black leading-[1.05] tracking-tight drop-shadow-md">
                    TEAM BNB
                </p>
                {cover.subtitle && (
                    <span className="inline-block mt-4 px-3.5 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold tracking-wide">
                        {cover.subtitle}
                    </span>
                )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 pb-6 flex flex-col items-center gap-4">
                <button
                    onClick={onNext}
                    className="px-6 py-2.5 rounded-full text-white text-sm font-bold border border-white/40 backdrop-blur-md shadow-lg shadow-black/20 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(5,150,105,0.35))" }}
                >
                    Xem mục lục <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-full flex items-center justify-between px-1">
                    <span className="text-white/70 text-[10px] font-bold tracking-widest">
                        TEAM BNB
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === pageIndex ? "w-4 bg-emerald-400" : "w-1.5 bg-white/30"
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-white/50 text-[10px] font-semibold">
                            Trang {pageIndex + 1}/{totalPages}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TocScreen({
    tree,
    title,
    onOpenSection,
}: {
    tree: Tree;
    title: string;
    onOpenSection: (n: HandbookNode) => void;
}) {
    const totalPages = 2 + tree.sections.length;
    const pageIndex = 1;

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex-1 min-h-0 rounded-3xl bg-white shadow-[0_6px_16px_-4px_rgba(0,0,0,0.15),0_2px_6px_-2px_rgba(0,0,0,0.08)] border border-gray-200/80 p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-5 flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl border-2 border-blue-900 flex items-center justify-center text-blue-900 flex-shrink-0">
                        <BookOpen className="w-6 h-6" strokeWidth={2.2} />
                    </div>
                    <h2 className="text-2xl font-black text-blue-950 tracking-tight truncate">{title}</h2>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 -mx-1 px-1">
                    {tree.sections.length === 0 ? (
                        <div className="py-16 text-center text-sm text-gray-400">Chưa có mục nội dung nào</div>
                    ) : (
                        tree.sections.map((s, idx) => {
                            const isGreen = idx < 3;
                            const badgeBg = isGreen ? "bg-emerald-500" : "bg-blue-900";
                            const iconStyle = isGreen
                                ? "text-emerald-500 border-emerald-200 bg-emerald-50"
                                : "text-blue-900 border-blue-100 bg-blue-50";
                            const code = s.page_code || String(idx + 1).padStart(2, "0");

                            return (
                                <button
                                    key={s.id}
                                    onClick={() => onOpenSection(s)}
                                    className="w-full rounded-2xl border border-gray-200/80 bg-white p-2.5 flex items-center gap-3 text-left shadow-[0_6px_16px_-4px_rgba(0,0,0,0.15),0_2px_6px_-2px_rgba(0,0,0,0.08)] active:scale-[0.98] active:shadow-sm transition-all"
                                >
                                    <span className={`w-9 h-9 rounded-xl ${badgeBg} text-white text-sm font-black flex items-center justify-center flex-shrink-0`}>
                                        {code}
                                    </span>
                                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
                                        <LucideIconByName name={s.icon} className="w-4.5 h-4.5" />
                                    </span>
                                    <span className="text-sm font-bold text-gray-800 truncate">{s.title}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 flex-shrink-0">
                    <span className="text-[10px] font-bold text-blue-900 tracking-widest">TEAM BNB</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === pageIndex ? "w-4 bg-emerald-500" : "w-1.5 bg-gray-200"
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-gray-400 text-[10px] font-semibold">
                            Trang {pageIndex + 1}/{totalPages}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const DISPUTE_PAGE_ID = "e2d64ac9-92fb-41d5-9421-e715bcdb4b3e";

function ProcessFlowDiagram() {
    const steps = [
        { icon: Smartphone, label: "Tạo trận\ntrên App" },
        { icon: UserCheck, label: "Đối thủ\nxác nhận" },
        { icon: Feather, label: "Thi đấu" },
        { icon: CalendarCheck, label: "Cập nhật\nkết quả" },
    ];

    return (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 mb-4">
            <div className="text-center pb-3 mb-4 border-b border-gray-100">
                <span className="text-sm font-black text-blue-900 tracking-wide">
                    QUY TRÌNH GIAO HỮU TÍNH ĐIỂM
                </span>
            </div>
            <div className="flex items-start">
                {steps.map((step, i) => (
                    <div key={i} className="flex items-start flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0 w-16">
                            <div className="w-11 h-11 rounded-full border-2 border-blue-200 bg-blue-50 flex items-center justify-center text-blue-600">
                                <step.icon className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight whitespace-pre-line">
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className="flex-1 h-[2px] bg-blue-100 mt-[22px]" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DisputeResolutionCard({ node }: { node: HandbookNode }) {
    return (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 p-4">
            <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-red-500 flex-shrink-0">
                    <LucideIconByName name={node.icon || "user"} className="w-4.5 h-4.5" />
                </span>
                <h3 className="text-base font-black text-red-600 tracking-tight uppercase">
                    Xử lý tranh chấp
                </h3>
            </div>

            <p className="text-sm text-gray-500 mb-3 leading-snug">
                Trong trường hợp xử lý tranh chấp dẫn đến hủy kết quả trận đấu:
            </p>

            <div className="space-y-3">
                {node.items?.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                        {it.icon && (
                            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-red-400">
                                <LucideIconByName name={it.icon} className="w-5 h-5" strokeWidth={2} />
                            </span>
                        )}
                        <div
                            className="text-sm text-gray-700 leading-snug [&_strong]:text-red-600 [&_strong]:font-extrabold [&_p]:m-0"
                            dangerouslySetInnerHTML={{ __html: it.text }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function PageScreen({
    tree,
    node,
    onOpenChild,
}: {
    tree: Tree;
    node: HandbookNode;
    onOpenChild: (n: HandbookNode) => void;
}) {
    const accent = THEME_ACCENT[node.color_theme ?? "default"] ?? THEME_ACCENT.default;
    const topIdx = tree.sections.findIndex((s) => s.id === node.id || s.children?.some((c) => c.id === node.id));
    const code = node.page_code || (topIdx >= 0 ? String(topIdx + 1).padStart(2, "0") : "•");
    const totalPages = 2 + tree.sections.length;
    const pageIndex = topIdx >= 0 ? 2 + topIdx : 2;

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex-1 min-h-0 rounded-3xl bg-white shadow-[0_6px_16px_-4px_rgba(0,0,0,0.15),0_2px_6px_-2px_rgba(0,0,0,0.08)] border border-gray-200/80 p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-5 flex-shrink-0">
                    <span className={`w-11 h-11 rounded-2xl ${accent.badge} text-white text-base font-black flex items-center justify-center flex-shrink-0`}>
                        {code}
                    </span>
                    <h2 className="flex-1 min-w-0 text-lg font-black text-gray-900 tracking-tight truncate uppercase">
                        {node.title}
                    </h2>
                    <span className={`w-11 h-11 rounded-full border-2 ${accent.iconBorder} ${accent.iconText} flex items-center justify-center flex-shrink-0`}>
                        <LucideIconByName name={node.icon} className="w-5 h-5" />
                    </span>
                </div>

                {node.subtitle && (
                    <p className="text-xs text-gray-400 -mt-3 mb-4 flex-shrink-0">{node.subtitle}</p>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1">

                    {node.id === DISPUTE_PAGE_ID ? (
                        <>
                            <ProcessFlowDiagram />
                            <DisputeResolutionCard node={node} />
                        </>
                    ) : !!node.children?.length ? (
                        <div className="rounded-2xl bg-white border border-gray-200/80 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.06)] divide-y divide-gray-100 overflow-hidden">
                            {node.children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => onOpenChild(child)}
                                    className="w-full flex items-center gap-4 px-4 py-5 text-left active:bg-gray-50 transition-colors"
                                >
                                    <span className={`flex-shrink-0 ${accent.iconText}`}>
                                        <LucideIconByName name={child.icon} className="w-10 h-10" strokeWidth={1.75} />
                                    </span>
                                    {child.page_code && (
                                        <span className={`text-2xl font-black flex-shrink-0 ${accent.iconText}`}>
                                            {child.page_code}
                                        </span>
                                    )}
                                    <p className="text-lg font-bold text-blue-950 truncate flex-1 min-w-0">
                                        {child.title}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : !!node.items?.length ? (
                        <div className="space-y-2.5">
                            {node.items.map((it) => {
                                const variantStyle = it.variant && it.variant !== "default"
                                    ? ITEM_VARIANT_STYLES[it.variant]
                                    : null;

                                return (
                                    <div
                                        key={it.id}
                                        className={`w-full rounded-xl border p-4 flex items-center gap-3 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.12),0_2px_4px_-2px_rgba(0,0,0,0.06)] ${variantStyle ?? "bg-white border-gray-200/80"
                                            }`}
                                    >
                                        {it.icon && (
                                            <span className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${accent.iconText}`}>
                                                <LucideIconByName name={it.icon} className="w-10 h-10" strokeWidth={2} />
                                            </span>
                                        )}
                                        <div
                                            className="text-base font-semibold leading-snug [&_p]:m-0 [&_strong]:font-bold"
                                            dangerouslySetInnerHTML={{ __html: it.text }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-8">Chưa có nội dung</p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 flex-shrink-0">
                    <span className="text-[10px] font-bold text-blue-900 tracking-widest">TEAM BNB</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === pageIndex ? "w-4 bg-emerald-500" : "w-1.5 bg-gray-200"
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-gray-400 text-[10px] font-semibold">
                            Trang {pageIndex + 1}/{totalPages}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
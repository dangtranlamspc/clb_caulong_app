"use client";

import { useEffect, useRef, useState } from "react";
import {
    Plus,
    Loader2,
    Users,
    Trash2,
    Pencil,
    Megaphone,
    Calendar,
    Flag,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { eventsAdminApi } from "@/lib/api";
import ShirtOrderFormPage from "@/components/admin/events/form/ShirtOrderFormPage";
import BirthdayFormPage from "@/components/admin/events/form/BirthdayFormPage";
import OfflineEventFormPage from "@/components/admin/events/form/OfflineEventFormPage";
import PollFormPage from "@/components/admin/events/form/PollFormPage";
import ModalEvent from "@/components/admin/events/ModalEvent";
import EventTypePicker from "@/components/admin/events/EventTypePicker";
import EventRegistrationsPage from "@/components/admin/events/EventRegistrationsPage";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";

const TYPE_LABEL: Record<string, string> = {
    shirt_order: "👕 Đặt áo",
    tournament: "🏆 Giải đấu",
    birthday: "🎂 Sinh nhật",
    offline_event: "🔥 Offline",
    poll: "📊 Bình chọn",
};

const TYPE_ICON_BG: Record<string, string> = {
    shirt_order: "bg-blue-50",
    tournament: "bg-amber-50",
    birthday: "bg-pink-50",
    offline_event: "bg-orange-50",
    poll: "bg-purple-50",
};

const STATUS_CFG: Record<string, string> = {
    draft: "bg-gray-50 text-gray-500",
    open: "bg-orange-50 text-orange-600",
    upcoming: "bg-purple-50 text-purple-600",
    ongoing: "bg-blue-50 text-blue-600",
    closed: "bg-green-50 text-green-700",
    completed: "bg-slate-50 text-slate-500",
    cancelled: "bg-red-50 text-red-500",
};

const STATUS_LABEL: Record<string, string> = {
    draft: "Nháp",
    open: "Mở đăng ký",
    upcoming: "Sắp diễn ra",
    ongoing: "Đang diễn ra",
    closed: "Đã đóng đăng ký",
    completed: "Đã kết thúc",
    cancelled: "Đã huỷ",
};

const FORM_COMPONENT: Record<string, React.ComponentType<any>> = {
    shirt_order: ShirtOrderFormPage,
    birthday: BirthdayFormPage,
    offline_event: OfflineEventFormPage,
    poll: PollFormPage,
};

const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({
    value,
    label,
}));

const TYPE_FILTER_OPTIONS = [
    { value: "", label: "Tất cả loại hoạt động" },
    ...TYPE_OPTIONS,
];

function SkeletonTableRow() {
    return (
        <tr className="animate-pulse">
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-40" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-20" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-6 bg-gray-100 rounded-full w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded w-14" />
            </td>
            <td className="px-4 py-3 text-right">
                <div className="h-4 bg-gray-100 rounded w-12 ml-auto" />
            </td>
        </tr>
    );
}

function SkeletonMobileCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
            <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="min-w-0 flex-1 pt-0.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="h-4 bg-gray-100 rounded w-32" />
                        <div className="h-5 bg-gray-100 rounded-full w-20 flex-shrink-0" />
                    </div>
                    <div className="h-3 bg-gray-100 rounded w-16" />
                    <div className="flex gap-3">
                        <div className="h-3 bg-gray-100 rounded w-20" />
                        <div className="h-3 bg-gray-100 rounded w-20" />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="flex gap-1">
                    <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                    <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export default function ActivitiesListPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("");

    const [showTypePicker, setShowTypePicker] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const [editingActivity, setEditingActivity] = useState<{
        id: string;
        type: string;
    } | null>(null);

    const [viewingRegistrationsId, setViewingRegistrationsId] = useState<
        string | null
    >(null);

    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const tabsWrapRef = useRef<HTMLDivElement>(null);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
        left: 0,
        width: 0,
    });

    const ALL_TAB_KEYS = ["", ...TYPE_OPTIONS.map((o) => o.value)];

    useEffect(() => {
        const el = tabRefs.current[typeFilter];
        const wrap = tabsWrapRef.current;
        if (el && wrap) {
            const wrapRect = wrap.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            setPillStyle({
                left: elRect.left - wrapRect.left,
                width: elRect.width,
            });
        }
    }, [typeFilter, items.length]);

    const fetchList = async () => {
        setLoading(true);
        try {
            const { data } = await eventsAdminApi.list({
                type: typeFilter || undefined,
                limit: 50,
            });
            setItems(data.data ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [typeFilter]);

    const handleDelete = async (id: string, title: string) => {
        if (
            !confirm(
                `Xoá hoạt động "${title}"? Toàn bộ đăng ký liên quan cũng sẽ bị xoá.`,
            )
        )
            return;
        try {
            await eventsAdminApi.delete(id);
            toast.success("Đã xoá");
            fetchList();
        } catch { }
    };

    const handleTypeSelect = (type: string) => {
        setShowTypePicker(false);

        if (type === "tournament") {
            router.push("/admin/events/new/tournament");
            return;
        }

        setTimeout(() => setSelectedType(type), 200);
    };

    const handleEditClick = (a: any) => {
        if (a.type === "tournament") {
            router.push(`/admin/events/${a.id}/edit/tournament`);
            return;
        }
        setEditingActivity({ id: a.id, type: a.type });
    };

    const handleViewRegistrations = (a: any) => {
        if (a.type === "tournament") {
            router.push(`/admin/events/${a.id}/registrations/tournament`);
            return;
        }
        setViewingRegistrationsId(a.id);
    };

    const handleFormSaved = () => {
        setSelectedType(null);
        fetchList();
    };

    const handleEditSaved = () => {
        setEditingActivity(null);
        fetchList();
    };

    const SelectedForm = selectedType ? FORM_COMPONENT[selectedType] : null;
    const EditingForm = editingActivity
        ? FORM_COMPONENT[editingActivity.type]
        : null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hoạt động</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {items.length} hoạt động
                    </p>
                </div>
                <button
                    onClick={() => setShowTypePicker(true)}
                    className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 font-medium flex-shrink-0 w-fit whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Tạo hoạt động</span>
                </button>
            </div>

            <div
                ref={tabsWrapRef}
                className="hidden md:flex relative gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap"
            >
                {pillStyle.width > 0 && (
                    <div
                        className="absolute top-1 bottom-1 rounded-md bg-blue-600 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        style={{ left: pillStyle.left, width: pillStyle.width }}
                    />
                )}

                <button
                    ref={(el) => {
                        tabRefs.current[""] = el;
                    }}
                    onClick={() => setTypeFilter("")}
                    className={`relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${!typeFilter
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Tất cả
                </button>
                {TYPE_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        ref={(el) => {
                            tabRefs.current[opt.value] = el;
                        }}
                        onClick={() => setTypeFilter(opt.value)}
                        className={`relative z-10 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap ${typeFilter === opt.value
                            ? "text-white"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <div className="md:hidden">
                <CustomSelect
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={TYPE_FILTER_OPTIONS}
                />
            </div>

            {items.length === 0 && !loading ? (
                <div className="card !p-0 overflow-hidden">
                    <div className="py-16 text-center text-gray-400">
                        <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Chưa có hoạt động nào</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block card !p-0 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-3">Hoạt động</th>
                                    <th className="text-left px-4 py-3">Loại</th>
                                    <th className="text-left px-4 py-3">Ngày chốt danh sách</th>
                                    <th className="text-left px-4 py-3">Ngày thi đấu</th>
                                    <th className="text-left px-4 py-3">Trạng thái</th>
                                    <th className="text-left px-4 py-3">Đăng ký</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <SkeletonTableRow key={i} />
                                        ))}
                                    </>
                                ) : (
                                    items.map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {a.emoji} {a.title}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {TYPE_LABEL[a.type]}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {a.deadline
                                                    ? format(new Date(a.deadline), "dd/MM/yyyy", {
                                                        locale: vi,
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {a.event_date
                                                    ? format(new Date(a.event_date), "dd/MM/yyyy", {
                                                        locale: vi,
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CFG[a.status] ?? "bg-gray-50 text-gray-500"}`}
                                                >
                                                    {STATUS_LABEL[a.status] ?? a.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleViewRegistrations(a)}
                                                    className="flex items-center gap-1 text-blue-600 hover:underline"
                                                >
                                                    <Users className="w-3.5 h-3.5" /> Xem
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditClick(a)}
                                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(a.id, a.title)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
                        ) : (
                            items.map((a) => (
                                <div
                                    key={a.id}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    <div className="p-4 flex items-start gap-3">
                                        <div
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${TYPE_ICON_BG[a.type] ?? "bg-gray-50"}`}
                                        >
                                            {a.emoji}
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-gray-900 leading-snug break-words">
                                                    {a.title}
                                                </p>
                                                <span
                                                    className={`text-[11px] px-2 py-1 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${STATUS_CFG[a.status] ?? "bg-gray-50 text-gray-500"}`}
                                                >
                                                    {STATUS_LABEL[a.status] ?? a.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {TYPE_LABEL[a.type]}
                                            </p>

                                            {(a.deadline || a.event_date) && (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
                                                    {a.deadline && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                                            {format(new Date(a.deadline), "dd/MM/yyyy", {
                                                                locale: vi,
                                                            })}
                                                        </span>
                                                    )}
                                                    {a.event_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Flag className="w-3.5 h-3.5 flex-shrink-0" />
                                                            {format(new Date(a.event_date), "dd/MM/yyyy", {
                                                                locale: vi,
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-50 bg-gray-50/50">
                                        <button
                                            onClick={() => handleViewRegistrations(a)}
                                            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium py-1"
                                        >
                                            <Users className="w-4 h-4" /> Xem đăng ký
                                        </button>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => handleEditClick(a)}
                                                className="p-2 hover:bg-gray-200/60 active:bg-gray-200 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(a.id, a.title)}
                                                className="p-2 hover:bg-red-50 active:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            <ModalEvent
                open={showTypePicker}
                onClose={() => setShowTypePicker(false)}
                maxWidth="max-w-2xl"
            >
                <EventTypePicker onSelect={handleTypeSelect} />
            </ModalEvent>

            <ModalEvent open={!!selectedType} onClose={() => setSelectedType(null)}>
                {SelectedForm && (
                    <SelectedForm
                        onSaved={handleFormSaved}
                        onClose={() => setSelectedType(null)}
                    />
                )}
            </ModalEvent>

            <ModalEvent
                open={!!editingActivity}
                onClose={() => setEditingActivity(null)}
            >
                {EditingForm && editingActivity && (
                    <EditingForm
                        activityId={editingActivity.id}
                        onSaved={handleEditSaved}
                        onClose={() => setEditingActivity(null)}
                    />
                )}
            </ModalEvent>

            <ModalEvent
                open={!!viewingRegistrationsId}
                onClose={() => setViewingRegistrationsId(null)}
                maxWidth="max-w-3xl"
            >
                {viewingRegistrationsId && (
                    <EventRegistrationsPage
                        activityId={viewingRegistrationsId}
                        onClose={() => setViewingRegistrationsId(null)}
                    />
                )}
            </ModalEvent>
        </div>
    );
}




// hiển thị khung xám nhấp nháy mô phỏng đúng cấu trúc bảng (desktop) và card (mobile), giúp cảm giác load mượt và ít giật hơn.
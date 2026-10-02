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
    Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { eventsAdminApi } from "@/lib/api";
import ShirtOrderFormPage from "@/components/admin/events/form/ShirtOrderFormPage";
import BirthdayFormPage from "@/components/admin/events/form/BirthdayFormPage";
import OfflineEventFormPage from "@/components/admin/events/form/OfflineEventFormPage";
import PollFormPage from "@/components/admin/events/form/PollFormPage";
import ModalEvent from "@/components/admin/events/ModalEvent";
import EventTypePicker from "@/components/admin/events/EventTypePicker";
import EventRegistrationsPage from "@/components/admin/events/EventRegistrationsPage";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import AdminAddShirtOrderModal from "@/components/admin/events/form/AdminAddShirtOrderModal";
import ActivitiesOverview from "@/components/admin/events/ActivitiesOverview";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

const TYPE_LABEL: Record<string, string> = {
    shirt_order: "👕 Đặt áo",
    tournament: "🏆 Giải đấu",
    birthday: "🎂 Sinh nhật",
    offline_event: "🔥 Offline",
    poll: "📊 Bình chọn",
};

const TYPE_ICON_BG: Record<string, string> = {
    shirt_order: "bg-[var(--primary-soft)]",
    tournament: "bg-[var(--warning-soft)]",
    birthday: "bg-[var(--pink-soft)]",
    offline_event: "bg-[var(--warning-soft)]",
    poll: "bg-[var(--purple-soft)]",
};


const TYPE_DEFAULT_IMAGE: Record<string, string> = {
    shirt_order: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/T-shirt/3D/t-shirt_3d.png',
    tournament: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png',
    birthday: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Birthday%20cake/3D/birthday_cake_3d.png',
    offline_event: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png',
    poll: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20chart/3D/bar_chart_3d.png',
};

function ActivityThumbnail({ src, emoji }: { src?: string | null; emoji: string }) {
    const [err, setErr] = useState(false);
    if (src && !err) {
        return (
            <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setErr(true)}
            />
        );
    }
    return <span>{emoji}</span>;
}

function getStatusDisplay(a: any) {
    if (
        a.type === "tournament" &&
        a.is_full &&
        !["cancelled", "completed", "ongoing"].includes(a.status)
    ) {
        return {
            label: "Đã đóng đăng ký",
            className: "bg-[var(--success-soft)] text-[var(--success)]",
        };
    }
    return {
        label: STATUS_LABEL[a.status] ?? a.status,
        className: STATUS_CFG[a.status] ?? "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    };
}

const STATUS_CFG: Record<string, string> = {
    draft: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    open: "bg-[var(--warning-soft)] text-[var(--warning)]",
    upcoming: "bg-[var(--purple-soft)] text-[var(--purple)]",
    ongoing: "bg-[var(--primary-soft)] text-[var(--primary)]",
    closed: "bg-[var(--success-soft)] text-[var(--success)]",
    completed: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    cancelled: "bg-[var(--danger-soft)] text-[var(--danger)]",
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

const TYPE_MODAL_WIDTH: Record<string, string> = {
    shirt_order: "max-w-5xl",
    birthday: "max-w-lg",
    offline_event: "max-w-lg",
    poll: "max-w-lg",
};

const TYPE_FILTER_OPTIONS = [
    { value: "", label: "Tất cả loại hoạt động" },
    ...TYPE_OPTIONS,
];


function SkeletonTableRow() {
    return (
        <tr className="animate-pulse">
            <td className="px-4 py-3">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-40" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-20" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-6 bg-[var(--surface-muted)] rounded-full w-24" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-14" />
            </td>
            <td className="px-4 py-3 text-right">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-12 ml-auto" />
            </td>
        </tr>
    );
}

function SkeletonMobileCard() {
    return (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden animate-pulse">
            <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[var(--surface-muted)] flex-shrink-0" />
                <div className="min-w-0 flex-1 pt-0.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="h-4 bg-[var(--surface-muted)] rounded w-32" />
                        <div className="h-5 bg-[var(--surface-muted)] rounded-full w-20 flex-shrink-0" />
                    </div>
                    <div className="h-3 bg-[var(--surface-muted)] rounded w-16" />
                    <div className="flex gap-3">
                        <div className="h-3 bg-[var(--surface-muted)] rounded w-20" />
                        <div className="h-3 bg-[var(--surface-muted)] rounded w-20" />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]">
                <div className="h-4 bg-[var(--surface-muted)] rounded w-24" />
                <div className="flex gap-1">
                    <div className="h-8 w-8 bg-[var(--surface-muted)] rounded-lg" />
                    <div className="h-8 w-8 bg-[var(--surface-muted)] rounded-lg" />
                </div>
            </div>
        </div>
    );
}

function TournamentEndedOptionsModal({
    activity,
    onClose,
    onSelectHistory,
    onSelectStandings,
    onSelectRegistrations,
}: {
    activity: any;
    onClose: () => void;
    onSelectHistory: () => void;
    onSelectStandings: () => void;
    onSelectRegistrations: () => void;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 180);
    };

    return (
        <div
            className={`fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
            onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className={`bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
            >
                <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center mb-3">
                        <Trophy className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text)]">Giải đấu đã kết thúc</p>
                    <p className="text-xs text-[var(--text-faint)] mt-1.5 leading-relaxed">
                        "{activity?.title}" đã kết thúc. Bạn muốn xem gì?
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 px-5 pb-2">
                    <button
                        onClick={onSelectHistory}
                        className="flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border border-[var(--border)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:bg-[var(--primary-soft)] transition-colors"
                    >
                        <Calendar className="w-5 h-5 text-[var(--primary)]" />
                        <span className="text-xs font-semibold text-[var(--text)]">Lịch sử đấu</span>
                    </button>
                    <button
                        onClick={onSelectStandings}
                        className="flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border border-[var(--border)] hover:border-[color-mix(in_srgb,var(--success)_30%,transparent)] hover:bg-[var(--success-soft)] transition-colors"
                    >
                        <Trophy className="w-5 h-5 text-[var(--success)]" />
                        <span className="text-xs font-semibold text-[var(--text)]">BXH</span>
                    </button>
                </div>
                <div className="px-5 pb-5">
                    <button
                        onClick={onSelectRegistrations}
                        className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-[var(--border)] hover:border-[color-mix(in_srgb,var(--primary)_30%,transparent)] hover:bg-[var(--primary-soft)] transition-colors"
                    >
                        <Users className="w-4 h-4 text-[var(--primary)]" />
                        <span className="text-xs font-semibold text-[var(--text)]">Danh sách đăng ký</span>
                    </button>
                </div>
                <div className="flex border-t border-[var(--border)]">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

function ContinueTournamentModal({
    activity,
    onClose,
    onContinue,
}: {
    activity: any;
    onClose: () => void;
    onContinue: () => void;
}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 180);
    };

    return (
        <div
            className={`fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
            onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className={`bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
            >
                <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
                    <div className="w-12 h-12 rounded-full bg-[var(--success-soft)] flex items-center justify-center mb-3">
                        <Trophy className="w-5 h-5 text-[var(--success)]" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text)]">Giải đấu đang diễn ra</p>
                    <p className="text-xs text-[var(--text-faint)] mt-1.5 leading-relaxed">
                        "{activity?.title}" đã bắt đầu thi đấu. Bạn có muốn tiếp tục xem lịch thi đấu?
                    </p>
                </div>
                <div className="flex border-t border-[var(--border)]">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors border-r border-[var(--border)]"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={onContinue}
                        className="flex-1 py-3 text-sm font-semibold text-[var(--success)] hover:bg-[var(--success-soft)] transition-colors"
                    >
                        Tiếp tục giải đấu
                    </button>
                </div>
            </div>
        </div>
    );
}

const NAVIGATE_DELAY_MS = 1000;

export default function ActivitiesListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("");

    const [showTypePicker, setShowTypePicker] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const [navigating, setNavigating] = useState(false);

    const [editingActivity, setEditingActivity] = useState<{
        id: string;
        type: string;
    } | null>(null);

    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const tabsWrapRef = useRef<HTMLDivElement>(null);
    const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
        left: 0,
        width: 0,
    });

    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [showRegistrations, setShowRegistrations] = useState(false);
    const [showAddRegistration, setShowAddRegistration] = useState(false);

    const [continueTournamentModal, setContinueTournamentModal] = useState<any>(null);
    const [tournamentEndedModal, setTournamentEndedModal] = useState<any>(null);

    useEffect(() => {
        const openId = searchParams.get("openRegistrations");
        if (!openId) return;

        (async () => {
            try {
                const { data: full } = await eventsAdminApi.get(openId);
                setSelectedActivity(full);
                setShowRegistrations(true);
            } catch {
                toast.error("Không tìm thấy hoạt động cần xem");
            } finally {
                router.replace("/admin/events");
            }
        })();
    }, [searchParams]);

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

    const fetchList = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data } = await eventsAdminApi.list({
                type: typeFilter || undefined,
                limit: 50,
            });
            setItems(data.data ?? []);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [typeFilter]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;

        const channel = supabase
            .channel("activities-list-changes")
            .on("broadcast", { event: "activities_changed" }, () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => fetchList(true), 300);
            })
            .subscribe();

        return () => {
            if (timer) clearTimeout(timer);
            supabase.removeChannel(channel);
        };
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
            setNavigating(true);
            setTimeout(() => {
                router.push(`/admin/events/${a.id}/edit/tournament`);
            }, NAVIGATE_DELAY_MS);
            return;
        }
        setEditingActivity({ id: a.id, type: a.type });
    };

    const handleViewRegistrations = (a: any) => {
        if (a.type === "tournament") {
            if (a.ended_at) {
                setTournamentEndedModal(a);
                return;
            }
            if (a.started_at) {
                setContinueTournamentModal(a);
                return;
            }
            setNavigating(true);
            setTimeout(() => {
                router.push(`/admin/events/${a.id}/registrations/tournament`);
            }, NAVIGATE_DELAY_MS);
            return;
        }
        openRegistrations(a);
    };

    const handleContinueTournament = () => {
        const a = continueTournamentModal;
        setContinueTournamentModal(null);
        if (!a) return;
        setNavigating(true);
        setTimeout(() => {
            router.push(`/admin/events/${a.id}/registrations/tournament?step=schedule`);
        }, NAVIGATE_DELAY_MS);
    };

    const handleSelectTournamentHistory = () => {
        const a = tournamentEndedModal;
        setTournamentEndedModal(null);
        if (!a) return;
        setNavigating(true);
        setTimeout(() => {
            router.push(`/admin/events/${a.id}/registrations/tournament?step=schedule`);
        }, NAVIGATE_DELAY_MS);
    };

    const handleSelectTournamentStandings = () => {
        const a = tournamentEndedModal;
        setTournamentEndedModal(null);
        if (!a) return;
        setNavigating(true);
        setTimeout(() => {
            router.push(`/admin/events/${a.id}/registrations/tournament?step=schedule&view=standings`);
        }, NAVIGATE_DELAY_MS);
    };

    const handleSelectTournamentRegistrations = () => {
        const a = tournamentEndedModal;
        setTournamentEndedModal(null);
        if (!a) return;
        setNavigating(true);
        setTimeout(() => {
            router.push(`/admin/events/${a.id}/registrations/tournament?view=list`);
        }, NAVIGATE_DELAY_MS);
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

    const openRegistrations = async (activity: any) => {
        setSelectedActivity(activity);
        setShowRegistrations(true);
        try {
            const { data: full } = await eventsAdminApi.get(activity.id);
            setSelectedActivity(full);
        } catch {
        }
    };

    const closeAll = () => {
        setShowRegistrations(false);
        setShowAddRegistration(false);
        setSelectedActivity(null);
    };

    const handleOpenAddRegistration = () => {
        setShowRegistrations(false);
        setTimeout(() => setShowAddRegistration(true), 200);
    };

    const handleBackToRegistrations = () => {
        setShowAddRegistration(false);
        setTimeout(() => setShowRegistrations(true), 200);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Hoạt động</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-0.5">
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

            <ActivitiesOverview />

            <div
                ref={tabsWrapRef}
                className="hidden md:flex relative gap-1 bg-[var(--surface-muted)] rounded-lg p-1 w-fit flex-wrap"
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
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
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
                            : "text-[var(--text-muted)] hover:text-[var(--text)]"
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
                    <div className="py-16 text-center text-[var(--text-faint)]">
                        <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Chưa có hoạt động nào</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="hidden md:block card !p-0 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs uppercase">
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
                            <tbody className="divide-y divide-[var(--border)]">
                                {loading ? (
                                    <>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <SkeletonTableRow key={i} />
                                        ))}
                                    </>
                                ) : (
                                    items.map((a) => (
                                        <tr key={a.id} className="hover:bg-[var(--surface-hover)]">
                                            <td className="px-4 py-3 font-medium text-[var(--text)]">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 overflow-hidden ${TYPE_ICON_BG[a.type] ?? "bg-[var(--surface-muted)]"}`}
                                                    >
                                                        <ActivityThumbnail
                                                            src={a.cover_image_url ?? TYPE_DEFAULT_IMAGE[a.type]}
                                                            emoji={a.emoji ?? "📌"}
                                                        />
                                                    </div>
                                                    <span>{a.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-muted)]">
                                                {TYPE_LABEL[a.type]}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-muted)]">
                                                {a.deadline
                                                    ? format(new Date(a.deadline), "dd/MM/yyyy", {
                                                        locale: vi,
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text-muted)]">
                                                {a.event_date
                                                    ? format(new Date(a.event_date), "dd/MM/yyyy", {
                                                        locale: vi,
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusDisplay(a).className}`}
                                                >
                                                    {getStatusDisplay(a).label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleViewRegistrations(a)}
                                                    className="flex items-center gap-1 text-[var(--primary)] hover:underline"
                                                >
                                                    <Users className="w-3.5 h-3.5" /> Xem
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditClick(a)}
                                                        className="p-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-faint)] hover:text-[var(--primary)]"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(a.id, a.title)}
                                                        className="p-1.5 hover:bg-[var(--danger-soft)] rounded-lg text-[var(--text-faint)] hover:text-[var(--danger)]"
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

                    <div className="md:hidden space-y-3">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
                        ) : (
                            items.map((a) => (
                                <div
                                    key={a.id}
                                    className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden"
                                >
                                    <div className="p-4 flex items-start gap-3">
                                        <div
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden ${TYPE_ICON_BG[a.type] ?? "bg-[var(--surface-muted)]"}`}
                                        >
                                            <ActivityThumbnail
                                                src={a.cover_image_url ?? TYPE_DEFAULT_IMAGE[a.type]}
                                                emoji={a.emoji ?? "📌"}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-semibold text-[var(--text)] leading-snug break-words">
                                                    {a.title}
                                                </p>
                                                <span
                                                    className={`text-[11px] px-2 py-1 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${getStatusDisplay(a).className}`}
                                                >
                                                    {getStatusDisplay(a).label}
                                                </span>
                                            </div>

                                            {(a.deadline || a.event_date) && (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-muted)] mt-2">
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

                                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-muted)]">
                                        <button
                                            onClick={() => handleViewRegistrations(a)}
                                            className="flex items-center gap-1.5 text-sm text-[var(--primary)] font-medium py-1"
                                        >
                                            <Users className="w-4 h-4" /> Xem đăng ký
                                        </button>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => handleEditClick(a)}
                                                className="p-2 hover:bg-[var(--border-strong)]/60 active:bg-[var(--border-strong)] rounded-lg text-[var(--text-faint)] hover:text-[var(--primary)] transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(a.id, a.title)}
                                                className="p-2 hover:bg-[var(--danger-soft)] active:bg-[var(--danger-soft)] rounded-lg text-[var(--text-faint)] hover:text-[var(--danger)] transition-colors"
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

            <ModalEvent
                open={!!selectedType}
                onClose={() => setSelectedType(null)}
                maxWidth={selectedType ? (TYPE_MODAL_WIDTH[selectedType] ?? "max-w-lg") : "max-w-lg"}
            >
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
                maxWidth={
                    editingActivity
                        ? (TYPE_MODAL_WIDTH[editingActivity.type] ?? "max-w-lg")
                        : "max-w-lg"
                }
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
                open={showRegistrations}
                onClose={closeAll}
                maxWidth="max-w-[1500px] w-[95vw]"
            >
                {selectedActivity && (
                    <EventRegistrationsPage
                        activityId={selectedActivity.id}
                        onClose={closeAll}
                        onAddRegistration={handleOpenAddRegistration}
                    />
                )}
            </ModalEvent>

            <ModalEvent
                open={showAddRegistration}
                onClose={handleBackToRegistrations}
                maxWidth="max-w-lg lg:max-w-6xl"
            >
                {selectedActivity && (
                    <AdminAddShirtOrderModal
                        activityId={selectedActivity.id}
                        activity={selectedActivity}
                        onCancel={handleBackToRegistrations}
                        onSuccess={handleBackToRegistrations}
                    />
                )}
            </ModalEvent>

            {continueTournamentModal && createPortal(
                <ContinueTournamentModal
                    activity={continueTournamentModal}
                    onClose={() => setContinueTournamentModal(null)}
                    onContinue={handleContinueTournament}
                />,
                document.body
            )}

            {tournamentEndedModal && createPortal(
                <TournamentEndedOptionsModal
                    activity={tournamentEndedModal}
                    onClose={() => setTournamentEndedModal(null)}
                    onSelectHistory={handleSelectTournamentHistory}
                    onSelectStandings={handleSelectTournamentStandings}
                    onSelectRegistrations={handleSelectTournamentRegistrations}
                />,
                document.body
            )}

            {navigating && createPortal(
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                        <p className="text-white font-semibold text-sm tracking-wide animate-pulse">
                            Đang chuyển trang...
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}




// hiển thị khung xám nhấp nháy mô phỏng đúng cấu trúc bảng (desktop) và card (mobile), giúp cảm giác load mượt và ít giật hơn.
// ls -R app/admin
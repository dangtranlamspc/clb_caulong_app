"use client";
import { useEffect, useState, useCallback } from "react";
import {
    Mail,
    MailOpen,
    Loader2,
    Search,
    X,
    Check,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    Phone,
    Clock,
    Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { feedbackApi } from "@/lib/api";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

type Conversation = {
    user_id: string;
    users?: {
        id: string;
        full_name: string;
        avatar_url?: string;
        phone?: string;
    };
    latest_message: string;
    latest_created_at: string;
    total_count: number;
    unread_count: number;
};

type FeedbackItem = {
    id: string;
    user_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
};

type StatusFilter = "all" | "unread" | "read";

const NAVY_GRADIENT = "linear-gradient(135deg,#1d3a5f,#12283f)";

function Avatar({ name, url, size = 42 }: { name?: string; url?: string; size?: number }) {
    if (url) {
        return (
            <img
                src={url}
                alt={name}
                className="rounded-full object-cover flex-shrink-0 ring-2 ring-white"
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <div
            className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white ring-2 ring-white"
            style={{ width: size, height: size, fontSize: size * 0.4, background: NAVY_GRADIENT }}
        >
            {name?.[0]?.toUpperCase() ?? "?"}
        </div>
    );
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "unread", label: "Chưa xem" },
    { value: "read", label: "Đã xem" },
];

export default function AdminFeedbackPage() {
    const [items, setItems] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);

    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [threadMessages, setThreadMessages] = useState<FeedbackItem[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [marking, setMarking] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const limit = 20;

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await feedbackApi.listAdmin({
                search: search || undefined,
                status,
                page,
                limit,
            });
            setItems(data.data ?? []);
            setTotalPages(data.meta?.total_pages || 1);
            setTotal(data.meta?.total ?? 0);
        } catch {
            toast.error("Không tải được danh sách góp ý");
        } finally {
            setLoading(false);
        }
    }, [search, status, page]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const { data } = await feedbackApi.getUnreadCount();
            setUnreadCount(data.unread_count ?? 0);
        } catch {
            // im lặng — không chặn luồng chính
        }
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("admin-feedback-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "feedback_messages" },
                () => {
                    fetchList();
                    fetchUnreadCount();
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchList, fetchUnreadCount]);

    useEffect(() => {
        setPage(1);
    }, [search, status]);

    useEffect(() => {
        const t = setTimeout(fetchList, 250);
        return () => clearTimeout(t);
    }, [fetchList]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    const openDetail = async (conv: Conversation) => {
        setSelectedConv(conv);
        setThreadMessages([]);
        setThreadLoading(true);
        try {
            const { data } = await feedbackApi.getUserThread(conv.user_id);
            setThreadMessages(data ?? []);
        } catch {
            toast.error("Không tải được nội dung góp ý");
        } finally {
            setThreadLoading(false);
        }

        if (conv.unread_count > 0) {
            setMarking(true);
            try {
                await feedbackApi.markAllRead(conv.user_id);
                setThreadMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
                setItems((prev) =>
                    prev.map((c) => (c.user_id === conv.user_id ? { ...c, unread_count: 0 } : c)),
                );
                setSelectedConv((prev) =>
                    prev && prev.user_id === conv.user_id ? { ...prev, unread_count: 0 } : prev,
                );
                setUnreadCount((c) => Math.max(0, c - conv.unread_count));
            } catch {
                toast.error("Đánh dấu đã xem thất bại");
            } finally {
                setMarking(false);
            }
        }
    };

    const handleDeleteMessage = async (id: string) => {
        if (!window.confirm("Xoá góp ý này? Hành động không thể hoàn tác.")) return;
        setDeletingId(id);
        try {
            await feedbackApi.deleteFeedback(id);
            const remaining = threadMessages.filter((m) => m.id !== id);
            setThreadMessages(remaining);
            if (remaining.length === 0) setSelectedConv(null);
            toast.success("Đã xoá góp ý");
            fetchList();
            fetchUnreadCount();
        } catch {
            toast.error("Xoá góp ý thất bại");
        } finally {
            setDeletingId(null);
        }
    };

    const DetailContent = ({ conv }: { conv: Conversation }) => (
        <>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <Avatar name={conv.users?.full_name} url={conv.users?.avatar_url} size={44} />
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-gray-900 truncate">
                        {conv.users?.full_name ?? "Ẩn danh"}
                    </p>
                    {conv.users?.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {conv.users.phone}
                        </p>
                    )}
                </div>
                {marking && <Loader2 className="w-4 h-4 animate-spin text-gray-300 flex-shrink-0" />}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
                {threadLoading ? (
                    <div className="py-10 flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                ) : threadMessages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">Không còn góp ý nào</p>
                ) : (
                    threadMessages.map((m) => (
                        <div
                            key={m.id}
                            className={`group relative rounded-2xl p-4 text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words border-l-[3px] bg-gray-50/80 ${m.is_read ? "border-gray-200" : "border-[#e0533d]"
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(m.created_at), "HH:mm · dd MMMM yyyy", { locale: vi })}
                                </span>
                                <button
                                    onClick={() => handleDeleteMessage(m.id)}
                                    disabled={deletingId === m.id}
                                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all disabled:opacity-50"
                                    title="Xoá góp ý này"
                                >
                                    {deletingId === m.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                            {m.message}
                        </div>
                    ))
                )}
            </div>
        </>
    );

    return (
        <div className="flex h-full min-h-0 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {/* ---------- List column ---------- */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 pt-5 pb-4 flex-shrink-0 border-b border-gray-100">
                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <h2 className="text-[16px] font-bold text-gray-900 tracking-tight">Góp ý thành viên</h2>
                            <p className="text-[12px] text-gray-400 mt-0.5">
                                {loading ? "Đang tải…" : `${total} thành viên${unreadCount > 0 ? ` · ${unreadCount} tin chưa xem` : ""}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo tên, số điện thoại..."
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#183153]/10 focus:border-[#183153]/25"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-2.5 h-2.5 text-white" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 border-b border-gray-100 sm:border-0">
                            {STATUS_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatus(tab.value)}
                                    className={`relative pb-2 sm:pb-0 text-[13px] font-semibold whitespace-nowrap transition-colors ${status === tab.value ? "text-[#183153]" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                >
                                    {tab.label}
                                    {status === tab.value && (
                                        <span className="absolute left-0 right-0 -bottom-[1px] sm:-bottom-4 h-[2px] rounded-full bg-[#183153]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">Không có góp ý nào</p>
                            <p className="text-xs text-gray-400 mt-1">
                                {search ? "Thử tìm với từ khóa khác" : "Góp ý mới từ thành viên sẽ hiện ở đây"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {items.map((conv) => {
                                const isActive = selectedConv?.user_id === conv.user_id;
                                return (
                                    <button
                                        key={conv.user_id}
                                        onClick={() => openDetail(conv)}
                                        className={`group relative w-full flex items-start gap-3 px-3.5 py-3.5 text-left rounded-xl transition-all ${isActive
                                            ? "bg-[#183153]/[0.055]"
                                            : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <span
                                            className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-colors ${isActive
                                                ? "bg-[#183153]"
                                                : conv.unread_count > 0
                                                    ? "bg-[#e0533d]"
                                                    : "bg-transparent"
                                                }`}
                                        />
                                        <Avatar name={conv.users?.full_name} url={conv.users?.avatar_url} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p
                                                    className={`text-[13.5px] truncate ${conv.unread_count > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                                                        }`}
                                                >
                                                    {conv.users?.full_name ?? "Ẩn danh"}
                                                </p>
                                                <span className="text-[10.5px] text-gray-400 flex-shrink-0">
                                                    {formatDistanceToNow(new Date(conv.latest_created_at), {
                                                        locale: vi,
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            </div>
                                            {conv.users?.phone && (
                                                <p className="text-[11px] text-gray-400 mt-0.5">{conv.users.phone}</p>
                                            )}
                                            <p
                                                className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${conv.unread_count > 0 ? "text-gray-600" : "text-gray-400"
                                                    }`}
                                            >
                                                {conv.latest_message}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 mt-1 flex flex-col items-end gap-1.5">
                                            {conv.total_count > 1 && (
                                                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                                                    {conv.total_count}
                                                </span>
                                            )}
                                            {conv.unread_count > 0 ? (
                                                <span className="block w-2 h-2 rounded-full bg-[#e0533d]" />
                                            ) : (
                                                <MailOpen className="w-3.5 h-3.5 text-gray-300" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 px-4 py-3.5 border-t border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <span className="text-xs font-medium text-gray-500">
                            Trang {page}/{totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                )}
            </div>

            {/* ---------- Detail column (desktop) ---------- */}
            <div className="hidden lg:flex w-[380px] border-l border-gray-100 flex-col min-h-0 bg-gray-50/40">
                {!selectedConv ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                            <Mail className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Chọn một thành viên để xem góp ý</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 bg-white">
                        <DetailContent conv={selectedConv} />
                    </div>
                )}
            </div>

            {/* ---------- Detail overlay (mobile) ---------- */}
            {selectedConv && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-200">
                    <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 flex-shrink-0">
                        <button
                            onClick={() => setSelectedConv(null)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-4.5 h-4.5 text-gray-600" />
                        </button>
                        <span className="text-sm font-semibold text-gray-800">Chi tiết góp ý</span>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        <DetailContent conv={selectedConv} />
                    </div>
                </div>
            )}
        </div>
    );
}
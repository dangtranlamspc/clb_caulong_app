"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { sessionsAdminApi } from "@/lib/api";
import { createPortal } from "react-dom";
import SessionFormModal from "@/components/admin/sessions/SessionFormModal";
import { useRouter } from "next/navigation";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open: { label: "Mở đăng ký", cls: "bg-green-100 text-green-700" },
  full: { label: "Đã đầy", cls: "bg-amber-100 text-amber-700" },
  waiting_payment: {
    label: "Chờ thanh toán",
    cls: "bg-blue-100 text-blue-700",
  },
  cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-600" },
  completed: { label: "Hoàn thành", cls: "bg-slate-100 text-slate-600" },
};

const STATUS_NEXT: Record<
  string,
  {
    label: string;
    next?: string;
    to?: string;
    action?: "complete";
    cls: string;
  }[]
> = {
  open: [
    {
      label: "Hủy buổi",
      next: "cancelled",
      cls: "bg-red-500 hover:bg-red-600 text-white",
    },
  ],
  full: [
    {
      label: "Hủy buổi",
      next: "cancelled",
      cls: "bg-red-500 hover:bg-red-600 text-white",
    },
    {
      label: "Kết thúc",
      to: "finish",
      cls: "bg-green-500 hover:bg-green-600 text-white",
    },
  ],
  waiting_payment: [
    {
      label: "Đánh dấu hoàn thành",
      action: "complete",
      cls: "bg-emerald-50 hover:bg-emerald-100 text-emerald-600",
    },
  ],
  cancelled: [
    {
      label: "Mở lại",
      next: "open",
      cls: "bg-blue-50 hover:bg-blue-100 text-blue-600",
    },
  ],
  completed: [],
};

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ status: "", page: 1, limit: 15 });
  const [actionId, setActionId] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<{ id?: string } | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(query).filter(([, v]) => v !== ""),
      );
      const { data } = await sessionsAdminApi.list(params);
      const sorted = [...(data.data ?? [])].sort((a: any, b: any) => {
        const aReopen = a.reopened_at ? new Date(a.reopened_at).getTime() : 0;
        const bReopen = b.reopened_at ? new Date(b.reopened_at).getTime() : 0;
        if (aReopen !== bReopen) return bReopen - aReopen;

        const aTime = new Date(a.created_at ?? a.scheduled_at).getTime();
        const bTime = new Date(b.created_at ?? b.scheduled_at).getTime();
        return bTime - aTime;
      });
      setSessions(sorted);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (deleteTarget) {
      const raf = requestAnimationFrame(() => setDeleteModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [deleteTarget]);

  useEffect(() => {
    if (cancelTarget) {
      const raf = requestAnimationFrame(() => setCancelModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [cancelTarget]);

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    setTimeout(() => setCancelTarget(null), 200);
  };

  const confirmCancelSession = async () => {
    if (!cancelTarget) return;
    const { id } = cancelTarget;
    closeCancelModal();
    setActionId(id);
    try {
      await sessionsAdminApi.updateStatus(id, { status: "cancelled" });
      toast.success("Đã hủy buổi và xóa toàn bộ đăng ký");
      fetchSessions();
    } finally {
      setActionId(null);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setTimeout(() => setDeleteTarget(null), 200);
  };

  const handleStatusChange = async (id: string, next: string) => {
    setActionId(id);
    try {
      await sessionsAdminApi.updateStatus(id, { status: next });
      toast.success("Đã cập nhật trạng thái");
      fetchSessions();
    } finally {
      setActionId(null);
    }
  };

  const handleComplete = async (id: string, title: string) => {
    if (
      !confirm(
        `Xác nhận hoàn thành buổi "${title}"? Những người đang "Chờ thanh toán" sẽ được tự động chuyển sang "Đã xác nhận thanh toán" + "Tiền mặt". Buổi sẽ bị khoá lại.`,
      )
    )
      return;
    setActionId(id);
    try {
      await sessionsAdminApi.complete(id);
      toast.success("Đã hoàn thành và khoá buổi đánh!");
      fetchSessions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Thất bại");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    closeDeleteModal();
    setActionId(id);
    try {
      await sessionsAdminApi.delete(id);
      toast.success("Đã xóa buổi");
      fetchSessions();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buổi đánh cầu</h1>
          <p className="text-gray-500 text-sm mt-0.5">{meta.total ?? 0} buổi</p>
        </div>
        <div className="flex items-center gap-2">
          <LayoutGroup>
            <div className="flex-1 flex gap-1.5 bg-gray-100 rounded-xl p-1.5 overflow-x-auto scrollbar-hide relative">
              {[
                ["", "Tất cả"],
                ["open", "Mở"],
                ["full", "Đầy"],
                ["completed", "Xong"],
                ["cancelled", "Hủy"],
              ].map(([val, lbl]) => {
                const isActive = query.status === val;
                return (
                  <button
                    key={val}
                    onClick={() =>
                      setQuery((q) => ({
                        ...q,
                        status: val,
                        page: 1,
                      }))
                    }
                    className="relative flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="session-status-pill"
                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-sm shadow-blue-200"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors ${isActive
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-800"
                        }`}
                    >
                      {lbl}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <button
            onClick={() => setFormTarget({})}
            className="flex items-center justify-center w-12 h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card py-16 text-center text-gray-400">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Chưa có buổi đánh nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {sessions.map((s) => {
            const cfg =
              s.status === "waiting_payment"
                ? s.pending_action_count > 0
                  ? STATUS_CONFIG.waiting_payment
                  : {
                    label: "Chờ chốt thanh toán",
                    cls: "bg-indigo-100 text-indigo-700",
                  }
                : (STATUS_CONFIG[s.status] ?? STATUS_CONFIG.open);
            const nextActions = STATUS_NEXT[s.status] ?? [];
            const busy = actionId === s.id;

            return (
              <div
                key={s.id}
                className="card flex flex-col gap-3 shadow-[0_2px_16px_rgba(0,0,0,0.08),0_12px_32px_-6px_rgba(0,0,0,0.12)]"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 leading-tight">
                    {s.title}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.cls}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span>
                      {format(
                        new Date(s.scheduled_at),
                        "EEEE, dd/MM/yyyy HH:mm",
                        { locale: vi },
                      )}
                    </span>
                  </div>
                  {s.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{s.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 flex-wrap">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span
                        className={
                          s.available_slots <= 0
                            ? "text-red-500 font-medium"
                            : ""
                        }
                      >
                        {s.available_slots ?? s.max_slots}/{s.max_slots} chỗ
                        trống
                      </span>
                      {(s.male_count > 0 || s.female_count > 0) && (
                        <span className="text-gray-400 text-xs">
                          · 👨 {s.male_count ?? 0} · 👩 {s.female_count ?? 0}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {s.duration_minutes} phút
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-xs text-gray-400">
                    {s.confirmed_count ?? 0} đã xác nhận ·{" "}
                    {s.pending_count ?? 0} chờ
                  </span>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setNavigatingId(s.id);
                        router.push(`/admin/sessions/${s.id}`);
                        setTimeout(
                          () =>
                            setNavigatingId((cur) =>
                              cur === s.id ? null : cur,
                            ),
                          4000,
                        );
                      }}
                      disabled={navigatingId === s.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-60"
                    >
                      {navigatingId === s.id ? (
                        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 shrink-0" />
                      )}
                      Xem
                    </button>
                    {s.status !== "completed" && (
                      <>
                        <button
                          onClick={() => setFormTarget({ id: s.id })}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors"
                        >
                          <Pencil className="w-4 h-4" /> Sửa
                        </button>
                      </>
                    )}
                    {s.status === "cancelled" && (
                      <button
                        onClick={() => handleDelete(s.id, s.title)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" /> Xóa
                      </button>
                    )}
                  </div>

                  {nextActions.length > 0 && (
                    <div className="flex gap-1.5">
                      {nextActions.map(({ label, next, to, action, cls }) =>
                        to ? (
                          <Link
                            key={to}
                            href={`/admin/sessions/${s.id}/${to}`}
                            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${cls}`}
                          >
                            {label}
                          </Link>
                        ) : action === "complete" ? (
                          <button
                            key="complete"
                            onClick={() => handleComplete(s.id, s.title)}
                            disabled={busy}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap ${cls}`}
                          >
                            {label}
                          </button>
                        ) : (
                          <button
                            key={next}
                            onClick={() =>
                              next === "cancelled"
                                ? setCancelTarget({ id: s.id, title: s.title })
                                : handleStatusChange(s.id, next!)
                            }
                            disabled={busy}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap ${cls}`}
                          >
                            {label}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {meta.page}/{meta.total_pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
              disabled={meta.page <= 1}
              className="p-2.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 active:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
              disabled={meta.page >= meta.total_pages}
              className="p-2.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 active:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <SessionFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSuccess={fetchSessions}
      />

      {deleteTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
              opacity: deleteModalVisible ? 1 : 0,
              transition: "opacity 200ms ease-out",
            }}
            onClick={closeDeleteModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
              style={{
                transform: deleteModalVisible
                  ? "scale(1) translateY(0)"
                  : "scale(0.95) translateY(8px)",
                opacity: deleteModalVisible ? 1 : 0,
                transition:
                  "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  <h3 className="font-bold text-gray-900">Xóa buổi đánh?</h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-gray-500">
                  Xóa buổi{" "}
                  <strong className="text-gray-700">
                    "{deleteTarget.title}"
                  </strong>
                  ? Hành động này không thể hoàn tác.
                </p>
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                <button
                  onClick={closeDeleteModal}
                  className="btn-secondary text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={actionId === deleteTarget.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Xóa buổi
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {cancelTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
              opacity: cancelModalVisible ? 1 : 0,
              transition: "opacity 200ms ease-out",
            }}
            onClick={closeCancelModal}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl"
              style={{
                transform: cancelModalVisible
                  ? "scale(1) translateY(0)"
                  : "scale(0.95) translateY(8px)",
                opacity: cancelModalVisible ? 1 : 0,
                transition:
                  "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <h3 className="font-bold text-gray-900">Hủy buổi đánh?</h3>
                </div>
                <button
                  onClick={closeCancelModal}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-2">
                <p className="text-sm text-gray-500">
                  Hủy buổi{" "}
                  <strong className="text-gray-700">
                    "{cancelTarget.title}"
                  </strong>
                  ?
                </p>
                <p className="text-sm text-red-500">
                  Toàn bộ thành viên đã đăng ký buổi này sẽ bị{" "}
                  <strong>xóa khỏi danh sách</strong>, kể cả người đã xác nhận
                  thanh toán. Bạn có thể "Mở lại" buổi sau nhưng danh sách đăng
                  ký sẽ không được khôi phục.
                </p>
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                <button
                  onClick={closeCancelModal}
                  className="btn-secondary text-sm"
                >
                  Đóng
                </button>
                <button
                  onClick={confirmCancelSession}
                  disabled={actionId === cancelTarget.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Xác nhận hủy buổi
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

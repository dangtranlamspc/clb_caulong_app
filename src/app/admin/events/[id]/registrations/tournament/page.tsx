"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Download,
  Users,
  Eye,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  AlertTriangle,
  ArrowLeft,
  FilterX,
  Trophy,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isBefore,
  startOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { eventsAdminApi, walletAdminApi } from "@/lib/api";
import { CustomSelect } from "@/components/admin/sessions/CustomSelect";
import { createPortal } from "react-dom";



const PAYMENT_METHOD_LABEL: Record<string, string> = {
  wallet: "Ví BNB",
  transfer: "Chuyển khoản",
  cash: "Tiền mặt",
};

const HIDE_SCROLLBAR_CLASS =
  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return value;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#e6f7ee", text: "#1a9e5c" },
  "B+": { bg: "#efe7fd", text: "#7c3aed" },
  B: { bg: "#fff2df", text: "#c8790f" },
  C: { bg: "#e3f7fb", text: "#0f9db0" },
};


const MATCH_CONTENT_OPTIONS = [
  { value: "Đôi Nam", label: "Đôi Nam" },
  { value: "Đôi Nam - Nữ", label: "Đôi Nam - Nữ" },
  { value: "Đôi Nữ", label: "Đôi Nữ" },
  { value: "Đơn Nam", label: "Đơn Nam" },
  { value: "Đơn Nữ", label: "Đơn Nữ" },
  { value: "3vs3", label: "3vs3" },
];

const MATCH_CONTENT_COLOR: Record<string, string> = {
  "Đôi Nam": "#1c3d5a",
  "Đôi Nam - Nữ": "#7c3aed",
  "Đôi Nữ": "#c2185b",
  "Đơn Nam": "#374151",
  "Đơn Nữ": "#db2777",
  "3vs3": "#0f766e",
};

const genId = () => Math.random().toString(36).slice(2, 10);

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  open: "Đang mở đăng ký",
  closed: "Đã đóng đăng ký",
  ongoing: "Đang diễn ra",
  completed: "Đã kết thúc",
  cancelled: "Đã huỷ",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
  open: { bg: "#e6f7ee", text: "#1a9e5c", border: "#c8ecd9" },
  closed: { bg: "#fff2df", text: "#c8790f", border: "#fbe3bb" },
  ongoing: { bg: "#e3f7fb", text: "#0f9db0", border: "#bfeef6" },
  completed: { bg: "#eef2ff", text: "#4f46e5", border: "#d6ddfb" },
  cancelled: { bg: "#fdecec", text: "#dc2626", border: "#f9cfcf" },
};

const WEEKDAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, "0"),
}));

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, "0"),
}));

const ROLES_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "nam", label: "VĐV Nam" },
  { value: "nu", label: "VĐV Nữ" },
];


const LEVEL_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "A", label: "Trình A" },
  { value: "B+", label: "Trình B+" },
  { value: "B", label: "Trình B" },
  { value: "C", label: "Trình C" },
];

const LEVEL_SELECT_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B+", label: "B+" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "confirmed", label: "Đã thanh toán" },
  { value: "pending", label: "Chưa thanh toán" },
];


const PAGE_SIZE = 8;

function levelPillStyle(level?: string | null) {
  const c = level ? LEVEL_COLORS[level] : null;
  return c
    ? { background: c.bg, color: c.text }
    : { background: "#f3f4f6", color: "#6b7280" };
}

function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="w-9 h-9 rounded-xl bg-gray-100" />
      </div>
      <div className="h-7 bg-gray-100 rounded w-10 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-12" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3.5">
        <div className="h-4 bg-gray-100 rounded w-4" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 bg-gray-100 rounded w-10" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 bg-gray-100 rounded-lg w-10" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 bg-gray-100 rounded w-20" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 bg-gray-100 rounded w-24" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 bg-gray-100 rounded-full w-24" />
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="h-4 bg-gray-100 rounded w-16 ml-auto" />
      </td>
    </tr>
  );
}

function SkeletonFilterBar() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2 h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}

function SkeletonRightPanel() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 animate-pulse space-y-3">
        <div className="h-4 bg-gray-100 rounded w-40" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-gray-100 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-28" />
          <div className="h-3 bg-gray-100 rounded w-36" />
        </div>
        <div className="h-10 bg-gray-100 rounded-lg mt-3" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-44 mb-4" />
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

function useModalTransition(onClose: () => void, duration = 180) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    if (closing) return;
    setVisible(false);
    setClosing(true);
    setTimeout(onClose, duration);
  };

  return { visible, handleClose };
}

function AnimatedTableRow({
  removing,
  onCollapsed,
  children,
  className = "",
}: {
  removing: boolean;
  onCollapsed?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    if (removing) {
      const height = el.getBoundingClientRect().height;
      el.style.height = `${height}px`;
      el.style.overflow = "hidden";
      el.style.pointerEvents = "none";
      void el.offsetHeight; // force reflow
      requestAnimationFrame(() => {
        el.style.transition = "height 280ms ease, opacity 280ms ease";
        el.style.height = "0px";
        el.style.opacity = "0";
      });
      const t = setTimeout(() => onCollapsed?.(), 300);
      return () => clearTimeout(t);
    } else {
      el.style.transition = "";
      el.style.height = "";
      el.style.overflow = "";
      el.style.opacity = "";
      el.style.pointerEvents = "";
    }
  }, [removing]);

  return (
    <tr ref={rowRef} className={className}>
      {children}
    </tr>
  );
}

function CollapsibleItem({
  removing,
  onCollapsed,
  children,
}: {
  removing: boolean;
  onCollapsed?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (removing) {
      const height = el.getBoundingClientRect().height;
      el.style.height = `${height}px`;
      el.style.overflow = "hidden";
      el.style.pointerEvents = "none";
      void el.offsetHeight;
      requestAnimationFrame(() => {
        el.style.transition = "height 280ms ease, opacity 280ms ease";
        el.style.height = "0px";
        el.style.opacity = "0";
      });
      const t = setTimeout(() => onCollapsed?.(), 300);
      return () => clearTimeout(t);
    } else {
      el.style.transition = "";
      el.style.height = "";
      el.style.overflow = "";
      el.style.opacity = "";
      el.style.pointerEvents = "";
    }
  }, [removing]);

  return <div ref={ref}>{children}</div>;
}

function FadeSwitch({
  children,
  transitionKey,
}: {
  children: React.ReactNode;
  transitionKey: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [transitionKey]);
  return (
    <div
      className={`transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
    >
      {children}
    </div>
  );
}

function RegistrationDetailModal({
  reg,
  mode,
  editLevel,
  editRole,
  editNotes,
  onEditLevel,
  onEditRole,
  onEditNotes,
  onClose,
  onSave,
  onConfirmPayment,
}: {
  reg: any;
  mode: "view" | "edit";
  editLevel: string;
  editRole: string;
  editNotes: string;
  onEditLevel: (v: string) => void;
  onEditRole: (v: string) => void;
  onEditNotes: (v: string) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  onConfirmPayment: (id: string) => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);
  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSaveClick = async () => {
    setSavingLocal(true);
    const success = await onSave();
    setSavingLocal(false);
    if (success) handleClose();
  };

  const currentRole = mode === "edit" ? editRole : reg.role;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out ${visible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">
            {mode === "edit" ? "Chỉnh sửa đăng ký" : "Chi tiết đăng ký"}
          </h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <img
              src={
                reg.users?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(reg.users?.full_name ?? "?")}`
              }
              className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-50"
              alt=""
            />
            <div>
              <p className="font-semibold text-gray-900">
                {reg.users?.full_name ?? reg.guest_full_name ?? "—"}
              </p>
              <p className="text-xs text-gray-400">
                {reg.users?.email ?? reg.guest_email ?? ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Vai trò</p>
              {mode === "edit" ? (
                <CustomSelect
                  value={editRole}
                  onChange={onEditRole}
                  options={ROLES_OPTIONS.filter((o) => o.value)}
                />
              ) : (
                <span
                  className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${reg.role === "nam"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-pink-50 text-pink-600"
                    }`}
                >
                  {reg.role === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Trình độ</p>
              {mode === "edit" ? (
                <CustomSelect
                  value={editLevel}
                  onChange={onEditLevel}
                  options={LEVEL_SELECT_OPTIONS}
                />
              ) : (
                <span
                  className="inline-block text-xs font-semibold rounded-lg px-2.5 py-1.5"
                  style={levelPillStyle(reg.level)}
                >
                  {reg.level ?? "—"}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">SĐT</p>
              <p className="text-gray-800">
                {reg.users?.phone ?? reg.guest_phone ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Ngày đăng ký</p>
              <p className="text-gray-800">
                {reg.created_at
                  ? format(new Date(reg.created_at), "dd/MM/yyyy HH:mm", { locale: vi })
                  : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">Thanh toán</p>
              <button
                disabled={mode === "view"}
                onClick={() =>
                  reg.payment_status !== "confirmed" && onConfirmPayment(reg.id)
                }
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors ${reg.payment_status === "confirmed"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                  } ${mode === "view" ? "cursor-default" : ""}`}
              >
                {reg.payment_status === "confirmed" ? "Đã thanh toán" : "Chưa thanh toán"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Ghi chú</p>
            {mode === "edit" ? (
              <textarea
                value={editNotes}
                onChange={(e) => onEditNotes(e.target.value)}
                rows={3}
                className="input-field w-full resize-none"
                placeholder="Ghi chú thêm..."
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {reg.notes || "Không có ghi chú"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {mode === "edit" ? "Huỷ" : "Đóng"}
          </button>
          {mode === "edit" && (
            <button
              onClick={handleSaveClick}
              disabled={savingLocal}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {savingLocal ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function AdminAddTournamentRegistrationModal({
  activityId,
  onClose,
  onAdded,
}: {
  activityId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  const [mode, setMode] = useState<"member" | "guest">("member");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestGender, setGuestGender] = useState<"nam" | "nu">("nam");

  const [role, setRole] = useState<"nam" | "nu">("nam");
  const [level, setLevel] = useState<"A" | "B+" | "B" | "C">("A");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "member_choice">("wallet");

  useEffect(() => {
    if (mode !== "member" || !memberSearch.trim()) {
      setMemberResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data } = await walletAdminApi.listMembers({
          search: memberSearch,
          page: 1,
          limit: 8,
        });
        setMemberResults(data.data ?? []);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [memberSearch, mode]);

  const handleSelectMember = (m: any) => {
    setSelectedMember(m);
    setMemberResults([]);
    setMemberSearch("");

    if (m.gender === "nam" || m.gender === "nu") {
      setRole(m.gender);
    }

    if (
      LEVEL_SELECT_OPTIONS.some((o) => o.value === m.suggested_tournament_level)
    ) {
      setLevel(m.suggested_tournament_level);
    }
  };

  const handleSubmit = async () => {
    if (mode === "member" && !selectedMember) {
      toast.error("Vui lòng chọn thành viên");
      return;
    }
    if (mode === "guest" && !guestName.trim()) {
      toast.error("Vui lòng nhập tên khách");
      return;
    }
    if (mode === "guest" && !guestEmail.trim()) {
      toast.error("Vui lòng nhập email để gửi hóa đơn thanh toán cho khách");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await eventsAdminApi.adminAddTournamentRegistration(activityId, {
        user_id: mode === "member" ? selectedMember.id : undefined,
        guest_full_name: mode === "guest" ? guestName : undefined,
        guest_phone: mode === "guest" ? guestPhone : undefined,
        guest_email: mode === "guest" ? guestEmail : undefined,
        guest_gender: mode === "guest" ? guestGender : undefined,
        role,
        level,
        notes: notes || undefined,
        payment_method: mode === "member" ? paymentMethod : undefined,
      });

      if (mode === "guest" && data.mail_sent === false) {
        toast.error(data.message ?? "Đã đăng ký nhưng gửi email thất bại");
      } else {
        toast.success(data.message ?? "Đã đăng ký thành công");
      }
      onAdded();
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all duration-200 ease-out ${visible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Thêm đăng ký thi đấu</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="relative flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-gray-50 p-0.5">
            <div
              className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md bg-blue-600 shadow-sm transition-transform duration-300 ease-out"
              style={{
                transform: mode === "member" ? "translateX(0%)" : "translateX(calc(100% + 4px))",
              }}
            />
            <button
              type="button"
              onClick={() => setMode("member")}
              className={`relative z-10 flex-1 py-2 font-medium rounded-md transition-colors duration-300 text-xs sm:text-sm ${mode === "member" ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Thành viên (có tài khoản)
            </button>
            <button
              type="button"
              onClick={() => setMode("guest")}
              className={`relative z-10 flex-1 py-2 font-medium rounded-md transition-colors duration-300 text-xs sm:text-sm ${mode === "guest" ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Khách (không tài khoản)
            </button>
          </div>

          <FadeSwitch transitionKey={mode}>
            {mode === "member" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tìm thành viên
                </label>
                {selectedMember ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {selectedMember.full_name}
                      </p>
                      <p className="text-xs text-gray-400">{selectedMember.phone}</p>
                    </div>
                    <button
                      onClick={() => setSelectedMember(null)}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0"
                    >
                      Đổi
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      className="input-field transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      placeholder="Nhập tên hoặc SĐT..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {searchingMembers && (
                      <p className="text-xs text-gray-400 mt-1">Đang tìm...</p>
                    )}
                    {memberResults.length > 0 && (
                      <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {memberResults.map((m: any) => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="text-sm text-gray-900 truncate">{m.full_name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{m.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Họ tên khách" required>
                  <input
                    className="input-field transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="SĐT">
                    <input
                      className="input-field transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="Giới tính">
                    <CustomSelect
                      value={guestGender}
                      onChange={(v) => setGuestGender(v as "nam" | "nu")}
                      options={[
                        { value: "nam", label: "Nam" },
                        { value: "nu", label: "Nữ" },
                      ]}
                    />
                  </Field>
                </div>
                <Field label="Email (để gửi hóa đơn  thanh toán)" required>
                  <input
                    type="email"
                    className="input-field transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </FadeSwitch>


          {mode === "member" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phương thức thanh toán
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("wallet")}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${paymentMethod === "wallet"
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  Ví BNB
                  <p className="text-[11px] font-normal text-gray-400 mt-0.5">
                    Trừ ví ngay, xác nhận luôn
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("member_choice")}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors ${paymentMethod === "member_choice"
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  Thành viên tự chọn
                  <p className="text-[11px] font-normal text-gray-400 mt-0.5">
                    Gửi yêu cầu xác nhận
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Vai trò" required>
              <CustomSelect
                value={role}
                onChange={(v) => setRole(v as "nam" | "nu")}
                options={[
                  { value: "nam", label: "VĐV Nam" },
                  { value: "nu", label: "VĐV Nữ" },
                ]}
              />
            </Field>
            <Field label="Trình độ" required>
              <CustomSelect
                value={level}
                onChange={(v) => setLevel(v as any)}
                options={[
                  { value: "A", label: "A" },
                  { value: "B+", label: "B+" },
                  { value: "B", label: "B" },
                  { value: "C", label: "C" },
                ]}
              />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea
              className="input-field resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting
              ? "Đang lưu..."
              : mode === "guest"
                ? "Đăng ký & gửi email"
                : paymentMethod === "wallet"
                  ? "Đăng ký & trừ ví"
                  : "Gửi yêu cầu xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TournamentRegistrationsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [activity, setActivity] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);

  const [teamCount, setTeamCount] = useState("7");
  const [teamCountTouched, setTeamCountTouched] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const [modalReg, setModalReg] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [editLevel, setEditLevel] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [showTeamsModal, setShowTeamsModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const [showStartTournamentModal, setShowStartTournamentModal] = useState(false);

  const [teams, setTeams] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  const [publicLinkOpen, setPublicLinkOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [clearingTeams, setClearingTeams] = useState(false);
  const [exportingTeams, setExportingTeams] = useState(false);

  const [showDrawForm, setShowDrawForm] = useState(false);

  const [showDrawConfirm, setShowDrawConfirm] = useState(false);

  const [statModal, setStatModal] = useState<{ title: string; items: any[] } | null>(null);

  const [payingAction, setPayingAction] = useState<{ id: string; type: "confirm" | "reject" } | null>(null);

  const [deleteRegModal, setDeleteRegModal] = useState<{ id: string; isInTeam: boolean } | null>(null);
  const [removingRegId, setRemovingRegId] = useState<string | null>(null);

  const [reloading, setReloading] = useState(false);

  const publicLinkBtnRef = useRef<HTMLButtonElement>(null);
  const [publicLinkAnchor, setPublicLinkAnchor] = useState<{ top: number; left: number; right: number } | null>(null);

  const [confirmMethodModal, setConfirmMethodModal] = useState<{ id: string } | null>(null)
  type WizardStep = "round_robin_setup" | "team_list" | "schedule";
  const [wizardStack, setWizardStack] = useState<WizardStep[]>([]);
  const tournamentWizardStep: WizardStep | null =
    wizardStack.length > 0 ? wizardStack[wizardStack.length - 1] : null;
  const isEditingTournamentInfo =
    wizardStack.length > 1 && tournamentWizardStep === "round_robin_setup";
  const pushWizardStep = (step: WizardStep) => setWizardStack((prev) => [...prev, step]);
  const popWizardStep = () => setWizardStack((prev) => prev.slice(0, -1));
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);

  const searchParams = useSearchParams();

  const [confirmingSchedule, setConfirmingSchedule] = useState(false);
  const [confirmScheduleWarning, setConfirmScheduleWarning] = useState<{ unscheduled: number; total: number } | null>(null);

  const tournamentStarted = Boolean(activity?.started_at);

  const handleConfirmSchedule = async (force: boolean) => {
    if (!id) return;
    setConfirmingSchedule(true);
    try {
      const { data } = await eventsAdminApi.confirmTournamentSchedule(id, force);
      if (data.needs_confirmation) {
        setConfirmScheduleWarning({ unscheduled: data.unscheduled_count, total: data.total_count });
        return;
      }
      setConfirmScheduleWarning(null);
      toast.success(data.message ?? "Đã xác nhận lịch thi đấu");
      await load(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Xác nhận lịch thi đấu thất bại");
    } finally {
      setConfirmingSchedule(false);
    }
  };

  useEffect(() => {
    if (!activity) return;
    if (activity.started_at && searchParams.get("step") === "schedule" && wizardStack.length === 0) {
      setWizardStack(["schedule"]);
      router.replace(`/admin/events/${id}/registrations/tournament`);
    }
  }, [activity]);

  const handleGenerateSchedule = async () => {
    if (!id) return;
    setGeneratingSchedule(true);
    try {
      await eventsAdminApi.generateTournamentSchedule(id);
      setScheduleGenerated(true);
      pushWizardStep("schedule");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Tạo lịch thi đấu thất bại");
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleBackToSchedule = () => {
    pushWizardStep("schedule");
  };

  const [savingFormat, setSavingFormat] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await Promise.all([load(true), loadTeams()]);
      toast.success("Đã tải lại dữ liệu");
    } finally {
      setReloading(false);
    }
  };

  const publicLink = useMemo(() => {
    if (typeof window === "undefined" || !id) return "";
    return `${window.location.origin}/giai-dau/${id}`;
  }, [id]);

  const handleCopyPublicLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setLinkCopied(true);
      toast.success("Đã sao chép link đăng ký công khai");
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép, vui lòng copy thủ công");
    }
  };

  const compositionSlots: { role: "nam" | "nu"; level?: string | null; label?: string }[] =
    activity?.detail?.composition ?? [];

  const drawContent = useMemo<"nam" | "nu" | "mix">(() => {
    const hasNam = compositionSlots.some((c) => c.role === "nam");
    const hasNu = compositionSlots.some((c) => c.role === "nu");
    if (hasNam && hasNu) return "mix";
    if (hasNu) return "nu";
    return "nam";
  }, [compositionSlots]);


  const unpaidEligibleCount = useMemo(() => {
    let elig = registrations;
    if (drawContent === "nam") elig = elig.filter((r) => r.role === "nam");
    else if (drawContent === "nu") elig = elig.filter((r) => r.role === "nu");
    return elig.filter((r) => r.payment_status !== "confirmed").length;
  }, [registrations, drawContent]);

  const getStatMembers = (key: string) => {
    switch (key) {
      case "total":
        return registrations;
      case "nam":
        return registrations.filter((r) => r.role === "nam");
      case "nu":
        return registrations.filter((r) => r.role === "nu");
      default:
        if (key.includes("-")) {
          const [role, level] = key.split("-");
          return registrations.filter((r) => r.role === role && r.level === level);
        }
        return [];
    }
  };

  const openStatModal = (key: string, title: string) => {
    setStatModal({ title, items: getStatMembers(key) });
  };

  const openModal = (r: any, mode: "view" | "edit") => {
    setModalReg(r);
    setModalMode(mode);
    setEditLevel(r.level ?? "");
    setEditRole(r.role ?? "nam");
    setEditNotes(r.notes ?? "");
  };

  const handleClearTeams = async () => {
    if (!id) return;
    if (
      !confirm(
        "Xoá toàn bộ kết quả chia đội hiện tại? Hành động này không thể hoàn tác.",
      )
    )
      return;
    setClearingTeams(true);
    try {
      await eventsAdminApi.clearTournamentTeams(id);
      toast.success("Đã xoá kết quả chia đội");
      setTeams([]);
      setUnassigned(registrations);
      setScheduleGenerated(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Xoá kết quả chia đội thất bại");
    } finally {
      setClearingTeams(false);
    }
  };


  const handleExportTeamsExcel = async () => {
    if (!id) return;
    setExportingTeams(true);
    try {
      const res = await eventsAdminApi.exportTournamentTeams(id);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const disposition = res.headers?.["content-disposition"] as string | undefined;
      const match = disposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      const filename = match ? decodeURIComponent(match[1]) : "chia-doi.xlsx";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Đã xuất file Excel");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Xuất Excel thất bại, có thể chưa có dữ liệu chia đội",
      );
    } finally {
      setExportingTeams(false);
    }
  };

  const loadTeams = async () => {
    if (!id) return;
    setLoadingTeams(true);
    try {
      const { data } = await eventsAdminApi.getTournamentTeams(id);
      setTeams(data.teams ?? []);
      setUnassigned(data.unassigned ?? []);
    } catch {
    } finally {
      setLoadingTeams(false);
    }
  };

  const closeModal = () => setModalReg(null);

  const handleSaveEdit = async (): Promise<boolean> => {
    if (!modalReg) return false;
    if (!editLevel) {
      toast.error("Vui lòng chọn trình độ");
      return false;
    }

    const prevRegs = registrations;
    const nextLevel = editLevel;

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === modalReg.id
          ? { ...r, notes: editNotes, role: editRole, level: nextLevel }
          : r,
      ),
    );

    try {
      await eventsAdminApi.updateTournamentRegistration(modalReg.id, {
        role: editRole,
        level: nextLevel,
        notes: editNotes,
      });
      toast.success("Đã lưu thay đổi");
      return true;
    } catch (err: any) {
      setRegistrations(prevRegs);
      toast.error(err?.response?.data?.message ?? "Lưu thay đổi thất bại");
      return false;
    }
  };

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [{ data: act }, { data: regData }] = await Promise.all([
        eventsAdminApi.get(id),
        eventsAdminApi.getRegistrations(id),
      ]);
      setActivity(act);
      setRegistrations(regData.registrations ?? []);
    } catch {
      toast.error("Không tải được dữ liệu đăng ký");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadTeams();
  }, [id]);

  useEffect(() => {
    if (!teamCountTouched && activity?.detail?.max_teams != null) {
      setTeamCount(String(activity.detail.max_teams));
    }
  }, [activity?.detail?.max_teams, teamCountTouched]);

  useEffect(() => {
    setPage(1);
  }, [search, genderFilter, levelFilter, roleFilter, paymentFilter]);

  const stats = useMemo(() => {
    const total = registrations.length;
    const nam = registrations.filter((r) => r.role === "nam").length;
    const nu = registrations.filter((r) => r.role === "nu").length;
    const byLevel = (lv: string) =>
      registrations.filter((r) => r.level === lv).length;
    const revenue = registrations
      .filter((r) => r.payment_status === "confirmed")
      .reduce((sum, r) => sum + (r.amount_override ?? 0), 0);
    return {
      total,
      nam,
      nu,
      namPct: total ? ((nam / total) * 100).toFixed(2) : "0.00",
      nuPct: total ? ((nu / total) * 100).toFixed(2) : "0.00",
      A: byLevel("A"),
      "B+": byLevel("B+"),
      B: byLevel("B"),
      C: byLevel("C"),
      revenue,
    };
  }, [registrations]);


  const genderLevelStats = useMemo(() => {
    const levels = ["A", "B+", "B", "C"];
    const roles: { value: "nam" | "nu"; label: string }[] = [
      { value: "nam", label: "Nam" },
      { value: "nu", label: "Nữ" },
    ];
    const result: { key: string; label: string; value: number; level: string }[] = [];
    for (const r of roles) {
      for (const lv of levels) {
        const count = registrations.filter((x) => x.role === r.value && x.level === lv).length;
        if (count > 0) {
          result.push({ key: `${r.value}-${lv}`, label: `${r.label} ${lv}`, value: count, level: lv });
        }
      }
    }
    return result;
  }, [registrations]);

  const levelPct = (count: number) =>
    stats.total ? ((count / stats.total) * 100).toFixed(2) : "0.00";

  const filtered = useMemo(() => {
    return registrations
      .filter((r) => {
        const name = (r.users?.full_name ?? r.guest_full_name ?? "").toLowerCase();
        const email = (r.users?.email ?? r.guest_email ?? "").toLowerCase();
        const phone = r.users?.phone ?? r.guest_phone ?? "";
        const q = search.trim().toLowerCase();
        if (q && !name.includes(q) && !email.includes(q) && !phone.includes(q))
          return false;
        if (genderFilter && r.role !== genderFilter) return false;
        if (levelFilter && r.level !== levelFilter) return false;
        if (roleFilter && r.role !== roleFilter) return false;
        if (paymentFilter && r.payment_status !== paymentFilter) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [
    registrations,
    search,
    genderFilter,
    levelFilter,
    roleFilter,
    paymentFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch("");
    setGenderFilter("");
    setLevelFilter("");
    setRoleFilter("");
    setPaymentFilter("");
  };

  const handleLevelChange = async (regId: string, level: string) => {
    const prevRegs = registrations;
    setRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, level } : r)),
    );
    try {
      await eventsAdminApi.updateTournamentRegistration(regId, { level });
      toast.success("Đã cập nhật trình độ");
    } catch (err: any) {
      setRegistrations(prevRegs);
      toast.error(err?.response?.data?.message ?? "Cập nhật trình độ thất bại");
    }
  };

  const handleConfirmPayment = async (regId: string, method?: "transfer" | "cash") => {
    const reg = registrations.find((r) => r.id === regId);

    if (!method && reg && !reg.user_id && !reg.payment_method) {
      setConfirmMethodModal({ id: regId });
      return;
    }

    setPayingAction({ id: regId, type: "confirm" });
    try {
      const { data } = await eventsAdminApi.confirmTournamentPayment(regId, method);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, ...data.registration } : r))
      );
      toast.success("Đã xác nhận thanh toán");
      setConfirmMethodModal(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Xác nhận thanh toán thất bại");
    } finally {
      setPayingAction(null);
    }
  };

  const handleRejectPayment = async (regId: string) => {
    setPayingAction({ id: regId, type: "reject" });
    try {
      const { data } = await eventsAdminApi.rejectTournamentPayment(regId);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, ...data.registration } : r))
      );
      toast.success("Đã từ chối yêu cầu thanh toán");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Từ chối thất bại");
    } finally {
      setPayingAction(null);
    }
  };

  const handleDrawTeams = async () => {
    if (!id) return;
    setDrawing(true);
    try {
      await eventsAdminApi.drawTeams(id, { content: drawContent, team_count: Number(teamCount) });
      toast.success("Đã chia đội thành công");
      setShowDrawForm(false);
      load();
      loadTeams();
    } catch {
    } finally {
      setDrawing(false);
    }
  };


  const handleCreateRoundRobinSchedule = async (
    matchContents: { id: string; label: string }[]
  ) => {
    if (!id || !activity) return;
    const courtsCount = matchContents.length;
    if (courtsCount < 1) {
      toast.error("Vui lòng cấu hình ít nhất 1 nội dung thi đấu trước khi tạo lịch");
      return;
    }
    setSavingFormat(true);
    try {
      await eventsAdminApi.update(id, {
        type: "tournament",
        title: activity.title,
        status: activity.status,
        detail: {
          ...activity.detail,
          format: "round_robin",
          courts_count: courtsCount,
          rules: {
            ...activity.detail?.rules,
            match_contents: matchContents,
          },
        },
      });
      await load(true);
      if (isEditingTournamentInfo) {
        popWizardStep();
      } else {
        pushWizardStep("team_list");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Lưu thiết lập thất bại");
    } finally {
      setSavingFormat(false);
    }
  };

  const handleRenameTournamentTeam = async (teamId: string, name: string) => {
    try {
      await eventsAdminApi.renameTournamentTeam(teamId, name);
      toast.success("Đã đổi tên đội");
      await loadTeams();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đổi tên đội thất bại");
      throw err;
    }
  };

  const handleDeleteReg = (regId: string) => {
    const reg = registrations.find((r) => r.id === regId);
    setDeleteRegModal({ id: regId, isInTeam: Boolean(reg?.team_id) });
  };

  const confirmDeleteReg = () => {
    if (!deleteRegModal) return;
    const { id } = deleteRegModal;
    setDeleteRegModal(null);
    setRemovingRegId(id);
  };

  const handleRowCollapsed = async (id: string) => {
    try {
      const { data } = await eventsAdminApi.removeRegistration("tournament", id);

      setRegistrations((prev) => prev.filter((r) => r.id !== id));

      if (data.teams_cleared) {
        toast.success("Đã xoá đăng ký và xoá kết quả chia đội, vui lòng chia lại");
        await loadTeams();
      } else {
        toast.success("Đã xoá đăng ký");
        setTeams((prev) =>
          prev.map((t) => ({ ...t, members: t.members?.filter((m: any) => m.id !== id) }))
        );
        setUnassigned((prev) => prev.filter((m: any) => m.id !== id));
      }
    } catch {
      toast.error("Xoá đăng ký thất bại");
    } finally {
      setRemovingRegId(null);
    }
  };


  if (loading) {
    return (
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-5 bg-gray-50 min-h-screen">
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="h-3.5 bg-gray-100 rounded w-16" />
          <ChevronRight className="w-3.5 h-3.5 text-gray-200" />
          <div className="h-3.5 bg-gray-100 rounded w-32" />
          <ChevronRight className="w-3.5 h-3.5 text-gray-200" />
          <div className="h-3.5 bg-gray-100 rounded w-24" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-7 bg-gray-100 rounded w-56" />
            <div className="h-5 bg-gray-100 rounded-full w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-gray-100 rounded-lg w-32" />
            <div className="h-9 bg-gray-100 rounded-lg w-24" />
            <div className="h-9 bg-gray-100 rounded-lg w-40" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 sm:gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 sm:gap-6">
          <div className="space-y-4 min-w-0">
            <SkeletonFilterBar />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">STT</th>
                      <th className="text-left px-4 py-3">Vận động viên</th>
                      <th className="text-left px-4 py-3">Giới tính</th>
                      <th className="text-left px-4 py-3">Trình hiện tại</th>
                      <th className="text-left px-4 py-3">Vai trò</th>
                      <th className="text-left px-4 py-3">SĐT</th>
                      <th className="text-left px-4 py-3">Ngày đăng ký</th>
                      <th className="text-left px-4 py-3">Thanh toán</th>
                      <th className="text-right px-4 py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonTableRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <SkeletonRightPanel />
        </div>
      </div>
    );
  }

  const isOpen = activity?.status === "open";
  const isClosed = activity?.status === "closed";
  const statusLabel = isOpen
    ? "Đang mở"
    : isClosed
      ? "Đang đóng"
      : (STATUS_LABEL[activity?.status] ?? activity?.status);

  const hasActiveFilters = Boolean(
    search || genderFilter || levelFilter || roleFilter || paymentFilter
  );

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <div
        className="flex-shrink-0 bg-gray-50 px-4 sm:px-6 pb-3 sm:pb-4 space-y-2 border-b border-gray-100"
        style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Quay lại"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              Vận động viên đăng ký
            </h1>
          </div>

          <div
            className={`flex items-center gap-2 overflow-x-auto sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0 justify-end ${HIDE_SCROLLBAR_CLASS}`}
          >
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0"
              style={{
                background: STATUS_COLORS[activity?.status]?.bg ?? "#f3f4f6",
                color: STATUS_COLORS[activity?.status]?.text ?? "#6b7280",
                borderColor: STATUS_COLORS[activity?.status]?.border ?? "#e5e7eb",
              }}
            >
              {statusLabel}
            </span>

            {!isClosed && (
              <>
                <button
                  title="Xuất danh sách"
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm flex-shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Xuất danh sách</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Thêm đăng ký</span>
                </button>

                <div className="relative flex-shrink-0">
                  <button
                    ref={publicLinkBtnRef}
                    title="Tạo link công khai"
                    onClick={() => {
                      const rect = publicLinkBtnRef.current?.getBoundingClientRect();
                      if (rect) {
                        setPublicLinkAnchor({
                          top: rect.bottom + 8,
                          left: rect.left,
                          right: window.innerWidth - rect.right,
                        });
                      }
                      setPublicLinkOpen((v) => !v);
                    }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                  >
                    <Link2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Tạo link công khai</span>
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleReload}
              disabled={reloading}
              title="Tải lại dữ liệu"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <RotateCcw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-sm">
            <span className="text-green-600 font-medium">Doanh thu:</span>
            <span className="text-green-700 font-bold tabular-nums">
              {stats.revenue.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 ${HIDE_SCROLLBAR_CLASS}`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <StatCard
            label="Tổng số đăng ký"
            value={stats.total}
            sub="vận động viên"
            iconBg="#eef2ff"
            icon="👥"
            onClick={() => openStatModal("total", "Tổng số đăng ký")}
          />
          {genderLevelStats.map((g) => (
            <StatCard
              key={g.key}
              label={g.label}
              value={g.value}
              subPercent={Number(((g.value / (stats.total || 1)) * 100).toFixed(2))}
              pillLevel={g.level}
              onClick={() => openStatModal(g.key, `Vận động viên ${g.label}`)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 sm:gap-6">
          <div className="space-y-4 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="w-full md:flex-1 md:min-w-0 transition-all duration-300 ease-out">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Tìm kiếm
                  </label>
                  <input
                    className="input-field w-full"
                    placeholder="Tên, SĐT, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="w-full md:w-[170px] md:flex-shrink-0">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Trình độ</label>
                  <CustomSelect value={levelFilter} onChange={setLevelFilter} options={LEVEL_OPTIONS} />
                </div>

                <div className="w-full md:w-[170px] md:flex-shrink-0">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vai trò</label>
                  <CustomSelect value={roleFilter} onChange={setRoleFilter} options={ROLES_OPTIONS} />
                </div>

                <div className="w-full md:w-[170px] md:flex-shrink-0">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Thanh toán</label>
                  <CustomSelect value={paymentFilter} onChange={setPaymentFilter} options={PAYMENT_OPTIONS} />
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-out md:flex-shrink-0 ${hasActiveFilters ? "w-full md:w-[140px] opacity-100" : "w-0 opacity-0"
                    }`}
                >
                  <button
                    onClick={clearFilters}
                    className="w-full h-[42px] flex items-center justify-center gap-1.5 px-3 rounded-lg border border-gray-200 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors whitespace-nowrap"
                  >
                    <FilterX className="w-4 h-4" /> Xoá bộ lọc
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-3.5 font-semibold">STT</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Vận động viên</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Loại</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Giới tính</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Trình độ</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Vai trò</th>
                      <th className="text-left px-4 py-3.5 font-semibold">SĐT</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Ngày ĐK</th>
                      <th className="text-left px-4 py-3.5 font-semibold">Thanh toán</th>
                      <th className="text-right px-4 py-3.5 font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pageItems.map((r, i) => (
                      <AnimatedTableRow
                        key={r.id}
                        removing={removingRegId === r.id}
                        onCollapsed={() => handleRowCollapsed(r.id)}
                        className="hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-gray-400 align-middle">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-start gap-2.5">
                            <img
                              src={
                                r.users?.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(r.users?.full_name ?? r.guest_full_name ?? "?")}`
                              }
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-50 mt-0.5"
                              alt=""
                            />
                            <div className="min-w-0 max-w-[180px] lg:max-w-[220px]">
                              <p className="font-medium text-gray-900 break-words leading-snug">
                                {r.users?.full_name ?? r.guest_full_name ?? "—"}
                              </p>
                              <p className="text-xs text-gray-400 break-words leading-snug">
                                {r.users?.email ?? r.guest_email ?? (r.user_id ? "" : "Khách")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.user_id
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {r.user_id ? "Thành viên" : "Khách"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 align-middle">
                          {r.role === "nam" ? "Nam" : "Nữ"}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="w-20">
                            <CustomSelect
                              value={r.level ?? ""}
                              onChange={(val) => handleLevelChange(r.id, val)}
                              options={LEVEL_SELECT_OPTIONS}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.role === "nam"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-pink-50 text-pink-600"
                              }`}
                          >
                            {r.role === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 align-middle">
                          {r.users?.phone ?? r.guest_phone ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 align-middle">
                          {r.created_at
                            ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: vi })
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {r.payment_status === "confirmed" ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-green-50 text-green-700">
                                Đã thanh toán
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                                {PAYMENT_METHOD_LABEL[r.payment_method] ?? r.payment_method}
                              </span>
                            </div>
                          ) : r.payment_status === "rejected" ? (
                            <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-red-50 text-red-600">
                              Đã từ chối
                            </span>
                          ) : (r.payment_method || !r.user_id) ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleConfirmPayment(r.id)}
                                disabled={payingAction?.id === r.id}
                                className="flex items-center justify-center gap-1.5 min-w-[92px] px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                              >
                                {payingAction && payingAction.id === r.id && payingAction.type === "confirm" ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Xác nhận"
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectPayment(r.id)}
                                disabled={payingAction?.id === r.id}
                                className="flex items-center justify-center gap-1.5 min-w-[92px] px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                              >
                                {payingAction && payingAction.id === r.id && payingAction.type === "reject" ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Từ chối"
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-600">
                                Chờ thanh toán
                              </span>
                              <button
                                onClick={() => handleRejectPayment(r.id)}
                                disabled={payingAction?.id === r.id}
                                className="flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
                              >
                                {payingAction && payingAction.id === r.id && payingAction.type === "reject" ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Từ chối"
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal(r, "view")}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal(r, "edit")}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReg(r.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </AnimatedTableRow>
                    ))}
                    {pageItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-14 text-gray-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Không có vận động viên nào phù hợp bộ lọc
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden p-3 space-y-3">
                {pageItems.map((r, i) => (
                  <CollapsibleItem
                    key={r.id}
                    removing={removingRegId === r.id}
                    onCollapsed={() => handleRowCollapsed(r.id)}
                  >
                    <div
                      key={r.id}
                      className="p-4 space-y-3 rounded-2xl border border-gray-100 shadow-md bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <img
                            src={
                              r.users?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(r.users?.full_name ?? r.guest_full_name ?? "?")}`
                            }
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-50 mt-0.5"
                            alt=""
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words leading-snug">
                              {r.users?.full_name ?? r.guest_full_name ?? "—"}
                            </p>
                            <p className="text-xs text-gray-400 break-words leading-snug">
                              {r.users?.email ?? r.guest_email ?? (r.user_id ? "" : "Khách")}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-300 flex-shrink-0">
                          #{(page - 1) * PAGE_SIZE + i + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                        <div>
                          <p className="text-gray-400 mb-0.5">Loại</p>
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${r.user_id
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {r.user_id ? "Thành viên" : "Khách"}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Giới tính</p>
                          <p className="text-gray-700 font-medium">
                            {r.role === "nam" ? "Nam" : "Nữ"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Vai trò</p>
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${r.role === "nam"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-pink-50 text-pink-600"
                              }`}
                          >
                            {r.role === "nam" ? "VĐV Nam" : "VĐV Nữ"}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Trình độ</p>
                          <CustomSelect
                            value={r.level ?? ""}
                            onChange={(val) => handleLevelChange(r.id, val)}
                            options={LEVEL_SELECT_OPTIONS}
                          />
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">SĐT</p>
                          <p className="text-gray-700">{r.users?.phone ?? r.guest_phone ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Ngày ĐK</p>
                          <p className="text-gray-700">
                            {r.created_at
                              ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: vi })
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Thanh toán</p>
                          {r.payment_status === "confirmed" ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700">
                                Đã thanh toán
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                {PAYMENT_METHOD_LABEL[r.payment_method] ?? r.payment_method}
                              </span>
                            </div>
                          ) : r.payment_method ? (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                              Chờ admin xác nhận
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                              Chờ thanh toán
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.payment_status !== "confirmed" &&
                            r.payment_status !== "rejected" &&
                            (r.payment_method || !r.user_id) && (
                              <>
                                <button
                                  onClick={() => handleConfirmPayment(r.id)}
                                  disabled={payingAction?.id === r.id}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                                >
                                  {payingAction && payingAction.id === r.id && payingAction.type === "confirm" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    "Xác nhận"
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectPayment(r.id)}
                                  disabled={payingAction?.id === r.id}
                                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                                >
                                  {payingAction && payingAction.id === r.id && payingAction.type === "reject" ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    "Từ chối"
                                  )}
                                </button>
                              </>
                            )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openModal(r, "view")}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(r, "edit")}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReg(r.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleItem>
                ))}
                {pageItems.length === 0 && (
                  <div className="text-center py-14 text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Không có vận động viên nào phù hợp bộ lọc
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 sm:py-3.5 border-t border-gray-100 text-xs sm:text-sm text-gray-500">
                <span>
                  Hiển thị {(page - 1) * PAGE_SIZE + 1} -{" "}
                  {Math.min(page * PAGE_SIZE, filtered.length)} trong tổng số{" "}
                  {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 4) }, (_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {totalPages > 4 && (
                    <span className="px-1 text-gray-400">…</span>
                  )}
                  {totalPages > 4 && (
                    <button
                      onClick={() => setPage(totalPages)}
                      className="w-8 h-8 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {totalPages}
                    </button>
                  )}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900">Chia đội theo trình độ</h3>
              </div>

              {teams.length > 0 && !showDrawForm ? (
                <FadeSwitch transitionKey="summary">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    Đã chia xong{" "}
                    <span className="font-semibold text-gray-800">{teams.length} đội</span>
                    {unassigned.length > 0 && (
                      <>
                        {" "}
                        — còn{" "}
                        <span className="font-semibold text-amber-600">
                          {unassigned.length}
                        </span>{" "}
                        người chưa xếp đội
                      </>
                    )}
                    .
                  </p>
                  <button
                    onClick={() => setShowDrawForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Chia lại
                  </button>
                </FadeSwitch>
              ) : (
                <FadeSwitch transitionKey="form">
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Hệ thống sẽ tự động chia các vận động viên thành các đội cân bằng
                    theo trình độ đã chọn.
                  </p>

                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Thành phần chia đội
                  </label>
                  {compositionSlots.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {compositionSlots.map((slot, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-full"
                          style={levelPillStyle(slot.level)}
                        >
                          {slot.label ?? (slot.role === "nu" ? `Nữ ${slot.level}` : `Nam ${slot.level}`)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 mb-1.5">
                      ⚠️ Giải đấu chưa cấu hình thành phần đội. Vui lòng chỉnh sửa giải đấu để thêm thành phần trước khi chia đội.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Nội dung chia đội (Nam / Nữ / Mix) được hệ thống tự động xác định dựa trên thành phần đội đã cấu hình ở trên.
                  </p>

                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    Số lượng đội
                  </label>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="number"
                      min={1}
                      className="input-field"
                      value={teamCount}
                      onChange={(e) => {
                        setTeamCount(e.target.value);
                        setTeamCountTouched(true);
                      }}
                    />
                    <span className="text-sm text-gray-500 flex-shrink-0">đội</span>
                  </div>
                  {activity?.detail?.max_teams != null && (
                    <p className="text-xs text-gray-400 -mt-3 mb-4">
                      Mặc định lấy theo "Số lượng đội tham gia" đã cấu hình ở giải đấu ({activity.detail.max_teams} đội). Bạn có thể sửa lại nếu cần.
                    </p>
                  )}

                  <button
                    disabled={drawing || compositionSlots.length === 0}
                    onClick={() => setShowDrawConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold shadow-sm shadow-blue-200 disabled:opacity-50 transition-colors"
                  >
                    {compositionSlots.length === 0
                      ? "Chưa có thành phần đội"
                      : drawing
                        ? "Đang chia..."
                        : "Chia đội theo trình độ"}
                  </button>

                  {teams.length > 0 && (
                    <button
                      onClick={() => setShowDrawForm(false)}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Huỷ, quay lại
                    </button>
                  )}
                </FadeSwitch>
              )}

              <button
                onClick={() => setShowTeamsModal(true)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <Users className="w-4 h-4" /> Xem team
                {teams.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal">({teams.length} đội)</span>
                )}
              </button>

              {teams.length > 0 && (
                <button
                  onClick={() => {
                    if (tournamentStarted) {
                      setWizardStack(["schedule"]);
                    } else {
                      setShowStartTournamentModal(true);
                    }
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors"
                >
                  <Trophy className="w-4 h-4" /> {tournamentStarted ? "Tiếp tục giải đấu" : "Bắt đầu giải đấu"}
                </button>
              )}
            </div>

            <LevelDonutCard stats={stats} />

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 leading-relaxed">
              💡 Lưu ý: Hệ thống sẽ ưu tiên cân bằng số lượng và trình độ giữa các
              đội.
            </div>
          </div>
        </div>
      </div>

      {
        modalReg && createPortal(
          <RegistrationDetailModal
            reg={modalReg}
            mode={modalMode}
            editLevel={editLevel}
            editRole={editRole}
            editNotes={editNotes}
            onEditLevel={setEditLevel}
            onEditRole={setEditRole}
            onEditNotes={setEditNotes}
            onClose={closeModal}
            onSave={handleSaveEdit}
            onConfirmPayment={handleConfirmPayment}
          />,
          document.body
        )
      }

      {
        publicLinkOpen && createPortal(
          <PublicLinkPopover
            publicLink={publicLink}
            linkCopied={linkCopied}
            anchor={publicLinkAnchor}
            onCopy={handleCopyPublicLink}
            onClose={() => setPublicLinkOpen(false)}
          />,
          document.body
        )
      }

      {
        showAddModal && createPortal(
          <AdminAddTournamentRegistrationModal
            activityId={id!}
            onClose={() => setShowAddModal(false)}
            onAdded={() => load(true)}
          />,
          document.body
        )
      }

      {
        showTeamsModal && createPortal(
          <TeamsModal
            teams={teams}
            unassigned={unassigned}
            loading={loadingTeams}
            clearing={clearingTeams}
            exporting={exportingTeams}
            drawing={drawing}
            composition={compositionSlots}
            onClose={() => setShowTeamsModal(false)}
            onClear={handleClearTeams}
            onExport={handleExportTeamsExcel}
            onDrawTeams={() => setShowDrawConfirm(true)}
          />,
          document.body
        )
      }

      {
        statModal && createPortal(
          <StatMembersModal
            title={statModal.title}
            items={statModal.items}
            onClose={() => setStatModal(null)}
          />,
          document.body
        )
      }

      {deleteRegModal && (
        <ConfirmDeleteRegistrationModal
          isInTeam={deleteRegModal.isInTeam}
          onConfirm={confirmDeleteReg}
          onCancel={() => setDeleteRegModal(null)}
        />
      )}

      {confirmMethodModal && createPortal(
        <ConfirmGuestPaymentMethodModal
          submitting={payingAction?.id === confirmMethodModal.id}
          onSelect={(method) => handleConfirmPayment(confirmMethodModal.id, method)}
          onClose={() => setConfirmMethodModal(null)}
        />,
        document.body
      )}


      {showDrawConfirm && createPortal(
        <ConfirmDrawTeamsModal
          unpaidCount={unpaidEligibleCount}
          drawing={drawing}
          onConfirm={async () => {
            setShowDrawConfirm(false);
            await handleDrawTeams();
          }}
          onCancel={() => setShowDrawConfirm(false)}
        />,
        document.body
      )}

      {drawing && createPortal(<DrawingTeamsOverlay />, document.body)}


      {showStartTournamentModal && createPortal(
        <StartTournamentModal
          onClose={() => setShowStartTournamentModal(false)}
          onSelectRoundRobin={() => {
            setShowStartTournamentModal(false);
            setWizardStack(["round_robin_setup"]);
          }}
        />,
        document.body
      )}

      {tournamentWizardStep === "round_robin_setup" && createPortal(
        <RoundRobinSetupScreen
          activity={activity}
          teamsCount={teams.length}
          matchContents={activity?.detail?.rules?.match_contents ?? []}
          saving={savingFormat}
          mode={isEditingTournamentInfo ? "edit" : "create"}
          onBack={popWizardStep}
          onCreateSchedule={handleCreateRoundRobinSchedule}
        />,
        document.body
      )}

      {tournamentWizardStep === "team_list" && createPortal(
        <TeamListRenameScreen
          teams={teams}
          onBack={popWizardStep}
          onRenameTeam={handleRenameTournamentTeam}
          onContinue={scheduleGenerated ? handleBackToSchedule : handleGenerateSchedule}
          continuing={generatingSchedule}
          mode={scheduleGenerated ? "edit" : "create"}
        />,
        document.body
      )}

      {tournamentWizardStep === "schedule" && createPortal(
        <ScheduleScreen
          activityId={id!}
          onBack={popWizardStep}
          onEditInfo={() => pushWizardStep("round_robin_setup")}
          tournamentStarted={tournamentStarted}
          confirming={confirmingSchedule}
          onConfirmSchedule={() => handleConfirmSchedule(false)}
        />,
        document.body
      )}

      {confirmScheduleWarning && createPortal(
        <ConfirmScheduleWarningModal
          unscheduledCount={confirmScheduleWarning.unscheduled}
          totalCount={confirmScheduleWarning.total}
          confirming={confirmingSchedule}
          onCancel={() => setConfirmScheduleWarning(null)}
          onStillSave={() => handleConfirmSchedule(true)}
        />,
        document.body
      )}
    </div>
  );
}

const MONTHS_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function PickerFade({ children, pickerKey }: { children: React.ReactNode; pickerKey: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [pickerKey]);
  return (
    <div
      className={`transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
        }`}
    >
      {children}
    </div>
  );
}

function CustomDatePicker({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const base = (selected ?? new Date()).getFullYear();
    return base - 5;
  });

  const today = startOfDay(new Date());
  const selectedYear = selected?.getFullYear();
  const selectedMonthIdx = selected?.getMonth();
  const todayYear = today.getFullYear();
  const todayMonthIdx = today.getMonth();

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const viewYear = viewMonth.getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => yearRangeStart + i);

  const openMonths = () => {
    setYearRangeStart(viewYear - 5);
    setMode("months");
  };
  const openYears = () => {
    setYearRangeStart(viewYear - 5);
    setMode("years");
  };

  const goPrev = () => {
    if (mode === "days") setViewMonth((m) => subMonths(m, 1));
    else if (mode === "years") setYearRangeStart((s) => s - 12);
  };
  const goNext = () => {
    if (mode === "days") setViewMonth((m) => addMonths(m, 1));
    else if (mode === "years") setYearRangeStart((s) => s + 12);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ${mode === "months" ? "invisible" : ""
            }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {mode === "days" && (
          <button
            type="button"
            onClick={openMonths}
            className="text-sm font-semibold text-gray-900 capitalize px-2 py-1 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
          >
            {format(viewMonth, "MMMM yyyy", { locale: vi })}
          </button>
        )}
        {mode === "months" && (
          <button
            type="button"
            onClick={openYears}
            className="text-sm font-semibold text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
          >
            {viewYear}
          </button>
        )}
        {mode === "years" && (
          <p className="text-sm font-semibold text-gray-900">
            {years[0]} - {years[years.length - 1]}
          </p>
        )}

        <button
          type="button"
          onClick={goNext}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors ${mode === "months" ? "invisible" : ""
            }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {mode === "days" && (
        <PickerFade pickerKey={`days-${format(viewMonth, "yyyy-MM")}`}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS_VI.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold text-gray-400 py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const inMonth = isSameMonth(d, viewMonth);
              const isSelected = selected && isSameDay(d, selected);
              const isTodayDay = isSameDay(d, today);
              const isPast = isBefore(d, today) && !isTodayDay;
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => onSelect(d)}
                  className={`h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center
                      ${!inMonth || isPast ? "text-gray-300" : "text-gray-700"}
                      ${isSelected ? "bg-blue-600 text-white hover:bg-blue-600" : "hover:bg-gray-100"}
                      ${isTodayDay && !isSelected ? "border border-blue-300 text-blue-600 font-semibold" : ""}
                    `}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </PickerFade>
      )}

      {mode === "months" && (
        <PickerFade pickerKey={`months-${viewYear}`}>
          <div className="grid grid-cols-3 gap-2">
            {MONTHS_VI.map((label, idx) => {
              const isSelectedMonth = selectedYear === viewYear && selectedMonthIdx === idx;
              const isTodayMonth = todayYear === viewYear && todayMonthIdx === idx;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => {
                    setViewMonth(new Date(viewYear, idx, 1));
                    setMode("days");
                  }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isSelectedMonth ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}
                      ${isTodayMonth && !isSelectedMonth ? "border border-blue-300 text-blue-600 font-semibold" : ""}
                    `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PickerFade>
      )}

      {mode === "years" && (
        <PickerFade pickerKey={`years-${yearRangeStart}`}>
          <div className="grid grid-cols-3 gap-2">
            {years.map((y) => {
              const isSelectedYear = y === selectedYear;
              const isTodayYear = y === todayYear;
              return (
                <button
                  type="button"
                  key={y}
                  onClick={() => {
                    setViewMonth(new Date(y, viewMonth.getMonth(), 1));
                    setMode("months");
                  }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${isSelectedYear ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}
                      ${isTodayYear && !isSelectedYear ? "border border-blue-300 text-blue-600 font-semibold" : ""}
                    `}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </PickerFade>
      )}
    </div>
  );
}

function EditMatchModal({
  initialValue,
  initialCourt,
  onClose,
  onSave,
}: {
  initialValue?: string | null;
  initialCourt?: number | null;
  onClose: () => void;
  onSave: (value: string, courtNumber: number | null) => Promise<void>;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  const initialDate = initialValue ? new Date(initialValue) : null;

  const [selectedDay, setSelectedDay] = useState<Date | null>(initialDate);
  const [hour, setHour] = useState<string>(initialDate ? String(initialDate.getHours()) : "18");
  const [minute, setMinute] = useState<string>(initialDate ? String(initialDate.getMinutes()) : "0");
  const [courtNumber, setCourtNumber] = useState<string>(
    initialCourt != null ? String(initialCourt) : "",
  );
  const [saving, setSaving] = useState(false);

  const handleQuickPick = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDay(d);
  };

  const handleSave = async () => {
    if (!selectedDay) {
      toast.error("Vui lòng chọn ngày thi đấu");
      return;
    }
    const result = new Date(selectedDay);
    result.setHours(Number(hour), Number(minute), 0, 0);

    const trimmed = courtNumber.trim();
    let court: number | null = null;
    if (trimmed) {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1) {
        toast.error("Số sân không hợp lệ");
        return;
      }
      court = parsed;
    }

    setSaving(true);
    try {
      await onSave(result.toISOString(), court);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Sửa trận đấu</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Số sân thi đấu
            </label>
            <input
              type="number"
              min={1}
              className="input-field"
              placeholder="Ví dụ: 1"
              value={courtNumber}
              onChange={(e) => setCourtNumber(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickPick(0)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick(1)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ngày mai
            </button>
          </div>

          <CustomDatePicker selected={selectedDay} onSelect={setSelectedDay} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Giờ thi đấu
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomSelect value={hour} onChange={setHour} options={HOUR_OPTIONS} />
              </div>
              <span className="text-gray-400 font-semibold">:</span>
              <div className="flex-1">
                <CustomSelect value={minute} onChange={setMinute} options={MINUTE_OPTIONS} />
              </div>
            </div>
          </div>

          {selectedDay && (
            <p className="text-xs text-gray-400 text-center">
              Đã chọn:{" "}
              <span className="font-semibold text-gray-700">
                {format(selectedDay, "EEEE, dd/MM/yyyy", { locale: vi })} lúc{" "}
                {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedDay}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}


function SetScheduleModal({
  title,
  initialValue,
  onClose,
  onSave,
}: {
  title: string;
  initialValue?: string | null;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  const initialDate = initialValue ? new Date(initialValue) : null;

  const [selectedDay, setSelectedDay] = useState<Date | null>(initialDate);
  const [hour, setHour] = useState<string>(initialDate ? String(initialDate.getHours()) : "18");
  const [minute, setMinute] = useState<string>(initialDate ? String(initialDate.getMinutes()) : "0");
  const [saving, setSaving] = useState(false);

  const handleQuickPick = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDay(d);
  };

  const handleSave = async () => {
    if (!selectedDay) {
      toast.error("Vui lòng chọn ngày thi đấu");
      return;
    }
    const result = new Date(selectedDay);
    result.setHours(Number(hour), Number(minute), 0, 0);
    setSaving(true);
    try {
      await onSave(result.toISOString());
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickPick(0)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleQuickPick(1)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Ngày mai
            </button>
          </div>

          <CustomDatePicker selected={selectedDay} onSelect={setSelectedDay} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Giờ thi đấu
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomSelect value={hour} onChange={setHour} options={HOUR_OPTIONS} />
              </div>
              <span className="text-gray-400 font-semibold">:</span>
              <div className="flex-1">
                <CustomSelect value={minute} onChange={setMinute} options={MINUTE_OPTIONS} />
              </div>
            </div>
          </div>

          {selectedDay && (
            <p className="text-xs text-gray-400 text-center">
              Đã chọn:{" "}
              <span className="font-semibold text-gray-700">
                {format(selectedDay, "EEEE, dd/MM/yyyy", { locale: vi })} lúc{" "}
                {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedDay}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu giờ thi đấu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmGuestPaymentMethodModal({
  submitting,
  onSelect,
  onClose,
}: {
  submitting: boolean;
  onSelect: (method: "transfer" | "cash") => void;
  onClose: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  return (
    <div
      className={`fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Chọn phương thức thanh toán</h3>
          <p className="text-xs text-gray-400 mt-1">Khách đã thanh toán bằng hình thức nào?</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <button
            disabled={submitting}
            onClick={() => onSelect("transfer")}
            className="px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-700 disabled:opacity-50 transition-colors"
          >
            Chuyển khoản
          </button>
          <button
            disabled={submitting}
            onClick={() => onSelect("cash")}
            className="px-4 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 text-sm font-semibold text-gray-700 disabled:opacity-50 transition-colors"
          >
            Tiền mặt
          </button>
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteRegistrationModal({
  isInTeam,
  onConfirm,
  onCancel,
}: {
  isInTeam: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleCancel = () => {
    setVisible(false);
    setTimeout(onCancel, 200);
  };

  const handleConfirm = () => {
    setVisible(false);
    setTimeout(onConfirm, 200);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-opacity"
      style={{
        background: "rgba(0,0,0,0.5)",
        opacity: visible ? 1 : 0,
        transitionDuration: "200ms",
      }}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className="w-full max-w-xs bg-white rounded-2xl overflow-hidden transition-transform"
        style={{
          transform: visible ? "scale(1)" : "scale(0.92)",
          transitionDuration: "200ms",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isInTeam ? "bg-amber-50" : "bg-red-50"
              }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${isInTeam ? "text-amber-500" : "text-red-500"}`}
            />
          </div>
          <p className="text-sm font-bold text-gray-900">
            {isInTeam ? "VĐV đã được xếp vào đội" : "Xoá đăng ký này?"}
          </p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            {isInTeam
              ? "Xoá đăng ký sẽ xoá TOÀN BỘ kết quả chia đội hiện tại của giải đấu. Bạn sẽ cần chia lại đội từ đầu."
              : "Hành động này không thể hoàn tác."}
          </p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            Huỷ
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${isInTeam
              ? "text-amber-600 hover:bg-amber-50"
              : "text-red-500 hover:bg-red-50"
              }`}
          >
            {isInTeam ? "Xoá & chia lại" : "Xoá đăng ký"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmScheduleWarningModal({
  unscheduledCount,
  totalCount,
  confirming,
  onCancel,
  onStillSave,
}: {
  unscheduledCount: number;
  totalCount: number;
  confirming: boolean;
  onCancel: () => void;
  onStillSave: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onCancel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}
      >
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-gray-900">Còn lượt chưa đặt giờ</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Có <span className="font-semibold text-amber-600">{unscheduledCount}/{totalCount}</span> trận
            đấu chưa được đặt giờ thi đấu. Bạn vẫn có thể đặt giờ cho các trận này sau khi giải đấu đã bắt đầu.
          </p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={confirming}
            className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onStillSave}
            disabled={confirming}
            className="flex-1 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {confirming ? "Đang lưu..." : "Vẫn lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ConfirmDrawTeamsModal({
  unpaidCount,
  drawing,
  onConfirm,
  onCancel,
}: {
  unpaidCount: number;
  drawing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onCancel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-sm transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex flex-col items-center text-center px-5 pt-6 pb-5">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-gray-900">Xác nhận chia đội</p>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            {unpaidCount > 0 ? (
              <>
                Có <span className="font-semibold text-amber-600">{unpaidCount}</span> vận
                động viên <span className="font-semibold">chưa thanh toán</span> — những người
                này sẽ <span className="font-semibold">không được đưa vào chia đội</span> lần
                này. Bạn có muốn tiếp tục?
              </>
            ) : (
              "Tất cả vận động viên đủ điều kiện đều đã thanh toán. Tiếp tục chia đội?"
            )}
          </p>
        </div>
        <div className="flex border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={drawing}
            className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-100 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={drawing}
            className="flex-1 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            Tiếp tục chia đội
          </button>
        </div>
      </div>
    </div>
  );
}

function StartTournamentModal({
  onClose,
  onSelectRoundRobin,
}: {
  onClose: () => void;
  onSelectRoundRobin: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  return (
    <div
      className={`fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Chọn thể thức thi đấu</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-3">
          <button
            onClick={() => onSelectRoundRobin()}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <p className="font-semibold text-gray-900">Vòng tròn</p>
            <p className="text-xs text-gray-400 mt-1">
              Các đội lần lượt gặp nhau, mỗi đội thi đấu với tất cả các đội còn lại.
            </p>
          </button>
          <div className="w-full text-left p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed relative">
            <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Sắp ra mắt
            </span>
            <p className="font-semibold text-gray-500">Chia bảng</p>
            <p className="text-xs text-gray-400 mt-1">
              Chia các đội thành nhiều bảng đấu vòng tròn nhỏ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-checked={checked}
      role="checkbox"
      className={`relative w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
          transition-all duration-200 ease-out active:scale-75
          ${checked
          ? "bg-blue-600 border-blue-600 scale-100"
          : "bg-white border-gray-300 hover:border-blue-400 scale-100"
        }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`w-3.5 h-3.5 transition-all duration-200 ease-out ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
      >
        <path
          d="M5 13l4 4L19 7"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={20}
          strokeDashoffset={checked ? 0 : 20}
          style={{ transition: "stroke-dashoffset 0.25s ease-out 0.05s" }}
        />
      </svg>
    </button>
  );
}

function AnimatedCourtsCount({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [pulsing, setPulsing] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 280);
    setDisplayValue(value);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl font-bold text-emerald-700 shadow-sm flex-shrink-0 transition-transform duration-200 ease-out ${pulsing ? "scale-125" : "scale-100"
        }`}
    >
      {displayValue}
    </div>
  );
}

function RoundRobinSetupScreen({
  activity,
  teamsCount,
  matchContents,
  saving,
  mode,
  onBack,
  onCreateSchedule,
}: {
  activity: any;
  teamsCount: number;
  matchContents: { id?: string; label: string }[];
  saving: boolean;
  mode: "create" | "edit";
  onBack: () => void;
  onCreateSchedule: (matchContents: { id: string; label: string }[]) => void;
}) {
  const courtsCount = matchContents.length;

  const [items, setItems] = useState<{ id: string; label: string; checked: boolean }[]>(() =>
    matchContents.map((c) => ({ id: c.id ?? genId(), label: c.label, checked: true })),
  );

  const activeCount = items.filter((it) => it.checked).length;

  const toggleChecked = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: genId(), label: MATCH_CONTENT_OPTIONS[0].value, checked: true },
    ]);
  };

  const updateItem = (id: string, label: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, label } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSubmit = () => {
    const kept = items.filter((it) => it.checked).map(({ id, label }) => ({ id, label }));
    onCreateSchedule(kept);
  };

  return (
    <div className="fixed inset-0 z-[220] bg-white flex flex-col">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 pb-4 border-b border-gray-100"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top) + 1rem), 1.5rem)" }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Thiết lập vòng tròn</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cấu hình lịch thi đấu trước khi tạo</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 max-w-xl mx-auto w-full">
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tên giải đấu</span>
            <span className="font-semibold text-gray-900 text-right truncate max-w-[60%]">
              {activity?.title}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Số đội tham dự</span>
            <span className="font-semibold text-gray-900">{teamsCount} đội</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">Số sân thi đấu</p>
            <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">
              Tự động tính theo số nội dung thi đấu đang được chọn bên dưới
            </p>
          </div>
          <AnimatedCourtsCount value={activeCount} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nội dung thi đấu
          </label>
          <p className="text-xs text-gray-400 mb-2 leading-relaxed">
            Nội dung đang tick là đang áp dụng. Bỏ tick để đánh dấu xoá — thay đổi chỉ có hiệu lực khi bạn bấm {mode === "edit" ? "Lưu" : "Tạo lịch thi đấu"}.
          </p>

          {items.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed mb-2">
              ⚠️ Chưa có nội dung thi đấu nào. Vui lòng thêm ít nhất 1 nội dung trước khi tiếp tục.
            </p>
          )}

          <div className="space-y-2">
            {items.map((item) => {
              const color = MATCH_CONTENT_COLOR[item.label] ?? "#1c3d5a";
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ease-out ${item.checked
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50/70"
                    }`}
                >
                  <AnimatedCheckbox
                    checked={item.checked}
                    onChange={() => toggleChecked(item.id)}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold transition-all duration-300 ease-out"
                    style={{
                      background: color,
                      opacity: item.checked ? 1 : 0.45,
                      transform: item.checked ? "scale(1)" : "scale(0.92)",
                    }}
                  >
                    {item.label.slice(0, 1)}
                  </div>
                  <div
                    className={`flex-1 min-w-0 transition-all duration-300 ease-out ${item.checked ? "opacity-100" : "opacity-45"
                      }`}
                    style={{ textDecoration: item.checked ? "none" : "line-through" }}
                  >
                    <CustomSelect
                      value={item.label}
                      onChange={(v) => updateItem(item.id, v)}
                      options={MATCH_CONTENT_OPTIONS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"
                    title="Xoá hẳn khỏi danh sách"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400"
          >
            <Plus className="w-4 h-4" /> Thêm nội dung
          </button>
        </div>
      </div>

      <div
        className="flex-shrink-0 px-4 sm:px-6 pt-4 border-t border-gray-100 max-w-xl mx-auto w-full"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <button
          onClick={handleSubmit}
          disabled={saving || activeCount < 1}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-sm font-semibold shadow-sm shadow-blue-200 disabled:opacity-50 transition-colors"
        >
          {mode === "edit"
            ? (saving ? "Đang lưu..." : "Lưu")
            : (saving ? "Đang tạo lịch..." : "Tạo lịch thi đấu")}
        </button>
      </div>
    </div>
  );
}

function TeamListRenameScreen({
  teams,
  onBack,
  onRenameTeam,
  onContinue,
  continuing,
  mode = "create",
}: {
  teams: any[];
  onBack: () => void;
  onRenameTeam: (teamId: string, name: string) => Promise<void>;
  onContinue: () => void;
  continuing: boolean;
  mode?: "create" | "edit";
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (team: any) => {
    setEditingId(team.id);
    setEditValue(team.name);
  };

  const saveEdit = async (teamId: string) => {
    if (!editValue.trim()) {
      toast.error("Tên đội không được để trống");
      return;
    }
    setSavingId(teamId);
    try {
      await onRenameTeam(teamId, editValue.trim());
      setEditingId(null);
    } catch {
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] bg-white flex flex-col">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 pb-4 border-b border-gray-100"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top) + 1rem), 1.5rem)" }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Danh sách đội</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-xl mx-auto w-full space-y-2.5">
        <p className="text-xs text-gray-400 mb-2">
          Bạn có thể đổi tên các đội trước khi tạo lịch thi đấu chính thức.
        </p>
        {teams.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 bg-white shadow-sm"
          >
            {editingId === t.id ? (
              <>
                <input
                  autoFocus
                  className="input-field flex-1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(t.id)}
                />
                <button
                  onClick={() => saveEdit(t.id)}
                  disabled={savingId === t.id}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingId === t.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold text-gray-900">{t.name}</span>
                <span className="text-xs text-gray-400">{t.members?.length ?? 0} người</span>
                <button
                  onClick={() => startEdit(t)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div
        className="flex-shrink-0 px-4 sm:px-6 pt-4 border-t border-gray-100 max-w-xl mx-auto w-full"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <button
          onClick={onContinue}
          disabled={continuing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {mode === "edit"
            ? (continuing ? "Đang lưu..." : "Lưu")
            : (continuing ? "Đang chuyển trang..." : "Tiếp tục")}
        </button>
      </div>
    </div>
  );
}


function ScheduleScreen({
  activityId,
  onBack,
  onEditInfo,
  tournamentStarted,
  confirming,
  onConfirmSchedule,
}: {
  activityId: string;
  onBack: () => void;
  onEditInfo: () => void;
  tournamentStarted: boolean;
  confirming: boolean;
  onConfirmSchedule: () => void;
}) {
  const [tab, setTab] = useState<"all" | "pending">("all");
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState<
    | { type: "round"; roundNumber: number; currentValue?: string | null }
    | { type: "match"; matchId: string; currentValue?: string | null; currentCourt?: number | null }
    | null
  >(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await eventsAdminApi.getTournamentSchedule(activityId);
      setRounds(data.rounds ?? []);
    } catch {
      toast.error("Không tải được lịch thi đấu");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activityId]);

  const displayRounds =
    tab === "all"
      ? rounds
      : rounds
        .map((r) => ({ ...r, matches: r.matches.filter((m: any) => m.status !== "completed") }))
        .filter((r) => r.matches.length > 0);

  const handleSaveRoundSchedule = async (roundNumber: number, value: string) => {
    try {
      await eventsAdminApi.setRoundSchedule(activityId, roundNumber, value);
      toast.success(`Đã đặt giờ cho lượt ${roundNumber}`);
      load(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Đặt giờ thất bại");
    }
  };

  const handleSaveMatchSchedule = async (matchId: string, value: string, courtNumber: number | null) => {
    try {
      await eventsAdminApi.setMatchSchedule(matchId, value, courtNumber);
      toast.success("Đã cập nhật thông tin trận đấu");
      load(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Cập nhật thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-[220] bg-white flex flex-col">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 sm:px-6 pb-3 border-b border-gray-100"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top) + 1rem), 1.5rem)" }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Lịch thi đấu</h2>
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 px-4 sm:px-6 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onEditInfo}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Sửa thông tin giải đấu
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" /> Sửa danh sách đội
          </button>
        </div>

        <div className="flex justify-end">
          {tournamentStarted ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Trophy className="w-3.5 h-3.5" /> Đã bắt đầu thi đấu
            </span>
          ) : (
            <button
              onClick={onConfirmSchedule}
              disabled={confirming}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-sm shadow-emerald-200 disabled:opacity-50 transition-colors"
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Xác nhận lịch thi đấu
            </button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-6 pt-3">
        <div className="max-w-6xl mx-auto w-full">
          <div className="relative flex rounded-lg border border-gray-200 overflow-hidden text-sm bg-gray-50 p-0.5 max-w-md sm:mx-auto">
            <div
              className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md bg-blue-600 shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: tab === "all" ? "translateX(0%)" : "translateX(calc(100% + 4px))" }}
            />
            <button
              onClick={() => setTab("all")}
              className={`relative z-10 flex-1 py-2 font-medium rounded-md transition-colors ${tab === "all" ? "text-white" : "text-gray-600"
                }`}
            >
              Tất cả các lượt
            </button>
            <button
              onClick={() => setTab("pending")}
              className={`relative z-10 flex-1 py-2 font-medium rounded-md transition-colors ${tab === "pending" ? "text-white" : "text-gray-600"
                }`}
            >
              Chưa đấu
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
          </div>
        ) : displayRounds.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-14">
            {tab === "pending" ? "Không còn lượt nào chưa đấu" : "Chưa có lịch thi đấu"}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {displayRounds.map((r) => {
              const roundHasSchedule = r.matches.some((m: any) => m.scheduled_at);
              return (
                <div
                  key={r.round_number}
                  className="bg-gray-50/60 border border-gray-100 rounded-2xl p-3 sm:p-4 h-fit"
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm flex-shrink-0">
                        Lượt {r.round_number}
                      </h3>
                      {r.bye_team_name && (
                        <span className="text-xs text-gray-400 truncate">
                          Nghỉ: <span className="font-medium text-gray-600">{r.bye_team_name}</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setScheduleModal({
                          type: "round",
                          roundNumber: r.round_number,
                          currentValue: r.matches.find((m: any) => m.scheduled_at)?.scheduled_at ?? null,
                        })
                      }
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      🕒 {roundHasSchedule ? "Đặt lại cả lượt" : "Đặt giờ cả lượt"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {r.matches.map((m: any) => (
                      <div key={m.id} className="px-4 py-3 rounded-xl border border-gray-100 bg-white shadow-sm space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1 pt-1">
                            <span className="font-medium text-gray-900 truncate">{m.team1?.name}</span>
                            <span className="text-gray-300 flex-shrink-0">vs</span>
                            <span className="font-medium text-gray-900 truncate">{m.team2?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {m.court_number && (
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                                Sân {m.court_number}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${m.status === "completed" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                              {m.status === "completed" ? `${m.team1_score}-${m.team2_score}` : "Chưa đấu"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            🕒{" "}
                            {m.scheduled_at ? (
                              <span className="font-medium text-gray-700">
                                {format(new Date(m.scheduled_at), "HH:mm, dd/MM/yyyy", { locale: vi })}
                              </span>
                            ) : (
                              <span className="italic text-gray-400">Chưa đặt giờ</span>
                            )}
                          </div>
                          <button
                            onClick={() => setScheduleModal({ type: "match", matchId: m.id, currentValue: m.scheduled_at, currentCourt: m.court_number })}
                            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
                          >
                            <Pencil className="w-3 h-3" /> Sửa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scheduleModal?.type === "round" &&
        createPortal(
          <SetScheduleModal
            key={`round-${scheduleModal.roundNumber}`}
            title={`Đặt giờ cho Lượt ${scheduleModal.roundNumber}`}
            initialValue={scheduleModal.currentValue}
            onClose={() => setScheduleModal(null)}
            onSave={(value) => handleSaveRoundSchedule(scheduleModal.roundNumber, value)}
          />,
          document.body,
        )}

      {scheduleModal?.type === "match" &&
        createPortal(
          <EditMatchModal
            key={`match-${scheduleModal.matchId}`}
            initialValue={scheduleModal.currentValue}
            initialCourt={scheduleModal.currentCourt}
            onClose={() => setScheduleModal(null)}
            onSave={(value, court) => handleSaveMatchSchedule(scheduleModal.matchId, value, court)}
          />,
          document.body,
        )}
    </div>
  );
}


function StatMembersModal({
  title,
  items,
  onClose,
}: {
  title: string;
  items: any[];
  onClose: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${visible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">
            {title} <span className="text-gray-400 font-normal">({items.length})</span>
          </h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-gray-50">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Không có vận động viên nào
            </p>
          ) : (
            items.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <img
                  src={
                    r.users?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      r.users?.full_name ?? r.guest_full_name ?? "?"
                    )}`
                  }
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-50"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {r.users?.full_name ?? r.guest_full_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.users?.phone ?? r.guest_phone ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.role === "nam"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-pink-50 text-pink-600"
                      }`}
                  >
                    {r.role === "nam" ? "Nam" : "Nữ"}
                  </span>
                  <span
                    className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                    style={levelPillStyle(r.level)}
                  >
                    {r.level ?? "—"}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.payment_status === "confirmed"
                      ? "bg-green-50 text-green-700"
                      : "bg-amber-50 text-amber-600"
                      }`}
                  >
                    {r.payment_status === "confirmed" ? "Đã TT" : "Chưa TT"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end px-4 sm:px-5 py-3 sm:py-3.5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawingTeamsOverlay() {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
        <p className="text-white font-semibold text-sm tracking-wide animate-pulse">
          Đang chia đội...
        </p>
      </div>
    </div>
  );
}

function PublicLinkPopover({
  publicLink,
  linkCopied,
  anchor,
  onCopy,
  onClose,
}: {
  publicLink: string;
  linkCopied: boolean;
  anchor: { top: number; left: number; right: number } | null;
  onCopy: () => void;
  onClose: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[200]"
        onMouseDown={handleClose}
      />
      <div
        className={`fixed z-[201] w-[calc(100vw-2rem)] max-w-80 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 transition-all duration-200 ease-out ${visible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 -translate-y-1"
          }`}
        style={
          anchor
            ? { top: anchor.top, right: anchor.right }
            : { top: 16, right: 16 }
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900">Link đăng ký công khai</p>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          Chia sẻ link này để người chưa có tài khoản CLB cũng tự đăng ký thi đấu được.
        </p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-3">
          <span className="text-xs text-gray-700 truncate flex-1">{publicLink}</span>
          <button onClick={onCopy} title="Sao chép link" className="flex-shrink-0 text-blue-600 hover:text-blue-700">
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Sao chép
          </button>
          <a
            href={publicLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở trang
          </a>
        </div>
      </div >
    </>
  );
}

function TeamsModal({
  teams,
  unassigned,
  loading,
  clearing,
  exporting,
  drawing,
  composition,
  onClose,
  onClear,
  onExport,
  onDrawTeams,
}: {
  teams: any[];
  unassigned: any[];
  loading: boolean;
  clearing: boolean;
  exporting: boolean;
  drawing: boolean;
  composition: { role: "nam" | "nu"; level?: string | null; label?: string }[];
  onClose: () => void;
  onClear: () => void;
  onExport: () => void;
  onDrawTeams: () => void;
}) {
  const { visible, handleClose } = useModalTransition(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hasData = teams.length > 0 || unassigned.length > 0;

  const compositionOrder = useMemo(() => {
    const order = new Map<string, number>();
    (composition ?? []).forEach((c, idx) => {
      const key = `${c.role}_${c.level ?? "x"}`;
      if (!order.has(key)) order.set(key, idx);
    });
    return order;
  }, [composition]);

  const sortByComposition = (members: any[]) => {
    return [...(members ?? [])].sort((a, b) => {
      const rankA = compositionOrder.get(`${a.role}_${a.level ?? "x"}`) ?? 999;
      const rankB = compositionOrder.get(`${b.role}_${b.level ?? "x"}`) ?? 999;
      return rankA - rankB;
    });
  };

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"
        }`}
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${visible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-2"
          }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
            Kết quả chia đội {teams.length > 0 && `(${teams.length} đội)`}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onDrawTeams}
              disabled={drawing}
              title="Chia lại theo trình độ"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {drawing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Chia theo trình độ</span>
            </button>
            <button
              onClick={onExport}
              disabled={!hasData || exporting}
              title="Xuất Excel"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
            </div>
          ) : teams.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              Chưa có đội nào được chia
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              {teams.map((t: any) => (
                <div key={t.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50">
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <span className="text-xs text-gray-400">{t.members?.length ?? 0} người</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sortByComposition(t.members).map((m: any) => (
                      <div key={m.id} className="px-3.5 py-2.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0 mb-1.5">
                          <img
                            src={
                              m.users?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(m.users?.full_name ?? m.guest_full_name ?? "?")}`
                            }
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                            alt=""
                          />
                          <span className="text-gray-800 font-medium truncate">
                            {m.users?.full_name ?? m.guest_full_name ?? "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap pl-9">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.user_id
                              ? "bg-indigo-50 text-indigo-600"
                              : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {m.user_id ? "Thành viên" : "Khách"}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.role === "nam" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                              }`}
                          >
                            {m.role === "nam" ? "Nam" : "Nữ"}
                          </span>
                          <span
                            className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                            style={levelPillStyle(m.level)}
                          >
                            {m.level ?? "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(t.members ?? []).length === 0 && (
                      <p className="text-xs text-gray-300 text-center py-3">Chưa có thành viên</p>
                    )}
                  </div>
                </div>
              ))}

              {unassigned.length > 0 && (
                <div className="border border-amber-100 bg-amber-50/50 rounded-xl overflow-hidden sm:col-span-2">
                  <div className="px-3.5 py-2.5 bg-amber-50">
                    <p className="font-semibold text-amber-700 text-sm">
                      Chưa xếp đội ({unassigned.length})
                    </p>
                  </div>
                  <div className="divide-y divide-amber-50">
                    {sortByComposition(unassigned).map((m: any) => (
                      <div key={m.id} className="px-3.5 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-700 truncate">
                            {m.users?.full_name ?? m.guest_full_name ?? "—"}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.user_id
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-gray-100 text-gray-500"
                                }`}
                            >
                              {m.user_id ? "Thành viên" : "Khách"}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.role === "nam" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                                }`}
                            >
                              {m.role === "nam" ? "Nam" : "Nữ"}
                            </span>
                            <span
                              className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                              style={levelPillStyle(m.level)}
                            >
                              {m.level ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-3.5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClear}
            disabled={clearing || !hasData}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {clearing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Xoá đội
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subPercent,
  icon,
  iconBg,
  pillLevel,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  subPercent?: number;
  icon?: string;
  iconBg?: string;
  pillLevel?: string;
  onClick?: () => void;
}) {
  const pill = pillLevel ? LEVEL_COLORS[pillLevel] : null;
  const animatedValue = useCountUp(value);
  const animatedPercent = useCountUp(subPercent ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-2.5">
        <p className="text-[11px] sm:text-xs text-gray-400 font-medium truncate pr-1">
          {label}
        </p>
        {pill ? (
          <span
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: pill.bg, color: pill.text }}
          >
            {pillLevel}
          </span>
        ) : (
          <span
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-base flex-shrink-0"
            style={{ background: iconBg }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">
        {Math.round(animatedValue)}
      </p>
      <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 tabular-nums">
        {subPercent !== undefined ? `(${animatedPercent.toFixed(2)}%)` : sub}
      </p>
    </button>
  );
}

function LevelDonutCard({ stats }: { stats: any }) {
  const segments = [
    { key: "A", value: stats.A, color: "#1a9e5c" },
    { key: "B+", value: stats["B+"], color: "#7c3aed" },
    { key: "B", value: stats.B, color: "#f0a83e" },
    { key: "C", value: stats.C, color: "#0f9db0" },
  ];
  const total = stats.total || 1;
  let acc = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
      <h3 className="font-bold text-gray-900 mb-4 text-sm">
        Thống kê phân bố trình độ
      </h3>
      <div className="flex items-center gap-5">
        <svg
          viewBox="0 0 100 100"
          className="w-24 h-24 -rotate-90 flex-shrink-0"
        >
          {segments.map((s) => {
            const fraction = s.value / total;
            const dash = fraction * circumference;
            const offset = acc * circumference;
            acc += fraction;
            return (
              <circle
                key={s.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
          })}
          <text
            x="50"
            y="46"
            textAnchor="middle"
            style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}
            fontSize="16"
            fontWeight="bold"
            fill="#111827"
          >
            {stats.total}
          </text>
          <text
            x="50"
            y="60"
            textAnchor="middle"
            style={{ transform: "rotate(90deg)", transformOrigin: "50px 50px" }}
            fontSize="8"
            fill="#9ca3af"
          >
            tổng
          </text>
        </svg>
        <div className="space-y-1.5 text-xs">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: s.color }}
              />
              <span className="text-gray-600">
                {s.key} ({total ? ((s.value / total) * 100).toFixed(2) : "0.00"}
                %)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Download,
    Filter,
    Users,
    Eye,
    Pencil,
    Trash2,
    ChevronRight,
    ChevronLeft,
    RotateCcw,
    Loader2,
    X,
    Landmark,
    Banknote,
    Wallet,
    CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import toast from "react-hot-toast";
import { eventsAdminApi } from "@/lib/api";
import { CustomSelect } from "../sessions/CustomSelect";

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
    A: { bg: "#e6f7ee", text: "#1a9e5c" },
    "B+": { bg: "#efe7fd", text: "#7c3aed" },
    B: { bg: "#fff2df", text: "#c8790f" },
    C: { bg: "#e3f7fb", text: "#0f9db0" },
};

const STATUS_LABEL: Record<string, string> = {
    draft: "Nháp",
    open: "Đang mở đăng ký",
    closed: "Đã đóng đăng ký",
    ongoing: "Đang diễn ra",
    completed: "Đã kết thúc",
    cancelled: "Đã huỷ",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
    wallet: "Ví BNB",
    transfer: "Chuyển khoản",
    cash: "Tiền mặt",
};

const PAYMENT_METHOD_ICON: Record<string, any> = {
    wallet: Wallet,
    transfer: Landmark,
    cash: Banknote,
};

const GENDER_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "nam", label: "Nam" },
    { value: "nu", label: "Nữ" },
];

const LEVEL_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "A", label: "Trình A" },
    { value: "B+", label: "Trình B+" },
    { value: "B", label: "Trình B" },
    { value: "C", label: "Trình C" },
];

const PAYMENT_OPTIONS = [
    { value: "", label: "Tất cả" },
    { value: "confirmed", label: "Đã thanh toán" },
    { value: "pending", label: "Chưa thanh toán" },
];

const DRAW_CONTENT_OPTIONS = [
    { value: "nam", label: "Đội Nam (Nam A, B+, B, C)" },
    { value: "nu", label: "Đội Nữ (Nữ)" },
    { value: "mix", label: "Đội Nam - Nữ (Mix)" },
];

const PAGE_SIZE = 8;

function levelPillStyle(level?: string | null) {
    const c = level ? LEVEL_COLORS[level] : null;
    return c
        ? { background: c.bg, color: c.text }
        : { background: "#f3f4f6", color: "#6b7280" };
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

    const [drawContent, setDrawContent] = useState("nam");
    const [teamCount, setTeamCount] = useState("8");
    const [drawing, setDrawing] = useState(false);

    // Xác nhận thanh toán: đăng ký đang được chọn để xem chi tiết trước khi
    // admin bấm xác nhận (áp dụng cho chuyển khoản & tiền mặt).
    const [confirmTarget, setConfirmTarget] = useState<any>(null);
    const [confirming, setConfirming] = useState(false);

    const load = async () => {
        if (!id) return;
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    useEffect(() => {
        setPage(1);
    }, [search, genderFilter, levelFilter, roleFilter, paymentFilter]);

    const stats = useMemo(() => {
        const total = registrations.length;
        const nam = registrations.filter((r) => r.role === "nam").length;
        const nu = registrations.filter((r) => r.role === "nu").length;
        const byLevel = (lv: string) =>
            registrations.filter((r) => r.role === "nam" && r.level === lv).length;
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
        };
    }, [registrations]);

    const levelPct = (count: number) =>
        stats.total ? ((count / stats.total) * 100).toFixed(2) : "0.00";

    const filtered = useMemo(() => {
        return registrations.filter((r) => {
            const name = r.users?.full_name?.toLowerCase() ?? "";
            const email = r.users?.email?.toLowerCase() ?? "";
            const phone = r.users?.phone ?? "";
            const q = search.trim().toLowerCase();
            if (q && !name.includes(q) && !email.includes(q) && !phone.includes(q))
                return false;
            if (genderFilter && r.role !== genderFilter) return false;
            if (levelFilter && r.level !== levelFilter) return false;
            if (roleFilter && r.role !== roleFilter) return false;
            if (paymentFilter && r.payment_status !== paymentFilter) return false;
            return true;
        });
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
        setRegistrations((prev) =>
            prev.map((r) => (r.id === regId ? { ...r, level } : r)),
        );
        toast.success("Đã cập nhật trình độ (tạm thời, chưa lưu server)");
    };

    const handleDeleteReg = async (regId: string) => {
        if (!confirm("Xoá đăng ký này?")) return;
        try {
            await eventsAdminApi.removeRegistration("tournament", regId);
            toast.success("Đã xoá đăng ký");
            load();
        } catch { }
    };

    // Mở modal xác nhận thay vì confirm ngay khi bấm — để admin thấy rõ
    // phương thức (chuyển khoản / tiền mặt) và nội dung trước khi xác nhận.
    const openConfirmPayment = (r: any) => {
        if (r.payment_status === "confirmed") return;
        setConfirmTarget(r);
    };

    const handleConfirmPayment = async () => {
        if (!confirmTarget) return;
        setConfirming(true);
        try {
            await eventsAdminApi.confirmTournamentPayment(confirmTarget.id);
            toast.success("Đã xác nhận thanh toán");
            setConfirmTarget(null);
            load();
        } catch {
        } finally {
            setConfirming(false);
        }
    };

    const handleDrawTeams = async () => {
        if (!id) return;
        setDrawing(true);
        try {
            await eventsAdminApi.drawTeams(id, {
                content: drawContent,
                team_count: Number(teamCount),
            });
            toast.success("Đã chia đội thành công");
            load();
        } catch {
        } finally {
            setDrawing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="w-full p-4 sm:p-6 space-y-5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => router.push("/activities")}
                    className="hover:text-gray-600"
                >
                    Giải đấu
                </button>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-gray-500">{activity?.title}</span>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-gray-900 font-medium">Quản lý đăng ký</span>
            </div>

            {/* Title row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Vận động viên đăng ký
                    </h1>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
                        {STATUS_LABEL[activity?.status] ?? activity?.status}
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Xuất danh sách</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 md:hidden">
                        <Filter className="w-4 h-4" />
                        <span>Bộ lọc</span>
                    </button>
                    <button className="btn-primary flex items-center gap-2 text-sm px-3 sm:px-4 py-2 font-medium">
                        <Users className="w-4 h-4" />
                        <span className="hidden sm:inline">Chia đội theo trình độ</span>
                        <span className="sm:hidden">Chia đội</span>
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <StatCard
                    label="Tổng số đăng ký"
                    value={stats.total}
                    sub="vận động viên"
                    iconBg="#eef2ff"
                    icon="👥"
                />
                <StatCard
                    label="Nam"
                    value={stats.nam}
                    sub={`(${stats.namPct}%)`}
                    iconBg="#eef5fe"
                    icon="♂"
                />
                <StatCard
                    label="Nữ"
                    value={stats.nu}
                    sub={`(${stats.nuPct}%)`}
                    iconBg="#fdf0f4"
                    icon="♀"
                />
                <StatCard
                    label="Trình A"
                    value={stats.A}
                    sub={`(${levelPct(stats.A)}%)`}
                    pillLevel="A"
                />
                <StatCard
                    label="Trình B+"
                    value={stats["B+"]}
                    sub={`(${levelPct(stats["B+"])}%)`}
                    pillLevel="B+"
                />
                <StatCard
                    label="Trình B"
                    value={stats.B}
                    sub={`(${levelPct(stats.B)}%)`}
                    pillLevel="B"
                />
                <StatCard
                    label="Trình C"
                    value={stats.C}
                    sub={`(${levelPct(stats.C)}%)`}
                    pillLevel="C"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
                {/* Left: filters + table */}
                <div className="space-y-4 min-w-0">
                    {/* Bộ lọc: Giới tính & Trình độ thu hẹp lại (2 cột) để nhường chỗ
              cho Thanh toán rộng hơn (3 cột) + nút Xóa lọc riêng 1 cột. */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
                            <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Tìm kiếm
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="Tìm kiếm tên, SĐT, email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Giới tính
                                </label>
                                <CustomSelect
                                    value={genderFilter}
                                    onChange={setGenderFilter}
                                    options={GENDER_OPTIONS}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Trình độ
                                </label>
                                <CustomSelect
                                    value={levelFilter}
                                    onChange={setLevelFilter}
                                    options={LEVEL_OPTIONS}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Vai trò
                                </label>
                                <CustomSelect
                                    value={roleFilter}
                                    onChange={setRoleFilter}
                                    options={GENDER_OPTIONS}
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Thanh toán
                                </label>
                                <CustomSelect
                                    value={paymentFilter}
                                    onChange={setPaymentFilter}
                                    options={PAYMENT_OPTIONS}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <button
                                    onClick={clearFilters}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="lg:hidden">Xóa lọc</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Desktop/tablet: bảng ── */}
                    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                                    {pageItems.map((r, i) => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-400">
                                                {(page - 1) * PAGE_SIZE + i + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={
                                                            r.users?.avatar_url ||
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(r.users?.full_name ?? "?")}`
                                                        }
                                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                                        alt=""
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-gray-900 truncate">
                                                            {r.users?.full_name ?? "—"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 truncate">
                                                            {r.users?.email ?? ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {r.role === "nam" ? "Nam" : "Nữ"}
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.role === "nam" ? (
                                                    <select
                                                        value={r.level ?? ""}
                                                        onChange={(e) =>
                                                            handleLevelChange(r.id, e.target.value)
                                                        }
                                                        className="text-xs font-semibold rounded-lg px-2.5 py-1 border-0 outline-none cursor-pointer"
                                                        style={levelPillStyle(r.level)}
                                                    >
                                                        {["A", "B+", "B", "C"].map((lv) => (
                                                            <option key={lv} value={lv}>
                                                                {lv}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span
                                                        className="text-xs font-semibold rounded-lg px-2.5 py-1"
                                                        style={levelPillStyle(null)}
                                                    >
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-xs font-medium px-2 py-1 rounded-full ${r.role === "nam"
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "bg-pink-50 text-pink-600"
                                                        }`}
                                                >
                                                    VĐV {r.role === "nam" ? "Nam" : "Nữ"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {r.users?.phone ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {r.created_at
                                                    ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm", {
                                                        locale: vi,
                                                    })
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => openConfirmPayment(r)}
                                                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.payment_status === "confirmed"
                                                        ? "bg-green-50 text-green-700 cursor-default"
                                                        : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                        }`}
                                                >
                                                    {r.payment_status === "confirmed"
                                                        ? "Đã thanh toán"
                                                        : "Chưa thanh toán"}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReg(r.id)}
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {pageItems.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="text-center py-10 text-gray-400"
                                            >
                                                Không có vận động viên nào phù hợp bộ lọc
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            filteredCount={filtered.length}
                            pageSize={PAGE_SIZE}
                            onChange={setPage}
                        />
                    </div>

                    {/* ── Mobile: danh sách dạng thẻ ── */}
                    <div className="md:hidden space-y-3">
                        {pageItems.length === 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 text-center py-10 text-gray-400 text-sm">
                                Không có vận động viên nào phù hợp bộ lọc
                            </div>
                        )}
                        {pageItems.map((r, i) => (
                            <div
                                key={r.id}
                                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                            src={
                                                r.users?.avatar_url ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(r.users?.full_name ?? "?")}`
                                            }
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                            alt=""
                                        />
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {r.users?.full_name ?? "—"}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">
                                                {r.users?.phone ?? "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        #{(page - 1) * PAGE_SIZE + i + 1}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`text-xs font-medium px-2 py-1 rounded-full ${r.role === "nam"
                                            ? "bg-blue-50 text-blue-600"
                                            : "bg-pink-50 text-pink-600"
                                            }`}
                                    >
                                        VĐV {r.role === "nam" ? "Nam" : "Nữ"}
                                    </span>
                                    {r.role === "nam" ? (
                                        <select
                                            value={r.level ?? ""}
                                            onChange={(e) => handleLevelChange(r.id, e.target.value)}
                                            className="text-xs font-semibold rounded-lg px-2.5 py-1 border-0 outline-none cursor-pointer"
                                            style={levelPillStyle(r.level)}
                                        >
                                            {["A", "B+", "B", "C"].map((lv) => (
                                                <option key={lv} value={lv}>
                                                    {lv}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span
                                            className="text-xs font-semibold rounded-lg px-2.5 py-1"
                                            style={levelPillStyle(null)}
                                        >
                                            —
                                        </span>
                                    )}
                                    <button
                                        onClick={() => openConfirmPayment(r)}
                                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.payment_status === "confirmed"
                                            ? "bg-green-50 text-green-700"
                                            : "bg-amber-50 text-amber-600"
                                            }`}
                                    >
                                        {r.payment_status === "confirmed"
                                            ? "Đã thanh toán"
                                            : "Chưa thanh toán"}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
                                    <span>
                                        {r.created_at
                                            ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm", {
                                                locale: vi,
                                            })
                                            : "—"}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteReg(r.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {pageItems.length > 0 && (
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                filteredCount={filtered.length}
                                pageSize={PAGE_SIZE}
                                onChange={setPage}
                                compact
                            />
                        )}
                    </div>
                </div>

                {/* Right: draw teams panel */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-900 mb-1">
                            Chia đội theo trình độ
                        </h3>
                        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                            Hệ thống sẽ tự động chia các vận động viên thành các đội cân bằng
                            theo trình độ đã chọn.
                        </p>

                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Chọn nội dung chia đội
                        </label>
                        <div className="space-y-2 mb-4">
                            {DRAW_CONTENT_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                                >
                                    <input
                                        type="radio"
                                        name="draw_content"
                                        checked={drawContent === opt.value}
                                        onChange={() => setDrawContent(opt.value)}
                                        className="accent-blue-600"
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>

                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Số lượng đội
                        </label>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="number"
                                min={1}
                                className="input-field"
                                value={teamCount}
                                onChange={(e) => setTeamCount(e.target.value)}
                            />
                            <span className="text-sm text-gray-500">đội</span>
                        </div>

                        <button
                            disabled={drawing}
                            onClick={handleDrawTeams}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            {drawing ? "Đang chia..." : "Chia đội ngay"}
                        </button>
                    </div>

                    <LevelDonutCard stats={stats} />

                    <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                        Lưu ý: Hệ thống sẽ ưu tiên cân bằng số lượng và trình độ giữa các
                        đội.
                    </div>
                </div>
            </div>

            {/* Modal xác nhận thanh toán — dành cho chuyển khoản & tiền mặt (ví BNB
          đã tự động xác nhận ngay khi thanh toán nên hiếm khi cần bấm ở đây). */}
            {confirmTarget && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center"
                    onClick={(e) =>
                        e.target === e.currentTarget && setConfirmTarget(null)
                    }
                >
                    <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-900">Xác nhận thanh toán</p>
                            <button onClick={() => setConfirmTarget(null)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <img
                                src={
                                    confirmTarget.users?.avatar_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(confirmTarget.users?.full_name ?? "?")}`
                                }
                                className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                alt=""
                            />
                            <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {confirmTarget.users?.full_name ?? "—"}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {confirmTarget.users?.phone ?? "—"}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Phương thức</span>
                                <span className="flex items-center gap-1.5 font-medium text-gray-900">
                                    {(() => {
                                        const Icon =
                                            PAYMENT_METHOD_ICON[confirmTarget.payment_method] ??
                                            Banknote;
                                        return <Icon className="w-3.5 h-3.5" />;
                                    })()}
                                    {PAYMENT_METHOD_LABEL[confirmTarget.payment_method] ??
                                        "Chưa chọn"}
                                </span>
                            </div>
                            {confirmTarget.payment_method === "transfer" && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Nội dung CK</span>
                                    <span className="font-mono font-medium text-red-600">
                                        {confirmTarget.payment_reference ?? "—"}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Số tiền</span>
                                <span className="font-semibold text-gray-900">
                                    {(
                                        confirmTarget.amount_override ??
                                        activity?.detail?.entry_fee_per_person ??
                                        0
                                    ).toLocaleString("vi-VN")}
                                    đ
                                </span>
                            </div>
                        </div>

                        {!confirmTarget.payment_method && (
                            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                                Vận động viên này chưa chọn phương thức thanh toán — kiểm tra
                                lại trước khi xác nhận.
                            </p>
                        )}

                        <button
                            onClick={handleConfirmPayment}
                            disabled={confirming}
                            className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                        >
                            {confirming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            Xác nhận đã nhận thanh toán
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    filteredCount,
    pageSize,
    onChange,
    compact,
}: {
    page: number;
    totalPages: number;
    filteredCount: number;
    pageSize: number;
    onChange: (p: number) => void;
    compact?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between ${compact
                ? "bg-white rounded-xl border border-gray-200 px-4 py-3"
                : "px-4 py-3 border-t border-gray-100"
                } text-sm text-gray-500`}
        >
            <span className="text-xs sm:text-sm">
                Hiển thị {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, filteredCount)} trong tổng số{" "}
                {filteredCount}
            </span>
            <div className="flex items-center gap-1">
                <button
                    disabled={page === 1}
                    onClick={() => onChange(page - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 4) }, (_, idx) => {
                    const p = idx + 1;
                    return (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p
                                ? "bg-blue-600 text-white"
                                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                        >
                            {p}
                        </button>
                    );
                })}
                {totalPages > 4 && <span className="px-1 text-gray-400">…</span>}
                {totalPages > 4 && (
                    <button
                        onClick={() => onChange(totalPages)}
                        className="w-8 h-8 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        {totalPages}
                    </button>
                )}
                <button
                    disabled={page === totalPages}
                    onClick={() => onChange(page + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    icon,
    iconBg,
    pillLevel,
}: {
    label: string;
    value: number;
    sub: string;
    icon?: string;
    iconBg?: string;
    pillLevel?: string;
}) {
    const pill = pillLevel ? LEVEL_COLORS[pillLevel] : null;
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-400">{label}</p>
                {pill ? (
                    <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: pill.bg, color: pill.text }}
                    >
                        {pillLevel}
                    </span>
                ) : (
                    <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                        style={{ background: iconBg }}
                    >
                        {icon}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
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
                        className="rotate-90"
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
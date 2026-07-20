"use client";

import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Loader2,
    Users,
    Trash2,
    CheckCircle2,
    Phone,
    BarChart3,
    FileSpreadsheet,
    UserPlus
} from "lucide-react";
import { eventsAdminApi } from "@/lib/api"; // TODO: chỉnh lại path cho đúng vị trí api.ts trong project

const TYPE_LABEL: Record<string, string> = {
    shirt_order: "👕 Đặt áo",
    tournament: "🏆 Giải đấu",
    birthday: "🎂 Sinh nhật",
    offline_event: "🔥 Offline",
    poll: "📊 Bình chọn",
};

export default function EventRegistrationsPage({
    activityId,
    onClose,
    onAddRegistration,
}: {
    activityId?: string;
    onClose?: () => void;
    onAddRegistration?: () => void;
} = {}) {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = activityId ?? params?.id;

    const [activity, setActivity] = useState<any>(null);
    const [regData, setRegData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            const [{ data: a }, { data: r }] = await Promise.all([
                eventsAdminApi.get(id!),
                eventsAdminApi.getRegistrations(id!),
            ]);
            setActivity(a);
            setRegData(r);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [id]);

    const handleConfirmPayment = async (regId: string, type: string) => {
        try {
            if (type === "shirt_order") {
                await eventsAdminApi.confirmShirtOrder(regId);
            } else if (type === "tournament") {
                await eventsAdminApi.confirmTournamentPayment(regId);
            }
            toast.success("Đã xác nhận thanh toán");
            fetchAll();
        } catch { }
    };

    const handleRemove = async (type: string, regId: string, label: string) => {
        if (!confirm(`Xoá đăng ký của "${label}"?`)) return;
        try {
            await eventsAdminApi.removeRegistration(type, regId);
            toast.success("Đã xoá đăng ký");
            fetchAll();
        } catch { }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }
    if (!activity || !regData) return null;

    const registrations = regData.registrations ?? [];

    return (
        <div className="w-full mx-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pr-12">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {activity.emoji} {activity.title}
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {activity.type === "poll"
                                ? `${(regData.votes ?? []).length} lượt bình chọn`
                                : `${registrations.length} đăng ký`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {activity.type === "shirt_order" && onAddRegistration && (
                            <button
                                onClick={onAddRegistration}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap"
                            >
                                <UserPlus className="w-4 h-4" /> Thêm đăng ký
                            </button>
                        )}
                        <button
                            onClick={() => exportToExcel(activity, regData)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium whitespace-nowrap"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {activity.type === "poll" ? (
                    <PollResults regData={regData} />
                ) : (
                    <div className="card !p-0 overflow-hidden">
                        {registrations.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>Chưa có ai đăng ký</p>
                            </div>
                        ) : activity.type === "shirt_order" ? (
                            <ShirtOrderTable
                                registrations={registrations}
                                onConfirm={(regId: string) =>
                                    handleConfirmPayment(regId, "shirt_order")
                                }
                                onRemove={(regId: string, label: string) =>
                                    handleRemove("shirt_order", regId, label)
                                }
                            />
                        ) : activity.type === "tournament" ? (
                            <TournamentTable
                                registrations={registrations}
                                totalReceived={regData.total_received ?? 0}
                                totalExpected={regData.total_expected ?? 0}
                                onConfirm={(regId: string) =>
                                    handleConfirmPayment(regId, "tournament")
                                }
                                onRemove={(regId: string, label: string) =>
                                    handleRemove("tournament", regId, label)
                                }
                            />
                        ) : activity.type === "offline_event" ? (
                            <OfflineEventTable
                                registrations={registrations}
                                onRemove={(regId: string, label: string) =>
                                    handleRemove("offline_event", regId, label)
                                }
                            />
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

function getPaymentMethodBadge(r: any) {
    if (r.payment_method === "wallet") {
        return { label: "Ví BNB", cls: "bg-blue-100 text-blue-700" };
    }
    if (r.payment_method === "transfer") {
        return { label: "Chuyển khoản", cls: "bg-sky-100 text-sky-700" };
    }
    if (r.payment_method === "cash") {
        return { label: "Tiền mặt", cls: "bg-emerald-100 text-emerald-700" };
    }
    return null;
}

function ShirtOrderTable({
    registrations,
    onConfirm,
    onRemove,
}: {
    registrations: any[];
    onConfirm: (regId: string) => void;
    onRemove: (regId: string, label: string) => void;
}) {
    const groups = new Map<string, any[]>();
    for (const r of registrations) {
        const key = r.user_id ?? r.id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    }
    const groupList = Array.from(groups.values());

    const rowsWithMeta: { reg: any; isFirstOfGroup: boolean; rowSpan: number }[] = [];
    groupList.forEach((groupRegs) => {
        groupRegs.forEach((r, idx) => {
            rowsWithMeta.push({
                reg: r,
                isFirstOfGroup: idx === 0,
                rowSpan: groupRegs.length,
            });
        });
    });

    return (
        <>
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm border border-gray-200 border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="text-left px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Thành viên
                            </th>
                            <th className="text-left px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Loại áo
                            </th>
                            <th className="text-left px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Size
                            </th>
                            <th className="text-left px-4 py-3 border border-gray-200 whitespace-nowrap">
                                SL
                            </th>
                            <th className="text-right px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Đơn giá
                            </th>
                            <th className="text-right px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Thành tiền
                            </th>
                            <th className="text-left px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Thanh toán
                            </th>
                            <th className="px-4 py-3 border border-gray-200 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rowsWithMeta.map(({ reg: r, isFirstOfGroup, rowSpan }) => {
                            const badge = getPaymentMethodBadge(r);
                            const isConfirmed = r.payment_status === "confirmed";
                            const hasPendingRequest =
                                !isConfirmed &&
                                (r.payment_method === "transfer" || r.payment_method === "cash");
                            const unitPrice = r.unit_price ?? 0;
                            const totalAmount =
                                r.total_amount ?? unitPrice * (r.quantity ?? 1);

                            return (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    {isFirstOfGroup && (
                                        <td
                                            rowSpan={rowSpan}
                                            className="px-4 py-3 border border-gray-200 align-middle"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                                    {r.users?.avatar_url ? (
                                                        <img
                                                            src={r.users.avatar_url}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        r.users?.full_name?.[0]
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {r.users?.full_name ?? r.guest_full_name ?? "—"}
                                                    </p>
                                                    {(r.users?.phone ?? r.guest_phone) && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {r.users?.phone ?? r.guest_phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-4 py-3 border border-gray-200 text-gray-600 whitespace-nowrap">
                                        {r.shirt_type_name ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 font-medium text-gray-700">
                                        {r.size}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 text-gray-500">
                                        {r.quantity}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 text-right text-gray-600 whitespace-nowrap">
                                        {fmt(unitPrice)}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 text-right font-semibold text-gray-900 whitespace-nowrap">
                                        {fmt(totalAmount)}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {isConfirmed ? (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 flex items-center gap-1 whitespace-nowrap">
                                                    <CheckCircle2 className="w-3 h-3" /> Đã xác nhận
                                                </span>
                                            ) : hasPendingRequest ? (
                                                <button
                                                    onClick={() => onConfirm(r.id)}
                                                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 whitespace-nowrap"
                                                >
                                                    Chờ xác nhận
                                                </button>
                                            ) : (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-400 whitespace-nowrap">
                                                    Chưa thanh toán
                                                </span>
                                            )}
                                            {badge && (
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${badge.cls}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            )}
                                            {r.payment_reference &&
                                                r.payment_reference !== "TIEN_MAT" && (
                                                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                                                        {r.payment_reference}
                                                    </span>
                                                )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 text-right">
                                        <button
                                            onClick={() => onRemove(r.id, r.users?.full_name ?? "")}
                                            className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
                {groupList.map((groupRegs) => {
                    const first = groupRegs[0];
                    return (
                        <div
                            key={first.user_id ?? first.id}
                            className="rounded-2xl border border-gray-100 bg-white ring-1 ring-black/5 p-4 space-y-3"
                            style={{ boxShadow: "0 12px 28px -8px rgba(0,0,0,0.18), 0 4px 10px -4px rgba(0,0,0,0.08)" }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img
                                            src={first.users.avatar_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        first.users?.full_name?.[0]
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {groupRegs.map((r: any) => {
                                    const badge = getPaymentMethodBadge(r);
                                    const isConfirmed = r.payment_status === "confirmed";
                                    const hasPendingRequest =
                                        !isConfirmed &&
                                        (r.payment_method === "transfer" ||
                                            r.payment_method === "cash");
                                    const unitPrice = r.unit_price ?? 0;
                                    const totalAmount =
                                        r.total_amount ?? unitPrice * (r.quantity ?? 1);

                                    return (
                                        <div
                                            key={r.id}
                                            className="rounded-xl border border-gray-200 p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {r.shirt_type_name ?? "—"}
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        onRemove(r.id, r.users?.full_name ?? "")
                                                    }
                                                    className="p-1 -m-1 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span>
                                                    Size <strong className="text-gray-700">{r.size}</strong>
                                                </span>
                                                <span>
                                                    SL <strong className="text-gray-700">{r.quantity}</strong>
                                                </span>
                                                <span>
                                                    Đơn giá{" "}
                                                    <strong className="text-gray-700">
                                                        {fmt(unitPrice)}
                                                    </strong>
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {isConfirmed ? (
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Đã xác nhận
                                                        </span>
                                                    ) : hasPendingRequest ? (
                                                        <button
                                                            onClick={() => onConfirm(r.id)}
                                                            className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-600 hover:bg-orange-100"
                                                        >
                                                            Chờ xác nhận
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-400">
                                                            Chưa thanh toán
                                                        </span>
                                                    )}
                                                    {badge && (
                                                        <span
                                                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {fmt(totalAmount)}
                                                </span>
                                            </div>

                                            {r.payment_reference &&
                                                r.payment_reference !== "TIEN_MAT" && (
                                                    <p className="text-[10px] text-gray-400 font-mono">
                                                        {r.payment_reference}
                                                    </p>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

function exportToExcel(activity: any, regData: any) {
    let rows: any[] = [];

    if (activity.type === "shirt_order") {
        rows = (regData.registrations ?? []).map((r: any) => ({
            "Thành viên": r.users?.full_name ?? "—",
            "SĐT": r.users?.phone ?? "—",
            "Loại áo": r.shirt_type_name ?? "—",
            "Size": r.size,
            "Số lượng": r.quantity,
            "Đơn giá": r.unit_price ?? 0,
            "Thành tiền": r.total_amount ?? (r.unit_price ?? 0) * (r.quantity ?? 1),
            "Trạng thái TT":
                r.payment_status === "confirmed" ? "Đã xác nhận" : "Chưa xác nhận",
            "Phương thức": r.payment_method ?? "—",
            "Mã tham chiếu": r.payment_reference ?? "—",
        }));
    } else if (activity.type === "tournament") {
        rows = (regData.registrations ?? []).map((r: any) => ({
            "Đội": r.team_name,
            "Player 1": r.player1?.full_name ?? "—",
            "Player 2": r.player2?.full_name ?? "—",
            "Lệ phí": r.amount_override ?? 0,
            "Trạng thái TT":
                r.payment_status === "confirmed" ? "Đã xác nhận" : "Chưa xác nhận",
            "Phương thức": r.payment_method ?? "—",
        }));
    } else if (activity.type === "offline_event") {
        rows = (regData.registrations ?? []).map((r: any) => ({
            "Thành viên": r.users?.full_name ?? "—",
            "Khách đi cùng": r.guest_count ?? 0,
            "Ghi chú": r.notes ?? "—",
        }));
    } else if (activity.type === "poll") {
        const options = regData.options ?? [];
        const votes = regData.votes ?? [];
        rows = options.map((opt: any) => {
            const optVotes = votes.filter((v: any) => v.poll_option_id === opt.id);
            return {
                "Lựa chọn": opt.label,
                "Số phiếu": optVotes.length,
                "Người bình chọn": optVotes
                    .map((v: any) => v.users?.full_name)
                    .join(", "),
            };
        });
    }

    if (rows.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách");
    XLSX.writeFile(wb, `${activity.title}.xlsx`);
}

function getTournamentPaymentBadge(r: any) {
    if (r.payment_method === "wallet") {
        return { label: "Ví BNB", cls: "bg-blue-100 text-blue-700" };
    }
    if (r.payment_method === "transfer") {
        return { label: "Chuyển khoản", cls: "bg-sky-100 text-sky-700" };
    }
    if (r.payment_method === "cash") {
        return { label: "Tiền mặt", cls: "bg-emerald-100 text-emerald-700" };
    }
    return null;
}

function TournamentTable({
    registrations,
    totalReceived,
    totalExpected,
    onConfirm,
    onRemove,
}: {
    registrations: any[];
    totalReceived: number;
    totalExpected: number;
    onConfirm: (regId: string) => void;
    onRemove: (regId: string, label: string) => void;
}) {
    return (
        <div>
            {totalExpected > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <span className="text-sm text-blue-700 font-medium">Đã thu được</span>
                    <span className="text-sm font-bold text-blue-700">
                        {fmt(totalReceived)} / {fmt(totalExpected)}
                    </span>
                </div>
            )}
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="text-left px-4 py-3">Đội</th>
                        <th className="text-left px-4 py-3">Player 1</th>
                        <th className="text-left px-4 py-3">Player 2</th>
                        <th className="text-left px-4 py-3">Lệ phí</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {registrations.map((r: any) => {
                        const badge = getTournamentPaymentBadge(r);
                        const isConfirmed = r.payment_status === "confirmed";
                        const hasPendingRequest =
                            !isConfirmed &&
                            (r.payment_method === "transfer" || r.payment_method === "cash");

                        return (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {r.team_name}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {r.player1?.full_name ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {r.player2?.full_name ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                    {r.amount_override ? (
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="font-medium text-gray-700">
                                                {fmt(r.amount_override)}
                                            </span>
                                            {isConfirmed ? (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Đã xác nhận
                                                </span>
                                            ) : hasPendingRequest ? (
                                                <button
                                                    onClick={() => onConfirm(r.id)}
                                                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-600 hover:bg-orange-100"
                                                >
                                                    Chờ xác nhận
                                                </button>
                                            ) : (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-400 w-fit">
                                                    Chưa thanh toán
                                                </span>
                                            )}
                                            {badge && (
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemove(r.id, r.team_name)}
                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OfflineEventTable({ registrations, onRemove }: any) {
    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                    <th className="text-left px-4 py-3">Thành viên</th>
                    <th className="text-left px-4 py-3">Khách đi cùng</th>
                    <th className="text-left px-4 py-3">Ghi chú</th>
                    <th className="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {registrations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center font-semibold text-orange-600 overflow-hidden flex-shrink-0">
                                    {r.users?.avatar_url ? (
                                        <img src={r.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (r.users?.full_name ?? r.guest_full_name)?.[0] ?? "?"
                                    )}
                                </div>
                                <p className="font-medium text-gray-900 truncate">
                                    {r.users?.full_name ?? "—"}
                                </p>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                            {r.guest_count > 0 ? `+${r.guest_count}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {r.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button
                                onClick={() => onRemove(r.id, r.users?.full_name ?? "")}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function PollResults({ regData }: any) {
    const options = regData.options ?? [];
    const votes = regData.votes ?? [];
    const total = votes.length;

    return (
        <div className="space-y-3">
            {options.map((opt: any) => {
                const optVotes = votes.filter((v: any) => v.poll_option_id === opt.id);
                const pct = total > 0 ? Math.round((optVotes.length / total) * 100) : 0;
                return (
                    <div key={opt.id} className="card !p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">{opt.label}</p>
                            <span className="text-sm font-medium text-gray-500">
                                {optVotes.length} phiếu ({pct}%)
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {optVotes.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {optVotes.map((v: any) => (
                                    <div
                                        key={v.user_id}
                                        className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-1 pr-3 py-1"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center text-[10px] font-semibold text-purple-600 overflow-hidden flex-shrink-0">
                                            {v.users?.avatar_url ? (
                                                <img
                                                    src={v.users.avatar_url}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                v.users?.full_name?.[0]
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-600">
                                            {v.users?.full_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            {options.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Chưa có lựa chọn nào</p>
                </div>
            )}
        </div>
    );
}
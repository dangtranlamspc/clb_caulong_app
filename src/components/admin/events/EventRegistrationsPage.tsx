"use client";

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
}: {
    activityId?: string;
    onClose?: () => void;
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

    const handleBack = () => {
        if (onClose) onClose();
        else router.push("/activities");
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
        <div className="max-w-3xl mx-auto space-y-4 p-6">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        {activity.emoji} {activity.title}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {TYPE_LABEL[activity.type]} ·{" "}
                        {activity.type === "poll"
                            ? `${(regData.votes ?? []).length} lượt bình chọn`
                            : `${registrations.length} đăng ký`}
                    </p>
                </div>
            </div>

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
    );
}

// ============ Đặt áo ============
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
    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                    <th className="text-left px-4 py-3">Thành viên</th>
                    <th className="text-left px-4 py-3">Size</th>
                    <th className="text-left px-4 py-3">SL</th>
                    <th className="text-left px-4 py-3">Thanh toán</th>
                    <th className="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {registrations.map((r: any) => {
                    const badge = getPaymentMethodBadge(r);
                    const isConfirmed = r.payment_status === "confirmed";
                    const hasPendingRequest =
                        !isConfirmed &&
                        (r.payment_method === "transfer" || r.payment_method === "cash");

                    return (
                        <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
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
                                            {r.users?.full_name ?? "—"}
                                        </p>
                                        {r.users?.phone && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {r.users.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700">{r.size}</td>
                            <td className="px-4 py-3 text-gray-500">{r.quantity}</td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 items-start">
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
                                    {r.payment_reference &&
                                        r.payment_reference !== "TIEN_MAT" && (
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                {r.payment_reference}
                                            </span>
                                        )}
                                </div>
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
                    );
                })}
            </tbody>
        </table>
    );
}

//Giải đấu

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
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

// ============ Offline / BBQ ============
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
                                        <img
                                            src={r.users.avatar_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        r.users?.full_name?.[0]
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

// ============ Bình chọn ============
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
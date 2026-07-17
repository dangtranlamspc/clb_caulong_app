"use client";
import { useState, useEffect, useCallback } from "react";
import {
    CheckCircle2,
    XCircle,
    Hourglass,
    Clock,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Swords,
    Users,
    Trophy,
    EyeOff,
    Plus,
    Trash2,
    Undo2,
    Calendar,
    ChevronDown,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { api, matchesAdminApi } from "@/lib/api";
import { createPortal } from "react-dom";
import { ConfirmModal } from "@/components/admin/matches/ConfirmModal";
import { CreateMatchModal } from "@/components/admin/matches/CreateMatchModal";

const STATUS_TABS = [
    { value: "", label: "Tất cả", icon: RefreshCw },
    { value: "pending_approval", label: "Chờ duyệt", icon: Hourglass },
    { value: "approved", label: "Đã duyệt", icon: CheckCircle2 },
    { value: "rejected", label: "Từ chối", icon: XCircle },
    { value: "pending_result", label: "Chờ kết quả", icon: Clock },
];

const STATUS_BADGE: Record<string, string> = {
    pending_opponent: "bg-gray-50 text-gray-600 border-gray-200",
    pending_result: "bg-blue-50 text-blue-600 border-blue-200",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_COUNT_BADGE: Record<string, string> = {
    pending_approval: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    pending_result: "bg-blue-100 text-blue-700",
    "": "bg-gray-200 text-gray-700",
};

const STATUS_ACCENT: Record<string, string> = {
    pending_opponent: "border-l-gray-300",
    pending_result: "border-l-blue-400",
    pending_approval: "border-l-amber-400",
    approved: "border-l-green-400",
    rejected: "border-l-red-400",
};

const STATUS_LABEL: Record<string, string> = {
    pending_opponent: "Chờ đối thủ",
    pending_result: "Chờ kết quả",
    pending_approval: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Từ chối",
};

const LEVEL_LABEL: Record<string, string> = {
    yeu: "Yếu",
    tb_yeu: "TB yếu",
    tb: "TB",
    tb_plus: "TB+",
    ban_chuyen: "BC",
    chuyen_nghiep: "Chuyên nghiệp",
};

const TIER_STYLE: Record<string, string> = {
    "Tân thủ": "bg-gray-100 text-gray-500",
    "Phong trào": "bg-slate-100 text-slate-600",
    "Cứng cựa": "bg-sky-50 text-sky-700",
    "Chủ lực": "bg-blue-50 text-blue-700",
    "Cao thủ": "bg-indigo-50 text-indigo-700",
    "Kiện tướng": "bg-purple-50 text-purple-700",
    "Đại Kiện Tướng": "bg-fuchsia-50 text-fuchsia-700",
    "Huyền Thoại": "bg-amber-100 text-amber-700",
};

const DEFAULT_TIER = "Tân thủ";

function getTier(p: any): string {
    const pr = p?.player_ranks;
    const tier = Array.isArray(pr) ? pr[0]?.tier : pr?.tier;
    return tier ?? DEFAULT_TIER;
}

function PlayerRow({ p, align = "left" }: { p: any; align?: "left" | "right" }) {
    if (!p) return null;
    const level = LEVEL_LABEL[p.level] ?? p.level;
    const tier = getTier(p);
    const tierCls = TIER_STYLE[tier] ?? "bg-gray-100 text-gray-500";
    const isRight = align === "right";

    return (
        <div className={`flex items-center gap-2 ${isRight ? "flex-row-reverse" : ""}`}>
            {p.avatar_url ? (
                <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
            ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {p.full_name?.[0]?.toUpperCase()}
                </div>
            )}
            <div className={`min-w-0 flex-1 ${isRight ? "text-right" : ""}`}>
                <p className="text-sm font-medium text-gray-900 truncate">{p.full_name}</p>
                <div
                    className={`flex flex-wrap items-center gap-1 mt-0.5 ${isRight ? "justify-end" : ""}`}
                >
                    {level && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 leading-none whitespace-nowrap">
                            {level}
                        </span>
                    )}
                    <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none whitespace-nowrap ${tierCls}`}
                    >
                        {tier}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function MatchesAdminPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setTab] = useState("");
    const [page, setPage] = useState(1);
    const [actionId, setActionId] = useState<string | null>(null);
    const [showReject, setShowReject] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showScoreInput, setShowScoreInput] = useState<string | null>(null);
    const [scoreInputs, setScoreInputs] = useState<
        Record<string, { score_a: string; score_b: string }>
    >({});
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [rollbackId, setRollbackId] = useState<string | null>(null);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [showStatusModal, setShowStatusModal] = useState(false);

    const fetchStatusCounts = useCallback(async () => {
        try {
            const { data } = await matchesAdminApi.statusCounts();
            setStatusCounts(data ?? {});
        } catch { }
    }, []);

    const fetchMatches = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 15 };
            if (activeTab) params.status = activeTab;
            const { data } = await matchesAdminApi.list(params);
            const list = data.data ?? [];
            setMatches(list);
            setMeta(data.meta ?? {});
            const initial: Record<string, boolean> = {};
            list.forEach((m: any) => {
                initial[m.id] = !!m.is_hidden;
            });
            setHiddenMap(initial);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);
    useEffect(() => {
        fetchStatusCounts();
    }, [fetchStatusCounts]);
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    const handleApprove = async (
        id: string,
        scorePayload?: { score_a: number; score_b: number },
    ) => {
        setActionId(id);
        try {
            const match = matches.find((m) => m.id === id);
            const nameById = new Map<string, string>();
            if (match) {
                [match.player_a1, match.player_a2, match.player_b1, match.player_b2]
                    .filter(Boolean)
                    .forEach((p: any) => nameById.set(p.id, p.full_name));
            }

            const { data } = await matchesAdminApi.approve(id, scorePayload);

            const updates = data.rank_updates ?? [];
            const winners = updates.filter((u: any) => u.delta > 0);
            const losers = updates.filter((u: any) => u.delta < 0);

            const fmt = (u: any) =>
                `${nameById.get(u.userId) ?? "Người chơi"} ${u.delta > 0 ? "+" : ""}${u.delta}đ`;

            if (winners.length > 0) {
                toast.success(`🟢 Cộng điểm: ${winners.map(fmt).join(", ")}`);
            }
            if (losers.length > 0) {
                toast.error(`🔴 Trừ điểm: ${losers.map(fmt).join(", ")}`);
            }
            if (winners.length === 0 && losers.length === 0) {
                toast.success("✅ Đã duyệt trận đấu");
            }

            setShowScoreInput(null);
            fetchMatches();
            fetchStatusCounts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
        } finally {
            setActionId(null);
        }
    };

    const handleApproveClick = (m: any) => {
        if (m.status === "pending_result") {
            setShowScoreInput(m.id);
            return;
        }
        handleApprove(m.id);
    };

    const handleConfirmScoreAndApprove = (id: string) => {
        const input = scoreInputs[id];
        const scoreA = parseInt(input?.score_a ?? "", 10);
        const scoreB = parseInt(input?.score_b ?? "", 10);

        if (isNaN(scoreA) || isNaN(scoreB)) {
            toast.error("Vui lòng nhập đủ tỉ số 2 đội");
            return;
        }
        if (scoreA === scoreB) {
            toast.error("Tỉ số không được hoà");
            return;
        }
        handleApprove(id, { score_a: scoreA, score_b: scoreB });
    };

    const handleReject = async (id: string) => {
        const reason = rejectReason[id]?.trim();
        if (!reason) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }
        setActionId(id);
        try {
            await matchesAdminApi.reject(id, reason);
            toast.success("Đã từ chối kết quả trận");
            setShowReject(null);
            fetchMatches();
            fetchStatusCounts();
        } finally {
            setActionId(null);
        }
    };

    const handleToggleHidden = async (id: string) => {
        const nextHidden = !hiddenMap[id];
        setHiddenMap((prev) => ({ ...prev, [id]: nextHidden }));
        try {
            await api.patch(`/matches/${id}/visibility`, { is_hidden: nextHidden });
            toast.success(nextHidden ? "🙈 Đã ẩn khỏi member" : "👁 Đã hiện lại cho member");
        } catch {
            setHiddenMap((prev) => ({ ...prev, [id]: !nextHidden }));
            toast.error("Thao tác thất bại");
        }
    };

    const handleDelete = async (id: string) => {
        setActionId(id);
        try {
            await matchesAdminApi.delete(id);
            toast.success("🗑️ Đã xóa vĩnh viễn trận đấu");
            setDeleteId(null);
            fetchMatches();
            fetchStatusCounts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xóa thất bại");
        } finally {
            setActionId(null);
        }
    };

    const handleRollback = async (id: string) => {
        setActionId(id);
        try {
            const { data } = await matchesAdminApi.rollback(id);
            toast.success(data.message ?? "↩️ Đã thu hồi kết quả trận đấu");
            setRollbackId(null);
            fetchMatches();
            fetchStatusCounts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Thu hồi thất bại");
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Swords className="w-6 h-6 text-blue-600" /> Trận giao hữu
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Duyệt kết quả và tính điểm</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 border border-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tạo trận
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-3">
                {/* Desktop tabs */}
                <div className="hidden sm:flex gap-1 bg-gray-100 rounded-xl p-1">
                    {STATUS_TABS.map(({ value, label, icon: Icon }) => {
                        const count = value ? statusCounts[value] ?? 0 : statusCounts.total ?? 0;
                        const showCount = value !== "pending_approval" && count > 0;
                        const isActive = activeTab === value;

                        return (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition
                                    ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}
                                `}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                                {showCount && (
                                    <span className="text-[10px] px-1.5 rounded-full bg-gray-200">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile dropdown */}
                <button
                    onClick={() => setShowStatusModal(true)}
                    className="sm:hidden flex-1 flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700"
                >
                    <span className="flex items-center gap-2">
                        {STATUS_TABS.find((x) => x.value === activeTab)?.label}
                        {(statusCounts[activeTab] ?? 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {statusCounts[activeTab]}
                            </span>
                        )}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                </button>

                <span className="text-sm text-gray-400 flex-shrink-0 ml-auto">{meta.total ?? 0} trận</span>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl h-32 animate-pulse bg-gray-100" />
                    ))
                ) : matches.length === 0 ? (
                    <div className="rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
                        <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>Không có trận nào</p>
                    </div>
                ) : (
                    matches.map((m) => {
                        const busy = actionId === m.id;
                        const canApprove = m.status === "pending_approval" || m.status === "pending_result";
                        const isHidden = hiddenMap[m.id] ?? false;
                        const hasScore =
                            (m.status === "approved" || m.status === "pending_approval") && m.sets?.length > 0;
                        const accent = STATUS_ACCENT[m.status] ?? "border-l-gray-200";

                        return (
                            <div
                                key={m.id}
                                className={`rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 ${accent} ${isHidden ? "opacity-60" : ""}`}
                            >
                                <div className="p-4 space-y-4">
                                    {isHidden && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-2.5 py-1 w-fit">
                                            <EyeOff className="w-3 h-3" />
                                            Đang ẩn với member
                                        </div>
                                    )}

                                    {/* Teams + Score */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <p className="text-[15px] font-semibold text-gray-400 tracking-wide">
                                                ĐỘI A
                                            </p>
                                            <PlayerRow p={m.player_a1} />
                                            {m.player_a2 && <PlayerRow p={m.player_a2} />}
                                        </div>

                                        <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 py-2 border-y sm:border-y-0 border-gray-50 text-center">
                                            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                                                {m.match_type === "doubles" ? (
                                                    <>
                                                        <Users className="w-3 h-3" /> Đôi
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trophy className="w-3 h-3" /> Đơn
                                                    </>
                                                )}
                                            </span>

                                            {hasScore ? (
                                                (() => {
                                                    const s = m.sets[0];
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`text-2xl sm:text-3xl font-black tabular-nums ${m.winner_team === "A" ? "text-green-600" : "text-gray-300"}`}
                                                            >
                                                                {s.score_a}
                                                            </span>
                                                            <span className="text-gray-300 text-lg">–</span>
                                                            <span
                                                                className={`text-2xl sm:text-3xl font-black tabular-nums ${m.winner_team === "B" ? "text-green-600" : "text-gray-300"}`}
                                                            >
                                                                {s.score_b}
                                                            </span>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <span className="text-gray-300 text-sm font-medium">VS</span>
                                            )}

                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${STATUS_BADGE[m.status] ?? ""}`}
                                            >
                                                {STATUS_LABEL[m.status]}
                                            </span>

                                            {m.status === "approved" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-green-500 bg-green-50 text-green-700 text-xs font-bold whitespace-nowrap">
                                                    🏆 Đội {m.winner_team} thắng
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-2">
                                            <p className="text-[15px] font-semibold text-gray-400 tracking-wide text-right">
                                                ĐỘI B
                                            </p>
                                            <PlayerRow p={m.player_b1} align="right" />
                                            {m.player_b2 && <PlayerRow p={m.player_b2} align="right" />}
                                        </div>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex items-center gap-3 text-xs text-gray-400 border-t border-gray-50 pt-3">
                                        {m.played_at && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(m.played_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                                            </span>
                                        )}
                                        {m.status === "rejected" && m.reject_reason && !m.reject_reason.includes("chưa") && (
                                            <span className="text-red-500 ml-auto truncate max-w-[240px]">
                                                {m.reject_reason}
                                            </span>
                                        )}
                                    </div>

                                    {/* Score / Reject inline forms */}
                                    {showScoreInput === m.id && (
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                                            <input
                                                type="number"
                                                min={0}
                                                value={scoreInputs[m.id]?.score_a ?? ""}
                                                onChange={(e) =>
                                                    setScoreInputs((s) => ({
                                                        ...s,
                                                        [m.id]: { ...s[m.id], score_a: e.target.value },
                                                    }))
                                                }
                                                className="input-field text-sm w-20 text-center"
                                                placeholder="Đội A"
                                                autoFocus
                                            />
                                            <span className="text-gray-300">–</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={scoreInputs[m.id]?.score_b ?? ""}
                                                onChange={(e) =>
                                                    setScoreInputs((s) => ({
                                                        ...s,
                                                        [m.id]: { ...s[m.id], score_b: e.target.value },
                                                    }))
                                                }
                                                className="input-field text-sm w-20 text-center"
                                                placeholder="Đội B"
                                            />
                                            <button
                                                onClick={() => handleConfirmScoreAndApprove(m.id)}
                                                disabled={busy}
                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg disabled:opacity-50 whitespace-nowrap"
                                            >
                                                Xác nhận duyệt
                                            </button>
                                            <button
                                                onClick={() => setShowScoreInput(null)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    )}

                                    {showReject === m.id && (
                                        <div className="flex gap-2 bg-gray-50 rounded-xl p-2.5">
                                            <input
                                                type="text"
                                                value={rejectReason[m.id] ?? ""}
                                                onChange={(e) =>
                                                    setRejectReason((r) => ({ ...r, [m.id]: e.target.value }))
                                                }
                                                className="input-field text-sm flex-1"
                                                placeholder="Lý do từ chối (bắt buộc)"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleReject(m.id)}
                                                disabled={busy}
                                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg disabled:opacity-50 whitespace-nowrap"
                                            >
                                                Xác nhận
                                            </button>
                                            <button
                                                onClick={() => setShowReject(null)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    )}

                                    {deleteId === m.id && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-2.5">
                                            <p className="text-xs text-red-600 flex-1">
                                                Xóa vĩnh viễn trận này? Hành động không thể hoàn tác.
                                            </p>
                                            <button
                                                onClick={() => handleDelete(m.id)}
                                                disabled={actionId === m.id}
                                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 whitespace-nowrap"
                                            >
                                                Xác nhận xóa
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(null)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Action bar */}
                                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
                                    <div className="flex items-center gap-2">
                                        {m.status !== "approved" && (
                                            <button
                                                onClick={() => setDeleteId(m.id)}
                                                disabled={actionId === m.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                title="Xóa vĩnh viễn trận đấu"
                                            >
                                                <Trash2 className="w-3 h-3" /> Xóa
                                            </button>
                                        )}
                                        {m.status === "approved" && (
                                            <button
                                                onClick={() => setRollbackId(m.id)}
                                                disabled={actionId === m.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-orange-200 bg-white text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                                title="Thu hồi kết quả, hủy tỉ số và thu hồi điểm"
                                            >
                                                <Undo2 className="w-3 h-3" /> Hoàn tác
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleToggleHidden(m.id)}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${isHidden
                                                ? "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                                                : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                                                }`}
                                            title={isHidden ? "Hiện lại với member" : "Ẩn khỏi member"}
                                        >
                                            {isHidden ? (
                                                <>
                                                    <RefreshCw className="w-3 h-3" /> Khôi phục
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="w-3 h-3" /> Ẩn
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {canApprove && showReject !== m.id && showScoreInput !== m.id && (
                                        <div className="flex gap-2">
                                            {m.status === "pending_approval" && (
                                                <button
                                                    onClick={() => setShowReject(m.id)}
                                                    disabled={busy}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleApproveClick(m)}
                                                disabled={busy}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 whitespace-nowrap"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {m.status === "pending_result" ? "Nhập tỉ số & Duyệt" : "Duyệt"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showCreateModal && (
                <CreateMatchModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        setTab("pending_result");
                        setPage(1);
                    }}
                />
            )}

            <ConfirmModal
                open={!!rollbackId}
                onClose={() => setRollbackId(null)}
                onConfirm={() => rollbackId && handleRollback(rollbackId)}
                title="Thu hồi kết quả trận đấu?"
                description={`Tỉ số sẽ bị xóa, trận về "Chờ kết quả".\nĐiểm rank + bao điểm đã cộng/trừ cho các người chơi sẽ bị thu hồi.\nMember sẽ nhận thông báo.`}
                confirmLabel="Xác nhận thu hồi"
                confirmColor="bg-orange-500 hover:bg-orange-600"
                loading={actionId === rollbackId}
            />

            {meta.total_pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Trang {meta.page}/{meta.total_pages} ({meta.total} trận)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page <= 1}
                            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= meta.total_pages}
                            className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {showStatusModal &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[999] bg-black/40 flex items-end sm:hidden animate-in fade-in"
                        onClick={() => setShowStatusModal(false)}
                    >
                        <div
                            className="w-full bg-white rounded-t-3xl p-5 shadow-xl animate-slide-up"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg">Lọc trạng thái</h3>
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="p-2 rounded-full hover:bg-gray-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {STATUS_TABS.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            setTab(value);
                                            setShowStatusModal(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${activeTab === value
                                            ? "bg-blue-50 text-blue-600"
                                            : "hover:bg-gray-50 text-gray-700"
                                            }`}
                                    >
                                        <span className="relative">
                                            <Icon className="w-5 h-5" />
                                            {value === "pending_approval" && (statusCounts[value] ?? 0) > 0 && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                                            )}
                                        </span>

                                        <span className="flex-1 text-left">{label}</span>

                                        {(statusCounts[value] ?? 0) > 0 && (
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COUNT_BADGE[value] ?? "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {statusCounts[value]}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
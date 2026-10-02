"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { ActionPhase, MorphButtonMatches } from "@/components/admin/matches/MorphButtonMatches";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_TABS = [
    { value: "", label: "Tất cả", icon: RefreshCw },
    { value: "pending_approval", label: "Chờ duyệt", icon: Hourglass },
    { value: "approved", label: "Đã duyệt", icon: CheckCircle2 },
    { value: "rejected", label: "Từ chối", icon: XCircle },
    { value: "pending_result", label: "Chờ kết quả", shortLabel: "Chờ KQ", icon: Clock },
];

const ALERT_TAB_VALUES = new Set(["pending_approval", "pending_result"]);

const STATUS_BADGE: Record<string, string> = {
    pending_opponent: "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
    pending_result: "bg-[var(--primary-soft)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
    pending_approval: "bg-[var(--warning-soft)] text-[var(--warning)] border-[color-mix(in_srgb,var(--warning)_30%,transparent)]",
    approved: "bg-[var(--success-soft)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]",
    rejected: "bg-[var(--danger-soft)] text-[var(--danger)] border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
};

const STATUS_COUNT_BADGE: Record<string, string> = {
    pending_approval: "bg-[var(--warning-soft)] text-[var(--warning)]",
    approved: "bg-[var(--success-soft)] text-[var(--success)]",
    rejected: "bg-[var(--danger-soft)] text-[var(--danger)]",
    pending_result: "bg-[var(--primary-soft)] text-[var(--primary)]",
    "": "bg-[var(--border-strong)] text-[var(--text)]",
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
    "Tân thủ": "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    "Phong trào": "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    "Cứng cựa": "bg-[var(--primary-soft)] text-[var(--primary)]",
    "Chủ lực": "bg-[var(--primary-soft)] text-[var(--primary)]",
    "Cao thủ": "bg-[var(--primary-soft)] text-[var(--primary)]",
    "Kiện tướng": "bg-[var(--purple-soft)] text-[var(--purple)]",
    "Đại Kiện Tướng": "bg-fuchsia-50 text-fuchsia-700",
    "Huyền Thoại": "bg-[var(--warning-soft)] text-[var(--warning)]",
};

const DEFAULT_TIER = "Tân thủ";

function getTier(p: any): string {
    const pr = p?.player_ranks;
    const tier = Array.isArray(pr) ? pr[0]?.tier : pr?.tier;
    return tier ?? DEFAULT_TIER;
}

function AlertDot({ count }: { count?: number }) {
    return (
        <>
            <style jsx global>{`
                @keyframes alertDotPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
                .alert-dot-core {
                    animation: alertDotPop 1s ease-in-out infinite;
                }
            `}</style>
            <span className="absolute -top-2 -right-2 flex items-center justify-center z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="alert-dot-core relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 ring-2 ring-white text-[10px] font-bold text-white leading-none">
                    {count}
                </span>
            </span>
        </>
    );
}

function PlayerRow({ p, position, align = "left" }: { p: any; position?: string; align?: "left" | "right" }) {
    if (!p) return null;
    const level = LEVEL_LABEL[p.level] ?? p.level;
    const tier = getTier(p);
    const tierCls = TIER_STYLE[tier] ?? "bg-[var(--surface-muted)] text-[var(--text-muted)]";
    const isRight = align === "right";

    return (
        <div className={`flex items-center gap-2 ${isRight ? "flex-row-reverse" : ""}`}>
            <div className="relative flex-shrink-0">
                {p.avatar_url ? (
                    <img
                        src={p.avatar_url}
                        alt={p.full_name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">
                        {p.full_name?.[0]?.toUpperCase()}
                    </div>
                )}
                {position && (
                    <span
                        className={`absolute -bottom-1 ${isRight ? "-left-1" : "-right-1"} w-4 h-4 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[8px] font-bold text-[var(--text-muted)]`}
                    >
                        {position}
                    </span>
                )}
            </div>
            <div className={`min-w-0 flex-1 ${isRight ? "text-right" : ""}`}>
                <p className="text-sm font-medium text-[var(--text)] truncate">{p.full_name}</p>
                <div
                    className={`flex flex-wrap items-center gap-1 mt-0.5 ${isRight ? "justify-end" : ""}`}
                >
                    {level && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--purple-soft)] text-[var(--purple)] leading-none whitespace-nowrap">
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
    const [statusModalVisible, setStatusModalVisible] = useState(false);

    const [approvePhase, setApprovePhase] = useState<Record<string, ActionPhase>>({});
    const [deletePhase, setDeletePhase] = useState<Record<string, ActionPhase>>({});
    const [rollbackPhase, setRollbackPhase] = useState<Record<string, ActionPhase>>({});

    const [approveConfirm, setApproveConfirm] = useState<{
        id: string;
        scoreA: number;
        scoreB: number;
    } | null>(null);

    const setPhase = (
        setter: React.Dispatch<React.SetStateAction<Record<string, ActionPhase>>>,
        id: string,
        phase: ActionPhase,
    ) => setter((prev) => ({ ...prev, [id]: phase }));

    const fetchStatusCounts = useCallback(async () => {
        try {
            const { data } = await matchesAdminApi.statusCounts();
            setStatusCounts(data ?? {});
        } catch { }
    }, []);

    const fetchMatches = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true);
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
            if (!opts?.silent) setLoading(false);
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

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    useEffect(() => {
        const scheduleRefresh = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchMatches({ silent: true });
                fetchStatusCounts();
            }, 250);
        };

        const channel = supabase
            .channel("matches-admin-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "friendly_matches" },
                scheduleRefresh,
            )
            .on("broadcast", { event: "match_created" }, scheduleRefresh)
            .on("broadcast", { event: "match_status_changed" }, scheduleRefresh)
            .on("broadcast", { event: "match_deleted" }, scheduleRefresh)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchMatches, fetchStatusCounts]);


    const handleApprove = async (
        id: string,
        scorePayload?: { score_a: number; score_b: number },
    ) => {
        setActionId(id);
        setPhase(setApprovePhase, id, "loading");
        try {
            const match = matches.find((m) => m.id === id);
            const nameById = new Map<string, string>();
            if (match) {
                [match.player_a1, match.player_a2, match.player_a3, match.player_b1, match.player_b2, match.player_b3]
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

            setPhase(setApprovePhase, id, "success");
            setShowScoreInput(null);
            fetchMatches({ silent: true });
            fetchStatusCounts();
            setTimeout(() => setPhase(setApprovePhase, id, "idle"), 1200);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Duyệt thất bại");
            setPhase(setApprovePhase, id, "idle");
        } finally {
            setActionId(null);
        }
    };

    const openStatusModal = () => {
        setShowStatusModal(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setStatusModalVisible(true)));
    };
    const closeStatusModal = () => {
        setStatusModalVisible(false);
        setTimeout(() => setShowStatusModal(false), 300);
    };

    const handleApproveClick = (m: any) => {
        if (m.status === "pending_result") {
            setShowScoreInput(m.id);
            return;
        }

        const s = m.sets?.[0];
        setApproveConfirm({
            id: m.id,
            scoreA: s?.score_a ?? m.score_a,
            scoreB: s?.score_b ?? m.score_b,
        });
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
        setShowScoreInput(null);
        setApproveConfirm({ id, scoreA, scoreB });
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
            fetchMatches({ silent: true });
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
        setPhase(setDeletePhase, id, "loading");
        try {
            await matchesAdminApi.delete(id);
            toast.success("🗑️ Đã xóa vĩnh viễn trận đấu");
            setPhase(setDeletePhase, id, "success");
            setDeleteId(null);

            setTimeout(() => {
                setMatches((prev) => prev.filter((m) => m.id !== id));
                setMeta((prev: any) => ({
                    ...prev,
                    total: Math.max((prev.total ?? 1) - 1, 0),
                }));
                setPhase(setDeletePhase, id, "idle");
            }, 600);

            fetchStatusCounts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Xóa thất bại");
            setPhase(setDeletePhase, id, "idle");
        } finally {
            setActionId(null);
        }
    };

    const handleRollback = async (id: string) => {
        setActionId(id);
        setPhase(setRollbackPhase, id, "loading");
        try {
            const { data } = await matchesAdminApi.rollback(id);
            toast.success(data.message ?? "↩️ Đã thu hồi kết quả trận đấu");
            setPhase(setRollbackPhase, id, "success");
            fetchMatches({ silent: true });
            fetchStatusCounts();
            setTimeout(() => {
                setRollbackId(null);
                setPhase(setRollbackPhase, id, "idle");
            }, 700);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Thu hồi thất bại");
            setPhase(setRollbackPhase, id, "idle");
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
                        <Swords className="w-6 h-6 text-[var(--primary)]" /> Trận giao hữu
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm mt-0.5">Duyệt kết quả và tính điểm</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 border border-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Tạo trận
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-wrap gap-2">
                    {STATUS_TABS.map(({ value, label, shortLabel, icon: Icon }) => {
                        const count = value ? statusCounts[value] ?? 0 : statusCounts.total ?? 0;
                        const showCount = count > 0;
                        const isActive = activeTab === value;
                        const needsAttention = ALERT_TAB_VALUES.has(value) && count > 0;

                        return (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors duration-200
                                    ${isActive
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200"
                                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                                    }
                                `}
                            >
                                {needsAttention && <AlertDot count={count} />}
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                {shortLabel ?? label}
                                {showCount && !needsAttention && (
                                    <span
                                        className={`text-[10px] px-1.5 rounded-full transition-colors duration-200 ${isActive ? "bg-[color-mix(in_srgb,var(--surface)_25%,transparent)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                                            }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={openStatusModal}
                    className="sm:hidden flex-1 flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text)]"
                >
                    <span className="relative flex items-center gap-2">
                        {ALERT_TAB_VALUES.has(activeTab) && (statusCounts[activeTab] ?? 0) > 0 && (
                            <AlertDot count={statusCounts[activeTab]} />
                        )}
                        {STATUS_TABS.find((x) => x.value === activeTab)?.label}
                        {(statusCounts[activeTab] ?? 0) > 0 && !ALERT_TAB_VALUES.has(activeTab) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
                                {statusCounts[activeTab]}
                            </span>
                        )}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                </button>

                <span className="text-sm text-[var(--text-faint)] flex-shrink-0 ml-auto">{meta.total ?? 0} trận</span>
            </div>

            <div className="space-y-3">
                {loading ? (
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl h-32 animate-pulse bg-[var(--surface-muted)]" />
                    ))
                ) : matches.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] py-16 text-center text-[var(--text-faint)]">
                        <Swords className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>Không có trận nào</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {matches.map((m) => {
                            const busy = actionId === m.id;
                            const canApprove = m.status === "pending_approval" || m.status === "pending_result";
                            const isHidden = hiddenMap[m.id] ?? false;
                            const hasScore =
                                (m.status === "approved" || m.status === "pending_approval") && m.sets?.length > 0;
                            const accent = STATUS_ACCENT[m.status] ?? "border-l-gray-200";

                            return (
                                <motion.div
                                    key={m.id}
                                    layout
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className={`rounded-2xl bg-[var(--surface)] border-l-4 ${accent} ${isHidden ? "opacity-60" : ""} overflow-hidden`}
                                    style={{
                                        boxShadow:
                                            "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.05)",
                                    }}
                                >
                                    <div className="p-4 space-y-4">
                                        {isHidden && (
                                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] bg-[var(--surface-muted)] border border-dashed border-[var(--border)] rounded-lg px-2.5 py-1 w-fit">
                                                <EyeOff className="w-3 h-3" />
                                                Đang ẩn với member
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
                                            <div className="flex-1 min-w-0 space-y-2.5">
                                                <p className="text-[15px] font-semibold text-[var(--text-faint)] tracking-wide">
                                                    ĐỘI A
                                                </p>
                                                <PlayerRow p={m.player_a1} />
                                                {m.player_a2 && <PlayerRow p={m.player_a2} />}
                                                {m.player_a3 && <PlayerRow p={m.player_a3} />}
                                            </div>

                                            <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0 py-2 sm:self-center border-y sm:border-y-0 border-[var(--border)] text-center">
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-faint)]">
                                                    {m.match_type === "triples" ? (
                                                        <>
                                                            <Users className="w-3 h-3" /> 3v3
                                                        </>
                                                    ) : m.match_type === "doubles" ? (
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
                                                                    className={`text-2xl sm:text-3xl font-black tabular-nums ${m.winner_team === "A" ? "text-[var(--success)]" : "text-[var(--text-faint)]"}`}
                                                                >
                                                                    {s.score_a}
                                                                </span>
                                                                <span className="text-[var(--text-faint)] text-lg">–</span>
                                                                <span
                                                                    className={`text-2xl sm:text-3xl font-black tabular-nums ${m.winner_team === "B" ? "text-[var(--success)]" : "text-[var(--text-faint)]"}`}
                                                                >
                                                                    {s.score_b}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <span className="text-[var(--text-faint)] text-sm font-medium">VS</span>
                                                )}

                                                <span
                                                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${STATUS_BADGE[m.status] ?? ""}`}
                                                >
                                                    {STATUS_LABEL[m.status]}
                                                </span>

                                                {m.status === "approved" && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-green-500 bg-[var(--success-soft)] text-[var(--success)] text-xs font-bold whitespace-nowrap">
                                                        🏆 Đội {m.winner_team} thắng
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-2.5">
                                                <p className="text-[15px] font-semibold text-[var(--text-faint)] tracking-wide text-right">
                                                    ĐỘI B
                                                </p>
                                                <PlayerRow p={m.player_b1} align="right" />
                                                {m.player_b2 && <PlayerRow p={m.player_b2} align="right" />}
                                                {m.player_b3 && <PlayerRow p={m.player_b3} align="right" />}
                                            </div>
                                        </div>

                                        {/* Meta row */}
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-faint)] border-t border-[var(--border)] pt-3">
                                            {m.played_at && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(m.played_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                                                </span>
                                            )}
                                            {m.status === "rejected" && m.reject_reason && !m.reject_reason.includes("chưa") && (
                                                <span className="text-[var(--danger)] ml-auto truncate max-w-[240px]">
                                                    {m.reject_reason}
                                                </span>
                                            )}
                                        </div>

                                        {showScoreInput === m.id && (
                                            <div className="flex items-center gap-2 bg-[var(--surface-muted)] rounded-xl p-2.5">
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
                                                <span className="text-[var(--text-faint)]">–</span>
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
                                                <MorphButtonMatches
                                                    phase={approvePhase[m.id] ?? "idle"}
                                                    label="Xác nhận duyệt"
                                                    idleClassName="bg-green-500 hover:bg-green-600 text-white"
                                                    idleWidthClass="w-[9.5rem]"
                                                    onClick={() => handleConfirmScoreAndApprove(m.id)}
                                                    disabled={busy}
                                                />
                                                <button
                                                    onClick={() => setShowScoreInput(null)}
                                                    className="px-3 py-1.5 bg-[var(--surface-muted)] hover:bg-[var(--border-strong)] text-[var(--text-muted)] text-sm rounded-lg"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        )}

                                        {showReject === m.id && (
                                            <div className="flex gap-2 bg-[var(--surface-muted)] rounded-xl p-2.5">
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
                                                    className="px-3 py-1.5 bg-[var(--surface-muted)] hover:bg-[var(--border-strong)] text-[var(--text-muted)] text-sm rounded-lg"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        )}

                                        {deleteId === m.id && (
                                            <div className="flex items-center gap-2 bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] rounded-xl p-2.5">
                                                <p className="text-xs text-[var(--danger)] flex-1">
                                                    Xóa vĩnh viễn trận này? Hành động không thể hoàn tác.
                                                </p>
                                                <MorphButtonMatches
                                                    phase={deletePhase[m.id] ?? "idle"}
                                                    label="Xác nhận xóa"
                                                    idleClassName="bg-red-500 hover:bg-red-600 text-white"
                                                    idleWidthClass="w-[8rem]"
                                                    onClick={() => handleDelete(m.id)}
                                                    disabled={actionId === m.id}
                                                />
                                                <button
                                                    onClick={() => setDeleteId(null)}
                                                    className="px-3 py-1.5 bg-[var(--surface-muted)] hover:bg-[var(--border-strong)] text-[var(--text-muted)] text-xs rounded-lg"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)] rounded-b-2xl">
                                        <div className="flex items-center gap-2">
                                            {m.status === "rejected" && (
                                                <MorphButtonMatches
                                                    phase={deletePhase[m.id] ?? "idle"}
                                                    idleIcon={<Trash2 className="w-3 h-3" />}
                                                    label="Xóa"
                                                    idleClassName="border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                                                    idleWidthClass="w-[5rem]"
                                                    onClick={() => setDeleteId(m.id)}
                                                    disabled={actionId === m.id}
                                                />
                                            )}

                                            {m.status === "approved" && (
                                                <>
                                                    {/* <MorphButtonMatches
                                                        phase={rollbackPhase[m.id] ?? "idle"}
                                                        idleIcon={<Undo2 className="w-3 h-3" />}
                                                        label="Hoàn tác"
                                                        idleClassName="border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--surface)] text-[var(--warning)] hover:bg-[var(--warning-soft)]"
                                                        idleWidthClass="w-[6.5rem]"
                                                        onClick={() => setRollbackId(m.id)}
                                                        disabled={actionId === m.id}
                                                    /> */}
                                                    <MorphButtonMatches
                                                        phase={rollbackPhase[m.id] ?? "idle"}
                                                        idleIcon={<XCircle className="w-3 h-3" />}
                                                        label="Huỷ tỉ số"
                                                        idleClassName="border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                                                        idleWidthClass="w-[6.5rem]"
                                                        onClick={() => setRollbackId(m.id)}
                                                        disabled={actionId === m.id}
                                                    />
                                                </>
                                            )}

                                            {(m.status === "rejected") && (
                                                <button
                                                    onClick={() => handleToggleHidden(m.id)}
                                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${isHidden
                                                        ? "bg-[var(--primary-soft)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)] text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                                                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-faint)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-muted)]"
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
                                            )}
                                        </div>

                                        {canApprove && showReject !== m.id && showScoreInput !== m.id && (
                                            <div className="flex gap-2">
                                                {m.status === "pending_approval" && (
                                                    <button
                                                        onClick={() => setShowReject(m.id)}
                                                        disabled={busy}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-medium rounded-lg disabled:opacity-50 whitespace-nowrap"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                    </button>
                                                )}
                                                <MorphButtonMatches
                                                    phase={approvePhase[m.id] ?? "idle"}
                                                    idleIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                                    label={m.status === "pending_result" ? "Nhập tỉ số & Duyệt" : "Duyệt"}
                                                    idleClassName="bg-green-500 hover:bg-green-600 text-white"
                                                    idleWidthClass={m.status === "pending_result" ? "w-[10.5rem]" : "w-[6rem]"}
                                                    onClick={() => handleApproveClick(m)}
                                                    disabled={busy}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                            );
                        })}
                    </AnimatePresence>
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
                open={!!approveConfirm}
                onClose={() => setApproveConfirm(null)}
                onConfirm={() => {
                    if (!approveConfirm) return;
                    const m = matches.find((x) => x.id === approveConfirm.id);
                    const payload =
                        m?.status === "pending_result"
                            ? { score_a: approveConfirm.scoreA, score_b: approveConfirm.scoreB }
                            : undefined;
                    handleApprove(approveConfirm.id, payload);
                    setApproveConfirm(null);
                }}
                title="Xác nhận duyệt kết quả?"
                description={`Tỉ số: ${approveConfirm?.scoreA ?? ""} – ${approveConfirm?.scoreB ?? ""}\nBạn có đồng ý với kết quả này? Điểm rank sẽ được cộng/trừ cho các người chơi ngay sau khi duyệt.`}
                confirmLabel="Đồng ý & Duyệt"
                confirmColor="bg-green-500 hover:bg-green-600"
                phase={approveConfirm ? approvePhase[approveConfirm.id] ?? "idle" : "idle"}
            />

            <ConfirmModal
                open={!!rollbackId}
                onClose={() => setRollbackId(null)}
                onConfirm={() => rollbackId && handleRollback(rollbackId)}
                title="Thu hồi kết quả trận đấu?"
                description={`Tỉ số sẽ bị xóa, trận về "Chờ kết quả".\nĐiểm rank + bao điểm đã cộng/trừ cho các người chơi sẽ bị thu hồi.\nMember sẽ nhận thông báo.`}
                confirmLabel="Xác nhận thu hồi"
                confirmColor="bg-orange-500 hover:bg-orange-600"
                phase={rollbackId ? rollbackPhase[rollbackId] ?? "idle" : "idle"}
            />

            {meta.total_pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-muted)]">
                        Trang {meta.page}/{meta.total_pages} ({meta.total} trận)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page <= 1}
                            className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-hover)]"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= meta.total_pages}
                            className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-hover)]"
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
                        className="fixed inset-0 z-[999] flex items-end sm:hidden"
                        style={{
                            background: statusModalVisible ? "var(--overlay)" : "rgba(0,0,0,0)",
                            transition: "background 0.3s ease",
                        }}
                        onClick={closeStatusModal}
                    >
                        <div
                            className="w-[92%] mx-auto bg-[var(--surface)] rounded-t-3xl p-5 shadow-xl"
                            style={{
                                transform: statusModalVisible ? "translateY(0)" : "translateY(100%)",
                                opacity: statusModalVisible ? 1 : 0,
                                transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease",
                                paddingBottom: "env(safe-area-inset-bottom)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg">Lọc trạng thái</h3>
                                <button
                                    onClick={closeStatusModal}   // 👈 đổi
                                    className="p-2 rounded-full hover:bg-[var(--surface-hover)]"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {STATUS_TABS.map(({ value, label, icon: Icon }) => {
                                    const count = value ? statusCounts[value] ?? 0 : statusCounts.total ?? 0;
                                    const isActive = activeTab === value;
                                    const needsAttention = ALERT_TAB_VALUES.has(value) && count > 0;

                                    return (
                                        <button
                                            key={value}
                                            onClick={() => {
                                                setTab(value);
                                                closeStatusModal();
                                            }}
                                            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${isActive ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "hover:bg-[var(--surface-hover)] text-[var(--text)]"
                                                }`}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0" />

                                            <span className="flex-1 flex items-center">
                                                <span className={`relative inline-block ${needsAttention ? "pr-4" : ""}`}>
                                                    {label}
                                                    {needsAttention && <AlertDot count={count} />}
                                                </span>
                                            </span>

                                            {count > 0 && !needsAttention && (
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COUNT_BADGE[value] ?? "bg-[var(--border-strong)] text-[var(--text)]"}`}
                                                >
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
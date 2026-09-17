"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { activitiesApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { createPortal } from "react-dom";

const HIDE_SCROLLBAR_CLASS =
    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function getMatchStatus(m: any): "completed" | "ongoing" | "pending" {
    if (m.status === "completed") return "completed";
    if (m.status === "ongoing") return "ongoing";
    return "pending";
}

function scoreColorClass(mine: number, other: number) {
    if (mine > other) return "text-emerald-600";
    if (mine < other) return "text-red-400";
    return "text-gray-900";
}

function MatchStatusPill({ status }: { status: "completed" | "ongoing" | "pending" }) {
    const cfg = {
        completed: { color: "#16a34a", bg: "#f0fdf4", label: "Đã xong", icon: "✓" },
        ongoing: { color: "#d97706", bg: "#fffbeb", label: "Đang thi đấu", icon: "●" },
        pending: { color: "#9ca3af", bg: "#f9fafb", label: "Chưa thi đấu", icon: "○" },
    }[status];

    return (
        <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color }}
        >
            <span className="text-[10px]">{cfg.icon}</span>
            {cfg.label}
        </span>
    );
}

function MemberBadge() {
    return (
        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
            Bạn
        </span>
    );
}

function ViewTeamMembersColumn({
    team,
    myUserId,
    colorsMap,
    registerRef,
}: {
    team: any;
    myUserId?: string;
    colorsMap: Record<string, { color: string; label: string }[]>;
    registerRef?: (memberId: string, el: HTMLDivElement | null) => void;
}) {
    return (
        <div>
            <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-xl mb-2.5">
                <p className="font-semibold text-gray-900 text-sm truncate">{team?.name ?? "—"}</p>
                <p className="text-xs text-gray-400">{team?.members?.length ?? 0} người</p>
            </div>

            <div className="space-y-2.5">
                {(team?.members ?? []).map((m: any) => {
                    const isMe = !!myUserId && m.user_id === myUserId;
                    const memberColors = colorsMap[m.id] ?? [];
                    const primaryColor = memberColors[0]?.color;

                    return (
                        <div
                            key={m.id}
                            ref={(el) => registerRef?.(m.id, el)}
                            style={
                                !isMe && primaryColor
                                    ? {
                                        borderColor: primaryColor,
                                        boxShadow: `0 2px 10px -3px ${primaryColor}66, 0 1px 2px rgba(0,0,0,0.04)`,
                                    }
                                    : undefined
                            }
                            className={`w-[78%] sm:w-full px-3.5 py-3 rounded-xl border-2 text-sm bg-white transition-all duration-200 ease-out
                                ${!primaryColor && !isMe ? "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]" : ""}
                                ${isMe
                                    ? "border-blue-400 bg-blue-50/40"
                                    : primaryColor
                                        ? ""
                                        : "border-gray-100"
                                }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 mb-1.5">
                                <img
                                    src={
                                        m.users?.avatar_url ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(m.users?.full_name ?? m.guest_full_name ?? "?")}`
                                    }
                                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                    alt=""
                                />
                                <span className="text-gray-800 font-medium break-words leading-snug min-w-0 flex-1">
                                    {m.users?.full_name ?? m.guest_full_name ?? "—"}
                                </span>
                                {isMe && <MemberBadge />}
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap pl-9">
                                <span
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.role === "nam" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                                        }`}
                                >
                                    {m.role === "nam" ? "Nam" : "Nữ"}
                                </span>
                                <span
                                    className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
                                    style={{
                                        background: m.level === "A" ? "#e6f7ee" : m.level === "B+" ? "#efe7fd" : m.level === "B" ? "#fff2df" : m.level === "C" ? "#e3f7fb" : "#f3f4f6",
                                        color: m.level === "A" ? "#1a9e5c" : m.level === "B+" ? "#7c3aed" : m.level === "B" ? "#c8790f" : m.level === "C" ? "#0f9db0" : "#6b7280",
                                    }}
                                >
                                    {m.level ?? "—"}
                                </span>
                            </div>

                            {memberColors.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap mt-1.5 pl-9">
                                    {memberColors.map((c, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                                            style={{ background: c.color }}
                                        >
                                            {c.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {(team?.members ?? []).length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-3">Chưa có thành viên</p>
                )}
            </div>
        </div>
    );
}

type ConnectorSegment = {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    kind: "stub" | "bar" | "bridge";
    color: string;
    dashed: boolean;
    label?: string;
    curveBias?: number;
    labelDY?: number;
    labelMaxX?: number;
};

type ConnectorPoint = { key: string; x: number; y: number; color: string };

function buildGroupLines(
    team1Ids: string[],
    team2Ids: string[],
    getPoint: (id: string, side: "left" | "right") => { x: number; y: number } | null,
    opts: {
        keyPrefix: string;
        color: string;
        dashed: boolean;
        label?: string;
        inset?: number;
        curveBias?: number;
        labelDY?: number;
        labelMaxX?: number;
        team1Side?: "left" | "right";
        team2Side?: "left" | "right";
        team1Direction?: 1 | -1;
        team2Direction?: 1 | -1;
    },
): { segments: ConnectorSegment[]; points: ConnectorPoint[] } {
    const segments: ConnectorSegment[] = [];
    const points: ConnectorPoint[] = [];

    const team1Side = opts.team1Side ?? "right";
    const team2Side = opts.team2Side ?? "left";
    const team1Direction = opts.team1Direction ?? 1;
    const team2Direction = opts.team2Direction ?? -1;

    const p1 = team1Ids
        .map((id) => ({ id, pt: getPoint(id, team1Side) }))
        .filter((x) => x.pt) as { id: string; pt: { x: number; y: number } }[];
    const p2 = team2Ids
        .map((id) => ({ id, pt: getPoint(id, team2Side) }))
        .filter((x) => x.pt) as { id: string; pt: { x: number; y: number } }[];

    p1.forEach(({ id, pt }) =>
        points.push({ key: `${opts.keyPrefix}-p1-${id}`, x: pt.x, y: pt.y, color: opts.color }),
    );
    p2.forEach(({ id, pt }) =>
        points.push({ key: `${opts.keyPrefix}-p2-${id}`, x: pt.x, y: pt.y, color: opts.color }),
    );

    if (p1.length === 0 && p2.length === 0) return { segments, points };

    const inset = opts.inset ?? 22;

    const buildSide = (pts: { x: number; y: number }[], direction: 1 | -1, sidePrefix: string) => {
        if (pts.length === 0) return null;

        const barX = pts[0].x + direction * inset;
        const ys = pts.map((p) => p.y);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const midY = (minY + maxY) / 2;

        pts.forEach((pt, i) => {
            segments.push({
                key: `${opts.keyPrefix}-${sidePrefix}-stub-${i}`,
                x1: pt.x, y1: pt.y, x2: barX, y2: pt.y,
                kind: "stub", color: opts.color, dashed: opts.dashed,
            });
        });

        if (pts.length > 1) {
            segments.push({
                key: `${opts.keyPrefix}-${sidePrefix}-bar`,
                x1: barX, y1: minY, x2: barX, y2: maxY,
                kind: "bar", color: opts.color, dashed: opts.dashed,
            });
        }

        return { barX, midY };
    };

    const side1 = buildSide(p1.map((x) => x.pt), team1Direction, "t1");
    const side2 = buildSide(p2.map((x) => x.pt), team2Direction, "t2");

    if (side1 && side2) {
        segments.push({
            key: `${opts.keyPrefix}-bridge`,
            x1: side1.barX, y1: side1.midY, x2: side2.barX, y2: side2.midY,
            kind: "bridge", color: opts.color, dashed: opts.dashed,
            label: opts.label,
            curveBias: opts.curveBias ?? 0,
            labelDY: opts.labelDY ?? 0,
            labelMaxX: opts.labelMaxX,
        });
    }

    return { segments, points };
}

function ConnectorSegmentLine({ segment }: { segment: ConnectorSegment }) {
    if (segment.kind === "stub") {
        return (
            <line
                x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2}
                stroke={segment.color}
                strokeWidth={2}
                strokeDasharray={segment.dashed ? "4 4" : undefined}
                strokeLinecap="round"
                opacity={0.9}
            />
        );
    }

    if (segment.kind === "bar") {
        return (
            <line
                x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2}
                stroke={segment.color}
                strokeWidth={3}
                strokeDasharray={segment.dashed ? "6 4" : undefined}
                strokeLinecap="round"
            />
        );
    }

    const dx = segment.x2 - segment.x1;
    const bias = (segment.curveBias ?? 0) * Math.min(24, Math.abs(dx) * 0.3);
    const midX = (segment.x1 + segment.x2) / 2 + bias;
    const path = `M ${segment.x1} ${segment.y1} C ${midX} ${segment.y1}, ${midX} ${segment.y2}, ${segment.x2} ${segment.y2}`;

    const rawLabelY = (segment.y1 + segment.y2) / 2 + (segment.labelDY ?? 0);

    const charWidth = 7.2;
    const paddingX = 8;
    const rectHalfWidth = segment.label ? (segment.label.length * charWidth) / 2 + paddingX : 0;

    let labelX = midX;
    if (segment.labelMaxX != null && segment.label) {
        const minAllowed = rectHalfWidth + 6;
        const maxAllowed = segment.labelMaxX - rectHalfWidth - 6;
        labelX = Math.min(Math.max(midX, minAllowed), Math.max(minAllowed, maxAllowed));
    }

    return (
        <g>
            <path d={path} fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke={segment.color}
                strokeWidth={2.5}
                strokeDasharray={segment.dashed ? "6 5" : undefined}
                strokeLinecap="round"
            />
            {segment.label && (
                <g transform={`translate(${labelX}, ${rawLabelY})`}>
                    <rect x={-rectHalfWidth} y={-9} width={rectHalfWidth * 2} height={18} rx={9} fill={segment.color} />
                    <text x={0} y={4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
                        {segment.label}
                    </text>
                </g>
            )}
        </g>
    );
}

function sortMembersByLineupOrder(
    members: any[],
    lineups: any[],
    side: "team1" | "team2",
) {
    const orderMap = new Map<string, number>();
    let idx = 0;
    for (const l of lineups) {
        const ids: string[] = side === "team1" ? (l.team1_player_ids ?? []) : (l.team2_player_ids ?? []);
        for (const id of ids) {
            if (!orderMap.has(id)) orderMap.set(id, idx++);
        }
    }
    return [...members].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return ai - bi;
    });
}

function MatchLineupsViewModal({
    matchId,
    team1,
    team2,
    matchContents,
    myUserId,
    matchStatus = "pending",
    onClose,
}: {
    matchId: string;
    team1: any;
    team2: any;
    matchContents: { id: string; label: string }[];
    myUserId?: string;
    matchStatus?: "completed" | "ongoing" | "pending";
    onClose: () => void;
}) {
    const [lineups, setLineups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 639px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    const [connectors, setConnectors] = useState<{ segments: ConnectorSegment[]; points: ConnectorPoint[] }>({
        segments: [],
        points: [],
    });

    const gridRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const memberElRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const registerMemberRef = (id: string, el: HTMLDivElement | null) => {
        if (el) memberElRefs.current.set(id, el);
        else memberElRefs.current.delete(id);
    };

    const recalcLines = () => {
        const container = gridRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();

        const getPoint = (id: string, side: "left" | "right") => {
            const el = memberElRefs.current.get(id);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {
                x: (side === "right" ? rect.right : rect.left) - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top,
            };
        };

        const allSegments: ConnectorSegment[] = [];
        const allPoints: ConnectorPoint[] = [];

        const sideOpts = isMobile
            ? { team1Side: "right" as const, team2Side: "right" as const, team1Direction: 1 as const, team2Direction: 1 as const }
            : { team1Side: "right" as const, team2Side: "left" as const, team1Direction: 1 as const, team2Direction: -1 as const };

        const labelMaxX = containerRect.width;

        lineups.forEach((l, idx) => {
            const color = MATCH_CONTENT_COLOR_LOCAL[l.content_label] ?? "#1c3d5a";
            const inset = 22 + idx * (isMobile ? 12 : 16);
            const curveBias = idx % 2 === 0 ? -1 : 1;
            const labelDY = (idx - (lineups.length - 1) / 2) * 22;
            const { segments, points } = buildGroupLines(
                l.team1_player_ids ?? [],
                l.team2_player_ids ?? [],
                getPoint,
                {
                    keyPrefix: `saved-${l.content_id}`,
                    color,
                    dashed: false,
                    label: l.content_label,
                    inset,
                    curveBias,
                    labelDY,
                    labelMaxX,
                    ...sideOpts,
                },
            );
            allSegments.push(...segments);
            allPoints.push(...points);
        });

        setConnectors({ segments: allSegments, points: allPoints });
    };

    useEffect(() => {
        const raf = requestAnimationFrame(recalcLines);
        return () => cancelAnimationFrame(raf);
    }, [lineups, isMobile]);

    useEffect(() => {
        const onUpdate = () => recalcLines();
        window.addEventListener("resize", onUpdate);
        const scrollEl = scrollRef.current;
        scrollEl?.addEventListener("scroll", onUpdate, { passive: true });
        return () => {
            window.removeEventListener("resize", onUpdate);
            scrollEl?.removeEventListener("scroll", onUpdate);
        };
    }, [lineups, isMobile]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 180);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const { data } = await activitiesApi.getMatchLineups(matchId);
                if (mounted) setLineups(data.lineups ?? []);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [matchId]);

    const memberName = (team: any, id: string) => {
        const m = (team?.members ?? []).find((x: any) => x.id === id);
        return m?.users?.full_name ?? m?.guest_full_name ?? "—";
    };

    const memberIsMe = (team: any, id: string) => {
        const m = (team?.members ?? []).find((x: any) => x.id === id);
        return !!myUserId && m?.user_id === myUserId;
    };

    const MATCH_CONTENT_COLOR_LOCAL: Record<string, string> = {
        "Đôi Nam": "#1c3d5a",
        "Đôi Nam - Nữ": "#7c3aed",
        "Đôi Nữ": "#c2185b",
        "Đơn Nam": "#374151",
        "Đơn Nữ": "#db2777",
        "3vs3": "#0f766e",
    };

    const colorsMap = useMemo(() => {
        const map: Record<string, { color: string; label: string }[]> = {};
        for (const l of lineups) {
            const color = MATCH_CONTENT_COLOR_LOCAL[l.content_label] ?? "#1c3d5a";
            for (const id of l.team1_player_ids ?? []) {
                if (!map[id]) map[id] = [];
                map[id].push({ color, label: l.content_label });
            }
            for (const id of l.team2_player_ids ?? []) {
                if (!map[id]) map[id] = [];
                map[id].push({ color, label: l.content_label });
            }
        }
        return map;
    }, [lineups]);

    const sortedTeam1 = useMemo(() => {
        if (!team1) return team1;
        return { ...team1, members: sortMembersByLineupOrder(team1.members ?? [], lineups, "team1") };
    }, [team1, lineups]);

    const sortedTeam2 = useMemo(() => {
        if (!team2) return team2;
        return { ...team2, members: sortMembersByLineupOrder(team2.members ?? [], lineups, "team2") };
    }, [team2, lineups]);

    return typeof document === "undefined"
        ? null
        : createPortal(
            <div
                className={`fixed inset-0 z-[240] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
                onMouseDown={(e) => e.target === e.currentTarget}
            >
                <div
                    className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
                        }`}
                >
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 flex-shrink-0">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                            {team1?.name} <span className="text-gray-300 font-normal mx-1.5">vs</span> {team2?.name}
                        </h3>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0"
                        >
                            ✕
                        </button>
                    </div>

                    <div ref={scrollRef} className={`p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-5 ${HIDE_SCROLLBAR_CLASS}`}>
                        {matchContents.length > 0 && (
                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Đường nối màu thể hiện các vận động viên đã được ghép cùng nhau thi đấu ở từng nội dung.
                                </p>
                            </div>
                        )}

                        <div
                            ref={gridRef}
                            className="relative grid grid-cols-1 sm:[grid-template-columns:220px_1fr_220px] gap-y-10 sm:gap-y-0 sm:gap-x-0 items-start"
                        >
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={{ overflow: "visible", zIndex: 5 }}
                            >
                                {connectors.segments.map((s) => (
                                    <ConnectorSegmentLine key={s.key} segment={s} />
                                ))}
                                {connectors.points.map((p) => (
                                    <circle key={p.key} cx={p.x} cy={p.y} r={3.5} fill={p.color} />
                                ))}
                            </svg>

                            <div className="w-full sm:w-[220px]">
                                <ViewTeamMembersColumn
                                    team={sortedTeam1}
                                    myUserId={myUserId}
                                    colorsMap={colorsMap}
                                    registerRef={registerMemberRef}
                                />
                            </div>

                            <div className="hidden sm:block" />

                            <div className="w-full sm:w-[220px]">
                                <ViewTeamMembersColumn
                                    team={sortedTeam2}
                                    myUserId={myUserId}
                                    colorsMap={colorsMap}
                                    registerRef={registerMemberRef}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2 gap-2">
                                <h4 className="text-sm font-bold text-gray-900">Đội hình thi đấu</h4>
                                <MatchStatusPill status={matchStatus} />
                            </div>

                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                                </div>
                            ) : lineups.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-1.5 py-8 border border-dashed border-gray-200 rounded-xl">
                                    <Users className="w-6 h-6 text-gray-300" />
                                    <p className="text-xs text-gray-400">Chưa có đội hình cho nội dung nào</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {lineups.map((l) => {
                                        const color = MATCH_CONTENT_COLOR_LOCAL[l.content_label] ?? "#1c3d5a";
                                        return (
                                            <div
                                                key={l.content_id}
                                                className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
                                                <div className="pl-4 pr-3.5 py-3">
                                                    <span
                                                        className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full text-white mb-2.5"
                                                        style={{ background: color }}
                                                    >
                                                        {l.content_label}
                                                    </span>

                                                    <div className="space-y-1.5">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[10px] font-semibold text-gray-400 mt-1 w-14 flex-shrink-0 truncate">
                                                                {team1?.name}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                                                {l.team1_player_ids.map((id: string) => (
                                                                    <span
                                                                        key={id}
                                                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5"
                                                                    >
                                                                        {memberName(team1, id)}
                                                                        {memberIsMe(team1, id) && <MemberBadge />}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[10px] font-semibold text-gray-400 mt-1 w-14 flex-shrink-0 truncate">
                                                                {team2?.name}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                                                {l.team2_player_ids.map((id: string) => (
                                                                    <span
                                                                        key={id}
                                                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5"
                                                                    >
                                                                        {memberName(team2, id)}
                                                                        {memberIsMe(team2, id) && <MemberBadge />}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
            </div>,
            document.body,
        );
}

export default function TournamentMatchDetailPage() {
    const params = useParams<{ id: string; matchId: string }>();
    const id = params?.id;
    const matchId = params?.matchId;
    const router = useRouter();

    const myUserId = useAuthStore((s) => s.user?.id);

    const [activity, setActivity] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [showLineupsModal, setShowLineupsModal] = useState(false);

    const load = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!id || !matchId) return;
            const silent = opts?.silent ?? false;
            if (!silent) setLoading(true);
            try {
                const [{ data: act }, { data: teamsData }, { data: scheduleData }] = await Promise.all([
                    activitiesApi.get(id),
                    activitiesApi.getTournamentTeams(id),
                    activitiesApi.getTournamentSchedule(id),
                ]);
                setActivity(act);
                setTeams(teamsData.teams ?? []);
                const found = (scheduleData.matches ?? []).find((m: any) => m.id === matchId);
                if (found) {
                    setMatch(found);
                    setNotFound(false);
                } else {
                    setNotFound(true);
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [id, matchId],
    );

    useEffect(() => {
        load();
    }, [load]);

    const loadRef = useRef(load);
    useEffect(() => {
        loadRef.current = load;
    }, [load]);

    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`tournament-schedule:${id}`)
            .on("broadcast", { event: "schedule_changed" }, () => {
                loadRef.current({ silent: true });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const contentScores: { content_id: string; label: string; score1: number; score2: number }[] =
        match?.content_scores ?? [];


    const teamById = useMemo(() => {
        const map = new Map<string, any>();
        teams.forEach((t) => map.set(t.id, t));
        return map;
    }, [teams]);

    const matchContents: { id: string; label: string }[] = activity?.detail?.rules?.match_contents ?? [];

    const dateLabel = match?.scheduled_at
        ? format(new Date(match.scheduled_at), "dd/MM/yyyy", { locale: vi })
        : null;

    const metaParts = match
        ? [`Lượt ${match.round_number}`, match.court_number ? `Sân ${match.court_number}` : null, dateLabel].filter(
            Boolean,
        )
        : [];

    const isCompleted = match?.status === "completed";
    const team1Won = isCompleted && match.team1_score > match.team2_score;
    const isDraw = isCompleted && match.team1_score === match.team2_score;

    return (
        <div className="min-h-screen bg-[#F4F6FA]">
            <div
                className="sticky top-0 z-30"
                style={{
                    background: "rgba(244,246,250,0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    paddingTop: "env(safe-area-inset-top)",
                }}
            >
                <div className="max-w-lg lg:max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-base font-bold text-gray-900 truncate flex-1">Chi tiết trận đấu</h1>
                    {match && (
                        <button
                            onClick={() => setShowLineupsModal(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-full px-3 py-1.5 transition-colors flex-shrink-0"
                        >
                            <Users className="w-3.5 h-3.5" /> Xem trận
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                    </div>
                ) : notFound || !match ? (
                    <div className="bg-white rounded-2xl py-16 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 text-sm">Không tìm thấy trận đấu</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-gray-900">{match.team1?.name ?? "—"}</span>
                            <span className="text-xs text-gray-300 font-medium">vs</span>
                            <span className="text-base font-bold text-gray-900">{match.team2?.name ?? "—"}</span>
                        </div>
                        {metaParts.length > 0 && (
                            <p className="text-center text-xs text-gray-400 mt-1 mb-5">{metaParts.join(" · ")}</p>
                        )}

                        {contentScores.length > 0 && (
                            <div className="space-y-3 mb-5">
                                {contentScores.map((cs) => (
                                    <div key={cs.content_id} className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-semibold text-gray-600">{cs.label}</span>
                                        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 min-w-[128px] justify-center">
                                            <span className={`text-2xl font-black tabular-nums ${scoreColorClass(cs.score1, cs.score2)}`}>
                                                {cs.score1}
                                            </span>
                                            <span className="text-gray-300 font-semibold">-</span>
                                            <span className={`text-2xl font-black tabular-nums ${scoreColorClass(cs.score2, cs.score1)}`}>
                                                {cs.score2}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isCompleted && (
                            <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4">
                                <p className="text-xs font-semibold text-blue-500 mb-1">Tổng điểm</p>
                                <div className="flex items-center justify-center gap-4">
                                    <span className={`text-4xl font-black tabular-nums ${scoreColorClass(match.team1_score, match.team2_score)}`}>
                                        {match.team1_score}
                                    </span>
                                    <span className="text-gray-300 font-semibold text-2xl">-</span>
                                    <span className={`text-4xl font-black tabular-nums ${scoreColorClass(match.team2_score, match.team1_score)}`}>
                                        {match.team2_score}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            {isCompleted ? (
                                isDraw ? (
                                    <span
                                        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                                        style={{ background: "#f9fafb", color: "#9ca3af" }}
                                    >
                                        Hoà
                                    </span>
                                ) : (
                                    <span
                                        className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full"
                                        style={{ background: "#f0fdf4", color: "#16a34a" }}
                                    >
                                        <span>✓</span>
                                        {team1Won ? match.team1?.name : match.team2?.name} thắng
                                    </span>
                                )
                            ) : (
                                <MatchStatusPill status={getMatchStatus(match)} />
                            )}
                        </div>
                    </div>
                )}


                {showLineupsModal && match && (
                    <MatchLineupsViewModal
                        matchId={match.id}
                        team1={teamById.get(match.team1?.id) ?? match.team1}
                        team2={teamById.get(match.team2?.id) ?? match.team2}
                        matchContents={matchContents}
                        myUserId={myUserId}
                        matchStatus={getMatchStatus(match)}
                        onClose={() => setShowLineupsModal(false)}
                    />
                )}
            </div>
        </div>
    );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Home, Loader2, Trophy, Users } from "lucide-react";
import { activitiesApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { createPortal } from "react-dom";

type Match = any;
type Round = { round_number: number; bye_team_name: string | null; matches: Match[] };


const HIDE_SCROLLBAR_CLASS =
    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function getMatchStatus(m: any): "completed" | "ongoing" | "pending" {
    if (m.status === "completed") return "completed";
    if (m.status === "ongoing") return "ongoing";
    return "pending";
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
                            className={`w-full px-3.5 py-3 rounded-xl border-2 text-sm bg-white transition-all duration-200 ease-out
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

    const [activeTeamTab, setActiveTeamTab] = useState<"team1" | "team2">("team1");

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

                    {isMobile && (
                        <div className="px-4 pt-3 pb-3 space-y-3 border-b border-gray-100 flex-shrink-0">
                            {matchContents.length > 0 && (
                                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Chuyển tab để xem thành viên từng đội. Vận động viên cùng nhãn màu là được ghép thi đấu chung nội dung.
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTeamTab("team1")}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTeamTab === "team1" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500"
                                        }`}
                                >
                                    {team1?.name}
                                </button>
                                <button
                                    onClick={() => setActiveTeamTab("team2")}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTeamTab === "team2" ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500"
                                        }`}
                                >
                                    {team2?.name}
                                </button>
                            </div>
                        </div>
                    )}


                    <div ref={scrollRef} className={`p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-5 ${HIDE_SCROLLBAR_CLASS}`}>

                        {isMobile ? (
                            <ViewTeamMembersColumn
                                team={activeTeamTab === "team1" ? sortedTeam1 : sortedTeam2}
                                myUserId={myUserId}
                                colorsMap={colorsMap}
                            />
                        ) : (
                            <>
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
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible", zIndex: 5 }}>
                                        {connectors.segments.map((s) => <ConnectorSegmentLine key={s.key} segment={s} />)}
                                        {connectors.points.map((p) => <circle key={p.key} cx={p.x} cy={p.y} r={3.5} fill={p.color} />)}
                                    </svg>
                                    <div className="w-full sm:w-[220px]">
                                        <ViewTeamMembersColumn team={sortedTeam1} myUserId={myUserId} colorsMap={colorsMap} registerRef={registerMemberRef} />
                                    </div>
                                    <div className="hidden sm:block" />
                                    <div className="w-full sm:w-[220px]">
                                        <ViewTeamMembersColumn team={sortedTeam2} myUserId={myUserId} colorsMap={colorsMap} registerRef={registerMemberRef} />
                                    </div>
                                </div>
                            </>
                        )}

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
                                            <div key={l.content_id} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
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
                                                                    <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5">
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
                                                                    <span key={id} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded-md px-1.5 py-0.5">
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


const CONTENT_CARD_BG: Record<string, string> = {
    "Đôi Nam": "#eff6ff",
    "Đôi Nam - Nữ": "#f5f3ff",
    "Đôi Nữ": "#fdf2f8",
    "Đơn Nam": "#f9fafb",
    "Đơn Nữ": "#fdf2f8",
    "3vs3": "#ecfdf5",
};

const CONTENT_TEXT_COLOR: Record<string, string> = {
    "Đôi Nam": "#1c3d5a",
    "Đôi Nam - Nữ": "#7c3aed",
    "Đôi Nữ": "#c2185b",
    "Đơn Nam": "#374151",
    "Đơn Nữ": "#db2777",
    "3vs3": "#0f766e",
};

const CONTENT_EMOJI: Record<string, string> = {
    "Đôi Nam": "🏸",
    "Đôi Nam - Nữ": "🤝",
    "Đôi Nữ": "🏸",
    "Đơn Nam": "🏸",
    "Đơn Nữ": "🏸",
    "3vs3": "👥",
};

function MatchScoreDetailModal({
    match, myTeamId, playoffRoundNumber, onClose,
}: {
    match: any;
    myTeamId?: string | null;
    playoffRoundNumber?: number | null;
    onClose: () => void;
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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const contentScores: any[] = match?.content_scores ?? [];
    const isCompleted = match?.status === "completed";

    return typeof document === "undefined"
        ? null
        : createPortal(
            <div
                className={`fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) handleClose();
                }}
            >
                <div
                    className={`bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col transition-all duration-200 ease-out ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
                        }`}
                >
                    <div className="px-5 pt-5 pb-4 text-center border-b border-gray-100 flex-shrink-0 relative">
                        <button
                            onClick={handleClose}
                            className="absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h3 className="font-black text-gray-900 text-lg">
                            {match?.team1?.name ?? "—"}{" "}
                            <span className="text-gray-300 font-normal mx-1.5">vs</span>{" "}
                            {match?.team2?.name ?? "—"}
                        </h3>
                        <p className="mt-1 text-xs text-gray-400">
                            {[
                                playoffRoundNumber != null && match?.round_number === playoffRoundNumber
                                    ? "Tranh hạng"
                                    : `Lượt ${match?.round_number}`,
                                match?.court_number ? `Sân ${match.court_number}` : null,
                            ].filter(Boolean).join(" · ")}
                        </p>
                    </div>

                    <div className={`p-4 overflow-y-auto flex-1 min-h-0 space-y-3 ${HIDE_SCROLLBAR_CLASS}`}>
                        {!isCompleted ? (
                            <div className="flex items-center justify-center py-10">
                                <p className="text-sm text-gray-400">Trận đấu chưa có tỉ số</p>
                            </div>
                        ) : (
                            <>
                                {contentScores.map((cs: any) => (
                                    <div
                                        key={cs.content_id}
                                        className="rounded-2xl p-4"
                                        style={{ background: CONTENT_CARD_BG[cs.label] ?? "#f9fafb" }}
                                    >
                                        <p
                                            className="text-sm font-bold flex items-center gap-1.5 mb-3"
                                            style={{ color: CONTENT_TEXT_COLOR[cs.label] ?? "#374151" }}
                                        >
                                            <span>{CONTENT_EMOJI[cs.label] ?? "🏸"}</span>
                                            {cs.label}
                                        </p>
                                        <div className="flex items-center justify-center gap-4">
                                            <span className="min-w-[64px] text-center bg-white rounded-xl py-2 text-2xl font-black text-green-600 shadow-sm">
                                                {cs.score1}
                                            </span>
                                            <span className="text-gray-300 text-sm">-</span>
                                            <span className="min-w-[64px] text-center bg-white rounded-xl py-2 text-2xl font-black text-rose-600 shadow-sm">
                                                {cs.score2}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                <div className="rounded-2xl p-4 bg-gray-50 border border-gray-100">
                                    <p className="text-sm font-bold text-gray-700 mb-3">Tổng điểm</p>
                                    <div className="flex items-center justify-center gap-4">
                                        <span className="min-w-[64px] text-center bg-white rounded-xl py-2 text-2xl font-black text-green-600 shadow-sm">
                                            {match?.team1_score ?? 0}
                                        </span>
                                        <span className="text-gray-300 text-sm">-</span>
                                        <span className="min-w-[64px] text-center bg-white rounded-xl py-2 text-2xl font-black text-rose-600 shadow-sm">
                                            {match?.team2_score ?? 0}
                                        </span>
                                    </div>
                                </div>

                                {(() => {
                                    const winnerTeam =
                                        match?.winner_team_id === match?.team1?.id
                                            ? match?.team1
                                            : match?.winner_team_id === match?.team2?.id
                                                ? match?.team2
                                                : null;

                                    const isMyTeam = !!myTeamId && winnerTeam?.id === myTeamId;

                                    return (
                                        <div
                                            className={`rounded-2xl p-4 flex items-center justify-center gap-2 ${winnerTeam ? "bg-amber-50 border border-amber-100" : "bg-gray-50 border border-gray-100"
                                                }`}
                                        >
                                            {winnerTeam ? (
                                                <>
                                                    <span className="text-lg">🏆</span>
                                                    <p className="text-sm font-bold text-amber-700">
                                                        Đội thắng: <span className="text-amber-800">{winnerTeam.name}</span>
                                                    </p>
                                                    {isMyTeam && (
                                                        <span className="text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                            Đội bạn
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-gray-400">Trận đấu hòa</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </div>,
            document.body,
        );
}

function computeRanking(teams: any[], rounds: any[], adjustments: any[]) {
    const map = new Map<
        string,
        { id: string; points: number; against: number; wins: number; played: number; adj: number }
    >();
    teams.forEach((t) =>
        map.set(t.id, { id: t.id, points: 0, against: 0, wins: 0, played: 0, adj: 0 }),
    );

    for (const r of rounds) {
        for (const m of r.matches ?? []) {
            if (m.status !== "completed") continue;
            const a = map.get(m.team1?.id);
            const b = map.get(m.team2?.id);
            if (!a || !b) continue;
            const s1 = m.team1_score ?? 0;
            const s2 = m.team2_score ?? 0;
            a.played += 1;
            b.played += 1;
            a.points += s1;
            a.against += s2;
            b.points += s2;
            b.against += s1;
            if (s1 > s2) a.wins += 1;
            else if (s2 > s1) b.wins += 1;
        }
    }
    for (const adj of adjustments) {
        const s = map.get(adj.team_id);
        if (s) s.adj += adj.delta;
    }

    return [...map.values()]
        .map((s) => ({ ...s, total: s.points + s.adj, diff: s.points - s.against }))
        .sort((x, y) => {
            if (y.total !== x.total) return y.total - x.total;
            if (y.diff !== x.diff) return y.diff - x.diff;
            return y.wins - x.wins;
        });
}

export default function MyTeamPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const activityId = params.id;
    const myUserId = useAuthStore((s) => s.user?.id);

    const goToActivityEventsTab = () => {
        try {
            sessionStorage.setItem("activity:return-tab", "events");
        } catch { }
        router.push("/activity");
    };

    const [activity, setActivity] = useState<any>(null);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [myTeamId, setMyTeamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLineupModal, setShowLineupModal] = useState(false);

    const [selectedScoreMatch, setSelectedScoreMatch] = useState<any>(null);

    const [playoffRoundNumber, setPlayoffRoundNumber] = useState<number | null>(null);
    const [adjustments, setAdjustments] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        Promise.all([
            activitiesApi.get(activityId),
            activitiesApi.getTournamentSchedule(activityId),
            activitiesApi.getTournamentTeams(activityId),
            activitiesApi.getMyStatus(activityId),
            activitiesApi.getPointAdjustments(activityId),
        ])
            .then(([act, sch, tms, mine, adj]) => {
                if (!mounted) return;
                setActivity(act.data);
                setRounds(sch.data.rounds ?? []);
                setTeams(tms.data.teams ?? []);
                setMyTeamId(mine.data?.my_registration?.team?.id ?? null);
                const pr = act.data?.detail?.rules?.playoff_round_number;
                setPlayoffRoundNumber(pr != null ? Number(pr) : null);
                setAdjustments(adj.data.adjustments ?? []);
            })
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [activityId]);

    const allMatches = useMemo(
        () => rounds.flatMap((r) => (r.matches ?? []).map((m) => ({ ...m, round_number: r.round_number }))),
        [rounds],
    );

    const standings = useMemo(() => {
        const ranking = computeRanking(teams, rounds, adjustments);
        const rankMap = new Map<string, number>();
        ranking.forEach((s, idx) => rankMap.set(s.id, idx + 1));
        const stats = new Map(ranking.map((s) => [s.id, s]));
        return { stats, rankMap };
    }, [teams, rounds, adjustments]);

    const myTeam = teams.find((t) => t.id === myTeamId) ?? null;
    const myStats = myTeamId ? standings.stats.get(myTeamId) : undefined;
    const myRank = myTeamId ? standings.rankMap.get(myTeamId) : undefined;

    const totalMyMatches = useMemo(
        () =>
            allMatches.filter((m) => m.team1?.id === myTeamId || m.team2?.id === myTeamId).length,
        [allMatches, myTeamId],
    );

    const roundScores = useMemo(() => {
        if (!myTeamId) return [];

        // Xếp hạng vòng tròn (trước lượt tranh hạng) để gắn nhãn Nhất - Nhì / Ba - Tư
        let ids: string[] = [];
        if (playoffRoundNumber != null) {
            const prior = rounds.filter((r) => r.round_number < playoffRoundNumber);
            ids = computeRanking(teams, prior, adjustments).map((s) => s.id);
        }
        const [r1, r2, r3, r4] = ids;

        return rounds.map((r) => {
            const isPlayoff = playoffRoundNumber != null && r.round_number === playoffRoundNumber;
            const m = (r.matches ?? []).find(
                (x: any) => x.team1?.id === myTeamId || x.team2?.id === myTeamId,
            );

            if (!m) {
                return {
                    round: r.round_number, isPlayoff, label: null as string | null, bye: true, match: null as any,
                    opponent: null as any, score: null as number | null, oppScore: null as number | null,
                    result: null as null | "win" | "loss" | "draw"
                };
            }

            const isT1 = m.team1?.id === myTeamId;
            const opponent = isT1 ? m.team2 : m.team1;

            let label: string | null = null;
            if (isPlayoff) {
                const pair = [m.team1?.id, m.team2?.id];
                if (pair.includes(r1) && pair.includes(r2)) label = "Tranh hạng Nhất - Nhì";
                else if (pair.includes(r3) && pair.includes(r4)) label = "Tranh hạng Ba - Tư";
                else label = "Trận tranh hạng";
            }

            if (m.status !== "completed") {
                return {
                    round: r.round_number, isPlayoff, label, bye: false, match: m, opponent,
                    score: null, oppScore: null, result: null
                };
            }

            const score = (isT1 ? m.team1_score : m.team2_score) ?? 0;
            const oppScore = (isT1 ? m.team2_score : m.team1_score) ?? 0;
            const result: "win" | "loss" | "draw" = m.winner_team_id
                ? m.winner_team_id === myTeamId ? "win" : "loss"
                : "draw";

            return { round: r.round_number, isPlayoff, label, bye: false, match: m, opponent, score, oppScore, result };
        });
    }, [rounds, teams, adjustments, myTeamId, playoffRoundNumber]);

    const nextMatch = useMemo(() => {
        if (!myTeamId) return null;
        return (
            allMatches
                .filter(
                    (m) =>
                        m.status !== "completed" &&
                        (m.team1?.id === myTeamId || m.team2?.id === myTeamId),
                )
                .sort((a, b) => a.round_number - b.round_number)[0] ?? null
        );
    }, [allMatches, myTeamId]);

    const matchContents: { id: string; label: string }[] = activity?.detail?.rules?.match_contents ?? [];

    const teamById = useMemo(() => {
        const map = new Map<string, any>();
        teams.forEach((t) => map.set(t.id, t));
        return map;
    }, [teams]);

    const formatDate = (iso?: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        return d.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="mx-auto min-h-screen w-full max-w-md bg-white p-4">
                <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
                <div className="mt-4 h-40 animate-pulse rounded-[24px] bg-gray-100" />
                <div className="mt-4 h-64 animate-pulse rounded-[24px] bg-gray-100" />
            </div>
        );
    }

    if (!myTeam) {
        return (
            <div className="mx-auto min-h-screen w-full max-w-md bg-white">
                <Header onBack={() => router.back()} onHome={goToActivityEventsTab} />
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                    Bạn chưa được xếp vào đội thi đấu nào.
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10">
            <Header onBack={() => router.back()} onHome={goToActivityEventsTab} />

            {/* Hero */}
            <div className="px-4">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-rose-500 to-orange-400 px-5 pb-5 pt-5 text-center text-white shadow-lg shadow-rose-200">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/10" />

                    <div className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-black text-rose-500 shadow-md">
                        {myRank ?? "-"}
                    </div>
                    <p className="relative mt-2 text-2xl font-black">{myTeam.name}</p>
                    <p className="relative mt-0.5 text-xs font-medium text-white/80">
                        {myStats?.wins ?? 0} thắng · {(myStats?.played ?? 0) - (myStats?.wins ?? 0)} thua
                    </p>
                </div>
            </div>

            {/* Số liệu */}
            <div className="mt-3 grid grid-cols-3 gap-2 px-4">
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-medium text-gray-400">Hạng</p>
                    <p className="mt-0.5 text-xl font-black text-rose-600">#{myRank ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-medium text-gray-400">Tổng điểm</p>
                    <p className="mt-0.5 text-xl font-black text-gray-900">{myStats?.total ?? 0}</p>
                    {(myStats?.adj ?? 0) !== 0 && (
                        <p className={`text-[10px] font-semibold ${(myStats?.adj ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {(myStats?.adj ?? 0) > 0 ? "+" : ""}{myStats?.adj} điều chỉnh
                        </p>
                    )}
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="text-[11px] font-medium text-gray-400">Đã đấu</p>
                    <p className="mt-0.5 text-xl font-black text-gray-900">
                        {myStats?.played ?? 0}
                        <span className="text-sm font-bold text-gray-300">/{totalMyMatches}</span>
                    </p>
                </div>
            </div>

            {totalMyMatches > 0 && (
                <div className="mt-3 px-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-400 transition-all duration-500"
                            style={{ width: `${((myStats?.played ?? 0) / totalMyMatches) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="mt-5 px-4">
                <h2 className="text-base font-black text-gray-900">Điểm theo lượt</h2>

                <div className="mt-2 space-y-2">
                    {roundScores.map((r) => {
                        const clickable = !!r.match && r.match.status === "completed";
                        const hasScore = r.score !== null;

                        const resultCfg = {
                            win: { label: "Thắng", color: "#16a34a", bg: "#f0fdf4" },
                            loss: { label: "Thua", color: "#dc2626", bg: "#fef2f2" },
                            draw: { label: "Hòa", color: "#6b7280", bg: "#f3f4f6" },
                        } as const;
                        const cfg = r.result ? resultCfg[r.result] : null;

                        const accent =
                            r.result === "win" ? "bg-emerald-500"
                                : r.result === "loss" ? "bg-red-400"
                                    : r.result === "draw" ? "bg-gray-300"
                                        : "bg-gray-200";

                        return (
                            <button
                                type="button"
                                key={r.round}
                                disabled={!clickable}
                                onClick={() => clickable && setSelectedScoreMatch(r.match)}
                                className={`relative w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-all ${r.isPlayoff ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-white"
                                    } ${clickable ? "active:scale-[0.99]" : ""}`}
                            >
                                <span className={`absolute bottom-0 left-0 top-0 w-1 ${r.isPlayoff ? "bg-amber-400" : accent}`} />

                                <div className="flex items-center gap-3 py-3 pl-4 pr-4">
                                    <span
                                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${r.isPlayoff ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {r.isPlayoff ? <Trophy className="h-4 w-4" /> : r.round}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-gray-900">
                                            {r.isPlayoff ? r.label : `Lượt ${r.round}`}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-gray-400">
                                            {r.bye
                                                ? "Đội nghỉ lượt này"
                                                : (
                                                    <>
                                                        vs <span className="font-semibold text-gray-600">{r.opponent?.name ?? "—"}</span>
                                                    </>
                                                )}
                                        </p>
                                    </div>

                                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                                        {hasScore ? (
                                            <>
                                                <p className="text-base font-black tabular-nums">
                                                    <span className="text-gray-900">{r.score}</span>
                                                    <span className="mx-1 text-gray-300">-</span>
                                                    <span className="text-gray-400">{r.oppScore}</span>
                                                </p>
                                                {cfg && (
                                                    <span
                                                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                                        style={{ background: cfg.bg, color: cfg.color }}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                )}
                                            </>
                                        ) : r.bye ? (
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                                                Nghỉ
                                            </span>
                                        ) : r.match?.status === "ongoing" ? (
                                            <span className="animate-pulse rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                                Đang đấu
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                                                Chưa đấu
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}

                    {roundScores.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
                            Chưa có lịch thi đấu
                        </div>
                    )}
                </div>
            </div>

            {nextMatch && (
                <div className="mt-5 px-4">
                    <h2 className="text-base font-black text-gray-900">
                        {playoffRoundNumber != null && nextMatch.round_number === playoffRoundNumber
                            ? "Trận tranh hạng tiếp theo"
                            : "Trận tiếp theo"}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowLineupModal(true)}
                        className="mt-2 w-full rounded-[16px] border border-gray-200 px-4 py-3 text-center transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-sm font-black text-gray-900">
                                {nextMatch.team1?.name ?? "—"}
                            </span>
                            <span className="text-xs font-bold text-gray-400">vs</span>
                            <span className="text-sm font-black text-gray-900">
                                {nextMatch.team2?.name ?? "—"}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            {[
                                playoffRoundNumber != null && nextMatch.round_number === playoffRoundNumber
                                    ? "Tranh hạng"
                                    : `Lượt ${nextMatch.round_number}`,
                                formatDate(nextMatch.scheduled_at),
                                nextMatch.court_number ? `Sân ${nextMatch.court_number}` : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                            <Users className="w-3.5 h-3.5" /> Xem đội hình thi đấu
                        </p>
                    </button>
                </div>
            )}

            {showLineupModal && nextMatch && (
                <MatchLineupsViewModal
                    matchId={nextMatch.id}
                    team1={teamById.get(nextMatch.team1?.id) ?? nextMatch.team1}
                    team2={teamById.get(nextMatch.team2?.id) ?? nextMatch.team2}
                    matchContents={matchContents}
                    myUserId={myUserId}
                    matchStatus={getMatchStatus(nextMatch)}
                    onClose={() => setShowLineupModal(false)}
                />
            )}

            {selectedScoreMatch && (
                <MatchScoreDetailModal
                    match={selectedScoreMatch}
                    myTeamId={myTeamId}
                    playoffRoundNumber={playoffRoundNumber}
                    onClose={() => setSelectedScoreMatch(null)}
                />
            )}
        </div>
    );
}

function Header({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
    return (
        <div className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 py-3">
            <button
                onClick={onBack}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                aria-label="Quay lại"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 truncate text-lg font-black text-gray-900">Đội của tôi</h1>
            <button
                onClick={onHome}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                title="Về trang hoạt động"
                aria-label="Về trang hoạt động"
            >
                <Home className="h-5 w-5" />
            </button>
        </div>
    );
}
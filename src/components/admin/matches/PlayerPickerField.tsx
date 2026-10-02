"use client";
import { useEffect, useState } from "react";
import { usersApi } from "@/lib/api";
import { Search } from "lucide-react";

const LEVEL_LABEL: Record<string, string> = {
    yeu: "Yếu",
    tb_yeu: "TB yếu",
    tb: "TB",
    tb_plus: "TB+",
    ban_chuyen: "Bán chuyên (BC)",
    chuyen_nghiep: "Chuyên nghiệp",
};

const DEFAULT_TIER = "Tân thủ";

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

function getTier(m: any): string {
    const pr = m.player_ranks;
    const tier = Array.isArray(pr) ? pr[0]?.tier : pr?.tier;
    return tier ?? DEFAULT_TIER;
}

function PlayerMeta({ m }: { m: any }) {
    const level = LEVEL_LABEL[m.level] ?? m.level;
    const tier = getTier(m);
    const tierCls = TIER_STYLE[tier] ?? "bg-[var(--surface-muted)] text-[var(--text-muted)]";

    return (
        <div className="flex items-center gap-1 mt-0.5">
            {level && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--purple-soft)] text-[var(--purple)] leading-none">
                    {level}
                </span>
            )}
            <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${tierCls}`}
            >
                {tier}
            </span>
        </div>
    );
}

export function PlayerPickerField({
    label,
    value,
    onSelect,
    exclude,
}: {
    label: string;
    value: any;
    onSelect: (m: any) => void;
    exclude: string[];
}) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (value || search.trim().length < 2) {
            setResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await usersApi.searchMembers(search.trim());
                setResults((data ?? []).filter((m: any) => !exclude.includes(m.id)));
            } finally {
                setSearching(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [search, value, exclude]);

    if (value) {
        return (
            <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                    {label}
                </label>
                <div className="flex items-center gap-2 bg-[var(--primary-soft)] rounded-xl px-3 py-2">
                    {value.avatar_url ? (
                        <img
                            src={value.avatar_url}
                            alt={value.full_name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--primary)] flex-shrink-0">
                            {value.full_name?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[var(--text)] truncate block">
                            {value.full_name}
                        </span>
                        <PlayerMeta m={value} />
                    </div>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-[var(--primary)] font-medium flex-shrink-0"
                    >
                        Đổi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                {label}
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-faint)]" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-8 text-sm"
                    placeholder="Tìm tên hoặc SĐT..."
                />
            </div>
            {search.trim().length >= 2 && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-[var(--border)] rounded-xl">
                    {searching ? (
                        <p className="text-xs text-[var(--text-faint)] text-center py-3">
                            Đang tìm...
                        </p>
                    ) : results.length === 0 ? (
                        <p className="text-xs text-[var(--text-faint)] text-center py-3">
                            Không tìm thấy
                        </p>
                    ) : (
                        results.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    onSelect(m);
                                    setSearch("");
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] text-left"
                            >
                                {m.avatar_url ? (
                                    <img
                                        src={m.avatar_url}
                                        alt={m.full_name}
                                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--primary)] flex-shrink-0">
                                        {m.full_name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-[var(--text)] truncate">
                                        {m.full_name}
                                    </p>
                                    <PlayerMeta m={m} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
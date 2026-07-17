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
    "Tân thủ": "bg-gray-100 text-gray-500",
    "Phong trào": "bg-slate-100 text-slate-600",
    "Cứng cựa": "bg-sky-50 text-sky-700",
    "Chủ lực": "bg-blue-50 text-blue-700",
    "Cao thủ": "bg-indigo-50 text-indigo-700",
    "Kiện tướng": "bg-purple-50 text-purple-700",
    "Đại Kiện Tướng": "bg-fuchsia-50 text-fuchsia-700",
    "Huyền Thoại": "bg-amber-100 text-amber-700",
};

function getTier(m: any): string {
    const pr = m.player_ranks;
    const tier = Array.isArray(pr) ? pr[0]?.tier : pr?.tier;
    return tier ?? DEFAULT_TIER;
}

function PlayerMeta({ m }: { m: any }) {
    const level = LEVEL_LABEL[m.level] ?? m.level;
    const tier = getTier(m);
    const tierCls = TIER_STYLE[tier] ?? "bg-gray-100 text-gray-500";

    return (
        <div className="flex items-center gap-1 mt-0.5">
            {level && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 leading-none">
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
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                </label>
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                    {value.avatar_url ? (
                        <img
                            src={value.avatar_url}
                            alt={value.full_name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                            {value.full_name?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate block">
                            {value.full_name}
                        </span>
                        <PlayerMeta m={value} />
                    </div>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-blue-600 font-medium flex-shrink-0"
                    >
                        Đổi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
                {label}
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-8 text-sm"
                    placeholder="Tìm tên hoặc SĐT..."
                />
            </div>
            {search.trim().length >= 2 && (
                <div className="mt-1 max-h-40 overflow-y-auto border border-gray-100 rounded-xl">
                    {searching ? (
                        <p className="text-xs text-gray-400 text-center py-3">
                            Đang tìm...
                        </p>
                    ) : results.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">
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
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                            >
                                {m.avatar_url ? (
                                    <img
                                        src={m.avatar_url}
                                        alt={m.full_name}
                                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                                        {m.full_name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
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
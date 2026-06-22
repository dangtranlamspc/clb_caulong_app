'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchesApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type MatchType = 'singles' | 'doubles';

function PlayerPicker({
    label,
    value,
    onSelect,
    onClear,
    excludeIds,
    required,
}: {
    label: string;
    value: any;
    onSelect: (p: any) => void;
    onClear: () => void;
    excludeIds: string[];
    required?: boolean;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query.trim() || query.length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await usersApi.searchMembers(query);
                setResults((data ?? []).filter((u: any) => !excludeIds.includes(u.id)));
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query, excludeIds.join(',')]);

    if (value) {
        return (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {value.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{value.full_name}</p>
                    <p className="text-xs text-gray-500">{value.phone}</p>
                </div>
                <button onClick={onClear} className="p-1 hover:bg-blue-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); }}
                    onFocus={() => { }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50"
                    placeholder={`${label} — tìm tên, SĐT...`}
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            </div>

            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                    {results.map((u) => (
                        <button
                            key={u.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(u);
                                setQuery('');
                                setResults([]);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                                {u.full_name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name}</p>
                                <p className="text-xs text-gray-400">{u.phone}</p>
                            </div>
                            <UserPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CreateMatchPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [matchType, setMatchType] = useState<MatchType>('singles');
    const [bestOf, setBestOf] = useState<3 | 5>(5);
    const [partnerA, setPartnerA] = useState<any>(null);
    const [opponentB1, setOpponentB1] = useState<any>(null);
    const [opponentB2, setOpponentB2] = useState<any>(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const excludeIds = [
        user?.id ?? '',
        partnerA?.id,
        opponentB1?.id,
        opponentB2?.id,
    ].filter(Boolean) as string[];

    const canSubmit = opponentB1 && (matchType === 'singles' || (partnerA && opponentB2));

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        try {
            const payload: any = {
                match_type: matchType,
                best_of: bestOf,
                team_b_player1: opponentB1.id,
            };
            if (matchType === 'doubles') {
                payload.team_a_player2 = partnerA.id;
                payload.team_b_player2 = opponentB2.id;
            }
            if (note.trim()) payload.note = note.trim();

            await matchesApi.create(payload);
            toast.success('Đã gửi lời thách đấu! 🏸');
            router.push('/activity?tab=matches');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Tạo trận thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Tạo trận giao hữu</h1>
                    <p className="text-xs text-gray-500">Thách đấu thành viên khác trong CLB</p>
                </div>
            </div>

            {/* Match type */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-gray-700">Hình thức thi đấu</p>
                <div className="grid grid-cols-2 gap-3">
                    {(['singles', 'doubles'] as MatchType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setMatchType(t);
                                if (t === 'singles') { setPartnerA(null); setOpponentB2(null); }
                            }}
                            className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${matchType === t
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            {t === 'singles' ? '👤 Đơn (1v1)' : '👥 Đôi (2v2)'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Best of */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-gray-700">Số set tối đa</p>
                <div className="grid grid-cols-2 gap-3">
                    {([3, 5] as const).map((b) => (
                        <button
                            key={b}
                            onClick={() => setBestOf(b)}
                            className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${bestOf === b
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                        >
                            Best of {b} <span className="text-xs font-normal opacity-70">(thắng {Math.ceil(b / 2)} set)</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Players */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                <p className="text-sm font-bold text-gray-700">Người chơi</p>

                {/* Team A */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Đội A (của bạn)</p>
                    {/* Self */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                            <p className="text-xs text-blue-500 font-medium">Bạn</p>
                        </div>
                    </div>
                    {/* Partner A (doubles only) */}
                    {matchType === 'doubles' && (
                        <PlayerPicker
                            label="Đồng đội của bạn"
                            value={partnerA}
                            onSelect={setPartnerA}
                            onClear={() => setPartnerA(null)}
                            excludeIds={excludeIds}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs font-bold text-gray-400 px-2">VS</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Team B */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Đội B (đối thủ)</p>
                    <PlayerPicker
                        label="Đối thủ chính *"
                        value={opponentB1}
                        onSelect={setOpponentB1}
                        onClear={() => setOpponentB1(null)}
                        excludeIds={excludeIds}
                        required
                    />
                    {matchType === 'doubles' && (
                        <PlayerPicker
                            label="Đồng đội của đối thủ *"
                            value={opponentB2}
                            onSelect={setOpponentB2}
                            onClear={() => setOpponentB2(null)}
                            excludeIds={excludeIds}
                            required
                        />
                    )}
                </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                <p className="text-sm font-bold text-gray-700">Ghi chú <span className="font-normal text-gray-400">(tuỳ chọn)</span></p>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    rows={2}
                    placeholder="VD: Hẹn đánh cuối tuần này tại sân A..."
                />
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Đang gửi...' : '🏸 Gửi lời thách đấu'}
            </button>
        </div>
    );
}
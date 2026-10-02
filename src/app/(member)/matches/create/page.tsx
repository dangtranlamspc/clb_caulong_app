'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchesApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type MatchType = 'singles' | 'doubles' | 'triples';

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
            <div className="flex items-center gap-3 bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {value.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)]">{value.full_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{value.phone}</p>
                </div>
                <button onClick={onClear} className="p-1 hover:bg-[var(--primary-soft)] rounded-lg">
                    <X className="w-4 h-4 text-[var(--text-faint)]" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); }}
                    onFocus={() => { }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[var(--surface-muted)]"
                    placeholder={`${label} — tìm tên, SĐT...`}
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)] animate-spin" />}
            </div>

            {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-lg z-20 overflow-hidden">
                    {results.map((u) => (
                        <button
                            key={u.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSelect(u);
                                setQuery('');
                                setResults([]);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold text-sm flex-shrink-0">
                                {u.full_name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text)] truncate">{u.full_name}</p>
                                <p className="text-xs text-[var(--text-faint)]">{u.phone}</p>
                            </div>
                            <UserPlus className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
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
    const [partnerA, setPartnerA] = useState<any>(null);
    const [partnerA3, setPartnerA3] = useState<any>(null);
    const [opponentB1, setOpponentB1] = useState<any>(null);
    const [opponentB2, setOpponentB2] = useState<any>(null);
    const [opponentB3, setOpponentB3] = useState<any>(null);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });


    const btnRef = useRef<HTMLButtonElement>(null);
    const [btnWidth, setBtnWidth] = useState<number | null>(null);



    useEffect(() => {
        const el = tabRefs.current[matchType];
        if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }, [matchType]);

    const excludeIds = [
        user?.id ?? '',
        partnerA?.id,
        partnerA3?.id,
        opponentB1?.id,
        opponentB2?.id,
        opponentB3?.id,
    ].filter(Boolean) as string[];

    const canSubmit =
        matchType === 'singles'
            ? !!opponentB1
            : matchType === 'doubles'
                ? !!(partnerA && opponentB1 && opponentB2)
                : !!(partnerA && partnerA3 && opponentB1 && opponentB2 && opponentB3);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        try {
            const payload: any = {
                match_type: matchType,
                team_b_player1: opponentB1.id,
            };
            if (matchType !== 'singles') {
                payload.team_a_player2 = partnerA.id;
                payload.team_b_player2 = opponentB2.id;
            }
            if (matchType === 'triples') {
                payload.team_a_player3 = partnerA3.id;
                payload.team_b_player3 = opponentB3.id;
            }
            if (note.trim()) payload.note = note.trim();

            await matchesApi.create(payload);
            toast.success('Đã tạo trận đấu! Đối thủ đã được thông báo 🏸');
            sessionStorage.setItem('activity:return-tab', 'matches');
            router.push('/activity');
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Tạo trận thất bại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && btnRef.current) {
            setBtnWidth(btnRef.current.offsetWidth);
        }
    }, [loading, canSubmit, matchType]);

    const showPartnerA = matchType !== 'singles';
    const showPartnerA3 = matchType === 'triples';
    const showOpponentB2 = matchType !== 'singles';
    const showOpponentB3 = matchType === 'triples';

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <button onClick={() => {
                    sessionStorage.setItem('activity:return-tab', 'matches');
                    router.push('/activity');
                }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors">
                    <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-dark"
                        style={{ textShadow: "0 1px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.8)" }}>Tạo trận giao hữu</h1>
                    <p className="text-xs text-dark mt-0.5"
                        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.7)" }}>Thách đấu thành viên khác trong CLB · 1 set duy nhất</p>
                </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-[var(--text)]">Hình thức thi đấu</p>
                <div className="relative grid grid-cols-3 gap-2 bg-[var(--surface-muted)] rounded-xl p-1">
                    <div
                        className="absolute top-1 bottom-1 bg-blue-600 rounded-lg shadow-sm shadow-blue-200"
                        style={{
                            left: indicator.left,
                            width: indicator.width,
                            transition: 'left .25s cubic-bezier(.4,0,.2,1), width .25s cubic-bezier(.4,0,.2,1)',
                        }}
                    />
                    {(['singles', 'doubles', 'triples'] as MatchType[]).map((t) => (
                        <button
                            key={t}
                            ref={(el) => { tabRefs.current[t] = el; }}
                            onClick={() => {
                                setMatchType(t);
                                if (t === 'singles') {
                                    setPartnerA(null); setOpponentB2(null);
                                    setPartnerA3(null); setOpponentB3(null);
                                }
                                if (t === 'doubles') {
                                    setPartnerA3(null); setOpponentB3(null);
                                }
                            }}
                            className={`relative z-10 py-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 ${matchType === t ? 'text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                                }`}
                        >
                            {t === 'singles' ? '👤 Đơn' : t === 'doubles' ? '👥 Đôi' : '👥 3v3'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-sm space-y-4">
                <p className="text-sm font-bold text-[var(--text)]">Người chơi</p>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">Đội A (của bạn)</p>
                    <div className="flex items-center gap-3 bg-[var(--surface-muted)] rounded-xl px-4 py-3 border border-[var(--border)]">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[var(--text)]">{user?.full_name}</p>
                            <p className="text-xs text-[var(--primary)] font-medium">Bạn</p>
                        </div>
                    </div>

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${showPartnerA ? 'overflow-visible' : 'overflow-hidden'}`}
                        style={{
                            gridTemplateRows: showPartnerA ? '1fr' : '0fr',
                            opacity: showPartnerA ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0 pt-2">
                            <PlayerPicker
                                label="Đồng đội của bạn"
                                value={partnerA}
                                onSelect={setPartnerA}
                                onClear={() => setPartnerA(null)}
                                excludeIds={excludeIds}
                            />
                        </div>
                    </div>

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${showPartnerA3 ? 'overflow-visible' : 'overflow-hidden'}`}
                        style={{
                            gridTemplateRows: showPartnerA3 ? '1fr' : '0fr',
                            opacity: showPartnerA3 ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0 pt-2">
                            <PlayerPicker
                                label="Đồng đội thứ 2 của bạn"
                                value={partnerA3}
                                onSelect={setPartnerA3}
                                onClear={() => setPartnerA3(null)}
                                excludeIds={excludeIds}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--surface-muted)]" />
                    <span className="text-xs font-bold text-[var(--text-faint)] px-2">VS</span>
                    <div className="flex-1 h-px bg-[var(--surface-muted)]" />
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--danger)] uppercase tracking-wide">Đội B (đối thủ)</p>
                    <PlayerPicker
                        label="Đối thủ chính *"
                        value={opponentB1}
                        onSelect={setOpponentB1}
                        onClear={() => setOpponentB1(null)}
                        excludeIds={excludeIds}
                        required
                    />

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${showOpponentB2 ? 'overflow-visible' : 'overflow-hidden'}`}
                        style={{
                            gridTemplateRows: showOpponentB2 ? '1fr' : '0fr',
                            opacity: showOpponentB2 ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0 pt-2">
                            <PlayerPicker
                                label="Đồng đội của đối thủ *"
                                value={opponentB2}
                                onSelect={setOpponentB2}
                                onClear={() => setOpponentB2(null)}
                                excludeIds={excludeIds}
                                required
                            />
                        </div>
                    </div>

                    <div
                        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${showOpponentB3 ? 'overflow-visible' : 'overflow-hidden'}`}
                        style={{
                            gridTemplateRows: showOpponentB3 ? '1fr' : '0fr',
                            opacity: showOpponentB3 ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0 pt-2">
                            <PlayerPicker
                                label="Đồng đội thứ 2 của đối thủ *"
                                value={opponentB3}
                                onSelect={setOpponentB3}
                                onClear={() => setOpponentB3(null)}
                                excludeIds={excludeIds}
                                required
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-sm space-y-2">
                <p className="text-sm font-bold text-[var(--text)]">Ghi chú <span className="font-normal text-[var(--text-faint)]">(tuỳ chọn)</span></p>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]"
                    rows={2}
                    placeholder="VD: Hẹn đánh cuối tuần này tại sân A..."
                />
            </div>

            <div className="flex justify-center">
                <button
                    ref={btnRef}
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                    style={{
                        width: loading ? 56 : (btnWidth ?? undefined),
                        borderRadius: loading ? 9999 : 16,
                        transition: 'width .35s cubic-bezier(.4,0,.2,1), border-radius .35s cubic-bezier(.4,0,.2,1)',
                    }}
                    className="py-4 bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-colors overflow-hidden flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                    ) : (
                        <span className="whitespace-nowrap px-4">🏸 Gửi lời thách đấu</span>
                    )}
                </button>
            </div>
        </div>
    );
}
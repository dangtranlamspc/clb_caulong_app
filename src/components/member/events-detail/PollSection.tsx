"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi } from "@/lib/api";

export function PollSection({ activity, myStatus, onChanged }: any) {
    const options = myStatus?.options ?? [];
    const counts: Record<string, number> = Object.fromEntries(
        (myStatus?.counts ?? []).map((c: any) => [c.option_id, c.count]),
    );
    const totalVotes = Object.values(counts).reduce((s: number, c: any) => s + c, 0);
    const [selected, setSelected] = useState<string[]>(myStatus?.my_voted_option_ids ?? []);
    const [submitting, setSubmitting] = useState(false);
    const allowMultiple = activity.detail?.allow_multiple;
    const canVote = activity.status === "open";
    const hasVoted = (myStatus?.my_voted_option_ids ?? []).length > 0;

    const toggleOption = (id: string) => {
        if (allowMultiple) {
            setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        } else {
            setSelected([id]);
        }
    };

    const handleSubmit = async () => {
        if (selected.length === 0) return toast.error("Vui lòng chọn ít nhất 1 lựa chọn");
        setSubmitting(true);
        try {
            await activitiesApi.vote(activity.id, selected);
            toast.success("Đã ghi nhận bình chọn của bạn");
            onChanged();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-[var(--surface)] rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-[var(--text)]">
                {allowMultiple ? "Chọn nhiều lựa chọn" : "Chọn 1 lựa chọn"}
            </h3>

            <div className="space-y-2">
                {options.map((opt: any) => {
                    const count = counts[opt.id] ?? 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isSelected = selected.includes(opt.id);
                    return (
                        <button
                            key={opt.id}
                            onClick={() => canVote && toggleOption(opt.id)}
                            disabled={!canVote}
                            className={`w-full text-left rounded-xl border p-3 relative overflow-hidden transition-colors ${isSelected ? "border-blue-400 bg-[var(--primary-soft)]" : "border-[var(--border)]"
                                }`}
                        >
                            {(hasVoted || !canVote) && (
                                <div className="absolute inset-0 bg-[var(--primary-soft)]" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-[var(--text)]">{opt.label}</span>
                                {(hasVoted || !canVote) && (
                                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                                        {pct}% ({count})
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {canVote ? (
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {hasVoted ? "Cập nhật bình chọn" : "Gửi bình chọn"}
                </button>
            ) : (
                <p className="text-sm text-[var(--text-faint)] text-center py-1">
                    Đã đóng bình chọn · {totalVotes} lượt
                </p>
            )}
        </div>
    );
}

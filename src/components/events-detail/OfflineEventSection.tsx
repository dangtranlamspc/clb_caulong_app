"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { activitiesApi } from "@/lib/api";

export function OfflineEventSection({ activity, myStatus, onChanged }: any) {
    const reg = myStatus?.my_registration;
    const [guestCount, setGuestCount] = useState(reg?.guest_count ?? 0);
    const [notes, setNotes] = useState(reg?.notes ?? "");
    const [submitting, setSubmitting] = useState(false);
    const canRegister = ["open", "ongoing", "upcoming"].includes(activity.status);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await activitiesApi.registerOfflineEvent(activity.id, {
                guest_count: guestCount,
                notes: notes || undefined,
            });
            toast.success(reg ? "Đã cập nhật đăng ký" : "Đã đăng ký tham gia");
            onChanged();
        } catch {
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Huỷ đăng ký tham gia?")) return;
        try {
            await activitiesApi.cancelRegistration(activity.id);
            toast.success("Đã huỷ đăng ký");
            onChanged();
        } catch { }
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Đăng ký tham gia</h3>

            {reg && (
                <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Bạn đã đăng ký{" "}
                    {reg.guest_count > 0 && `(+${reg.guest_count} khách đi cùng)`}
                </div>
            )}

            {canRegister ? (
                <>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                            Số khách đi cùng
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={guestCount}
                            onChange={(e) => setGuestCount(Number(e.target.value))}
                            className="w-24 px-3 py-2 rounded-xl border border-gray-200 text-sm"
                        />
                    </div>
                    <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ghi chú (tuỳ chọn)"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                            {reg ? "Cập nhật" : "Đăng ký tham gia"}
                        </button>
                        {reg && (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
                            >
                                Huỷ
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-sm text-gray-400 text-center py-2">Đã đóng đăng ký</p>
            )}
        </div>
    );
}

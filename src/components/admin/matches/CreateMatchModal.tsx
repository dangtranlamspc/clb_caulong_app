"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { matchesAdminApi } from "@/lib/api";
import { Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { PlayerPickerField } from "./PlayerPickerField";

export function CreateMatchModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const [matchType, setMatchType] = useState<"singles" | "doubles">(
        "singles",
    );
    const [a1, setA1] = useState<any>(null);
    const [a2, setA2] = useState<any>(null);
    const [b1, setB1] = useState<any>(null);
    const [b2, setB2] = useState<any>(null);
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Animation mở/đóng: mount ngay, đợi 1 frame rồi bật visible để transition chạy;
    // khi đóng, tắt visible trước rồi mới gọi onClose thật (unmount) sau khi animation xong.
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 200);
    };

    const selectedIds = [a1?.id, a2?.id, b1?.id, b2?.id].filter(Boolean);
    const canSubmit =
        matchType === "singles" ? a1 && b1 : a1 && a2 && b1 && b2;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await matchesAdminApi.adminCreate({
                match_type: matchType,
                team_a_player1: a1.id,
                team_a_player2: matchType === "doubles" ? a2.id : undefined,
                team_b_player1: b1.id,
                team_b_player2: matchType === "doubles" ? b2.id : undefined,
                note: note || undefined,
            });
            toast.success("Đã tạo trận đấu, các người chơi đã được thông báo");
            onCreated();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Tạo trận thất bại");
        } finally {
            setSubmitting(false);
        }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                opacity: visible ? 1 : 0,
                transition: "opacity 200ms ease-out",
            }}
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
                style={{
                    transform: visible
                        ? "scale(1) translateY(0)"
                        : "scale(0.95) translateY(8px)",
                    opacity: visible ? 1 : 0,
                    transition:
                        "transform 220ms cubic-bezier(0.32,0.72,0,1), opacity 200ms ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Tạo trận đấu hộ member</h3>
                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-600"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="relative flex gap-1 bg-gray-50 rounded-lg p-1">
                        <div
                            className="absolute top-1 bottom-1 left-1 rounded-lg bg-blue-50 transition-transform duration-200 ease-out"
                            style={{
                                width: "calc(50% - 4px)",
                                transform:
                                    matchType === "doubles"
                                        ? "translateX(calc(100% + 4px))"
                                        : "translateX(0)",
                            }}
                        />
                        {[
                            ["singles", "Đơn"],
                            ["doubles", "Đôi"],
                        ].map(([val, lbl]) => (
                            <button
                                key={val}
                                onClick={() => setMatchType(val as any)}
                                className={`relative z-10 flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${matchType === val
                                    ? "text-blue-600"
                                    : "text-gray-400"
                                    }`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>

                    <p className="text-xs font-semibold text-gray-500 uppercase">
                        Đội A
                    </p>
                    <PlayerPickerField
                        label="Người chơi A1"
                        value={a1}
                        onSelect={setA1}
                        exclude={selectedIds}
                    />
                    <div
                        className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-250 ease-out"
                        style={{
                            gridTemplateRows: matchType === "doubles" ? "1fr" : "0fr",
                            opacity: matchType === "doubles" ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0">
                            <PlayerPickerField
                                label="Người chơi A2"
                                value={a2}
                                onSelect={setA2}
                                exclude={selectedIds}
                            />
                        </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-500 uppercase pt-1">
                        Đội B
                    </p>
                    <PlayerPickerField
                        label="Người chơi B1"
                        value={b1}
                        onSelect={setB1}
                        exclude={selectedIds}
                    />
                    <div
                        className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-250 ease-out"
                        style={{
                            gridTemplateRows: matchType === "doubles" ? "1fr" : "0fr",
                            opacity: matchType === "doubles" ? 1 : 0,
                        }}
                    >
                        <div className="min-h-0">
                            <PlayerPickerField
                                label="Người chơi B2"
                                value={b2}
                                onSelect={setB2}
                                exclude={selectedIds}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Ghi chú (tuỳ chọn)
                        </label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="input-field text-sm"
                            placeholder="VD: Trận giao hữu cuối tuần"
                        />
                    </div>

                    <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                        ⓘ Trận sẽ vào thẳng trạng thái "Chờ kết quả" — người chơi A1 sẽ
                        nhận quyền nhập tỉ số, không ai cần xác nhận tham gia.
                    </p>
                </div>

                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitting}
                        className="px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold
                            flex items-center justify-center gap-2 flex-shrink-0
                            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Tạo trận
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
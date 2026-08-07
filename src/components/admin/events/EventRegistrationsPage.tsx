import * as XLSX from "xlsx-js-style";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Loader2,
    Users,
    Trash2,
    CheckCircle2,
    XCircle,
    Phone,
    BarChart3,
    FileSpreadsheet,
    UserPlus,
    Link2,
    Lock,
    RotateCcw,
    RefreshCw,
    X,
    Eye,
    Wallet
} from "lucide-react";
import { eventsAdminApi } from "@/lib/api";
import { createPortal } from "react-dom";
import { notifyWalletChanged } from "@/lib/wallet-events";

type PaymentFilter = "all" | "unpaid" | "paid";

export default function EventRegistrationsPage({
    activityId,
    onClose,
    onAddRegistration,
}: {
    activityId?: string;
    onClose?: () => void;
    onAddRegistration?: () => void;
} = {}) {
    const params = useParams<{ id: string }>();
    const id = activityId ?? params?.id;

    const [activity, setActivity] = useState<any>(null);
    const [regData, setRegData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [showReopenDeadlineModal, setShowReopenDeadlineModal] = useState(false);
    const [newDeadline, setNewDeadline] = useState("");
    const [reopening, setReopening] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);

    const [rejectPaymentConfirm, setRejectPaymentConfirm] = useState<{ ids: string[]; label: string } | null>(null);
    const [rejectingPayment, setRejectingPayment] = useState(false);

    const [rejectCancelConfirm, setRejectCancelConfirm] = useState<{ regId: string; label: string } | null>(null);
    const [rejectingCancel, setRejectingCancel] = useState(false);

    const [removeConfirm, setRemoveConfirm] = useState<{ type: string; regId: string; label: string } | null>(null);
    const [removing, setRemoving] = useState(false);


    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchAll();
        } finally {
            setRefreshing(false);
        }
    };

    const fetchAll = async () => {
        try {
            const [{ data: a }, { data: r }] = await Promise.all([
                eventsAdminApi.get(id!),
                eventsAdminApi.getRegistrations(id!),
            ]);
            setActivity(a);
            setRegData(r);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveCancel = async (regId: string) => {
        try {
            await eventsAdminApi.approveCancelRequest(regId);
            toast.success("Đã duyệt huỷ và hoàn tiền");
            notifyWalletChanged();
            fetchAll();
        } catch { }
    };

    const handleFinalize = async () => {
        setFinalizing(true);
        try {
            await eventsAdminApi.finalizeShirtOrder(id!);
            toast.success("Đã chốt danh sách");
            notifyWalletChanged();
            setShowFinalizeModal(false);
            fetchAll();
        } catch {
            toast.error("Chốt danh sách thất bại");
        } finally {
            setFinalizing(false);
        }
    };

    const handleReopen = async () => {
        try {
            await eventsAdminApi.reopenActivity(id!);
            toast.success("Đã mở lại đăng ký");
            fetchAll();
        } catch { }
    };

    const handleReopenWithDeadline = async () => {
        if (!newDeadline) {
            toast.error("Vui lòng chọn hạn đăng ký mới");
            return;
        }
        setReopening(true);
        try {
            await eventsAdminApi.reopenActivityWithDeadline(id!, newDeadline);
            toast.success("Đã mở lại hoạt động");
            setShowReopenDeadlineModal(false);
            fetchAll();
        } catch {
            toast.error("Mở lại hoạt động thất bại");
        } finally {
            setReopening(false);
        }
    };


    useEffect(() => {
        fetchAll();
    }, [id]);

    const handleConfirmPayment = async (regId: string | string[], type: string) => {
        const ids = Array.isArray(regId) ? regId : [regId];
        try {
            if (type === "shirt_order") {
                await Promise.all(ids.map((id) => eventsAdminApi.confirmShirtOrder(id)));
            } else if (type === "tournament") {
                await eventsAdminApi.confirmTournamentPayment(ids[0]);
            }
            toast.success("Đã xác nhận thanh toán");
            notifyWalletChanged();
            fetchAll();
        } catch { }
    };

    const handleRejectPayment = (regId: string | string[], label: string) => {
        const ids = Array.isArray(regId) ? regId : [regId];
        setRejectPaymentConfirm({ ids, label });
    };


    const executeRejectPayment = async () => {
        if (!rejectPaymentConfirm) return;
        setRejectingPayment(true);
        try {
            await Promise.all(rejectPaymentConfirm.ids.map((id) => eventsAdminApi.rejectShirtOrder(id)));
            toast.success("Đã từ chối yêu cầu thanh toán");
            setRejectPaymentConfirm(null);
            fetchAll();
        } catch {
            toast.error("Từ chối thất bại");
        } finally {
            setRejectingPayment(false);
        }
    };


    const handleRejectCancel = (regId: string, label: string) => {
        setRejectCancelConfirm({ regId, label });
    };
    const executeRejectCancel = async () => {
        if (!rejectCancelConfirm) return;
        setRejectingCancel(true);
        try {
            await eventsAdminApi.rejectCancelRequest(rejectCancelConfirm.regId);
            toast.success("Đã từ chối yêu cầu huỷ");
            setRejectCancelConfirm(null);
            fetchAll();
        } catch {
            toast.error("Từ chối thất bại");
        } finally {
            setRejectingCancel(false);
        }
    };

    const handleRemove = (type: string, regId: string, label: string) => {
        setRemoveConfirm({ type, regId, label });
    };


    const executeRemove = async () => {
        if (!removeConfirm) return;
        setRemoving(true);
        try {
            await eventsAdminApi.removeRegistration(removeConfirm.type, removeConfirm.regId);
            toast.success("Đã xoá đăng ký");
            notifyWalletChanged();
            setRemoveConfirm(null);
            fetchAll();
        } catch {
            toast.error("Xoá thất bại");
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }
    if (!activity || !regData) return null;

    const registrations = regData.registrations ?? [];

    const totalCollected =
        activity.type === "shirt_order"
            ? registrations
                .filter((r: any) => {
                    if (paymentFilter === "paid") return r.payment_status === "confirmed";
                    if (paymentFilter === "unpaid") return r.payment_status !== "confirmed";
                    return true;
                })
                .filter((r: any) => r.payment_status === "confirmed")
                .reduce(
                    (sum: number, r: any) =>
                        sum + (r.total_amount ?? (r.unit_price ?? 0) * (r.quantity ?? 1)),
                    0,
                )
            : 0;

    return (
        <div className="w-full mx-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
                <div className="pr-12">
                    <h1 className="text-xl font-bold text-gray-900">
                        {activity.emoji} {activity.title}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {activity.type === "poll"
                            ? `${(regData.votes ?? []).length} lượt bình chọn`
                            : `${registrations.length} đăng ký`}
                    </p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:flex-wrap w-full sm:w-auto mt-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium whitespace-nowrap disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Làm mới
                    </button>
                    {activity.type === "shirt_order" && activity.status !== "closed" && (
                        <>
                            <button
                                onClick={() => handleCopyPublicLink(activity.id)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium whitespace-nowrap"
                            >
                                <Link2 className="w-4 h-4" /> Tạo link công khai
                            </button>
                            {onAddRegistration && (
                                <button
                                    onClick={onAddRegistration}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium whitespace-nowrap"
                                >
                                    <UserPlus className="w-4 h-4" /> Thêm đăng ký
                                </button>
                            )}
                            <button
                                onClick={() => setShowFinalizeModal(true)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium whitespace-nowrap"
                            >
                                <Lock className="w-4 h-4" /> Chốt danh sách
                            </button>
                        </>
                    )}
                    {activity.type === "shirt_order" && activity.status === "closed" && activity.closed_reason !== "deadline" && (
                        <button
                            onClick={handleReopen}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium whitespace-nowrap"
                        >
                            <RotateCcw className="w-4 h-4" /> Mở đăng ký
                        </button>
                    )}
                    {activity.type === "shirt_order" && activity.status === "closed" && activity.closed_reason === "deadline" && (
                        <button
                            onClick={() => setShowReopenDeadlineModal(true)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium whitespace-nowrap"
                        >
                            <RotateCcw className="w-4 h-4" /> Mở lại hoạt động
                        </button>
                    )}
                    <button
                        onClick={() => exportToExcel(activity, regData)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium whitespace-nowrap col-span-2 sm:col-span-1"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
                    </button>
                </div>
            </div>

            <div className="px-4 py-6 space-y-4">
                {activity.type === "shirt_order" && registrations.length > 0 && (
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                            {(
                                [
                                    { value: "all", label: "Tất cả" },
                                    { value: "unpaid", label: "Chưa thanh toán" },
                                    { value: "paid", label: "Đã thanh toán" },
                                ] as { value: PaymentFilter; label: string }[]
                            ).map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPaymentFilter(opt.value)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${paymentFilter === opt.value
                                        ? "bg-white shadow-sm text-blue-600"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                            <span className="text-xs font-medium text-emerald-600">
                                Tổng thu (đã xác nhận)
                            </span>
                            <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                                {fmt(totalCollected)}
                            </span>
                        </div>
                    </div>
                )}

                {activity.type === "poll" ? (
                    <div
                        className={`transition-all duration-300 ${refreshing ? "opacity-50 grayscale animate-pulse pointer-events-none" : ""
                            }`}
                    >
                        <PollResults regData={regData} />
                    </div>
                ) : (
                    <div
                        className={`card !p-0 overflow-hidden transition-all duration-300 ${refreshing ? "opacity-50 grayscale animate-pulse pointer-events-none" : ""
                            }`}
                    >
                        {registrations.length === 0 ? (
                            <div className="py-16 text-center text-gray-400">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>Chưa có ai đăng ký</p>
                            </div>
                        ) : activity.type === "shirt_order" ? (
                            <ShirtOrderTable
                                registrations={registrations}
                                paymentFilter={paymentFilter}
                                shirtTypes={activity.detail?.shirt_types ?? []}
                                onConfirm={(regIds: string[]) => handleConfirmPayment(regIds, "shirt_order")}
                                onReject={handleRejectPayment}
                                onRemove={(regId: string, label: string) => handleRemove("shirt_order", regId, label)}
                                onApproveCancel={handleApproveCancel}
                                onRejectCancel={handleRejectCancel}
                                onViewProof={setProofImageUrl}
                            />
                        ) : activity.type === "tournament" ? (
                            <TournamentTable
                                registrations={registrations}
                                totalReceived={regData.total_received ?? 0}
                                totalExpected={regData.total_expected ?? 0}
                                onConfirm={(regId: string) =>
                                    handleConfirmPayment(regId, "tournament")
                                }
                                onRemove={(regId: string, label: string) =>
                                    handleRemove("tournament", regId, label)
                                }
                            />
                        ) : activity.type === "offline_event" ? (
                            <OfflineEventTable
                                registrations={registrations}
                                onRemove={(regId: string, label: string) =>
                                    handleRemove("offline_event", regId, label)
                                }
                            />
                        ) : null}
                    </div>
                )}

                {proofImageUrl && (
                    <ProofImageModal
                        url={proofImageUrl}
                        onClose={() => setProofImageUrl(null)}
                    />
                )}

                {showFinalizeModal && createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h2 className="font-bold text-gray-900">Chốt danh sách đặt áo</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Các đăng ký <strong>chưa thanh toán và chưa gửi yêu cầu thanh toán</strong> bên dưới sẽ được xử lý khi bấm "Chốt":
                                    thành viên sẽ tự động bị trừ ví, khách chưa thanh toán sẽ được đánh dấu đỏ.
                                    Đơn đã bị từ chối hoặc đang chờ admin xác nhận sẽ <strong>không</strong> bị ảnh hưởng — cần xử lý thủ công.
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {registrations
                                    .filter((r: any) =>
                                        r.payment_status !== "confirmed" &&
                                        r.payment_status !== "rejected" &&
                                        !r.payment_method
                                    )
                                    .map((r: any) => (
                                        <div key={r.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {r.users?.full_name ?? r.guest_full_name ?? "—"}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {r.user_id ? "Thành viên · sẽ trừ ví" : "Khách · sẽ đánh dấu chưa thanh toán"}
                                                </p>
                                            </div>
                                            <span className="font-semibold text-gray-700">
                                                {fmt(r.total_amount ?? (r.unit_price ?? 0) * (r.quantity ?? 1))}
                                            </span>
                                        </div>
                                    ))}
                                {registrations.filter((r: any) =>
                                    r.payment_status !== "confirmed" &&
                                    r.payment_status !== "rejected" &&
                                    !r.payment_method
                                ).length === 0 && (
                                        <p className="text-center text-gray-400 py-8">Không còn đơn nào cần xử lý</p>
                                    )}
                            </div>
                            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
                                <button
                                    onClick={() => setShowFinalizeModal(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleFinalize}
                                    disabled={finalizing}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60"
                                >
                                    {finalizing ? "Đang chốt..." : "Chốt danh sách"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {showReopenDeadlineModal && createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
                            <h2 className="font-bold text-gray-900">Mở lại hoạt động</h2>
                            <p className="text-sm text-gray-500">
                                Hoạt động đã đóng do hết hạn đăng ký. Vui lòng chọn hạn mới để mở lại.
                            </p>
                            <input
                                type="datetime-local"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowReopenDeadlineModal(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleReopenWithDeadline}
                                    disabled={reopening}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                                >
                                    {reopening ? "Đang cập nhật..." : "Cập nhật & mở lại"}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}


                {rejectPaymentConfirm && (
                    <ConfirmModal
                        title="Từ chối thanh toán"
                        message={<>Từ chối yêu cầu thanh toán của <strong>"{rejectPaymentConfirm.label}"</strong>?</>}
                        confirmLabel="Từ chối"
                        confirmColorClass="bg-red-500 hover:bg-red-600"
                        icon={<XCircle className="w-5 h-5 text-red-500" />}
                        iconBgClass="bg-red-50"
                        loading={rejectingPayment}
                        onConfirm={executeRejectPayment}
                        onCancel={() => setRejectPaymentConfirm(null)}
                    />
                )}


                {rejectCancelConfirm && (
                    <ConfirmModal
                        title="Từ chối yêu cầu huỷ"
                        message={<>Từ chối yêu cầu huỷ của <strong>"{rejectCancelConfirm.label}"</strong>?</>}
                        confirmLabel="Từ chối"
                        confirmColorClass="bg-red-500 hover:bg-red-600"
                        icon={<XCircle className="w-5 h-5 text-red-500" />}
                        iconBgClass="bg-red-50"
                        loading={rejectingCancel}
                        onConfirm={executeRejectCancel}
                        onCancel={() => setRejectCancelConfirm(null)}
                    />
                )}


                {removeConfirm && (
                    <ConfirmModal
                        title="Xoá đăng ký"
                        message={<>Xoá đăng ký của <strong>"{removeConfirm.label}"</strong>? Hành động này không thể hoàn tác.</>}
                        confirmLabel="Xoá"
                        confirmColorClass="bg-red-600 hover:bg-red-700"
                        icon={<Trash2 className="w-5 h-5 text-red-600" />}
                        iconBgClass="bg-red-50"
                        loading={removing}
                        onConfirm={executeRemove}
                        onCancel={() => setRemoveConfirm(null)}
                    />
                )}

            </div>
        </div>
    );
}

function ConfirmModal({
    title,
    message,
    confirmLabel,
    confirmColorClass,
    icon,
    iconBgClass,
    loading,
    onConfirm,
    onCancel,
}: {
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    confirmColorClass: string;
    icon: React.ReactNode;
    iconBgClass: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return createPortal(
        <div
            className="fixed inset-0 z-[999999] bg-black/40 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}
        >
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center gap-1.5 ${confirmColorClass}`}
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}


function ProofImageModal({
    url,
    onClose,
}: {
    url: string;
    onClose: () => void;
}) {
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    return createPortal(
        <div
            className={`fixed inset-0 z-[999999] bg-black/70 flex items-center justify-center p-4 proof-backdrop ${closing ? "proof-backdrop-out" : "proof-backdrop-in"
                }`}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div className="relative max-w-lg w-full">
                <button
                    onClick={handleClose}
                    className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <img
                    src={url}
                    alt="Ảnh chuyển khoản"
                    className={`w-full max-h-[80vh] object-contain rounded-xl bg-white proof-image ${closing ? "proof-image-out" : "proof-image-in"
                        }`}
                />
            </div>

            <style jsx>{`
                .proof-backdrop-in {
                    animation: proofBackdropIn 0.2s ease-out;
                }
                .proof-backdrop-out {
                    animation: proofBackdropOut 0.2s ease-in forwards;
                }
                .proof-image-in {
                    animation: proofImageIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .proof-image-out {
                    animation: proofImageOut 0.2s ease-in forwards;
                }
                @keyframes proofBackdropIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes proofBackdropOut {
                    from {
                        opacity: 1;
                    }
                    to {
                        opacity: 0;
                    }
                }
                @keyframes proofImageIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes proofImageOut {
                    from {
                        opacity: 1;
                        transform: scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                }
            `}</style>
        </div>,
        document.body,
    );
}

function getPaymentMethodBadge(r: any) {
    if (r.payment_method === "wallet") {
        const name = r.users?.full_name ?? r.guest_full_name ?? "";
        return {
            label: name ? `Ví BNB (${name})` : "Ví BNB",
            cls: "bg-blue-100 text-blue-700",
        };
    }
    if (r.payment_method === "transfer") {
        return { label: "Chuyển khoản", cls: "bg-sky-100 text-sky-700" };
    }
    if (r.payment_method === "cash") {
        return { label: "Tiền mặt", cls: "bg-emerald-100 text-emerald-700" };
    }
    return null;
}

function rowBgClass(r: any) {
    if (r.cancel_requested_at || r.payment_status === "rejected" || r.finalized_as_unpaid) {
        return "bg-red-100 hover:bg-red-200/70";
    }
    if (r.payment_status === "confirmed") {
        return "bg-green-100 hover:bg-green-200/70";
    }
    return "bg-yellow-100 hover:bg-yellow-200/70";
}

function bucketBgClass(items: any[]) {
    if (items.some((r: any) => r.cancel_requested_at || r.payment_status === "rejected" || r.finalized_as_unpaid)) {
        return "bg-red-100 border-red-200";
    }
    if (items.every((r: any) => r.payment_status === "confirmed")) {
        return "bg-green-100 border-green-200";
    }
    return "bg-yellow-100 border-yellow-200";
}

function paymentStatusBadge(r: any) {
    if (r.payment_status === "confirmed") {
        return { label: "Đã xác nhận", cls: "bg-green-50 text-green-700", showIcon: true };
    }
    if (r.payment_status === "rejected") {
        return { label: "Đã từ chối", cls: "bg-red-50 text-red-600", showIcon: false };
    }
    if (r.payment_method) {
        return { label: "Chờ xác nhận", cls: "bg-orange-50 text-orange-600", showIcon: false };
    }
    return { label: "Chưa thanh toán", cls: "bg-gray-100 text-gray-400", showIcon: false };
}

function paymentKey(r: any) {
    return [
        r.payment_status ?? "",
        r.payment_method ?? "",
        r.payment_reference ?? "",
        r.registered_by_admin ? "admin" : "self",
    ].join("|");
}

function samePaymentGroup(groupRegs: any[]) {
    if (groupRegs.length === 0) return true;
    const key = paymentKey(groupRegs[0]);
    return groupRegs.every((r) => paymentKey(r) === key);
}


function willDeductWallet(regs: any[]) {
    return regs.some((r: any) => r.user_id && !r.payment_method);
}

function handleConfirmClick(
    onConfirm: (ids: string[]) => void,
    regs: any[],
    label: string,
) {
    if (willDeductWallet(regs)) {
        if (
            !confirm(
                `Xác nhận thanh toán cho "${label}"?\n\nSố tiền sẽ được TRỪ THẲNG vào ví BNB của thành viên. Hành động này không thể hoàn tác.`,
            )
        )
            return;
    }
    onConfirm(regs.map((r: any) => r.id));
}

function registrantTypeBadge(r: any) {
    return r.user_id
        ? { label: "Thành viên", cls: "bg-blue-50 text-blue-600" }
        : { label: "Khách", cls: "bg-amber-50 text-amber-600" };
}

function ShirtOrderTable({
    registrations,
    paymentFilter,
    shirtTypes,
    onConfirm,
    onReject,
    onRemove,
    onApproveCancel,
    onRejectCancel,
    onViewProof,
}: {
    registrations: any[];
    paymentFilter: PaymentFilter;
    shirtTypes: any[];
    onConfirm: (regIds: string[]) => void;
    onReject: (regId: string | string[], label: string) => void;
    onRemove: (regId: string, label: string) => void;
    onApproveCancel: (regId: string) => void;
    onRejectCancel: (regId: string, label: string) => void;
    onViewProof: (url: string) => void;
}) {



    const imgSrc = (img: any) => (img ? (typeof img === "string" ? img : img.url) : null);

    const getShirtImage = (shirtTypeId?: string, colorId?: string) => {
        const type = shirtTypes.find((t: any) => t.id === shirtTypeId);
        if (!type) return null;
        const colors: any[] = type.colors ?? [];
        const color = colorId ? colors.find((c: any) => c.id === colorId) : colors[0];
        const img = color?.images?.[0] ?? type.images?.[0];
        return imgSrc(img);
    };

    const filteredRegistrations = registrations
        .filter((r) => {
            if (paymentFilter === "paid") return r.payment_status === "confirmed";
            if (paymentFilter === "unpaid") return r.payment_status !== "confirmed";
            return true;
        })
        .sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

    const groups = new Map<string, any[]>();
    for (const r of filteredRegistrations) {
        const key = r.user_id ?? r.id;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    }
    const groupList = Array.from(groups.values());

    if (filteredRegistrations.length === 0) {
        return (
            <div className="py-16 text-center text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Không có đăng ký phù hợp với bộ lọc</p>
            </div>
        );
    }

    const rowsWithMeta: {
        reg: any;
        isFirstOfGroup: boolean;
        rowSpan: number;
        groupRegs: any[];
        showTypeCell: boolean;
        typeCellSpan: number;
        showGenderCell: boolean;
        genderCellSpan: number;
        showColorCell: boolean;
        colorCellSpan: number;
        colorGroupQuantity: number;
        showSizeCell: boolean;
        sizeCellSpan: number;
    }[] = [];

    groupList.forEach((groupRegs) => {
        groupRegs.sort((a, b) => {
            const t = (a.shirt_type_name ?? "").localeCompare(b.shirt_type_name ?? "");
            if (t !== 0) return t;
            const g = (a.gender ?? "").localeCompare(b.gender ?? "");
            if (g !== 0) return g;
            const c = (a.color_name ?? "").localeCompare(b.color_name ?? "");
            if (c !== 0) return c;
            return (a.size ?? "").localeCompare(b.size ?? "");
        });

        groupRegs.forEach((r, idx) => {
            const sameTypeAsPrev =
                idx > 0 && groupRegs[idx - 1].shirt_type_name === r.shirt_type_name;
            let typeCellSpan = 1;
            if (!sameTypeAsPrev) {
                for (let i = idx + 1; i < groupRegs.length; i++) {
                    if (groupRegs[i].shirt_type_name === r.shirt_type_name) typeCellSpan++;
                    else break;
                }
            }

            const sameGenderAsPrev =
                idx > 0 &&
                groupRegs[idx - 1].shirt_type_name === r.shirt_type_name &&
                groupRegs[idx - 1].gender === r.gender;
            let genderCellSpan = 1;
            if (!sameGenderAsPrev) {
                for (let i = idx + 1; i < groupRegs.length; i++) {
                    if (
                        groupRegs[i].shirt_type_name === r.shirt_type_name &&
                        groupRegs[i].gender === r.gender
                    )
                        genderCellSpan++;
                    else break;
                }
            }

            const sameColorAsPrev =
                idx > 0 &&
                groupRegs[idx - 1].shirt_type_name === r.shirt_type_name &&
                groupRegs[idx - 1].gender === r.gender &&
                groupRegs[idx - 1].color_name === r.color_name;
            let colorCellSpan = 1;
            if (!sameColorAsPrev) {
                for (let i = idx + 1; i < groupRegs.length; i++) {
                    if (
                        groupRegs[i].shirt_type_name === r.shirt_type_name &&
                        groupRegs[i].gender === r.gender &&
                        groupRegs[i].color_name === r.color_name
                    )
                        colorCellSpan++;
                    else break;
                }
            }

            let colorGroupQuantity = 0;
            if (!sameColorAsPrev) {
                for (let i = idx; i < idx + colorCellSpan; i++) {
                    colorGroupQuantity += Number(groupRegs[i].quantity ?? 1);
                }
            }

            const sameSizeAsPrev =
                idx > 0 &&
                groupRegs[idx - 1].shirt_type_name === r.shirt_type_name &&
                groupRegs[idx - 1].gender === r.gender &&
                groupRegs[idx - 1].color_name === r.color_name &&
                groupRegs[idx - 1].size === r.size;
            let sizeCellSpan = 1;
            if (!sameSizeAsPrev) {
                for (let i = idx + 1; i < groupRegs.length; i++) {
                    if (
                        groupRegs[i].shirt_type_name === r.shirt_type_name &&
                        groupRegs[i].gender === r.gender &&
                        groupRegs[i].color_name === r.color_name &&
                        groupRegs[i].size === r.size
                    )
                        sizeCellSpan++;
                    else break;
                }
            }

            rowsWithMeta.push({
                reg: r,
                isFirstOfGroup: idx === 0,
                rowSpan: groupRegs.length,
                groupRegs,
                showTypeCell: !sameTypeAsPrev,
                typeCellSpan,
                showGenderCell: !sameGenderAsPrev,
                genderCellSpan,
                showColorCell: !sameColorAsPrev,
                colorCellSpan,
                colorGroupQuantity,
                showSizeCell: !sameSizeAsPrev,
                sizeCellSpan,
            });
        });
    });

    return (
        <>
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[1360px] text-sm border border-gray-200 border-collapse">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Thành viên
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Loại
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Loại áo
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Form áo
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Màu sắc
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Size
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Số áo
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Tên in
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                SL
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Đơn giá
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Tổng tiền
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Thanh toán
                            </th>
                            <th className="text-center px-4 py-3 border border-gray-200 whitespace-nowrap">
                                Đã thu
                            </th>
                            <th className="px-4 py-3 border border-gray-200 w-24">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rowsWithMeta.map(({
                            reg: r,
                            isFirstOfGroup,
                            rowSpan,
                            groupRegs,
                            showTypeCell,
                            typeCellSpan,
                            showGenderCell,
                            genderCellSpan,
                            showColorCell,
                            colorCellSpan,
                            colorGroupQuantity,
                            showSizeCell,
                            sizeCellSpan,
                        }) => {
                            const unitPrice = r.unit_price ?? 0;
                            const groupTotal = groupRegs.reduce(
                                (sum: number, g: any) =>
                                    sum + (g.total_amount ?? (g.unit_price ?? 0) * (g.quantity ?? 1)),
                                0,
                            );
                            const groupCollected = groupRegs.reduce(
                                (sum: number, g: any) =>
                                    sum + (g.payment_status === "confirmed"
                                        ? (g.total_amount ?? (g.unit_price ?? 0) * (g.quantity ?? 1))
                                        : 0),
                                0,
                            );

                            return (
                                <tr key={r.id} className={rowBgClass(r)}>
                                    {isFirstOfGroup && (
                                        <td
                                            rowSpan={rowSpan}
                                            className="px-4 py-3 border border-gray-200 align-middle text-center"
                                        >
                                            <div className="flex items-center justify-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                                    {r.users?.avatar_url ? (
                                                        <img
                                                            src={r.users.avatar_url}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        getAvatarInitial(r.users?.full_name ?? r.guest_full_name)
                                                    )}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {r.users?.full_name ?? r.guest_full_name ?? "—"}
                                                    </p>
                                                    {(r.users?.phone ?? r.guest_phone) && (
                                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {r.users?.phone ?? r.guest_phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    )}

                                    {isFirstOfGroup && (
                                        <td rowSpan={rowSpan} className="px-4 py-3 border border-gray-200 align-middle text-center">
                                            {(() => {
                                                const typeBadge = registrantTypeBadge(r);
                                                return (
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${typeBadge.cls}`}>
                                                        {typeBadge.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    )}

                                    {showTypeCell && (
                                        <td
                                            rowSpan={typeCellSpan}
                                            className="px-4 py-3 border border-gray-200 text-gray-600 whitespace-nowrap text-center align-middle"
                                        >
                                            {r.shirt_type_name ?? "—"}
                                        </td>
                                    )}
                                    {showGenderCell && (
                                        <td
                                            rowSpan={genderCellSpan}
                                            className="px-4 py-3 border border-gray-200 text-center align-middle"
                                        >
                                            <span
                                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${r.gender === "nu"
                                                    ? "bg-pink-50 text-pink-600"
                                                    : "bg-blue-50 text-blue-600"
                                                    }`}
                                            >
                                                {r.gender === "nu" ? "Nữ" : "Nam"}
                                            </span>
                                        </td>
                                    )}
                                    {showColorCell && (
                                        <td
                                            rowSpan={colorCellSpan}
                                            className="px-4 py-3 border border-gray-200 text-gray-600 whitespace-nowrap text-center align-middle"
                                        >
                                            {r.color_name ?? "—"}
                                        </td>
                                    )}
                                    {showSizeCell && (
                                        <td
                                            rowSpan={sizeCellSpan}
                                            className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-center align-middle"
                                        >
                                            {r.size}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 border border-gray-200 text-gray-600 text-center">
                                        {r.jersey_number || "—"}
                                    </td>
                                    <td className="px-4 py-3 border border-gray-200 text-gray-600 text-center">
                                        {r.print_name || "—"}
                                    </td>
                                    {showColorCell && (
                                        <td rowSpan={colorCellSpan} className="px-4 py-3 border border-gray-200 text-gray-700 font-semibold text-center align-middle">
                                            {colorGroupQuantity}
                                        </td>
                                    )}
                                    {showColorCell && (
                                        <td rowSpan={colorCellSpan} className="px-4 py-3 border border-gray-200 text-gray-600 whitespace-nowrap text-center align-middle">
                                            {fmt(unitPrice)}
                                        </td>
                                    )}

                                    {isFirstOfGroup && (
                                        <td
                                            rowSpan={rowSpan}
                                            className="px-4 py-3 border border-gray-200 align-middle font-bold text-gray-900 whitespace-nowrap text-center"
                                        >
                                            {fmt(groupTotal)}
                                        </td>
                                    )}

                                    {(() => {
                                        const mergePayment = samePaymentGroup(groupRegs);
                                        if (mergePayment && !isFirstOfGroup) return null;

                                        const targetRegs = mergePayment ? groupRegs : [r];
                                        const targetIds = targetRegs.map((g: any) => g.id);
                                        const repReg = targetRegs.find((g: any) => g.payment_method) ?? targetRegs[0];
                                        const statusBadge = paymentStatusBadge(repReg);
                                        const methodBadge = getPaymentMethodBadge(repReg);
                                        const canConfirmReject =
                                            repReg.payment_status !== "confirmed" &&
                                            (!!repReg.payment_method || repReg.registered_by_admin);
                                        const canDeductWallet =
                                            !canConfirmReject &&
                                            !!repReg.user_id &&
                                            repReg.payment_status !== "confirmed" &&
                                            !repReg.payment_method;
                                        const label = repReg.users?.full_name ?? repReg.guest_full_name ?? "";

                                        return (
                                            <td
                                                rowSpan={mergePayment ? rowSpan : 1}
                                                className="px-4 py-3 border border-gray-200 align-middle text-center"
                                            >
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 whitespace-nowrap ${statusBadge.cls}`}>
                                                        {statusBadge.showIcon && <CheckCircle2 className="w-3 h-3" />}
                                                        {statusBadge.label}
                                                    </span>
                                                    {repReg.registered_by_admin && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-600 whitespace-nowrap">
                                                            Admin thêm
                                                        </span>
                                                    )}
                                                    {methodBadge && (
                                                        <span className="flex items-center gap-1">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${methodBadge.cls}`}>
                                                                {methodBadge.label}
                                                            </span>
                                                            {repReg.payment_proof_url && (
                                                                <button
                                                                    onClick={() => onViewProof(repReg.payment_proof_url)}
                                                                    title="Xem ảnh chuyển khoản"
                                                                    className="p-0.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </span>
                                                    )}
                                                    {canConfirmReject && (
                                                        <div className="flex flex-col items-center gap-1.5 pt-1.5">
                                                            <button
                                                                onClick={() => handleConfirmClick(onConfirm, targetRegs, label)}
                                                                className="py-1 px-3 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1 whitespace-nowrap"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận
                                                            </button>
                                                            <button
                                                                onClick={() => onReject(targetIds, label)}
                                                                className="py-1 px-3 rounded-lg text-xs font-medium bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1 whitespace-nowrap"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                            </button>
                                                        </div>
                                                    )}
                                                    {canDeductWallet && (
                                                        <div className="pt-1.5">
                                                            <button
                                                                onClick={() => handleConfirmClick(onConfirm, targetRegs, label)}
                                                                className="py-1 px-3 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1 whitespace-nowrap"
                                                            >
                                                                <Wallet className="w-3.5 h-3.5" /> Trừ vào ví
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })()}

                                    {isFirstOfGroup && (
                                        <td
                                            rowSpan={rowSpan}
                                            className="px-4 py-3 border border-gray-200 align-middle text-center whitespace-nowrap"
                                        >
                                            <span className={`font-semibold ${groupCollected > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                                                {groupCollected > 0 ? fmt(groupCollected) : "—"}
                                            </span>
                                        </td>
                                    )}

                                    <td className="px-4 py-3 border border-gray-200 text-center">
                                        {r.cancel_requested_at ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold whitespace-nowrap">
                                                    Yêu cầu huỷ
                                                </span>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => onApproveCancel(r.id)}
                                                        title="Duyệt huỷ & hoàn tiền"
                                                        className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onRejectCancel(r.id, r.users?.full_name ?? r.guest_full_name ?? "")}
                                                        title="Từ chối yêu cầu huỷ"
                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onRemove(r.id, r.users?.full_name ?? "")}
                                                title="Xoá đăng ký"
                                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
                {groupList.map((groupRegs) => {
                    const first = groupRegs[0];
                    const mergePayment = samePaymentGroup(groupRegs);

                    const colorBuckets = new Map<string, { shirt_type_name: string; color_name?: string; shirt_type_id?: string; color_id?: string; unitPrice: number; totalQty: number; items: any[] }>();
                    for (const r of groupRegs) {
                        const key = `${r.shirt_type_name ?? "—"}|${r.color_name ?? "—"}`;
                        if (!colorBuckets.has(key)) {
                            colorBuckets.set(key, {
                                shirt_type_name: r.shirt_type_name ?? "—",
                                color_name: r.color_name,
                                shirt_type_id: r.shirt_type_id,
                                color_id: r.color_id,
                                unitPrice: r.unit_price ?? 0,
                                totalQty: 0,
                                items: [],
                            });
                        }
                        const bucket = colorBuckets.get(key)!;
                        bucket.totalQty += Number(r.quantity ?? 1);
                        bucket.items.push(r);
                    }
                    const buckets = Array.from(colorBuckets.values());

                    const memberStatusBadge = paymentStatusBadge(
                        groupRegs.find((g: any) => g.payment_method) ?? groupRegs[0],
                    );
                    const memberMethodBadge = getPaymentMethodBadge(
                        groupRegs.find((g: any) => g.payment_method) ?? groupRegs[0],
                    );
                    const memberTotal = groupRegs.reduce(
                        (sum: number, g: any) =>
                            sum + (g.total_amount ?? (g.unit_price ?? 0) * (g.quantity ?? 1)),
                        0,
                    );
                    const repReg = groupRegs.find((g: any) => g.payment_status || g.payment_method) ?? groupRegs[0];
                    const canConfirmReject =
                        mergePayment &&
                        repReg.payment_status !== "confirmed" &&
                        (!!repReg.payment_method || repReg.registered_by_admin);
                    const canDeductWallet =
                        mergePayment &&
                        !canConfirmReject &&
                        !!repReg.user_id &&
                        repReg.payment_status !== "confirmed" &&
                        !repReg.payment_method;
                    const groupIds = groupRegs.map((g: any) => g.id);
                    const memberLabel = repReg.users?.full_name ?? repReg.guest_full_name ?? "";

                    return (
                        <div
                            key={first.user_id ?? first.id}
                            className="rounded-2xl border border-gray-100 bg-white ring-1 ring-black/5 p-4 space-y-3"
                            style={{ boxShadow: "0 12px 28px -8px rgba(0,0,0,0.18), 0 4px 10px -4px rgba(0,0,0,0.08)" }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center font-semibold text-blue-600 overflow-hidden flex-shrink-0">
                                    {first.users?.avatar_url ? (
                                        <img
                                            src={first.users.avatar_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        getAvatarInitial(first.users?.full_name ?? first.guest_full_name)
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {first.users?.full_name ?? first.guest_full_name ?? "—"}
                                    </p>
                                    {(first.users?.phone ?? first.guest_phone) && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {first.users?.phone ?? first.guest_phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {buckets.map((bucket, bIdx) => {
                                    const imageUrl = getShirtImage(bucket.shirt_type_id, bucket.color_id);
                                    return (
                                        <div key={bIdx} className={`rounded-xl border p-3 space-y-2 ${bucketBgClass(bucket.items)}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt={bucket.color_name ?? ""} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[9px] text-gray-300">No img</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {bucket.shirt_type_name}
                                                        {bucket.color_name ? ` · ${bucket.color_name}` : ""}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        SL <strong className="text-gray-700">{bucket.totalQty}</strong>
                                                        {" · "}Đơn giá <strong className="text-gray-700">{fmt(bucket.unitPrice)}</strong>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                                                {bucket.items.map((r: any) => {
                                                    const itemStatusBadge = paymentStatusBadge(r);
                                                    const itemMethodBadge = getPaymentMethodBadge(r);
                                                    const itemCanConfirmReject =
                                                        !mergePayment &&
                                                        r.payment_status !== "confirmed" &&
                                                        (!!r.payment_method || r.registered_by_admin);
                                                    const itemCanDeductWallet =
                                                        !mergePayment &&
                                                        !itemCanConfirmReject &&
                                                        !!r.user_id &&
                                                        r.payment_status !== "confirmed" &&
                                                        !r.payment_method;

                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className="flex flex-col gap-1.5 text-xs rounded-lg px-1.5 py-1 -mx-1.5"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-gray-500">
                                                                        <strong className={r.gender === "nu" ? "text-pink-600" : "text-blue-600"}>
                                                                            {r.gender === "nu" ? "Nữ" : "Nam"}
                                                                        </strong>
                                                                        {" · "}Size <strong className="text-gray-700">{r.size}</strong>
                                                                        {r.jersey_number && <> · Số <strong className="text-gray-700">{r.jersey_number}</strong></>}
                                                                        {r.print_name && <> · Tên <strong className="text-gray-700">"{r.print_name}"</strong></>}
                                                                        {" · SL "}
                                                                        <strong className="text-gray-700">{r.quantity}</strong>
                                                                    </span>
                                                                    {r.cancel_requested_at && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold w-fit">
                                                                            Yêu cầu huỷ
                                                                        </span>
                                                                    )}
                                                                    {!mergePayment && (
                                                                        <div className="flex flex-wrap items-center gap-1">
                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${itemStatusBadge.cls}`}>
                                                                                {itemStatusBadge.showIcon && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                                                {itemStatusBadge.label}
                                                                            </span>
                                                                            {r.registered_by_admin && (
                                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-600 w-fit">
                                                                                    Admin thêm
                                                                                </span>
                                                                            )}
                                                                            {itemMethodBadge && (
                                                                                <span className="flex items-center gap-1">
                                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold w-fit ${itemMethodBadge.cls}`}>
                                                                                        {itemMethodBadge.label}
                                                                                    </span>
                                                                                    {r.payment_proof_url && (
                                                                                        <button
                                                                                            onClick={() => onViewProof(r.payment_proof_url)}
                                                                                            title="Xem ảnh chuyển khoản"
                                                                                            className="p-0.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                                                        >
                                                                                            <Eye className="w-3 h-3" />
                                                                                        </button>
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {r.cancel_requested_at ? (
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <button
                                                                            onClick={() => onApproveCancel(r.id)}
                                                                            className="p-1 -m-1 text-gray-400 hover:text-green-600"
                                                                            title="Duyệt huỷ & hoàn tiền"
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => onRejectCancel(r.id, r.users?.full_name ?? "")}
                                                                            className="p-1 -m-1 text-gray-400 hover:text-red-500"
                                                                            title="Từ chối yêu cầu huỷ"
                                                                        >
                                                                            <XCircle className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => onRemove(r.id, r.users?.full_name ?? "")}
                                                                        className="p-1 -m-1 text-gray-300 hover:text-red-500 flex-shrink-0"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {itemCanConfirmReject && (
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <button
                                                                        onClick={() => handleConfirmClick(onConfirm, [r], r.users?.full_name ?? r.guest_full_name ?? "")}
                                                                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onReject([r.id], r.users?.full_name ?? r.guest_full_name ?? "")}
                                                                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {itemCanDeductWallet && (
                                                                <div className="mt-2">
                                                                    <button
                                                                        onClick={() => handleConfirmClick(onConfirm, [r], r.users?.full_name ?? r.guest_full_name ?? "")}
                                                                        className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <Wallet className="w-3.5 h-3.5" /> Trừ vào ví
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {mergePayment ? (
                                        <>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${memberStatusBadge.cls}`}>
                                                {memberStatusBadge.showIcon && <CheckCircle2 className="w-3 h-3" />}
                                                {memberStatusBadge.label}
                                            </span>
                                            {repReg.registered_by_admin && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-50 text-purple-600">
                                                    Admin thêm
                                                </span>
                                            )}
                                            {memberMethodBadge && (
                                                <span className="flex items-center gap-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${memberMethodBadge.cls}`}>
                                                        {memberMethodBadge.label}
                                                    </span>
                                                    {repReg.payment_proof_url && (
                                                        <button
                                                            onClick={() => onViewProof(repReg.payment_proof_url)}
                                                            title="Xem ảnh chuyển khoản"
                                                            className="p-0.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-gray-400 italic">Nhiều trạng thái thanh toán</span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-gray-900">{fmt(memberTotal)}</span>
                            </div>

                            {canConfirmReject && (
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={() => handleConfirmClick(onConfirm, groupRegs, memberLabel)}
                                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Xác nhận
                                    </button>
                                    <button
                                        onClick={() => onReject(groupIds, memberLabel)}
                                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-1.5"
                                    >
                                        <XCircle className="w-4 h-4" /> Từ chối
                                    </button>
                                </div>
                            )}
                            {canDeductWallet && (
                                <div className="pt-1">
                                    <button
                                        onClick={() => handleConfirmClick(onConfirm, groupRegs, memberLabel)}
                                        className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                                    >
                                        <Wallet className="w-4 h-4" /> Trừ vào ví
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function handleCopyPublicLink(activityId: string) {
    const url = `${window.location.origin}/dat-ao/${activityId}`;
    navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Đã sao chép link đặt áo công khai"))
        .catch(() => toast.error("Không thể sao chép link"));
}

function fmt(n: number) {
    return Math.round(n ?? 0).toLocaleString("vi-VN") + "đ";
}

function paymentMethodExcelLabel(r: any) {
    if (r.payment_method === "wallet") {
        const name = r.users?.full_name ?? r.guest_full_name ?? "—";
        return `Ví BNB (${name})`;
    }
    if (r.payment_method === "transfer") return "Chuyển khoản";
    if (r.payment_method === "cash") return "Tiền mặt";
    return "—";
}

function getAvatarInitial(fullName?: string | null): string {
    if (!fullName?.trim()) return "?";
    const words = fullName.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return lastWord[0]?.toUpperCase() ?? "?";
}

function exportToExcel(activity: any, regData: any) {
    let rows: any[] = [];
    let merges: XLSX.Range[] = [];
    let rowGroupIndex: number[] = [];
    let rowIsUnpaidFinalized: boolean[] = [];

    if (activity.type === "shirt_order") {
        const registrations = regData.registrations ?? [];

        const groups = new Map<string, any[]>();
        for (const r of registrations) {
            const key = r.user_id ?? r.id;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(r);
        }
        const groupList = Array.from(groups.values());

        let currentRowIndex = 0;
        groupList.forEach((groupRegs, groupIdx) => {
            groupRegs.sort((a, b) => {
                const t = (a.shirt_type_name ?? "").localeCompare(b.shirt_type_name ?? "");
                if (t !== 0) return t;
                const g = (a.gender ?? "").localeCompare(b.gender ?? "");
                if (g !== 0) return g;
                const c = (a.color_name ?? "").localeCompare(b.color_name ?? "");
                if (c !== 0) return c;
                return (a.size ?? "").localeCompare(b.size ?? "");
            });

            const groupTotal = groupRegs.reduce(
                (sum: number, g: any) =>
                    sum + (g.total_amount ?? (g.unit_price ?? 0) * (g.quantity ?? 1)),
                0,
            );

            const startRow = currentRowIndex + 1;
            const endRow = currentRowIndex + groupRegs.length;

            if (groupRegs.length > 1) {
                const memberLevelCols = [0, 1, 10, 11, 12, 13, 14];
                for (const c of memberLevelCols) {
                    merges.push({ s: { r: startRow, c }, e: { r: endRow, c } });
                }
            }

            let typeCursor = 0;
            while (typeCursor < groupRegs.length) {
                let span = 1;
                while (
                    typeCursor + span < groupRegs.length &&
                    groupRegs[typeCursor + span].shirt_type_name === groupRegs[typeCursor].shirt_type_name
                ) {
                    span++;
                }
                if (span > 1) {
                    merges.push({
                        s: { r: startRow + typeCursor, c: 2 },
                        e: { r: startRow + typeCursor + span - 1, c: 2 },
                    });
                }
                typeCursor += span;
            }

            let genderCursor = 0;
            while (genderCursor < groupRegs.length) {
                let span = 1;
                while (
                    genderCursor + span < groupRegs.length &&
                    groupRegs[genderCursor + span].shirt_type_name === groupRegs[genderCursor].shirt_type_name &&
                    groupRegs[genderCursor + span].gender === groupRegs[genderCursor].gender
                ) {
                    span++;
                }
                if (span > 1) {
                    merges.push({
                        s: { r: startRow + genderCursor, c: 3 },
                        e: { r: startRow + genderCursor + span - 1, c: 3 },
                    });
                }
                genderCursor += span;
            }

            let colorCursor = 0;
            while (colorCursor < groupRegs.length) {
                let span = 1;
                while (
                    colorCursor + span < groupRegs.length &&
                    groupRegs[colorCursor + span].shirt_type_name === groupRegs[colorCursor].shirt_type_name &&
                    groupRegs[colorCursor + span].gender === groupRegs[colorCursor].gender &&
                    groupRegs[colorCursor + span].color_name === groupRegs[colorCursor].color_name
                ) {
                    span++;
                }
                if (span > 1) {
                    for (const c of [4, 8, 9]) {
                        merges.push({
                            s: { r: startRow + colorCursor, c },
                            e: { r: startRow + colorCursor + span - 1, c },
                        });
                    }
                }
                colorCursor += span;
            }

            let cIdx = 0;
            while (cIdx < groupRegs.length) {
                let span = 1;
                while (
                    cIdx + span < groupRegs.length &&
                    groupRegs[cIdx + span].shirt_type_name === groupRegs[cIdx].shirt_type_name &&
                    groupRegs[cIdx + span].gender === groupRegs[cIdx].gender &&
                    groupRegs[cIdx + span].color_name === groupRegs[cIdx].color_name
                ) {
                    span++;
                }
                const colorGroupQty = groupRegs
                    .slice(cIdx, cIdx + span)
                    .reduce((s: number, g: any) => s + Number(g.quantity ?? 1), 0);

                for (let i = cIdx; i < cIdx + span; i++) {
                    const r = groupRegs[i];
                    rows.push({
                        "Thành viên": r.users?.full_name ?? r.guest_full_name ?? "—",
                        "SĐT": r.users?.phone ?? r.guest_phone ?? "—",
                        "Loại áo": r.shirt_type_name ?? "—",
                        "Form áo": r.gender === "nu" ? "Nữ" : "Nam",
                        "Màu sắc": r.color_name ?? "—",
                        "Size": r.size,
                        "Số áo": r.jersey_number ?? "—",
                        "Tên in": r.print_name ?? "—",
                        "SL": i === cIdx ? colorGroupQty : "",
                        "Đơn giá": i === cIdx ? (r.unit_price ?? 0) : "",
                        "Tổng tiền (theo thành viên)": groupTotal,
                        "Trạng thái TT":
                            r.payment_status === "confirmed" ? "Đã xác nhận" : "Chưa xác nhận",
                        "Trạng thái huỷ": r.cancel_requested_at
                            ? "Đang chờ duyệt huỷ"
                            : "—",
                        "Phương thức": paymentMethodExcelLabel(r),
                        "Nguồn": r.registered_by_admin ? "Admin thêm" : "Tự đăng ký",
                    });
                    rowGroupIndex.push(groupIdx);
                    rowIsUnpaidFinalized.push(!!r.finalized_as_unpaid);
                }
                cIdx += span;
            }

            currentRowIndex += groupRegs.length;
        });
    } else if (activity.type === "tournament") {
        rows = (regData.registrations ?? []).map((r: any) => ({
            "Đội": r.team_name,
            "Player 1": r.player1?.full_name ?? "—",
            "Player 2": r.player2?.full_name ?? "—",
            "Lệ phí": r.amount_override ?? 0,
            "Trạng thái TT":
                r.payment_status === "confirmed" ? "Đã xác nhận" : "Chưa xác nhận",
            "Phương thức": r.payment_method ?? "—",
        }));
    } else if (activity.type === "offline_event") {
        rows = (regData.registrations ?? []).map((r: any) => ({
            "Thành viên": r.users?.full_name ?? "—",
            "Khách đi cùng": r.guest_count ?? 0,
            "Ghi chú": r.notes ?? "—",
        }));
    } else if (activity.type === "poll") {
        const options = regData.options ?? [];
        const votes = regData.votes ?? [];
        rows = options.map((opt: any) => {
            const optVotes = votes.filter((v: any) => v.poll_option_id === opt.id);
            return {
                "Lựa chọn": opt.label,
                "Số phiếu": optVotes.length,
                "Người bình chọn": optVotes
                    .map((v: any) => v.users?.full_name)
                    .join(", "),
            };
        });
    }

    if (rows.length === 0) {
        toast.error("Không có dữ liệu để xuất");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    if (merges.length > 0) {
        ws["!merges"] = merges;
    }

    const HEADER_FILL = "FFDDEBF7";
    const ROW_FILL_EVEN = "FFFFFFFF";
    const ROW_FILL_ODD = "FFF2F2F2";
    const BORDER_STYLE = {
        top: { style: "thin", color: { rgb: "FFB0B0B0" } },
        bottom: { style: "thin", color: { rgb: "FFB0B0B0" } },
        left: { style: "thin", color: { rgb: "FFB0B0B0" } },
        right: { style: "thin", color: { rgb: "FFB0B0B0" } },
    };

    const range = XLSX.utils.decode_range(ws["!ref"]!);
    for (let R = range.s.r; R <= range.e.r; R++) {
        const isHeader = R === 0;
        const dataRowIdx = R - 1;
        const groupIdx = dataRowIdx >= 0 ? rowGroupIndex[dataRowIdx] : 0;
        const isUnpaidFinalized = dataRowIdx >= 0 ? rowIsUnpaidFinalized[dataRowIdx] : false;
        const rowFill = isHeader
            ? HEADER_FILL
            : isUnpaidFinalized
                ? "FFFCE4E4" // đỏ nhạt
                : (groupIdx % 2 === 0 ? ROW_FILL_ODD : ROW_FILL_EVEN);

        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            let cell = ws[cellAddress];
            if (!cell) {
                cell = { t: "s", v: "" };
                ws[cellAddress] = cell;
            }
            cell.s = {
                ...(cell.s ?? {}),
                alignment: {
                    horizontal: "center",
                    vertical: "center",
                    wrapText: true,
                },
                font: isHeader ? { bold: true } : (cell.s?.font ?? {}),
                fill: { fgColor: { rgb: rowFill } },
                border: BORDER_STYLE,
            };
        }
    }

    const colWidths = Object.keys(rows[0]).map((key, colIdx) => {
        const maxLen = Math.max(
            key.length,
            ...rows.map((r: any) => String(r[Object.keys(rows[0])[colIdx]] ?? "").length),
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách");
    XLSX.writeFile(wb, `${activity.title}.xlsx`);
}

function getTournamentPaymentBadge(r: any) {
    if (r.payment_method === "wallet") {
        return { label: "Ví BNB", cls: "bg-blue-100 text-blue-700" };
    }
    if (r.payment_method === "transfer") {
        return { label: "Chuyển khoản", cls: "bg-sky-100 text-sky-700" };
    }
    if (r.payment_method === "cash") {
        return { label: "Tiền mặt", cls: "bg-emerald-100 text-emerald-700" };
    }
    return null;
}

function TournamentTable({
    registrations,
    totalReceived,
    totalExpected,
    onConfirm,
    onRemove,
}: {
    registrations: any[];
    totalReceived: number;
    totalExpected: number;
    onConfirm: (regId: string) => void;
    onRemove: (regId: string, label: string) => void;
}) {
    const sortedRegistrations = [...registrations].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return (
        <div>
            {totalExpected > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <span className="text-sm text-blue-700 font-medium">Đã thu được</span>
                    <span className="text-sm font-bold text-blue-700">
                        {fmt(totalReceived)} / {fmt(totalExpected)}
                    </span>
                </div>
            )}
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="text-left px-4 py-3">Đội</th>
                        <th className="text-left px-4 py-3">Player 1</th>
                        <th className="text-left px-4 py-3">Player 2</th>
                        <th className="text-left px-4 py-3">Lệ phí</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {sortedRegistrations.map((r: any) => {
                        const badge = getTournamentPaymentBadge(r);
                        const isConfirmed = r.payment_status === "confirmed";
                        const hasPendingRequest =
                            !isConfirmed &&
                            (r.payment_method === "transfer" || r.payment_method === "cash");

                        return (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    {r.team_name}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {r.player1?.full_name ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {r.player2?.full_name ?? "—"}
                                </td>
                                <td className="px-4 py-3">
                                    {r.amount_override ? (
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className="font-medium text-gray-700">
                                                {fmt(r.amount_override)}
                                            </span>
                                            {isConfirmed ? (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-700 flex items-center gap-1 w-fit">
                                                    <CheckCircle2 className="w-3 h-3" /> Đã xác nhận
                                                </span>
                                            ) : hasPendingRequest ? (
                                                <button
                                                    onClick={() => onConfirm(r.id)}
                                                    className="text-xs px-2 py-1 rounded-full font-medium bg-orange-50 text-orange-600 hover:bg-orange-100"
                                                >
                                                    Chờ xác nhận
                                                </button>
                                            ) : (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-400 w-fit">
                                                    Chưa thanh toán
                                                </span>
                                            )}
                                            {badge && (
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${badge.cls}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => onRemove(r.id, r.team_name)}
                                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function OfflineEventTable({ registrations, onRemove }: any) {
    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                    <th className="text-left px-4 py-3">Thành viên</th>
                    <th className="text-left px-4 py-3">Khách đi cùng</th>
                    <th className="text-left px-4 py-3">Ghi chú</th>
                    <th className="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {registrations.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center font-semibold text-orange-600 overflow-hidden flex-shrink-0">
                                    {r.users?.avatar_url ? (
                                        <img src={r.users.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        (r.users?.full_name ?? r.guest_full_name)?.[0] ?? "?"
                                    )}
                                </div>
                                <p className="font-medium text-gray-900 truncate">
                                    {r.users?.full_name ?? "—"}
                                </p>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                            {r.guest_count > 0 ? `+${r.guest_count}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {r.notes || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button
                                onClick={() => onRemove(r.id, r.users?.full_name ?? "")}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function PollResults({ regData }: any) {
    const options = regData.options ?? [];
    const votes = regData.votes ?? [];
    const total = votes.length;

    return (
        <div className="space-y-3">
            {options.map((opt: any) => {
                const optVotes = votes.filter((v: any) => v.poll_option_id === opt.id);
                const pct = total > 0 ? Math.round((optVotes.length / total) * 100) : 0;
                return (
                    <div key={opt.id} className="card !p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900">{opt.label}</p>
                            <span className="text-sm font-medium text-gray-500">
                                {optVotes.length} phiếu ({pct}%)
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {optVotes.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {optVotes.map((v: any) => (
                                    <div
                                        key={v.user_id}
                                        className="flex items-center gap-1.5 bg-gray-50 rounded-full pl-1 pr-3 py-1"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center text-[10px] font-semibold text-purple-600 overflow-hidden flex-shrink-0">
                                            {v.users?.avatar_url ? (
                                                <img
                                                    src={v.users.avatar_url}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                v.users?.full_name?.[0]
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-600">
                                            {v.users?.full_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            {options.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Chưa có lựa chọn nào</p>
                </div>
            )}
        </div>
    );
}
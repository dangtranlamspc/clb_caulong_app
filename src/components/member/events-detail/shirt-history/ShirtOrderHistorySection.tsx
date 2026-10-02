"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shirt, PackageOpen, Plus, ArrowLeft, Receipt } from "lucide-react";
import { fmt } from "@/utils/utils";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Đã thanh toán", cls: "bg-[var(--success-soft)] text-[var(--success)]" },
    needs_payment: { label: "Chờ thanh toán", cls: "bg-[var(--warning-soft)] text-[var(--warning)]" },
    pending_review: {
        label: "Chờ admin xác nhận",
        cls: "bg-[var(--warning-soft)] text-[var(--warning)]",
    },
    unpaid: { label: "Chưa thanh toán", cls: "bg-[var(--surface-muted)] text-[var(--text-muted)]" },
    rejected: { label: "Bị từ chối", cls: "bg-[var(--danger-soft)] text-[var(--danger)]" },
};

function needsMemberPayment(r: any) {
    return (
        r.registered_by_admin &&
        r.payment_status !== "confirmed" &&
        r.payment_status !== "rejected" &&
        !r.payment_method
    );
}

function regStatus(r: any) {
    if (r.payment_status === "confirmed") return "confirmed";
    if (r.payment_status === "rejected") return "rejected";
    if (needsMemberPayment(r)) return "needs_payment";
    if (r.payment_reference) return "pending_review";
    return "unpaid";
}



export function ShirtOrderHistorySection({
    activity,
    myRegistrations,
    shirtTypes,
    onOpenCancel,
    onPay,
}: {
    activity: any;
    myRegistrations: any[];
    shirtTypes: any[];
    onOpenCancel: () => void;
    onPay: (registrations: any[]) => void;
}) {
    const router = useRouter();

    const canModify = activity.status === "open";

    const pendingPaymentRegs = myRegistrations.filter(needsMemberPayment);

    const priceOf = (r: any) => {
        const t = shirtTypes.find((x) => x.id === r.shirt_type_id);
        return (t?.price_per_shirt ?? 0) * (r.quantity ?? 1);
    };

    const groupedByType = new Map<string, any[]>();
    for (const reg of myRegistrations) {
        const key = reg.shirt_type_id;
        if (!groupedByType.has(key)) groupedByType.set(key, []);
        groupedByType.get(key)!.push(reg);
    }
    const typeGroups = Array.from(groupedByType.entries());

    const grandTotal = myRegistrations.reduce((s, r) => s + priceOf(r), 0);
    const totalItems = myRegistrations.reduce(
        (s, r) => s + (r.quantity ?? 1),
        0,
    );

    const adminAddedByType = new Map<string, { name: string; qty: number }>();
    for (const r of myRegistrations) {
        if (!r.registered_by_admin) continue;
        const t = shirtTypes.find((x) => x.id === r.shirt_type_id);
        const key = r.shirt_type_id;
        const name = t?.name ?? "—";
        const qty = r.quantity ?? 1;
        if (!adminAddedByType.has(key)) {
            adminAddedByType.set(key, { name, qty });
        } else {
            adminAddedByType.get(key)!.qty += qty;
        }
    }
    const adminAddedGroups = Array.from(adminAddedByType.values());
    const adminAddedTotal = adminAddedGroups.reduce((s, g) => s + g.qty, 0);

    const handleBack = () => {
        sessionStorage.setItem("activity:return-tab", "events");
        router.push("/activity");
    };



    return (
        <div className="min-h-screen bg-[var(--bg)] md:bg-transparent">
            {/* Header dính, giống EventsDetailPage */}
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
                        onClick={handleBack}
                        aria-label="Quay lại"
                        className="p-2 -ml-2 hover:bg-[var(--surface-hover)] active:bg-[var(--border-strong)] rounded-lg transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base font-bold text-[var(--text)] truncate leading-tight">
                            Lịch sử mua hàng
                        </h1>
                        <p className="text-[11px] text-[var(--text-faint)] truncate leading-tight">
                            {activity.title}
                        </p>
                    </div>
                </div>
            </div>

            <div
                className={`max-w-lg lg:max-w-3xl mx-auto px-4 pt-4 ${canModify ? "pb-28 md:pb-8" : "pb-8"
                    } space-y-4`}
            >

                {/* Summary strip */}
                {typeGroups.length > 0 && (
                    adminAddedTotal > 0 ? (
                        <div className="flex items-center gap-3 bg-[var(--warning-soft)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] rounded-2xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                                <span className="text-base">🎁</span>
                            </div>
                            <div className="text-xs text-[var(--warning)]">
                                Admin đã đặt giúp bạn{" "}
                                <span className="font-semibold">{adminAddedTotal} sản phẩm</span>{" "}
                                trong{" "}
                                <span className="font-semibold">
                                    {adminAddedGroups.map((g, i) => (
                                        <span key={i}>
                                            "{g.name}"{i < adminAddedGroups.length - 1 ? ", " : ""}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] rounded-2xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex items-center justify-center flex-shrink-0">
                                <Receipt className="w-4 h-4 text-[var(--primary)]" />
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                                Bạn đã đặt{" "}
                                <span className="font-semibold text-[var(--text)]">
                                    {totalItems} sản phẩm
                                </span>{" "}
                                trong {typeGroups.length} loại áo
                            </div>
                        </div>
                    )
                )}

                {/* Order list */}
                <div className="bg-[var(--surface)] rounded-2xl shadow-sm overflow-hidden md:border md:border-[var(--border)]">
                    {typeGroups.length === 0 ? (
                        <div className="py-16 text-center px-5">
                            <PackageOpen className="w-10 h-10 mx-auto text-[var(--text-faint)] mb-3" />
                            <p className="text-[var(--text-faint)] text-sm">Bạn chưa đặt sản phẩm nào</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {typeGroups.map(([shirtTypeId, variants]) => {
                                const type = shirtTypes.find((t) => t.id === shirtTypeId);
                                const images: string[] = (type?.colors ?? []).flatMap(
                                    (c: any) =>
                                        (c.images ?? []).map((img: any) =>
                                            typeof img === "string" ? img : img.url,
                                        ),
                                );
                                const groupQuantity = variants.reduce(
                                    (s: number, r: any) => s + (r.quantity ?? 1),
                                    0,
                                );
                                const groupTotal = variants.reduce(
                                    (s: number, r: any) => s + priceOf(r),
                                    0,
                                );

                                return (
                                    <div
                                        key={shirtTypeId}
                                        className="flex gap-3 px-5 py-4 md:hover:bg-[var(--surface-hover)] transition-colors"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-[var(--surface-muted)] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[var(--border)]">
                                            {images[0] ? (
                                                <img
                                                    src={images[0]}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Shirt className="w-6 h-6 text-[var(--text-faint)]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-[var(--text)] truncate">
                                                    {type?.name ?? "—"}
                                                </p>
                                                <span className="text-xs text-[var(--text-faint)] flex-shrink-0">
                                                    × {groupQuantity}
                                                </span>
                                            </div>

                                            <div className="mt-2 space-y-1.5">
                                                {variants.map((r: any) => {
                                                    const status = regStatus(r);
                                                    const cfg = STATUS_CFG[status];
                                                    const waitingCancel = !!r.cancel_requested_at;
                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className="flex items-center justify-between gap-2 text-xs"
                                                        >
                                                            <div className="flex flex-col gap-1 min-w-0">
                                                                <span className="text-[var(--text-faint)] truncate">
                                                                    {r.gender === "nu" ? "Nữ" : "Nam"} · Size {r.size} × {r.quantity}
                                                                    {r.color_name ? ` · ${r.color_name}` : ""}
                                                                </span>

                                                                {waitingCancel && (
                                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 w-fit">
                                                                        Đang chờ admin xác nhận hủy
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <span className="text-[var(--text-muted)] font-medium">
                                                                    {fmt(priceOf(r))}
                                                                </span>

                                                                <span
                                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}
                                                                >
                                                                    {cfg.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[var(--border)]">
                                                <span className="text-xs text-[var(--text-faint)]">
                                                    Tổng loại này
                                                </span>
                                                <span className="text-sm font-bold text-[var(--text)]">
                                                    {fmt(groupTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {typeGroups.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-muted)]">
                            <span className="text-sm font-semibold text-[var(--text)]">
                                Tổng cộng
                            </span>
                            <span className="text-lg font-black text-[var(--text)]">
                                {fmt(grandTotal)}
                            </span>
                        </div>
                    )}
                </div>

                {pendingPaymentRegs.length > 0 && (
                    <button
                        onClick={() => onPay(pendingPaymentRegs)}
                        className="hidden md:flex w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm items-center justify-center gap-2 shadow-sm shadow-orange-200 transition-all"
                    >
                        💳 Thanh toán ({pendingPaymentRegs.length} sản phẩm)
                    </button>
                )}

                {typeGroups.length > 0 && canModify && (
                    <button
                        onClick={onOpenCancel}
                        className="hidden md:flex w-full py-3.5 rounded-xl border-2 border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] hover:bg-[var(--danger-soft)] active:scale-[0.99] text-[var(--danger)] font-bold text-sm items-center justify-center gap-2 transition-all"
                    >
                        Huỷ đơn
                    </button>
                )}

                {canModify && (
                    <Link
                        href={`/events/${activity.id}`}
                        className="hidden md:block"
                    >
                        <button className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-all">
                            <Plus className="w-4 h-4" />
                            Mua thêm
                        </button>
                    </Link>
                )}

                {!canModify && (
                    <div className="flex items-center gap-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-muted)]">
                        Hoạt động đã đóng đăng ký, không thể thêm hoặc hủy đơn đặt áo.
                    </div>
                )}

            </div>

            {(canModify || pendingPaymentRegs.length > 0) && (
                <div
                    className="md:hidden fixed bottom-0 left-0 right-0 bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] backdrop-blur border-t border-[var(--border)] px-4 pt-3"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
                >
                    {pendingPaymentRegs.length > 0 && (
                        <button
                            onClick={() => onPay(pendingPaymentRegs)}
                            className="w-full mb-2 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-orange-200 transition-all"
                        >
                            💳 Thanh toán ({pendingPaymentRegs.length} sản phẩm)
                        </button>
                    )}
                    <Link href={`/events/${activity.id}`} className="block">
                        {typeGroups.length > 0 && canModify && (
                            <button
                                onClick={onOpenCancel}
                                className="w-full mb-2 py-3.5 rounded-xl border-2 border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--surface)] active:scale-[0.99] text-[var(--danger)] font-bold text-sm flex items-center justify-center gap-2"
                            >
                                Huỷ đơn
                            </button>
                        )}
                        <button className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-all">
                            <Plus className="w-4 h-4" />
                            Mua thêm
                        </button>
                    </Link>
                </div>
            )}

            {!canModify && (
                <div className="flex items-center gap-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-muted)]">
                    Hoạt động đã đóng đăng ký, không thể thêm hoặc hủy đơn đặt áo.
                </div>
            )}
        </div>
    );
}
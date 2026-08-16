"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shirt, PackageOpen, Plus, ArrowLeft, Receipt } from "lucide-react";
import { fmt } from "@/utils/utils";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Đã thanh toán", cls: "bg-emerald-50 text-emerald-600" },
    needs_payment: { label: "Chờ thanh toán", cls: "bg-orange-50 text-orange-600" },
    pending_review: {
        label: "Chờ admin xác nhận",
        cls: "bg-orange-50 text-orange-600",
    },
    unpaid: { label: "Chưa thanh toán", cls: "bg-gray-100 text-gray-500" },
    rejected: { label: "Bị từ chối", cls: "bg-red-50 text-red-500" },
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
    onCancel,
    onPay,
}: {
    activity: any;
    myRegistrations: any[];
    shirtTypes: any[];
    onCancel: (registrationId: string) => void;
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
        <div className="min-h-screen bg-gray-50/60 md:bg-transparent">
            <div className={`max-w-2xl mx-auto px-4 md:px-0 pt-4 ${canModify ? "pb-28 md:pb-8" : "pb-8"} space-y-4`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform hover:border-gray-300"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base md:text-lg font-bold text-gray-900 truncate">
                            Lịch sử mua hàng
                        </h1>
                        <p className="text-xs text-gray-400 truncate">{activity.title}</p>
                    </div>
                </div>

                {/* Summary strip */}
                {typeGroups.length > 0 && (
                    adminAddedTotal > 0 ? (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                <span className="text-base">🎁</span>
                            </div>
                            <div className="text-xs text-amber-700">
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
                        <div className="flex items-center gap-3 bg-blue-50/70 border border-blue-100 rounded-2xl px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                <Receipt className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-xs text-gray-600">
                                Bạn đã đặt{" "}
                                <span className="font-semibold text-gray-900">
                                    {totalItems} sản phẩm
                                </span>{" "}
                                trong {typeGroups.length} loại áo
                            </div>
                        </div>
                    )
                )}

                {/* Order list */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden md:border md:border-gray-100">
                    {typeGroups.length === 0 ? (
                        <div className="py-16 text-center px-5">
                            <PackageOpen className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                            <p className="text-gray-400 text-sm">Bạn chưa đặt sản phẩm nào</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
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
                                        className="flex gap-3 px-5 py-4 md:hover:bg-gray-50/60 transition-colors"
                                    >
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100">
                                            {images[0] ? (
                                                <img
                                                    src={images[0]}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Shirt className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {type?.name ?? "—"}
                                                </p>
                                                <span className="text-xs text-gray-400 flex-shrink-0">
                                                    × {groupQuantity}
                                                </span>
                                            </div>

                                            <div className="mt-2 space-y-1.5">
                                                {variants.map((r: any) => {
                                                    const status = regStatus(r);
                                                    const cfg = STATUS_CFG[status];
                                                    const waitingCancel = !!r.cancel_requested_at;
                                                    const showCancelBtn = !waitingCancel && canModify;
                                                    return (
                                                        <div
                                                            key={r.id}
                                                            className="flex items-center justify-between gap-2 text-xs"
                                                        >
                                                            <div className="flex flex-col gap-1 min-w-0">
                                                                <span className="text-gray-400 truncate">
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
                                                                <span className="text-gray-500 font-medium">
                                                                    {fmt(priceOf(r))}
                                                                </span>

                                                                <span
                                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}
                                                                >
                                                                    {cfg.label}
                                                                </span>

                                                                {showCancelBtn && (
                                                                    <button
                                                                        onClick={() => onCancel(r.id)}
                                                                        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
                                                <span className="text-xs text-gray-400">
                                                    Tổng loại này
                                                </span>
                                                <span className="text-sm font-bold text-gray-900">
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
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                            <span className="text-sm font-semibold text-gray-700">
                                Tổng cộng
                            </span>
                            <span className="text-lg font-black text-gray-900">
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
            </div>

            {(canModify || pendingPaymentRegs.length > 0) && (
                <div
                    className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 px-4 pt-3"
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
                        <button className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-200 transition-all">
                            <Plus className="w-4 h-4" />
                            Mua thêm
                        </button>
                    </Link>
                </div>
            )}

            {!canModify && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-500">
                    Hoạt động đã đóng đăng ký, không thể thêm hoặc hủy đơn đặt áo.
                </div>
            )}
        </div>
    );
}
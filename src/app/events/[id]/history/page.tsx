"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { activitiesApi } from "@/lib/api";
import { ShirtOrderHistorySection } from "../../../../components/member/events-detail/shirt-history/ShirtOrderHistorySection";
import { ShirtOrderHistorySkeleton, SkeletonStyles } from "@/components/skeletons/Skeleton";
import toast from "react-hot-toast";
import { ShirtOrderPaymentModal } from "@/components/member/modals/ShirtOrderPaymentModal";
import { useAuthStore } from "@/store/auth.store";
import { supabase } from "@/lib/supabase";
import { CancelShirtOrderModal } from "@/components/member/modals/CancelShirtOrderModal";

export default function ShirtOrderHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const currentUser = useAuthStore((s) => s.user);
    const [activity, setActivity] = useState<any>(null);
    const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const [payTargets, setPayTargets] = useState<any[] | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [{ data: activityData }, { data: statusData }] =
                    await Promise.all([
                        activitiesApi.get(id),
                        activitiesApi.getMyStatus(id),
                    ]);
                if (
                    activityData?.type !== "shirt_order" ||
                    !statusData?.my_registrations?.length
                ) {
                    router.replace(`/events/${id}`);
                    return;
                }

                setActivity(activityData);
                setMyRegistrations(statusData.my_registrations ?? []);
            } catch {
                router.replace(`/events/${id}`);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    useEffect(() => {
        if (!currentUser?.id) return;

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const refetch = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const { data } = await activitiesApi.getMyStatus(id);
                setMyRegistrations(data.my_registrations ?? []);
            }, 500);
        };

        const channel = supabase
            .channel(`my-shirt-regs:${currentUser.id}`)
            .on("broadcast", { event: "shirt_order_changed" }, refetch)
            .subscribe();

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, id]);

    const handleCancel = async (registrationId: string) => {
        if (!confirm("Bạn có chắc muốn hủy đăng ký áo này?")) return;
        try {
            const res = await activitiesApi.cancelRegistration(id, registrationId);
            toast.success(res.data.message);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Không thể hủy đăng ký");
        }
    };


    const handlePay = async (method: "wallet" | "transfer" | "cash", paymentReference?: string) => {
        if (!payTargets?.length) return;
        try {
            const regIds = payTargets.map((r) => r.id);
            await activitiesApi.payAdminPendingShirtOrderBatch(regIds, {
                method,
                payment_reference: paymentReference,
            });
            toast.success(
                method === "wallet"
                    ? "Đã thanh toán bằng ví"
                    : "Đã ghi nhận thanh toán, chờ admin xác nhận",
            );
            setPayTargets(null);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Thanh toán thất bại");
        }
    };

    if (loading || !activity) {
        return (
            <>
                <SkeletonStyles />
                <ShirtOrderHistorySkeleton />
            </>
        );
    }

    const cancellableRegs = myRegistrations.filter(
        (r) => !r.cancelled_at && !r.cancel_requested_at,
    );

    const refetchStatus = async () => {
        const { data } = await activitiesApi.getMyStatus(id);
        setMyRegistrations(data.my_registrations ?? []);
    };

    return (
        <>
            <ShirtOrderHistorySection
                activity={activity}
                myRegistrations={myRegistrations}
                shirtTypes={activity.detail?.shirt_types ?? []}
                onOpenCancel={() => setShowCancelModal(true)}
                onPay={(regs) => setPayTargets(regs)}
            />
            {payTargets && (
                <ShirtOrderPaymentModal
                    registrations={payTargets}
                    shirtTypes={activity.detail?.shirt_types ?? []}
                    memberName={currentUser?.full_name}
                    onSubmit={handlePay}
                    onClose={() => setPayTargets(null)}
                />
            )}
            {showCancelModal && (
                <CancelShirtOrderModal
                    activityId={id}
                    registrations={cancellableRegs}
                    shirtTypes={activity.detail?.shirt_types ?? []}
                    onClose={() => setShowCancelModal(false)}
                    onDone={refetchStatus}
                />
            )}
        </>
    );
}
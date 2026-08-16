"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { activitiesApi } from "@/lib/api";
import { ShirtOrderHistorySection } from "../../../../components/member/events-detail/shirt-history/ShirtOrderHistorySection";
import { ShirtOrderHistorySkeleton, SkeletonStyles } from "@/components/skeletons/Skeleton";
import toast from "react-hot-toast";
import { ShirtOrderPaymentModal } from "@/components/member/modals/ShirtOrderPaymentModal";
import { useAuthStore } from "@/store/auth.store";

export default function ShirtOrderHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const currentUser = useAuthStore((s) => s.user);
    const [activity, setActivity] = useState<any>(null);
    const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleCancel = async (registrationId: string) => {
        if (!confirm("Bạn có chắc muốn hủy đăng ký áo này?")) return;

        try {
            const res = await activitiesApi.cancelRegistration(
                id,
                registrationId
            );

            toast.success(res.data.message);

            const { data } = await activitiesApi.getMyStatus(id);
            setMyRegistrations(data.my_registrations ?? []);
        } catch (e: any) {
            toast.error(
                e.response?.data?.message || "Không thể hủy đăng ký"
            );
        }
    };


    const handlePay = async (method: "wallet" | "transfer" | "cash", paymentReference?: string) => {
        if (!payTargets?.length) return;
        try {
            for (const reg of payTargets) {
                await activitiesApi.payAdminPendingShirtOrder(reg.id, {
                    method,
                    payment_reference: paymentReference,
                });
            }
            toast.success(
                method === "wallet"
                    ? "Đã thanh toán bằng ví"
                    : "Đã ghi nhận thanh toán, chờ admin xác nhận",
            );
            const { data } = await activitiesApi.getMyStatus(id);
            setMyRegistrations(data.my_registrations ?? []);
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

    return (
        <>
            <ShirtOrderHistorySection
                activity={activity}
                myRegistrations={myRegistrations}
                shirtTypes={activity.detail?.shirt_types ?? []}
                onCancel={handleCancel}
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
        </>
    );
}
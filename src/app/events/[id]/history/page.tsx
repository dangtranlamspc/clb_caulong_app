"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { activitiesApi } from "@/lib/api";
import { ShirtOrderHistorySection } from "../../../../components/member/events-detail/shirt-history/ShirtOrderHistorySection";
import { ShirtOrderHistorySkeleton, SkeletonStyles } from "@/components/skeletons/Skeleton";
import toast from "react-hot-toast";

export default function ShirtOrderHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [activity, setActivity] = useState<any>(null);
    const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading || !activity) {
        return (
            <>
                <SkeletonStyles />
                <ShirtOrderHistorySkeleton />
            </>
        );
    }

    return (
        <ShirtOrderHistorySection
            activity={activity}
            myRegistrations={myRegistrations}
            shirtTypes={activity.detail?.shirt_types ?? []}
            onCancel={handleCancel}
        />
    );
}
"use client";

import { useEffect, useState } from "react";
import { Boxes, Package, CheckCircle2, XCircle } from "lucide-react";
import { eventsAdminApi } from "@/lib/api";

function useCountUp(target: number, duration = 900) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let raf: number;

        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(target * eased);
            if (progress < 1) {
                raf = requestAnimationFrame(animate);
            } else {
                setValue(target);
            }
        };

        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [target]);

    return value;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2];
const MONTH_OPTIONS = [
    { value: 0, label: "Cả năm" },
    ...Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: `Tháng ${i + 1}`,
    })),
];

function formatCurrency(n: number) {
    return `${n.toLocaleString("vi-VN")}đ`;
}

export default function ActivitiesOverview() {
    const now = new Date();
    const [month, setMonth] = useState<number>(now.getMonth() + 1);
    const [year, setYear] = useState<number>(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_activities: 0,
        total_orders: 0,
        paid_count: 0,
        unpaid_count: 0,
        revenue: 0,
    });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        eventsAdminApi
            .getOverview({ month: month || undefined, year })
            .then(({ data }) => {
                if (!cancelled) setStats(data);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [month, year]);

    const animatedActivities = useCountUp(loading ? 0 : stats.total_activities);
    const animatedOrders = useCountUp(loading ? 0 : stats.total_orders);
    const animatedPaid = useCountUp(loading ? 0 : stats.paid_count);
    const animatedUnpaid = useCountUp(loading ? 0 : stats.unpaid_count);
    const animatedRevenue = useCountUp(loading ? 0 : stats.revenue);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Tổng quan</h2>
                <div className="flex items-center gap-1.5">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {MONTH_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>
                                Năm {y}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Tổng hoạt động</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900 tabular-nums">
                            {Math.round(animatedActivities)}
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                            <Boxes className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Đơn hàng</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900 tabular-nums">
                            {Math.round(animatedOrders)}
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                            <Package className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Đã thanh toán</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900 tabular-nums">
                            {Math.round(animatedPaid)}
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Chưa thanh toán</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-gray-900 tabular-nums">
                            {Math.round(animatedUnpaid)}
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                            <XCircle className="w-4 h-4" />
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-1">
                <div>
                    <p className="text-xs text-gray-500 mb-1">Doanh thu</p>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {formatCurrency(Math.round(animatedRevenue))}
                    </p>
                </div>
            </div>
        </div>
    );
}
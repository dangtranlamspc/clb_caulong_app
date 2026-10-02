"use client";

export function SkeletonStyles() {
    return (
        <style>{`
      @keyframes shimmer {
        100% { transform: translateX(200%); }
      }
    `}</style>
    );
}

export function ShimmerOverlay() {
    return (
        <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
            style={{
                background:
                    "linear-gradient(90deg, transparent, var(--shimmer), transparent)",
            }}
        />
    );
}

export function SkeletonBlock({
    className = "",
    rounded = "rounded",
}: {
    className?: string;
    rounded?: string;
}) {
    return (
        <div
            className={`bg-[var(--surface-muted)] relative overflow-hidden ${rounded} ${className}`}
        >
            <ShimmerOverlay />
        </div>
    );
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
    return (
        <div
            className={`bg-[var(--surface-muted)] rounded-full relative overflow-hidden ${className}`}
        >
            <ShimmerOverlay />
        </div>
    );
}

export function SkeletonCard({
    className = "",
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 overflow-hidden relative ${className}`}
        >
            <ShimmerOverlay />
            {children}
        </div>
    );
}

export function SessionSkeleton() {
    return (
        <SkeletonCard>
            <div className="flex justify-between mb-3">
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-[var(--surface-muted)] rounded-lg w-3/5" />
                    <div className="h-3 bg-[var(--surface-muted)] rounded-lg w-2/5" />
                </div>
                <div className="h-5 w-16 bg-[var(--surface-muted)] rounded-lg ml-4" />
            </div>
            <div className="flex gap-4 mb-3">
                <div className="h-3 bg-[var(--surface-muted)] rounded w-28" />
                <div className="h-3 bg-[var(--surface-muted)] rounded w-20" />
            </div>
            <div className="h-2 bg-[var(--surface-muted)] rounded-full w-full mb-1" />
            <div className="flex justify-between mt-3 pt-3 border-t border-[var(--border)]">
                <div className="h-3 bg-[var(--surface-muted)] rounded w-24" />
                <div className="h-3 bg-[var(--surface-muted)] rounded w-6" />
            </div>
        </SkeletonCard>
    );
}

export function MatchSkeleton() {
    return (
        <SkeletonCard>
            <div className="flex justify-between mb-3">
                <div className="h-3 bg-[var(--surface-muted)] rounded w-24" />
                <div className="h-3 bg-[var(--surface-muted)] rounded w-16" />
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)]" />
                        <div className="h-3.5 bg-[var(--surface-muted)] rounded w-24" />
                    </div>
                </div>
                <div className="h-6 w-12 bg-[var(--surface-muted)] rounded" />
                <div className="flex-1 space-y-1.5 flex flex-col items-end">
                    <div className="flex items-center gap-2">
                        <div className="h-3.5 bg-[var(--surface-muted)] rounded w-24" />
                        <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)]" />
                    </div>
                </div>
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t border-[var(--border)]">
                <div className="h-3 bg-[var(--surface-muted)] rounded w-20" />
                <div className="h-3 bg-[var(--surface-muted)] rounded w-4" />
            </div>
        </SkeletonCard>
    );
}

export function EventSkeleton() {
    return (
        <SkeletonCard>
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-muted)] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[var(--surface-muted)] rounded w-3/5" />
                    <div className="h-3 bg-[var(--surface-muted)] rounded w-2/5" />
                    <div className="h-3 bg-[var(--surface-muted)] rounded w-1/3" />
                </div>
                <div className="h-5 w-16 bg-[var(--surface-muted)] rounded-lg flex-shrink-0" />
            </div>
        </SkeletonCard>
    );
}

function ShirtRowSkeleton() {
    return (
        <div className="flex gap-3 px-5 py-4 relative overflow-hidden">
            <ShimmerOverlay />
            <div className="w-16 h-16 rounded-xl bg-[var(--surface-muted)] flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="h-3.5 bg-[var(--surface-muted)] rounded w-2/5" />
                    <div className="h-3 bg-[var(--surface-muted)] rounded w-6" />
                </div>
                <div className="space-y-1.5">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                            <div className="h-2.5 bg-[var(--surface-muted)] rounded w-32" />
                            <div className="flex items-center gap-1.5">
                                <div className="h-2.5 bg-[var(--surface-muted)] rounded w-12" />
                                <div className="h-4 bg-[var(--surface-muted)] rounded-full w-20" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <div className="h-2.5 bg-[var(--surface-muted)] rounded w-16" />
                    <div className="h-3.5 bg-[var(--surface-muted)] rounded w-14" />
                </div>
            </div>
        </div>
    );
}

export function ShirtOrderHistorySkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg)] md:bg-transparent">
            <div className="max-w-2xl mx-auto px-4 md:px-0 pt-4 pb-28 md:pb-8 space-y-4">
                <div className="flex items-center gap-3">
                    <SkeletonCircle className="w-9 h-9 border border-[var(--border)] flex-shrink-0" />
                    <div className="space-y-1.5">
                        <SkeletonBlock className="h-4 w-32" />
                        <SkeletonBlock className="h-3 w-24" />
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] rounded-2xl px-4 py-3 relative overflow-hidden">
                    <ShimmerOverlay />
                    <div className="w-9 h-9 rounded-full bg-[var(--surface)] flex-shrink-0" />
                    <div className="h-3 bg-[var(--surface)] opacity-70 rounded w-48" />
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                    {[...Array(3)].map((_, i) => (
                        <ShirtRowSkeleton key={i} />
                    ))}
                    <div className="flex items-center justify-between px-5 py-4 bg-[var(--surface-muted)] relative overflow-hidden">
                        <ShimmerOverlay />
                        <div className="h-3.5 bg-[var(--border-strong)] rounded w-20" />
                        <div className="h-5 bg-[var(--border-strong)] rounded w-24" />
                    </div>
                </div>

                <SkeletonBlock className="hidden md:block h-[52px] rounded-xl" />
            </div>

            <div
                className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[var(--border)] px-4 pt-3 backdrop-blur"
                style={{
                    background: "color-mix(in srgb, var(--surface) 95%, transparent)",
                    paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
                }}
            >
                <SkeletonBlock className="w-full h-[52px] rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonList({
    count = 4,
    Component,
    gap = "space-y-4",
}: {
    count?: number;
    Component: React.ComponentType;
    gap?: string;
}) {
    return (
        <div className={gap}>
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    style={{
                        animationDelay: `${i * 60}ms`,
                        animation: "fadeSlideUp .3s ease both",
                    }}
                >
                    <Component />
                </div>
            ))}
        </div>
    );
}
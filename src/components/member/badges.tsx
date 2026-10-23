export const BADGE_BASE =
    "inline-flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold leading-none px-2 py-1 rounded-full text-white whitespace-nowrap";

export const BADGE_TONE = {
    primary: "bg-[color-mix(in_srgb,var(--primary)_70%,black)]",
    pink: "bg-[color-mix(in_srgb,var(--pink)_70%,black)]",
    warning: "bg-[color-mix(in_srgb,var(--warning)_65%,black)]",
    purple: "bg-[color-mix(in_srgb,var(--purple)_70%,black)]",
    muted: "bg-[color-mix(in_srgb,var(--text-faint)_70%,black)]",
};

export const GENDER_META: Record<
    string,
    { icon: string; label: string; tone: string; color: string }
> = {
    male: { icon: "♂", label: "Nam", tone: BADGE_TONE.primary, color: "var(--primary)" },
    female: { icon: "♀", label: "Nữ", tone: BADGE_TONE.pink, color: "var(--pink)" },
};
GENDER_META.nam = GENDER_META.male;
GENDER_META.nu = GENDER_META.female;

/** Đếm nam/nữ, tính cả khách đi cùng (mỗi registration là 1 người) */
export function countGender(list: any[]) {
    let male = 0;
    let female = 0;
    for (const r of list) {
        const g = r.users?.gender ?? r.guest_gender;
        if (g === "male" || g === "nam") male++;
        else if (g === "female" || g === "nu") female++;
    }
    return { male, female };
}

export function GenderCounts({ male, female }: { male: number; female: number }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`${BADGE_BASE} ${BADGE_TONE.primary}`}>♂ {male} Nam</span>
            <span className={`${BADGE_BASE} ${BADGE_TONE.pink}`}>♀ {female} Nữ</span>
        </span>
    );
}
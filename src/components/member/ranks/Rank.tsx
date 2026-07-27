'use client';

const TIER_ICONS: Record<string, string> = {
    'Tân thủ': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909484/Season_2023_-_Iron_ieevec.png',
    'Phong trào': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909486/Season_2023_-_Bronze_x9mmaz.png',
    'Cứng cựa': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909485/Season_2023_-_Silver_axjzr0.png',
    'Chủ lực': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909485/Season_2023_-_Gold_q3rzbo.png',
    'Cao thủ': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909484/Season_2023_-_Platinum_l08sas.png',
    'Kiện tướng': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909484/Season_2023_-_Emerald_vupqld.png',
    'Đại Kiện Tướng': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909485/Season_2023_-_Diamond_p28tnk.png',
    'Huyền Thoại': 'https://res.cloudinary.com/xte99fp4/image/upload/v1784909484/Season_2023_-_Master_fvhogq.png',
};

const TIER_FRAMES: Record<string, string> = {
    'Tân thủ': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203453/sat_frame_sjcdg2.webp',
    'Phong trào': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203449/dong_frame_s3nbx6.webp',
    'Cứng cựa': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203449/bac_frame_tvdjpw.webp',
    'Chủ lực': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203452/vang_frame_t1xqgf.webp',
    'Cao thủ': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203448/bachkim_frame_wg452j.webp',
    'Kiện tướng': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203451/lucbao_frame_skokel.webp',
    'Đại Kiện Tướng': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203450/kimcuong_frame_lqps4s.webp',
    'Huyền Thoại': 'https://res.cloudinary.com/ds6mtnyyk/image/upload/v1782203454/caothu_frame_mom7dj.webp',
};

export const TIER_THEME: Record<string, { glow: string; mid: string; dark: string; accent: string; track: string }> = {
    'Tân thủ': { glow: '#9c9089', mid: '#5c5049', dark: '#2b2521', accent: '#c9bfb6', track: '#3a332e' },
    'Phong trào': { glow: '#e0975a', mid: '#8a4a24', dark: '#2e1c10', accent: '#f3c191', track: '#4a2d18' },
    'Cứng cựa': { glow: '#b9c4d0', mid: '#5f6b78', dark: '#22262b', accent: '#e6ecf2', track: '#3a4148' },
    'Chủ lực': { glow: '#f5c542', mid: '#a3780f', dark: '#2e2408', accent: '#ffe8a3', track: '#4d3b12' },
    'Cao thủ': { glow: '#5fd3d9', mid: '#2c7d84', dark: '#0f2426', accent: '#b6f0f2', track: '#1c3a3d' },
    'Kiện tướng': { glow: '#52c98a', mid: '#1f7a4d', dark: '#0c261a', accent: '#a6ecc6', track: '#173a28' },
    'Đại Kiện Tướng': { glow: '#6ea8ff', mid: '#2d5fb0', dark: '#0e1c33', accent: '#bcd6ff', track: '#1d2f4d' },
    'Huyền Thoại': { glow: '#c084f5', mid: '#7a1fc9', dark: '#241030', accent: '#e6c9ff', track: '#3a1d52' },
};

export function getTierTheme(tier: string) {
    return TIER_THEME[tier] ?? TIER_THEME['Tân thủ'];
}

export function getTierCardBackground(tier: string) {
    const t = getTierTheme(tier);
    return `radial-gradient(circle at 50% 20%, ${t.glow}55 0%, ${t.mid} 45%, ${t.dark} 100%)`;
}

interface RankIconProps {
    tier: string;
    size?: number;
    scale?: number;
    offsetY?: number;
    className?: string;
}

interface RankAvatarProps {
    tier: string;
    avatar?: string | null;
    name: string;
    size?: number;
    frameScale?: number;
    avatarTop?: string;
    frameTop?: string;
}

interface RankPodiumAvatarListProps {
    tier: string;
    avatar?: string | null;
    name: string;
    size?: number;
    frameScale?: number;
}

export function RankIcon({ tier, size = 48, scale = 1, offsetY = 0, className }: RankIconProps) {
    const src = TIER_ICONS[tier] ?? TIER_ICONS['Tân thủ'];
    return (
        <div
            style={{
                width: size,
                height: size,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
            }}
        >
            <img
                src={src}
                alt={tier}
                className={className}
                style={{
                    width: size,
                    height: size,
                    objectFit: 'contain',
                    transform: `translateY(-${offsetY}%) scale(${scale})`,
                    transformOrigin: 'center',
                }}
            />
        </div>
    );
}

export function RankPodiumAvatar({
    tier, avatar, name,
    size = 110, frameScale = 2.2,
    avatarTop = '50%', frameTop = '10%',
}: RankAvatarProps) {
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Tân thủ'];
    return (
        <div className="ml-4" style={{ position: 'relative', width: size, height: size, overflow: 'visible', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Avatar */}
            <div style={{
                position: 'absolute',
                width: size + 1.1, height: size * 1.1,
                left: '50%', top: avatarTop,
                transform: 'translate(-50%, -50%)',
                zIndex: 1, borderRadius: '50%', overflow: 'hidden',
            }}>
                {avatar ? (
                    <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%', background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: size * 0.3, color: '#6b7280',
                    }}>
                        {name?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>
            {/* Frame */}
            <div style={{
                position: 'absolute',
                width: size * frameScale, height: size * frameScale,
                left: '50%', top: frameTop,
                transform: 'translate(-50%, -50%)',
                zIndex: 2, pointerEvents: 'none',
            }}>
                <img src={frame} alt={tier} style={{ display: 'block', maxWidth: 'none', width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
        </div>
    );
}

export function RankPodiumAvatarList({
    tier, avatar, name, size = 48, frameScale = 3.2,
}: RankPodiumAvatarListProps) {
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Tân thủ'];

    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    position: 'absolute',
                    width: size * 1.5,
                    height: size * 1.5,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    borderRadius: '50%',
                    overflow: 'hidden',
                }}
            >
                {avatar ? (
                    <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: size * 0.4,
                        color: '#6b7280',
                    }}>
                        {name?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Frame */}
            <div style={{
                position: 'absolute',
                width: size * frameScale,
                height: size * frameScale,
                left: '50%',
                top: '1%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
            }}>
                <img
                    src={frame}
                    alt={tier}
                    style={{
                        display: 'block',
                        maxWidth: 'none',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        </div>
    );
}


export function RankPodiumAvatarModal({
    tier, avatar, name, size = 50, frameScale = 3.2,
}: RankPodiumAvatarListProps) {
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Tân thủ'];

    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    position: 'absolute',
                    width: size * 1.5,
                    height: size * 1.5,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    borderRadius: '50%',
                    overflow: 'hidden',
                }}
            >
                {avatar ? (
                    <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: size * 0.4,
                        color: '#6b7280',
                    }}>
                        {name?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Frame */}
            <div style={{
                position: 'absolute',
                width: size * frameScale,
                height: size * frameScale,
                left: '50%',
                top: '0%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
            }}>
                <img
                    src={frame}
                    alt={tier}
                    style={{
                        display: 'block',
                        maxWidth: 'none',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        </div>
    );
}

export function RankAvatarMatchResult({
    tier, avatar, name, size = 50, frameScale = 3.2,
}: RankPodiumAvatarListProps) {
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Tân thủ'];

    return (
        <div
            style={{
                position: 'relative',
                width: size,
                height: size,
                flexShrink: 0,
                overflow: 'visible',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Avatar */}
            <div
                style={{
                    position: 'absolute',
                    width: size * 1.4,
                    height: size * 1.4,
                    left: '50%',
                    top: '65%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1,
                    borderRadius: '50%',
                    overflow: 'hidden',
                }}
            >
                {avatar ? (
                    <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: size * 0.4,
                        color: '#6b7280',
                    }}>
                        {name?.[0]?.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Frame */}
            <div style={{
                position: 'absolute',
                width: size * frameScale,
                height: size * frameScale,
                left: '50%',
                top: '20%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'none',
            }}>
                <img
                    src={frame}
                    alt={tier}
                    style={{
                        display: 'block',
                        maxWidth: 'none',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        </div>
    );
}
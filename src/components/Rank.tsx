'use client';
// const TIER_ICONS: Record<string, string> = {
//     'Sắt': '/ranks/sat_old.png',
//     'Đồng': '/ranks/dong_new.png',
//     'Bạc': '/ranks/bac_old.png',
//     'Vàng': '/ranks/vang_old.png',
//     'Bạch Kim': '/ranks/bk_old.png',
//     'Lục Bảo': '/ranks/lucbao_old.png',
//     'Kim Cương': '/ranks/kimcuong_old.png',
//     'Cao Thủ': '/ranks/caothu_old.png',
// };


const TIER_ICONS: Record<string, string> = {
    'Sắt': '/ranks_final/sat-new-final.png',
    'Đồng': '/ranks_final/dong_new_final.png',
    'Bạc': '/ranks_final/bac_new_final.png',
    'Vàng': '/ranks_final/vang_new_final.png',
    'Lục Bảo': '/ranks_final/lucbao_new_final.png',
    'Bạch Kim': '/ranks_final/bk_new_final.png',
    'Kim Cương': '/ranks_final/kc_new_final.png',
    'Cao Thủ': '/ranks_final/caothu_new_final.png',
};

const TIER_FRAMES: Record<string, string> = {
    'Sắt': '/ranks/sat_frame.webp',
    'Đồng': '/ranks/dong_frame.webp',
    'Bạc': '/ranks/bac_frame.webp',
    'Vàng': '/ranks/vang_frame.webp',
    'Bạch Kim': '/ranks/bachkim_frame.webp',
    'Lục Bảo': '/ranks/lucbao_frame.webp',
    'Kim Cương': '/ranks/kimcuong_frame.webp',
    'Cao Thủ': '/ranks/caothu_frame.webp',
};

interface RankIconProps {
    tier: string;
    size?: number;
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

export function RankIcon({ tier, size = 48, className }: RankIconProps) {
    const src = TIER_ICONS[tier] ?? TIER_ICONS['Sắt'];
    return (
        <img
            src={src}
            width={size}
            height={size}
            alt={tier}
            className={className}
            style={{ objectFit: 'contain' }}
        />
    );
}

export function RankPodiumAvatar({
    tier, avatar, name,
    size = 120, frameScale = 2.2,
    avatarTop = '50%', frameTop = '16%',
}: RankAvatarProps) {
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Sắt'];
    return (
        <div className="ml-4" style={{ position: 'relative', width: size, height: size, overflow: 'visible', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Avatar */}
            <div style={{
                position: 'absolute',
                width: size, height: size,
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
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Sắt'];

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
                top: '-10%',
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
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Sắt'];

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
    const frame = TIER_FRAMES[tier] ?? TIER_FRAMES['Sắt'];

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
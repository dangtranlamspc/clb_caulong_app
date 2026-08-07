"use client";

export function NavLoadingOverlay({ fadingOut }: { fadingOut: boolean }) {
    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
            style={{
                background:
                    "linear-gradient(135deg,#183153 0%,#102744 40%,#10192f 70%,#1a1035 100%)",
                opacity: fadingOut ? 0 : 1,
                transition: "opacity 350ms ease-out",
            }}
        >
            <div className="fixed inset-0 z-[999]" style={{ height: "100dvh" }}>
                <img
                    src="https://res.cloudinary.com/ds6mtnyyk/image/upload/v1783494767/LOGO_TEAM_BNB_WHITE_hs59vg.png"
                    width={164}
                    height={164}
                    alt="BNB Badminton Club"
                    style={{
                        objectFit: "contain",
                        animation: "bnbLogoPop 1s ease-in-out infinite",
                    }}
                />
            </div>

            <style jsx>{`
                @keyframes bnbLogoPop {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.18); }
                }
                @keyframes bnbDotBounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
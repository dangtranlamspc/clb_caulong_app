"use client";

export function AuroraHeaderBackground() {
    return (
        <>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="aurora-bg"></div>

                <div className="light-beam beam1"></div>
                <div className="light-beam beam2"></div>
                <div className="light-beam beam3"></div>

                {Array.from({ length: 36 }).map((_, i) => (
                    <span
                        key={i}
                        className={`blob blob-${(i % 6) + 1}`}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * -8}s`,
                            animationDuration: `${4 + Math.random() * 4}s`,
                        }}
                    />
                ))}
            </div>

            <style jsx>{`
                @keyframes auroraMove {
                    0% {
                    background-position: 0% 50%;
                    }

                    50% {
                    background-position: 100% 50%;
                    }

                    100% {
                    background-position: 0% 50%;
                    }
                }
                .aurora-bg {
                    position: absolute;
                    inset: -30%;

                    background:
                    radial-gradient(
                        circle at 10% 20%,
                        rgba(59, 130, 246, 0.3),
                        transparent 30%
                    ),
                    radial-gradient(
                        circle at 80% 30%,
                        rgba(6, 182, 212, 0.3),
                        transparent 30%
                    ),
                    radial-gradient(
                        circle at 50% 90%,
                        rgba(139, 92, 246, 0.28),
                        transparent 35%
                    ),
                    linear-gradient(
                        120deg,
                        #183153,
                        #102744,
                        #0d2340,
                        #1b1640,
                        #183153
                    );

                    background-size: 300% 300%;

                    animation: auroraMove 8s linear infinite;
                }
                    @keyframes blobMove {
                    0% {
                    transform: translate(0, 0) scale(1) rotate(0);
                    }

                    25% {
                    transform: translate(35px, -20px) scale(1.4) rotate(90deg);
                    }

                    50% {
                    transform: translate(-30px, 35px) scale(0.8) rotate(180deg);
                    }

                    75% {
                    transform: translate(20px, 25px) scale(1.25) rotate(270deg);
                    }

                    100% {
                    transform: translate(0, 0) scale(1) rotate(360deg);
                    }
                }

                @keyframes pulse {
                    0%,
                    100% {
                    opacity: 0.35;
                    filter: blur(28px);
                    }

                    50% {
                    opacity: 0.95;
                    filter: blur(42px);
                    }
                }

                .blob {
                    position: absolute;

                    width: 120px;
                    height: 120px;

                    border-radius: 999px;

                    animation:
                    blobMove linear infinite,
                    pulse ease-in-out infinite;

                    will-change: transform;
                }

                .blob-1 {
                    background: #3b82f6;
                }

                .blob-2 {
                    background: #06b6d4;
                }

                .blob-3 {
                    background: #8b5cf6;
                }

                .blob-4 {
                    background: #60a5fa;
                }

                .blob-5 {
                    background: rgba(255, 255, 255, 0.18);
                }

                .blob-6 {
                    background: #38bdf8;
                }

                @keyframes beam {
                    0% {
                    transform: translateX(-120%) rotate(-15deg);
                    }

                    100% {
                    transform: translateX(180%) rotate(-15deg);
                    }
                }

                .light-beam {
                    position: absolute;

                    width: 220px;
                    height: 320px;

                    background: linear-gradient(
                    to right,
                    transparent,
                    rgba(255, 255, 255, 0.1),
                    transparent
                    );

                    filter: blur(18px);

                    animation: beam 5s linear infinite;
                }

                .beam1 {
                    top: -120px;
                    left: -150px;
                }

                .beam2 {
                    top: -80px;

                    animation-delay: -2s;
                }

                .beam3 {
                    bottom: -120px;

                    animation-delay: -4s;
                }
            `}</style>
        </>
    );
}
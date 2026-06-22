'use client';
import { useEffect, useRef, useState } from 'react';
// useRef dùng cho cả CakeCanvas, ConfettiCanvas và useBirthdayGreeting hook
import { X } from 'lucide-react';

interface BirthdayModalProps {
    userName: string;
    onClose: () => void;
    show: boolean;
}

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    color: string; size: number;
    rotation: number; rotationSpeed: number;
    shape: 'rect' | 'circle' | 'star';
    opacity: number; life: number;
}

const CONFETTI_COLORS = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8', '#C77DFF', '#FFB347'];
const CANDLE_COLORS: [string, string][] = [
    ['#ff6b9d', '#ff3a7a'],
    ['#ffd93d', '#ffa500'],
    ['#6bcb77', '#3aaa50'],
    ['#4d96ff', '#1a60cc'],
    ['#c77dff', '#9933cc'],
];
const FLOAT_COLORS = ['#ff6b9d', '#ffd93d', '#c77dff', '#6bcb77'];

function createConfettiParticle(canvas: HTMLCanvasElement): Particle {
    return {
        x: Math.random() * canvas.width, y: -10,
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3 + 1.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 9 + 4,
        rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 8,
        shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
        opacity: 1, life: 1,
    };
}

function drawConfettiParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.shape === 'star') {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const a2 = a + Math.PI / 5;
            i === 0
                ? ctx.moveTo(Math.cos(a) * p.size / 2, Math.sin(a) * p.size / 2)
                : ctx.lineTo(Math.cos(a) * p.size / 2, Math.sin(a) * p.size / 2);
            ctx.lineTo(Math.cos(a2) * p.size / 4, Math.sin(a2) * p.size / 4);
        }
        ctx.closePath(); ctx.fill();
    } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
}


function CakeCanvas() {
    const cakeRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const canvas = cakeRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        const W = 220, H = 190;
        canvas.width = W; canvas.height = H;

        type Sparkle = { x: number; y: number; vy: number; alpha: number; r: number };
        type FloatStar = { x: number; y: number; size: number; phase: number; speed: number; color: string };

        const sparkles: Sparkle[] = [];
        const floats: FloatStar[] = Array.from({ length: 10 }, () => ({
            x: 15 + Math.random() * (W - 30),
            y: 10 + Math.random() * (H - 30),
            size: 5 + Math.random() * 7,
            phase: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.025,
            color: FLOAT_COLORS[Math.floor(Math.random() * FLOAT_COLORS.length)],
        }));

        let tick = 0;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);

            const b = { x: 30, y: 128, w: 160, h: 52 };
            ctx.save();
            ctx.beginPath();
            (ctx as any).roundRect(b.x, b.y, b.w, b.h, 10);
            ctx.shadowColor = 'rgba(248,87,166,0.35)';
            ctx.shadowBlur = 14;
            const g1 = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
            g1.addColorStop(0, '#ff6b9d'); g1.addColorStop(0.5, '#f857a6'); g1.addColorStop(1, '#c2185b');
            ctx.fillStyle = g1; ctx.fill();
            ctx.restore();

            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            [0, 24, 48, 72, 96, 120, 144].forEach((dx, i) => {
                const h = 9 + Math.sin(tick * 0.05 + i) * 2.5;
                ctx.beginPath();
                (ctx as any).roundRect(b.x + dx + 5, b.y - 4, 13, h, 7);
                ctx.fill();
            });

            ['#ffd93d', '#6bcb77', '#fff', '#ffd93d', '#c77dff', '#fff'].forEach((c, i) => {
                ctx.beginPath();
                ctx.arc(b.x + 18 + i * 26, b.y + b.h / 2 + 6, 5.5, 0, Math.PI * 2);
                ctx.fillStyle = c; ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1; ctx.stroke();
            });

            ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.04 * Math.sin(tick * 0.07)})`;
            ctx.beginPath(); (ctx as any).roundRect(b.x, b.y, b.w, 15, 10); ctx.fill();

            const m = { x: 55, y: 84, w: 110, h: 44 };
            ctx.save();
            ctx.beginPath();
            (ctx as any).roundRect(m.x, m.y, m.w, m.h, 8);
            ctx.shadowColor = 'rgba(147,51,234,0.35)';
            ctx.shadowBlur = 12;
            const g2 = ctx.createLinearGradient(m.x, m.y, m.x + m.w, m.y + m.h);
            g2.addColorStop(0, '#8b5cf6'); g2.addColorStop(0.5, '#7c3aed'); g2.addColorStop(1, '#5b21b6');
            ctx.fillStyle = g2; ctx.fill();
            ctx.restore();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            [0, 22, 44, 66, 88].forEach((dx, i) => {
                const h = 7 + Math.sin(tick * 0.05 + i + 2) * 2;
                ctx.beginPath();
                (ctx as any).roundRect(m.x + dx + 4, m.y - 3, 11, h, 5);
                ctx.fill();
            });

            ['#ffd93d', '#ff6b9d', '#6bcb77'].forEach((c, i) => {
                ctx.beginPath();
                ctx.arc(m.x + 18 + i * 37, m.y + m.h / 2 + 3, 5, 0, Math.PI * 2);
                ctx.fillStyle = c; ctx.fill();
            });

            ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.04 * Math.sin(tick * 0.07 + 1)})`;
            ctx.beginPath(); (ctx as any).roundRect(m.x, m.y, m.w, 13, 8); ctx.fill();

            const NUM_CANDLES = 5;
            const spacing = m.w / (NUM_CANDLES + 1);

            for (let i = 0; i < NUM_CANDLES; i++) {
                const cx = m.x + spacing * (i + 1);
                const cy = m.y - 24;
                const [c1, c2] = CANDLE_COLORS[i];
                const flicker = Math.sin(tick * 0.16 + i * 1.4 + Math.sin(tick * 0.3 + i));

                const cg = ctx.createLinearGradient(cx - 5, cy, cx + 5, cy);
                cg.addColorStop(0, c1); cg.addColorStop(1, c2);
                ctx.beginPath(); (ctx as any).roundRect(cx - 5, cy, 10, 24, 3);
                ctx.fillStyle = cg; ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.38)';
                ctx.beginPath(); (ctx as any).roundRect(cx - 3, cy + 3, 3, 16, 2); ctx.fill();

                ctx.strokeStyle = '#4a2c00'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 6); ctx.stroke();

                const gR = 11 + flicker * 2.5;
                const halo = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, gR);
                halo.addColorStop(0, 'rgba(255,200,50,0.55)');
                halo.addColorStop(0.5, 'rgba(255,120,0,0.22)');
                halo.addColorStop(1, 'rgba(255,80,0,0)');
                ctx.beginPath(); ctx.arc(cx, cy - 10, gR, 0, Math.PI * 2);
                ctx.fillStyle = halo; ctx.fill();

                const fh = 13 + flicker * 3;
                const fw = 5 + Math.abs(flicker * 0.8);
                ctx.beginPath();
                ctx.moveTo(cx, cy - 6);
                ctx.bezierCurveTo(cx - fw, cy - 6 - fh * 0.4, cx - fw * 0.5, cy - 6 - fh * 0.85, cx, cy - 6 - fh);
                ctx.bezierCurveTo(cx + fw * 0.5, cy - 6 - fh * 0.85, cx + fw, cy - 6 - fh * 0.4, cx, cy - 6);
                const fg = ctx.createLinearGradient(cx, cy - 6, cx, cy - 6 - fh);
                fg.addColorStop(0, '#ff6200');
                fg.addColorStop(0.35, '#ffcc00');
                fg.addColorStop(1, 'rgba(255,255,200,0.9)');
                ctx.fillStyle = fg; ctx.fill();

                ctx.beginPath();
                ctx.ellipse(cx, cy - 6 - fh * 0.25, fw * 0.35, fh * 0.22, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();

                if (Math.random() < 0.25) {
                    sparkles.push({ x: cx + (Math.random() - 0.5) * 4, y: cy - 6 - fh, vy: -0.8 - Math.random() * 0.5, alpha: 0.6, r: 1.2 });
                }
            }

            for (let i = sparkles.length - 1; i >= 0; i--) {
                const s = sparkles[i];
                s.y += s.vy; s.alpha -= 0.025; s.x += (Math.random() - 0.5) * 0.6;
                if (s.alpha <= 0) { sparkles.splice(i, 1); continue; }
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,220,120,${s.alpha})`; ctx.fill();
            }

            for (const f of floats) {
                f.phase += f.speed;
                const alpha = 0.35 + 0.35 * Math.sin(f.phase);
                const pulse = f.size * (0.85 + 0.15 * Math.sin(f.phase * 1.4));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(f.x, f.y);
                ctx.rotate(f.phase * 0.4);
                ctx.beginPath();
                for (let k = 0; k < 5; k++) {
                    const a = k * Math.PI * 2 / 5 - Math.PI / 2;
                    const a2 = a + Math.PI / 5;
                    k === 0
                        ? ctx.moveTo(Math.cos(a) * pulse, Math.sin(a) * pulse)
                        : ctx.lineTo(Math.cos(a) * pulse, Math.sin(a) * pulse);
                    ctx.lineTo(Math.cos(a2) * pulse * 0.42, Math.sin(a2) * pulse * 0.42);
                }
                ctx.closePath();
                ctx.fillStyle = f.color; ctx.fill();
                ctx.restore();
            }

            tick++;
            frameRef.current = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    return (
        <canvas
            ref={cakeRef}
            style={{ width: 220, height: 190 }}
        />
    );
}

function ConfettiCanvas() {
    const ref = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (frame < 160 && frame % 2 === 0) {
                for (let i = 0; i < 3; i++) particlesRef.current.push(createConfettiParticle(canvas));
            }
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            for (const p of particlesRef.current) {
                p.x += p.vx; p.y += p.vy; p.vy += 0.07;
                p.rotation += p.rotationSpeed;
                if (p.y > canvas.height * 0.8) { p.life -= 0.035; p.opacity = p.life; }
                drawConfettiParticle(ctx, p);
            }
            frame++;
            frameRef.current = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    return (
        <canvas
            ref={ref}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        />
    );
}

export function BirthdayModal({ userName, show, onClose }: BirthdayModalProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasEverShown, setHasEverShown] = useState(false);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const closingRef = useRef(false);

    useEffect(() => {
        if (show) {
            setHasEverShown(true);
            setTimeout(() => setIsVisible(true), 50);
        }
    }, [show]);

    useEffect(() => { setIsVisible(true); }, []);

    useEffect(() => {
        if (!hasEverShown) return;
        const audio = new Audio('/sounds/happy-birthday.mp3');
        audio.volume = 0.75;
        audioRef.current = audio;
        audio.addEventListener('ended', () => setMusicPlaying(false));
        return () => { audio.pause(); audio.src = ''; };
    }, [hasEverShown]);


    useEffect(() => {
        if (!hasEverShown) return;
        let played = false;
        const tryPlay = () => {
            if (played || !audioRef.current) return;
            audioRef.current.play().then(() => { played = true; setMusicPlaying(true); }).catch(() => { });
        };
        const onGesture = () => { tryPlay(); cleanup(); };
        const cleanup = () => {
            document.removeEventListener('touchstart', onGesture);
            document.removeEventListener('click', onGesture);
        };
        const t = setTimeout(tryPlay, 700);
        document.addEventListener('touchstart', onGesture, { once: true });
        document.addEventListener('click', onGesture, { once: true });
        return () => { clearTimeout(t); cleanup(); };
    }, [hasEverShown]);

    if (!hasEverShown) return null;

    const handleClose = () => {
        if (closingRef.current) return;
        closingRef.current = true;

        if (audioRef.current && !audioRef.current.paused) {
            const audio = audioRef.current;
            const fade = setInterval(() => {
                if (audio.volume > 0.06) audio.volume = Math.max(0, audio.volume - 0.06);
                else { audio.pause(); clearInterval(fade); }
            }, 50);
        }
        setIsVisible(false);
        setTimeout(onClose, 400);
    };

    const firstName = userName.split(' ').pop() ?? userName;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                transition: 'opacity 0.4s', opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
            <div
                style={{
                    position: 'relative', width: '100%', maxWidth: 320, overflow: 'hidden',
                    borderRadius: 28, transition: 'transform 0.5s cubic-bezier(.34,1.56,.64,1), opacity 0.4s',
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(24px)',
                    background: 'linear-gradient(160deg, #1a1035 0%, #12082b 60%, #0a0520 100%)',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
                }}
            >
                <ConfettiCanvas />

                {/* Close */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 20,
                        width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <X size={16} color="rgba(255,255,255,0.6)" />
                </button>

                <div style={{ position: 'relative', zIndex: 10, padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

                    {/* Cake canvas */}
                    <div style={{ animation: 'cakeDrop .7s cubic-bezier(.34,1.56,.64,1) both', marginBottom: 4 }}>
                        <CakeCanvas />
                    </div>

                    <p style={{ color: '#FFD93D', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0, animation: 'fadeUp .5s ease-out .4s forwards', marginBottom: 4 }}>
                        🎉 chúc mừng sinh nhật 🎉
                    </p>
                    <h2 style={{ color: 'white', fontSize: 30, fontWeight: 900, opacity: 0, animation: 'fadeUp .5s ease-out .55s forwards', margin: '0 0 4px', textShadow: '0 2px 24px rgba(255,180,100,.3)' }}>
                        {firstName}!
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, opacity: 0, animation: 'fadeUp .5s ease-out .65s forwards', marginBottom: 16 }}>
                        Bạn có sinh nhật trong tháng này 🎈
                    </p>

                    <div style={{ width: '100%', borderRadius: 16, padding: '12px 16px', marginBottom: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: 'rgba(255,255,255,.8)', fontSize: 14, lineHeight: 1.6, textAlign: 'left', opacity: 0, animation: 'fadeUp .5s ease-out .75s forwards' }}>
                        <span style={{ fontSize: 16, marginRight: 6 }}>🏸</span>
                        Chúc bạn sinh nhật thật vui, sức khỏe dồi dào — và tiếp tục đánh cầu thật đẹp nhé!
                    </div>

                    {/* Music indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, height: 20, opacity: 0, animation: 'fadeUp .5s ease-out .8s forwards' }}>
                        {musicPlaying ? (
                            <>
                                <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 16 }}>
                                    {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                                        <span key={i} style={{ width: 3, background: '#6BCB77', borderRadius: 2, animation: `bar .65s ease-in-out ${delay}s infinite alternate`, height: 6 }} />
                                    ))}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#6BCB77' }}>Đang phát nhạc...</span>
                            </>
                        ) : (
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>🎵 Nhạc sẽ phát tự động</span>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                        }}
                        style={{
                            width: '100%', padding: '13px 0', borderRadius: 18, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 14,
                            background: 'linear-gradient(135deg,#f857a6,#FF6FCB)', color: 'white',
                            boxShadow: '0 4px 20px rgba(248,87,166,.4)',
                            opacity: 0, animation: 'fadeUp .5s ease-out .85s forwards',
                        }}
                    >
                        Cảm ơn! 🎉
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes cakeDrop {
                    0%{transform:scale(0) rotate(-10deg);opacity:0}
                    60%{transform:scale(1.08) rotate(3deg);opacity:1}
                    100%{transform:scale(1) rotate(0deg)}
                }
                @keyframes fadeUp {
                    from{opacity:0;transform:translateY(10px)}
                    to{opacity:1;transform:translateY(0)}
                }
                @keyframes bar {
                    from{height:4px}
                    to{height:14px}
                }
            `}</style>
        </div>
    );
}

export function useBirthdayGreeting(user: { id?: string; full_name?: string; date_of_birth?: string } | null) {
    const [show, setShow] = useState(false);
    const doneRef = useRef(false);

    useEffect(() => {
        if (doneRef.current) return;
        if (!user?.id || !user?.date_of_birth || !user?.full_name) return;

        const [, dobMonthStr, dobDayStr] = user.date_of_birth.split('-');
        const dobMonth = parseInt(dobMonthStr, 10);
        const dobDay = parseInt(dobDayStr, 10);
        const today = new Date();

        if (dobMonth !== today.getMonth() + 1) return;
        if (dobDay !== today.getDate()) return;

        const key = `bd_${user.id}_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;
        if (localStorage.getItem(key)) return;

        let cancelled = false;
        const t = setTimeout(() => {
            if (cancelled || doneRef.current) return;
            doneRef.current = true;
            localStorage.setItem(key, '1');
            setShow(true);
        }, 1500);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };

    }, [user?.id, user?.date_of_birth]);

    return { show, close: () => setShow(false) };
}
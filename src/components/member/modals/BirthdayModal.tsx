'use client';
import { useEffect, useRef, useState } from 'react';
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

/* ---------------- Gift box ---------------- */

type GiftPhase = 'box' | 'exploding' | 'revealed';

// Tia sáng bắn ra khi bật nắp (bản CSS dự phòng)
const SPARKS = Array.from({ length: 14 }, (_, i) => {
    const rad = ((360 / 14) * i * Math.PI) / 180;
    return {
        id: i,
        dx: Math.cos(rad) * (80 + (i % 3) * 18),
        dy: Math.sin(rad) * (70 + (i % 3) * 14) - 50,
        rot: (i % 2 ? 1 : -1) * (80 + i * 12),
        delay: (i % 4) * 0.05,
        emoji: ['✨', '⭐', '💫'][i % 3],
    };
});

const GLITTERS = [
    { l: 8, t: 18, d: 0, s: 12 },
    { l: 88, t: 6, d: 0.6, s: 9 },
    { l: 4, t: 62, d: 1.1, s: 8 },
    { l: 92, t: 58, d: 1.7, s: 11 },
];

/* ---- Bản CSS (dự phòng khi không có WebGL) ---- */
function GiftBoxCSS({ phase, onOpen }: { phase: GiftPhase; onOpen: () => void }) {
    const closed = phase === 'box';
    const opening = phase === 'exploding';

    return (
        <button
            type="button"
            onClick={onOpen}
            disabled={!closed}
            aria-label="Chạm để mở hộp quà"
            style={{
                position: 'relative',
                width: 224,
                height: 210,
                padding: 0,
                border: 'none',
                background: 'none',
                outline: 'none',
                cursor: closed ? 'pointer' : 'default',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                transformOrigin: '50% 90%',
                animation: closed ? 'giftWiggle 2.4s ease-in-out infinite' : undefined,
            }}
        >
            <div
                style={{
                    position: 'absolute', left: 7, top: 'calc(56% - 105px)', width: 210, height: 210,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,180,80,0.42) 0%, rgba(255,120,180,0.15) 45%, transparent 70%)',
                    filter: 'blur(3px)', pointerEvents: 'none',
                    animation: closed ? 'glowBreath 2.4s ease-in-out infinite' : undefined,
                    opacity: closed ? undefined : 0.9,
                }}
            />

            {GLITTERS.map((g, i) => (
                <span
                    key={i}
                    style={{
                        position: 'absolute', left: `${g.l}%`, top: `${g.t}%`, fontSize: g.s,
                        pointerEvents: 'none', opacity: 0.55, color: '#FFD93D',
                        animation: `glitterFloat 2.8s ease-in-out ${g.d}s infinite`,
                    }}
                >
                    ✦
                </span>
            ))}

            <div
                style={{
                    position: 'absolute', left: 34, bottom: 18,
                    width: 156, height: 112, borderRadius: '12px 12px 16px 16px',
                    background: 'linear-gradient(145deg,#ff86bd 0%,#f857a6 42%,#c2185b 100%)',
                    boxShadow: '0 20px 38px rgba(200,20,100,0.32), inset 0 -8px 0 rgba(0,0,0,0.14), inset 0 2px 0 rgba(255,255,255,0.25)',
                    overflow: 'hidden',
                    transformOrigin: '50% 100%',
                    animation: opening ? 'bodySquish .45s ease-out' : undefined,
                }}
            >
                <div
                    style={{
                        position: 'absolute', top: 0, left: '-60%', width: '60%', height: '100%',
                        background: 'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 100%)',
                        animation: 'shimmerSweep 3.6s ease-in-out infinite',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute', left: 0, right: 0, top: '50%', height: 28,
                        transform: 'translateY(-50%)',
                        background: 'linear-gradient(180deg,#ffe27a,#ffb347)',
                        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.08)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0, width: 30,
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(90deg,#ffb347,#ffd93d,#ffb347)',
                        boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.35), inset -2px 0 0 rgba(0,0,0,0.08)',
                    }}
                />
            </div>

            <div
                style={{
                    position: 'absolute', left: 27, bottom: 110, width: 170, height: 170,
                    borderRadius: '50%', pointerEvents: 'none', zIndex: 2,
                    background: 'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(253,224,71,.65) 35%, transparent 70%)',
                    opacity: 0,
                    animation: opening ? 'glowOut 1.1s ease-out .1s forwards' : undefined,
                }}
            />

            {opening &&
                SPARKS.map((s) => (
                    <span
                        key={s.id}
                        style={{
                            position: 'absolute', left: '50%', top: '42%', fontSize: 18,
                            pointerEvents: 'none', zIndex: 6, opacity: 0,
                            animation: `sparkBurst .9s ease-out ${0.12 + s.delay}s forwards`,
                            ['--dx' as any]: `${s.dx}px`,
                            ['--dy' as any]: `${s.dy}px`,
                            ['--rot' as any]: `${s.rot}deg`,
                        }}
                    >
                        {s.emoji}
                    </span>
                ))}

            <div
                style={{
                    position: 'absolute', left: 24, bottom: 128,
                    width: 176, height: 36, borderRadius: 11,
                    background: 'linear-gradient(150deg,#ffa4d2 0%,#ff6fcb 45%,#e84fa8 100%)',
                    boxShadow: '0 10px 20px rgba(200,20,100,0.32), inset 0 2px 0 rgba(255,255,255,0.35)',
                    zIndex: 3,
                    transformOrigin: '20% 100%',
                    willChange: 'transform',
                    animation: opening ? 'lidPop .8s cubic-bezier(.3,1.4,.5,1) forwards' : undefined,
                }}
            >
                <div
                    style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0, width: 32,
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(90deg,#ffb347,#ffd93d,#ffb347)', borderRadius: 5,
                        boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.35), inset -2px 0 0 rgba(0,0,0,0.08)',
                    }}
                />
                <div style={{ position: 'absolute', left: '50%', top: -30, transform: 'translateX(-50%)', width: 76, height: 34 }}>
                    <div style={{
                        position: 'absolute', left: 0, top: 6, width: 34, height: 24, borderRadius: '60% 40% 50% 50% / 70% 70% 30% 30%',
                        background: 'linear-gradient(135deg,#ffd93d,#ffb347)', transform: 'rotate(-18deg)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
                    }} />
                    <div style={{
                        position: 'absolute', right: 0, top: 6, width: 34, height: 24, borderRadius: '40% 60% 50% 50% / 70% 70% 30% 30%',
                        background: 'linear-gradient(225deg,#ffd93d,#ffb347)', transform: 'rotate(18deg)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
                    }} />
                    <div style={{
                        position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 30%, #fff3c4, #ffb347)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                    }} />
                </div>
            </div>
        </button>
    );
}

/* ---------------- Gift box 3D (three.js, tải lười) ---------------- */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

function drawStar2D(g: CanvasRenderingContext2D, x: number, y: number, R: number, r: number) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 ? r : R;
        const px = x + Math.cos(a) * rad;
        const py = y + Math.sin(a) * rad;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
}

function makeSoftTexture(THREE: typeof import('three'), rgb: string) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.35, `rgba(${rgb},0.55)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

// Giấy gói: nền hồng đậm, sọc chéo mờ, sao vàng/kem và chấm (lặp liền mạch)
function makePaperTexture(THREE: typeof import('three')) {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const bg = g.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, '#ff4fa3');
    bg.addColorStop(0.5, '#e6247f');
    bg.addColorStop(1, '#b3125f');
    g.fillStyle = bg;
    g.fillRect(0, 0, S, S);

    g.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = -S; i < S; i += 64) {
        g.beginPath();
        g.moveTo(i, 0); g.lineTo(i + 22, 0); g.lineTo(i + 22 + S, S); g.lineTo(i + S, S);
        g.closePath();
        g.fill();
    }

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const cx = col * 128 + (row % 2 ? 0 : 64);
            const cy = row * 128 + 64;
            for (const dx of [-S, 0, S]) {
                g.fillStyle = (row + col) % 2 ? '#fff1c9' : '#ffd36a';
                drawStar2D(g, cx + dx, cy, 24, 10);
                g.fillStyle = 'rgba(255,255,255,0.8)';
                g.beginPath(); g.arc(cx + 64 + dx, cy, 5, 0, Math.PI * 2); g.fill();
                g.beginPath(); g.arc(cx + 32 + dx, cy + 64, 3.2, 0, Math.PI * 2); g.fill();
            }
        }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeTagTexture(THREE: typeof import('three'), name: string) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 200;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff4dc';
    g.fillRect(0, 0, 320, 200);
    g.strokeStyle = '#e0a93b'; g.lineWidth = 8; g.strokeRect(10, 10, 300, 180);
    g.lineWidth = 2; g.strokeRect(22, 22, 276, 156);
    g.textAlign = 'center';

    const fit = (text: string, weightStyle: string, family: string, start: number, maxW: number) => {
        let fs = start;
        g.font = `${weightStyle} ${fs}px ${family}`;
        while (g.measureText(text).width > maxW && fs > 16) {
            fs -= 2;
            g.font = `${weightStyle} ${fs}px ${family}`;
        }
    };

    g.fillStyle = '#b3125f';
    fit('Happy Birthday', 'italic 700', '"Segoe Script","Brush Script MT",cursive,serif', 40, 250);
    g.fillText('Happy Birthday', 160, 86);

    g.fillStyle = '#7a0f45';
    fit(name, '800', 'system-ui,sans-serif', 46, 240);
    g.fillText(name, 160, 144);

    g.fillStyle = '#e0a93b';
    drawStar2D(g, 48, 168, 9, 4);
    drawStar2D(g, 272, 168, 9, 4);

    g.fillStyle = '#c98a1f';
    g.beginPath(); g.arc(36, 36, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b3b00';
    g.beginPath(); g.arc(36, 36, 4, 0, Math.PI * 2); g.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// Chùm tia sáng toả ra từ tâm
function makeRaysTexture(THREE: typeof import('three')) {
    const S = 512;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, 'rgba(255,230,160,0.85)');
    grad.addColorStop(0.55, 'rgba(255,190,220,0.35)');
    grad.addColorStop(1, 'rgba(255,190,220,0)');
    g.fillStyle = grad;
    const n = 14;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.beginPath();
        g.moveTo(S / 2, S / 2);
        g.arc(S / 2, S / 2, S / 2, a - 0.1, a + 0.1);
        g.closePath();
        g.fill();
    }
    return new THREE.CanvasTexture(c);
}

// Ánh lóe 4 cánh
function makeGlintTexture(THREE: typeof import('three')) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const glow = g.createRadialGradient(64, 64, 0, 64, 64, 40);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, 128, 128);
    g.translate(64, 64);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -62);
    g.quadraticCurveTo(4, -4, 62, 0);
    g.quadraticCurveTo(4, 4, 0, 62);
    g.quadraticCurveTo(-4, 4, -62, 0);
    g.quadraticCurveTo(-4, -4, 0, -62);
    g.fill();
    return new THREE.CanvasTexture(c);
}

// Chùm sáng đứng: sáng ở chân, mờ dần lên trên và ra hai bên
function makeBeamTexture(THREE: typeof import('three')) {
    const w = 64, h = 128;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        const fy = Math.pow(y / (h - 1), 1.4);
        for (let x = 0; x < w; x++) {
            const u = Math.abs((x / (w - 1)) * 2 - 1);
            const a = fy * Math.pow(1 - u, 2.2);
            const i = (y * w + x) * 4;
            img.data[i] = 255;
            img.data[i + 1] = 226;
            img.data[i + 2] = 150;
            img.data[i + 3] = Math.round(a * 255);
        }
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
}

// Dải ruy băng phẳng chạy dọc theo một đường cong (width/side tuỳ biến theo từng điểm)
function makeRibbon(
    THREE: typeof import('three'),
    pts: any[],
    widthFn: (u: number) => number,
    sideFn: (i: number, tangent: any, u: number) => any,
) {
    const n = pts.length;
    const pos = new Float32Array(n * 6);
    const uv = new Float32Array(n * 4);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(n - 1, i + 1)];
        const tan = new THREE.Vector3().subVectors(b, a).normalize();
        const side = sideFn(i, tan, u);
        const hw = widthFn(u) / 2;
        const p = pts[i];
        pos.set(
            [p.x + side.x * hw, p.y + side.y * hw, p.z + side.z * hw, p.x - side.x * hw, p.y - side.y * hw, p.z - side.z * hw],
            i * 6,
        );
        uv.set([0, u, 1, u], i * 4);
        if (i < n - 1) {
            const k = i * 2;
            idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
}

function GiftBox3D({
    phase,
    name,
    onOpen,
    onFail,
}: {
    phase: GiftPhase;
    name: string;
    onOpen: () => void;
    onFail: () => void;
}) {
    const mountRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef<GiftPhase>(phase);
    const pressedRef = useRef(false);
    phaseRef.current = phase;

    useEffect(() => {
        let disposed = false;
        let raf = 0;
        let cleanup: () => void = () => { };

        (async () => {
            try {
                const THREE = await import('three');
                const { RoundedBoxGeometry } = await import(
                    'three/examples/jsm/geometries/RoundedBoxGeometry.js'
                );
                const { RoomEnvironment } = await import(
                    'three/examples/jsm/environments/RoomEnvironment.js'
                );
                if (disposed || !mountRef.current) return;

                const mount = mountRef.current;
                const W = 296, H = 300;

                const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setSize(W, H);
                renderer.setClearColor(0x000000, 0);
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.2;
                renderer.domElement.style.display = 'block';
                mount.appendChild(renderer.domElement);

                const scene = new THREE.Scene();
                const camBase = new THREE.Vector3(0, 2.7, 8.9);
                const lookTarget = new THREE.Vector3(0, 0.6, 0);
                const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
                camera.position.copy(camBase);
                camera.lookAt(lookTarget);

                const pmrem = new THREE.PMREMGenerator(renderer);
                const envScene = new (RoomEnvironment as any)(renderer);
                const envTex = pmrem.fromScene(envScene, 0.04).texture;
                scene.environment = envTex;
                if (envScene.dispose) envScene.dispose();
                pmrem.dispose();

                scene.add(new THREE.HemisphereLight(0xffffff, 0x8844aa, 0.4));
                const key = new THREE.DirectionalLight(0xffffff, 2.0);
                key.position.set(3, 6, 5);
                scene.add(key);
                const rim = new THREE.DirectionalLight(0xff7ac0, 1.6);
                rim.position.set(-4, 2, -3);
                scene.add(rim);
                const rim2 = new THREE.DirectionalLight(0x9b8cff, 1.0);
                rim2.position.set(4, 3, -4);
                scene.add(rim2);
                const innerLight = new THREE.PointLight(0xffd36b, 0, 9);
                innerLight.position.set(0, 1.2, 0.2);
                scene.add(innerLight);

                const paperTex = makePaperTexture(THREE);
                paperTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
                const paperMat = new THREE.MeshPhysicalMaterial({
                    map: paperTex, roughness: 0.42, metalness: 0,
                    clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.9,
                });
                const goldMat = new THREE.MeshPhysicalMaterial({
                    color: 0xffcf5a, metalness: 1, roughness: 0.24,
                    clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 1.4,
                });
                const goldSideMat = goldMat.clone();
                goldSideMat.side = THREE.DoubleSide;
                const starMat = new THREE.MeshStandardMaterial({
                    color: 0xffd24a, metalness: 0.9, roughness: 0.25,
                    emissive: 0xff9a1f, emissiveIntensity: 0.35, envMapIntensity: 1.2,
                });
                const heroMat = starMat.clone();
                heroMat.emissiveIntensity = 0.8;

                const pedestal = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.7, 1.8, 0.16, 72),
                    new THREE.MeshPhysicalMaterial({
                        color: 0x2b1457, metalness: 0.6, roughness: 0.28,
                        clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1,
                    }),
                );
                pedestal.position.y = -0.83;
                scene.add(pedestal);

                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xffc2e3, transparent: true, opacity: 0.8, toneMapped: false,
                });
                const pedRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.03, 12, 96), ringMat);
                pedRing.rotation.x = Math.PI / 2;
                pedRing.position.y = -0.745;
                scene.add(pedRing);

                const glowTex = makeSoftTexture(THREE, '255,214,110');
                const pinkGlowTex = makeSoftTexture(THREE, '255,110,190');
                const pedGlow = new THREE.Sprite(
                    new THREE.SpriteMaterial({ map: pinkGlowTex, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }),
                );
                pedGlow.position.set(0, -0.95, 0);
                pedGlow.scale.set(5.6, 2.6, 1);
                scene.add(pedGlow);

                const shadow = new THREE.Mesh(
                    new THREE.PlaneGeometry(3.4, 3.4),
                    new THREE.MeshBasicMaterial({
                        map: makeSoftTexture(THREE, '0,0,0'),
                        transparent: true, opacity: 0.5, depthWrite: false,
                    }),
                );
                shadow.rotation.x = -Math.PI / 2;
                shadow.position.y = -0.74;
                scene.add(shadow);

                const rayMat = new THREE.MeshBasicMaterial({
                    map: makeRaysTexture(THREE), transparent: true, opacity: 0.3,
                    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
                });
                const rays = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), rayMat);
                rays.position.set(0, 0.7, -2.4);
                scene.add(rays);

                const halo = new THREE.Sprite(
                    new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
                );
                halo.position.set(0, 0.5, -1.8);
                halo.scale.set(5.6, 5.6, 1);
                scene.add(halo);

                const root = new THREE.Group();
                root.position.y = 0;
                scene.add(root);

                const bodyGroup = new THREE.Group();
                root.add(bodyGroup);
                bodyGroup.add(new THREE.Mesh(new RoundedBoxGeometry(2, 1.5, 2, 5, 0.09), paperMat));
                bodyGroup.add(new THREE.Mesh(new RoundedBoxGeometry(0.36, 1.52, 2.07, 3, 0.03), goldMat));
                bodyGroup.add(new THREE.Mesh(new RoundedBoxGeometry(2.07, 1.524, 0.36, 3, 0.03), goldMat));

                const tagMat = new THREE.MeshStandardMaterial({
                    map: makeTagTexture(THREE, name), roughness: 0.6, metalness: 0, side: THREE.DoubleSide,
                });
                const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.4), tagMat);
                tag.position.set(0.56, 0.08, 1.06);
                tag.rotation.z = -0.1;
                bodyGroup.add(tag);
                const stringCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0.3, 0.26, 1.06),
                    new THREE.Vector3(0.27, 0.5, 1.07),
                    new THREE.Vector3(0.14, 0.73, 1.06),
                ]);
                bodyGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stringCurve, 16, 0.012, 6, false), goldMat));

                const topGlow = new THREE.Mesh(
                    new THREE.PlaneGeometry(1.9, 1.9),
                    new THREE.MeshBasicMaterial({
                        map: glowTex, transparent: true, opacity: 0, depthWrite: false,
                        blending: THREE.AdditiveBlending, toneMapped: false,
                    }),
                );
                topGlow.rotation.x = -Math.PI / 2;
                topGlow.position.y = 0.76;
                bodyGroup.add(topGlow);

                const lid = new THREE.Group();
                root.add(lid);
                const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(2.24, 0.42, 2.24, 5, 0.08), paperMat);
                lidMesh.position.y = 0.21;
                lid.add(lidMesh);
                const lidRibA = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.44, 2.3, 3, 0.03), goldMat);
                lidRibA.position.y = 0.21;
                lid.add(lidRibA);
                const lidRibB = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.444, 0.38, 3, 0.03), goldMat);
                lidRibB.position.y = 0.21;
                lid.add(lidRibB);

                const bow = new THREE.Group();
                bow.position.y = 0.42;
                lid.add(bow);

                const LOOP_N = 64;
                const loopPts = (L: number, Hh: number) =>
                    Array.from({ length: LOOP_N + 1 }, (_, i) => {
                        const th = (i / LOOP_N) * Math.PI * 2;
                        const u = (1 - Math.cos(th)) / 2;
                        return new THREE.Vector3(L * u, Hh * Math.sin(th) * (0.55 + 0.45 * u), 0);
                    });
                const zAxis = new THREE.Vector3(0, 0, 1);
                const loopSide = (_i: number, tan: any, u: number) => {
                    const n = new THREE.Vector3(-tan.y, tan.x, 0).normalize();
                    const a = 1.25 * Math.sin(u * Math.PI);
                    return zAxis.clone().multiplyScalar(Math.cos(a)).add(n.multiplyScalar(Math.sin(a))).normalize();
                };
                const addLoop = (L: number, Hh: number, rotZ: number, mirror: boolean, yaw: number, y: number, w: number) => {
                    const geo = makeRibbon(THREE, loopPts(L, Hh), (u) => w * (0.6 + 0.4 * Math.sin(u * Math.PI)), loopSide);
                    const m = new THREE.Mesh(geo, goldSideMat);
                    m.rotation.set(0, yaw, rotZ);
                    const pivot = new THREE.Group();
                    pivot.rotation.y = mirror ? Math.PI : 0;
                    pivot.position.y = y;
                    pivot.add(m);
                    bow.add(pivot);
                };
                addLoop(1.05, 0.5, 0.28, false, 0.2, 0.1, 0.5);
                addLoop(1.05, 0.5, 0.28, true, 0.2, 0.1, 0.5);
                addLoop(0.8, 0.4, 1.05, false, -0.25, 0.14, 0.46);
                addLoop(0.8, 0.4, 1.05, true, -0.25, 0.14, 0.46);

                const knot = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 24), goldMat);
                knot.scale.set(1.15, 0.8, 1);
                knot.position.y = 0.12;
                bow.add(knot);

                const tailSide = () => new THREE.Vector3(1, 0, 0);
                const makeTail = (ctrl: [number, number, number][]) => {
                    const curve = new THREE.CatmullRomCurve3(ctrl.map((p) => new THREE.Vector3(...p)));
                    const geo = makeRibbon(THREE, curve.getPoints(48), (u) => 0.34 * (1 - 0.12 * u), tailSide);
                    return new THREE.Mesh(geo, goldSideMat);
                };
                lid.add(makeTail([
                    [0.05, 0.47, 0.05], [0.3, 0.45, 0.4], [0.55, 0.44, 0.8], [0.72, 0.43, 1.1],
                    [0.8, 0.3, 1.2], [0.82, 0.05, 1.22], [0.84, -0.12, 1.22],
                ]));
                lid.add(makeTail([
                    [-0.05, 0.47, 0.05], [-0.3, 0.45, 0.4], [-0.5, 0.44, 0.8], [-0.6, 0.42, 1.12],
                    [-0.62, 0.3, 1.22], [-0.58, 0.05, 1.22], [-0.54, -0.07, 1.22],
                ]));

                const starShape = new THREE.Shape();
                for (let i = 0; i < 10; i++) {
                    const a = (i * Math.PI) / 5 - Math.PI / 2;
                    const r = i % 2 ? 0.14 : 0.3;
                    const px = Math.cos(a) * r, py = Math.sin(a) * r;
                    i === 0 ? starShape.moveTo(px, py) : starShape.lineTo(px, py);
                }
                starShape.closePath();
                const starGeo = new THREE.ExtrudeGeometry(starShape, {
                    depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2,
                });
                starGeo.center();

                const orbitStars = Array.from({ length: 6 }, (_, i) => {
                    const m = new THREE.Mesh(starGeo, starMat);
                    const sc = 0.5 + (i % 3) * 0.18;
                    m.scale.setScalar(sc);
                    scene.add(m);
                    return {
                        m, a: (i / 6) * Math.PI * 2, r: 2.0 + (i % 3) * 0.12,
                        y: 0.1 + (i % 4) * 0.42, sp: 0.28 + (i % 3) * 0.08, ph: i * 1.7,
                    };
                });

                const heroStar = new THREE.Mesh(starGeo, heroMat);
                heroStar.scale.setScalar(0.0001);
                heroStar.position.set(0, 1, 0.3);
                scene.add(heroStar);

                const glintTex = makeGlintTexture(THREE);
                const glints = ([
                    [0.9, 1.5, 0.5, 0],
                    [-0.55, 0.45, 1.25, 2.1],
                    [0.1, 0.6, 1.1, 4.2],
                    [1.0, -0.1, 1.15, 1.1],
                ] as number[][]).map(([x, y, z, ph]) => {
                    const s = new THREE.Sprite(
                        new THREE.SpriteMaterial({ map: glintTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
                    );
                    s.position.set(x, y, z);
                    root.add(s);
                    return { s, ph };
                });

                const burst = new THREE.Sprite(
                    new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
                );
                burst.position.set(0, 0.95, 0.5);
                scene.add(burst);

                const beamGeo = new THREE.PlaneGeometry(1, 1);
                beamGeo.translate(0, 0.5, 0);
                const beam = new THREE.Mesh(
                    beamGeo,
                    new THREE.MeshBasicMaterial({
                        map: makeBeamTexture(THREE), transparent: true, opacity: 0,
                        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
                    }),
                );
                beam.position.set(0, 0.78, 0.3);
                beam.scale.set(1.9, 0.01, 1);
                scene.add(beam);

                const shock = new THREE.Mesh(
                    new THREE.RingGeometry(0.9, 1.0, 72),
                    new THREE.MeshBasicMaterial({
                        color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false,
                        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
                    }),
                );
                shock.rotation.x = -Math.PI / 2;
                shock.position.y = -0.72;
                scene.add(shock);

                const N = 70;
                const pPos = new Float32Array(N * 3);
                const pVel = new Float32Array(N * 3);
                const pCol = new Float32Array(N * 3);
                const palette = ['#FF6B9D', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FFB347'].map((c) => new THREE.Color(c));
                const pGeo = new THREE.BufferGeometry();
                pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
                pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
                const pMat = new THREE.PointsMaterial({
                    size: 0.17, map: makeSoftTexture(THREE, '255,255,255'),
                    vertexColors: true, transparent: true, depthWrite: false,
                    blending: THREE.AdditiveBlending, opacity: 1,
                });
                const points = new THREE.Points(pGeo, pMat);
                points.visible = false;
                points.frustumCulled = false;
                scene.add(points);

                const M = 48;
                const confMesh = new THREE.InstancedMesh(
                    new THREE.PlaneGeometry(0.16, 0.09),
                    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }),
                    M,
                );
                confMesh.frustumCulled = false;
                confMesh.visible = false;
                scene.add(confMesh);
                const cPos = new Float32Array(M * 3);
                const cVel = new Float32Array(M * 3);
                const cRot = new Float32Array(M * 3);
                const cAng = new Float32Array(M * 3);
                const dummy = new THREE.Object3D();
                const tmpCol = new THREE.Color();
                for (let i = 0; i < M; i++) {
                    confMesh.setColorAt(i, tmpCol.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
                    dummy.scale.setScalar(0);
                    dummy.updateMatrix();
                    confMesh.setMatrixAt(i, dummy.matrix);
                }

                const lidVel = new THREE.Vector3();
                const lidAng = new THREE.Vector3();
                let launched = false;
                let openStart: number | null = null;
                let pressK = 0;
                const LAUNCH_AT = 0.16;

                const launch = () => {
                    launched = true;
                    lidVel.set(0.7, 5.6, -0.9);
                    lidAng.set(-2.6, 1.6, 1.4);

                    for (let i = 0; i < N; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const sp = 0.8 + Math.random() * 2.2;
                        pPos[i * 3] = 0; pPos[i * 3 + 1] = 0.9; pPos[i * 3 + 2] = 0;
                        pVel[i * 3] = Math.cos(a) * sp;
                        pVel[i * 3 + 1] = 3 + Math.random() * 3.5;
                        pVel[i * 3 + 2] = Math.sin(a) * sp * 0.6;
                        const col = palette[i % palette.length];
                        pCol[i * 3] = col.r; pCol[i * 3 + 1] = col.g; pCol[i * 3 + 2] = col.b;
                    }
                    (pGeo.attributes.color as any).needsUpdate = true;
                    points.visible = true;

                    for (let i = 0; i < M; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const sp = 0.6 + Math.random() * 1.8;
                        cPos[i * 3] = 0; cPos[i * 3 + 1] = 0.9; cPos[i * 3 + 2] = 0.1;
                        cVel[i * 3] = Math.cos(a) * sp;
                        cVel[i * 3 + 1] = 3.5 + Math.random() * 3;
                        cVel[i * 3 + 2] = Math.sin(a) * sp * 0.7;
                        cRot[i * 3] = Math.random() * 6; cRot[i * 3 + 1] = Math.random() * 6; cRot[i * 3 + 2] = Math.random() * 6;
                        cAng[i * 3] = (Math.random() - 0.5) * 14;
                        cAng[i * 3 + 1] = (Math.random() - 0.5) * 14;
                        cAng[i * 3 + 2] = (Math.random() - 0.5) * 14;
                    }
                    confMesh.visible = true;
                };

                renderer.compile(scene, camera);

                const clock = new THREE.Clock();
                let last = 0;

                const tick = () => {
                    raf = requestAnimationFrame(tick);
                    const t = clock.getElapsedTime();
                    const dt = Math.min(t - last, 1 / 30);
                    last = t;

                    const opening = phaseRef.current !== 'box';
                    if (opening && openStart === null) openStart = t;

                    pressK += ((pressedRef.current && !opening ? 1 : 0) - pressK) * Math.min(1, dt * 18);

                    let sy = 1;
                    let hop = 0;
                    let air = 0;
                    let wob = 0;
                    let q = -1;

                    if (!opening) {
                        const cyc = t % 3;
                        let crouch = 0, land = 0;
                        if (cyc < 0.9) {
                            const u = cyc / 0.9;
                            crouch = u < 0.2 ? Math.sin((u / 0.2) * Math.PI / 2) : u < 0.35 ? Math.cos(((u - 0.2) / 0.15) * Math.PI / 2) : 0;
                            air = u > 0.3 && u < 0.8 ? Math.sin(((u - 0.3) / 0.5) * Math.PI) : 0;
                            land = u > 0.8 ? Math.sin(((u - 0.8) / 0.2) * Math.PI) : 0;
                            wob = Math.sin(u * Math.PI * 6) * air;
                        }
                        sy = 1 - 0.09 * crouch + 0.05 * air - 0.07 * land - 0.08 * pressK;
                        hop = 0.3 * air;
                        root.rotation.y = -0.35 + Math.sin(t * 0.7) * 0.35;
                        root.rotation.z = 0.05 * wob;
                        (halo.material as any).opacity = 0.3 + 0.12 * Math.sin(t * 2.4);
                    } else {
                        const e = t - (openStart as number);
                        if (!launched && e >= LAUNCH_AT) launch();

                        if (e < LAUNCH_AT) {
                            sy = 1 - 0.12 * Math.sin((e / LAUNCH_AT) * Math.PI / 2);
                        } else {
                            const qq = e - LAUNCH_AT;
                            sy = 1 + Math.exp(-7 * qq) * (-0.12 * Math.cos(20 * qq) + 0.03 * Math.sin(20 * qq));
                        }
                        root.rotation.y += (-0.1 - root.rotation.y) * Math.min(1, dt * 6);
                        root.rotation.z *= 0.85;

                        if (launched) {
                            q = e - LAUNCH_AT;

                            lidVel.y -= 16 * dt;
                            lid.position.addScaledVector(lidVel, dt);
                            lid.rotation.x += lidAng.x * dt;
                            lid.rotation.y += lidAng.y * dt;
                            lid.rotation.z += lidAng.z * dt;
                            const sc = 1 - easeInCubic(clamp01((q - 0.45) / 0.35));
                            lid.scale.setScalar(Math.max(sc, 0.0001));
                            lid.visible = sc > 0.002;

                            innerLight.intensity = 30 * Math.max(0, 1 - q / 1.2);
                            const bs = 1.2 + q * 6;
                            burst.scale.set(bs, bs, 1);
                            (burst.material as any).opacity = Math.min(1, q / 0.05) * Math.max(0, 1 - q / 0.7) * 0.9;
                            (halo.material as any).opacity = 0.35 + 0.4 * Math.max(0, 1 - q / 1.2);
                            (topGlow.material as any).opacity = Math.min(1, q / 0.3) * (0.5 + 0.1 * Math.sin(t * 5));

                            beam.scale.set(1.9, 2.6 * easeOutCubic(clamp01(q / 0.5)) + 0.01, 1);
                            (beam.material as any).opacity = Math.min(1, q / 0.12) * Math.max(0, 1 - q / 1.4) * 0.9;

                            const sk = 0.5 + q * 3.4;
                            shock.scale.set(sk, sk, 1);
                            (shock.material as any).opacity = Math.max(0, 1 - q / 0.8) * 0.85;

                            const hk = clamp01(q / 1.3);
                            heroStar.position.y = 1.0 + easeOutCubic(clamp01(q / 0.9)) * 1.7;
                            heroStar.scale.setScalar(Math.max(Math.pow(Math.sin(hk * Math.PI), 0.6) * 1.5, 0.0001));
                            heroStar.rotation.y = q * 5;
                            heroStar.rotation.z = Math.sin(q * 3) * 0.2;

                            const shk = Math.exp(-q * 9);
                            camera.position.set(
                                camBase.x + Math.sin(q * 70) * 0.06 * shk,
                                camBase.y + Math.cos(q * 63) * 0.05 * shk,
                                camBase.z,
                            );
                            camera.lookAt(lookTarget);

                            for (let i = 0; i < N; i++) {
                                pVel[i * 3 + 1] -= 5 * dt;
                                pPos[i * 3] += pVel[i * 3] * dt;
                                pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
                                pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
                            }
                            (pGeo.attributes.position as any).needsUpdate = true;
                            pMat.opacity = 1 - clamp01((q - 0.9) / 1.0);

                            const cs = 1 - clamp01((q - 1.2) / 0.4);
                            for (let i = 0; i < M; i++) {
                                cVel[i * 3] *= 0.992;
                                cVel[i * 3 + 1] -= 9 * dt;
                                cPos[i * 3] += cVel[i * 3] * dt;
                                cPos[i * 3 + 1] += cVel[i * 3 + 1] * dt;
                                cPos[i * 3 + 2] += cVel[i * 3 + 2] * dt;
                                cRot[i * 3] += cAng[i * 3] * dt;
                                cRot[i * 3 + 1] += cAng[i * 3 + 1] * dt;
                                cRot[i * 3 + 2] += cAng[i * 3 + 2] * dt;
                                dummy.position.set(cPos[i * 3], cPos[i * 3 + 1], cPos[i * 3 + 2]);
                                dummy.rotation.set(cRot[i * 3], cRot[i * 3 + 1], cRot[i * 3 + 2]);
                                dummy.scale.setScalar(Math.max(cs, 0.0001));
                                dummy.updateMatrix();
                                confMesh.setMatrixAt(i, dummy.matrix);
                            }
                            confMesh.instanceMatrix.needsUpdate = true;
                        }
                    }

                    const inv = 1 / Math.sqrt(Math.max(sy, 0.5));
                    bodyGroup.scale.set(inv, sy, inv);
                    bodyGroup.position.y = -0.75 + 0.75 * sy;
                    const topY = -0.75 + 1.5 * sy;
                    root.position.y = hop;

                    if (!launched) {
                        lid.position.set(0, topY + 0.05 * air, 0);
                        lid.rotation.set(-0.1 * air, 0, 0.05 * wob);
                        lid.scale.setScalar(1);
                    }

                    const sh2 = 1 - 0.25 * (hop / 0.3);
                    shadow.scale.set(sh2, sh2, 1);
                    (shadow.material as any).opacity = 0.5 - 0.15 * (hop / 0.3);

                    rays.rotation.z = t * 0.12;
                    rayMat.opacity = 0.3 + 0.06 * Math.sin(t * 1.7) + (q >= 0 ? 0.6 * Math.max(0, 1 - q / 1.6) : 0);

                    ringMat.opacity = 0.65 + 0.25 * Math.sin(t * 2.5);

                    orbitStars.forEach((st) => {
                        const a = st.a + t * st.sp;
                        st.m.position.set(
                            Math.cos(a) * st.r,
                            st.y + Math.sin(t * 1.3 + st.ph) * 0.15,
                            Math.sin(a) * st.r * 0.78 + 0.2,
                        );
                        st.m.rotation.y = t * 1.4 + st.ph;
                        st.m.rotation.z = Math.sin(t * 0.9 + st.ph) * 0.35;
                    });

                    glints.forEach((gl) => {
                        const v = Math.pow(Math.max(0, Math.sin(t * 1.8 + gl.ph)), 8);
                        const m = gl.s.material as any;
                        m.opacity = opening ? 0 : v;
                        m.rotation = t * 0.5;
                        const sc = 0.15 + 0.55 * v;
                        gl.s.scale.set(sc, sc, 1);
                    });

                    renderer.render(scene, camera);
                };
                tick();

                cleanup = () => {
                    cancelAnimationFrame(raf);
                    scene.traverse((o: any) => {
                        if (o.geometry) o.geometry.dispose();
                        if (o.material) {
                            const mats = Array.isArray(o.material) ? o.material : [o.material];
                            mats.forEach((m: any) => {
                                if (m.map) m.map.dispose();
                                m.dispose();
                            });
                        }
                    });
                    envTex.dispose();
                    renderer.dispose();
                    if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
                };
            } catch (err) {
                console.warn('GiftBox3D: không khởi tạo được WebGL, dùng bản CSS.', err);
                if (!disposed) onFail();
            }
        })();

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            cleanup();
        };
    }, []);

    const closed = phase === 'box';
    const release = () => { pressedRef.current = false; };

    return (
        <button
            type="button"
            onClick={onOpen}
            onPointerDown={() => { pressedRef.current = true; }}
            onPointerUp={release}
            onPointerLeave={release}
            onPointerCancel={release}
            disabled={!closed}
            aria-label="Chạm để mở hộp quà"
            style={{
                width: 296,
                height: 300,
                padding: 0,
                border: 'none',
                background: 'none',
                outline: 'none',
                display: 'block',
                cursor: closed ? 'pointer' : 'default',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            <div ref={mountRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />
        </button>
    );
}

function GiftBox(props: { phase: GiftPhase; name: string; onOpen: () => void }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <GiftBoxCSS phase={props.phase} onOpen={props.onOpen} />;
    return <GiftBox3D {...props} onFail={() => setFailed(true)} />;
}

export function BirthdayModal({ userName, show, onClose }: BirthdayModalProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasEverShown, setHasEverShown] = useState(false);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const closingRef = useRef(false);
    const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [phase, setPhase] = useState<GiftPhase>('box');

    useEffect(() => {
        if (show) {
            setHasEverShown(true);
            setTimeout(() => setIsVisible(true), 50);
        }
    }, [show]);

    useEffect(() => {
        if (!hasEverShown) return;
        const audio = new Audio('/sounds/happy-birthday.mp3');
        audio.volume = 0.75;
        audio.preload = 'auto';
        audio.load();
        audioRef.current = audio;
        audio.addEventListener('ended', () => setMusicPlaying(false));
        return () => { audio.pause(); audio.src = ''; };
    }, [hasEverShown]);

    useEffect(() => () => {
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        if (audioTimerRef.current) clearTimeout(audioTimerRef.current);
    }, []);

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

    const handleOpenGift = () => {
        if (phase !== 'box') return;
        setPhase('exploding');

        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);

        audioTimerRef.current = setTimeout(() => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.play().then(() => setMusicPlaying(true)).catch(() => {
                const retry = () => {
                    audio.play().then(() => setMusicPlaying(true)).catch(() => { });
                    document.removeEventListener('click', retry);
                };
                document.addEventListener('click', retry, { once: true });
            });
        }, 120);

        revealTimerRef.current = setTimeout(() => setPhase('revealed'), 1600);
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
                <div>
                    {phase === 'revealed' ? <ConfettiCanvas /> : null}

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

                    {phase !== 'revealed' ? (
                        <div
                            style={{
                                position: 'relative', zIndex: 10, padding: '28px 12px 22px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                            }}
                        >
                            <p
                                style={{
                                    color: '#FFD93D', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em',
                                    textTransform: 'uppercase', marginBottom: 2, opacity: phase === 'box' ? 1 : 0,
                                    transition: 'opacity .3s ease',
                                }}
                            >
                                🎁 có một món quà cho {firstName}
                            </p>

                            <GiftBox phase={phase} name={firstName} onOpen={handleOpenGift} />

                            <p
                                style={{
                                    marginTop: 2, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)',
                                    animation: phase === 'box' ? 'hintPulse 1.6s ease-in-out infinite' : undefined,
                                    opacity: phase === 'box' ? 1 : 0,
                                    transition: 'opacity .25s ease',
                                }}
                            >
                                👆 Chạm để mở quà
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                position: 'relative', zIndex: 10, padding: '28px 24px 24px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                            }}
                        >
                            <div style={{ animation: 'cakeDrop .7s cubic-bezier(.34,1.56,.64,1) both', marginBottom: 4 }}>
                                <CakeCanvas />
                            </div>

                            <p style={{ color: '#FFD93D', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0, animation: 'fadeUp .5s ease-out .1s forwards', marginBottom: 4 }}>
                                🎉 chúc mừng sinh nhật 🎉
                            </p>
                            <h2 style={{ color: 'white', fontSize: 30, fontWeight: 900, opacity: 0, animation: 'fadeUp .5s ease-out .2s forwards', margin: '0 0 4px', textShadow: '0 2px 24px rgba(255,180,100,.3)' }}>
                                {firstName}!
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, opacity: 0, animation: 'fadeUp .5s ease-out .3s forwards', marginBottom: 16 }}>
                                Bạn có sinh nhật trong tháng này 🎈
                            </p>

                            <div style={{ width: '100%', borderRadius: 16, padding: '12px 16px', marginBottom: 14, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: 'rgba(255,255,255,.8)', fontSize: 14, lineHeight: 1.6, textAlign: 'left', opacity: 0, animation: 'fadeUp .5s ease-out .4s forwards' }}>
                                <span style={{ fontSize: 16, marginRight: 6 }}>🏸</span>
                                Chúc bạn sinh nhật thật vui, sức khỏe dồi dào — và tiếp tục đánh cầu thật đẹp nhé!
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, height: 20, opacity: 0, animation: 'fadeUp .5s ease-out .45s forwards' }}>
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
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>🎵 Nhạc sinh nhật</span>
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
                                    opacity: 0, animation: 'fadeUp .5s ease-out .5s forwards',
                                }}
                            >
                                Cảm ơn! 🎉
                            </button>
                        </div>
                    )}
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
                @keyframes glitterFloat {
                    0%,100%{transform:translateY(0) scale(1);opacity:.35}
                    50%{transform:translateY(-10px) scale(1.25);opacity:.85}
                }
                @keyframes shimmerSweep {
                    0%{left:-60%}
                    45%,100%{left:120%}
                }
                @keyframes sparkBurst {
                    0%{transform:translate(-50%,-50%) rotate(0deg) scale(.4);opacity:0}
                    15%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}
                    100%{transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot)) scale(.5);opacity:0}
                }

                /* ---- Bản CSS dự phòng ---- */
                @keyframes giftWiggle {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    8%  { transform: translateY(-8px) rotate(-5deg); }
                    16% { transform: translateY(0) rotate(5deg); }
                    24% { transform: translateY(-4px) rotate(-3deg); }
                    32% { transform: translateY(0) rotate(2deg); }
                    40%, 90% { transform: translateY(0) rotate(0deg); }
                }
                @keyframes glowBreath {
                    0%, 100% { opacity: .55; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.08); }
                }
                @keyframes bodySquish {
                    0% { transform: scale(1, 1); }
                    35% { transform: scale(1.06, .9); }
                    100% { transform: scale(1, 1); }
                }
                @keyframes lidPop {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                    45% { transform: translate(30px, -110px) rotate(-22deg); opacity: 1; }
                    100% { transform: translate(80px, -40px) rotate(-60deg); opacity: 0; }
                }
                @keyframes glowOut {
                    0% { opacity: 0; transform: scale(.2); }
                    40% { opacity: 1; transform: scale(1.1); }
                    100% { opacity: 0; transform: scale(2.4); }
                }
                @keyframes hintPulse {
                    0%, 100% { opacity: .65; transform: translateY(0); }
                    50% { opacity: 1; transform: translateY(-3px); }
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
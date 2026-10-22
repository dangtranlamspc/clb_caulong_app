"use client";
import {
    useEffect,
    useState,
    type CSSProperties,
    type ReactNode,
} from "react";
import { c } from "@/lib/theme";

/**
 * Thẻ hero ở trang chủ với nền động theo thời tiết hiện tại.
 * Đặt file này ở: components/member/home/WeatherHero.tsx
 *
 * Xem thử từng kiểu thời tiết mà không cần chờ trời thay đổi:
 *   /home?wx=rain            (clear | partly | cloudy | fog | rain | storm | snow)
 *   /home?wx=clear&night=1   (thêm night=1 để xem ban đêm)
 *
 * Gỡ lỗi: thêm ?wxdebug=1 để in dữ liệu thô của Open-Meteo ra console.
 */

export type WeatherScene =
    | "clear"
    | "partly"
    | "cloudy"
    | "fog"
    | "rain"
    | "storm"
    | "snow";

const SCENES: WeatherScene[] = [
    "clear",
    "partly",
    "cloudy",
    "fog",
    "rain",
    "storm",
    "snow",
];

// Mặc định lấy vị trí hiện tại của người mở web (trình duyệt sẽ hỏi quyền vị trí).
// Nếu người dùng từ chối hoặc thiết bị không có định vị thì dùng toạ độ dự phòng này
// (TP. Hồ Chí Minh). Đổi thành toạ độ sân của CLB nếu cần.
const WEATHER_LAT = 10.78;
const WEATHER_LON = 106.7;
const REFRESH_MS = 10 * 60 * 1000;
const GEO_TIMEOUT_MS = 10 * 1000;
// Đổi key khi đổi cấu trúc dữ liệu cache để bỏ cache cũ
const CACHE_KEY = "home-weather-v3";
// Endpoint NestJS (proxy tới WeatherAPI.com). Backend có setGlobalPrefix("api/v1").
const WEATHER_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/weather`;

/* ───────────────────────── dữ liệu thời tiết ───────────────────────── */

type Weather = { scene: WeatherScene; isDay: boolean };
type Coords = { lat: number; lon: number };
type Cached = { t: number; scene: WeatherScene; isDay: boolean };

function readCache(): Cached | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as Cached;
        if (
            typeof v?.t !== "number" ||
            typeof v?.isDay !== "boolean" ||
            !SCENES.includes(v?.scene)
        ) {
            return null;
        }
        return v;
    } catch {
        return null; // bỏ qua lỗi storage / JSON hỏng
    }
}

function writeCache(v: Cached) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(v));
    } catch {
        /* bỏ qua lỗi storage */
    }
}

// Hỏi vị trí người dùng; từ chối / lỗi / quá GEO_TIMEOUT_MS thì dùng toạ độ dự phòng.
// Lưu ý: option `timeout` của trình duyệt KHÔNG tính thời gian chờ người dùng bấm
// popup xin quyền, nên phải tự đặt thêm một bộ đếm giờ để không bị treo mãi.
function getCoords(): Promise<Coords> {
    const fallback: Coords = { lat: WEATHER_LAT, lon: WEATHER_LON };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
        return Promise.resolve(fallback);
    }
    return new Promise((resolve) => {
        let done = false;
        const finish = (c: Coords) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(c);
        };
        const timer = setTimeout(() => finish(fallback), GEO_TIMEOUT_MS);
        navigator.geolocation.getCurrentPosition(
            (pos) => finish({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => finish(fallback),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 },
        );
    });
}

/**
 * Trả về null khi chưa có dữ liệu thật (đang tải / lỗi mạng).
 * Khi đó thẻ hero dùng gradient mặc định thay vì giả vờ "trời nắng".
 * Backend đã quy đổi dữ liệu Apple WeatherKit sang { scene, isDay }.
 */
function useWeather(): Weather | null {
    const [weather, setWeather] = useState<Weather | null>(null);

    useEffect(() => {
        let alive = true;

        const q = new URLSearchParams(window.location.search);
        const debug = q.get("wxdebug") === "1";

        // Chế độ xem thử qua query ?wx=...
        const forced = q.get("wx") as WeatherScene | null;
        if (forced && SCENES.includes(forced)) {
            setWeather({ scene: forced, isDay: q.get("night") !== "1" });
            return;
        }

        // Dùng kết quả đã lưu (nếu còn mới) để hiện ngay, không chờ mạng
        let lastFetch = 0;
        const cached = readCache();
        if (cached && Date.now() - cached.t < REFRESH_MS) {
            setWeather({ scene: cached.scene, isDay: cached.isDay });
            lastFetch = cached.t;
        }

        let coordsPromise: Promise<Coords> | null = null;

        const run = async () => {
            try {
                coordsPromise ??= getCoords();
                const { lat, lon } = await coordsPromise;
                if (!alive) return;

                // Làm tròn 2 chữ số thập phân (~1 km) vì chỉ cần thời tiết khu vực
                const res = await fetch(
                    `${WEATHER_ENDPOINT}?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,
                    { cache: "no-store" },
                );
                if (!res.ok) {
                    console.warn("[WeatherHero] backend lỗi:", res.status);
                    return;
                }
                const json = await res.json();
                if (debug) console.log("[WeatherHero] data:", json);

                if (!alive || !SCENES.includes(json?.scene)) return;
                const isDay = json.isDay !== false;

                lastFetch = Date.now();
                setWeather({ scene: json.scene, isDay });
                writeCache({ t: lastFetch, scene: json.scene, isDay });
            } catch (err) {
                // mất mạng: giữ nền hiện tại
                if (debug) console.warn("[WeatherHero] fetch thất bại:", err);
            }
        };

        if (!lastFetch) run();
        const id = setInterval(run, REFRESH_MS);

        // Trên điện thoại / PWA, setInterval bị tạm dừng khi ẩn tab.
        // Quay lại tab mà dữ liệu đã cũ thì tải lại ngay.
        const onVisible = () => {
            if (document.visibilityState === "visible" && Date.now() - lastFetch >= REFRESH_MS) {
                run();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            alive = false;
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    return weather;
}

/* ───────────────────────── hạt chuyển động (cố định, tránh lệch hydration) ───────────────────────── */

function rng(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const RAIN = Array.from({ length: 46 }, (_, i) => {
    const r = rng(100 + i);
    return {
        left: r() * 112 - 6,
        delay: -r() * 1.2,
        dur: 0.55 + r() * 0.5,
        h: 14 + r() * 16,
        o: 0.35 + r() * 0.45,
    };
});

const SNOW = Array.from({ length: 30 }, (_, i) => {
    const r = rng(200 + i);
    return {
        left: r() * 100,
        size: 3 + r() * 3.5,
        delay: -r() * 9,
        dur: 5 + r() * 4,
        o: 0.55 + r() * 0.4,
    };
});

const STARS = Array.from({ length: 26 }, (_, i) => {
    const r = rng(400 + i);
    return {
        left: r() * 100,
        top: r() * 62,
        size: 1 + r() * 1.6,
        delay: -r() * 4,
        dur: 2.4 + r() * 3,
    };
});

const CLOUD_POOL = Array.from({ length: 6 }, (_, i) => {
    const r = rng(300 + i);
    return {
        top: 4 + r() * 60,
        w: 120 + r() * 110,
        h: 46 + r() * 34,
        blur: 10 + r() * 10,
        dur: 55 + r() * 50,
        delay: -r() * 90,
    };
});

/* ───────────────────────── bảng màu / cấu hình theo kiểu thời tiết ───────────────────────── */

// [ngày, đêm]. Màu đủ tối để chữ trắng của thẻ vẫn dễ đọc.
const GRADIENTS: Record<WeatherScene, [string, string]> = {
    clear: [
        "linear-gradient(160deg,#0284c7 0%,#1e40af 100%)",
        "linear-gradient(160deg,#1e1b4b 0%,#020617 100%)",
    ],
    partly: [
        "linear-gradient(160deg,#0369a1 0%,#1e3a8a 100%)",
        "linear-gradient(160deg,#1e293b 0%,#020617 100%)",
    ],
    cloudy: [
        "linear-gradient(160deg,#64748b 0%,#334155 100%)",
        "linear-gradient(160deg,#334155 0%,#0f172a 100%)",
    ],
    fog: [
        "linear-gradient(160deg,#64748b 0%,#475569 100%)",
        "linear-gradient(160deg,#334155 0%,#1e293b 100%)",
    ],
    rain: [
        "linear-gradient(160deg,#475569 0%,#1e293b 100%)",
        "linear-gradient(160deg,#1e293b 0%,#020617 100%)",
    ],
    storm: [
        "linear-gradient(160deg,#4c4a6b 0%,#111127 100%)",
        "linear-gradient(160deg,#2b2a47 0%,#07071a 100%)",
    ],
    snow: [
        "linear-gradient(160deg,#5b7a99 0%,#1e3a5f 100%)",
        "linear-gradient(160deg,#334155 0%,#0f172a 100%)",
    ],
};

const CLOUD_CFG: Record<
    WeatherScene,
    { n: number; day: string; night: string }
> = {
    clear: { n: 1, day: "rgba(255,255,255,.18)", night: "rgba(148,163,184,.10)" },
    partly: { n: 3, day: "rgba(255,255,255,.32)", night: "rgba(148,163,184,.16)" },
    cloudy: { n: 5, day: "rgba(255,255,255,.22)", night: "rgba(148,163,184,.14)" },
    rain: { n: 4, day: "rgba(15,23,42,.38)", night: "rgba(2,6,23,.42)" },
    storm: { n: 5, day: "rgba(15,15,35,.50)", night: "rgba(2,2,15,.55)" },
    fog: { n: 0, day: "transparent", night: "transparent" },
    snow: { n: 3, day: "rgba(255,255,255,.22)", night: "rgba(148,163,184,.14)" },
};

const WX_CSS = `
@keyframes wx-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes wx-drift { from { transform: translate3d(-60%,0,0) } to { transform: translate3d(110%,0,0) } }
@keyframes wx-fall { from { transform: translate3d(0,-40px,0) rotate(12deg) } to { transform: translate3d(-72px,340px,0) rotate(12deg) } }
@keyframes wx-snow {
  0%   { transform: translate3d(0,-10px,0) }
  50%  { transform: translate3d(14px,150px,0) }
  100% { transform: translate3d(-6px,320px,0) }
}
@keyframes wx-twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
@keyframes wx-pulse { 0%,100% { transform: scale(1); opacity: .95 } 50% { transform: scale(1.07); opacity: 1 } }
@keyframes wx-spin { to { transform: rotate(360deg) } }
@keyframes wx-fog { from { transform: translate3d(-6%,0,0) } to { transform: translate3d(6%,0,0) } }
@keyframes wx-flash {
  0%, 90%, 100% { opacity: 0 }
  92% { opacity: .5 }
  93% { opacity: 0 }
  95% { opacity: .32 }
  97% { opacity: 0 }
}
.wx-cloudwrap { position: absolute; left: 0; width: 100%; animation: wx-drift linear infinite; will-change: transform; }
.wx-cloud { display: block; border-radius: 9999px; }
.wx-drop { position: absolute; top: 0; width: 1.5px; border-radius: 1px; animation: wx-fall linear infinite; will-change: transform; background: linear-gradient(to bottom, transparent, rgba(186,230,253,.85)); }
.wx-flake { position: absolute; top: 0; border-radius: 50%; background: #fff; animation: wx-snow linear infinite; will-change: transform; }
.wx-star { position: absolute; border-radius: 50%; background: #fff; animation: wx-twinkle ease-in-out infinite; }
.wx-sun { position: absolute; top: -34px; right: -30px; width: 170px; height: 170px; border-radius: 50%;
  background: radial-gradient(circle at center, #fff7c2 0%, #fde047 28%, rgba(250,204,21,.45) 52%, rgba(250,204,21,0) 72%);
  animation: wx-pulse 6s ease-in-out infinite; }
.wx-rays { position: absolute; top: -70px; right: -66px; width: 242px; height: 242px; border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.16) 0 6deg, transparent 6deg 18deg);
  -webkit-mask-image: radial-gradient(circle, transparent 28%, #000 40%, transparent 72%);
  mask-image: radial-gradient(circle, transparent 28%, #000 40%, transparent 72%);
  animation: wx-spin 70s linear infinite; }
.wx-moon { position: absolute; top: 18px; right: 26px; width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fffbe6, #fde9a8 60%, #e9d58a);
  box-shadow: inset -10px -6px 0 -2px rgba(100,116,139,.35), 0 0 30px 8px rgba(254,249,195,.28), 0 0 70px 24px rgba(254,249,195,.10); }
.wx-fogband { position: absolute; left: -20%; width: 140%; height: 46px; border-radius: 9999px; background: rgba(255,255,255,.22); filter: blur(18px); animation: wx-fog ease-in-out infinite alternate; }
.wx-flash { position: absolute; inset: 0; background: #e0e7ff; opacity: 0; animation: wx-flash 7s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .wx *, .wx-flash { animation: none !important; }
  .wx-flash { opacity: 0 !important; }
}
`;

/* ───────────────────────── nền động ───────────────────────── */

function WeatherBackdrop({
    scene,
    isDay,
}: {
    scene: WeatherScene;
    isDay: boolean;
}) {
    const cloudCfg = CLOUD_CFG[scene];
    const cloudColor = isDay ? cloudCfg.day : cloudCfg.night;

    const showSun = isDay && (scene === "clear" || scene === "partly");
    const showMoon = !isDay && (scene === "clear" || scene === "partly");
    const starCount = isDay
        ? 0
        : scene === "clear"
            ? 26
            : scene === "partly"
                ? 12
                : 0;
    const rainCount = scene === "rain" ? 30 : scene === "storm" ? 46 : 0;
    const snowCount = scene === "snow" ? 30 : 0;

    return (
        <div
            aria-hidden="true"
            className="wx pointer-events-none absolute inset-0 overflow-hidden"
            style={{
                background: GRADIENTS[scene][isDay ? 0 : 1],
                animation: "wx-fade .9s ease-out both",
            }}
        >
            {showSun && (
                <>
                    <span className="wx-rays" />
                    <span
                        className="wx-sun"
                        style={{ opacity: scene === "partly" ? 0.7 : 1 }}
                    />
                </>
            )}
            {showMoon && <span className="wx-moon" />}

            {STARS.slice(0, starCount).map((s, i) => (
                <span
                    key={`s${i}`}
                    className="wx-star"
                    style={{
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: s.size,
                        height: s.size,
                        animationDuration: `${s.dur}s`,
                        animationDelay: `${s.delay}s`,
                    }}
                />
            ))}

            {CLOUD_POOL.slice(0, cloudCfg.n).map((cl, i) => (
                <div
                    key={`c${i}`}
                    className="wx-cloudwrap"
                    style={{
                        top: `${cl.top}%`,
                        animationDuration: `${cl.dur}s`,
                        animationDelay: `${cl.delay}s`,
                    }}
                >
                    <span
                        className="wx-cloud"
                        style={{
                            width: cl.w,
                            height: cl.h,
                            background: cloudColor,
                            filter: `blur(${cl.blur}px)`,
                        }}
                    />
                </div>
            ))}

            {scene === "fog" &&
                [14, 42, 68].map((top, i) => (
                    <span
                        key={`f${i}`}
                        className="wx-fogband"
                        style={{
                            top: `${top}%`,
                            animationDuration: `${14 + i * 5}s`,
                            animationDelay: `${-i * 4}s`,
                        }}
                    />
                ))}

            {RAIN.slice(0, rainCount).map((d, i) => (
                <span
                    key={`r${i}`}
                    className="wx-drop"
                    style={{
                        left: `${d.left}%`,
                        height: d.h,
                        opacity: d.o,
                        animationDuration: `${d.dur}s`,
                        animationDelay: `${d.delay}s`,
                    }}
                />
            ))}

            {SNOW.slice(0, snowCount).map((f, i) => (
                <span
                    key={`n${i}`}
                    className="wx-flake"
                    style={{
                        left: `${f.left}%`,
                        width: f.size,
                        height: f.size,
                        opacity: f.o,
                        animationDuration: `${f.dur}s`,
                        animationDelay: `${f.delay}s`,
                    }}
                />
            ))}

            {scene === "storm" && <span className="wx-flash" />}

            {/* Làm tối nhẹ phía dưới để các ô thông tin luôn dễ đọc */}
            <span
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(to top, rgba(0,0,0,.2), transparent 55%)",
                }}
            />
        </div>
    );
}

/* ───────────────────────── thẻ hero ───────────────────────── */

export function WeatherHero({
    children,
    style,
}: {
    children: ReactNode;
    style?: CSSProperties;
}) {
    const weather = useWeather();

    return (
        <div
            className="relative isolate overflow-hidden rounded-3xl p-5"
            style={{ background: c.heroGradient, ...style }}
        >
            <style>{WX_CSS}</style>
            {weather && (
                <WeatherBackdrop
                    key={`${weather.scene}-${weather.isDay}`}
                    scene={weather.scene}
                    isDay={weather.isDay}
                />
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
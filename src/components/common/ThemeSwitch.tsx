"use client";
import { changeThemeAnimated, useThemeStore } from "@/lib/theme";

const Dot = ({ cls }: { cls: string }) => (
    <svg className={cls} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={50} />
    </svg>
);

const Star = ({ cls }: { cls: string }) => (
    <svg className={`star ${cls}`} viewBox="0 0 20 20">
        <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
    </svg>
);

export function ThemeSwitch() {
    const resolved = useThemeStore((s) => s.resolved);


    return (
        <label className="bnb-switch switch" title="Đổi giao diện sáng / tối">
            <input
                type="checkbox"
                aria-label="Chế độ tối"
                checked={resolved === "dark"}
                onChange={(e) => {
                    const rect = e.currentTarget
                        .closest("label")!
                        .getBoundingClientRect();
                    changeThemeAnimated(e.target.checked ? "dark" : "light", {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2,
                    });
                }}
            />
            <div className="slider round">
                <div className="sun-moon">
                    <Dot cls="moon-dot md1" />
                    <Dot cls="moon-dot md2" />
                    <Dot cls="moon-dot md3" />
                    <Dot cls="light-ray lr1" />
                    <Dot cls="light-ray lr2" />
                    <Dot cls="light-ray lr3" />
                    <Dot cls="cloud-dark c1" />
                    <Dot cls="cloud-dark c2" />
                    <Dot cls="cloud-dark c3" />
                    <Dot cls="cloud-light c4" />
                    <Dot cls="cloud-light c5" />
                    <Dot cls="cloud-light c6" />
                </div>
                <div className="stars">
                    <Star cls="s1" />
                    <Star cls="s2" />
                    <Star cls="s3" />
                    <Star cls="s4" />
                </div>
            </div>

            <style jsx global>{`
        .bnb-switch { position: relative; display: inline-block; width: 60px; height: 34px; flex-shrink: 0; }
        .bnb-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .bnb-switch .slider { position: absolute; cursor: pointer; inset: 0; background-color: #2196f3; transition: 0.4s; z-index: 0; overflow: hidden; }
        .bnb-switch .slider.round { border-radius: 34px; }
        .bnb-switch .sun-moon { position: absolute; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: yellow; border-radius: 50%; transition: 0.4s; }

        .bnb-switch input:checked + .slider { background-color: black; }
        .bnb-switch input:focus-visible + .slider { box-shadow: 0 0 0 2px rgba(255,255,255,0.6); }
        .bnb-switch input:checked + .slider .sun-moon { transform: translateX(26px); background-color: white; }

        .bnb-switch .moon-dot { opacity: 0; transition: 0.4s; fill: gray; position: absolute; z-index: 4; }
        .bnb-switch input:checked + .slider .moon-dot { opacity: 1; }
        .bnb-switch .md1 { left: 10px; top: 3px; width: 6px; height: 6px; }
        .bnb-switch .md2 { left: 2px; top: 10px; width: 10px; height: 10px; }
        .bnb-switch .md3 { left: 16px; top: 18px; width: 3px; height: 3px; }

        .bnb-switch .light-ray { position: absolute; z-index: -1; fill: white; opacity: 10%; }
        .bnb-switch .lr1 { left: -8px; top: -8px; width: 43px; height: 43px; }
        .bnb-switch .lr2 { left: -50%; top: -50%; width: 55px; height: 55px; }
        .bnb-switch .lr3 { left: -18px; top: -18px; width: 60px; height: 60px; }

        .bnb-switch .cloud-light,
        .bnb-switch .cloud-dark { position: absolute; animation: bnb-cloud-move 6s infinite; }
        .bnb-switch .cloud-light { fill: #eee; }
        .bnb-switch .cloud-dark { fill: #ccc; animation-delay: 1s; }
        .bnb-switch .c1 { left: 30px; top: 15px; width: 40px; }
        .bnb-switch .c2 { left: 44px; top: 10px; width: 20px; }
        .bnb-switch .c3 { left: 18px; top: 24px; width: 30px; }
        .bnb-switch .c4 { left: 36px; top: 18px; width: 40px; }
        .bnb-switch .c5 { left: 48px; top: 14px; width: 20px; }
        .bnb-switch .c6 { left: 22px; top: 26px; width: 30px; }
        @keyframes bnb-cloud-move {
          0% { transform: translateX(0); }
          40% { transform: translateX(4px); }
          80% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }

        .bnb-switch .stars { transform: translateY(-32px); opacity: 0; transition: 0.4s; }
        .bnb-switch input:checked + .slider .stars { transform: translateY(0); opacity: 1; }
        .bnb-switch .star { fill: white; position: absolute; transition: 0.4s; animation: bnb-star-twinkle 2s infinite; }
        .bnb-switch .s1 { width: 20px; top: 2px; left: 3px; animation-delay: 0.3s; }
        .bnb-switch .s2 { width: 6px; top: 16px; left: 3px; }
        .bnb-switch .s3 { width: 12px; top: 20px; left: 10px; animation-delay: 0.6s; }
        .bnb-switch .s4 { width: 18px; top: 0; left: 18px; animation-delay: 1.3s; }
        @keyframes bnb-star-twinkle {
          0% { transform: scale(1); }
          40% { transform: scale(1.2); }
          80% { transform: scale(0.8); }
          100% { transform: scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .bnb-switch .cloud-light,
          .bnb-switch .cloud-dark,
          .bnb-switch .star { animation: none; }
        }
      `}</style>
        </label>
    );
}
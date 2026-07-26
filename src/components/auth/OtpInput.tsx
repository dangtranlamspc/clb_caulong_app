'use client';
import { useState, useEffect, useRef } from 'react';

export function OtpInput({ value, onChange, onComplete, hasError = false, shakeSignal = 0, disabled = false }: {
    value: string;
    onChange: (val: string) => void;
    onComplete?: (val: string) => void;
    hasError?: boolean;
    shakeSignal?: number;
    disabled?: boolean;
}) {
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
    const [shaking, setShaking] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setShaking(true);
        const t = setTimeout(() => setShaking(false), 400);
        return () => clearTimeout(t);
    }, [shakeSignal]);

    const setDigit = (index: number, val: string) => {
        const next = digits.slice();
        next[index] = val;
        const joined = next.join('');
        onChange(joined);
        if (joined.length === 6) onComplete?.(joined);
    };

    const handleChange = (index: number, raw: string) => {
        if (disabled) return;
        const val = raw.replace(/\D/g, '');
        if (!val) {
            setDigit(index, '');
            return;
        }
        const char = val[val.length - 1];
        setDigit(index, char);
        if (index < 5) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                setDigit(index, '');
            } else if (index > 0) {
                inputsRef.current[index - 1]?.focus();
                setDigit(index - 1, '');
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted);
        if (pasted.length === 6) {
            onComplete?.(pasted);
            inputsRef.current[5]?.focus();
        } else {
            inputsRef.current[pasted.length]?.focus();
        }
    };

    return (
        <>
            <div
                className={`flex justify-center gap-2 mb-4 ${shaking ? 'otp-shake' : ''}`}
                onPaste={handlePaste}
            >
                {digits.map((d, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputsRef.current[i] = el; }}
                        value={d}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        inputMode="numeric"
                        maxLength={1}
                        disabled={disabled}
                        className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50
              ${hasError
                                ? 'border-red-400 ring-2 ring-red-100 text-red-600'
                                : 'border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`}
                    />
                ))}
            </div>
            <style jsx>{`
        @keyframes otpShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .otp-shake {
          animation: otpShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
        </>
    );
}
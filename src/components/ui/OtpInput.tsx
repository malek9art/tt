"use client";
import { useRef, useState, useEffect, ClipboardEvent, KeyboardEvent } from "react";

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput({ length = 6, onComplete, disabled, autoFocus }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focus = (idx: number) => refs.current[Math.max(0, Math.min(length - 1, idx))]?.focus();

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit) {
      if (idx < length - 1) focus(idx + 1);
      if (next.every(d => d) ) onComplete(next.join(""));
    }
  };

  const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) { next[idx] = ""; setDigits(next); }
      else { next[idx - 1] = ""; setDigits(next); focus(idx - 1); }
    } else if (e.key === "ArrowLeft")  focus(idx - 1);
    else if (e.key === "ArrowRight") focus(idx + 1);
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((d, i) => { if (i < length) next[i] = d; });
    setDigits(next);
    focus(Math.min(pasted.length, length - 1));
    if (next.every(d => d)) onComplete(next.join(""));
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`
            h-13 w-11 sm:h-14 sm:w-12 rounded-xl border-2 text-center text-xl font-bold
            text-[var(--text-1)] bg-[var(--bg-page)] outline-none transition-all
            ${d
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
              : "border-[var(--border)] focus:border-brand-500"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}
          `}
        />
      ))}
    </div>
  );
}

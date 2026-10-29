"use client";

import { useState } from "react";
import { inputCls } from "@/lib/ui";

export default function PasswordInput({
  name = "password",
  autoComplete,
  placeholder,
}: {
  name?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const svg = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${inputCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition hover:text-white"
      >
        {show ? (
          <svg {...svg}>
            <path d="M3 3l18 18" />
            <path d="M10.6 6.1A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 6.7A17 17 0 0 0 2.5 12S6 18 12 18a9.7 9.7 0 0 0 4.2-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg {...svg}>
            <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

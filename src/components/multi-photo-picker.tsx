"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

export default function MultiPhotoPicker({
  files,
  onChange,
  max,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  max: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);

  function add(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (picked.length) onChange([...files, ...picked].slice(0, max));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div key={`${f.name}-${f.size}-${i}`} className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/10">
            {urls[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[i]} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white"
            >
              ×
            </button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-white/30 text-xs text-white/60 transition hover:border-white hover:text-white"
          >
            <span className="text-xl leading-none">+</span>
            Add
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple onChange={add} className="hidden" />
      <p className="mt-2 text-xs text-white/40">
        {files.length} of {max} photos. You can add more in several goes.
      </p>
    </div>
  );
}

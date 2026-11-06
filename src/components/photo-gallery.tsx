"use client";

import { useState } from "react";

// A large photo with thumbnails underneath. Tap the large photo to open it full size.
export default function PhotoGallery({ images }: { images: string[] }) {
  const [i, setI] = useState(0);
  if (images.length === 0) return null;
  const cur = images[Math.min(i, images.length - 1)];

  return (
    <div className="mb-4">
      <a href={cur} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
      </a>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(n)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border ${
                n === i ? "border-gold" : "border-white/10 opacity-70"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

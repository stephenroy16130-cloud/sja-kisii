// WhatsApp-style photo viewer for profile photos. Tap a photo to open it full screen.
let started = false;
let viewerOpen = false;

const Z = "2147483200";
const MAX_ZOOM = 6;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css: Partial<CSSStyleDeclaration>): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  Object.assign(n.style, css);
  return n;
}

// The real address of the picture, even when the app shows it through the Next.js image helper
function realSrc(img: HTMLImageElement): string {
  const s = img.currentSrc || img.src;
  try {
    const u = new URL(s, location.href);
    if (u.pathname === "/_next/image") return u.searchParams.get("url") || s;
  } catch {
    // use s as it is
  }
  return s;
}

function isPhoto(img: HTMLImageElement): boolean {
  const s = decodeURIComponent(realSrc(img));
  return s.includes("/api/photos/") || s.startsWith("blob:") || s.startsWith("data:image");
}

function captionOf(src: string): string {
  const s = decodeURIComponent(src);
  if (s.includes("/social")) return "Social profile photo";
  if (s.includes("/official")) return "Official profile photo";
  return "Profile photo";
}

function openViewer(from: HTMLImageElement) {
  if (viewerOpen) return;
  viewerOpen = true;

  const src = realSrc(from);
  const rect = from.getBoundingClientRect();
  const radius = getComputedStyle(from).borderRadius || "0px";

  // The picture, sized to fit the screen
  const nw = from.naturalWidth || rect.width || 1;
  const nh = from.naturalHeight || rect.height || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fit = Math.min(vw / nw, vh / nh);
  const w = nw * fit;
  const h = nh * fit;

  const root = el("div", { position: "fixed", inset: "0", zIndex: Z });
  const bg = el("div", { position: "absolute", inset: "0", background: "#000", opacity: "0", transition: "opacity 220ms" });
  const stage = el("div", { position: "absolute", inset: "0", overflow: "hidden", touchAction: "none" });
  const img = el("img", {
    position: "absolute",
    left: `${(vw - w) / 2}px`,
    top: `${(vh - h) / 2}px`,
    width: `${w}px`,
    height: `${h}px`,
    borderRadius: radius,
    userSelect: "none",
    willChange: "transform",
  });
  img.src = src;
  img.alt = "";
  img.draggable = false;

  const bar = el("div", {
    position: "absolute",
    top: "0",
    left: "0",
    right: "0",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "calc(env(safe-area-inset-top, 0px) + 10px) 14px 24px",
    background: "linear-gradient(rgba(0,0,0,.7), rgba(0,0,0,0))",
    color: "#fff",
    font: "500 16px/1.2 system-ui, sans-serif",
    transition: "opacity 220ms",
    pointerEvents: "none",
  });
  const back = el("button", { pointerEvents: "auto", background: "transparent", border: "0", color: "#fff", padding: "6px", cursor: "pointer" });
  back.setAttribute("aria-label", "Close");
  back.innerHTML =
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>';
  const title = el("span", {});
  title.textContent = captionOf(src);
  bar.append(back, title);

  const state = { k: 1, tx: 0, ty: 0 };
  const paint = () => {
    img.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.k})`;
  };
  const place = (r: DOMRect) =>
    `translate(${r.left + r.width / 2 - vw / 2}px, ${r.top + r.height / 2 - vh / 2}px) scale(${Math.max(r.width / w, r.height / h)})`;

  // Start from where the small photo is, then grow to full screen
  img.style.transform = place(rect);
  from.style.visibility = "hidden";
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  stage.append(img);
  root.append(bg, stage, bar);
  document.body.append(root);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      img.style.transition = "transform 260ms cubic-bezier(.2,.8,.2,1), border-radius 260ms";
      img.style.borderRadius = "0px";
      bg.style.opacity = "0.96";
      paint();
    })
  );

  let closing = false;
  function close() {
    if (closing) return;
    closing = true;
    const r = from.isConnected ? from.getBoundingClientRect() : null;
    const visible = r && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    bg.style.opacity = "0";
    bar.style.opacity = "0";
    img.style.transition = "transform 220ms ease, opacity 220ms, border-radius 220ms";
    if (visible && r) {
      img.style.transform = place(r);
      img.style.borderRadius = radius;
    } else {
      img.style.opacity = "0";
    }
    window.setTimeout(() => {
      from.style.visibility = "";
      root.remove();
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      viewerOpen = false;
    }, 240);
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", onKey);
  back.addEventListener("click", close);

  // Moving and zooming
  const limit = () => ({ mx: Math.max(0, (w * state.k - vw) / 2), my: Math.max(0, (h * state.k - vh) / 2) });
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const settle = () => {
    const { mx, my } = limit();
    state.tx = state.k <= 1 ? 0 : clamp(state.tx, mx);
    state.ty = state.k <= 1 ? 0 : clamp(state.ty, my);
  };
  const onPhoto = (x: number, y: number) => {
    const r = img.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const pts = new Map<number, { x: number; y: number }>();
  let pinch0 = { d: 1, k: 1 };
  let pan0 = { x: 0, y: 0, tx: 0, ty: 0 };
  let moved = false;
  let lastTap = 0;
  const dist = () => {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };

  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    img.style.transition = "none";
    if (pts.size === 2) pinch0 = { d: dist(), k: state.k };
    else {
      pan0 = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
      moved = false;
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      moved = true;
      state.k = Math.max(1, Math.min(MAX_ZOOM, (pinch0.k * dist()) / pinch0.d));
      settle();
      paint();
      return;
    }
    const dx = e.clientX - pan0.x;
    const dy = e.clientY - pan0.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    if (state.k > 1) {
      const { mx, my } = limit();
      state.tx = clamp(pan0.tx + dx, mx);
      state.ty = clamp(pan0.ty + dy, my);
    } else {
      // Not zoomed in: dragging up or down closes the viewer
      state.tx = 0;
      state.ty = dy;
      bg.style.opacity = String(0.96 * (1 - Math.min(Math.abs(dy) / 400, 0.8)));
    }
    paint();
  });

  function toggleZoom(x: number, y: number) {
    img.style.transition = "transform 220ms ease";
    if (state.k > 1) {
      state.k = 1;
    } else {
      state.k = 2.5;
      state.tx = (x - vw / 2) * (1 - state.k);
      state.ty = (y - vh / 2) * (1 - state.k);
    }
    settle();
    paint();
  }

  const end = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (pts.size === 1) {
      const p = [...pts.values()][0];
      pan0 = { x: p.x, y: p.y, tx: state.tx, ty: state.ty };
      moved = true;
      return;
    }
    if (pts.size > 0) return;
    img.style.transition = "transform 200ms ease";
    if (state.k === 1) {
      if (Math.abs(state.ty) > 110) {
        close();
        return;
      }
      state.tx = 0;
      state.ty = 0;
      bg.style.opacity = "0.96";
      paint();
    }
    if (!moved) {
      if (!onPhoto(e.clientX, e.clientY)) {
        close();
        return;
      }
      const now = Date.now();
      if (now - lastTap < 300) {
        toggleZoom(e.clientX, e.clientY);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  // Mouse wheel zoom on a computer
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      state.k = Math.max(1, Math.min(MAX_ZOOM, state.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      settle();
      img.style.transition = "transform 80ms";
      paint();
    },
    { passive: false }
  );
}

export function initPhotoZoom() {
  if (started || typeof window === "undefined") return;
  started = true;

  const target = (e: Event): HTMLImageElement | null => {
    if (!location.pathname.startsWith("/dashboard/profile")) return null;
    const img = e.target instanceof HTMLImageElement ? e.target : null;
    if (!img || !isPhoto(img)) return null;
    const main = document.querySelector("main");
    if (main && !main.contains(img)) return null;
    // A photo that is itself a link, button or upload control keeps its own job
    if (img.closest("a,button,label,[data-no-zoom]")) return null;
    return img;
  };

  document.addEventListener(
    "click",
    (e) => {
      const img = target(e);
      if (!img) return;
      e.preventDefault();
      e.stopPropagation();
      openViewer(img);
    },
    true
  );
  document.addEventListener("pointerover", (e) => {
    const img = target(e);
    if (img) img.style.cursor = "zoom-in";
  });
}

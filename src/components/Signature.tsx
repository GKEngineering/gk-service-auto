"use client";

import { useEffect, useRef } from "react";

/** Zone de signature au doigt. Renvoie un PNG (data URL) ou null si effacée. */
export function Signature({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dessine = useRef(false);
  const vide = useRef(true);

  useEffect(() => {
    const c = canvas.current!;
    const dpr = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * dpr;
    c.height = c.offsetHeight * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const effacer = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    vide.current = true;
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvas}
        className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dessine.current = true;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.1, y + 0.1);
          ctx.stroke();
        }}
        onPointerMove={(e) => {
          if (!dessine.current) return;
          const ctx = e.currentTarget.getContext("2d")!;
          const [x, y] = point(e);
          ctx.lineTo(x, y);
          ctx.stroke();
          vide.current = false;
        }}
        onPointerUp={(e) => {
          if (!dessine.current) return;
          dessine.current = false;
          vide.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
        <span>Signez dans le cadre ci-dessus</span>
        <button type="button" onClick={effacer} className="font-medium text-gk">
          Effacer
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const OUT = 512;

export default function AvatarCropper({
  file,
  onCancel,
  onDone
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [view, setView] = useState(280);
  const [err, setErr] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    setView(Math.max(200, Math.min(320, window.innerWidth - 64)));
    let dead = false;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      if (dead) return;
      setSrc(url);
      setImg(el);
    };
    el.onerror = () => !dead && setErr("This image could not be read. Try a JPG or PNG photo.");
    el.src = url;
    return () => {
      dead = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const w = img?.naturalWidth ?? 1;
  const h = img?.naturalHeight ?? 1;
  const base = view / Math.min(w, h); // "cover" scale
  const scale = base * zoom;

  function clamp(p: { x: number; y: number }, z: number) {
    const s = base * z;
    const mx = Math.max(0, (w * s - view) / 2);
    const my = Math.max(0, (h * s - view) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  }

  function changeZoom(z: number) {
    const nz = Math.min(4, Math.max(1, z));
    setZoom(nz);
    setPos((p) => clamp(p, nz));
  }

  function done() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setErr("Your browser could not prepare the image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);
    const side = view / scale;
    const cx = w / 2 - pos.x / scale;
    const cy = h / 2 - pos.y / scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, OUT, OUT);
    canvas.toBlob(
      (b) => (b ? onDone(b) : setErr("Could not export the image.")),
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(8,10,16,.7)" }}>
      <div className="pd-card w-full max-w-[380px] p-5" role="dialog" aria-label="Crop photo">
        <h3 className="font-bold text-lg mb-1">Adjust your photo</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>Drag to move. Use the slider to zoom.</p>

        {err ? (
          <p className="text-sm text-red-500 mb-4">{err}</p>
        ) : (
          <div
            className="mx-auto relative overflow-hidden rounded-xl select-none"
            style={{ width: view, height: view, background: "#111", touchAction: "none", cursor: "grab" }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }, zoom));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: w * scale,
                  height: h * scale,
                  maxWidth: "none",
                  pointerEvents: "none",
                  transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0,0,0,.55)",
                border: "2px solid #fff",
                pointerEvents: "none"
              }}
            />
          </div>
        )}

        {!err && (
          <div className="flex items-center gap-3 mt-4">
            <button className="tn-icon" onClick={() => changeZoom(zoom - 0.2)} aria-label="Zoom out">−</button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => changeZoom(Number(e.target.value))}
              className="flex-1"
              aria-label="Zoom"
            />
            <button className="tn-icon" onClick={() => changeZoom(zoom + 0.2)} aria-label="Zoom in">+</button>
          </div>
        )}

        <div className="flex gap-2.5 mt-5">
          <button onClick={onCancel} className="btn-ghost flex-1 py-2.5 rounded-lg font-semibold text-sm">Cancel</button>
          <button onClick={done} disabled={!img || !!err} className="btn-primary flex-1 py-2.5 rounded-lg font-semibold text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

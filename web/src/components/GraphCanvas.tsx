"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphOut, GraphNode } from "@/lib/types";

const PALETTE = [
  "#6C63FF", "#00C9A7", "#FFB800", "#FF6B6B", "#A78BFA",
  "#38BDF8", "#FBBF24", "#34D399", "#F43F5E", "#818CF8",
];

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  fx: number | null;
  fy: number | null;
}

function clusterColor(c: number | null): string {
  if (c == null) return "#4B5563";
  return PALETTE[((c % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export function GraphCanvas({ data }: { data: GraphOut }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<SimNode | null>(null);
  const [query, setQuery] = useState("");
  const [activeCluster, setActiveCluster] = useState<number | null>(null);
  const ctrl = useRef({
    activeCluster: null as number | null,
    focusId: null as number | null,
    reset: 0,
  });
  ctrl.current.activeCluster = activeCluster;

  const clusters = useMemo(() => {
    const m = new Map<number, number>();
    for (const n of data.nodes) {
      if (n.cluster_id != null) m.set(n.cluster_id, (m.get(n.cluster_id) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  function focusChannel() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const hit = data.nodes.find(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.username ?? "").toLowerCase().includes(q)
    );
    if (hit) ctrl.current.focusId = hit.id;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapEl = wrapRef.current;
    if (!canvas || !wrapEl) return;
    const cv = canvas;
    const wrap = wrapEl;
    const ctx2d = cv.getContext("2d");
    if (!ctx2d) return;
    const ctx = ctx2d;

    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;

    function resize() {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * DPR;
      cv.height = H * DPR;
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    const maxPr = Math.max(0.0001, ...data.nodes.map((n) => n.pagerank ?? 0));
    const nodes: SimNode[] = data.nodes.map((n, i) => {
      const a = i * 2.399963;
      const rad = 30 + Math.sqrt(i) * 34;
      return {
        ...n,
        x: W / 2 + Math.cos(a) * rad,
        y: H / 2 + Math.sin(a) * rad,
        vx: 0,
        vy: 0,
        r: 10 + Math.sqrt((n.pagerank ?? 0) / maxPr) * 26,
        fx: null,
        fy: null,
      };
    });
    const index = new Map(nodes.map((n) => [n.id, n]));
    const links = data.edges
      .map((e) => ({
        s: index.get(e.source_id),
        t: index.get(e.target_id),
        w: e.weight,
      }))
      .filter((l) => l.s && l.t) as { s: SimNode; t: SimNode; w: number }[];

    const neighbors = new Map<number, Set<number>>();
    for (const n of nodes) neighbors.set(n.id, new Set());
    for (const l of links) {
      neighbors.get(l.s.id)!.add(l.t.id);
      neighbors.get(l.t.id)!.add(l.s.id);
    }

    const avatars = new Map<number, HTMLImageElement>();
    for (const n of nodes) {
      if (!n.username) continue;
      const img = new Image();
      img.src = `https://t.me/i/userpic/320/${n.username}.jpg`;
      img.onload = () => avatars.set(n.id, img);
    }

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let inited = false;

    let dragNode: SimNode | null = null;
    let panning = false;
    let last = { x: 0, y: 0 };
    let hovered: SimNode | null = null;
    let mouse = { x: 0, y: 0 };

    const toWorld = (mx: number, my: number) => ({
      x: (mx - tx) / scale,
      y: (my - ty) / scale,
    });

    function fit() {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
      }
      const gw = maxX - minX || 1;
      const gh = maxY - minY || 1;
      scale = Math.min(W / (gw + 160), H / (gh + 160), 1.4);
      tx = W / 2 - ((minX + maxX) / 2) * scale;
      ty = H / 2 - ((minY + maxY) / 2) * scale;
    }

    const vis = (n: SimNode) =>
      ctrl.current.activeCluster == null ||
      n.cluster_id === ctrl.current.activeCluster;

    let alpha = 1;
    function tick() {
      alpha = Math.max(alpha * 0.992, 0.03);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          let dx = a.x - b.x,
            dy = a.y - b.y;
          let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const minDist = a.r + b.r + 12;
          if (d < minDist) {
            const push = (minDist - d) * 0.5,
              ux = dx / d,
              uy = dy / d;
            a.x += ux * push;
            a.y += uy * push;
            b.x -= ux * push;
            b.y -= uy * push;
          }
          const f = (5000 / (d * d)) * alpha,
            ux = dx / d,
            uy = dy / d;
          a.vx += ux * f;
          a.vy += uy * f;
          b.vx -= ux * f;
          b.vy -= uy * f;
        }
      }
      for (const l of links) {
        const dx = l.t.x - l.s.x,
          dy = l.t.y - l.s.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 140) * 0.008 * alpha,
          ux = dx / d,
          uy = dy / d;
        l.s.vx += ux * f;
        l.s.vy += uy * f;
        l.t.vx -= ux * f;
        l.t.vy -= uy * f;
      }
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.0015 * alpha;
        n.vy += (H / 2 - n.y) * 0.0015 * alpha;
      }
      for (const n of nodes) {
        if (n.fx != null) {
          n.x = n.fx;
          n.y = n.fy!;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.84;
        n.vy *= 0.84;
      }
    }

    const active = (n: SimNode) => {
      if (!vis(n)) return false;
      if (!hovered) return true;
      return n === hovered || neighbors.get(hovered.id)!.has(n.id);
    };

    function drawNodeBody(n: SimNode, r: number) {
      const img = avatars.get(n.id);
      if (!img || !img.complete || img.naturalWidth === 0) {
        // Fallback: colored circle with initial
        ctx.fillStyle = clusterColor(n.cluster_id);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0F172A";
        ctx.font = `600 ${Math.max(10, r)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          (n.title.trim()[0] ?? "?").toUpperCase(),
          n.x,
          n.y + 0.5
        );
        ctx.textAlign = "start";
        return;
      }
      // Avatar with circular clip
      const iw = img.naturalWidth,
        ih = img.naturalHeight;
      const side = Math.min(iw, ih);
      const sx = (iw - side) / 2,
        sy = (ih - side) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, side, side, n.x - r, n.y - r, r * 2, r * 2);
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Subtle grid background
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
      ctx.lineWidth = 0.5 / scale;
      const gridSize = 80;
      const startX = Math.floor((-tx / scale - gridSize) / gridSize) * gridSize;
      const startY = Math.floor((-ty / scale - gridSize) / gridSize) * gridSize;
      const endX = (W - tx) / scale + gridSize;
      const endY = (H - ty) / scale + gridSize;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Links
      for (const l of links) {
        if (!vis(l.s) || !vis(l.t)) continue;
        const hot = hovered && (l.s === hovered || l.t === hovered);
        ctx.strokeStyle = hot
          ? "rgba(124, 156, 255, 0.45)"
          : "rgba(148, 163, 184, 0.08)";
        ctx.lineWidth =
          (hot ? 2 : 0.8) / scale + (hot ? Math.min(1.5, l.w * 0.2) : 0);
        ctx.beginPath();
        ctx.moveTo(l.s.x, l.s.y);
        ctx.lineTo(l.t.x, l.t.y);
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        if (!vis(n)) continue;
        const isAct = active(n);
        const grow = n === hovered ? 1.25 : 1;
        const r = n.r * grow;
        ctx.globalAlpha = isAct ? 1 : 0.12;

        // Outer glow (pulsing when hovered)
        if (isAct) {
          const pulse = n === hovered ? 1 + 0.05 * Math.sin(Date.now() * 0.01) : 1;
          ctx.shadowColor = clusterColor(n.cluster_id);
          ctx.shadowBlur = (n === hovered ? 30 : 14) * pulse;
        }
        drawNodeBody(n, r);
        ctx.shadowBlur = 0;

        // Ring
        ctx.beginPath();
        ctx.lineWidth = (n === hovered ? 3 : 2) / scale;
        ctx.strokeStyle = clusterColor(n.cluster_id);
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow for hovered node
        if (n === hovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = clusterColor(n.cluster_id) + "22";
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Labels
      ctx.fillStyle = "#E2E8F0";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const n of nodes) {
        if (!vis(n)) continue;
        const showByZoom = scale > 0.9 || n.r > 22;
        if (n === hovered || showByZoom) {
          ctx.globalAlpha = active(n)
            ? Math.min(1, (scale - 0.5) * 1.5 + (n === hovered ? 0.4 : 0.15))
            : 0.08;
          ctx.font = `${12 / scale + 4}px ui-monospace, monospace`;
          const label =
            n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title;
          const yOffset = n.y + n.r * (n === hovered ? 1.25 : 1) + 6 / scale;

          // Label background pill
          if (n === hovered || scale > 1.2) {
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
            ctx.beginPath();
            ctx.roundRect(
              n.x - textWidth / 2 - 6 / scale,
              yOffset - 2 / scale,
              textWidth + 12 / scale,
              18 / scale,
              6 / scale
            );
            ctx.fill();
          }
          ctx.fillStyle = n === hovered ? "#F8FAFC" : "#CBD5E1";
          ctx.fillText(label, n.x, yOffset);
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    function applyCtrl() {
      if (!inited && W > 0) {
        fit();
        inited = true;
      }
      if (ctrl.current.focusId != null) {
        const n = index.get(ctrl.current.focusId);
        ctrl.current.focusId = null;
        if (n) {
          scale = 1.6;
          tx = W / 2 - n.x * scale;
          ty = H / 2 - n.y * scale;
          hovered = n;
          setHover(n);
        }
      }
      if (ctrl.current.reset) {
        ctrl.current.reset = 0;
        fit();
      }
    }

    let raf = 0;
    function loop() {
      applyCtrl();
      tick();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    function nodeAt(mx: number, my: number): SimNode | null {
      const w = toWorld(mx, my);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!vis(n)) continue;
        if ((n.x - w.x) ** 2 + (n.y - w.y) ** 2 <= (n.r + 3) ** 2) return n;
      }
      return null;
    }

    const rel = (ev: MouseEvent) => {
      const b = cv.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };

    let downAt = { x: 0, y: 0 };
    let activePointer: number | null = null;

    function onDown(ev: PointerEvent) {
      const p = rel(ev);
      downAt = p;
      last = p;
      activePointer = ev.pointerId;
      cv.setPointerCapture(ev.pointerId);
      const n = nodeAt(p.x, p.y);
      if (n) {
        dragNode = n;
        const w = toWorld(p.x, p.y);
        n.fx = w.x;
        n.fy = w.y;
        alpha = Math.max(alpha, 0.4);
        cv.style.cursor = "grabbing";
      } else {
        panning = true;
      }
    }

    function onMove(ev: PointerEvent) {
      const p = rel(ev);
      mouse = p;
      if (dragNode) {
        const w = toWorld(p.x, p.y);
        dragNode.fx = w.x;
        dragNode.fy = w.y;
        return;
      }
      if (panning) {
        tx += p.x - last.x;
        ty += p.y - last.y;
        last = p;
        return;
      }
      hovered = nodeAt(p.x, p.y);
      setHover(hovered);
      cv.style.cursor = hovered ? "grab" : "default";
    }

    function onUp(ev: PointerEvent) {
      const p = rel(ev);
      const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
      if (dragNode) {
        if (moved < 4) {
          window.location.href = `/channel/${dragNode.id}`;
        } else {
          dragNode.fx = null;
          dragNode.fy = null;
        }
      }
      dragNode = null;
      panning = false;
      cv.style.cursor = "default";
      if (activePointer != null) {
        try {
          cv.releasePointerCapture(activePointer);
        } catch {}
        activePointer = null;
      }
    }

    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      const p = rel(ev);
      const f = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      const ns = Math.min(5, Math.max(0.2, scale * f));
      tx = p.x - (p.x - tx) * (ns / scale);
      ty = p.y - (p.y - ty) * (ns / scale);
      scale = ns;
    }

    function onDbl() {
      fit();
    }

    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("dblclick", onDbl);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("dblclick", onDbl);
      ro.disconnect();
    };
  }, [data]);

  return (
    <div
      ref={wrapRef}
      className="fixed inset-x-0 bottom-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"
      style={{ top: "var(--chrome-h, 57px)" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      {/* Controls overlay - glassmorphism style */}
      <div className="pointer-events-none absolute inset-0 p-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 shadow-lg">
            <svg
              className="h-4 w-4 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && focusChannel()}
              placeholder="Search channels…"
              className="w-48 bg-transparent text-sm font-medium text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <button
            onClick={() => (ctrl.current.reset = 1)}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Fit view
          </button>

          {activeCluster != null && (
            <button
              onClick={() => setActiveCluster(null)}
              className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-xl px-4 py-2 text-sm font-medium text-indigo-300"
            >
              Cluster {activeCluster} ✕
            </button>
          )}
        </div>

        {/* Hover card */}
        {hover && (
          <div className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 shadow-lg">
            <div className="text-sm font-semibold text-white">
              {hover.title}
            </div>
            <div className="mt-1 text-xs text-white/50">
              {hover.username ? `@${hover.username} · ` : ""}
              pr {(hover.pagerank ?? 0 * 1000).toFixed(1)} · in{" "}
              {hover.in_degree ?? 0} · cluster {hover.cluster_id ?? "—"}
            </div>
          </div>
        )}

        {/* Cluster filter legend */}
        <div className="pointer-events-auto absolute bottom-4 left-4 flex max-w-[60vw] flex-wrap gap-2">
          {clusters.map(([cid, count]) => (
            <button
              key={cid}
              onClick={() =>
                setActiveCluster(activeCluster === cid ? null : cid)
              }
              className={`flex items-center gap-2 rounded-lg border bg-white/5 backdrop-blur-xl px-3 py-1.5 text-xs font-medium transition-all ${
                activeCluster === cid
                  ? "border-white/30 text-white"
                  : "border-white/5 text-white/50 hover:border-white/20 hover:text-white/80"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: clusterColor(cid) }}
              />
              C{cid} · {count}
            </button>
          ))}
        </div>

        {/* Hint text */}
        <div className="absolute bottom-4 right-4 text-xs font-medium text-white/30">
          Scroll to zoom · Drag to pan · Click node to open
        </div>
      </div>
    </div>
  );
}
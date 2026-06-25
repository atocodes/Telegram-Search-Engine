"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { GraphCanvas } from "./GraphCanvas";
import { CategoryBadge } from "./CategoryBadge";
import { LockBodyScroll } from "./LockBodyScroll";

import { categoryLabel } from "@/lib/format";

import type { GraphOut, HubOut, ClusterOut } from "@/lib/types";

function HubRow({
  h,
  metric,
}: {
  h: HubOut;
  metric: "pagerank" | "betweenness";
}) {
  const val =
    metric === "pagerank"
      ? ((h.pagerank ?? 0) * 1000).toFixed(1)
      : ((h.betweenness ?? 0) * 100).toFixed(1);

  return (
    <Link
      href={`/channel/${h.id}`}
      className="
        group flex items-center justify-between
        rounded-xl border border-border/60
        bg-surface/70
        px-3 py-3
        transition-all duration-200
        hover:border-accent/40
        hover:bg-surface-2
        hover:shadow-glow
      "
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-fg-bright transition-colors group-hover:text-white">
          {h.title}
        </div>

        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-muted">
          <span>
            {h.category ? categoryLabel(h.category) : "unknown"}
          </span>

          <span className="text-border-bright">•</span>

          <span>{h.in_degree ?? 0} links</span>
        </div>
      </div>

      <div className="ml-4 shrink-0 text-right">
        <div className="font-mono text-sm text-accent">
          {val}
        </div>

        <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
          {metric === "pagerank" ? "rank" : "bridge"}
        </div>
      </div>
    </Link>
  );
}

export function GraphView({
  graph,
  hubs,
  bridges,
  clusters,
}: {
  graph: GraphOut;
  hubs: HubOut[];
  bridges: HubOut[];
  clusters: ClusterOut[];
}) {
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    setPanel(window.matchMedia("(min-width: 640px)").matches);
  }, []);

  return (
    <>
      <LockBodyScroll />

      {/* Graph Background */}
      <div className="fixed inset-0 -z-10 bg-bg">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,150,255,0.14),transparent_45%)]" />
      </div>

      <GraphCanvas data={graph} />

      {/* Floating Toggle */}
      <button
        onClick={() => setPanel((p) => !p)}
        className="
          fixed right-4 top-[78px] z-40
          flex items-center gap-2
          rounded-xl border border-border
          bg-surface/90
          px-4 py-2
          font-mono text-[11px] uppercase tracking-widest
          text-muted
          backdrop-blur-xl
          transition-all duration-200
          hover:border-accent/40
          hover:text-accent
          hover:shadow-glow
        "
      >
        <div
          className={`
            h-2 w-2 rounded-full transition-colors
            ${panel ? "bg-accent animate-pulse" : "bg-muted"}
          `}
        />

        {panel ? "close metrics" : "open metrics"}
      </button>

      {/* Side Panel */}
      {panel && (
        <div
          className="
            fixed inset-x-3 bottom-3 top-[120px]
            z-30 overflow-y-auto
            rounded-2xl border border-border
            bg-surface/88
            p-4 backdrop-blur-2xl
            shadow-soft

            sm:inset-x-auto
            sm:right-4
            sm:w-[360px]
          "
        >
          {/* Header */}
          <div className="mb-5 border-b border-border pb-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
              The Under-grounders metrics
            </div>

            <h2 className="mt-2 text-lg font-semibold text-fg-bright">
              Telegram Network Analysis
            </h2>

            <p className="mt-1 text-sm text-muted">
              Discover hidden creators, active communities,
              and influential connectors.
            </p>
          </div>

          {/* Top Hubs */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                top hubs
              </div>

              <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
                influence
              </span>
            </div>

            <div className="space-y-2">
              {hubs.map((h) => (
                <HubRow
                  key={h.id}
                  h={h}
                  metric="pagerank"
                />
              ))}
            </div>
          </section>

          {/* Bridges */}
          <section className="mt-6 border-t border-border pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                bridge channels
              </div>

              <span className="rounded-full border border-info/20 bg-info/10 px-2 py-0.5 font-mono text-[10px] text-info">
                connectors
              </span>
            </div>

            {bridges.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-2/50 p-4">
                <p className="font-mono text-[11px] text-muted">
                  // network too sparse for bridge analysis
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bridges.map((h) => (
                  <HubRow
                    key={h.id}
                    h={h}
                    metric="betweenness"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Communities */}
          <section className="mt-6 border-t border-border pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
                communities
              </div>

              <span className="rounded-full border border-border-bright bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-fg">
                {clusters.length} detected
              </span>
            </div>

            <div className="space-y-3">
              {clusters.map((c) => (
                <div
                  key={c.cluster_id}
                  className="
                    rounded-2xl border border-border
                    bg-surface-2/40
                    p-4
                    transition-all duration-200
                    hover:border-accent/30
                    hover:bg-surface-2/70
                  "
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                        cluster
                      </div>

                      <div className="mt-1 text-sm font-semibold text-fg-bright">
                        #{c.cluster_id}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-lg text-accent">
                        {c.size}
                      </div>

                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
                        channels
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <CategoryBadge category={c.top_category} />
                  </div>

                  <div className="mt-4 rounded-xl border border-border/60 bg-bg/40 p-3">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      top channels
                    </div>

                    <div className="mt-2 truncate text-xs text-fg">
                      {c.top_titles.slice(0, 3).join(" • ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
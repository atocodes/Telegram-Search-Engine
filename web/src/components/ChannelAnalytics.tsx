import Link from "next/link";
import type { ChannelAnalytics } from "@/lib/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Sparkline({ points }: { points: { week: string; count: number }[] }) {
  if (points.length === 0)
    return (
      <p className="font-mono text-[11px] text-white/40">
        {"// no recent activity"}
      </p>
    );
  const max = Math.max(...points.map((p) => p.count), 1);
  return (
    <div className="flex h-20 items-end gap-1">
      {points.map((p) => (
        <div key={p.week} className="group relative flex-1">
          <div
            className="w-full rounded-sm bg-indigo-500/60 transition-colors group-hover:bg-indigo-400"
            style={{ height: `${Math.max(4, (p.count / max) * 72)}px` }}
          />
          <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-2 py-1 font-mono text-[9px] text-white group-hover:block">
            {p.week.slice(5)} · {p.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function ConnList({
  title,
  items,
}: {
  title: string;
  items: { channel_id: number | null; title: string | null; username: string | null; weight: number }[];
}) {
  if (items.length === 0)
    return (
      <div>
        <div className="mono-label mb-2">{title}</div>
        <p className="font-mono text-[11px] text-white/40">{"// none yet"}</p>
      </div>
    );
  return (
    <div>
      <div className="mono-label mb-2">{title}</div>
      <div className="space-y-1">
        {items.map((c, i) => {
          const label = c.title ?? (c.username ? `@${c.username}` : "unknown");
          const inner = (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.06]">
              <span className="truncate text-sm text-white/80">{label}</span>
              <span className="ml-2 shrink-0 font-mono text-[10px] text-white/40">
                ×{c.weight}
              </span>
            </div>
          );
          return c.channel_id ? (
            <Link key={i} href={`/channel/${c.channel_id}`}>
              {inner}
            </Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

export function ChannelAnalyticsPanel({ a }: { a: ChannelAnalytics }) {
  return (
    <div className="mt-4 space-y-4">
      {/* Activity timeline */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
        <div className="mono-label mb-3">activity · last 12 weeks</div>
        <Sparkline points={a.timeline} />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric
            label="posts/week"
            value={a.posts_per_week != null ? String(a.posts_per_week) : "—"}
          />
          <Metric label="total posts" value={String(a.total_messages)} />
          <Metric
            label="busiest day"
            value={a.top_weekday != null ? DOW[a.top_weekday] : "—"}
          />
          <Metric
            label="busiest hour"
            value={a.top_hour != null ? `${a.top_hour}:00` : "—"}
          />
        </div>
      </div>

      {/* Content mix + network position */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="mono-label mb-3">content mix</div>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="images" value={`${a.image_pct}%`} />
            <Metric label="links" value={`${a.link_pct}%`} />
            <Metric label="avg length" value={`${a.avg_length}c`} />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
          <div className="mono-label mb-3">network position</div>
          <div className="grid grid-cols-3 gap-4">
            <Metric
              label="influence rank"
              value={a.pagerank_rank != null ? `#${a.pagerank_rank}` : "—"}
            />
            <Metric label="referenced by" value={String(a.in_degree)} />
            <Metric label="references out" value={String(a.out_degree)} />
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl grid gap-5 p-5 md:grid-cols-2">
        <ConnList title="frequently references" items={a.references} />
        <ConnList title="referenced by" items={a.referenced_by} />
      </div>
    </div>
  );
}
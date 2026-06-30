import Link from "next/link";

import { SearchBar } from "@/components/SearchBar";

import { listCategories } from "@/lib/api";
import { categoryLabel } from "@/lib/format";

import type { CategoryOut } from "@/lib/types";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "MickyCodes",
  "pocodes",
  "nessjourney",
  "KinesTimeline",
  "MrChainyParadox",
  "thechillcodinglounge",
];

export default async function HomePage() {
  let categories: CategoryOut[] = [];
  let backendDown = false;

  try {
    categories = await listCategories();
  } catch {
    backendDown = true;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-bg">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />

        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-info/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-24">
        {/* HERO */}
        <div className="relative">
          {/* Badge */}
          <div
            className="
              inline-flex items-center gap-2
              rounded-full border border-accent/20
              bg-accent/10
              px-4 py-1.5
              font-mono text-[11px]
              uppercase tracking-[0.2em]
              text-accent
              backdrop-blur
            "
          >
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            The Under-grounders · Telegram Discovery Engine
          </div>

          {/* Heading */}
          <h1
            className="
              mt-6 max-w-4xl
              text-4xl font-semibold leading-[1.05]
              tracking-tight text-fg-bright

              sm:text-6xl
            "
          >
            Discover the unseen Telegram creators
            <br />
            <span className="text-accent">before they go mainstream.</span>
          </h1>

          {/* Description */}
          <p
            className="
              mt-6 max-w-2xl
              text-base leading-8 text-muted
              sm:text-lg
            "
          >
            We scan public Telegram channels to surface underrated creators,
            niche communities, and emerging voices. Ranked by real activity,
            consistency, and content quality — not hype.
          </p>

          {/* Search */}
          <div className="mt-10 max-w-3xl">
            <div
              className="
                rounded-2xl border border-border
                bg-surface/70
                p-3 backdrop-blur-xl
                shadow-soft
              "
            >
              <SearchBar size="lg" autoFocus />
            </div>
          </div>

          {/* Examples */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
              trending
            </span>

            {EXAMPLES.map((ex) => (
              <Link
                key={ex}
                href={`/search?q=${encodeURIComponent(ex)}`}
                className="
                  rounded-full border border-border
                  bg-surface/50
                  px-3 py-1.5
                  font-mono text-xs text-muted
                  transition-all duration-200

                  hover:border-accent/40
                  hover:bg-accent/10
                  hover:text-accent
                "
              >
                {ex}
              </Link>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <div
            className="
              rounded-2xl border border-border
              bg-surface/60 p-5
              backdrop-blur-xl
            "
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Focus
            </div>

            <div className="mt-3 text-2xl font-semibold text-fg-bright">
              Under 1.5K
            </div>

            <p className="mt-2 text-sm leading-6 text-muted">
              Built specifically for smaller Telegram communities and emerging
              creators.
            </p>
          </div>

          <div
            className="
              rounded-2xl border border-border
              bg-surface/60 p-5
              backdrop-blur-xl
            "
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Ranking
            </div>

            <div className="mt-3 text-2xl font-semibold text-fg-bright">
              AI Powered
            </div>

            <p className="mt-2 text-sm leading-6 text-muted">
              Channels ranked using engagement, freshness, quality, and network
              activity.
            </p>
          </div>

          <div
            className="
              rounded-2xl border border-border
              bg-surface/60 p-5
              backdrop-blur-xl
            "
          >
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Discovery
            </div>

            <div className="mt-3 text-2xl font-semibold text-fg-bright">
              Hidden Gems
            </div>

            <p className="mt-2 text-sm leading-6 text-muted">
              No spam directories. No inflated channels. Just active communities
              that matter.
            </p>
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="mt-20">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
                Explore
              </div>

              <h2 className="mt-2 text-2xl font-semibold text-fg-bright">
                Browse Communities
              </h2>
            </div>

            <Link
              href="/categories"
              className="
                rounded-full border border-border
                px-4 py-2
                font-mono text-xs text-muted
                transition-all duration-200

                hover:border-accent/40
                hover:text-accent
              "
            >
              view all →
            </Link>
          </div>

          {backendDown ? (
            <div
              className="
                rounded-2xl border border-danger/30
                bg-danger/10
                p-6
              "
            >
              <div className="font-mono text-xs text-danger">
                // backend offline — start FastAPI on{" "}
                {process.env.FASTAPI_URL ?? "http://localhost:8000"}
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div
              className="
                rounded-2xl border border-border
                bg-surface/60
                p-6
              "
            >
              <div className="font-mono text-xs text-muted">
                // no analyzed channels yet — run crawler + analyzer
              </div>
            </div>
          ) : (
            <div
              className="
                grid gap-4
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              {categories.map((c) => (
                <Link
                  key={c.category}
                  href={`/categories#${c.category}`}
                  className="
                    group relative overflow-hidden
                    rounded-2xl border border-border
                    bg-surface/60
                    p-5 backdrop-blur-xl

                    transition-all duration-300

                    hover:-translate-y-1
                    hover:border-accent/30
                    hover:bg-surface-2
                    hover:shadow-glow
                  "
                >
                  {/* glow */}
                  <div
                    className="
                      absolute inset-0 opacity-0
                      transition-opacity duration-300
                      group-hover:opacity-100
                      bg-[radial-gradient(circle_at_top_right,rgba(34,150,255,0.18),transparent_55%)]
                    "
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                          Category
                        </div>

                        <div className="mt-2 text-lg font-semibold text-fg-bright">
                          {categoryLabel(c.category)}
                        </div>
                      </div>

                      <div
                        className="
                          rounded-full border border-accent/20
                          bg-accent/10
                          px-3 py-1
                          font-mono text-xs text-accent
                        "
                      >
                        {c.channel_count}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-sm text-muted">
                        Explore channels
                      </span>

                      <span
                        className="
                          text-accent transition-transform
                          group-hover:translate-x-1
                        "
                      >
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

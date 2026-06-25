"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { StarButton } from "./StarButton";

const LINKS = [
  { href: "/search", label: "search" },
  { href: "/categories", label: "categories" },
  { href: "/graph", label: "network" },
  { href: "/dashboard", label: "dashboard" },
  { href: "/docs", label: "docs" },
];

export function TopBar() {
  const [open, setOpen] = useState(false);

  // Inline style helper using the CSS variables
  const styles = {
    header: {
      position: "sticky" as const,
      top: 0,
      zIndex: 50,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      backgroundColor: "rgba(18, 16, 22, 0.75)",
      backdropFilter: "blur(24px)",
    },
    glowLine: {
      position: "absolute" as const,
      inset: "0 0 auto 0",
      height: "1px",
      background: "linear-gradient(to right, transparent, var(--accent), transparent)",
      opacity: 0.5,
    },
    logoContainer: {
      position: "relative" as const,
      display: "flex",
      height: "56px",
      width: "56px",
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden" as const,
      borderRadius: "16px",
      border: "1px solid rgba(201, 168, 124, 0.2)",
      background: "linear-gradient(135deg, var(--bg-secondary), var(--bg-surface), var(--bg-primary))",
      boxShadow: "0 0 28px rgba(201, 168, 124, 0.12)",
      transition: "all 0.3s ease",
    },
    logoContainerHover: {
      transform: "scale(1.03)",
      borderColor: "rgba(201, 168, 124, 0.4)",
      boxShadow: "0 0 40px rgba(201, 168, 124, 0.20)",
    },
    brandingH1: {
      fontSize: "1.125rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      color: "var(--text-primary)",
      transition: "color 0.3s ease",
      whiteSpace: "nowrap" as const,
      overflow: "hidden" as const,
      textOverflow: "ellipsis" as const,
    },
    brandingH1Hover: {
      color: "#ffffff",
    },
    subtitle: {
      fontFamily: "var(--font-mono)",
      fontSize: "10px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.22em",
      color: "var(--text-muted)",
    },
    navLink: {
      position: "relative" as const,
      overflow: "hidden" as const,
      borderRadius: "12px",
      padding: "10px 16px",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.18em",
      color: "var(--text-muted)",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    navLinkHover: {
      color: "var(--text-primary)",
    },
    navLinkBg: {
      position: "absolute" as const,
      inset: 0,
      borderRadius: "12px",
      border: "1px solid rgba(201, 168, 124, 0.2)",
      backgroundColor: "rgba(201, 168, 124, 0.1)",
      opacity: 0,
      transition: "opacity 0.2s ease",
    },
    navLinkBgHover: {
      opacity: 1,
    },
    mobileButton: {
      position: "relative" as const,
      display: "flex",
      height: "44px",
      width: "44px",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden" as const,
      borderRadius: "12px",
      border: "1px solid var(--border-subtle)",
      backgroundColor: "rgba(29, 26, 36, 0.7)",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    mobileButtonHover: {
      borderColor: "rgba(201, 168, 124, 0.3)",
      boxShadow: "0 0 20px rgba(201, 168, 124, 0.15)",
    },
    mobileMenu: {
      position: "absolute" as const,
      left: 0,
      right: 0,
      top: "100%",
      zIndex: 40,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      backgroundColor: "rgba(18, 16, 22, 0.95)",
      padding: "12px",
      backdropFilter: "blur(24px)",
    },
    mobileLink: {
      position: "relative" as const,
      overflow: "hidden" as const,
      borderRadius: "16px",
      border: "1px solid var(--border-subtle)",
      backgroundColor: "rgba(29, 26, 36, 0.6)",
      padding: "14px 16px",
      transition: "all 0.2s ease",
      cursor: "pointer",
      display: "block",
    },
    mobileLinkHover: {
      borderColor: "rgba(201, 168, 124, 0.3)",
      backgroundColor: "rgba(29, 26, 36, 0.8)",
    },
  };

  return (
    <header style={styles.header}>
      <div style={styles.glowLine} />

      <div className="mx-auto flex h-[84px] items-center justify-between gap-3 px-4 sm:px-6">
        {/* LOGO */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="group relative flex min-w-0 items-center gap-3"
        >
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-primary shadow-[0_0_28px_rgba(201,168,124,0.12)] transition-all duration-300 group-hover:scale-[1.03] group-hover:border-accent/40 group-hover:shadow-[0_0_40px_rgba(201,168,124,0.20)] sm:h-16 sm:w-16"
            style={{
              backgroundColor: "var(--bg-surface)", // fallback
            }}
          >
            <div className="absolute inset-0 bg-grid opacity-[0.04]" />
            <Image
              src="/icon.png"
              alt="The Under-grounders Telegram Search Engine"
              width={44}
              height={44}
              priority
              className="h-9 w-9 shrink-0 rounded object-cover sm:h-11 sm:w-11 scale-[1.5]"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className="truncate text-lg font-semibold tracking-tight text-fg-bright transition-colors duration-300 group-hover:text-white sm:text-xl"
                style={{ color: "var(--text-primary)" }}
              >
                The Under-grounders
              </h1>
              <div className="relative hidden sm:flex">
                <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </div>
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:flex sm:items-center sm:gap-2">
              <span>Telegram Discovery Engine</span>
              <span className="text-accent">•</span>
            </div>
          </div>

          <div className="absolute -inset-3 -z-10 rounded-3xl bg-accent/5 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative overflow-hidden rounded-xl px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-all duration-200 hover:text-fg-bright"
            >
              {/* hover background */}
              <div
                className="
                  absolute inset-0

                  rounded-xl

                  border border-accent/20

                  bg-accent/10

                  opacity-0

                  transition-opacity duration-200

                  group-hover:opacity-100
                "
              />

              <span className="relative z-10">{l.label}</span>
            </Link>
          ))}
          <div className="mx-2 h-5 w-px bg-border" />
          <StarButton />
        </nav>

        {/* MOBILE */}
        <div className="flex items-center gap-2 md:hidden">
          <StarButton />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface/70 transition-all duration-200 hover:border-accent/30 hover:shadow-glow"
          >
            <div className="absolute inset-0 bg-accent/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            <svg
              viewBox="0 0 24 24"
              className="relative z-10 h-5 w-5 text-fg-bright"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <nav
          className="absolute left-0 right-0 top-full z-40 border-b border-border/60 bg-bg/95 p-3 backdrop-blur-2xl md:hidden"
          style={{ backgroundColor: "rgba(18, 16, 22, 0.95)" }}
        >
          <div className="flex flex-col gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface/60 px-4 py-3.5 transition-all duration-200 hover:border-accent/30 hover:bg-surface-2"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(circle_at_left,rgba(201,168,124,0.14),transparent_60%)]" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-bright">
                      {l.label}
                    </div>
                    <div className="mt-1 text-xs text-muted">Explore {l.label}</div>
                  </div>
                  <span className="text-muted transition-all duration-200 group-hover:translate-x-1 group-hover:text-accent">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

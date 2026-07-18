"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { ChevronLeft, Signal, Wifi, BatteryFull } from "lucide-react"
import { cn } from "@/lib/utils"

/* Large branded call-to-action button */
export function CTAButton({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "navy" | "outline"
}) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30",
    navy: "bg-navy text-navy-foreground hover:bg-navy/90",
    outline: "border border-border bg-card text-foreground hover:bg-muted",
  }[variant]

  return (
    <button
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold tracking-wide transition-all active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      {children}
    </div>
  )
}

/* iOS-style status bar for the phone mockup */
export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  const tone = dark ? "text-navy-foreground" : "text-navy"
  return (
    <div className={cn("flex items-center justify-between px-5 pt-2.5 pb-1 text-xs font-semibold", tone)}>
      <span className="tabular-nums">9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" />
        <Wifi className="size-3.5" />
        <BatteryFull className="size-4" />
      </div>
    </div>
  )
}

/* In-app top bar with back button */
export function AppBar({
  title,
  onBack,
  right,
  variant = "navy",
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  variant?: "navy" | "light"
}) {
  const isNavy = variant === "navy"
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3.5",
        isNavy ? "bg-navy text-navy-foreground" : "border-b border-border bg-card text-foreground",
      )}
    >
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors",
            isNavy ? "hover:bg-white/10" : "hover:bg-muted",
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <span className="w-8" />
      )}
      <h1 className="flex-1 truncate text-center font-display text-base font-bold">{title}</h1>
      <div className="flex w-8 justify-end">{right}</div>
    </div>
  )
}

export function StatBlock({
  label,
  value,
  accent,
}: {
  label: string
  value: ReactNode
  accent?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("font-display text-sm font-bold", accent ? "text-primary" : "text-navy")}>
        {value}
      </span>
    </div>
  )
}

export function Badge({
  children,
  tone = "orange",
  className,
}: {
  children: ReactNode
  tone?: "orange" | "navy" | "green" | "muted"
  className?: string
}) {
  const tones = {
    orange: "bg-accent text-accent-foreground",
    navy: "bg-navy/10 text-navy",
    green: "bg-emerald-100 text-emerald-700",
    muted: "bg-muted text-muted-foreground",
  }[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones,
        className,
      )}
    >
      {children}
    </span>
  )
}

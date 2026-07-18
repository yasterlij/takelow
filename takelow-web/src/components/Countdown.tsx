import { useEffect, useState } from "react"
import { formatCountdown } from "../mockDataV0"

export function useCountdown(initialSeconds: number, running = true) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [running])

  return seconds
}

export function Countdown({
  seconds,
  size = "md",
  labels = true,
  className,
}: {
  seconds: number
  size?: "sm" | "md" | "lg"
  labels?: boolean
  className?: string
}) {
  const { d, h, m, s } = formatCountdown(seconds)
  const parts = [
    { v: d, l: "DAYS" },
    { v: h, l: "HRS" },
    { v: m, l: "MIN" },
    { v: s, l: "SEC" },
  ]

  const box =
    size === "lg"
      ? "min-w-14 px-2.5 py-2 text-3xl"
      : size === "sm"
        ? "min-w-8 px-1.5 py-1 text-sm"
        : "min-w-11 px-2 py-1.5 text-xl"

  return (
    <div className={`flex items-center gap-1.5 ${className || ""}`}>
      {parts.map((p, i) => (
        <div key={p.l} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <div
              className={`rounded-lg bg-navy text-center font-display font-bold tabular-nums text-navy-foreground ${box}`}
            >
              {p.v}
            </div>
            {labels && (
              <span className="mt-1 text-[9px] font-semibold tracking-widest text-muted-foreground">
                {p.l}
              </span>
            )}
          </div>
          {i < parts.length - 1 && (
            <span className="-mt-3 font-display text-lg font-bold text-navy/40">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

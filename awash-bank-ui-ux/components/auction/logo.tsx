import { cn } from "@/lib/utils"

export function AwashMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="Awash Bank logo"
    >
      <circle cx="24" cy="24" r="23" fill="#1e2a6b" />
      <path
        d="M9 27c4-6 9-9 15-9s11 3 15 9"
        fill="none"
        stroke="#f47b20"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M12 20c3.5-4.5 7.5-6.8 12-6.8S32.5 15.5 36 20"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="24" cy="30.5" r="3.2" fill="#f47b20" />
    </svg>
  )
}

export function AwashLogo({
  className,
  variant = "light",
}: {
  className?: string
  variant?: "light" | "dark"
}) {
  const top = variant === "light" ? "text-navy" : "text-white"
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <AwashMark />
      <div className="leading-none">
        <div className={cn("font-display text-lg font-extrabold tracking-tight", top)}>
          AwashBank
        </div>
        <div className="text-[11px] font-semibold tracking-wide text-primary">
          Mobile Money
        </div>
      </div>
    </div>
  )
}

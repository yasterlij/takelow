import type { ButtonHTMLAttributes, ReactNode } from "react"
import { ChevronLeft, Gavel, Trophy, Zap } from "lucide-react"

// ─── Awash Bank Brand Logo ───────────────────────────────────────────

export function AwashMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Awash Bank logo"
    >
      <defs>
        <linearGradient id="awashBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#002B5C" />
          <stop offset="100%" stopColor="#001F3F" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#awashBlueGrad)" />
      <path
        d="M9 27c4-6 9-9 15-9s11 3 15 9"
        fill="none"
        stroke="#C8A642"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M12 20c3.5-4.5 7.5-6.8 12-6.8S32.5 15.5 36 20"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="24" cy="30.5" r="3.2" fill="#C8A642" />
    </svg>
  )
}

export function AwashLogo({
  className,
  variant = "light",
  size = 32,
}: {
  className?: string
  variant?: "light" | "dark"
  size?: number
}) {
  const textColor = variant === "light" ? "text-awash-blue-foreground" : "text-awash-blue"
  return (
    <div className={`flex items-center gap-2.5 ${className || ""}`}>
      <AwashMark size={size} />
      <div className="leading-none">
        <div className={`font-display text-lg font-extrabold tracking-tight ${textColor}`}>
          Awash Bank
        </div>
        <div className="text-[11px] font-semibold tracking-wide text-primary">
          Reverse Auction
        </div>
      </div>
    </div>
  )
}

// ─── Buttons ─────────────────────────────────────────────────────────

export function CTAButton({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "navy" | "outline"
}) {
  const styles = {
    primary: "btn-primary",
    navy: "btn-navy",
    outline: "btn-outline",
  }[variant]

  return (
    <button
      className={`${styles} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function GoldButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-primary animate-shine ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function NavyButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`btn-navy animate-shine ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-card-solid ${className || ""}`}>
      {children}
    </div>
  )
}

export function GoldCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-gold rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(200,166,66,0.15)] hover:border-primary/40 ${className || ""}`}>
      {children}
    </div>
  )
}

// ─── Phone Status Bar ───────────────────────────────────────────────

export function PhoneStatusBar(_props?: { dark?: boolean }) {
  return null
}

// ─── App Bar ─────────────────────────────────────────────────────────

export function AppBar({
  title,
  onBack,
  right,
  variant = "navy",
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
  variant?: "navy" | "light" | "gold"
}) {
  const bgStyles = {
    navy: "bg-awash-blue/90 backdrop-blur-xl text-white border-b border-white/10",
    gold: "bg-gradient-to-r from-awash-gold/90 to-awash-gold-light/90 backdrop-blur-xl text-awash-blue border-b border-primary/20",
    light: "glass-nav border-b border-border/50 text-foreground",
  }[variant]
  return (
    <div className={`flex items-center gap-2 px-4 py-3.5 ${bgStyles}`}>
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Go back"
          className={`flex size-8 items-center justify-center rounded-full transition-colors ${
            variant === "light" ? "hover:bg-muted" : "hover:bg-white/10 backdrop-blur-sm"
          }`}
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

// ─── Stats ───────────────────────────────────────────────────────────

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
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span className={`font-display text-base font-extrabold ${accent ? "text-gradient-gold" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────────

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode
  tone?: "gold" | "navy" | "green" | "muted" | "blue" | "orange"
  className?: string
}) {
  const tones = {
    orange: "bg-orange-50/80 backdrop-blur-sm text-orange-700 border border-orange-200/60",
    gold: "bg-awash-gold/15 backdrop-blur-sm text-awash-gold-dark border border-primary/20",
    navy: "bg-awash-blue/10 backdrop-blur-sm text-awash-blue border border-awash-blue/20",
    green: "bg-emerald-50/80 backdrop-blur-sm text-emerald-700 border border-emerald-200/60",
    muted: "bg-neutral-100/80 backdrop-blur-sm text-neutral-500 border border-neutral-200/60",
    blue: "bg-awash-blue/90 backdrop-blur-sm text-white border border-awash-blue-light/30",
  }[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${tones} ${className || ""}`}
    >
      {children}
    </span>
  )
}

export function BadgeGold({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-awash-gold/15 to-awash-gold-light/10 backdrop-blur-sm px-3.5 py-1.5 text-xs font-bold text-awash-gold-dark border border-primary/20 shadow-sm ${className || ""}`}
    >
      {children}
    </span>
  )
}

// ─── Countdown Pill ──────────────────────────────────────────────────

export function CountdownPill({
  time,
  urgent,
}: {
  time: { d: string; h: string; m: string; s: string }
  urgent: boolean
}) {
  return (
    <span
      className={`countdown-pill ${
        urgent
          ? "bg-primary/20 text-awash-gold border border-primary/30 animate-glow-pulse"
          : "bg-awash-blue/80 backdrop-blur-md text-white border border-white/10"
      }`}
    >
      {time.d !== "00" && <>{parseInt(time.d)}d </>}
      {time.h}:{time.m}:{time.s}
    </span>
  )
}

// ─── Savings Badge ───────────────────────────────────────────────────

export function SavingsBadge({ percent }: { percent: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1">
      <Zap className="size-3 text-emerald-600" />
      <span className="text-[10px] font-bold text-emerald-600">{percent}% off</span>
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  gold,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  action?: ReactNode
  gold?: boolean
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={`flex size-11 items-center justify-center rounded-xl backdrop-blur-sm border ${
              gold
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-awash-blue/10 border-awash-blue/20 text-awash-blue"
            }`}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h2
            className={`font-display text-xl font-extrabold tracking-tight ${
              gold ? "text-gradient-gold" : "text-foreground"
            }`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs font-medium text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

// ─── Winner Badge ────────────────────────────────────────────────────

export function WinnerBadge({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-awash-gold/15 to-awash-gold-light/10 backdrop-blur-sm px-4 py-2 text-sm font-bold text-awash-gold-dark border border-primary/20 shadow-sm hover:shadow-gold-glow transition-all duration-300">
      <Trophy className="size-4 text-awash-gold" />
      <span>{name}</span>
      <span className="text-neutral-400">·</span>
      <span className="tabular-nums">{amount}</span>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={`h-px bg-border ${className || ""}`} />
}

// ─── Tab Item ────────────────────────────────────────────────────────

export function TabItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`tab-item flex flex-col items-center justify-center gap-1 px-3 py-2 text-[10px] font-medium transition-all duration-300 ${
        active
          ? "text-primary"
          : "text-neutral-400 hover:text-neutral-600"
      }`}
    >
      <Icon
        className={`size-5 transition-colors duration-300 ${
          active ? "text-primary" : "text-neutral-400"
        }`}
      />
      <span className="leading-none">{label}</span>
    </button>
  )
}

// ─── Bottom Tab Bar ──────────────────────────────────────────────────

export function BottomTabBar({
  items,
  activeTab,
  onTabChange,
}: {
  items: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }>
  activeTab?: string
  onTabChange?: (id: string) => void
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[88px] items-start justify-around border-t border-border bg-white pt-2 pb-safe-area-bottom shadow-[0_-4px_20px_rgba(0,43,92,0.06)]">
      {items.map((item) => {
        const isActive = item.id === activeTab
        return (
          <TabItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={isActive}
            onClick={() => onTabChange?.(item.id)}
          />
        )
      })}
    </nav>
  )
}

// ─── Confetti Overlay ────────────────────────────────────────────────

export function ConfettiOverlay({ show }: { show: boolean }) {
  if (!show) return null
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${0.6 + Math.random() * 0.6}s`,
    color: i % 3 === 0 ? "#C8A642" : i % 3 === 1 ? "#002B5C" : "#D4B85E",
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute size-2 rounded-sm"
          style={{
            left: p.left,
            top: "-10px",
            backgroundColor: p.color,
            animation: `confetti ${p.duration} ${p.delay} ease-out forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Hero Slide (for live auction carousel) ──────────────────────────

export function HeroSlide({
  image,
  title,
  price,
  timeLeft,
  urgent,
  onJoin,
}: {
  image?: string
  title: string
  price: string
  timeLeft: string
  urgent?: boolean
  onJoin?: () => void
}) {
  return (
    <div className="auction-hero-slide group cursor-pointer relative h-[240px] flex-shrink-0 w-[320px]">
      {image ? (
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224]" />
      )}
      <div className="absolute inset-0 auction-hero-content" />
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-awash-blue/70 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white border border-white/10">
            <Gavel className="size-3" />
            Live Auction
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-3.5 py-1.5 text-sm font-bold tabular-nums border ${
              urgent
                ? "bg-primary/20 text-primary border-primary/30 animate-glow-pulse"
                : "bg-white/70 text-awash-blue border-white/20"
            }`}
          >
            {timeLeft}
          </span>
        </div>
        <div className="translate-y-0 transition-transform duration-300 group-hover:-translate-y-1">
          <h3 className="text-white font-display text-xl font-extrabold drop-shadow-lg mb-1">
            {title}
          </h3>
          <p className="text-white/80 text-sm font-semibold mb-3 drop-shadow">{price}</p>
          <button
            onClick={onJoin}
            className="auction-hero-btn relative overflow-hidden"
          >
            <span className="relative z-10">Join Auction</span>
          </button>
        </div>
      </div>
    </div>
  )
}

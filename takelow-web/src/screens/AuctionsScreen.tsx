import { useMemo, useState, useCallback, useEffect } from "react"
import { Flame, TicketCheck, ShieldCheck, Trophy, Sparkles, PiggyBank, Zap, ImageIcon, RefreshCw, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, Badge } from "../components/AuctionUI"
import { useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB, formatCountdown, type Auction } from "../mockDataV0"

function AuctionImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false)
  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      {err || !src ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted gap-1">
          <ImageIcon className="size-6 text-muted-foreground/40" />
          <span className="text-[9px] font-medium text-muted-foreground/30">{alt}</span>
        </div>
      ) : (
        <img src={src} alt={alt} onError={() => setErr(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      )}
    </div>
  )
}

function TimePill({ seconds, endingSoon }: { seconds: number; endingSoon: boolean }) {
  const t = useCountdown(seconds)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = endingSoon || (t > 0 && t < 3600)
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums transition-all ${
      urgent
        ? "bg-primary/15 text-primary"
        : "bg-navy text-white"
    }`}>
      {d !== "00" && <>{parseInt(d)}d </>}{h}:{m}:{s}
    </span>
  )
}

function AuctionCard({ auction, onOpen }: { auction: Auction; onOpen: () => void }) {
  const endingSoon = auction.status === "ending-soon"
  const savings = Math.round((1 - auction.bidFee / auction.marketPrice) * 100)
  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0
  return (
    <button onClick={onOpen} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        <AuctionImage src={auction.images?.[0]} alt={auction.name} className="h-full w-full" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {endingSoon ? (
            <Badge tone="orange"><Flame className="size-3" /> Ending Soon</Badge>
          ) : (
            <Badge tone="green">Live</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-navy">
          {auction.totalBids || auction.bidders} bids
        </span>
      </div>
      {auction.maxBid && (
        <div className="px-3 pt-2">
          <div className="flex justify-between mb-0.5">
            <span className="text-[9px] font-semibold text-muted-foreground">Bids</span>
            <span className="text-[9px] font-semibold text-muted-foreground">{auction.totalBids || auction.bidders}/{auction.maxBid}</span>
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#F27A18" : "#10B981" }} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 p-3 pt-2">
        <h3 className="truncate font-display text-sm font-bold text-navy">{auction.name}</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground line-through">{CURRENCY} {formatETB(auction.marketPrice)}</p>
            <p className="font-display text-base font-extrabold text-primary">{CURRENCY} {formatETB(auction.bidFee)} <span className="text-[10px] font-semibold text-muted-foreground">bid</span></p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1">
            <Zap className="size-3 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-600">{savings}% off</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="aspect-[4/3] w-full bg-gradient-to-r from-secondary via-muted to-secondary animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gradient-to-r from-secondary via-muted to-secondary animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-gradient-to-r from-secondary via-muted to-secondary animate-pulse" />
      </div>
    </div>
  )
}

const loveItems = [
  { icon: Trophy, label: "Win premium products for the lowest price" },
  { icon: ShieldCheck, label: "Fair & transparent — lowest unique bid wins" },
  { icon: Sparkles, label: "Simple, secure and trusted payments" },
  { icon: PiggyBank, label: "Big savings, big rewards" },
]

export function AuctionsScreen() {
  const { go, selectAuction, myBids, auctions, auctionsLoading, refreshAuctions } = useApp()
  const [category, setCategory] = useState("All")

  const categories = useMemo(() => ["All", ...Array.from(new Set(auctions.map((a) => a.category)))], [auctions])
  const filtered = useMemo(() => {
    const unique = Array.from(new Map(auctions.map((a) => [a.id, a])).values())
    return category === "All" ? unique : unique.filter((a) => a.category === category)
  }, [category, auctions])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
        <AppBar
          title="Live Auctions"
          onBack={() => go("home")}
          right={
            <button onClick={() => go("my-bids")} aria-label="My bids" className="relative flex size-8 items-center justify-center rounded-full text-navy-foreground hover:bg-white/10">
              <TicketCheck className="size-5" />
              {myBids.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{myBids.length}</span>
              )}
            </button>
          }
        />
      </div>
      <div className="flex-1 px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold text-navy">Reverse Auctions</h2>
            <p className="text-xs font-medium text-muted-foreground">Lowest unique bid wins. Bid low, be unique!</p>
          </div>
          <Badge tone="green">
            <span className="size-1.5 rounded-full bg-emerald-500" /> {auctions.length} Live
          </Badge>
        </div>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const active = c === category
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card text-muted-foreground hover:border-navy/40"}`}>
                {c}
              </button>
            )
          })}
        </div>
        {auctionsLoading && auctions.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((a) => (
                <AuctionCard key={a.id} auction={a} onOpen={() => selectAuction(a.id)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <ImageIcon className="size-8 opacity-30" />
                <p className="text-sm font-medium">No auctions in this category</p>
                <button onClick={() => setCategory("All")} className="text-xs font-semibold text-primary">View all categories</button>
              </div>
            )}
          </>
        )}
        <div className="mt-6 rounded-2xl border border-border bg-gradient-to-br from-secondary/80 to-card p-4">
          <h3 className="mb-3 font-display text-sm font-bold text-navy">Why customers love it</h3>
          <ul className="flex flex-col gap-2.5">
            {loveItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><item.icon className="size-4" /></span>
                <span className="text-xs font-medium text-navy/80">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

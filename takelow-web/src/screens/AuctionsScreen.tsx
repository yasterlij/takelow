import { useMemo, useState } from "react"
import { Clock, Users, Flame, ChevronRight, TicketCheck, ShieldCheck, Trophy, Sparkles, PiggyBank } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, Badge } from "../components/AuctionUI"
import { useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB, formatCountdown, type Auction } from "../mockDataV0"

function TimePill({ seconds, endingSoon }: { seconds: number; endingSoon: boolean }) {
  const t = useCountdown(seconds)
  const { h, m, s } = formatCountdown(t)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${endingSoon ? "bg-primary/15 text-primary" : "bg-navy/10 text-navy"}`}
    >
      <Clock className="size-3" />
      {h}:{m}:{s}
    </span>
  )
}

function AuctionRow({ auction, onOpen }: { auction: Auction; onOpen: () => void }) {
  const endingSoon = auction.status === "ending-soon"
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex size-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
        <img
          src={auction.image || "/placeholder.svg"}
          alt={auction.name}
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-display text-sm font-bold text-navy">{auction.name}</h3>
          {endingSoon && (
            <Badge tone="orange">
              <Flame className="size-3" />
              Hot
            </Badge>
          )}
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          Market: {CURRENCY} {formatETB(auction.marketPrice)}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Users className="size-3" />
            {auction.bidders} bidders
          </span>
        </div>
      </div>
      <ChevronRight className="size-4 flex-shrink-0 text-muted-foreground" />
    </button>
  )
}

const loveItems = [
  { icon: Trophy, label: "Win premium products for the lowest price" },
  { icon: ShieldCheck, label: "Fair & transparent — lowest unique bid wins" },
  { icon: Sparkles, label: "Simple, secure and trusted payments" },
  { icon: PiggyBank, label: "Big savings, big rewards" },
]

export function AuctionsScreen() {
  const { go, selectAuction, myBids, auctions } = useApp()
  const [category, setCategory] = useState("All")

  const categories = useMemo(() => ["All", ...Array.from(new Set(auctions.map((a) => a.category)))], [])
  const filtered = useMemo(
    () => (category === "All" ? auctions : auctions.filter((a) => a.category === category)),
    [category],
  )

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
        <AppBar
          title="Live Auctions"
          onBack={() => go("home")}
          right={
            <button
              onClick={() => go("my-bids")}
              aria-label="My bids"
              className="relative flex size-8 items-center justify-center rounded-full text-navy-foreground hover:bg-white/10"
            >
              <TicketCheck className="size-5" />
              {myBids.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {myBids.length}
                </span>
              )}
            </button>
          }
        />
      </div>
      <div className="flex-1 px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold text-navy">Reverse Auctions</h2>
            <p className="text-xs font-medium text-muted-foreground">
              Lowest unique bid wins. Bid low, be unique!
            </p>
          </div>
          <Badge tone="green">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {auctions.length} Live
          </Badge>
        </div>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "border-navy bg-navy text-navy-foreground" : "border-border bg-card text-muted-foreground hover:border-navy/40"}`}
              >
                {c}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <AuctionRow key={a.id} auction={a} onOpen={() => selectAuction(a.id)} />
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/60 p-4">
          <h3 className="mb-3 font-display text-sm font-bold text-navy">Why customers love it</h3>
          <ul className="flex flex-col gap-2.5">
            {loveItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-4" />
                </span>
                <span className="text-xs font-medium text-navy/80">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

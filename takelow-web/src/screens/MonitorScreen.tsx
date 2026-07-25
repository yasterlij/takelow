import { useEffect, useState } from "react"
import { Bell, Users, Radio, Eye, TrendingDown, Trophy } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { Countdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"

export function MonitorScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)

  const [seconds, setSeconds] = useState(auction?.timeLeft ?? 130)
  const [bidCount, setBidCount] = useState(auction?.totalBids || auction?.bidders || 0)

  useEffect(() => {
    setSeconds(auction?.timeLeft ?? 130)
    setBidCount(auction?.totalBids || auction?.bidders || 0)
  }, [auction])

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])



  useEffect(() => {
    if (seconds <= 0) {
      const t = setTimeout(() => go("closed"), 1200)
      return () => clearTimeout(t)
    }
  }, [seconds, go])

  if (!auction) return null

  const endingSoon = seconds <= 60
  const bidProgress = auction.maxBid ? Math.min(bidCount / auction.maxBid, 1) : 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      
      <AppBar title="Auction in Progress" onBack={() => go("bid-confirmed")} />
      <div className="flex-1 px-5 pb-6 pt-5">
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 animate-pulse">
            <Radio className="size-3.5" /> LIVE
          </span>
        </div>

        <Card className="mt-4 items-center p-5 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-secondary">
            <img src={auction.images?.[0] || "/placeholder.svg"} alt={auction.name} loading="lazy" decoding="async" className="h-20 w-auto object-contain" />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold text-navy">{auction.name}</h2>
          <span className="text-xs font-medium text-muted-foreground">Time Left</span>
          <div className="mt-2 flex justify-center"><Countdown seconds={seconds} size="lg" /></div>

        </Card>

        {auction.maxBid && (
          <div className="mt-3 px-1">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground">Total bids: {bidCount}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Capacity: {auction.maxBid}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#F27A18" : "#10B981" }} />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="items-center p-4 text-center">
            <Users className="mx-auto size-5 text-navy" />
            <p className="mt-1 font-display text-2xl font-extrabold text-navy tabular-nums">{bidCount}</p>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Bids</span>
          </Card>
          <Card className="items-center p-4 text-center">
            <Users className="mx-auto size-5 text-primary" />
            <p className="mt-1 font-display text-2xl font-extrabold text-primary tabular-nums">{auction.uniqueBidders || auction.bidders}</p>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bidders</span>
          </Card>
          <Card className="items-center p-4 text-center">
            <TrendingDown className="mx-auto size-5 text-emerald-600" />
            <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 tabular-nums">{formatETB(userBid ?? 0)}</p>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your Bid</span>
          </Card>
        </div>

        {endingSoon && (
          <Card className="mt-4 flex items-center gap-3 border-primary/40 bg-accent p-4">
            <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse">
              <Bell className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-primary">Auction Ending Soon!</p>
              <p className="text-xs font-medium text-navy/70">{auction.name} is about to close. Stay tuned!</p>
            </div>
          </Card>
        )}

        {auction.minBid && bidCount < auction.minBid && (
          <Card className="mt-3 flex items-center gap-2 border-amber-200 bg-amber-50 p-3">
            <Bell className="size-4 text-amber-600 flex-shrink-0" />
            <p className="text-[11px] font-medium text-amber-800">
              Only {bidCount}/{auction.minBid} bids — may extend if under minimum
            </p>
          </Card>
        )}

        <p className="mt-4 text-center text-xs font-medium text-navy/60">
          Keep watching — you might be the lowest unique bidder!
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton variant="navy" onClick={() => go("closed")}>
          <Eye className="size-[18px]" /> View Result Now
        </CTAButton>
      </div>
    </div>
  )
}

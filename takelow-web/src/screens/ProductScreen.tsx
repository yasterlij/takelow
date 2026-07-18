import { Users, Tag, Ticket, CheckCircle2, TrendingDown } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card, Badge } from "../components/AuctionUI"
import { Countdown, useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)

  if (!auction) return null

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Product Details" onBack={() => go("auctions")} />
      <div className="flex-1 pb-28">
        <div className="flex items-center justify-center bg-secondary px-6 py-6">
          <img
            src={auction.image || "/placeholder.svg"}
            alt={auction.name}
            className="h-52 w-auto object-contain"
          />
        </div>
        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="navy">{auction.category}</Badge>
              <h1 className="mt-2 font-display text-xl font-extrabold text-navy text-balance">
                {auction.name}
              </h1>
            </div>
            <Badge tone="green">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </Badge>
          </div>
          <Card className="mt-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Time Left
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Users className="size-3.5" />
                {auction.bidders} bidders
              </span>
            </div>
            <div className="mt-3 flex justify-center">
              <Countdown seconds={seconds} size="md" />
            </div>
          </Card>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card className="p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Tag className="size-3.5" /> Market Price
              </span>
              <p className="mt-1 font-display text-lg font-extrabold text-navy">
                {CURRENCY} {formatETB(auction.marketPrice)}
              </p>
            </Card>
            <Card className="border-primary/30 bg-accent p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                <Ticket className="size-3.5" /> Bid Fee
              </span>
              <p className="mt-1 font-display text-lg font-extrabold text-primary">
                {CURRENCY} {formatETB(auction.bidFee)}
              </p>
            </Card>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-navy/5 p-3">
            <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-primary" />
            <p className="text-xs font-medium leading-relaxed text-navy/80">
              Place the <span className="font-bold">lowest unique bid</span> — the smallest amount
              that no one else has chosen — to win this product.
            </p>
          </div>
          <div className="mt-5">
            <h2 className="font-display text-sm font-bold text-navy">About this product</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {auction.description}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {auction.highlights.map((h) => (
              <div key={h} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                <span className="text-xs font-semibold text-navy">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => go("pay-fee")}>
          Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
        </CTAButton>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Sparkles, TrendingDown, CheckCircle2, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY } from "../mockDataV0"

export function PlaceBidScreen() {
  const { go, selectedId, submitBid, getAuction, authError } = useApp()
  const auction = getAuction(selectedId)
  const [amountStr, setAmountStr] = useState("")
  const [loading, setLoading] = useState(false)

  if (!auction) return null

  const amount = parseFloat(amountStr || "0")
  const valid = amount > 0 && !loading

  const handleSubmit = async () => {
    if (!valid) return
    setLoading(true)
    try {
      await submitBid(amount)
    } finally {
      setLoading(false)
    }
  }

  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      
      <AppBar title="Place Your Bid" onBack={() => go("pay-fee")} />
      <div className="flex-1 px-5 pb-6 pt-5">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3">
          <CheckCircle2 className="size-[18px] flex-shrink-0 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700">Bid fee paid. You&apos;re in the auction for {auction.name}!</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {auction.maxBid && (
            <span className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary">Max {auction.maxBid} bids</span>
          )}
          {auction.minBid && (
            <span className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary">Min {auction.minBid} bids</span>
          )}

        </div>

        {auction.maxBid && (
          <div className="mt-3 rounded-lg border border-border bg-card p-2.5">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground">Total bids: {auction.totalBids || auction.bidders}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Capacity: {auction.maxBid}</span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#F27A18" : "#10B981" }} />
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <h2 className="font-display text-lg font-extrabold text-navy">Enter your bid amount</h2>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-muted-foreground">Your bid must be a unique lowest amount to win.</p>
        </div>

        <Card className="mt-5 p-5">
          <div className="flex items-end justify-center gap-2">
            <input
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1").slice(0, 8))}
              inputMode="numeric"
              aria-label="Bid amount"
              className="w-40 rounded-xl border-2 border-border bg-secondary px-3 py-3 text-center font-display text-4xl font-extrabold text-navy outline-none focus:border-primary tabular-nums"
            />
            <span className="pb-4 text-sm font-bold text-muted-foreground">{CURRENCY}</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2">
            <TrendingDown className="size-4 text-primary" />
            <span className="text-xs font-semibold text-accent-foreground">Lower & unique = better chance to win</span>
          </div>
        </Card>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-navy/5 p-3">
          <Sparkles className="mt-0.5 size-[18px] flex-shrink-0 text-primary" />
          <p className="text-xs font-medium leading-relaxed text-navy/80">
            The winner is the person with the <span className="font-bold">lowest bid that nobody else picked</span>. Choose an unexpected amount!
          </p>
        </div>

        {authError && (
          <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-center">
            <p className="text-xs font-semibold text-destructive">{authError}</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton disabled={!valid} onClick={handleSubmit}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting...</> : "Submit Bid"}
        </CTAButton>
      </div>
    </div>
  )
}

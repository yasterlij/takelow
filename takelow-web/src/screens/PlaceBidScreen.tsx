import { useState } from "react"
import { Sparkles, TrendingDown, CheckCircle2 } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY } from "../mockDataV0"

export function PlaceBidScreen() {
  const { go, selectedId, submitBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [amountStr, setAmountStr] = useState("235")

  if (!auction) return null

  const amount = Number.parseInt(amountStr || "0", 10)
  const valid = amount > 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Place Your Bid" onBack={() => go("pay-fee")} />
      <div className="flex-1 px-5 pb-28 pt-5">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3">
          <CheckCircle2 className="size-[18px] flex-shrink-0 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700">
            Bid fee paid. You&apos;re in the auction for {auction.name}!
          </p>
        </div>
        <div className="mt-6 text-center">
          <h2 className="font-display text-lg font-extrabold text-navy">Enter your bid amount</h2>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-muted-foreground">
            Your bid must be a unique lowest amount to win.
          </p>
        </div>
        <Card className="mt-5 p-5">
          <div className="flex items-end justify-center gap-2">
            <input
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              aria-label="Bid amount"
              className="w-40 rounded-xl border-2 border-border bg-secondary px-3 py-3 text-center font-display text-4xl font-extrabold text-navy outline-none focus:border-primary tabular-nums"
            />
            <span className="pb-4 text-sm font-bold text-muted-foreground">{CURRENCY}</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2">
            <TrendingDown className="size-4 text-primary" />
            <span className="text-xs font-semibold text-accent-foreground">
              Lower &amp; unique = better chance to win
            </span>
          </div>
        </Card>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-navy/5 p-3">
          <Sparkles className="mt-0.5 size-[18px] flex-shrink-0 text-primary" />
          <p className="text-xs font-medium leading-relaxed text-navy/80">
            The winner is the person with the <span className="font-bold">lowest bid that nobody
            else picked</span>. Choose an unexpected amount!
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton disabled={!valid} onClick={() => submitBid(amount)}>
          Submit Bid
        </CTAButton>
      </div>
    </div>
  )
}

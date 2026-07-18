import { Wallet, Clock, ShieldCheck } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { AwashMark } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PayWinningScreen() {
  const { go, selectedId, userBid, walletBalance, payWinning, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const amount = userBid ?? 0

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Pay Winning Amount" onBack={() => go("winner")} />
      <div className="flex-1 px-5 pb-28 pt-5">
        <div className="flex items-center gap-2 rounded-xl bg-accent p-3">
          <Clock className="size-[18px] flex-shrink-0 text-primary" />
          <p className="text-xs font-semibold text-navy/80">
            Complete payment within <span className="font-bold">24 hours</span> to claim your prize.
          </p>
        </div>
        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Winning Bid
          </span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy tabular-nums">
            {formatETB(amount)} {CURRENCY}
          </p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">
            for {auction.name}
          </span>
        </Card>
        <h2 className="mb-2 mt-6 font-display text-sm font-bold text-navy">Pay with</h2>
        <Card className="flex items-center gap-3 border-primary/40 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-navy">
            <AwashMark className="size-8" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-navy">Awash Bank Mobile Money</p>
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3.5" /> Balance: {CURRENCY} {formatETB(walletBalance)}
            </p>
          </div>
          <span className="size-4 rounded-full border-4 border-primary" />
        </Card>
        <Card className="mt-4 p-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Winning amount</span>
            <span className="font-semibold text-navy">
              {CURRENCY} {formatETB(amount)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-semibold text-emerald-600">Free</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="text-sm font-bold text-navy">Total</span>
            <span className="font-display text-sm font-extrabold text-primary">
              {CURRENCY} {formatETB(amount)}
            </span>
          </div>
        </Card>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secured by Awash Bank
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => payWinning(amount)}>
          Pay {CURRENCY} {formatETB(amount)} Now
        </CTAButton>
      </div>
    </div>
  )
}

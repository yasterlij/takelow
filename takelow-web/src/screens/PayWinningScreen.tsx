import { Clock, ShieldCheck, ExternalLink } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PayWinningScreen() {
  const { go, selectedId, userBid, payWinning, getAuction, authError } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const amount = userBid ?? 0
  const deadline = (auction as any).payment_deadline ? new Date((auction as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : 24
  const deadlineMins = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000)) : 1440
  const urgent = deadlineHrs < 6

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
      <AppBar title="Pay Winning Amount" onBack={() => go("winner")} />
      <div className="flex-1 px-5 pb-28 pt-5">
        <div className={`flex items-center gap-2 rounded-xl p-3 ${urgent ? "bg-red-50 border border-red-200" : "bg-accent"}`}>
          <Clock className={`size-[18px] flex-shrink-0 ${urgent ? "text-red-500" : "text-primary"}`} />
          <p className={`text-xs font-semibold ${urgent ? "text-red-700" : "text-navy/80"}`}>
            {deadlineHrs > 0
              ? `Complete payment within ${deadlineHrs}h ${deadlineMins % 60}m to claim your prize.`
              : "Less than an hour remaining! Pay now to claim your prize."}
          </p>
        </div>
        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Winning Bid</span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy tabular-nums">{formatETB(amount)} {CURRENCY}</p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">for {auction.name}</span>
        </Card>

        <Card className="mt-4 p-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Winning amount</span>
            <span className="font-semibold text-navy">{CURRENCY} {formatETB(amount)}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-semibold text-emerald-600">Free</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="text-sm font-bold text-navy">Total</span>
            <span className="font-display text-sm font-extrabold text-primary">{CURRENCY} {formatETB(amount)}</span>
          </div>
        </Card>

        <div className="mt-4 rounded-xl bg-accent p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-navy">SikinaPay Checkout</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                You will be redirected to SikinaPay's secure hosted checkout to complete payment via Mobile Money, USSD, or card.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secured by SikinaPay
        </div>

        {authError && (
          <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-center">
            <p className="text-xs font-semibold text-destructive">{authError}</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => payWinning(amount)}>
          <ExternalLink className="size-[18px]" /> Pay with SikinaPay
        </CTAButton>
      </div>
    </div>
  )
}

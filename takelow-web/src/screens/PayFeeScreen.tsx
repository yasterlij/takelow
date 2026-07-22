import { useState } from "react"
import { ShieldCheck, Info, Loader2, CreditCard } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PayFeeScreen() {
  const { go, payFee, getAuction, selectedId, authError } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const [loading, setLoading] = useState(false)

  const handlePayClick = async () => {
    setLoading(true)
    try {
      await payFee(auction.bidFee)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
      <AppBar title="Pay Bid Fee" onBack={() => go("product")} />
      <div className="flex-1 px-5 pb-28 pt-5">
        <p className="text-sm font-medium text-muted-foreground">
          Pay the non-refundable participation fee to enter this auction.
        </p>
        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bid Fee</span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy">{CURRENCY} {formatETB(auction.bidFee)}</p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">for {auction.name}</span>
        </Card>
        <h2 className="mb-2 mt-6 font-display text-sm font-bold text-navy">Pay with</h2>
        <Card className="flex items-center gap-3 border-primary/40 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-navy">
            <CreditCard className="size-6 text-white" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-navy">SikinaPay</p>
            <p className="text-xs font-medium text-muted-foreground">
              Secure payment via SikinaPay gateway
            </p>
          </div>
          <span className="size-4 rounded-full border-4 border-primary" />
        </Card>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-navy/5 p-3">
          <Info className="mt-0.5 size-4 flex-shrink-0 text-navy/60" />
          <p className="text-xs font-medium leading-relaxed text-navy/70">
            The bid fee is non-refundable and confirms your participation. After payment, you will be able to place your unique bid.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secured by SikinaPay
        </div>
        {authError && (
          <p className="mt-4 text-center text-xs font-semibold text-destructive">{authError}</p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={handlePayClick} disabled={loading}>
          {loading ? <Loader2 className="size-[18px] animate-spin" /> : <CreditCard className="size-[18px]" />}
          {" "}Pay {CURRENCY} {formatETB(auction.bidFee)} with SikinaPay
        </CTAButton>
      </div>
    </div>
  )
}

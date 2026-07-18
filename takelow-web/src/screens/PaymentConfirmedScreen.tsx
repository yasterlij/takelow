import { Check, Download, Truck } from "lucide-react"
import { useApp } from "../AppContext"
import { PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PaymentConfirmedScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const ref = "AWB" + Math.floor(100000 + Math.random() * 899999)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-28 pt-10 text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Check className="size-10" strokeWidth={3} />
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Payment Successful!</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
          Thank you. Your payment of{" "}
          <span className="font-bold text-navy">
            {formatETB(userBid ?? 0)} {CURRENCY}
          </span>{" "}
          was successful.
        </p>
        <Card className="mt-6 w-full max-w-xs p-5 text-left">
          <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
            <span className="font-display text-sm font-bold text-navy">Digital Receipt</span>
            <span className="text-[11px] font-semibold text-emerald-600">PAID</span>
          </div>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-semibold text-navy">{ref}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Product</dt>
              <dd className="font-semibold text-navy">{auction.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-semibold text-navy">
                {CURRENCY} {formatETB(userBid ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid via</dt>
              <dd className="font-semibold text-navy">Mobile Money</dd>
            </div>
          </dl>
          <button className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-bold text-navy hover:bg-muted">
            <Download className="size-3.5" /> Download Receipt
          </button>
        </Card>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => go("delivery")}>
          <Truck className="size-[18px]" /> Track Delivery
        </CTAButton>
      </div>
    </div>
  )
}

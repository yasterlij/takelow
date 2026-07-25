import { Check, Eye, Home, MessageSquareText, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function BidConfirmedScreen() {
  const { go, selectedId, userBid, bidTicketNumber, getAuction, user } = useApp()
  const isAdmin = user?.role === "admin"
  const auction = getAuction(selectedId)
  if (!auction) return null

  const smsMessage = bidTicketNumber
    ? `Your bid of ${formatETB(userBid ?? 0)} ETB on '${auction.name}' has been placed successfully. Your BID ticket number is: ${bidTicketNumber}`
    : null

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-awash-blue">Bid Submitted</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Check className="size-10" strokeWidth={3} />
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">
          Bid Submitted Successfully!
        </h1>
        {smsMessage && (
          <div className="mt-4 flex w-full max-w-xs items-start gap-2.5 rounded-xl bg-blue-50 p-3 text-left">
            <MessageSquareText className="mt-0.5 size-4 flex-shrink-0 text-blue-600" />
            <p className="text-xs font-medium leading-relaxed text-blue-800">
              {smsMessage}
            </p>
          </div>
        )}
        <Card className="mt-4 w-full max-w-xs p-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your Bid
          </span>
          <p className="mt-1 font-display text-4xl font-extrabold text-primary tabular-nums">
            {formatETB(userBid ?? 0)} {CURRENCY}
          </p>
          <div className="mt-4 border-t border-border pt-3 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Product</span>
              <span className="font-semibold text-navy">{auction.name}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-emerald-600">Recorded</span>
            </div>
            {bidTicketNumber && (
              <div className="mt-1.5 flex justify-between text-xs">
                <span className="text-muted-foreground">Ticket</span>
                <span className="font-mono text-[11px] font-bold text-navy">{bidTicketNumber}</span>
              </div>
            )}
          </div>
        </Card>
        <p className="mt-5 max-w-xs text-xs font-medium text-navy/70">
          Keep watching — you might be the lowest unique bidder!
        </p>
      </div>
      <div className="border-t border-border bg-card p-4">
        {isAdmin ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => go("auctions")}
              className="btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-bold shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30 hover:shadow-amber-500/40"
            >
              <Home className="size-[18px]" /> Back to Auctions
            </button>
            <CTAButton variant="navy" onClick={() => go("monitor")}>
              <Eye className="size-[18px]" /> Monitor Auction
            </CTAButton>
          </div>
        ) : (
          <CTAButton variant="outline" onClick={() => go("auctions")}>
            <Home className="size-[18px]" /> Back to Auctions
          </CTAButton>
        )}
      </div>
    </div>
  )
}

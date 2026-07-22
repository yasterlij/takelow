import { Check, Eye, Home, MessageSquareText } from "lucide-react"
import { useApp } from "../AppContext"
import { PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
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
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
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
          <CTAButton variant="navy" onClick={() => go("monitor")}>
            <Eye className="size-[18px]" /> Monitor Auction
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onClick={() => go("auctions")}>
            <Home className="size-[18px]" /> Back to Auctions
          </CTAButton>
        )}
      </div>
    </div>
  )
}

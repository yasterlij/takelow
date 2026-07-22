import { Gavel, Clock, TicketCheck, Trophy, ChevronRight, Hash } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, Badge, CTAButton } from "../components/AuctionUI"
import { useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB, formatCountdown } from "../mockDataV0"

function TimeLeft({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const { h, m, s } = formatCountdown(t)
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-navy">
      <Clock className="size-3" />
      {h}:{m}:{s} left
    </span>
  )
}

export function MyBidsScreen() {
  const { go, myBids, selectAuction, getAuction } = useApp()

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
        <AppBar title="My Bids" onBack={() => go("auctions")} />
      </div>
      <div className="flex-1 px-4 pb-8 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold text-navy">Your Active Bids</h2>
            <p className="text-xs font-medium text-muted-foreground">
              Track every auction you&apos;ve entered.
            </p>
          </div>
          <Badge tone="navy">
            <TicketCheck className="size-3" />
            {myBids.length} placed
          </Badge>
        </div>
        {myBids.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-navy">
              <Gavel className="size-7" />
            </span>
            <p className="font-display text-sm font-bold text-navy">No bids yet</p>
            <p className="text-xs text-muted-foreground">
              Browse the live auctions and place your first unique lowest bid.
            </p>
            <CTAButton onClick={() => go("auctions")} className="mt-2 w-auto px-6">
              Browse Auctions
            </CTAButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myBids.map((bid) => {
              const auction = getAuction(bid.auctionId)
              if (!auction) return null
              return (
                <button
                  key={`${bid.auctionId}-${bid.placedAt}`}
                  onClick={() => selectAuction(bid.auctionId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                    <img
                      src={auction.images?.[0] || "/placeholder.svg"}
                      alt={auction.name}
                      className="h-full w-full object-contain p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-navy">{auction.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">Your bid</span>
                      <span className="font-display text-sm font-extrabold text-primary tabular-nums">
                        {CURRENCY} {formatETB(bid.amount)}
                      </span>
                    </div>
                    {bid.ticketNumber && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <Hash className="size-2.5 text-muted-foreground" />
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                          {bid.ticketNumber}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <TimeLeft seconds={auction.timeLeft} />
                      <Badge tone="green">
                        <Trophy className="size-3" />
                        In the running
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="size-4 flex-shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

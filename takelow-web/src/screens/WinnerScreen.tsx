import { Trophy, PartyPopper } from "lucide-react"
import { useApp } from "../AppContext"
import { PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function WinnerScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  const savings = auction.marketPrice - (userBid ?? 0)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-gradient-to-b from-navy to-[#141d47]">
        <PhoneStatusBar dark />
      </div>
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-[#141d47] to-card px-6 pb-28 pt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
          <PartyPopper className="size-3.5" /> Winner Announced
        </span>
        <div className="relative mt-6">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40">
            <Trophy className="size-12" />
          </span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-navy-foreground">
          Congratulations!
        </h1>
        <p className="mt-2 text-sm font-medium text-navy-foreground/70">
          You placed the lowest unique bid and won!
        </p>
        <Card className="mt-6 w-full max-w-xs p-5">
          <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-secondary">
            <img
              src={auction.image || "/placeholder.svg"}
              alt={auction.name}
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="mt-3 font-display text-base font-bold text-navy">{auction.name}</h2>
          <div className="mt-4 rounded-xl bg-accent p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
              Winning Bid
            </p>
            <p className="font-display text-3xl font-extrabold text-primary tabular-nums">
              {formatETB(userBid ?? 0)} {CURRENCY}
            </p>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-muted-foreground">Winner</span>
            <span className="font-semibold text-navy">Selam T. · 091332****</span>
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">You saved</span>
            <span className="font-bold text-emerald-600">
              {CURRENCY} {formatETB(savings)}
            </span>
          </div>
        </Card>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => go("pay-winning")}>Pay Winning Amount</CTAButton>
      </div>
    </div>
  )
}

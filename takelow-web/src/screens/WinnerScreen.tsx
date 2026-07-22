import { useEffect, useState } from "react"
import { Trophy, PartyPopper, Loader2, AlertTriangle, Users, Clock, CreditCard } from "lucide-react"
import { useApp } from "../AppContext"
import { PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { api, type ApiWinnerResult, type ApiAuctionResult } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function WinnerScreen() {
  const { go, selectedId, user, getAuction } = useApp()
  const isAdmin = user?.role === "admin"
  const auction = getAuction(selectedId)
  const [winner, setWinner] = useState<ApiWinnerResult | ApiAuctionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    const fetch = isAdmin ? api.drawWinner(selectedId) : api.getAuctionResult(selectedId)
    fetch
      .then(setWinner as any)
      .catch((e: any) => setError(e.message || "Failed to load winner"))
      .finally(() => setLoading(false))
  }, [selectedId, isAdmin])

  if (!auction) return null

  const savings = winner?.winning_bid_amount != null ? (auction.marketPrice - winner.winning_bid_amount) : 0
  const savingsPct = auction.marketPrice > 0 ? Math.round((savings / auction.marketPrice) * 100) : 0
  const winnerName = winner?.winner_name || (winner?.winner_user_id ? `User ${winner.winner_user_id.slice(0, 8)}` : null)
  const deadline = ((winner as any)?.payment_deadline) ? new Date((winner as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : null
  const allWinners = (winner as any)?.all_winners as Array<{ user_id: string; name?: string; amount: number }> | undefined
  const myBidInfo = (winner as any)?.my_bid as { amount: number; service_fee_paid: boolean } | undefined

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-gradient-to-b from-navy to-[#141d47]"><PhoneStatusBar dark /></div>
      <div className="flex flex-1 flex-col items-center bg-gradient-to-b from-[#141d47] to-card px-6 pb-28 pt-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
          <PartyPopper className="size-3.5" /> Winner Results
        </span>
        <div className="relative mt-6">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40">
            <Trophy className="size-12" />
          </span>
        </div>

        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-navy-foreground/70">Calculating winner...</p>
          </div>
        ) : error ? (
          <div className="mt-10 flex flex-col items-center gap-2">
            <AlertTriangle className="size-8 text-amber-400" />
            <p className="text-sm font-medium text-navy-foreground/70">{error}</p>
            <button onClick={() => go("home")} className="mt-2 text-xs font-semibold text-primary">Back to Dashboard</button>
          </div>
        ) : winner ? (
          <>
            <h1 className="mt-6 font-display text-3xl font-extrabold text-navy-foreground">
              {winner.winner_user_id ? "Winner Found!" : "No Winner"}
            </h1>
            <p className="mt-2 text-sm font-medium text-navy-foreground/70">
              {winner.winner_user_id
                ? `Lowest unique bid determined out of ${winner.total_bids} total bids.`
                : `No unique bids found among ${winner.total_bids} bids.`}
            </p>

            {winner.payment_status === "PAID" && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                <CreditCard className="size-3.5" /> Payment Complete
              </span>
            )}

            {winner.winner_user_id && (
              <Card className="mt-6 w-full max-w-xs p-5">
                <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-secondary">
                  <img src={auction.images?.[0] || "/placeholder.svg"} alt={auction.name} className="h-20 w-auto object-contain" />
                </div>
                <h2 className="mt-3 font-display text-base font-bold text-navy">{auction.name}</h2>
                <div className="mt-4 rounded-xl bg-accent p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">Winning Bid</p>
                  <p className="font-display text-3xl font-extrabold text-primary tabular-nums">{formatETB(winner.winning_bid_amount ?? 0)} {CURRENCY}</p>
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Bids</span>
                  <span className="font-semibold text-navy">{winner.total_bids}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">Unique Bidders</span>
                  <span className="font-semibold text-navy">{winner.unique_bidders}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">Winner</span>
                  <span className="font-bold text-navy">{winnerName || "Unknown"}</span>
                </div>
                {winner.lowest_unique_bid != null && (
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Lowest Unique Bid</span>
                    <span className="font-bold text-emerald-600">{CURRENCY} {formatETB(winner.lowest_unique_bid)}</span>
                  </div>
                )}
                {deadlineHrs != null && (
                  <div className="mt-1.5 flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" /> Payment Deadline</span>
                    <span className={`font-bold ${deadlineHrs < 6 ? "text-red-500" : "text-navy"}`}>
                      {deadlineHrs > 0 ? `${deadlineHrs}h remaining` : "Expired"}
                    </span>
                  </div>
                )}
                <div className="my-3 border-t border-border" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Market Price</span>
                  <span className="font-semibold text-muted-foreground line-through">{CURRENCY} {formatETB(auction.marketPrice)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount Saved</span>
                  <span className="font-bold text-emerald-600">{CURRENCY} {formatETB(savings)} ({savingsPct}%)</span>
                </div>
              </Card>
            )}

            {allWinners && allWinners.length > 1 && (
              <Card className="mt-4 w-full max-w-xs p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="size-3.5 text-primary" />
                  <h3 className="text-xs font-bold text-navy">All Winners ({allWinners.length})</h3>
                </div>
                {allWinners.map((w, i) => (
                  <div key={w.user_id} className={`flex items-center justify-between py-1.5 ${i > 0 ? "border-t border-border" : ""}`}>
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-primary">#{i + 1}</span>
                      <span className="text-muted-foreground">{w.name || w.user_id.slice(0, 8)}</span>
                    </span>
                    <span className="text-[11px] font-bold text-navy">{CURRENCY} {formatETB(w.amount)}</span>
                  </div>
                ))}
              </Card>
            )}

            {myBidInfo && (
              <Card className="mt-4 w-full max-w-xs p-4">
                <h3 className="mb-2 text-xs font-bold text-navy">Your Bid</h3>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">{CURRENCY} {formatETB(myBidInfo.amount)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Fee Paid</span>
                  <span className={`font-bold ${myBidInfo.service_fee_paid ? "text-emerald-600" : "text-red-500"}`}>{myBidInfo.service_fee_paid ? "Yes" : "No"}</span>
                </div>
              </Card>
            )}

            {"bids" in winner && winner.bids.length > 0 && (
              <Card className="mt-4 w-full max-w-xs p-4">
                <h3 className="mb-2 text-xs font-bold text-navy">All Bids ({winner.bids.length})</h3>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {winner.bids.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg bg-secondary/60 px-2.5 py-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{b.user_id.slice(0, 8)}...</span>
                      <span className="text-[11px] font-bold text-navy">{CURRENCY} {formatETB(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        {winner?.winner_user_id && (isAdmin || winner.winner_user_id === user?.id) ? (
          <CTAButton onClick={() => go("pay-winning")}>
            <CreditCard className="size-[18px]" /> {winner.payment_status === "PAID" ? "View Receipt" : "Process Payment"}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onClick={() => go("home")}>Back to Dashboard</CTAButton>
        )}
      </div>
    </div>
  )
}

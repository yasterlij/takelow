import { useEffect, useState } from "react"
import { Trophy, PartyPopper, Loader2, AlertTriangle, Users, Clock, CreditCard, ArrowLeft, MapPin, Info, CheckCircle2 } from "lucide-react"
import { useApp } from "../AppContext"
import { Card } from "../components/AuctionUI"
import { api, type ApiWinnerResult, type ApiAuctionResult, type ApiWinnerInfo, type ApiBid } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function WinnerScreen() {
  const { go, selectedId, user, getAuction } = useApp()
  const isAdmin = user?.role === "admin"
  const auction = getAuction(selectedId)
  const [winner, setWinner] = useState<ApiWinnerResult | ApiAuctionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    const fetch = isAdmin ? api.drawWinner(selectedId) : api.getAuctionResult(selectedId)
    fetch
      .then(setWinner as any)
      .catch((e: any) => setError(e.message || "Failed to load winner"))
      .finally(() => setLoading(false))
  }, [selectedId, isAdmin, refreshKey])

  if (!auction) return null

  const savings = winner?.winning_bid_amount != null ? (auction.marketPrice - winner.winning_bid_amount) : 0
  const savingsPct = auction.marketPrice > 0 ? Math.round((savings / auction.marketPrice) * 100) : 0
  const winnerName = winner?.winner_name || (winner?.winner_user_id ? `User ${winner.winner_user_id.slice(0, 8)}` : null)
  const winnerPhone = winner?.winner_phone || null
  const maskPhone = (p: string | null) => p ? p.slice(0, 4) + '****' + p.slice(-2) : null
  const deadline = ((winner as any)?.payment_deadline) ? new Date((winner as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : null
  const allWinners = (winner as any)?.all_winners as ApiWinnerInfo[] | undefined
  const winnersCount = (winner as any)?.winners_count as number | undefined
  const myBidInfo = (winner as any)?.my_bid as { amount: number; service_fee_paid: boolean } | undefined

  const isUserWinner = allWinners?.some((w) => w.user_id === user?.id)
  const userWinnerInfo = allWinners?.find((w) => w.user_id === user?.id)

  const allBids = (winner as any)?.bids as ApiBid[] | undefined
  const amountCount = new Map<number, number>()
  allBids?.forEach((b) => amountCount.set(b.amount, (amountCount.get(b.amount) || 0) + 1))
  const winningAmount = winner?.winning_bid_amount
  const lowerAmounts = winningAmount != null && allBids
    ? [...new Set(allBids.filter((b) => b.amount < winningAmount).map((b) => b.amount))].sort((a, b) => a - b)
    : []
  const lowerBidsGrouped = lowerAmounts.map((amount) => ({ amount, count: amountCount.get(amount) || 1 }))
  const [bidsPage, setBidsPage] = useState(0)
  const BIDS_PAGE_SIZE = 10
  const pagedBids = lowerBidsGrouped.slice(0, (bidsPage + 1) * BIDS_PAGE_SIZE)
  const hasMore = pagedBids.length < lowerBidsGrouped.length

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pb-16">
      {/* ── Back + Header ── */}
      <div className="flex w-full items-center justify-between">
        <button onClick={() => go("home")} className="flex size-10 items-center justify-center rounded-xl border border-border bg-white text-awash-blue hover:bg-neutral-50 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
          <PartyPopper className="size-3.5" /> Winner Results
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-neutral-500">Calculating winners...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <AlertTriangle className="size-10 text-amber-400" />
          <p className="text-sm font-medium text-neutral-500">{error}</p>
          <button onClick={() => go("home")} className="text-sm font-semibold text-primary">Back to Dashboard</button>
        </div>
      ) : winner ? (
        <div className="flex w-full max-w-2xl flex-col items-center">
          {/* ── Trophy ── */}
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <span className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-awash-gold-light text-primary-foreground shadow-xl shadow-primary/40">
              <Trophy className="size-14" />
            </span>
          </div>

          <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">{winner.winner_user_id ? "Winner Found!" : "No Winner"}</h1>
          <p className="mt-2 text-sm font-medium text-neutral-500">
            {winner.winner_user_id
              ? `${winnersCount || 1} winner(s) from ${winner.total_bids} bids`
              : `No unique bids among ${winner.total_bids} bids.`}
          </p>

          {winner?.payment_status === "PAID" && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CreditCard className="size-3.5" /> All Payments Complete
            </span>
          )}

          {/* ── Winner Card ── */}
          {winner?.winner_user_id && (
            <div className="mt-6 w-full max-w-md">
              <Card className="p-6 border-primary/10">
                <div className="mx-auto flex size-28 items-center justify-center rounded-2xl bg-neutral-100 p-3">
                  <img src={auction.images?.[0] || "/placeholder.svg"} alt={auction.name} loading="lazy" decoding="async" className="h-full w-auto object-contain" />
                </div>
                <h2 className="mt-4 text-center font-display text-lg font-bold text-foreground">{auction.name}</h2>
                <div className="mt-4 rounded-xl bg-awash-gold-bg border border-primary/20 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Primary Winning Bid</p>
                  <p className="font-display text-4xl font-extrabold text-primary tabular-nums">{formatETB(winner.winning_bid_amount ?? 0)} {CURRENCY}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-neutral-400">Total Bids</span><p className="font-semibold text-foreground">{winner.total_bids}</p></div>
                  <div><span className="text-neutral-400">Unique Bidders</span><p className="font-semibold text-foreground">{winner.unique_bidders}</p></div>
                  <div><span className="text-neutral-400">Primary Winner</span><p className="font-bold text-foreground">{winnerName || "Unknown"}{winnerPhone && <span className="ml-2 font-normal text-neutral-500">{maskPhone(winnerPhone)}</span>}</p></div>
                  {winner.lowest_unique_bid != null && (
                    <div><span className="text-neutral-400">Lowest Unique Bid</span><p className="font-bold text-emerald-600">{CURRENCY} {formatETB(winner.lowest_unique_bid)}</p></div>
                  )}
                  {deadlineHrs != null && (
                    <div><span className="flex items-center gap-1 text-neutral-400"><Clock className="size-3" /> Deadline</span><p className={`font-bold ${deadlineHrs < 6 ? "text-red-500" : "text-foreground"}`}>{deadlineHrs > 0 ? `${deadlineHrs}h` : "Expired"}</p></div>
                  )}
                </div>
                <div className="my-3 border-t border-border" />
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Market Price</span>
                  <span className="font-semibold text-neutral-400 line-through">{CURRENCY} {formatETB(auction.marketPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-neutral-400">Amount Saved</span>
                  <span className="font-bold text-emerald-600">{CURRENCY} {formatETB(savings)} ({savingsPct}%)</span>
                </div>
              </Card>
            </div>
          )}

          {/* ── How Winners Are Selected ── */}
          <Card className="mt-4 w-full max-w-md p-4 border-primary/10 bg-awash-gold-bg/50">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground">How Winners Are Selected</h3>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Winners are the lowest bid amounts that were placed by <strong>exactly one person</strong> (unique bids).
                  If multiple people bid the same amount, that amount is <strong>disqualified</strong>.
                  The lowest unique amount wins #1, the next lowest wins #2, and so on.
                </p>
              </div>
            </div>
          </Card>

          {/* ── All Winners List ── */}
          {allWinners && allWinners.length > 0 && (
            <Card className="mt-4 w-full max-w-md p-4 border-primary/10">
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Winner List ({allWinners.length})</h3>
              </div>
              <div className="space-y-2">
                {allWinners.map((w, i) => {
                  const wDeadline = w.payment_deadline ? new Date(w.payment_deadline) : null
                  const wDeadlineHrs = wDeadline ? Math.max(0, Math.round((wDeadline.getTime() - Date.now()) / 3600000)) : null
                  const isPaid = w.payment_status === "PAID"
                  const isExpired = w.payment_status === "EXPIRED"
                  const isCurrentUser = w.user_id === user?.id
                  return (
                    <div key={w.user_id} className={`flex items-center justify-between rounded-xl p-3 transition-colors ${
                      isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-neutral-50 border border-transparent"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-awash-gold-bg text-primary" : "bg-neutral-200 text-neutral-600"
                        }`}>
                          #{i + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                            {w.name || w.user_id.slice(0, 8)}{w.phone && <span className="ml-2 text-xs text-neutral-300">{maskPhone(w.phone)}</span>}
                            {isCurrentUser && <span className="ml-1.5 text-[10px] font-bold text-primary">(You)</span>}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className="text-emerald-600 font-medium">Unique: {CURRENCY}{formatETB(w.amount)}</span>
                            {isPaid && <span className="text-emerald-600 font-medium">• Paid</span>}
                            {isExpired && <span className="text-red-500 font-medium">• Expired</span>}
                            {!isPaid && !isExpired && wDeadlineHrs != null && (
                              <span className={wDeadlineHrs < 6 ? "text-red-500" : ""}>
                                • {wDeadlineHrs > 0 ? `${wDeadlineHrs}h left` : "Overdue"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-foreground tabular-nums">{CURRENCY} {formatETB(w.amount)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ── My Bid Info ── */}
          {myBidInfo && (
            <Card className="mt-4 w-full max-w-md p-4 border-primary/10">
              <h3 className="mb-2 text-sm font-bold text-foreground">Your Bid</h3>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Amount</span>
                <span className="font-bold text-primary">{CURRENCY} {formatETB(myBidInfo.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-neutral-400">Fee Paid</span>
                <span className={`font-bold ${myBidInfo.service_fee_paid ? "text-emerald-600" : "text-red-500"}`}>{myBidInfo.service_fee_paid ? "Yes" : "No"}</span>
              </div>
            </Card>
          )}

          {/* ── Collection Info ── */}
          {userWinnerInfo && userWinnerInfo.payment_status !== "PAID" && (
            <Card className="mt-4 w-full max-w-md p-4 border-primary/10 bg-blue-50/50">
              <div className="flex items-start gap-2">
                <Info className="size-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Next Steps</h3>
                  <ul className="mt-1 space-y-1 text-xs text-neutral-600">
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">1.</span>
                      Complete payment before the deadline
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">2.</span>
                      Collect your item at the designated collection point
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">3.</span>
                      Present payment confirmation for collection
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {allBids && allBids.length > 0 && (
            <Card className="mt-4 w-full max-w-md p-4 border-primary/10">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Bids ({allBids.length})</h3>
              </div>
              {/* ── Winning bid always on top ── */}
              {winningAmount != null && (() => {
                const winnerBid = allBids.find((b) => b.amount === winningAmount)
                if (!winnerBid) return null
                const count = amountCount.get(winningAmount) || 1
                return (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-emerald-800 truncate">
                        {winnerBid.user_id.slice(0, 8)}...
                      </span>
                      {winnerBid.user_id === user?.id && <span className="text-[10px] font-bold text-primary shrink-0">You</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Winner</span>
                      <span className="text-xs font-bold text-emerald-700 tabular-nums">{CURRENCY} {formatETB(winningAmount)}</span>
                    </div>
                  </div>
                )
              })()}
              {/* ── Bids below the winning amount ── */}
              {lowerBidsGrouped.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-medium text-neutral-400">Amounts below winner (lowest ↑)</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-1">
                    {pagedBids.map(({ amount, count }) => (
                      <div key={amount} className="flex items-center justify-between rounded-lg bg-neutral-50 border border-transparent px-3 py-2">
                        <span className="text-xs text-neutral-500">
                          {count} bidder{count > 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {count > 1 && (
                            <span className="text-[10px] font-medium text-neutral-400">×{count}</span>
                          )}
                          <span className="text-xs font-bold text-foreground tabular-nums">{CURRENCY} {formatETB(amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMore && (
                    <button
                      onClick={() => setBidsPage((p) => p + 1)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-border bg-white py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
                    >
                      Show {Math.min(BIDS_PAGE_SIZE, lowerBidsGrouped.length - pagedBids.length)} more
                    </button>
                  )}
                </>
              )}
            </Card>
          )}

          {/* ── Action ── */}
          <div className="mt-6 w-full max-w-md space-y-2">
            {winner.winner_user_id && (isAdmin || isUserWinner) ? (
              winner.payment_status === "PAID" ? (
                <button onClick={() => go("home")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold tracking-wide text-white shadow-sm shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98]">
                  <CheckCircle2 className="size-[18px]" /> Payment Complete — Back Home
                </button>
              ) : (
                <button onClick={() => go("pay-winning")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold tracking-wide text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98]">
                  <CreditCard className="size-[18px]" /> Process Payment
                </button>
              )
            ) : (
              <button onClick={() => go("home")}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold tracking-wide text-foreground transition-all hover:bg-neutral-50 active:scale-[0.98]">
                Back to Home
              </button>
            )}
            <button onClick={() => setRefreshKey((k) => k + 1)}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium text-neutral-400 hover:text-awash-gold transition-colors">
              <Loader2 className="size-3" /> Refresh results
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

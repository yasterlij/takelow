import { useMemo, useState } from "react"
import { Trophy, ArrowLeft, Users, Clock, CreditCard, Gavel, Sparkles, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function ClosedAuctionsScreen() {
  const { go, selectAuction, auctions, auctionsLoading } = useApp()
  const [filter, setFilter] = useState<"all" | "won" | "paid">("all")

  const closedAuctions = useMemo(
    () => auctions.filter((a) => a.status === "closed"),
    [auctions],
  )

  const filtered = useMemo(() => {
    if (filter === "won") return closedAuctions.filter((a) => a.winnersCount && a.winnersCount > 0)
    if (filter === "paid") return closedAuctions.filter((a) => a.winners?.some((w) => w.payment_status === "PAID"))
    return closedAuctions
  }, [closedAuctions, filter])

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => go("home")} className="flex size-10 items-center justify-center rounded-xl border border-border bg-white text-awash-blue hover:bg-neutral-50 transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">Closed Auctions</h1>
            <p className="text-sm font-medium text-neutral-500">{closedAuctions.length} auctions closed</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
          <Trophy className="size-3.5" /> Winners
        </span>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex gap-2">
        {(["all", "won", "paid"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
              filter === f
                ? "border-awash-blue bg-awash-blue text-white"
                : "border-border bg-white text-neutral-500 hover:border-awash-blue/40"
            }`}
          >
            {f === "all" ? "All" : f === "won" ? "With Winners" : "Paid"}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {auctionsLoading && closedAuctions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-neutral-500">Loading closed auctions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Trophy className="size-10 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-400">No closed auctions yet</p>
          <button onClick={() => go("home")} className="text-sm font-semibold text-primary">Back to Home</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((auction) => {
            const winners = auction.winners || []
            const paidCount = winners.filter((w) => w.payment_status === "PAID").length
            const totalWinners = winners.length

            return (
              <button
                key={auction.id}
                onClick={() => selectAuction(auction.id)}
                className="group w-full rounded-2xl border border-border/60 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start gap-4">
                  {/* ── Thumbnail ── */}
                  <div className="flex size-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                    {auction.images?.[0] ? (
                      <img src={auction.images[0]} alt={auction.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <Gavel className="size-6 text-neutral-300" />
                    )}
                  </div>

                  {/* ── Info ── */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h3 className="truncate font-display text-base font-bold text-foreground">{auction.name}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" /> {totalWinners} winner{totalWinners !== 1 ? "s" : ""}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Gavel className="size-3" /> {auction.totalBids || auction.bidders} bids
                      </span>
                      {paidCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CreditCard className="size-3" /> {paidCount} paid
                        </span>
                      )}
                    </div>

                    {/* ── Winners Preview ── */}
                    {winners.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {winners.slice(0, 3).map((w, i) => (
                          <span
                            key={w.user_id}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              w.payment_status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : w.payment_status === "EXPIRED"
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : "bg-primary/5 text-primary border border-primary/20"
                            }`}
                          >
                            <Trophy className="size-2.5" />
                            {CURRENCY} {formatETB(w.amount)}
                          </span>
                        ))}
                        {winners.length > 3 && (
                          <span className="text-[10px] font-medium text-neutral-400">+{winners.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {winners.length === 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                        No winners
                      </div>
                    )}

                    {/* ── Deadline Info ── */}
                    {auction.winners?.some((w) => w.payment_status === "PENDING" && w.payment_deadline) && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                        <Clock className="size-2.5" />
                        Payment pending
                      </div>
                    )}
                  </div>

                  {/* ── Arrow ── */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

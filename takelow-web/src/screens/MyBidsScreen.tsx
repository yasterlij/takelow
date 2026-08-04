import { motion } from "framer-motion"
import { Gavel, Clock, TicketCheck, Trophy, ChevronRight, Hash, TrendingDown } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge } from "../components/AuctionUI"
import { useCountdown } from "../components/Countdown"
import { formatCurrency, formatETB, formatCountdown } from "../mockDataV0"

function TimeLeft({ seconds }: { seconds: number }) {
  const t = useCountdown(seconds)
  const { h, m, s } = formatCountdown(t)
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-awash-blue">
      <Clock className="size-3" />
      {h}:{m}:{s} left
    </span>
  )
}

export function MyBidsScreen() {
  const { go, myBids, selectAuction, getAuction } = useApp()

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => go("auctions")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">My Bids</h1>
            <p className="text-sm font-medium text-neutral-500">Track every auction you've entered.</p>
          </div>
        </div>
        <Badge tone="gold">
          <TicketCheck className="size-3" />
          {myBids.length} placed
        </Badge>
      </motion.div>

      {myBids.length === 0 ? (
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
          className="flex flex-col items-center gap-4 py-20"
        >
          <span className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-awash-blue/10 to-awash-blue/5 border border-awash-blue/20 text-awash-blue">
            <Gavel className="size-10" />
          </span>
          <div className="text-center">
            <p className="font-display text-lg font-bold text-foreground">No bids yet</p>
            <p className="mt-1 text-sm font-medium text-neutral-500 max-w-xs">
              Browse the live auctions and place your first unique lowest bid to start winning.
            </p>
          </div>
          <button onClick={() => go("auctions")} className="btn-primary !w-auto !px-8 !h-11 !text-sm">
            Browse Auctions
          </button>
        </motion.div>
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-col gap-3"
        >
          {myBids.map((bid, i) => {
            const auction = getAuction(bid.auctionId)
            if (!auction) return null
            return (
              <motion.div
                key={`${bid.auctionId}-${bid.placedAt}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  onClick={() => selectAuction(bid.auctionId)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white hover:shadow-[0_8px_32px_rgba(200,166,66,0.08)] active:scale-[0.98]"
                >
                  <div className="flex size-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 border border-border/40 shadow-[0_6px_18px_rgba(0,43,92,0.12)]">
                    <img
                      src={auction.images?.[0] || "/placeholder.svg"}
                      alt={auction.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-foreground">{auction.name}</h3>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-neutral-400">Your bid</span>
                      <span className="font-display text-sm font-extrabold text-gradient-gold tabular-nums">
                        {formatCurrency(bid.amount)}
                      </span>
                    </div>
                    {bid.ticketNumber && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <Hash className="size-2.5 text-neutral-400" />
                        <span className="font-mono text-[10px] font-semibold text-neutral-400">
                          {bid.ticketNumber}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <TimeLeft seconds={auction.timeLeft} />
                      {auction.status !== "closed" ? (
                        <Badge tone="green">
                          <Trophy className="size-3" />
                          Live
                        </Badge>
                      ) : (
                        <Badge tone="muted">Closed</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-neutral-400 tabular-nums">{auction.totalBids || auction.bidders} bids</span>
                    <ChevronRight className="size-4 text-neutral-400 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {myBids.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-2xl bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-5 text-white shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="relative z-10 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <TrendingDown className="size-5 text-awash-gold" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-white">Remember</p>
              <p className="mt-1 text-xs text-white/70 leading-relaxed">
                The lower and more unique your bid, the higher your chance of winning. Choose an amount no one else would think of!
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

import { useMemo, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, TicketCheck, ShieldCheck, Trophy, Sparkles, PiggyBank, RefreshCw, Gavel, ChevronLeft, ChevronRight, Filter, ArrowLeft, TrendingDown, Users } from "lucide-react"
import { useApp } from "../AppContext"
import { Badge } from "../components/AuctionUI"
import { SmartImage } from "../components/SmartImage"
import { useCountdown } from "../components/Countdown"
import { buildAuctionCategoryOptions } from "../lib/auctionCategories"
import { CURRENCY, formatCurrency, formatETB, formatCountdown, type Auction } from "../mockDataV0"

function AuctionImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      className="transition-transform duration-500 group-hover:scale-110"
      fallbackClassName=""
    />
  )
}

function TimePill({ seconds, endingSoon }: { seconds: number; endingSoon: boolean }) {
  const t = useCountdown(seconds)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = endingSoon || (t > 0 && t < 3600)
  return (
    <span className={`countdown-pill ${
      urgent ? "bg-ember text-white" : "bg-ink text-white"
    }`}>
      {d !== "00" && <>{parseInt(d)}d </>}{h}:{m}:{s}
    </span>
  )
}

export function AuctionCard({ auction, onOpen, index }: { auction: Auction; onOpen: () => void; index: number }) {
  const endingSoon = auction.status === "ending-soon"
  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0
  const isClosed = auction.status === "closed"
  const publicCode = auction.publicCode || auction.productId || auction.id.slice(0, 6).toUpperCase()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <button onClick={onOpen} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-transparent bg-white text-left transition-colors duration-200 hover:border-border/60 active:scale-[0.99]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
          <AuctionImage src={auction.images?.[0]} alt={auction.name} />
          {auction.images?.length > 1 && (
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              {auction.images.slice(0, 3).map((_: string, i: number) => (
                <div key={i} className={`size-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            {isClosed ? (
              <Badge tone="muted">Closed</Badge>
            ) : endingSoon ? (
              <Badge tone="gold"><Flame className="size-3" /> Ending Soon</Badge>
            ) : (
              <Badge tone="green">Live</Badge>
            )}
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-ink">
              {publicCode}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <h3 className="line-clamp-2 font-display text-sm font-semibold text-foreground">{auction.name}</h3>
          {!isClosed && (
            <div>
              <TimePill seconds={auction.timeLeft} endingSoon={endingSoon} />
            </div>
          )}
          {auction.specSummary && <p className="line-clamp-2 text-[10px] font-normal text-neutral-500">{auction.specSummary}</p>}
          {auction.marketPrice > 0 && <p className="text-[10px] font-normal text-neutral-400 line-through">{formatCurrency(auction.marketPrice)}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold tabular-nums text-ink">
              Bid Amount: {formatCurrency(auction.bidFee)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
              <Users className="size-3" /> {auction.totalBids || auction.bidders} bidders
            </span>
          </div>
          <div className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-link-blue">View more specs</div>
        </div>
        {auction.maxBid && !isClosed && (
          <div className="px-3 pb-2">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#C8A642" : "#002B5C" }} />
            </div>
          </div>
        )}
      </button>
    </motion.div>
  )
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
      </div>
    </div>
  )
}

const loveItems = [
  { icon: Trophy, label: "Win premium products for the lowest price" },
  { icon: ShieldCheck, label: "Fair & transparent — lowest unique bid wins" },
  { icon: Sparkles, label: "Simple, secure and trusted payments" },
  { icon: PiggyBank, label: "Big savings, big rewards" },
]

const PRICE_RANGES = [
  { label: "All", min: 0, max: Infinity },
  { label: "Under 30 birr", min: 0, max: 30 },
  { label: "30–50 birr", min: 30, max: 50 },
  { label: "50+ birr", min: 50, max: Infinity },
]

export function AuctionsScreen() {
  const { go, goBack, selectAuction, myBids, auctions, auctionsLoading, refreshAuctions } = useApp()
  const [category, setCategory] = useState("All")
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "closed">("live")
  const [priceRange, setPriceRange] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const heroScrollRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => buildAuctionCategoryOptions(auctions.map((a) => a.category)), [auctions])

  const filtered = useMemo(() => {
    const unique = Array.from(new Map(auctions.map((a) => [a.id, a])).values())
    let result = unique
    if (category !== "All") result = result.filter((a) => a.category === category)
    if (statusFilter === "live") result = result.filter((a) => a.status !== "closed")
    else if (statusFilter === "closed") result = result.filter((a) => a.status === "closed")
    const range = PRICE_RANGES[priceRange]
    if (range) result = result.filter((a) => a.bidFee >= range.min && a.bidFee < range.max)
    return result
  }, [category, statusFilter, priceRange, auctions])

  const liveAuctions = auctions.filter((a) => a.status !== "closed")
  const endingSoon = liveAuctions.filter((a) => a.status === "ending-soon" || a.timeLeft < 3600)

  const scrollHero = (dir: "left" | "right") => {
    if (!heroScrollRef.current) return
    heroScrollRef.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" })
  }

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
          <button onClick={goBack} className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground hover:bg-cool-wash transition-colors">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.022em] text-foreground">Auctions</h1>
            <p className="text-sm font-normal text-neutral-500">Lowest unique bid wins. Bid low, be unique!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="gold">
            <span className="size-1.5 rounded-full bg-emerald-500" /> {liveAuctions.length} Live
          </Badge>
          <button onClick={() => go("my-bids")} aria-label="My bids" className="relative flex size-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground transition-colors hover:bg-cool-wash">
            <TicketCheck className="size-5" />
            {myBids.length > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{myBids.length}</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* ── Filters Bar ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex gap-2">
          {(["all", "live", "closed"] as const).map((s) => {
            const active = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`btn-filter-chip ${active ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}>
                {s === "all" ? "All" : s === "live" ? "Live" : "Closed"}
              </button>
            )
          })}
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => {
              const active = c === category
              return (
                <button key={c} onClick={() => setCategory(c)}
                  className={`btn-filter-chip ${active ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}>
                  {c}
                </button>
              )
            })}
          </div>
        )}

        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-filter-chip ${showFilters || priceRange > 0 ? "btn-filter-chip-active btn-filter-chip-gold" : "btn-filter-chip-glass"}`}>
          <Filter className="size-3.5 inline mr-1" />
          Price
        </button>
      </motion.div>

      {/* ── Price Range Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="-mt-2 flex flex-wrap gap-2 overflow-hidden"
          >
            {PRICE_RANGES.map((r, i) => (
              <button key={r.label} onClick={() => setPriceRange(i)}
                className={`btn-filter-chip ${priceRange === i ? "btn-filter-chip-active btn-filter-chip-gold" : "btn-filter-chip-glass"}`}>
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ending Soon Carousel ── */}
      {statusFilter !== "closed" && endingSoon.length > 0 && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="relative"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Flame className="size-4 text-primary" />
            </span>
            <span className="font-display text-sm font-bold text-primary">Ending Soon</span>
          </div>
          {endingSoon.length > 2 && (
            <>
              <button onClick={() => scrollHero("left")} className="size-9 absolute left-0 top-1/2 z-10 -translate-y-1/2 btn-icon-glass">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={() => scrollHero("right")} className="size-9 absolute right-0 top-1/2 z-10 -translate-y-1/2 btn-icon-glass">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div ref={heroScrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
            {endingSoon.slice(0, 6).map((a) => (
              <button key={a.id} onClick={() => selectAuction(a.id)}
                className="group relative w-[300px] flex-shrink-0 aspect-[4/3] overflow-hidden rounded-2xl transition-transform duration-200 active:scale-[0.99] text-left">
                <div className="absolute inset-0 bg-ink" />
                {a.images?.[0] && <div className="absolute inset-0 opacity-50 transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"><SmartImage src={a.images[0]} alt={a.name} /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between p-4">
                  <div className="flex items-center justify-start">
                    <Badge tone="hot"><Flame className="size-3" /> Hot</Badge>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">{a.name}</h3>
                    <div className="mt-1.5">
                      <TimePill seconds={a.timeLeft} endingSoon={true} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Service Fee: {formatCurrency(a.bidFee)}</span>
                      <span className="text-xs font-normal text-white/60 line-through">{a.marketPrice > 0 ? formatCurrency(a.marketPrice) : null}</span>
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink">
                      <Users className="size-3" /> {a.totalBids || a.bidders} bidders
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Auction Grid ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      >
        {auctionsLoading && auctions.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((a, i) => (
                <AuctionCard key={a.id} auction={a} index={i} onOpen={() => selectAuction(a.id)} />
              ))}
            </div>
            {filtered.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-16"
              >
                <span className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 border border-border/60">
                  <Gavel className="size-8 text-neutral-300" />
                </span>
                <p className="text-sm font-medium text-neutral-400">No auctions match your filters</p>
                <button onClick={() => { setCategory("All"); setStatusFilter("all"); setPriceRange(0) }} className="text-sm font-semibold text-primary hover:underline">
                  Clear all filters
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Refresh ── */}
      {auctions.length > 0 && (
        <motion.button
          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          whileTap={{ scale: 0.98 }}
          onClick={refreshAuctions} disabled={auctionsLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-white px-4 py-3 text-sm font-normal text-neutral-500 transition-colors hover:text-foreground active:scale-[0.99]">
          <RefreshCw className={`size-4 ${auctionsLoading ? "animate-spin" : ""}`} />
          {auctionsLoading ? "Refreshing..." : "Refresh Auctions"}
        </motion.button>
      )}

      {/* ── Why customers love it ── */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        className="rounded-2xl bg-canvas p-6"
      >
        <h3 className="mb-4 font-display text-base font-semibold text-ink">Why customers love it</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {loveItems.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-foreground"><item.icon className="size-4" /></span>
              <span className="text-sm font-medium text-foreground/80">{item.label}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}

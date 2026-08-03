import { useState, useRef, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Gavel, Wallet, ArrowRight, Eye, EyeOff, Trophy, Sparkles, ChevronLeft, ChevronRight, TrendingDown, Users, Flame } from "lucide-react"
import { useApp } from "../AppContext"
import { formatCurrency, formatCountdown } from "../mockDataV0"
import { useCountdown } from "../components/Countdown"
import { AuctionCard, SkeletonCard } from "./AuctionsScreen"


function maskPhone(p: string | null): string | null {
  return p ? p.slice(0, 4) + "XXXX" + p.slice(-2) : null
}

function LiveAuctionsCarousel({ auctions, onJoin }: { auctions: any[]; onJoin: (id: string) => void }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = auctions.length
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const auction = auctions[safeIndex]

  const goTo = useCallback((i: number) => {
    setIndex(((i % total) + total) % total)
  }, [total])

  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total])
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total])

  useEffect(() => {
    if (paused || total <= 1) return
    timerRef.current = setTimeout(next, 6000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [index, paused, total, next])

  const t = useCountdown(auction?.timeLeft ?? 0)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = auction?.status === "ending-soon" || (t > 0 && t < 3600)
  const publicCode = auction?.publicCode || auction?.productId || auction?.id?.slice(0, 6).toUpperCase()

  if (total === 0 || !auction) return null

  return (
    <div
      className="group relative h-full w-full overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(0,43,92,0.25)] ring-1 ring-awash-blue/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={auction.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {auction.images?.length ? (
              <img src={auction.images[0]} alt={auction.name} className="h-full w-full object-cover" loading="eager" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224]">
                <Gavel className="size-14 text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-awash-gold/20 px-3 py-1.5 text-xs font-bold text-awash-gold-light border border-awash-gold/30 backdrop-blur-md">
              <Flame className="size-3.5" /> Live Auction
            </span>
            <span className="inline-flex items-center rounded-full bg-white/14 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white border border-white/10">
              Code {publicCode}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-3 py-1.5 text-xs font-bold tabular-nums border ${urgent ? "bg-primary/25 text-primary border-primary/40 animate-glow-pulse" : "bg-white/70 text-awash-blue border-white/20"}`}>
            {d !== "00" ? `${parseInt(d)}d ` : ""}{h}:{m}:{s}
          </span>
        </div>

        <div>
          <h2 className="font-display text-2xl font-extrabold text-white drop-shadow-lg sm:text-3xl">{auction.name}</h2>
          {auction.specSummary && <p className="mt-1.5 text-sm font-semibold text-white/85 sm:text-base">{auction.specSummary}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-awash-gold/20 px-3 py-1.5 text-xs font-bold text-awash-gold-light border border-awash-gold/30">
              Bid Amount: {formatCurrency(auction.bidFee)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-300/40">
              <Users className="size-3.5" /> {auction.totalBids || auction.bidders} bidders
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button onClick={() => onJoin(auction.id)} className="auction-hero-btn !w-auto px-7">
              Join Auction <ArrowRight className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              {auctions.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => goTo(i)}
                  aria-label={`Show auction ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-500 ${i === index ? "w-8 bg-awash-gold shadow-[0_0_10px_rgba(200,166,66,0.6)]" : "w-2 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
              <span className="ml-1 text-[11px] font-bold tabular-nums text-white/60">{index + 1} / {total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-y-0 left-2 flex items-center z-20">
        <button onClick={prev} aria-label="Previous live auction" className="hidden sm:flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/50">
          <ChevronLeft className="size-5" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center z-20">
        <button onClick={next} aria-label="Next live auction" className="hidden sm:flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/50">
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-white/10">
        <motion.div
          key={`${auction.id}-${index}`}
          className="h-full bg-gradient-to-r from-awash-gold to-awash-gold-light"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: paused ? 60 : 6, ease: "linear" }}
        />
      </div>
    </div>
  )
}

function WinnerShowcaseSlide({ auction, index }: { auction: any; index: number }) {
  const winnerInfo = auction.winners?.[0]
  const maskedPhone = winnerInfo?.phone ? maskPhone(winnerInfo.phone) : null
  const firstName = winnerInfo?.name ? winnerInfo.name.split(" ")[0] : null
  const bidAmount = auction.winning_bid_amount ?? winnerInfo?.amount ?? 0

  return (
    <div className="group relative flex w-[280px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_64px_rgba(200,166,66,0.15)] border border-primary/10 hover:border-primary/30 border-glow">
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {[
          { left: "18%", bg: "#C8A642", shape: "50%", delay: "0s", dur: "0.8s" },
          { left: "38%", bg: "#D4B85E", shape: "2px", delay: "0.12s", dur: "1s" },
          { left: "55%", bg: "#FF6B6B", shape: "50%", delay: "0.05s", dur: "0.9s" },
          { left: "72%", bg: "#4ECDC4", shape: "2px", delay: "0.18s", dur: "1.1s" },
          { left: "88%", bg: "#E8D48B", shape: "50%", delay: "0.08s", dur: "0.85s" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute size-2 animate-confetti"
            style={{
              left: p.left,
              top: "-4px",
              background: p.bg,
              borderRadius: p.shape,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 ring-1 ring-awash-blue/10">
        <img src={auction.images?.[0] || "/placeholder.svg"} alt={auction.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-awash-gold to-awash-gold-light px-3 py-1 text-[11px] font-bold text-awash-blue shadow-lg border border-primary/20">
            <Trophy className="size-3.5" /> #{index + 1}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-extrabold text-gradient-gold">
              {firstName}
              {firstName && maskedPhone && <span className="text-[10px] font-medium text-neutral-400 ml-1.5">{maskedPhone}</span>}
              {!firstName && (maskedPhone || `Winner #${index + 1}`)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100/80 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200/50">
            {formatCurrency(bidAmount)}
          </span>
        </div>
        <p className="text-xs font-medium text-neutral-500 leading-tight">{auction.name}</p>
        {auction.specSummary && <p className="truncate text-[11px] font-medium text-neutral-400">{auction.specSummary}</p>}
        <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 px-3 py-1.5">
          <Sparkles className="size-3 text-awash-gold" />
          <span className="text-[11px] font-semibold text-awash-gold-dark">Lowest unique bid won!</span>
        </div>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const { go, walletBalance, auctions, auctionsLoading, selectAuction, myBids, getAuction } = useApp()
  const [showBalance, setShowBalance] = useState(true)
  const winnerScrollRef = useRef<HTMLDivElement>(null)

  const activeAuctions = auctions.filter((a) => a.status !== "closed")
  const closedAuctions = auctions.filter((a) => a.status === "closed")
  const endingSoon = activeAuctions.filter((a) => a.status === "ending-soon" || a.timeLeft < 3600)
  const displayHero = endingSoon.length > 0 ? endingSoon : activeAuctions
  const heroIds = new Set(displayHero.slice(0, 10).map((a) => a.id))
  const liveGrid = activeAuctions.filter((a) => !heroIds.has(a.id))

  const bidAuctionIds = new Set(myBids.map((b) => b.auctionId))
  const bidCategories = new Set(
    myBids.map((b) => getAuction(b.auctionId)?.category).filter((c): c is string => !!c),
  )
  const suggestedAuctions = activeAuctions.filter(
    (a) => !heroIds.has(a.id) && !bidAuctionIds.has(a.id) && bidCategories.has(a.category),
  )
  const showSuggested = myBids.length > 0 && suggestedAuctions.length > 0

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, dir: "left" | "right", amount: number) => {
    ref.current?.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-8 pb-8 stagger-enter"
    >
      {/* ── Wallet Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-6 shadow-[0_8px_32px_rgba(0,43,92,0.2)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-awash-gold/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute -top-8 -right-8 size-40 rounded-full border-[10px] border-white/[0.03]" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Wallet className="size-6 text-awash-gold" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/60">Wallet Balance</p>
              <p className="font-display text-2xl font-extrabold text-white tabular-nums tracking-tight">
                {showBalance ? formatCurrency(walletBalance) : "••••••"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBalance((s) => !s)} className="rounded-lg bg-white/10 backdrop-blur-sm px-2.5 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/20 border border-white/10">
              {showBalance ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
            <button onClick={() => go("deposit")} className="rounded-lg bg-gradient-to-r from-awash-gold to-awash-gold-light px-3.5 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
              + Top Up
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Auctions Carousel ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-awash-blue/10 backdrop-blur-sm border border-awash-blue/20 text-awash-blue"><Gavel className="size-5" /></span>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground">Live Auctions</h2>
              <p className="text-sm font-medium text-neutral-500">{activeAuctions.length} live — bid low, be unique!</p>
            </div>
          </div>
          <button onClick={() => go("auctions")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
            View All <ArrowRight className="size-4" />
          </button>
        </div>

        {auctionsLoading && auctions.length === 0 ? (
          <div className="aspect-[16/9] sm:aspect-[21/9] rounded-3xl skeleton" />
        ) : displayHero.length > 0 ? (
          <div className="aspect-[16/9] sm:aspect-[21/9]">
            <LiveAuctionsCarousel auctions={displayHero.slice(0, 10)} onJoin={(id) => selectAuction(id)} />
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-border/50 glass-card-solid">
            <div className="text-center">
              <Gavel className="mx-auto size-10 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-400">No live auctions yet</p>
            </div>
          </div>
        )}

        {auctionsLoading && auctions.length === 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : liveGrid.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {liveGrid.slice(0, 8).map((a, i) => (
              <AuctionCard key={a.id} auction={a} index={i} onOpen={() => selectAuction(a.id)} />
            ))}
          </div>
        ) : null}

        {!auctionsLoading && activeAuctions.length > 0 && (
          <button onClick={() => go("auctions")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/5 to-awash-gold/5 backdrop-blur-sm border border-primary/20 px-5 py-3 text-sm font-bold text-awash-gold-dark transition-all hover:from-primary/10 hover:to-awash-gold/10 hover:scale-[1.01] active:scale-[0.97] shadow-sm">
            View All Live Auctions <ArrowRight className="size-4" />
          </button>
        )}
      </section>

      {/* ── Suggested For You ── */}
      {showSuggested && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-awash-gold/15 backdrop-blur-sm border border-primary/20 text-awash-gold-dark shadow-sm shadow-primary/10">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground">Suggested For You</h2>
                <p className="text-sm font-medium text-neutral-500">Based on the auctions you've joined — bid low, be unique!</p>
              </div>
            </div>
            <button onClick={() => go("auctions")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
              View All <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {suggestedAuctions.slice(0, 8).map((a, i) => (
              <AuctionCard key={a.id} auction={a} index={i} onOpen={() => selectAuction(a.id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Auction Winners ── */}
      <section className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(214,173,60,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,248,229,0.94))] px-4 py-4 shadow-[0_12px_38px_rgba(205,171,70,0.12)] sm:px-5 sm:py-6">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-awash-gold/50 to-transparent" />
        <div className="relative mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-awash-gold/95 to-awash-gold-light text-awash-blue shadow-[0_10px_24px_rgba(214,173,60,0.28)] ring-1 ring-white/70 sm:size-11">
              <Trophy className="size-4 sm:size-[18px]" />
            </span>
            <div className="space-y-1.5 sm:space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-awash-gold-dark/80 backdrop-blur-sm sm:px-3 sm:text-[11px] sm:tracking-[0.22em]">
                <span className="size-1.5 rounded-full bg-awash-gold" />
                Winner Spotlight
              </div>
              <div className="hidden sm:block">
                <h2 className="font-display text-[1.72rem] font-extrabold leading-[1.02] tracking-tight text-awash-blue sm:text-[2rem]">Latest Winners</h2>
                <p className="mt-1 max-w-xl text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-[15px]">
                  Winning bids from recently closed auctions.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-row sm:items-center lg:justify-end">
            {closedAuctions.length > 0 && (
              <div className="hidden items-center gap-2 rounded-full border border-awash-gold/25 bg-white/80 px-3 py-1.5 text-xs font-semibold text-awash-gold-dark shadow-sm shadow-primary/5 backdrop-blur-sm sm:inline-flex">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-awash-gold/15 text-awash-gold-dark">
                  <Trophy className="size-3" />
                </span>
                {closedAuctions.length} winners showcased
              </div>
            )}
            <button onClick={() => go("closed-auctions")} className="inline-flex items-center justify-center gap-2 rounded-full bg-awash-blue px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,43,92,0.16)] transition-all hover:-translate-y-0.5 hover:bg-awash-blue-dark hover:shadow-[0_16px_34px_rgba(0,43,92,0.22)] active:translate-y-0">
              View All Winners <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          {closedAuctions.length > 2 && (
            <>
              <button onClick={() => scroll(winnerScrollRef, "left", 300)} className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/30 text-awash-gold hover:bg-white transition-all opacity-0 hover:opacity-100">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={() => scroll(winnerScrollRef, "right", 300)} className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/30 text-awash-gold hover:bg-white transition-all opacity-0 hover:opacity-100">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          {closedAuctions.length > 0 ? (
            <div ref={winnerScrollRef} className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
              {closedAuctions.slice(0, 5).map((a, i) => (
                <WinnerShowcaseSlide key={a.id} auction={a} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-awash-gold/5 py-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                <Trophy className="size-6 text-awash-gold" />
              </span>
              <div>
                <p className="font-display text-base font-bold text-awash-gold-dark">Winners announced soon</p>
                <p className="mt-1 text-sm font-medium text-neutral-500">The lowest unique bid wins. Keep an eye on the live auctions!</p>
              </div>
            </div>
          )}
        </div>

      </section>

      {/* ── Promo ── */}
      <section>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-7 text-white shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute -bottom-16 -left-10 size-56 rounded-full border-[12px] border-white/[0.03]" />
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-awash-gold/60 to-transparent" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-awash-gold/20 border border-awash-gold/30">
                  <Sparkles className="size-4 text-awash-gold" />
                </span>
                <p className="font-display text-base font-bold text-gradient-gold">Awash Bank Reverse Auction</p>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Premium phones, TVs, and laptops waiting for their lowest unique bid. The lower your bid, the better your chance to win.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-white/60">
                <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 text-awash-gold" /> {activeAuctions.length} live auctions</span>
                <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5 text-awash-gold" /> {closedAuctions.length} winners crowned</span>
                <span className="inline-flex items-center gap-1.5"><TrendingDown className="size-3.5 text-awash-gold" /> Lowest unique bid wins</span>
              </div>
            </div>
            <div className="flex gap-3 lg:shrink-0">
              <button onClick={() => go("auctions")} className="rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-6 py-2.5 text-sm font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
                Browse Auctions
              </button>
              <button onClick={() => go("my-bids")} className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-[0.97]">
                My Bids
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  )
}

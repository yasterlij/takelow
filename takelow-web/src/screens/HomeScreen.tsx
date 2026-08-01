import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Gavel, Wallet, ArrowRight, Eye, EyeOff, Trophy, Timer, Sparkles, ChevronLeft, ChevronRight, TrendingDown, Users } from "lucide-react"
import { useApp } from "../AppContext"
import { CURRENCY, formatCurrency, formatETB, formatCountdown } from "../mockDataV0"
import { useCountdown } from "../components/Countdown"
import { ImageCarousel } from "../components/ImageCarousel"


function maskPhone(p: string | null): string | null {
  return p ? p.slice(0, 4) + "XXXX" + p.slice(-2) : null
}

function useCountdownInternal(seconds: number) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    if (remaining <= 0) return
    const id = setInterval(() => setRemaining((p) => (p <= 1 ? (clearInterval(id), 0) : p - 1)), 1000)
    return () => clearInterval(id)
  }, [remaining])
  const hrs = Math.floor(remaining / 3600)
  const mins = Math.floor((remaining % 3600) / 60)
  const secs = remaining % 60
  return { d: "0", h: String(hrs).padStart(2, "0"), m: String(mins).padStart(2, "0"), s: String(secs).padStart(2, "0") }
}

function HeroAuctionSlide({ auction, onJoin }: { auction: any; onJoin: () => void }) {
  const t = useCountdown(auction.timeLeft)
  const { d, h, m, s } = formatCountdown(t)
  const urgent = auction.status === "ending-soon" || (t > 0 && t < 3600)
  const publicCode = auction.publicCode || auction.productId || auction.id.slice(0, 6).toUpperCase()

  if (!auction.images?.length) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224]">
        <div className="text-center">
          <Gavel className="mx-auto size-12 text-white/20" />
          <p className="mt-2 text-sm font-medium text-white/40">{auction.name}</p>
        </div>
      </div>
    )
  }

  return (
    <ImageCarousel
      images={auction.images}
      alt={auction.name}
      aspectRatio="aspect-[4/3]"
      autoPlayInterval={5000}
      overlay={
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none">
          <div className="absolute inset-0 flex flex-col justify-between p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-awash-blue/70 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white border border-white/10 pointer-events-auto">
                  <Gavel className="size-3" /> Live Auction
                </span>
                <span className="inline-flex items-center rounded-full bg-white/14 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white border border-white/10 pointer-events-auto">
                  Code {publicCode}
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full backdrop-blur-md px-3 py-1.5 text-xs font-bold tabular-nums border pointer-events-auto ${urgent ? "bg-primary/20 text-primary border-primary/30 animate-glow-pulse" : "bg-white/70 text-awash-blue border-white/20"}`}>
                {d !== "00" ? `${parseInt(d)}d ` : ""}{h}:{m}:{s}
              </span>
            </div>
            <div className="translate-y-0 transition-transform duration-300 group-hover:-translate-y-1">
              <h3 className="font-display text-xl font-extrabold text-white drop-shadow-lg">{auction.name}</h3>
              {auction.specSummary && <p className="mt-1 text-sm font-semibold text-white/80">{auction.specSummary}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-awash-gold/20 px-3 py-1 text-[11px] font-bold text-awash-gold-light border border-awash-gold/25">
                  Bid Amount: {formatCurrency(auction.bidFee)}
                </span>
                <span className="text-xs font-bold text-emerald-300 line-through">{formatCurrency(auction.marketPrice)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-300/40">
                  <Users className="size-3" /> {auction.totalBids || auction.bidders} bidders
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">View more specs</span>
                <button onClick={onJoin} className="auction-hero-btn pointer-events-auto">
                  Join Auction
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  )
}

function ActiveAuctionCard({ auction, onSelect }: { auction: any; onSelect: () => void }) {
  const t = useCountdownInternal(auction.timeLeft)
  const urgent = auction.status === "ending-soon" || (auction.timeLeft > 0 && auction.timeLeft < 3600)
  const publicCode = auction.publicCode || auction.productId || auction.id.slice(0, 6).toUpperCase()

  return (
    <button onClick={onSelect} className="group flex w-[240px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_4px_20px_rgba(0,43,92,0.04)] text-left transition-all duration-500 hover:-translate-y-2 hover:border-primary/20 hover:shadow-[0_16px_48px_rgba(200,166,66,0.12)] active:scale-[0.98]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-awash-blue/10 via-neutral-100 to-awash-gold/10 ring-1 ring-awash-blue/10">
        {auction.images?.[0] ? (
          <img src={auction.images[0]} alt={auction.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-[2deg]" />
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-100"><Gavel className="size-8 text-neutral-300" /></div>
        )}
        {auction.images?.length > 1 && (
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            {auction.images.slice(0, 3).map((_: string, i: number) => (
              <div key={i} className={`size-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {urgent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white border border-primary/30"><Timer className="size-3" /> Ending Soon</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/80 backdrop-blur-sm px-2 py-1 text-[10px] font-bold text-white border border-emerald-400/30">Live</span>
          )}
          <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-awash-blue border border-white/50">
            {publicCode}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <h3 className="truncate font-display text-sm font-bold text-foreground">{auction.name}</h3>
        {auction.specSummary && <p className="truncate text-[10px] font-medium text-neutral-500">{auction.specSummary}</p>}
        <p className="text-[10px] font-medium text-neutral-400 line-through">{formatCurrency(auction.marketPrice)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-awash-gold/10 px-2.5 py-1 text-[10px] font-bold text-awash-gold-dark border border-primary/20">
            Bid Amount: {formatCurrency(auction.bidFee)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50/80 backdrop-blur-sm px-2 py-1 border border-emerald-200/50">
            <Users className="size-3 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700">{auction.totalBids || auction.bidders} bidders</span>
          </span>
        </div>
        <div className="mt-1 rounded-xl bg-awash-blue/5 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-awash-blue/80">View more specs</div>
        <div className="flex justify-center pt-1">
          <span className={`countdown-pill ${urgent ? "bg-primary/20 text-awash-gold border border-primary/30" : "bg-awash-blue/80 text-white border border-white/10"}`}>
            {t.d !== "00" ? `${parseInt(t.d)}d ` : ""}{t.h}:{t.m}:{t.s}
          </span>
        </div>
      </div>
    </button>
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
        <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 px-3 py-1.5">
          <Sparkles className="size-3 text-awash-gold" />
          <span className="text-[11px] font-semibold text-awash-gold-dark">Lowest unique bid won!</span>
        </div>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const { go, walletBalance, user, auctions, auctionsLoading, selectAuction } = useApp()
  const [showBalance, setShowBalance] = useState(true)
  const heroScrollRef = useRef<HTMLDivElement>(null)
  const auctionScrollRef = useRef<HTMLDivElement>(null)
  const winnerScrollRef = useRef<HTMLDivElement>(null)

  const activeAuctions = auctions.filter((a) => a.status !== "closed")
  const closedAuctions = auctions.filter((a) => a.status === "closed")
  const endingSoon = activeAuctions.filter((a) => a.status === "ending-soon" || a.timeLeft < 3600)
  const displayHero = endingSoon.length > 0 ? endingSoon : activeAuctions

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
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-6 shadow-[0_8px_32px_rgba(0,43,92,0.2)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-awash-gold/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="flex items-center justify-between relative z-10">
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

      {/* ── Section A: Live Auctions ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-awash-blue/10 backdrop-blur-sm border border-awash-blue/20 text-awash-blue"><Gavel className="size-5" /></span>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-foreground">Live Auctions</h2>
              <p className="text-sm font-medium text-neutral-500">{activeAuctions.length} auctions live now — bid low, be unique!</p>
            </div>
          </div>
          <button onClick={() => go("auctions")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
            View All <ArrowRight className="size-4" />
          </button>
        </div>

        {displayHero.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {displayHero.slice(0, 3).map((a) => (
              <div key={a.id} className="overflow-hidden rounded-2xl shadow-lg transition-all duration-500 hover:shadow-[0_16px_48px_rgba(200,166,66,0.15)] hover:-translate-y-1">
                <HeroAuctionSlide auction={a} onJoin={() => selectAuction(a.id)} />
              </div>
            ))}
          </div>
        )}

        {activeAuctions.length > 0 && (
          <div className="relative">
            {activeAuctions.length > 4 && (
              <>
                <button onClick={() => scroll(auctionScrollRef, "left", 260)} className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/30 text-awash-blue hover:bg-white transition-all opacity-0 hover:opacity-100">
                  <ChevronLeft className="size-5" />
                </button>
                <button onClick={() => scroll(auctionScrollRef, "right", 260)} className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/30 text-awash-blue hover:bg-white transition-all opacity-0 hover:opacity-100">
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
            <div ref={auctionScrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
              {auctionsLoading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-[240px] flex-shrink-0 snap-start overflow-hidden rounded-2xl skeleton"><div className="aspect-[4/3] w-full" /></div>)
                : activeAuctions.slice(0, 8).map((a) => <ActiveAuctionCard key={a.id} auction={a} onSelect={() => selectAuction(a.id)} />)}
            </div>
          </div>
        )}

        {activeAuctions.length === 0 && !auctionsLoading && (
          <div className="flex h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-border/50 glass-card-solid">
            <div className="text-center">
              <Gavel className="mx-auto size-10 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-400">No live auctions yet</p>
            </div>
          </div>
        )}
      </section>

      {/* ── Section B: Celebrate Our Recent Auction Winners ── */}
      {closedAuctions.length > 0 && (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-awash-gold/20 backdrop-blur-sm border border-primary/20 text-awash-gold shadow-sm shadow-primary/10">
              <Trophy className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight text-gradient-gold">Celebrate Our Recent Auction Winners</h2>
              <p className="text-sm font-medium text-neutral-500">Congratulations to our winners!</p>
            </div>
          </div>
          <button onClick={() => go("closed-auctions")} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2 text-sm font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-105 active:scale-[0.97]">
            View All Winners <ArrowRight className="size-4" />
          </button>
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
          <div ref={winnerScrollRef} className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
              {closedAuctions.slice(0, 5).map((a, i) => (
                  <WinnerShowcaseSlide key={a.id} auction={a} index={i} />
                ))}
          </div>
        </div>

        <button onClick={() => go("closed-auctions")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary/5 to-awash-gold/5 backdrop-blur-sm border border-primary/20 px-5 py-3 text-sm font-bold text-awash-gold-dark transition-all hover:from-primary/10 hover:to-awash-gold/10 hover:scale-[1.01] active:scale-[0.97] shadow-sm">
          <Trophy className="size-4" /> View All Winners <ArrowRight className="size-4" />
        </button>
      </section>
      )}

      {/* ── Promo ── */}
      <section>
        <div className="rounded-2xl bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-7 text-white shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-awash-gold/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-awash-gold" />
              <p className="font-display text-base font-bold text-gradient-gold">Awash Bank Reverse Auction</p>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-2xl">
              Premium phones, TVs, and laptops waiting for their lowest unique bid. The lower your bid, the better your chance to win.
            </p>
            <div className="mt-5 flex gap-3">
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

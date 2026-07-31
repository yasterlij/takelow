import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Tag, Ticket, CheckCircle2, TrendingDown, ZoomIn, Trophy, Bell, Gavel, ArrowLeft, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { Card, Badge } from "../components/AuctionUI"
import { Countdown, useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"
import { ImageCarousel } from "../components/ImageCarousel"

function Lightbox({ images, idx, onClose }: { images: string[]; idx: number; onClose: () => void }) {
  const [current, setCurrent] = useState(idx)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setCurrent((i) => (i - 1 + images.length) % images.length)
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % images.length)
    }
    window.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = "" }
  }, [images.length, onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-scale-in">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><ZoomIn className="size-6 rotate-45" /></button>
      <div className="flex h-full w-full items-center justify-center">
        <ImageCarousel
          images={images}
          alt=""
          aspectRatio="h-full w-full"
          autoPlayInterval={0}
          showThumbnails
        />
      </div>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`size-2 rounded-full transition-all ${i === (current % images.length) ? "w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-white/40 hover:bg-white/60"}`} />
        ))}
      </div>
    </div>
  )
}

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)

  if (!auction) return null

  const images = auction.images || []
  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0
  const isEnding = seconds > 0 && seconds < 3600
  const isOver = seconds <= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("auctions")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{auction.name}</h1>
          <p className="text-sm font-medium text-neutral-500">{auction.category}</p>
        </div>
        {savings > 0 && (
          <span className="ml-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
            {savings}% off
          </span>
        )}
      </div>

      {lightboxOpen && <Lightbox images={images} idx={lightboxIdx} onClose={() => setLightboxOpen(false)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Image Gallery ── */}
        <div className="lg:col-span-3">
          {images.length > 0 ? (
            <ImageCarousel
              images={images}
              alt={auction.name}
              aspectRatio="aspect-[4/3]"
              autoPlayInterval={4000}
              showThumbnails
              onImageClick={(i) => { setLightboxIdx(i); setLightboxOpen(true) }}
              overlay={
                <div className="absolute top-3 left-3 z-10 flex gap-2 pointer-events-none">
                  <Badge tone="green"><span className="size-1.5 rounded-full bg-emerald-500" /> Live</Badge>
                </div>
              }
            />
          ) : (
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-b from-neutral-100 via-neutral-50 to-white border border-border/60 flex items-center justify-center">
              <p className="text-sm font-medium text-neutral-400">No images available</p>
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {/* Countdown */}
            <div className={`rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5 ${
              isEnding
                ? "bg-gradient-to-br from-primary/90 via-awash-gold-dark to-amber-800"
                : isOver
                ? "bg-gradient-to-br from-neutral-600 to-neutral-800"
                : "bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224]"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {isOver ? "Auction Ended" : isEnding ? "Ending Soon" : "Time Left"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                  <Users className="size-3.5" /> {auction.uniqueBidders || auction.bidders} bidders
                </span>
              </div>
              <div className="mt-2 flex justify-center"><Countdown seconds={seconds} size="md" /></div>
              {isEnding && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-white" />
                  <span className="text-[11px] font-semibold text-white">Deadline approaching — place your bid now!</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-white/70 backdrop-blur-sm p-4 shadow-[0_4px_16px_rgba(0,43,92,0.04)] transition-all hover:shadow-md hover:-translate-y-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400"><Tag className="size-3.5" /> Market Price</span>
                <p className="mt-1 font-display text-lg font-extrabold text-foreground">{CURRENCY} {formatETB(auction.marketPrice)}</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 backdrop-blur-sm p-4 shadow-[0_4px_16px_rgba(200,166,66,0.06)] transition-all hover:shadow-[0_8px_24px_rgba(200,166,66,0.1)] hover:-translate-y-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-awash-gold-dark"><Ticket className="size-3.5" /> Bid Fee</span>
                <p className="mt-1 font-display text-lg font-extrabold text-gradient-gold">{CURRENCY} {formatETB(auction.bidFee)}</p>
              </div>
            </div>

            {/* Bid Progress */}
            {auction.maxBid && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-400">Bid Progress</span>
                  <span className="text-xs font-semibold text-neutral-400">{auction.totalBids || auction.bidders}/{auction.maxBid}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) * 100}%`, backgroundColor: (auction.totalBids || auction.bidders) / auction.maxBid > 0.8 ? "#C8A642" : "#10B981" }}
                  />
                </div>
              </div>
            )}

            {/* Extension Risk */}
            {auction.minBid != null && (auction.totalBids || auction.bidders) < auction.minBid && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 animate-slide-up">
                <Bell className="size-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs font-medium text-amber-800">Only {(auction.totalBids || auction.bidders)}/{auction.minBid} bids — auction may extend</p>
              </div>
            )}

            {/* Highlights */}
            {auction.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {auction.highlights.map((h) => (
                  <div key={h} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-all hover:shadow-sm hover:-translate-y-0.5">
                    <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                    <span className="text-xs font-semibold text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {auction.description && (
              <div>
                <h2 className="font-display text-sm font-bold text-foreground">About this product</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{auction.description}</p>
              </div>
            )}

            {/* How it works */}
            <div className="flex items-start gap-2.5 rounded-xl bg-awash-blue/5 backdrop-blur-sm p-3.5 border border-awash-blue/10 transition-all hover:bg-awash-blue/10">
              <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-awash-gold" />
              <p className="text-xs font-medium leading-relaxed text-foreground/80">
                Place the <span className="font-bold text-awash-gold-dark">lowest unique bid</span> — the smallest amount that no one else has chosen — to win.
              </p>
            </div>

            {/* CTA */}
            <button onClick={() => go("pay-fee")} className="btn-primary animate-shine group">
              <Gavel className="size-4 group-hover:scale-110 transition-transform" />
              Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
            </button>
            </div>
          </div>
      </div>
    </motion.div>
  )
}

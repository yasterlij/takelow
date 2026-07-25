import { useState, useEffect } from "react"
import { Users, Tag, Ticket, CheckCircle2, TrendingDown, ImageIcon, ChevronLeft, ChevronRight, X, ZoomIn, Trophy, Bell, Gavel, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { Card, Badge } from "../components/AuctionUI"
import { Countdown, useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"

function ProductImage({ src, alt, onClick }: { src?: string; alt: string; onClick?: () => void }) {
  const [err, setErr] = useState(false)
  if (err || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-50 gap-2">
        <ImageIcon className="size-10 text-neutral-300/30" />
        <span className="text-xs font-medium text-neutral-300/40">{alt}</span>
      </div>
    )
  }
  return (
    <button onClick={onClick} className="h-full w-full cursor-zoom-in">
      <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-contain transition-transform duration-500" />
    </button>
  )
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><X className="size-6" /></button>
      <div className="flex h-full w-full items-center justify-center px-16">
        {images.length > 1 && (
          <button onClick={() => setCurrent((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"><ChevronLeft className="size-6" /></button>
        )}
        <img src={images[current]} alt="" loading="lazy" decoding="async" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
        {images.length > 1 && <button onClick={() => setCurrent((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"><ChevronRight className="size-6" /></button>}
      </div>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={`size-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "bg-white/40"}`} />)}
      </div>
    </div>
  )
}

export function ProductScreen() {
  const { go, selectedId, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const seconds = useCountdown(auction?.timeLeft ?? 0)
  const [imgIdx, setImgIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!auction) return null

  const images = auction.images || []
  const savings = auction.marketPrice > 0 ? Math.round((1 - auction.bidFee / auction.marketPrice) * 100) : 0
  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0
  const isExtensionRisk = auction.minBid != null && (auction.totalBids || auction.bidders) < auction.minBid

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("auctions")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{auction.name}</h1>
          <p className="text-sm font-medium text-neutral-500">{auction.category}</p>
        </div>
      </div>

      {lightboxOpen && <Lightbox images={images} idx={imgIdx} onClose={() => setLightboxOpen(false)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Image ── */}
        <div className="lg:col-span-3">
          <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-100 via-neutral-50 to-white border border-border/60 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
            <ProductImage src={images[imgIdx]} alt={auction.name} onClick={() => images[0] && setLightboxOpen(true)} />
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"><ZoomIn className="size-4" /></div>
            {images.length > 1 && (
              <>
                <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"><ChevronLeft className="size-4" /></button>
                <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"><ChevronRight className="size-4" /></button>
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {images.map((_, i) => <button key={i} onClick={() => setImgIdx(i)} className={`size-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-white" : "bg-white/50"}`} />)}
                </div>
              </>
            )}
            <div className="absolute right-3 top-3"><Badge tone="green"><span className="size-1.5 rounded-full bg-emerald-500" /> Live</Badge></div>
            {savings > 0 && <div className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-lg">{savings}% off</div>}
          </div>
        </div>

        {/* ── Details ── */}
        <div className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {/* Countdown */}
            <div className="rounded-2xl bg-gradient-to-br from-awash-blue via-awash-blue-dark to-[#001224] p-5 text-white shadow-[0_8px_32px_rgba(0,43,92,0.2)] border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {seconds <= 0 ? "Auction Ended" : seconds < 3600 ? "Ending Soon" : "Time Left"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70">
                  <Users className="size-3.5" /> {auction.uniqueBidders || auction.bidders} bidders
                </span>
              </div>
              <div className="mt-2 flex justify-center"><Countdown seconds={seconds} size="md" /></div>
              {seconds > 0 && seconds < 3600 && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="inline-block size-1.5 animate-pulse rounded-full bg-awash-gold" />
                  <span className="text-[11px] font-semibold text-awash-gold">Deadline approaching — place your bid now!</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-white/70 backdrop-blur-sm p-4 shadow-[0_4px_16px_rgba(0,43,92,0.04)]">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400"><Tag className="size-3.5" /> Market Price</span>
                <p className="mt-1 font-display text-lg font-extrabold text-foreground">{CURRENCY} {formatETB(auction.marketPrice)}</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 backdrop-blur-sm p-4 shadow-[0_4px_16px_rgba(200,166,66,0.06)]">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-awash-gold-dark"><Ticket className="size-3.5" /> Bid Fee</span>
                <p className="mt-1 font-display text-lg font-extrabold text-gradient-gold">{CURRENCY} {formatETB(auction.bidFee)}</p>
              </div>
            </div>

            {/* Progress */}
            {auction.maxBid && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-400">Bid Progress</span>
                  <span className="text-xs font-semibold text-neutral-400">{auction.totalBids || auction.bidders}/{auction.maxBid}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#C8A642" : "#10B981" }} />
                </div>
              </div>
            )}

            {/* Extension Risk */}
            {isExtensionRisk && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <Bell className="size-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs font-medium text-amber-800">Only {(auction.totalBids || auction.bidders)}/{auction.minBid} bids — auction may extend</p>
              </div>
            )}

            {/* Description */}
            <div>
              <h2 className="font-display text-sm font-bold text-foreground">About this product</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{auction.description}</p>
            </div>

            {/* Highlights */}
            <div className="flex flex-wrap gap-2">

              {auction.highlights.map((h) => (
                <div key={h} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{h}</span>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="flex items-start gap-2.5 rounded-xl bg-awash-blue/5 backdrop-blur-sm p-3.5 border border-awash-blue/10">
              <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-awash-gold" />
              <p className="text-xs font-medium leading-relaxed text-foreground/80">
                Place the <span className="font-bold text-awash-gold-dark">lowest unique bid</span> — the smallest amount that no one else has chosen — to win.
              </p>
            </div>

            {/* CTA */}
            <button onClick={() => go("pay-fee")}
              className="btn-primary">
              <Gavel className="size-4" />
              Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

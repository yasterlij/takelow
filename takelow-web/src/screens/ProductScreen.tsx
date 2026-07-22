import { useState, useEffect } from "react"
import { Users, Tag, Ticket, CheckCircle2, TrendingDown, ImageIcon, ChevronLeft, ChevronRight, X, ZoomIn, Trophy, Bell } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, PhoneStatusBar, CTAButton, Card, Badge } from "../components/AuctionUI"
import { Countdown, useCountdown } from "../components/Countdown"
import { CURRENCY, formatETB } from "../mockDataV0"

function ProductImage({ src, alt, onClick }: { src?: string; alt: string; onClick?: () => void }) {
  const [err, setErr] = useState(false)
  if (err || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted gap-2">
        <ImageIcon className="size-10 text-muted-foreground/30" />
        <span className="text-xs font-medium text-muted-foreground/40">{alt}</span>
      </div>
    )
  }
  return (
    <button onClick={onClick} className="h-full w-full cursor-zoom-in">
      <img src={src} alt={alt} onError={() => setErr(true)} className="h-full w-full object-contain transition-transform duration-500" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><X className="size-6" /></button>
      <div className="flex h-full w-full items-center justify-center px-16">
        {images.length > 1 && (
          <button onClick={() => setCurrent((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"><ChevronLeft className="size-6" /></button>
        )}
        <img src={images[current]} alt="" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
        {images.length > 1 && (
          <button onClick={() => setCurrent((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"><ChevronRight className="size-6" /></button>
        )}
      </div>
      <div className="absolute bottom-6 flex gap-2">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`size-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "bg-white/40"}`} />
        ))}
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
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
      <AppBar title="Product Details" onBack={() => go("auctions")} />
      {lightboxOpen && <Lightbox images={images} idx={imgIdx} onClose={() => setLightboxOpen(false)} />}
      <div className="flex-1 pb-28">
        <div className="group relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-b from-secondary to-muted">
          <ProductImage src={images[imgIdx]} alt={auction.name} onClick={() => images[0] && setLightboxOpen(true)} />
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"><ZoomIn className="size-4" /></div>
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"><ChevronRight className="size-4" /></button>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`size-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          <div className="absolute right-3 top-3"><Badge tone="green"><span className="size-1.5 rounded-full bg-emerald-500" /> Live</Badge></div>
          {savings > 0 && <div className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">{savings}% off</div>}
        </div>
        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge tone="navy">{auction.category}</Badge>
              <h1 className="mt-2 font-display text-xl font-extrabold text-navy text-balance">{auction.name}</h1>
            </div>
          </div>

          {auction.maxBid && (
            <div className="mt-3">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground">Bid Progress</span>
                <span className="text-[10px] font-semibold text-muted-foreground">{auction.totalBids || auction.bidders}/{auction.maxBid}</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${bidProgress * 100}%`, backgroundColor: bidProgress > 0.8 ? "#F27A18" : "#10B981" }} />
              </div>
            </div>
          )}

          {isExtensionRisk && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
              <Bell className="size-4 text-amber-600 flex-shrink-0" />
              <p className="text-[10px] font-medium text-amber-800">
                Only {(auction.totalBids || auction.bidders)}/{auction.minBid} bids — auction may extend if under minimum
              </p>
            </div>
          )}

          <Card className="mt-4 overflow-hidden border-0 bg-gradient-to-r from-navy to-blue-900 p-4 text-white">
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
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
                <span className="text-[11px] font-semibold text-primary">Deadline approaching — place your bid now!</span>
              </div>
            )}
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Card className="p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Tag className="size-3.5" /> Market Price</span>
              <p className="mt-1 font-display text-lg font-extrabold text-navy">{CURRENCY} {formatETB(auction.marketPrice)}</p>
            </Card>
            <Card className="border-primary/30 bg-accent p-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground"><Ticket className="size-3.5" /> Bid Fee</span>
              <p className="mt-1 font-display text-lg font-extrabold text-primary">{CURRENCY} {formatETB(auction.bidFee)}</p>
            </Card>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-navy/5 p-3">
            <TrendingDown className="mt-0.5 size-[18px] flex-shrink-0 text-primary" />
            <p className="text-xs font-medium leading-relaxed text-navy/80">
              Place the <span className="font-bold">lowest unique bid</span> — the smallest amount that no one else has chosen — to win this product.
            </p>
          </div>

          <div className="mt-5">
            <h2 className="font-display text-sm font-bold text-navy">About this product</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{auction.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {auction.numWinners && auction.numWinners > 1 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2">
                <Trophy className="size-4 text-primary" />
                <span className="text-xs font-semibold text-navy">{auction.numWinners} winners</span>
              </div>
            )}
            {auction.highlights.map((h) => (
              <div key={h} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <CheckCircle2 className="size-4 flex-shrink-0 text-primary" />
                <span className="text-xs font-semibold text-navy">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => go("pay-fee")}>
          Place a Bid · {CURRENCY} {formatETB(auction.bidFee)} fee
        </CTAButton>
      </div>
    </div>
  )
}

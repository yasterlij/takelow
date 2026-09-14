import { Eye } from "lucide-react"
import { Badge } from "./AuctionUI"
import { ImageCarousel } from "./ImageCarousel"
import type { Auction, ProductSpecs } from "../mockDataV0"

export function ProductHeroSection({
  auction,
  images,
  auctionCode,
  countdown,
  isEnding,
  isOver,
  specEntries,
  showSpecs,
  onToggleSpecs,
  onOpenLightbox,
}: {
  auction: Auction
  images: string[]
  auctionCode: string
  countdown: { d: string; h: string; m: string; s: string }
  isEnding: boolean
  isOver: boolean
  specEntries: Array<{ key: keyof ProductSpecs; label: string; value: string }>
  showSpecs: boolean
  onToggleSpecs: () => void
  onOpenLightbox: (index: number) => void
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/50 bg-white">
      <div className="relative">
        {images.length > 0 ? (
          <ImageCarousel
            images={images}
            alt={auction.name}
            aspectRatio="aspect-[4/3]"
            autoPlayInterval={4000}
            showThumbnails
            onImageClick={onOpenLightbox}
          />
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center bg-neutral-100">
            <p className="text-sm font-medium text-neutral-400">No images available</p>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Badge tone="green">Live</Badge>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-ink backdrop-blur-sm">
            <Eye className="size-4 text-awash-blue" /> {auction.totalBids || auction.bidders} bids
          </span>
        </div>
      </div>

      <div className="border-t border-border/50 bg-white p-5 sm:p-6">
        <div className="space-y-5">
          <section className="rounded-2xl bg-ink p-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">About this product</p>
            <h2 className="mt-2 font-display text-lg font-semibold tracking-[-0.022em] text-white">{auction.name}</h2>
            {auction.specSummary ? <p className="mt-1 text-sm font-normal text-white/80">{auction.specSummary}</p> : null}
            {auction.description ? <p className="mt-3 text-sm leading-relaxed text-white/70">{auction.description}</p> : null}
          </section>

          <div className="flex items-stretch gap-2">
            <div className="min-w-0 flex-1 rounded-2xl bg-ink px-2.5 py-2.5 text-white">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">{isOver ? "Auction Ended" : isEnding ? "Ending Soon" : "Time Left"}</p>
              <p className={`mt-1 truncate font-display text-[22px] font-semibold tabular-nums ${isEnding ? "text-[#D4B85E]" : "text-white"}`}>
                {countdown.d !== "00" ? `${parseInt(countdown.d, 10)}d ` : ""}
                {countdown.h}:{countdown.m}:{countdown.s}
              </p>
            </div>
            <div className="w-[112px] shrink-0 rounded-2xl bg-ink px-2.5 py-2.5 text-white sm:w-[118px]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">Auction Code</p>
              <p className="mt-1 truncate font-display text-[18px] font-semibold tracking-[0.1em] text-white">{auctionCode}</p>
            </div>
          </div>

          {specEntries.length > 0 && (
            <section className="rounded-2xl bg-canvas p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Product specifications</p>
                <button onClick={onToggleSpecs} className="rounded-full px-3 py-1 text-[11px] font-semibold text-awash-gold-dark transition-colors hover:bg-awash-gold/10">
                  {showSpecs ? "Show less" : "View more"}
                </button>
              </div>
              {showSpecs && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {specEntries.map((entry) => (
                    <div key={entry.key} className="rounded-xl bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">{entry.label}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{entry.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  )
}

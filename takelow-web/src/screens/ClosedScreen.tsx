import { useEffect, useState } from "react"
import { Gavel, Trophy, Shield, Loader2, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { ConfettiOverlay } from "../components/AuctionUI"
import { api } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function ClosedScreen() {
  const { go, selectedId, user, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const isAdmin = user?.role === "admin"
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + 4
      })
    }, 90)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => { setDone(true); setShowConfetti(true) }, 500)
      return () => clearTimeout(t)
    }
  }, [progress])

  useEffect(() => {
    if (showConfetti) {
      const t = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(t)
    }
  }, [showConfetti])

  const handleReveal = async () => {
    setRevealing(true)
    try {
      await api.closeAuction(selectedId!)
      go("winner")
    } catch {
      go("winner")
    } finally {
      setRevealing(false)
    }
  }

  if (!auction) return null

  const savings = Math.round((1 - auction.bidFee / auction.marketPrice) * 100)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-16">
      {/* ── Back ── */}
      <div className="flex w-full items-center">
        <button onClick={() => go("home")} className="flex size-10 items-center justify-center rounded-xl border border-border bg-white text-awash-blue hover:bg-neutral-50 transition-colors">
          <ArrowLeft className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-col items-center text-center max-w-md">
        {showConfetti && <ConfettiOverlay show={true} />}

        <div className={`relative flex size-28 items-center justify-center rounded-full shadow-lg transition-all duration-700 ${
          done ? "bg-gradient-to-br from-primary to-awash-gold-light shadow-gold-glow-lg animate-breathe" : "bg-awash-blue shadow-blue-glow"
        }`}>
          {done ? <Trophy className="size-14 text-primary-foreground" /> : <Gavel className="size-14 text-primary" />}
        </div>
        {done && (
          <span className="absolute right-0 top-0 flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg animate-scale-in">
            <CheckCircle2 className="size-5" />
          </span>
        )}

        <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">
          {done ? "Auction Closed!" : "Closing Auction..."}
        </h1>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-awash-blue/10 px-4 py-2 border border-awash-blue/20">
          <Gavel className="size-4 text-awash-blue" />
          <span className="text-sm font-bold text-awash-blue">{auction.name}</span>
        </div>

        <div className="mt-8 w-full max-w-sm">
          {done ? (
            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-sm font-bold text-primary border border-primary/20">
                <Sparkles className="size-4" /> Result Ready
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Bid Fee</p>
                  <p className="font-display text-xl font-extrabold text-primary">{CURRENCY} {formatETB(auction.bidFee)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Savings</p>
                  <p className="font-display text-xl font-extrabold text-emerald-600">{savings}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Bidders</p>
                  <p className="font-display text-xl font-extrabold text-awash-blue">{auction.totalBids || auction.bidders}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full h-2.5 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-awash-gold-light transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs font-semibold tabular-nums text-neutral-400">Analyzing bids... {progress}%</p>
              <div className="flex items-center gap-2 rounded-xl bg-awash-gold-bg border border-primary/20 p-3">
                <Loader2 className="size-4 animate-spin text-primary" />
                <p className="text-xs font-medium text-primary">Finding the lowest unique bid...</p>
              </div>
            </div>
          )}
        </div>

        {done && !isAdmin && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 max-w-sm">
            <Shield className="mt-0.5 size-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">Results are being reviewed by the admin. You will be notified once the winner is declared.</p>
          </div>
        )}

        {done && isAdmin && (
          <div className="mt-6 flex items-center gap-2 rounded-full bg-awash-blue/10 px-4 py-2 border border-awash-blue/20">
            <Shield className="size-4 text-awash-blue" />
            <p className="text-sm font-semibold text-awash-blue">Close to draw and reveal the winner</p>
          </div>
        )}

        <div className="mt-8 w-full max-w-sm">
          {isAdmin ? (
            <button disabled={!done || revealing} onClick={handleReveal}
              className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold tracking-wide transition-all active:translate-y-px focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 ${
                done ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/30" : "bg-neutral-100 text-neutral-400"
              }`}>
              {revealing ? <><Loader2 className="size-4 animate-spin" /> Closing & Drawing...</> : done ? <><Trophy className="size-4" /> Reveal Winner</> : "Determining..."}
            </button>
          ) : (
            <button onClick={() => go("home")}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold tracking-wide text-foreground transition-all hover:bg-neutral-50 active:scale-[0.98]">
              <ArrowLeft className="size-4" /> Back to Home
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

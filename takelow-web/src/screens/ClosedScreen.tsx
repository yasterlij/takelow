import { useEffect, useState } from "react"
import { Gavel, Trophy, Shield, Loader2 } from "lucide-react"
import { useApp } from "../AppContext"
import { PhoneStatusBar, CTAButton } from "../components/AuctionUI"
import { api } from "../api"

export function ClosedScreen() {
  const { go, selectedId, user, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const isAdmin = user?.role === "admin"
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [revealing, setRevealing] = useState(false)

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
      const t = setTimeout(() => setDone(true), 500)
      return () => clearTimeout(t)
    }
  }, [progress])

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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden">
        <PhoneStatusBar dark />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-navy text-primary shadow-lg">
          {done ? <Trophy className="size-10" /> : <Gavel className="size-10" />}
        </span>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Auction Closed</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
          {done
            ? `${auction.name} has ended.${isAdmin ? " The lowest unique bid has been determined." : ""}`
            : "Finding the lowest unique bid..."}
        </p>
        <div className="mt-6 w-full max-w-xs">
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-100 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold tabular-nums text-muted-foreground">
            {done ? "Result ready" : `Analyzing bids... ${progress}%`}
          </p>
        </div>
        {done && !isAdmin && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 max-w-xs">
            <Shield className="mt-0.5 size-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">
              Results are being reviewed by the admin. You will be notified once the winner is declared.
            </p>
          </div>
        )}
        {done && isAdmin && (
          <p className="mt-6 max-w-xs text-sm font-semibold text-navy">
            Close the auction to draw and reveal the winner.
          </p>
        )}
      </div>
      <div className="border-t border-border bg-card p-4">
        {isAdmin ? (
          <CTAButton disabled={!done || revealing} onClick={handleReveal}>
            {revealing ? <><Loader2 className="size-4 animate-spin" /> Closing & Drawing...</> : done ? "Reveal Winner" : "Determining..."}
          </CTAButton>
        ) : (
          <CTAButton variant="outline" onClick={() => go("home")}>Back to Home</CTAButton>
        )}
      </div>
    </div>
  )
}
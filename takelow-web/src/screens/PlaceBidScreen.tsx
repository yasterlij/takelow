import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, TrendingDown, CheckCircle2, Loader2, AlertCircle, Target, Minus, Plus } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { useForm } from "../hooks/useForm"
import { placeBidSchema, type PlaceBidValues } from "../lib/validation"
import { CURRENCY } from "../mockDataV0"

export function PlaceBidScreen() {
  const { go, selectedId, submitBid, getAuction, authError } = useApp()
  const auction = getAuction(selectedId)
  const [bidStr, setBidStr] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const STEP = 0.01

  const form = useForm<PlaceBidValues>(placeBidSchema, { amount: 0 })

  const adjustAmount = useCallback((delta: number) => {
    const current = form.values.amount
    const next = Math.max(1, +(current + delta).toFixed(2))
    setBidStr(next.toFixed(2))
    form.handleChange("amount", next)
    setSubmitError(null)
  }, [form])

  if (!auction) return null

  const onSubmit = async (values: PlaceBidValues) => {
    setLoading(true)
    setSubmitError(null)
    try {
      await submitBid(values.amount)
    } catch (e: any) {
      setSubmitError(e?.message || "Bid submission failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const bidProgress = auction.maxBid ? Math.min((auction.totalBids || auction.bidders) / auction.maxBid, 1) : 0
  const isUrgent = bidProgress > 0.8

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      <AppBar title="Place Your Bid" onBack={() => go("pay-fee")} />
      <div className="flex-1 px-5 pb-20 lg:pb-6 pt-5">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3"
        >
          <CheckCircle2 className="size-[18px] shrink-0 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700">Bid fee paid. You're in the auction for {auction.name}!</p>
        </motion.div>

        <div className="mt-3 flex flex-wrap gap-2">
          {auction.maxBid && (
            <span className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary">Max {auction.maxBid} bids</span>
          )}
          {auction.minBid && (
            <span className="inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-primary">Min {auction.minBid} bids</span>
          )}
        </div>

        {auction.maxBid && (
          <div className="mt-3 rounded-lg border border-border bg-card p-2.5">
            <div className="mb-1 flex justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground">Total bids: {auction.totalBids || auction.bidders}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Capacity: {auction.maxBid}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${bidProgress * 100}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: isUrgent ? "#F27A18" : "#10B981" }}
              />
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <h2 className="font-display text-lg font-extrabold text-navy">Enter your bid amount</h2>
          <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-muted-foreground">
            Your bid must be a unique lowest amount to win.
          </p>
        </div>

        <Card className="mt-5 p-5">
          <div className="flex items-end justify-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustAmount(-STEP)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-secondary text-navy transition-all active:scale-90 active:border-primary active:bg-primary/10 hover:border-primary/50"
              aria-label="Decrease bid amount"
            >
              <Minus className="size-5" />
            </button>

            <div className="relative">
              <input
                value={bidStr}
                onChange={(e) => {
                  const raw = e.target.value
                  const clean = raw
                   .replace(/[^0-9.]/g, "")
                   .replace(/(\..*)\./g, "$1")
                   .replace(/^(\d*\.?\d{0,2}).*/, "$1")
                   .slice(0, 8)
                  setBidStr(clean)
                  form.handleChange("amount", clean ? +clean : 0)
                  setSubmitError(null)
                }}
                onBlur={() => {
                  const num = form.values.amount
                  setBidStr(num > 0 ? num.toFixed(2) : "")
                  form.handleBlur("amount")
                }}
                onKeyDown={(e) => e.key === "Enter" && form.handleSubmit(onSubmit)}
               aria-label="Bid amount"
               placeholder="0.00"
               className={`w-36 rounded-xl border-2 bg-secondary px-3 py-3 text-center font-display text-4xl font-extrabold text-navy outline-none transition-all focus:ring-2 tabular-nums ${
                 form.errors.amount && form.touched.amount
                   ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                   : "border-border focus:border-primary focus:ring-primary/20"
               }`}
              />
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground">{CURRENCY}</span>
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-100 px-1.5 py-[1px] text-[9px] font-bold text-amber-700">Min 1.00</span>
            </div>

            <button
              type="button"
              onClick={() => adjustAmount(STEP)}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-secondary text-navy transition-all active:scale-90 active:border-primary active:bg-primary/10 hover:border-primary/50"
              aria-label="Increase bid amount"
            >
              <Plus className="size-5" />
            </button>
          </div>

          <AnimatePresence>
            {form.errors.amount && form.touched.amount && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-destructive"
              >
                <AlertCircle className="size-3" />
                {form.errors.amount}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2">
            <TrendingDown className="size-4 text-primary" />
            <span className="text-xs font-semibold text-accent-foreground">Lower & unique = better chance to win</span>
          </div>

          {/* Bid preview */}
          <AnimatePresence>
            {form.values.amount > 0 && !form.errors.amount && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Target className="size-3.5" />
                  Your bid
                </span>
                <span className="font-display text-lg font-extrabold tabular-nums text-primary">
                  {CURRENCY} {form.values.amount.toFixed(2)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-navy/5 p-3">
          <Sparkles className="mt-0.5 size-[18px] shrink-0 text-primary" />
          <p className="text-xs font-medium leading-relaxed text-navy/80">
            The winner is the person with the <span className="font-bold">lowest bid that nobody else picked</span>. Choose an unexpected amount!
          </p>
        </div>

        <AnimatePresence>
          {(submitError || authError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-3"
            >
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-xs font-semibold text-destructive">{submitError || authError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton disabled={loading || !form.isValid} onClick={() => form.handleSubmit(onSubmit)}>
          {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit Bid"}
        </CTAButton>
      </div>
    </div>
  )
}

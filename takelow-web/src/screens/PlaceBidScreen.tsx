import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, TrendingDown, CheckCircle2, Loader2, AlertCircle, Target, Minus, Plus, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { useForm } from "../hooks/useForm"
import { placeBidSchema, type PlaceBidValues } from "../lib/validation"
import { CURRENCY, formatETB } from "../mockDataV0"

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("pay-fee")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Place Your Bid</h1>
          <p className="text-sm font-medium text-neutral-500">Choose the lowest unique amount to win</p>
        </div>
      </div>

      {/* ── Fee Paid Confirmation ── */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/60 p-3"
      >
        <CheckCircle2 className="size-[18px] shrink-0 text-emerald-600" />
        <p className="text-xs font-semibold text-emerald-700">Bid fee paid. You're in the auction for {auction.name}!</p>
      </motion.div>

      {/* ── Auction Info Chips ── */}
      <div className="flex flex-wrap gap-2">
        {auction.maxBid && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 border border-primary/20 px-2.5 py-1 text-[10px] font-semibold text-awash-gold-dark">Max {auction.maxBid} bids</span>
        )}
        {auction.minBid && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Min {auction.minBid} bids</span>
        )}
        <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-50 border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">{auction.totalBids || auction.bidders} bidders</span>
      </div>

      {/* ── Bid Progress ── */}
      {auction.maxBid && (
        <div className="rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm p-3">
          <div className="mb-1 flex justify-between">
            <span className="text-[10px] font-semibold text-neutral-400">Total bids: {auction.totalBids || auction.bidders}</span>
            <span className="text-[10px] font-semibold text-neutral-400">Capacity: {auction.maxBid}</span>
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

      {/* ── Bid Amount Section ── */}
      <div className="text-center">
        <h2 className="font-display text-lg font-extrabold text-foreground">Enter your bid amount</h2>
        <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-neutral-500">
          Your bid must be a unique lowest amount to win.
        </p>
      </div>

      {/* ── Bid Input Card ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(200,166,66,0.06)]">
        <div className="flex items-end justify-center gap-2">
          <button
            type="button"
            onClick={() => adjustAmount(-STEP)}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-primary/20 bg-white/80 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-90"
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
             className={`w-40 rounded-xl border-2 bg-white/80 px-3 py-3 text-center font-display text-4xl font-extrabold text-foreground outline-none transition-all focus:ring-2 tabular-nums ${
               form.errors.amount && form.touched.amount
                 ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                 : "border-primary/20 focus:border-primary focus:ring-primary/20"
             }`}
            />
            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-neutral-400">{CURRENCY}</span>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-100 border border-amber-200/50 px-1.5 py-[1px] text-[9px] font-bold text-amber-700">Min 1.00</span>
          </div>

          <button
            type="button"
            onClick={() => adjustAmount(STEP)}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-primary/20 bg-white/80 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-90"
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

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 px-3 py-2">
          <TrendingDown className="size-4 text-primary" />
          <span className="text-xs font-semibold text-awash-gold-dark">Lower & unique = better chance to win</span>
        </div>

        {/* ── Bid Preview ── */}
        <AnimatePresence>
          {form.values.amount > 0 && !form.errors.amount && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-awash-gold/10 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Target className="size-3.5" />
                Your bid
              </span>
              <span className="font-display text-lg font-extrabold text-gradient-gold tabular-nums">
                {CURRENCY} {form.values.amount.toFixed(2)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── How It Works ── */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-awash-blue/5 backdrop-blur-sm border border-awash-blue/10 p-3.5">
        <Sparkles className="mt-0.5 size-[18px] shrink-0 text-primary" />
        <p className="text-xs font-medium leading-relaxed text-foreground/80">
          The winner is the person with the <span className="font-bold text-awash-gold-dark">lowest bid that nobody else picked</span>. Choose an unexpected amount!
        </p>
      </div>

      {/* ── Errors ── */}
      <AnimatePresence>
        {(submitError || authError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3"
          >
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <p className="text-xs font-semibold text-destructive">{submitError || authError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit ── */}
      <button
        disabled={loading || !form.isValid}
        onClick={() => form.handleSubmit(onSubmit)}
        className="btn-primary animate-shine group"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit Bid"}
      </button>
    </motion.div>
  )
}

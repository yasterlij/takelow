import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Info, Loader2, Wallet, Building2, ChevronDown, ChevronUp, Sparkles, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { CURRENCY, formatETB } from "../mockDataV0"

const paymentMethods = [
  {
    id: "SIKINAPAY" as const,
    label: "SikinaPay",
    desc: "Pay via Mobile Money, USSD, or card",
    icon: ShieldCheck,
    gradient: "from-indigo-500/10 to-purple-500/5 border-indigo-200/50",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "AWASH" as const,
    label: "Awash Bank Wallet",
    desc: "Pay via Awash Bank payment gateway",
    icon: Building2,
    gradient: "from-awash-blue/10 to-awash-blue/5 border-awash-blue/20",
    iconBg: "bg-awash-blue/10 text-awash-blue",
  },
]

export function PayFeeScreen() {
  const { go, payFee, getAuction, selectedId, authError, paymentMethod, setPaymentMethod } = useApp()
  const auction = getAuction(selectedId)
  const [loading, setLoading] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH'>(paymentMethod === 'WALLET' ? 'SIKINAPAY' : paymentMethod as any)

  if (!auction) return null

  const handlePayClick = async () => {
    setPaymentMethod(selected)
    setLoading(true)
    try {
      await payFee(auction.bidFee, selected)
    } finally {
      setLoading(false)
    }
  }

  const SelectedIcon = paymentMethods.find((m) => m.id === selected)?.icon || ShieldCheck

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("product")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Pay Bid Fee</h1>
          <p className="text-sm font-medium text-neutral-500">Enter the auction with a non-refundable fee</p>
        </div>
      </div>

      {/* ── Fee Display ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 text-center shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">Bid Fee</span>
        <p className="mt-2 font-display text-4xl font-extrabold text-gradient-gold tabular-nums">{CURRENCY} {formatETB(auction.bidFee)}</p>
        <span className="mt-2 inline-block text-xs font-medium text-neutral-500">for {auction.name}</span>
      </motion.div>

      {/* ── Payment Method Selector ── */}
      <div>
        <button
          onClick={() => setShowMethods(!showMethods)}
          className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 text-left transition-all hover:bg-white hover:shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SelectedIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                {paymentMethods.find((m) => m.id === selected)?.label}
              </p>
              <p className="text-xs text-neutral-500">Change payment method</p>
            </div>
          </div>
          {showMethods ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
        </button>

        <AnimatePresence>
          {showMethods && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2 overflow-hidden"
            >
              <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-2">
                {paymentMethods.map((method) => {
                  const isActive = selected === method.id
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => { setSelected(method.id); setShowMethods(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 ${
                        isActive
                          ? "bg-primary/10 ring-1 ring-primary shadow-sm"
                          : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className={`flex size-10 items-center justify-center rounded-xl ${isActive ? method.iconBg : "bg-neutral-100 text-neutral-500"}`}>
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{method.label}</p>
                        <p className="text-xs text-neutral-500">{method.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info ── */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-awash-blue/5 backdrop-blur-sm border border-awash-blue/10 p-3.5">
        <Info className="mt-0.5 size-4 flex-shrink-0 text-awash-blue/60" />
        <p className="text-xs font-medium leading-relaxed text-foreground/70">
          The bid fee is non-refundable and confirms your participation. After payment, you will be able to place your unique bid.
        </p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500">
        <ShieldCheck className="size-4 text-emerald-600" />
        Secured by {paymentMethods.find((m) => m.id === selected)?.label}
      </div>

      {authError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">{authError}</p>
        </div>
      )}

      {/* ── CTA ── */}
      <button
        onClick={handlePayClick}
        disabled={loading}
        className="btn-primary animate-shine group"
      >
        {loading ? (
          <Loader2 className="size-[18px] animate-spin" />
        ) : selected === "SIKINAPAY" ? (
          <ShieldCheck className="size-[18px] group-hover:scale-110 transition-transform" />
        ) : (
          <Wallet className="size-[18px] group-hover:scale-110 transition-transform" />
        )}
        {loading
          ? "Processing..."
          : `Pay ${CURRENCY} ${formatETB(auction.bidFee)} with ${paymentMethods.find((m) => m.id === selected)?.label}`}
      </button>
    </motion.div>
  )
}

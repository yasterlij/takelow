import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, ShieldCheck, Wallet, Building2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ArrowLeft, Trophy, Sparkles } from "lucide-react"
import { useApp } from "../AppContext"
import { CURRENCY, formatETB } from "../mockDataV0"

const methods = [
  { id: "WALLET" as const, label: "Wallet", desc: "Pay instantly from your wallet balance", icon: Wallet, gradient: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/50" },
  { id: "SIKINAPAY" as const, label: "SikinaPay", desc: "Pay via Mobile Money, USSD, or card", icon: ShieldCheck, gradient: "from-indigo-500/10 to-purple-500/5 border-indigo-200/50" },
  { id: "AWASH" as const, label: "Awash Bank", desc: "Pay via Awash Bank secure checkout", icon: Building2, gradient: "from-awash-blue/10 to-awash-blue/5 border-awash-blue/20" },
]

export function PayWinningScreen() {
  const { go, selectedId, userBid, payWinning, getAuction, authError, paymentMethod, setPaymentMethod, walletBalance } = useApp()
  const auction = getAuction(selectedId)
  const [showMethods, setShowMethods] = useState(false)
  const [customerPhone, setCustomerPhone] = useState("")
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH' | 'WALLET'>(paymentMethod)
  const [paying, setPaying] = useState(false)

  if (!auction) return null

  const amount = userBid ?? 0
  const deadlineHrs = 24
  const deadlineMins = 1440
  const urgent = deadlineHrs < 6
  const hasSufficientBalance = walletBalance >= amount
  const SelectedIcon = methods.find((m) => m.id === selected)?.icon || Wallet

  const handlePay = async () => {
    setPaying(true)
    setPaymentMethod(selected)
    await payWinning(amount, selected, selected === 'AWASH' ? customerPhone || undefined : undefined)
    setPaying(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col gap-6 pb-8"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => go("winner")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Pay Winning Amount</h1>
          <p className="text-sm font-medium text-neutral-500">Claim your prize by completing payment</p>
        </div>
      </div>

      {/* ── Urgency Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 rounded-xl p-3 ${
          urgent ? "bg-red-50 border border-red-200" : "bg-gradient-to-br from-awash-gold/10 to-awash-gold-light/5 border border-primary/20"
        }`}
      >
        <Clock className={`size-[18px] flex-shrink-0 ${urgent ? "text-red-500 animate-pulse" : "text-primary"}`} />
        <p className={`text-xs font-semibold ${urgent ? "text-red-700" : "text-foreground/80"}`}>
          Complete payment within <strong>{deadlineHrs}h {deadlineMins % 60}m</strong> to claim your prize.
        </p>
      </motion.div>

      {/* ── Winning Amount ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-br from-awash-gold/10 via-awash-gold-light/5 to-white/50 backdrop-blur-sm p-6 text-center shadow-[0_4px_20px_rgba(200,166,66,0.06)]"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="size-4 text-awash-gold" />
          <span className="text-xs font-semibold uppercase tracking-wide text-awash-gold-dark">Winning Bid</span>
        </div>
        <p className="mt-1 font-display text-4xl font-extrabold text-gradient-gold tabular-nums">{formatETB(amount)} {CURRENCY}</p>
        <span className="mt-2 inline-block text-xs font-medium text-neutral-500">for {auction.name}</span>
      </motion.div>

      {/* ── Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 shadow-sm"
      >
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">Winning amount</span>
          <span className="font-semibold text-foreground">{CURRENCY} {formatETB(amount)}</span>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-neutral-500">Delivery</span>
          <span className="font-semibold text-emerald-600">Free ✓</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-border/60 pt-3">
          <span className="text-sm font-bold text-foreground">Total</span>
          <span className="font-display text-sm font-extrabold text-gradient-gold">{CURRENCY} {formatETB(amount)}</span>
        </div>
      </motion.div>

      {/* ── Wallet Balance ── */}
      <AnimatePresence>
        {selected === "WALLET" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border p-4 ${
              hasSufficientBalance ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/80"
            }`}
          >
            <div className="flex items-start gap-3">
              {hasSufficientBalance ? (
                <CheckCircle2 className="size-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-bold text-foreground">Wallet Balance</p>
                <p className={`text-lg font-extrabold tabular-nums ${hasSufficientBalance ? "text-emerald-700" : "text-amber-700"}`}>
                  {CURRENCY} {formatETB(walletBalance)}
                </p>
                <p className="mt-1 text-xs font-medium text-neutral-500">
                  {hasSufficientBalance
                    ? "You have enough balance to pay directly from your wallet."
                    : `Insufficient balance. You need ${CURRENCY} ${formatETB(amount - walletBalance)} more.`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Payment Method ── */}
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
                {methods.find((m) => m.id === selected)?.label}
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
              className="mt-2 overflow-hidden"
            >
              <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-2">
                {methods.map((method) => {
                  const isActive = selected === method.id
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => { setSelected(method.id); setShowMethods(false) }}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-300 ${
                        isActive ? "bg-primary/10 ring-1 ring-primary shadow-sm" : "hover:bg-neutral-50"
                      }`}
                    >
                      <span className={`flex size-10 items-center justify-center rounded-xl ${isActive ? "bg-primary/20 text-primary" : "bg-neutral-100 text-neutral-500"}`}>
                        <Icon className="size-5" />
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{method.label}</p>
                        <p className="text-xs text-neutral-500">{method.desc}</p>
                      </div>
                      {method.id === "WALLET" && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{CURRENCY} {formatETB(walletBalance)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Phone Input for Awash ── */}
      <AnimatePresence>
        {selected === "AWASH" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-xs font-semibold text-neutral-500">Phone Number (optional)</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+251..."
              className="input-full mt-1"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Method Info ── */}
      <AnimatePresence>
        {selected === "SIKINAPAY" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm border border-primary/20 p-4"
          >
            <ShieldCheck className="mt-0.5 size-5 flex-shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">SikinaPay Checkout</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-neutral-500">
                Complete your payment securely within the app using SikinaPay checkout via Mobile Money, USSD, or card.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {authError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-xs font-semibold text-destructive">{authError}</p>
        </div>
      )}

      {/* ── CTA ── */}
      <button
        onClick={handlePay}
        disabled={paying || (selected === "WALLET" && !hasSufficientBalance)}
        className="btn-primary animate-shine group"
      >
        {paying ? (
          "Processing..."
        ) : selected === "WALLET" ? (
          <><Wallet className="size-[18px] group-hover:scale-110 transition-transform" /> Pay from Wallet</>
        ) : selected === "SIKINAPAY" ? (
          <><ShieldCheck className="size-[18px] group-hover:scale-110 transition-transform" /> Pay with SikinaPay</>
        ) : (
          <><Building2 className="size-[18px] group-hover:scale-110 transition-transform" /> Pay with Awash Bank</>
        )}
      </button>
    </motion.div>
  )
}

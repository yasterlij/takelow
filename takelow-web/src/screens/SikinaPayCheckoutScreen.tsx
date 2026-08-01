import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion } from "framer-motion"
import { X, Check, ArrowLeft, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react"
import { useApp } from "../AppContext"
import { api, openSikinaPopup, closeSikinaPopup, isSikinaPopupOpen } from "../api"
import { formatCurrency, formatETB } from "../mockDataV0"

const POLL_INTERVAL = 2500
const TIMEOUT_MS = 120_000

export function SikinaPayCheckoutScreen() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, setSikinaProxyUrl, paymentContext, setFeePaid, userBid, pendingBidAmount } = useApp()
  const [status, setStatus] = useState<"waiting" | "paid" | "failed">("waiting")
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [popupClosed, setPopupClosed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (watchRef.current) clearInterval(watchRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const closeAndClear = useCallback(() => {
    clearAll()
    closeSikinaPopup()
  }, [clearAll])

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = paymentContext === "bid-fee"
        ? await api.getBidFeePaymentStatus(selectedId!)
        : await api.getPaymentLinkStatus(selectedId!)
      if (res.status === "SUCCESSFUL") {
        closeAndClear()
        setStatus("paid")
        return true
      }
      if (["FAILED", "CANCELLED", "EXPIRED"].includes(res.status)) {
        closeAndClear()
        setStatus("failed")
        return true
      }
    } catch {
      // retry on next tick
    }
    return false
  }, [selectedId, paymentContext, closeAndClear])

  const openPaymentPopup = useCallback(() => {
    if (!sikinaPayUrl) return
    const popup = openSikinaPopup(sikinaPayUrl)
    if (!popup || popup.closed) {
      setPopupBlocked(true)
    } else {
      setPopupBlocked(false)
      setPopupClosed(false)
    }
  }, [sikinaPayUrl])

  const handleRelayResult = useCallback((result: string) => {
    localStorage.removeItem('sikina_payment_result')
    closeAndClear()
    if (result === 'success') setStatus('paid')
    else setStatus('failed')
  }, [closeAndClear])

  // Auto-open popup & start polling on mount
  useEffect(() => {
    if (!selectedId || !sikinaPayUrl) return

    // Clean up any stale localStorage result from a previous session
    localStorage.removeItem('sikina_payment_result')

    openPaymentPopup()

    // Instant detection via postMessage from the relay page
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'SIKINA_PAYMENT_RESULT') return
      handleRelayResult(e.data.result)
    }
    window.addEventListener('message', onMessage)

    // BroadcastChannel fallback (same-origin, different browsing context)
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('sikina_payment')
      bc.onmessage = (e) => handleRelayResult(e.data?.result)
    } catch { /* not supported */ }

    // localStorage fallback (for browsers that block BroadcastChannel)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'sikina_payment_result' || !e.newValue) return
      try {
        const { result } = JSON.parse(e.newValue)
        handleRelayResult(result)
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage)

    pollRef.current = setInterval(async () => {
      await checkStatus()
    }, POLL_INTERVAL)

    // Watch for the popup being closed by the user
    watchRef.current = setInterval(() => {
      if (!isSikinaPopupOpen()) setPopupClosed(true)
      else setPopupClosed(false)
    }, 800)

    timeoutRef.current = setTimeout(() => {
      closeAndClear()
      setStatus("failed")
    }, TIMEOUT_MS)

    return () => {
      clearAll()
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
      bc?.close()
    }
  }, [selectedId, sikinaPayUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }, [go, paymentContext, setSikinaPayUrl, setSikinaProxyUrl, closeAndClear])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleBack() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleBack])

  const handleContinuePaid = () => {
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    if (paymentContext === "bid-fee") {
      setFeePaid(true)
      go("place-bid")
    } else {
      go("delivery")
    }
  }

  const handleConfirmManually = async () => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    if (paymentContext === "bid-fee") {
      try {
        await api.confirmBidFeePayment(selectedId!)
        setFeePaid(true)
        go("place-bid")
      } catch {
        go("pay-fee")
      }
      return
    }
    try {
      await api.confirmPayment(selectedId!)
      go("delivery")
    } catch {
      go("pay-winning")
    }
  }

  const handleTryAgain = () => {
    closeAndClear()
    setSikinaPayUrl(null)
    setSikinaProxyUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBack}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button
            onClick={handleBack}
            className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold text-awash-blue">
            {paymentContext === "bid-fee" ? "Pay Bid Fee" : "Pay Winning Amount"}
          </h1>
          <button
            onClick={handleBack}
            className="ml-auto flex size-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Waiting state */}
        {status === "waiting" && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            {/* Animated icon */}
            <div className="relative mb-6 flex size-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-awash-blue/10" style={{ animationDuration: "2s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-awash-blue/10 to-emerald-500/10">
                <ShieldCheck className="size-10 text-awash-blue" />
              </div>
            </div>

            {popupBlocked ? (
              <>
                <h2 className="font-display text-lg font-bold text-awash-blue">Open Payment Page</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  Your browser blocked the payment popup. Click below to open it manually.
                </p>
                <button
                  onClick={openPaymentPopup}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-3.5 text-sm font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]"
                >
                  <ExternalLink className="size-4" />
                  Open SikinaPay Checkout
                </button>
              </>
            ) : (
              <>
                <h2 className="font-display text-lg font-bold text-awash-blue">
                  {popupClosed ? "Payment window closed" : "Complete payment in the opened window"}
                </h2>
                <p className="mt-2 text-sm text-neutral-400">
                  {popupClosed
                    ? "Did you complete the payment? You can reopen the window or confirm below."
                    : "A SikinaPay checkout window has opened. Complete your payment there and we'll confirm it automatically."}
                </p>

                {/* Steps */}
                {!popupClosed && (
                  <ol className="mt-6 w-full space-y-3 text-left">
                    {[
                      "Select your payment method in the SikinaPay window",
                      "Enter your details and confirm the payment",
                      "Return here — we'll detect it automatically",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-awash-blue/10 text-xs font-bold text-awash-blue">
                          {i + 1}
                        </span>
                        <span className="text-sm text-neutral-500">{step}</span>
                      </li>
                    ))}
                  </ol>
                )}

                <button
                  onClick={openPaymentPopup}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-3.5 text-sm font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]"
                >
                  <ExternalLink className="size-4" />
                  {popupClosed ? "Reopen Payment Window" : "Reopen Window"}
                </button>
              </>
            )}

            {/* Footer polling indicator */}
            <div className="mt-6 flex items-center gap-2 text-xs text-neutral-400">
              <RefreshCw className="size-3 animate-spin" />
              Waiting for payment confirmation…
            </div>

            {/* Manual confirm for edge cases */}
            <button
              onClick={handleConfirmManually}
              className="mt-3 text-xs font-medium text-neutral-400 underline-offset-2 hover:text-awash-blue hover:underline"
            >
              I've paid but not seeing confirmation
            </button>
          </div>
        )}

        {/* Paid state */}
        {status === "paid" && (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <Check className="size-10" strokeWidth={3} />
              </span>
            </motion.div>
            <h1 className="mt-6 font-display text-2xl font-extrabold text-awash-blue">Payment Successful!</h1>
            <p className="mt-2 max-w-xs text-sm font-medium text-neutral-400">
              {paymentContext === "winning" && userBid != null ? (
                <>Your payment of <span className="font-bold text-awash-blue">{formatCurrency(userBid)}</span> was received.</>
              ) : paymentContext === "bid-fee" && selectedId ? (
                <>Your service fee was received. {pendingBidAmount != null ? <span className="font-bold text-awash-blue">Saved bid {formatCurrency(pendingBidAmount)}</span> : 'Your saved bid'} will be submitted next.</>
              ) : (
                "Your payment was received successfully."
              )}
            </p>
            <button
              onClick={handleContinuePaid}
              className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-8 py-3 text-sm font-bold text-awash-blue shadow-lg shadow-primary/30 transition-all hover:shadow-primary/40"
            >
              {paymentContext === "bid-fee" ? "Submit Saved Bid" : "Track Delivery"}
            </button>
          </div>
        )}

        {/* Failed state */}
        {status === "failed" && (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500">
              <X className="size-10" strokeWidth={3} />
            </span>
            <h1 className="mt-6 font-display text-2xl font-extrabold text-awash-blue">Payment Not Confirmed</h1>
            <p className="mt-2 max-w-xs text-sm font-medium text-neutral-400">
              We couldn't automatically confirm your payment. If you've already paid, tap confirm below.
            </p>
            <button
              onClick={handleConfirmManually}
              className="mt-8 w-full max-w-xs rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light py-3 text-sm font-bold text-awash-blue shadow-lg shadow-primary/30 transition-all hover:shadow-primary/40 active:scale-[0.98]"
            >
              I've Already Paid
            </button>
            <button
              onClick={handleTryAgain}
              className="mt-3 w-full max-w-xs rounded-xl border border-border/60 bg-white/80 py-3 text-sm font-bold text-awash-blue backdrop-blur-sm transition-all hover:bg-white active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

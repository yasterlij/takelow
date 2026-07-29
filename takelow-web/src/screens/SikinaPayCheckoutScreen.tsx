import { useEffect, useRef, useState, useCallback } from "react"
import { X, Check, ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import { useApp } from "../AppContext"
import { api, openSikinaPopup, closeSikinaPopup } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function SikinaPayCheckoutScreen() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, paymentContext, setFeePaid, userBid } = useApp()
  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading")
  const [popupBlocked, setPopupBlocked] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const closePopup = () => {
    closeSikinaPopup()
  }

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = paymentContext === "bid-fee"
        ? await api.getBidFeePaymentStatus(selectedId!)
        : await api.getPaymentLinkStatus(selectedId!)
      if (res.status === "SUCCESSFUL") {
        cleanup()
        closePopup()
        setStatus("paid")
        return true
      }
      if (["FAILED", "CANCELLED", "EXPIRED"].includes(res.status)) {
        cleanup()
        closePopup()
        setStatus("failed")
        return true
      }
    } catch {
      // retry on next interval
    }
    return false
  }, [selectedId, paymentContext])

  useEffect(() => {
    if (!selectedId || !sikinaPayUrl) return

    const popup = openSikinaPopup(sikinaPayUrl)
    if (!popup || popup.closed) {
      setPopupBlocked(true)
    }

    pollRef.current = setInterval(async () => {
      const done = await checkStatus()
      if (done) return
    }, 2000)

    timeoutRef.current = setTimeout(() => {
      cleanup()
      closePopup()
      setStatus("failed")
    }, 120000)

    return () => {
      cleanup()
      closePopup()
    }
  }, [selectedId, sikinaPayUrl, paymentContext, checkStatus])

  const handleOpenPopup = () => {
    const popup = openSikinaPopup(sikinaPayUrl!)
    if (!popup || popup.closed) {
      setPopupBlocked(true)
    } else {
      setPopupBlocked(false)
    }
  }

  const handleBack = () => {
    cleanup()
    closePopup()
    setSikinaPayUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }

  const handleContinuePaid = () => {
    cleanup()
    setSikinaPayUrl(null)
    if (paymentContext === "bid-fee") {
      setFeePaid(true)
      go("place-bid")
    } else {
      go("delivery")
    }
  }

  const handleConfirmManually = async () => {
    cleanup()
    closePopup()
    setSikinaPayUrl(null)
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
    cleanup()
    closePopup()
    setSikinaPayUrl(null)
    go(paymentContext === "bid-fee" ? "pay-fee" : "pay-winning")
  }

  if (status === "paid") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Check className="size-10" strokeWidth={3} />
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Payment Successful!</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
          Your payment of <span className="font-bold text-navy">{formatETB(userBid ?? 0)} {CURRENCY}</span> was received.
        </p>
        <button
          onClick={handleContinuePaid}
          className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110"
        >
          {paymentContext === "bid-fee" ? "Continue to Place Bid" : "Track Delivery"}
        </button>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500">
          <X className="size-10" strokeWidth={3} />
        </span>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Payment Not Confirmed</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
          We couldn't automatically confirm your payment. If you've already paid, tap confirm below.
        </p>
        <button
          onClick={handleConfirmManually}
          className="mt-8 w-full max-w-xs rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110"
        >
          I've Already Paid
        </button>
        <button
          onClick={handleTryAgain}
          className="mt-3 w-full max-w-xs rounded-xl border border-border bg-card py-3 text-sm font-bold text-navy transition-all hover:bg-muted"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md">
        <button onClick={handleBack} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-awash-blue">
          {paymentContext === "bid-fee" ? "Pay Bid Fee" : "Pay Winning Amount"}
        </h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-awash-blue/10 to-emerald-500/10">
          <RefreshCw className="size-10 animate-spin text-awash-blue" />
        </div>

        <h2 className="font-display text-xl font-bold text-navy">Waiting for Payment</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {popupBlocked
            ? "Click the button below to open the SikinaPay payment page."
            : "Complete your payment in the opened SikinaPay window."}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleOpenPopup}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110"
          >
            <ExternalLink className="size-4" />
            {popupBlocked ? "Open Payment Page" : "Reopen Payment Window"}
          </button>

          <a
            href={sikinaPayUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-awash-blue"
          >
            Open in new tab
          </a>
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          Checking payment status every 2 seconds...
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-border bg-white/80 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={handleConfirmManually}
          className="text-sm font-semibold text-awash-blue underline underline-offset-2"
        >
          Already Paid? Confirm
        </button>
      </div>
    </div>
  )
}

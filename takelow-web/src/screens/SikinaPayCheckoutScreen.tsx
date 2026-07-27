import { useEffect, useRef, useState, useCallback } from "react"
import { ExternalLink, X, Check, ArrowLeft, RefreshCw } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function SikinaPayCheckoutScreen() {
  const { go, selectedId, sikinaPayUrl, setSikinaPayUrl, paymentContext, setFeePaid, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [status, setStatus] = useState<"loading" | "paid" | "failed">("loading")
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const openPaymentPage = () => {
    if (!sikinaPayUrl) return
    const w = window.open(sikinaPayUrl, "sikina-pay", "width=500,height=800,scrollbars=yes")
    if (w) {
      popupRef.current = w
    } else {
      window.location.href = sikinaPayUrl
    }
  }

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = paymentContext === "bid-fee"
        ? await api.getBidFeePaymentStatus(selectedId!)
        : await api.getPaymentLinkStatus(selectedId!)
      if (res.status === "SUCCESSFUL") {
        cleanup()
        setStatus("paid")
        popupRef.current?.close()
        return true
      }
      if (["FAILED", "CANCELLED", "EXPIRED"].includes(res.status)) {
        cleanup()
        setStatus("failed")
        popupRef.current?.close()
        return true
      }
    } catch {
      // retry on next interval
    }
    return false
  }, [selectedId, paymentContext])

  useEffect(() => {
    if (!selectedId || !sikinaPayUrl) return
    openPaymentPage()

    let consecutiveErrors = 0

    pollRef.current = setInterval(async () => {
      const done = await checkStatus()
      if (done) return

      if (popupRef.current?.closed) {
        consecutiveErrors++
        if (consecutiveErrors >= 5) {
          cleanup()
          setStatus("failed")
        }
      } else {
        consecutiveErrors = 0
      }
    }, 2000)

    timeoutRef.current = setTimeout(() => {
      cleanup()
      setStatus("failed")
    }, 300000)

    return () => {
      cleanup()
      popupRef.current?.close()
    }
  }, [selectedId, sikinaPayUrl, paymentContext, checkStatus])

  const handleBack = () => {
    cleanup()
    popupRef.current?.close()
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
    popupRef.current?.close()
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

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-10 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-awash-blue/10 text-awash-blue">
          <ExternalLink className="size-10" />
        </span>
        <div>
          <h2 className="font-display text-xl font-extrabold text-navy">Complete Payment on SikinaPay</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A secure payment page has been opened in a new window. Complete your payment there, then return here.
          </p>
        </div>
        <button
          onClick={openPaymentPage}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110"
        >
          <ExternalLink className="size-4" />
          Open Payment Page
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          Waiting for payment confirmation...
        </div>
      </div>
    </div>
  )
}

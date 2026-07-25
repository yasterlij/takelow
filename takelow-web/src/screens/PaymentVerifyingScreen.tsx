import { useEffect, useState, useRef } from "react"
import { Check, X, Loader2, ArrowRight, Gavel, ArrowLeft } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PaymentVerifyingScreen() {
  const { go, selectedId, userBid, getAuction, paymentContext, setFeePaid } = useApp()
  const auction = getAuction(selectedId)
  const [message, setMessage] = useState("Waiting for payment confirmation...")
  const [paid, setPaid] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const amount = userBid ?? 0
  const isBidFee = paymentContext === 'bid-fee'

  useEffect(() => {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      setMessage(`Waiting for payment confirmation${'.'.repeat((attempts % 3) + 1)}`)
      try {
        if (!selectedId) return
        const res = isBidFee
          ? await api.getBidFeePaymentStatus(selectedId)
          : await api.getPaymentLinkStatus(selectedId)
        if (res.status === 'SUCCESSFUL') {
          setPaid(true)
          if (pollRef.current) clearInterval(pollRef.current)
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(res.status)) {
          setFailed(true)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        setFailed(true)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 3000)
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        setFailed(true)
      }
    }, 300000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedId, isBidFee])

  const handleConfirmPaid = async () => {
    if (!selectedId) return
    setConfirming(true)
    if (isBidFee) {
      setPaid(true)
      return
    }
    try {
      await api.confirmPayment(selectedId)
      setPaid(true)
    } catch {
      setConfirming(false)
    }
  }

  const handleSuccessAction = () => {
    if (isBidFee) {
      setFeePaid(true)
      go('place-bid')
    } else {
      go('delivery')
    }
  }

  if (paid) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <Check className="size-10" strokeWidth={3} />
            </span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Payment Successful!</h1>
          <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
            Your payment of <span className="font-bold text-navy">{formatETB(amount)} {CURRENCY}</span> was received.
          </p>
          <Card className="mt-6 w-full max-w-xs p-5 text-left">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-semibold text-navy">{auction?.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold text-navy">{CURRENCY} {formatETB(amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold text-emerald-600">Completed</dd>
              </div>
            </dl>
          </Card>
        </div>
        <div className="border-t border-border bg-card p-4">
          <CTAButton onClick={handleSuccessAction}>
            {isBidFee ? <><Gavel className="size-[18px]" /> Continue to Place Bid</> : <><ArrowRight className="size-[18px]" /> Track Delivery</>}
          </CTAButton>
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md">
          <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500">
            <X className="size-10" strokeWidth={3} />
          </span>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Still Waiting for Confirmation</h1>
          <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
            Payment was not automatically confirmed. If you've already paid, click confirm below.
          </p>
          <Card className="mt-6 w-full max-w-xs p-4">
            <button
              onClick={handleConfirmPaid}
              disabled={confirming}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {confirming ? "Confirming..." : "I've Already Paid"}
            </button>
            <button
              onClick={() => go(isBidFee ? "pay-fee" : "pay-winning")}
              className="mt-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-bold text-navy"
            >
              Try Again
            </button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-md">
        <button onClick={() => go("auctions")} className="flex size-8 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-display text-base font-bold text-awash-blue">Payment</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground/60">Complete the payment in the opened window</p>
      </div>
    </div>
  )
}
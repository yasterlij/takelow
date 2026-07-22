import { useEffect, useState } from "react"
import { Check, X, ExternalLink, Loader2, ArrowRight } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { PhoneStatusBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

type ResultType = "success" | "failed" | "pending"

export function PaymentResultScreen() {
  const { go, selectedId, userBid, getAuction } = useApp()
  const auction = getAuction(selectedId)
  const [polling, setPolling] = useState(true)
  const [result, setResult] = useState<ResultType>("pending")

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        if (selectedId) {
          const status = await api.getPaymentLinkStatus(selectedId)
          if (!cancelled) {
            if (status.status === "SUCCESSFUL") setResult("success")
            else if (["FAILED", "CANCELLED", "EXPIRED"].includes(status.status))
              setResult("failed")
          }
        } else {
          setResult("success")
        }
      } catch {
        setResult("failed")
      } finally {
        if (!cancelled) setPolling(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [selectedId])

  const amount = userBid ?? 0

  if (polling) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Verifying payment status...</p>
        </div>
      </div>
    )
  }

  if (result === "success") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
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
          <CTAButton onClick={() => go("delivery")}>
            <ArrowRight className="size-[18px]" /> Track Delivery
          </CTAButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy rounded-t-[2rem] overflow-hidden"><PhoneStatusBar dark /></div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="relative">
          <span className="flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500">
            <X className="size-10" strokeWidth={3} />
          </span>
        </div>
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Payment Not Completed</h1>
        <p className="mt-2 max-w-xs text-sm font-medium text-muted-foreground">
          The payment was not completed. You can try again or contact support.
        </p>
      </div>
      <div className="border-t border-border bg-card p-4">
        <CTAButton onClick={() => go("pay-winning")}>
          <ExternalLink className="size-[18px]" /> Try Again
        </CTAButton>
      </div>
    </div>
  )
}

import { useState } from "react"
import { ShieldCheck, Info, Loader2, Wallet, Building2, ChevronDown, ChevronUp } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PayFeeScreen() {
  const { go, payFee, getAuction, selectedId, authError, paymentMethod, setPaymentMethod } = useApp()
  const auction = getAuction(selectedId)

  const [loading, setLoading] = useState(false)
  const [showMethods, setShowMethods] = useState(false)
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH' | 'WALLET'>(paymentMethod === 'WALLET' ? 'SIKINAPAY' : paymentMethod)

  if (!auction) return null

  const handlePayClick = async () => {
    setPaymentMethod(selected)
    setLoading(true)
    try {
      await payFee(auction.bidFee, selected as 'SIKINAPAY' | 'AWASH')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      
      <AppBar title="Pay Bid Fee" onBack={() => go("product")} />
      <div className="flex-1 px-5 pb-20 lg:pb-6 pt-5">
        <p className="text-sm font-medium text-muted-foreground">
          Pay the non-refundable participation fee to enter this auction.
        </p>
        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bid Fee</span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy">{CURRENCY} {formatETB(auction.bidFee)}</p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">for {auction.name}</span>
        </Card>

        <div className="mt-4">
          <button
            onClick={() => setShowMethods(!showMethods)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center gap-3">
              {selected === 'SIKINAPAY' ? (
                <ShieldCheck className="size-5 text-primary" />
              ) : (
                <Building2 className="size-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-bold text-navy">
                  {selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank Wallet'}
                </p>
                <p className="text-xs text-muted-foreground">Change payment method</p>
              </div>
            </div>
            {showMethods ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {showMethods && (
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-2">
              <button
                onClick={() => { setSelected('SIKINAPAY'); setShowMethods(false) }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected === 'SIKINAPAY' ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
              >
                <ShieldCheck className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">SikinaPay</p>
                  <p className="text-xs text-muted-foreground">Pay via online payment gateway</p>
                </div>
              </button>
              <button
                onClick={() => { setSelected('AWASH'); setShowMethods(false) }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected === 'AWASH' ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
              >
                <Building2 className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">Awash Bank Wallet</p>
                  <p className="text-xs text-muted-foreground">Pay via Awash Bank payment gateway</p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-navy/5 p-3">
          <Info className="mt-0.5 size-4 flex-shrink-0 text-navy/60" />
          <p className="text-xs font-medium leading-relaxed text-navy/70">
            The bid fee is non-refundable and confirms your participation. After payment, you will be able to place your unique bid.
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secured by {selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank'}
        </div>
        {authError && (
          <p className="mt-4 text-center text-xs font-semibold text-destructive">{authError}</p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={handlePayClick} disabled={loading}>
          {loading ? <Loader2 className="size-[18px] animate-spin" /> : selected === 'SIKINAPAY' ? <ShieldCheck className="size-[18px]" /> : <Wallet className="size-[18px]" />}
          {" "}{selected === 'SIKINAPAY' ? `Pay ${CURRENCY} ${formatETB(auction.bidFee)} with SikinaPay` : `Pay ${CURRENCY} ${formatETB(auction.bidFee)} with Awash`}
        </CTAButton>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Clock, ShieldCheck, Wallet, Building2, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react"
import { useApp } from "../AppContext"
import { AppBar, CTAButton, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function PayWinningScreen() {
  const { go, selectedId, userBid, payWinning, getAuction, authError, paymentMethod, setPaymentMethod, walletBalance } = useApp()
  const auction = getAuction(selectedId)
  const [showMethods, setShowMethods] = useState(false)
  const [customerPhone, setCustomerPhone] = useState("")
  const [selected, setSelected] = useState<'SIKINAPAY' | 'AWASH' | 'WALLET'>(paymentMethod)
  const [paying, setPaying] = useState(false)

  if (!auction) return null

  const amount = userBid ?? 0
  const deadline = (auction as any).payment_deadline ? new Date((auction as any).payment_deadline) : null
  const deadlineHrs = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 3600000)) : 24
  const deadlineMins = deadline ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60000)) : 1440
  const urgent = deadlineHrs < 6
  const hasSufficientBalance = walletBalance >= amount

  const handlePay = async () => {
    setPaying(true)
    setPaymentMethod(selected)
    await payWinning(amount, selected, selected === 'AWASH' ? customerPhone || undefined : undefined)
    setPaying(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <AppBar title="Pay Winning Amount" onBack={() => go("winner")} />
      <div className="flex-1 px-5 pb-6 pt-5">
        <div className={`flex items-center gap-2 rounded-xl p-3 ${urgent ? "bg-red-50 border border-red-200" : "bg-accent"}`}>
          <Clock className={`size-[18px] flex-shrink-0 ${urgent ? "text-red-500" : "text-primary"}`} />
          <p className={`text-xs font-semibold ${urgent ? "text-red-700" : "text-navy/80"}`}>
            {deadlineHrs > 0
              ? `Complete payment within ${deadlineHrs}h ${deadlineMins % 60}m to claim your prize.`
              : "Less than an hour remaining! Pay now to claim your prize."}
          </p>
        </div>

        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Winning Bid</span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy tabular-nums">{formatETB(amount)} {CURRENCY}</p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">for {auction.name}</span>
        </Card>

        <Card className="mt-4 p-4">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Winning amount</span>
            <span className="font-semibold text-navy">{CURRENCY} {formatETB(amount)}</span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Delivery</span>
            <span className="font-semibold text-emerald-600">Free</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3">
            <span className="text-sm font-bold text-navy">Total</span>
            <span className="font-display text-sm font-extrabold text-primary">{CURRENCY} {formatETB(amount)}</span>
          </div>
        </Card>

        {selected === 'WALLET' && (
          <div className={`mt-4 rounded-xl border p-4 ${hasSufficientBalance ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              {hasSufficientBalance ? (
                <CheckCircle2 className="size-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-bold text-navy">Wallet Balance</p>
                <p className={`text-lg font-extrabold tabular-nums ${hasSufficientBalance ? "text-emerald-700" : "text-amber-700"}`}>
                  {CURRENCY} {formatETB(walletBalance)}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {hasSufficientBalance
                    ? "You have enough balance to pay directly from your wallet."
                    : `Insufficient balance. You need ${CURRENCY} ${formatETB(amount - walletBalance)} more.`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <button
            onClick={() => setShowMethods(!showMethods)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left"
          >
            <div className="flex items-center gap-3">
              {selected === 'WALLET' ? (
                <Wallet className="size-5 text-primary" />
              ) : selected === 'SIKINAPAY' ? (
                <ShieldCheck className="size-5 text-primary" />
              ) : (
                <Building2 className="size-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-bold text-navy">
                  {selected === 'WALLET' ? 'Wallet' : selected === 'SIKINAPAY' ? 'SikinaPay' : 'Awash Bank'}
                </p>
                <p className="text-xs text-muted-foreground">Change payment method</p>
              </div>
            </div>
            {showMethods ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {showMethods && (
            <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-2">
              <button
                onClick={() => { setSelected('WALLET'); setShowMethods(false) }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected === 'WALLET' ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
              >
                <Wallet className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">Wallet</p>
                  <p className="text-xs text-muted-foreground">Pay instantly from your wallet balance</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">{CURRENCY} {formatETB(walletBalance)}</span>
              </button>
              <button
                onClick={() => { setSelected('SIKINAPAY'); setShowMethods(false) }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected === 'SIKINAPAY' ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
              >
                <ShieldCheck className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">SikinaPay</p>
                  <p className="text-xs text-muted-foreground">Pay via Mobile Money, USSD, or card</p>
                </div>
              </button>
              <button
                onClick={() => { setSelected('AWASH'); setShowMethods(false) }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${selected === 'AWASH' ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'}`}
              >
                <Building2 className="size-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">Awash Bank</p>
                  <p className="text-xs text-muted-foreground">Pay via Awash Bank secure checkout</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {selected === 'AWASH' && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-muted-foreground">Phone Number (optional)</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+251..."
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-sm font-medium text-navy outline-none focus:border-primary"
            />
          </div>
        )}

        {selected === 'SIKINAPAY' && (
          <div className="mt-4 rounded-xl bg-accent p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-navy">SikinaPay Checkout</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Complete your payment securely within the app using SikinaPay checkout via Mobile Money, USSD, or card.
                </p>
              </div>
            </div>
          </div>
        )}

        {selected === 'AWASH' && (
          <div className="mt-4 rounded-xl bg-accent p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-navy">Awash Bank Secure Checkout</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  You will be redirected to Awash Bank's secure payment page to complete the transaction.
                </p>
              </div>
            </div>
          </div>
        )}

        {authError && (
          <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-center">
            <p className="text-xs font-semibold text-destructive">{authError}</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton
          onClick={handlePay}
          disabled={paying || (selected === 'WALLET' && !hasSufficientBalance)}
        >
          {paying ? "Processing..." : selected === 'WALLET' ? (
            <><Wallet className="size-[18px]" /> Pay from Wallet</>
          ) : selected === 'SIKINAPAY' ? (
            <><ShieldCheck className="size-[18px]" /> Pay with SikinaPay</>
          ) : (
            <><Building2 className="size-[18px]" /> Pay with Awash Bank</>
          )}
        </CTAButton>
      </div>
    </div>
  )
}

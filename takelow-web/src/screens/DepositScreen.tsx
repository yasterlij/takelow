import { useState } from "react"
import { ArrowLeft, Wallet, Loader2, CheckCircle2 } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { CURRENCY, formatETB } from "../mockDataV0"

export function DepositScreen() {
  const { go, refreshWallet } = useApp()
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDeposit = async () => {
    const num = Number(amount)
    if (!num || num <= 0) {
      setError("Enter a valid amount")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.wallet.deposit(num)
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => go("home"), 1500)
    } catch (e: any) {
      setError(e.message || "Deposit failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => go("home")} className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm text-awash-blue hover:bg-white transition-all shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Top Up Wallet</h1>
          <p className="text-sm font-medium text-neutral-500">Add funds to your Awash Wallet</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="rounded-2xl border border-border/60 bg-white/70 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-awash-gold/20 to-awash-gold-light/10 border border-primary/20">
              <Wallet className="size-8 text-awash-gold" />
            </div>
            <p className="text-center text-sm font-medium text-neutral-500">
              Enter the amount you want to deposit into your Awash Wallet
            </p>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs font-semibold text-neutral-400">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl font-extrabold text-foreground">{CURRENCY}</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))}
                placeholder="0.00"
                className="w-full rounded-xl border border-border bg-white px-10 py-4 font-display text-2xl font-extrabold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <p className="text-xs font-medium text-emerald-600">Deposit successful! Redirecting...</p>
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="size-4 animate-spin" /> Processing...</>
            ) : (
              <><Wallet className="size-4" /> Deposit {amount ? `${CURRENCY} ${formatETB(Number(amount))}` : ""}</>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white/50 backdrop-blur-sm p-4">
          <h3 className="font-display text-sm font-bold text-foreground">Quick Deposit</h3>
          <div className="mt-3 flex gap-2">
            {[100, 250, 500, 1000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 rounded-xl border border-border bg-white py-2.5 text-sm font-bold text-awash-blue transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97]"
              >
                {CURRENCY} {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from "react"
import { Gavel, Send, Download, Smartphone, Zap, Receipt, CreditCard, Wallet, PiggyBank, Users, Bell, ArrowRight, Eye, EyeOff } from "lucide-react"
import { useApp } from "../AppContext"
import { AwashMark } from "../components/AuctionUI"
import { PhoneStatusBar, Badge } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

const quickActions = [
  { icon: Send, label: "Send" },
  { icon: Download, label: "Receive" },
  { icon: Smartphone, label: "Airtime" },
  { icon: Zap, label: "Pay Bills" },
  { icon: Receipt, label: "Statement" },
  { icon: CreditCard, label: "Cards" },
  { icon: Users, label: "Transfer" },
  { icon: PiggyBank, label: "Savings" },
]

export function HomeScreen() {
  const { go, walletBalance, user } = useApp()
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-navy text-navy-foreground">
        <PhoneStatusBar dark />
        <div className="flex items-center justify-between px-5 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-white">
              <AwashMark className="size-7" />
            </div>
            <div>
              <p className="text-[11px] text-white/60">Welcome back</p>
              <p className="text-sm font-bold">{user?.name || "Selam Tesfaye"}</p>
            </div>
          </div>
          <button
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full bg-white/10"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-[#d9641a] p-4 text-primary-foreground shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <Wallet className="size-4" /> Wallet Balance
              </span>
              <button
                onClick={() => setShowBalance((s) => !s)}
                aria-label={showBalance ? "Hide balance" : "Show balance"}
                className="text-white/80"
              >
                {showBalance ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </div>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
              {showBalance ? `${CURRENCY} ${formatETB(walletBalance)}` : "••••••"}
            </p>
            <p className="mt-1 text-xs text-white/70">Account ****091332</p>
          </div>
        </div>
      </div>
      <div className="flex-1 px-5 pb-8 pt-5 overflow-y-auto">
        <button
          onClick={() => go("auctions")}
          className="group flex w-full items-center gap-4 rounded-2xl border border-primary/30 bg-accent p-4 text-left transition-all hover:border-primary/60 hover:shadow-md"
        >
          <span className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/40">
            <Gavel className="size-6" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-navy">Reverse Auction</span>
              <Badge tone="orange">NEW</Badge>
            </div>
            <p className="text-xs font-medium text-navy/60">Bid Low. Be Unique. Win Big!</p>
          </div>
          <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1" />
        </button>
        {user?.role === "admin" && (
          <button onClick={() => go("admin-dashboard")} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Gavel className="size-5" />
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-navy">Admin Panel</p>
              <p className="text-xs font-medium text-muted-foreground">Manage auctions, users &amp; bids</p>
            </div>
            <ArrowRight className="size-4 text-primary" />
          </button>
        )}
        <h2 className="mb-3 mt-7 font-display text-sm font-bold text-navy">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-muted"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-navy">
                <a.icon className="size-[18px]" />
              </span>
              <span className="text-[10px] font-semibold leading-tight text-foreground">{a.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-7 overflow-hidden rounded-2xl bg-navy p-4 text-navy-foreground">
          <p className="font-display text-sm font-bold text-primary">Live Auctions Now</p>
          <p className="mt-1 text-xs text-white/70">
            Premium phones, TVs and laptops waiting for their lowest unique bid.
          </p>
          <button
            onClick={() => go("auctions")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            Browse Auctions <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

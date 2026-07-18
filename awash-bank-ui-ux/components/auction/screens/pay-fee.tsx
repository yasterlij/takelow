"use client"

import { Wallet, ShieldCheck, Info } from "lucide-react"
import { useApp } from "../app-context"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../ui"
import { AwashMark } from "../logo"
import { getAuction, CURRENCY, formatETB } from "@/lib/auctions"

export function PayFeeScreen() {
  const { go, selectedId, walletBalance, payFee } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  return (
    <div className="flex flex-1 flex-col lg:overflow-y-auto">
      <div className="bg-navy">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Pay Bid Fee" onBack={() => go("product")} />

      <div className="flex-1 px-5 pb-28 pt-5 lg:pb-8">
        <p className="text-sm font-medium text-muted-foreground">
          Pay the non-refundable participation fee to enter this auction.
        </p>

        {/* Amount */}
        <Card className="mt-4 items-center p-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bid Fee
          </span>
          <p className="mt-2 font-display text-4xl font-extrabold text-navy">
            {CURRENCY} {formatETB(auction.bidFee)}
          </p>
          <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">
            for {auction.name}
          </span>
        </Card>

        {/* Pay with */}
        <h2 className="mb-2 mt-6 font-display text-sm font-bold text-navy">Pay with</h2>
        <Card className="flex items-center gap-3 border-primary/40 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-navy">
            <AwashMark className="size-8" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-navy">Awash Bank Mobile Money</p>
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Wallet className="size-3.5" /> Balance: {CURRENCY} {formatETB(walletBalance)}
            </p>
          </div>
          <span className="size-4 rounded-full border-4 border-primary" />
        </Card>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-navy/5 p-3">
          <Info className="mt-0.5 size-4 flex-shrink-0 text-navy/60" />
          <p className="text-xs font-medium leading-relaxed text-navy/70">
            The bid fee is non-refundable and confirms your participation. You will place your
            unique bid on the next step.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />
          Secured by Awash Bank
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton onClick={() => payFee(auction.bidFee)}>
          Pay {CURRENCY} {formatETB(auction.bidFee)}
        </CTAButton>
      </div>
    </div>
  )
}

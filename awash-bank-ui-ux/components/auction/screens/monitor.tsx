"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Bell, Users, Radio, Eye } from "lucide-react"
import { useApp } from "../app-context"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../ui"
import { Countdown } from "../countdown"
import { getAuction, CURRENCY, formatETB } from "@/lib/auctions"

export function MonitorScreen() {
  const { go, selectedId, userBid } = useApp()
  const auction = getAuction(selectedId)

  // Demo countdown starts short so the auction visibly winds down
  const [seconds, setSeconds] = useState(130)
  const [bidders, setBidders] = useState(auction?.bidders ?? 0)

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setBidders((b) => b + (Math.random() > 0.5 ? 1 : 0))
    }, 2500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (seconds === 0) {
      const t = setTimeout(() => go("closed"), 1200)
      return () => clearTimeout(t)
    }
  }, [seconds, go])

  if (!auction) return null

  const endingSoon = seconds <= 60

  return (
    <div className="flex flex-1 flex-col lg:overflow-y-auto">
      <div className="bg-navy">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Auction in Progress" onBack={() => go("bid-confirmed")} />

      <div className="flex-1 px-5 pb-28 pt-5 lg:pb-8">
        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            <Radio className="size-3.5 animate-pulse" /> LIVE
          </span>
        </div>

        {/* Product + countdown */}
        <Card className="mt-4 items-center p-5 text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-2xl bg-secondary">
            <Image
              src={auction.image || "/placeholder.svg"}
              alt={auction.name}
              width={96}
              height={96}
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="mt-3 font-display text-lg font-extrabold text-navy">{auction.name}</h2>
          <span className="text-xs font-medium text-muted-foreground">Time Left</span>
          <div className="mt-2 flex justify-center">
            <Countdown seconds={seconds} size="lg" />
          </div>
        </Card>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card className="items-center p-4 text-center">
            <Users className="mx-auto size-5 text-navy" />
            <p className="mt-1 font-display text-2xl font-extrabold text-navy tabular-nums">
              {bidders}
            </p>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Bidders
            </span>
          </Card>
          <Card className="items-center p-4 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Your Bid
            </span>
            <p className="mt-1 font-display text-2xl font-extrabold text-primary tabular-nums">
              {formatETB(userBid ?? 0)}
            </p>
            <span className="text-[11px] font-semibold text-muted-foreground">{CURRENCY}</span>
          </Card>
        </div>

        {/* Ending soon notification */}
        {endingSoon && (
          <Card className="mt-4 flex items-center gap-3 border-primary/40 bg-accent p-4">
            <span className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bell className="size-5 animate-pulse" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-primary">Auction Ending Soon!</p>
              <p className="text-xs font-medium text-navy/70">
                {auction.name} is about to close. Stay tuned!
              </p>
            </div>
          </Card>
        )}

        <p className="mt-4 text-center text-xs font-medium text-navy/60">
          Keep watching — you might be the lowest unique bidder!
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton variant="navy" onClick={() => go("closed")}>
          <Eye className="size-4.5" /> View Result Now
        </CTAButton>
      </div>
    </div>
  )
}

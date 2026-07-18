"use client"

import Image from "next/image"
import { CheckCircle2, Package, Bike, MapPin, Home, Phone } from "lucide-react"
import { useApp } from "../app-context"
import { AppBar, PhoneStatusBar, CTAButton, Card } from "../ui"
import { getAuction } from "@/lib/auctions"

const steps = [
  { icon: CheckCircle2, title: "Order Confirmed", desc: "Payment received", done: true },
  { icon: Package, title: "Packed & Ready", desc: "Awash fulfillment center", done: true },
  { icon: Bike, title: "Out for Delivery", desc: "Courier on the way", done: false, active: true },
  { icon: Home, title: "Delivered", desc: "Estimated today, 4:30 PM", done: false },
]

export function DeliveryScreen() {
  const { go, selectedId, reset } = useApp()
  const auction = getAuction(selectedId)
  if (!auction) return null

  return (
    <div className="flex flex-1 flex-col lg:overflow-y-auto">
      <div className="bg-navy">
        <PhoneStatusBar dark />
      </div>
      <AppBar title="Track Delivery" onBack={() => go("payment-confirmed")} />

      <div className="flex-1 px-5 pb-28 pt-5 lg:pb-8">
        {/* Courier status banner */}
        <Card className="flex items-center gap-4 border-primary/30 bg-accent p-4">
          <span className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bike className="size-7" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-navy">On its way!</p>
            <p className="text-xs font-medium text-navy/70">
              Arriving today · Estimated 4:30 PM
            </p>
          </div>
        </Card>

        {/* Product */}
        <Card className="mt-4 flex items-center gap-3 p-3">
          <div className="flex size-16 items-center justify-center rounded-xl bg-secondary">
            <Image
              src={auction.image || "/placeholder.svg"}
              alt={auction.name}
              width={64}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-navy">{auction.name}</p>
            <p className="text-xs font-medium text-muted-foreground">Order #AWB-{auction.id.slice(0, 4).toUpperCase()}</p>
          </div>
        </Card>

        {/* Timeline */}
        <h2 className="mb-3 mt-6 font-display text-sm font-bold text-navy">Delivery Progress</h2>
        <div className="relative pl-2">
          {steps.map((s, i) => {
            const last = i === steps.length - 1
            const active = s.active
            return (
              <div key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                {!last && (
                  <span
                    className={
                      "absolute left-[15px] top-8 h-full w-0.5 " +
                      (s.done ? "bg-primary" : "bg-border")
                    }
                  />
                )}
                <span
                  className={
                    "relative z-10 flex size-8 flex-shrink-0 items-center justify-center rounded-full " +
                    (s.done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-navy text-navy-foreground ring-4 ring-navy/15"
                        : "bg-secondary text-muted-foreground")
                  }
                >
                  <s.icon className="size-4" />
                </span>
                <div className="pt-1">
                  <p
                    className={
                      "text-sm font-bold " + (s.done || active ? "text-navy" : "text-muted-foreground")
                    }
                  >
                    {s.title}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Delivery address */}
        <Card className="mt-2 p-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4.5 flex-shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">Delivery Address</p>
              <p className="text-xs font-medium text-muted-foreground">
                Bole Sub-city, Woreda 03, Addis Ababa
              </p>
            </div>
            <button
              aria-label="Call courier"
              className="flex size-9 items-center justify-center rounded-full bg-navy/5 text-navy hover:bg-navy/10"
            >
              <Phone className="size-4" />
            </button>
          </div>
        </Card>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur lg:static">
        <CTAButton variant="navy" onClick={reset}>
          <Home className="size-4.5" /> Back to Home
        </CTAButton>
      </div>
    </div>
  )
}

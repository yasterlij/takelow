import { Gavel, Users, TrendingUp, DollarSign, AlertTriangle } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Badge } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function AdminDashboardScreen() {
  const { go, allBids, user, auctions } = useApp()
  const active = auctions.filter((a) => a.status !== "closed")
  const closed = auctions.filter((a) => a.status === "closed")
  const extended = auctions.filter((a) => a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000)
  const totalRevenue = allBids.length * 50

  const stats = [
    { icon: Gavel, label: "Active Auctions", value: active.length, color: "text-primary" },
    { icon: TrendingUp, label: "Total Bids", value: allBids.length, color: "text-emerald-600" },
    { icon: DollarSign, label: "Revenue (fees)", value: `${CURRENCY} ${formatETB(totalRevenue)}`, color: "text-primary" },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-navy">
        <div className="flex items-center justify-between px-5 pb-3 pt-12">
          <h1 className="font-display text-xl font-extrabold text-navy-foreground">Admin Panel</h1>
          <Badge tone="orange">Admin</Badge>
        </div>
      </div>
      <div className="flex-1 space-y-4 px-5 pb-8 pt-5">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <s.icon className={`size-5 ${s.color}`} />
              <p className="mt-2 text-2xl font-extrabold text-navy tabular-nums">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {extended.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">{extended.length} Extended Auction(s)</p>
            </div>
            {extended.map((a) => (
              <p key={a.id} className="mt-1 text-[10px] text-amber-700">
                {a.name} — extended due to low bids
              </p>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-navy">All Auctions ({auctions.length})</h2>
          <div className="mt-3 space-y-2">
            {auctions.slice(0, 10).map((a) => {
              const isExtended = a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-navy">{a.name}</p>
                      {isExtended && <Badge tone="orange">Extended</Badge>}
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      {a.totalBids || a.bidders} bids · {a.uniqueBidders || a.bidders} bidders
                      {a.maxBid ? ` · max ${a.maxBid}` : ""}
                      {a.minBid ? ` · min ${a.minBid}` : ""}
                    </p>
                  </div>
                  <Badge tone={a.status === "ending-soon" ? "orange" : a.status === "live" ? "green" : "muted"}>
                    {a.status === "ending-soon" ? "Ending" : a.status}
                  </Badge>
                </div>
              )
            })}
            {auctions.length > 10 && (
              <p className="text-center text-[10px] font-medium text-muted-foreground">
                +{auctions.length - 10} more auctions
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <CTAButton variant="navy" onClick={() => go("admin-auctions")}>Manage Auctions</CTAButton>
          </div>
          <div className="flex-1">
            <CTAButton variant="outline" onClick={() => go("admin-users")}>Manage Users</CTAButton>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <CTAButton variant="primary" onClick={() => go("admin-auctions")}>+ New Auction</CTAButton>
          </div>
          <div className="flex-1">
            <CTAButton variant="outline" onClick={() => go("home")}>Back to App</CTAButton>
          </div>
        </div>
      </div>
    </div>
  )
}

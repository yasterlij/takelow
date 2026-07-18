import { Gavel, Users, TrendingUp, DollarSign } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Badge } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"

export function AdminDashboardScreen() {
  const { go, allBids, users, auctions } = useApp()

  const stats = [
    { icon: Gavel, label: "Active Auctions", value: auctions.filter((a) => a.status !== "closed").length, color: "text-primary" },
    { icon: Users, label: "Total Users", value: users.length, color: "text-navy" },
    { icon: TrendingUp, label: "Total Bids", value: allBids.length, color: "text-emerald-600" },
    { icon: DollarSign, label: "Revenue (fees)", value: `${CURRENCY} ${formatETB(allBids.length * 10)}`, color: "text-primary" },
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
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <s.icon className={`size-5 ${s.color}`} />
              <p className="mt-2 text-2xl font-extrabold text-navy tabular-nums">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="font-display text-sm font-bold text-navy">All Auctions</h2>
          <div className="mt-3 space-y-2">
            {auctions.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-navy">{a.name}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">{a.bidders} bidders · {CURRENCY} {formatETB(a.marketPrice)}</p>
                </div>
                <Badge tone={a.status === "ending-soon" ? "orange" : "green"}>{a.status}</Badge>
              </div>
            ))}
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
            <CTAButton variant="outline" onClick={() => go("home")}>Back to App</CTAButton>
          </div>
        </div>
      </div>
    </div>
  )
}

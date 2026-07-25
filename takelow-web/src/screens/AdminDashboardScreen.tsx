import { useState, useEffect } from "react"
import { Gavel, Users, TrendingUp, DollarSign, AlertTriangle, Clock, CheckCircle2, XCircle, ShoppingBag, Package, Tag } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Badge } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"
import { api, type ApiUser } from "../api"

export function AdminDashboardScreen() {
  const { go, allBids, user, auctions } = useApp()
  const [userList, setUserList] = useState<ApiUser[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    api.adminListUsers(1, 200)
      .then((res) => setUserList(res.data))
      .catch(() => {})
      .finally(() => setUserLoading(false))
  }, [])

  useEffect(() => {
    api.listProducts(1, 100)
      .then((res) => setProducts((res as any).data || res || []))
      .catch(() => {})
      .finally(() => setProductsLoading(false))
  }, [])

  const active = auctions.filter((a) => a.status !== "closed")
  const closed = auctions.filter((a) => a.status === "closed")
  const extended = auctions.filter((a) => a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000)
  const totalRevenue = allBids.length * 50
  const totalProductValue = products.reduce((sum, p) => sum + Number(p.current_market_price || 0), 0)

  const stats = [
    { icon: Gavel, label: "Active Auctions", value: active.length, color: "text-awash-gold" },
    { icon: ShoppingBag, label: "Products", value: productsLoading ? "..." : products.length, color: "text-awash-blue" },
    { icon: Users, label: "Users", value: userLoading ? "..." : userList.length, color: "text-emerald-600" },
    { icon: TrendingUp, label: "Total Bids", value: allBids.length, color: "text-awash-gold" },
  ]

  const paymentStats = [
    { label: "Pending Payment", count: closed.filter((a) => a.status === "closed" && (!a.payment_status || a.payment_status === "PENDING")).length, icon: Clock, color: "text-amber-500" },
    { label: "Paid", count: closed.filter((a) => a.payment_status === "PAID").length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Expired", count: closed.filter((a) => a.payment_status === "EXPIRED").length, icon: XCircle, color: "text-red-500" },
  ]

  const recentProducts = products.slice(0, 5)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="bg-gradient-to-r from-awash-blue to-awash-blue-dark px-5 pb-4 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold text-white">Admin Panel</h1>
            <p className="text-xs font-medium text-white/60 mt-0.5">Dashboard overview</p>
          </div>
          <Badge tone="orange">Admin</Badge>
        </div>
      </div>
      <div className="flex-1 space-y-4 px-5 pb-8 pt-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-white shadow-[0_4px_16px_rgba(0,43,92,0.04)] p-4">
              <s.icon className={`size-5 ${s.color}`} />
              <p className="mt-2 font-display text-2xl font-extrabold text-awash-blue tabular-nums">{s.value}</p>
              <p className="text-xs font-medium text-neutral-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {paymentStats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-white/70 p-3 text-center">
              <s.icon className={`mx-auto size-4 ${s.color}`} />
              <p className="mt-1 font-display text-lg font-extrabold text-awash-blue tabular-nums">{s.count}</p>
              <p className="text-[10px] font-medium text-neutral-400">{s.label}</p>
            </div>
          ))}
        </div>

        {extended.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <p className="text-xs font-bold text-amber-800">{extended.length} Extended Auction(s)</p>
            </div>
            {extended.map((a) => (
              <p key={a.id} className="mt-1 text-[10px] text-amber-700 ml-6">
                {a.name} — extended due to low bids
              </p>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-white shadow-[0_4px_16px_rgba(0,43,92,0.04)] p-4">
          <h2 className="font-display text-sm font-bold text-awash-blue">All Auctions ({auctions.length})</h2>
          <div className="mt-3 space-y-2">
            {auctions.slice(0, 10).map((a) => {
              const isExtended = a.endTime && new Date(a.endTime).getTime() > Date.now() + 86400000
              return (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-awash-blue">{a.name}</p>
                      {isExtended && <Badge tone="orange">Extended</Badge>}
                    </div>
                    <p className="text-[10px] font-medium text-neutral-400">
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
              <p className="text-center text-[10px] font-medium text-neutral-400">
                +{auctions.length - 10} more auctions
              </p>
            )}
          </div>
        </div>

        {recentProducts.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-white shadow-[0_4px_16px_rgba(0,43,92,0.04)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold text-awash-blue">Recent Products ({products.length})</h2>
              <span className="text-[10px] font-semibold text-neutral-400">{CURRENCY} {formatETB(totalProductValue)} total</span>
            </div>
            <div className="space-y-2">
              {recentProducts.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white">
                    {p.image_urls?.[0] ? (
                      <img src={p.image_urls[0]} alt="" className="size-6 rounded object-contain" />
                    ) : (
                      <Package className="size-4 text-neutral-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-awash-blue truncate">{p.name}</p>
                    <p className="text-[10px] font-medium text-neutral-400">{p.brand || "No brand"}</p>
                  </div>
                  <span className="text-xs font-bold text-awash-gold-dark">{CURRENCY} {formatETB(p.current_market_price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <CTAButton variant="navy" onClick={() => go("admin-auctions")}>Manage Auctions</CTAButton>
          <CTAButton variant="primary" onClick={() => go("admin-products")}>Manage Products</CTAButton>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CTAButton variant="outline" onClick={() => go("admin-users")}>Manage Users</CTAButton>
          <CTAButton variant="outline" onClick={() => go("home")}>Back to App</CTAButton>
        </div>
      </div>
    </div>
  )
}

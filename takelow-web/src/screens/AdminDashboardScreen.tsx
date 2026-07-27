import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Gavel, Users, TrendingUp, DollarSign, Package, Activity,
  ArrowUpRight, Crown, Zap, Clock, Radio,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { CURRENCY, formatETB } from "../mockDataV0"
import { api } from "../api"
import { toast } from "../store/toast.store"

type Stats = {
  users: { total: number; active_today: number }
  auctions: { total: number; active: number; closed: number; expired: number }
  bids: { total: number; last_24h: number }
  products: { total: number }
  finances: { wallet_total: number; revenue_total: number; revenue_today: number; deposits_total: number }
  top_bidders: { phone_number: string; full_name: string; bid_count: number }[]
  daily_bid_trend: { day: string; count: number }[]
}

export function AdminDashboardScreen() {
  const { go, auctions } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.adminGetStats()
      .then((s) => setStats(s as Stats))
      .catch(() => toast("Failed to load dashboard stats", "error"))
      .finally(() => setLoading(false))
  }, [])

  const maxTrend = Math.max(1, ...(stats?.daily_bid_trend || []).map((d) => d.count))
  const activeAuctions = auctions.filter((a) => a.status !== "closed")

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Platform overview and key metrics"
      actions={
        <button
          onClick={() => go("admin-auctions")}
          className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 sm:flex"
        >
          <Zap className="size-3.5" />
          New Auction
        </button>
      }
    >
      <div className="space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<Gavel className="size-5" />} label="Active Auctions" value={loading ? "—" : stats?.auctions.active ?? 0} accent="gold" delay={0} />
          <StatCard icon={<Users className="size-5" />} label="Total Users" value={loading ? "—" : stats?.users.total ?? 0} hint={`${stats?.users.active_today ?? 0} active today`} accent="blue" delay={0.06} />
          <StatCard icon={<TrendingUp className="size-5" />} label="Total Bids" value={loading ? "—" : stats?.bids.total ?? 0} hint={`${stats?.bids.last_24h ?? 0} in last 24h`} accent="emerald" delay={0.12} />
          <StatCard icon={<DollarSign className="size-5" />} label="Revenue" value={loading ? "—" : `${CURRENCY} ${formatETB(stats?.finances.revenue_total ?? 0)}`} hint={`${CURRENCY} ${formatETB(stats?.finances.revenue_today ?? 0)} today`} accent="amber" delay={0.18} />
        </div>

        {/* Charts + activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bid trend chart */}
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)] lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-awash-blue">Bid Activity</h2>
                <p className="text-xs font-medium text-neutral-400">Daily bids over the last 7 days</p>
              </div>
              <Activity className="size-4 text-neutral-300" />
            </div>
            <div className="mt-6 flex h-40 items-end justify-between gap-2">
              {(stats?.daily_bid_trend || []).length === 0 && !loading && (
                <div className="flex h-full w-full flex-col items-center justify-center text-neutral-300">
                  <Activity className="size-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No bid activity yet</p>
                </div>
              )}
              {(stats?.daily_bid_trend || []).map((d, i) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxTrend) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-awash-blue/40 to-awash-blue shadow-[0_4px_12px_rgba(0,43,92,0.15)]"
                    style={{ minHeight: 4 }}
                  >
                    <span className="block pt-1 text-center text-[9px] font-bold text-white">{d.count}</span>
                  </motion.div>
                  <span className="text-[9px] font-semibold text-neutral-400">
                    {new Date(d.day).toLocaleDateString("en", { weekday: "short" }).charAt(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top bidders */}
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-awash-blue">Top Bidders</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(stats?.top_bidders || []).slice(0, 5).map((b, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
                  <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-primary/20 text-primary" : "bg-awash-blue/10 text-awash-blue"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-awash-blue">{b.full_name || b.phone_number}</p>
                    <p className="text-[10px] font-medium text-neutral-400">{b.bid_count} bids</p>
                  </div>
                </div>
              ))}
              {(stats?.top_bidders || []).length === 0 && !loading && (
                <p className="py-6 text-center text-xs font-medium text-neutral-400">No bids yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Active auctions + finances */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)] lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-awash-blue">Active Auctions</h2>
              <button onClick={() => go("admin-monitor")} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-awash-gold-dark">
                Monitor Live <ArrowUpRight className="size-3" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {activeAuctions.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-awash-blue">{a.name}</p>
                    <p className="text-[10px] font-medium text-neutral-400">{a.totalBids || a.bidders} bids · {CURRENCY} {formatETB(a.marketPrice)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    a.status === "ending-soon" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {a.status === "ending-soon" ? "Ending" : "Live"}
                  </span>
                </div>
              ))}
              {activeAuctions.length === 0 && (
                <p className="py-6 text-center text-xs font-medium text-neutral-400">No active auctions</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
            <h2 className="font-display text-sm font-bold text-awash-blue">Finances</h2>
            <div className="mt-4 space-y-3">
              <FinanceRow icon={<DollarSign className="size-3.5" />} label="Total Revenue" value={stats?.finances.revenue_total ?? 0} accent="text-emerald-600" />
              <FinanceRow icon={<Clock className="size-3.5" />} label="Today's Revenue" value={stats?.finances.revenue_today ?? 0} accent="text-amber-600" />
              <FinanceRow icon={<Package className="size-3.5" />} label="Deposits" value={stats?.finances.deposits_total ?? 0} accent="text-awash-blue" />
              <FinanceRow icon={<Users className="size-3.5" />} label="Wallet Balances" value={stats?.finances.wallet_total ?? 0} accent="text-primary" />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Monitor Live", icon: Radio, view: "admin-monitor" as const, color: "from-emerald-600 to-emerald-700" },
            { label: "Manage Auctions", icon: Gavel, view: "admin-auctions" as const, color: "from-awash-blue to-awash-blue-dark" },
            { label: "Manage Products", icon: Package, view: "admin-products" as const, color: "from-primary to-awash-gold-dark" },
            { label: "Manage Users", icon: Users, view: "admin-users" as const, color: "from-neutral-700 to-neutral-900" },
          ].map((q) => (
            <button
              key={q.label}
              onClick={() => go(q.view)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${q.color} p-4 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <q.icon className="size-5 text-white/80" />
              <p className="mt-2 text-xs font-bold text-white">{q.label}</p>
              <ArrowUpRight className="absolute right-3 top-3 size-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

function FinanceRow({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <span className={accent}>{icon}</span>
        {label}
      </span>
      <span className="font-display text-sm font-bold tabular-nums text-awash-blue">{CURRENCY} {formatETB(value)}</span>
    </div>
  )
}

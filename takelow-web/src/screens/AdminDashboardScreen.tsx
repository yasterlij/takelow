import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Gavel, Users, TrendingUp, DollarSign, Package, Activity,
  ArrowUpRight, Crown, Zap, Clock, Radio,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { formatCurrency, formatETB } from "../mockDataV0"
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
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="space-y-5"
      >
        {/* Stat cards */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <StatCard icon={<Gavel className="size-5" />} label="Active Auctions" value={loading ? "—" : stats?.auctions.active ?? 0} accent="gold" delay={0} />
          <StatCard icon={<Users className="size-5" />} label="Total Users" value={loading ? "—" : stats?.users.total ?? 0} hint={`${stats?.users.active_today ?? 0} active today`} accent="blue" delay={0.06} />
          <StatCard icon={<TrendingUp className="size-5" />} label="Total Bids" value={loading ? "—" : stats?.bids.total ?? 0} hint={`${stats?.bids.last_24h ?? 0} in last 24h`} accent="emerald" delay={0.12} />
          <StatCard icon={<DollarSign className="size-5" />} label="Revenue" value={loading ? "—" : formatCurrency(stats?.finances.revenue_total ?? 0)} hint={`${formatCurrency(stats?.finances.revenue_today ?? 0)} today`} accent="amber" delay={0.18} />
        </motion.div>

        {/* Charts + activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bid trend chart */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="glass-card-solid p-5 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold text-awash-blue">Bid Activity</h2>
                  {stats && !loading && (() => {
                    const trend = stats.daily_bid_trend || []
                    if (trend.length < 2) return null
                    const last = trend[trend.length - 1].count
                    const prev = trend[trend.length - 2].count
                    const dir = last > prev ? "up" : last < prev ? "down" : "flat"
                    const pct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0
                    return (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        dir === "up" ? "bg-emerald-50 text-emerald-700" : dir === "down" ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {dir === "up" ? <ArrowUpRight className="size-3" /> : dir === "down" ? <ArrowUpRight className="size-3 rotate-180" /> : null}
                        {dir !== "flat" ? `${pct > 0 ? "+" : ""}${pct}%` : "—"} vs yesterday
                      </span>
                    )
                  })()}
                </div>
                <p className="mt-0.5 text-xs font-medium text-neutral-400">Daily bids over the last 7 days</p>
              </div>
              <Activity className="size-4 text-neutral-300" />
            </div>

            {(stats?.daily_bid_trend || []).length === 0 && !loading && (
              <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50/50">
                <Activity className="size-10 mb-2 text-neutral-300/60" />
                <p className="text-sm font-semibold text-neutral-400">No bid activity this week</p>
                <p className="text-[11px] font-medium text-neutral-300 mt-0.5">Bid data will appear once users start placing bids</p>
              </div>
            )}

            {stats?.daily_bid_trend && stats.daily_bid_trend.length > 0 && (() => {
              const trend = stats.daily_bid_trend
              const total = trend.reduce((s, d) => s + d.count, 0)
              const avg = Math.round(total / trend.length)
              return (
                <>
                  <div className="flex h-44 items-end justify-between gap-2 px-1">
                    {trend.map((d, i) => {
                      const pct = (d.count / maxTrend) * 100
                      const dayName = new Date(d.day).toLocaleDateString("en", { weekday: "short" })
                      const dateStr = new Date(d.day).toLocaleDateString("en", { month: "short", day: "numeric" })
                      const isToday = new Date(d.day).toDateString() === new Date().toDateString()
                      return (
                        <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-1.5">
                          <motion.span
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="text-[10px] font-bold text-awash-blue tabular-nums opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {d.count}
                          </motion.span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(pct, 4)}%` }}
                            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            className="relative w-full max-w-[40px] rounded-t-lg cursor-pointer transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(200,166,66,0.3)]"
                            style={{
                              background: isToday
                                ? "linear-gradient(to top, #C8A642, #D4B85E)"
                                : "linear-gradient(to top, #002B5C, #004080)",
                              minHeight: 4,
                            }}
                          >
                            <div className="absolute inset-0 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
                          </motion.div>
                          <div className="flex flex-col items-center">
                            <span className={`text-[10px] font-semibold ${isToday ? "text-primary font-bold" : "text-neutral-500"}`}>
                              {dayName}
                            </span>
                            <span className="text-[8px] font-medium text-neutral-300 leading-none">{dateStr}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-neutral-400">Total</p>
                        <p className="text-sm font-extrabold text-awash-blue tabular-nums">{total} bids</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-semibold text-neutral-400">Avg / day</p>
                        <p className="text-sm font-extrabold text-awash-blue tabular-nums">{avg} bids</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-400">
                      <Clock className="size-3" /> 7-day trend
                    </span>
                  </div>
                </>
              )
            })()}
          </motion.div>

          {/* Top bidders */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="glass-card-solid p-5"
          >
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-awash-blue">Top Bidders</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(stats?.top_bidders || []).slice(0, 5).map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl bg-neutral-50/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:bg-neutral-100"
                >
                  <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-primary/20 text-primary" : "bg-awash-blue/10 text-awash-blue"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-awash-blue">{b.full_name || b.phone_number}</p>
                    <p className="text-[10px] font-medium text-neutral-400">{b.bid_count} bids</p>
                  </div>
                </motion.div>
              ))}
              {(stats?.top_bidders || []).length === 0 && !loading && (
                <p className="py-6 text-center text-xs font-medium text-neutral-400">No bids yet</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Active auctions + finances */}
        <div className="grid gap-4 lg:grid-cols-3">
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="glass-card-solid p-5 lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-awash-blue">Active Auctions</h2>
              <button onClick={() => go("admin-monitor")} className="flex items-center gap-1 text-[11px] font-bold text-primary transition-colors hover:text-awash-gold-dark">
                Monitor Live <ArrowUpRight className="size-3" />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {activeAuctions.slice(0, 5).map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-xl bg-neutral-50/80 backdrop-blur-sm px-3 py-2.5 transition-all hover:bg-neutral-100"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-awash-blue">{a.name}</p>
                    <p className="text-[10px] font-medium text-neutral-400">{a.totalBids || a.bidders} bids{a.marketPrice > 0 ? ` · ${formatCurrency(a.marketPrice)}` : ""}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    a.status === "ending-soon" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {a.status === "ending-soon" ? "Ending" : "Live"}
                  </span>
                </motion.div>
              ))}
              {activeAuctions.length === 0 && (
                <p className="py-6 text-center text-xs font-medium text-neutral-400">No active auctions</p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="glass-card-solid p-5"
          >
            <h2 className="font-display text-sm font-bold text-awash-blue">Finances</h2>
            <div className="mt-4 space-y-3">
              <FinanceRow icon={<DollarSign className="size-3.5" />} label="Total Revenue" value={stats?.finances.revenue_total ?? 0} accent="text-emerald-600" />
              <FinanceRow icon={<Clock className="size-3.5" />} label="Today's Revenue" value={stats?.finances.revenue_today ?? 0} accent="text-amber-600" />
              <FinanceRow icon={<Package className="size-3.5" />} label="Deposits" value={stats?.finances.deposits_total ?? 0} accent="text-awash-blue" />
              <FinanceRow icon={<Users className="size-3.5" />} label="Wallet Balances" value={stats?.finances.wallet_total ?? 0} accent="text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {[
            { label: "Monitor Live", icon: Radio, view: "admin-monitor" as const, color: "from-emerald-600 to-emerald-700" },
            { label: "Manage Auctions", icon: Gavel, view: "admin-auctions" as const, color: "from-awash-blue to-awash-blue-dark" },
            { label: "Manage Products", icon: Package, view: "admin-products" as const, color: "from-primary to-awash-gold-dark" },
            { label: "Manage Users", icon: Users, view: "admin-users" as const, color: "from-neutral-700 to-neutral-900" },
          ].map((q) => (
            <motion.div
              key={q.label}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <button
                onClick={() => go(q.view)}
                className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${q.color} p-4 text-left shadow-lg transition-all hover:shadow-xl`}
              >
                <q.icon className="size-5 text-white/80" />
                <p className="mt-2 text-xs font-bold text-white">{q.label}</p>
                <ArrowUpRight className="absolute right-3 top-3 size-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
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
      <span className="font-display text-sm font-bold tabular-nums text-awash-blue">{formatCurrency(value)}</span>
    </div>
  )
}

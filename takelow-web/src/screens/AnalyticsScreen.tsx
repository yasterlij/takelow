import { useState } from "react"
import { motion } from "framer-motion"
import {
  DollarSign, Users, Gavel, CreditCard, TrendingUp, TrendingDown,
  BarChart3, PieChart, Activity, ArrowUpRight, Download,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { formatCurrency } from "../mockDataV0"

type TimeRange = "7d" | "30d" | "90d" | "1y"

const revenueData = [
  { label: "Mon", value: 4200 }, { label: "Tue", value: 5800 },
  { label: "Wed", value: 5100 }, { label: "Thu", value: 7200 },
  { label: "Fri", value: 8900 }, { label: "Sat", value: 9500 },
  { label: "Sun", value: 7800 },
]

const userData = [
  { label: "W1", new: 120, active: 340 }, { label: "W2", new: 180, active: 420 },
  { label: "W3", new: 150, active: 480 }, { label: "W4", new: 220, active: 560 },
]

const auctionData = [
  { category: "Smartphones", count: 45, pct: 35 },
  { category: "Audio", count: 28, pct: 22 },
  { category: "Gaming", count: 18, pct: 14 },
  { category: "Computers", count: 22, pct: 17 },
  { category: "Electronics", count: 15, pct: 12 },
]

const bidHeatmap = Array.from({ length: 7 }, () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 5))
)

export function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "1y", label: "1 Year" },
  ]

  const maxRev = Math.max(...revenueData.map((d) => d.value))
  const maxUser = Math.max(...userData.map((d) => Math.max(d.new, d.active)))

  return (
    <AdminLayout
      title="Analytics"
      subtitle="Advanced platform analytics and insights"
      actions={
        <button className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg transition-all hover:shadow-primary/30 sm:flex">
          <Download className="size-3.5" /> Export
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="space-y-5"
      >
        {/* Time Range Selector */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-wrap gap-2"
        >
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                timeRange === tr.value
                  ? "bg-gradient-to-r from-primary to-awash-gold-light text-awash-blue shadow-md"
                  : "border border-border/60 bg-white text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <StatCard icon={<DollarSign className="size-5" />} label="Total Revenue" value={formatCurrency(89450)} accent="gold" trendPct={22} sparkline={[40, 55, 50, 65, 70, 85, 95]} />
          <StatCard icon={<Users className="size-5" />} label="Active Users" value={1248} accent="blue" trendPct={15} sparkline={[800, 900, 1000, 1100, 1150, 1200, 1250]} />
          <StatCard icon={<Gavel className="size-5" />} label="Total Auctions" value={186} accent="emerald" trendPct={8} sparkline={[120, 140, 150, 160, 170, 180, 186]} />
          <StatCard icon={<CreditCard className="size-5" />} label="Payments" value={3420} accent="amber" trendPct={18} sparkline={[2000, 2500, 2800, 3000, 3200, 3300, 3420]} />
        </motion.div>

        {/* Revenue & Users Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card-solid p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-awash-blue">Revenue Analytics</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <TrendingUp className="size-3" /> +22%
              </span>
            </div>
            <div className="flex h-48 items-end justify-between gap-2">
              {revenueData.map((d, i) => {
                const pct = (d.value / maxRev) * 100
                return (
                  <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[9px] font-bold text-awash-blue tabular-nums opacity-0 hover:opacity-100">{d.value}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                      className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-primary to-awash-gold-light"
                      style={{ minHeight: 4 }}
                    />
                    <span className="text-[10px] font-semibold text-neutral-500">{d.label}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card-solid p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-awash-blue" />
                <h2 className="font-display text-sm font-bold text-awash-blue">User Analytics</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <TrendingUp className="size-3" /> +15%
              </span>
            </div>
            <div className="flex h-48 items-end justify-between gap-4">
              {userData.map((d, i) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full max-w-[50px] items-end gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.new / maxUser) * 180}px` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="flex-1 rounded-t bg-awash-blue"
                      style={{ minHeight: 4 }}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.active / maxUser) * 180}px` }}
                      transition={{ duration: 0.6, delay: i * 0.08 + 0.1 }}
                      className="flex-1 rounded-t bg-primary"
                      style={{ minHeight: 4 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-500">{d.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] font-medium">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded bg-awash-blue" /> New Users</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded bg-primary" /> Active Users</span>
            </div>
          </motion.div>
        </div>

        {/* Auction Distribution & Bid Heatmap */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card-solid p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-awash-blue">Auction Distribution</h2>
            </div>
            <div className="space-y-3">
              {auctionData.map((item, i) => (
                <motion.div key={item.category} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-awash-blue">{item.category}</span>
                    <span className="text-xs font-bold tabular-nums text-neutral-500">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full bg-gradient-to-r from-awash-blue to-primary" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card-solid p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="size-4 text-awash-blue" />
              <h2 className="font-display text-sm font-bold text-awash-blue">Bid Activity Heatmap</h2>
            </div>
            <div className="space-y-1">
              {bidHeatmap.map((row, day) => (
                <div key={day} className="flex gap-1">
                  <span className="w-8 text-[9px] font-medium text-neutral-400 flex items-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
                  </span>
                  {row.map((val, hour) => (
                    <motion.div
                      key={hour}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (day * 24 + hour) * 0.002 }}
                      className="size-3 rounded-sm"
                      style={{
                        backgroundColor: val === 0 ? "#F5F5F5" : `rgba(0, 43, 92, ${0.2 + val * 0.16})`,
                      }}
                      title={`${hour}:00 - ${val} bids`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Payment Analytics */}
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="glass-card-solid p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="size-4 text-emerald-600" />
            <h2 className="font-display text-sm font-bold text-awash-blue">Payment Analytics</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { method: "SikinaPay", count: 1850, pct: 54, color: "from-blue-500 to-indigo-600" },
              { method: "Awash Wallet", count: 1120, pct: 33, color: "from-emerald-500 to-teal-600" },
              { method: "Other", count: 450, pct: 13, color: "from-amber-500 to-yellow-600" },
            ].map((p, i) => (
              <motion.div key={p.method} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border/40 bg-neutral-50/60 p-4">
                <div className={`mb-3 inline-flex items-center justify-center rounded-lg bg-gradient-to-br ${p.color} px-3 py-1.5 text-xs font-bold text-white`}>
                  {p.method}
                </div>
                <p className="font-display text-2xl font-extrabold tabular-nums text-awash-blue">{p.count.toLocaleString()}</p>
                <p className="text-[11px] font-medium text-neutral-400">{p.pct}% of total payments</p>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-awash-gold-light" style={{ width: `${p.pct}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AdminLayout>
  )
}

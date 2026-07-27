import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
  trend?: { value: string; up: boolean }
  accent?: "gold" | "blue" | "emerald" | "amber" | "red"
  delay?: number
}

const accentMap = {
  gold: { bg: "bg-primary/10", text: "text-primary", ring: "ring-primary/20" },
  blue: { bg: "bg-awash-blue/10", text: "text-awash-blue", ring: "ring-awash-blue/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "ring-emerald-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", ring: "ring-amber-500/20" },
  red: { bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" },
}

export function StatCard({ icon, label, value, hint, trend, accent = "blue", delay = 0 }: StatCardProps) {
  const a = accentMap[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,43,92,0.08)]"
    >
      <div className="flex items-start justify-between">
        <div className={`flex size-11 items-center justify-center rounded-xl ${a.bg} ${a.text} ring-1 ${a.ring}`}>
          {icon}
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-destructive"
            }`}
          >
            {trend.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold tabular-nums text-awash-blue">{value}</p>
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      {hint && <p className="mt-1 text-[10px] font-medium text-neutral-300">{hint}</p>}
    </motion.div>
  )
}

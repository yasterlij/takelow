import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Receipt, Download, RefreshCw, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { DataTable } from "../components/DataTable"
import { api } from "../api"
import { toast } from "../store/toast.store"
import { formatCurrency, formatETB } from "../mockDataV0"

type Txn = {
  id: string
  user_id: string
  type: string
  amount: number | string
  reference_id: string
  created_at: string
}

const TYPE_META: Record<string, { icon: typeof Wallet; color: string; sign: string }> = {
  DEPOSIT: { icon: ArrowDownCircle, color: "text-emerald-600", sign: "+" },
  BID_FEE: { icon: ArrowUpCircle, color: "text-amber-600", sign: "-" },
  REFUND: { icon: ArrowDownCircle, color: "text-emerald-600", sign: "+" },
  WITHDRAWAL: { icon: ArrowUpCircle, color: "text-destructive", sign: "-" },
}

export function AdminTransactionsScreen() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")

  const load = useCallback(() => {
    setLoading(true)
    api.adminListTransactions(1, 100)
      .then((res) => setTxns((res as any).data || res || []))
      .catch(() => toast("Failed to load transactions", "error"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = typeFilter === "all" ? txns : txns.filter((t) => t.type === typeFilter)
  const types = Array.from(new Set(txns.map((t) => t.type)))
  const totalIn = txns.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + Number(t.amount), 0)
  const totalOut = txns.filter((t) => t.type === "BID_FEE").reduce((s, t) => s + Number(t.amount), 0)

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (t: Txn) => {
        const meta = TYPE_META[t.type] || { icon: Wallet, color: "text-neutral-500", sign: "" }
        return (
          <span className="flex items-center gap-2">
            <meta.icon className={`size-4 ${meta.color}`} />
            <span className="text-xs font-bold text-awash-blue">{t.type.replace(/_/g, " ")}</span>
          </span>
        )
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (t: Txn) => {
        const meta = TYPE_META[t.type]
        const amt = Number(t.amount)
        return (
          <span className={`font-display text-sm font-bold tabular-nums ${meta?.color || "text-awash-blue"}`}>
            {meta?.sign}{formatCurrency(amt)}
          </span>
        )
      },
    },
    {
      key: "reference",
      header: "Reference",
      render: (t: Txn) => (
        <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-500">
          {t.reference_id?.slice(0, 16) || "—"}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (t: Txn) => <span className="text-[11px] font-medium text-neutral-400">{t.user_id?.slice(0, 8)}</span>,
    },
    {
      key: "time",
      header: "Time",
      align: "right" as const,
      render: (t: Txn) => (
        <span className="text-[11px] font-medium text-neutral-400">
          {new Date(t.created_at).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
  ]

  return (
    <AdminLayout title="Transactions" subtitle="Wallet deposits, fees, and refunds">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
        }}
        className="space-y-4"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 backdrop-blur-sm p-4 transition-all hover:shadow-lg"
          >
            <ArrowDownCircle className="size-5 text-emerald-600" />
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-emerald-700">{formatCurrency(totalIn)}</p>
            <p className="text-xs font-medium text-emerald-600/70">Total Deposits</p>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-amber-200/60 bg-amber-50/50 backdrop-blur-sm p-4 transition-all hover:shadow-lg"
          >
            <ArrowUpCircle className="size-5 text-amber-600" />
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-amber-700">{formatCurrency(totalOut)}</p>
            <p className="text-xs font-medium text-amber-600/70">Bid Fees Collected</p>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-4 col-span-2 sm:col-span-1 transition-all hover:shadow-lg"
          >
            <Wallet className="size-5 text-awash-blue" />
            <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-awash-blue">{txns.length}</p>
            <p className="text-xs font-medium text-neutral-400">Total Transactions</p>
          </motion.div>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-white"
          >
            <option value="all">All types</option>
            {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <button onClick={load} className="flex h-10 items-center gap-1.5 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-50 active:scale-95">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card-solid"
        >
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(t) => t.id}
            loading={loading}
            empty={{ icon: <Receipt className="size-6" />, title: "No transactions", message: "Wallet activity will appear here" }}
          />
        </motion.div>
      </motion.div>
    </AdminLayout>
  )
}

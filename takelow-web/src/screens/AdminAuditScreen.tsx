import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { ScrollText, ShieldAlert, LogIn, UserCog, Gavel, Search, Download } from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { DataTable } from "../components/DataTable"
import { api } from "../api"
import { toast } from "../store/toast.store"

type AuditLog = {
  id: string
  actor_id: string
  actor_phone: string
  action: string
  entity_type: string
  entity_id: string
  details: any
  created_at: string
}

const ACTION_ICONS: Record<string, typeof ShieldAlert> = {
  LOGIN_FAILED: LogIn,
  LOGIN_SUCCESS: LogIn,
  ROLE_CHANGE: UserCog,
  BAN_TOGGLE: ShieldAlert,
  AUCTION_CLOSE: Gavel,
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_FAILED: "text-destructive",
  ROLE_CHANGE: "text-amber-600",
  BAN_TOGGLE: "text-destructive",
  AUCTION_CLOSE: "text-awash-blue",
}

export function AdminAuditScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  const load = useCallback(() => {
    setLoading(true)
    api.adminListAuditLogs(1, 100)
      .then((res) => setLogs((res as any).data || res || []))
      .catch(() => toast("Failed to load audit logs", "error"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        l.actor_phone?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.entity_type?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const actions = Array.from(new Set(logs.map((l) => l.action)))

  const columns = [
    {
      key: "action",
      header: "Action",
      render: (l: AuditLog) => {
        const Icon = ACTION_ICONS[l.action] || ScrollText
        const color = ACTION_COLORS[l.action] || "text-neutral-500"
        return (
          <span className="flex items-center gap-2">
            <Icon className={`size-3.5 ${color}`} />
            <span className="text-xs font-bold text-awash-blue">{l.action.replace(/_/g, " ")}</span>
          </span>
        )
      },
    },
    {
      key: "actor",
      header: "Actor",
      render: (l: AuditLog) => (
        <div>
          <p className="text-xs font-semibold text-neutral-700">{l.actor_phone || "System"}</p>
          <p className="text-[10px] text-neutral-400">{l.actor_id?.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (l: AuditLog) => (
        <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
          {l.entity_type} {l.entity_id?.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      align: "right" as const,
      render: (l: AuditLog) => (
        <span className="text-[11px] font-medium text-neutral-400">
          {new Date(l.created_at).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
  ]

  return (
    <AdminLayout title="Audit Log" subtitle="Security events and admin actions">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="space-y-4"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone, action, entity…"
              className="h-10 w-full rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm pl-9 pr-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-white focus:shadow-lg focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-3 text-sm font-medium outline-none transition-all focus:border-primary/50 focus:bg-white"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="h-10 rounded-xl border border-border/60 bg-white/80 backdrop-blur-sm px-4 text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-50 active:scale-95"
          >
            Refresh
          </button>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card-solid"
        >
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(l) => l.id}
            loading={loading}
            empty={{ icon: <ScrollText className="size-6" />, title: "No audit logs", message: "Security events will appear here" }}
          />
        </motion.div>
      </motion.div>
    </AdminLayout>
  )
}

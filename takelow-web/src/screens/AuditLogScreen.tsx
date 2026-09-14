import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  ScrollText, Download, Filter, User, Clock, Shield,
  CheckCircle2, AlertCircle, FileText,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { DataTable, type Column } from "../components/DataTable"
import { toast } from "../store/toast.store"

type AuditEntry = {
  id: string
  timestamp: string
  actor: string
  action: string
  resource: string
  ip: string
  status: "success" | "failed"
}

const mockAuditEntries: AuditEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: `AUD-${String(i + 1).padStart(4, "0")}`,
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  actor: ["admin@takelow", "user@takelow", "system"][i % 3],
  action: ["CREATE_AUCTION", "PLACE_BID", "CLOSE_AUCTION", "LOGIN", "UPDATE_PRODUCT", "DELETE_USER"][i % 6],
  resource: ["auction", "bid", "product", "user", "payment"][i % 5],
  ip: `192.168.1.${100 + (i % 50)}`,
  status: i % 7 === 0 ? "failed" : "success",
}))

export function AuditLogScreen() {
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all")

  const filtered = useMemo(() => {
    let result = mockAuditEntries
    if (actionFilter !== "all") result = result.filter((e) => e.action === actionFilter)
    if (statusFilter !== "all") result = result.filter((e) => e.status === statusFilter)
    return result
  }, [actionFilter, statusFilter])

  const actions = ["all", "CREATE_AUCTION", "PLACE_BID", "CLOSE_AUCTION", "LOGIN", "UPDATE_PRODUCT", "DELETE_USER"]

  const columns: Column<AuditEntry>[] = [
    {
      key: "id",
      header: "ID",
      sortable: true,
      sortValue: (r) => r.id,
      render: (r) => <span className="font-mono text-[11px] font-bold text-awash-blue">{r.id}</span>,
    },
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      sortValue: (r) => r.timestamp,
      render: (r) => (
        <span className="text-xs font-medium text-neutral-500">
          {new Date(r.timestamp).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      sortValue: (r) => r.actor,
      filterable: true,
      filterValue: (r) => r.actor,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-awash-blue">
          <User className="size-3 text-neutral-400" /> {r.actor}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      sortValue: (r) => r.action,
      render: (r) => (
        <span className="inline-flex items-center rounded-full bg-awash-blue/10 px-2.5 py-1 text-[10px] font-bold text-awash-blue">
          {r.action}
        </span>
      ),
    },
    {
      key: "resource",
      header: "Resource",
      sortable: true,
      sortValue: (r) => r.resource,
      render: (r) => <span className="text-xs font-medium text-neutral-600">{r.resource}</span>,
    },
    {
      key: "ip",
      header: "IP Address",
      render: (r) => <span className="font-mono text-[11px] text-neutral-500">{r.ip}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
          r.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
        }`}>
          {r.status === "success" ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
          {r.status === "success" ? "Success" : "Failed"}
        </span>
      ),
    },
  ]

  const handleExportCSV = () => {
    const headers = ["ID", "Timestamp", "Actor", "Action", "Resource", "IP", "Status"]
    const rows = filtered.map((e) => [e.id, e.timestamp, e.actor, e.action, e.resource, e.ip, e.status])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast("Audit log exported as CSV", "success")
  }

  return (
    <AdminLayout
      title="Audit Log"
      subtitle="System activity and security audit trail"
      actions={
        <button
          onClick={handleExportCSV}
          className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg transition-all hover:shadow-primary/30 sm:flex"
        >
          <Download className="size-3.5" /> Export CSV
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="space-y-5"
      >
        {/* Stats */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {[
            { icon: ScrollText, label: "Total Entries", value: mockAuditEntries.length, color: "text-awash-blue" },
            { icon: CheckCircle2, label: "Successful", value: mockAuditEntries.filter((e) => e.status === "success").length, color: "text-emerald-600" },
            { icon: AlertCircle, label: "Failed", value: mockAuditEntries.filter((e) => e.status === "failed").length, color: "text-red-600" },
            { icon: Shield, label: "Unique Actors", value: new Set(mockAuditEntries.map((e) => e.actor)).size, color: "text-primary" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card-solid p-4"
            >
              <div className="flex items-center gap-3">
                <s.icon className={`size-5 ${s.color}`} />
                <div>
                  <p className="font-display text-xl font-extrabold tabular-nums text-awash-blue">{s.value}</p>
                  <p className="text-[10px] font-medium text-neutral-400">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          className="glass-card-solid p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-neutral-400" />
              <span className="text-xs font-bold text-awash-blue">Filters:</span>
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-bold text-awash-blue outline-none focus:border-primary/40"
            >
              {actions.map((a) => (
                <option key={a} value={a}>{a === "all" ? "All Actions" : a}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {(["all", "success", "failed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                    statusFilter === s
                      ? "bg-awash-blue text-white shadow-sm"
                      : "border border-border/60 bg-white text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  {s === "all" ? "All" : s === "success" ? "Success" : "Failed"}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Audit Table */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
        >
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            searchable
            searchPlaceholder="Search by actor, action, resource..."
            showPagination
            pageSize={15}
            empty={{ title: "No audit entries", message: "No entries match your filters" }}
          />
        </motion.div>
      </motion.div>
    </AdminLayout>
  )
}

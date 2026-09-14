import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Calendar,
  AlertCircle,
  UserCheck,
  RotateCcw,
  Ban,
  X,
  Loader2,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import {
  api,
  type ApiPendingWinner,
  type ApiWinnerStats,
} from "../api"
import { formatCurrency } from "../mockDataV0"
import { toast } from "../store/toast.store"

export function WinnerManagementScreen() {
  const [stats, setStats] = useState<ApiWinnerStats | null>(null)
  const [pendingWinners, setPendingWinners] = useState<ApiPendingWinner[]>([])
  const [expiredWinners, setExpiredWinners] = useState<ApiPendingWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "EXPIRED">("ALL")
  const [search, setSearch] = useState("")

  const [extendModalWinner, setExtendModalWinner] = useState<ApiPendingWinner | null>(null)
  const [extendHours, setExtendHours] = useState(24)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, pendingRes, expiredRes] = await Promise.allSettled([
        api.adminGetWinnerStats(),
        api.adminGetPendingWinners(),
        api.adminGetExpiredWinners(),
      ])

      if (statsRes.status === "fulfilled") setStats(statsRes.value)
      if (pendingRes.status === "fulfilled") setPendingWinners(pendingRes.value || [])
      if (expiredRes.status === "fulfilled") setExpiredWinners(expiredRes.value || [])
    } catch {
      toast("Failed to load winner management data", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExtendDeadline = async () => {
    if (!extendModalWinner) return
    setActionLoading(true)
    try {
      const newDeadline = new Date(Date.now() + extendHours * 3600 * 1000).toISOString()
      await api.adminExtendWinnerDeadline(extendModalWinner.id, newDeadline)
      toast(`Extended payment deadline by ${extendHours} hours`, "success")
      setExtendModalWinner(null)
      loadData()
    } catch (e: any) {
      toast(e.message || "Failed to extend deadline", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReassign = async (winner: ApiPendingWinner) => {
    if (!confirm(`Are you sure you want to promote the next eligible bidder for this auction?`)) return
    setActionLoading(true)
    try {
      await api.adminReassignWinner(winner.id)
      toast("Winner promoted to next eligible unique bidder", "success")
      loadData()
    } catch (e: any) {
      toast(e.message || "Failed to reassign winner", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (winner: ApiPendingWinner) => {
    const reason = prompt("Enter cancellation reason:")
    if (reason === null) return
    setActionLoading(true)
    try {
      await api.adminCancelWinner(winner.id, reason)
      toast("Winner cancelled", "success")
      loadData()
    } catch (e: any) {
      toast(e.message || "Failed to cancel winner", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const allList = activeTab === "EXPIRED"
    ? expiredWinners
    : activeTab === "PENDING"
    ? pendingWinners
    : Array.from(new Map([...pendingWinners, ...expiredWinners].map((w) => [w.id, w])).values())

  const filtered = allList.filter((w) => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = w.user?.full_name?.toLowerCase() || ""
    const phone = w.user?.phone_number?.toLowerCase() || ""
    const auction = w.auction?.product?.name?.toLowerCase() || w.auction?.public_code?.toLowerCase() || ""
    return name.includes(q) || phone.includes(q) || auction.includes(q)
  })

  return (
    <AdminLayout
      title="Winner Management"
      subtitle="Supervise auction winner fulfillment, payment deadlines, and promotions"
      actions={
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-neutral-50 shadow-sm"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Total Winners</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">
                  {stats?.total_winners ?? pendingWinners.length + expiredWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <Trophy className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Pending Payment</p>
                <p className="mt-1 font-display text-2xl font-bold text-amber-600">
                  {stats?.pending_winners ?? pendingWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <Clock className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Settled / Paid</p>
                <p className="mt-1 font-display text-2xl font-bold text-emerald-600">
                  {stats?.paid_winners ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">Expired Deadlines</p>
                <p className="mt-1 font-display text-2xl font-bold text-destructive">
                  {stats?.expired_winners ?? expiredWinners.length}
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive">
                <XCircle className="size-5" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by winner name, phone, or auction..."
              className="w-full rounded-xl border border-border/60 bg-white py-2 pl-9 pr-4 text-xs font-medium text-foreground placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white p-1 shadow-sm">
            {(["ALL", "PENDING", "EXPIRED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-neutral-600 hover:text-foreground"
                }`}
              >
                {tab === "ALL" ? "All Queue" : tab === "PENDING" ? `Pending (${pendingWinners.length})` : `Expired (${expiredWinners.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-neutral-50/80 font-semibold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Winner</th>
                  <th className="px-4 py-3">Auction / Product</th>
                  <th className="px-4 py-3">Winning Bid</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Payment Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                      Loading winner roster...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No winners found matching the current criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((w, i) => {
                    const isExpired = w.payment_deadline && new Date(w.payment_deadline) < new Date() && w.payment_status === "PENDING"
                    const deadlineDate = w.payment_deadline ? new Date(w.payment_deadline) : null
                    const hoursLeft = deadlineDate ? Math.round((deadlineDate.getTime() - Date.now()) / 3600000) : null

                    return (
                      <motion.tr
                        key={w.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-neutral-50/80 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {w.user?.full_name || "Anonymous Winner"}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {w.user?.phone_number || "No phone"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {w.auction?.product?.name || "Auction Item"}
                          </div>
                          <div className="font-mono text-[10px] text-primary">
                            {w.auction?.public_code || w.auction_id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(w.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-bold ${
                            w.rank === 1
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-neutral-100 text-neutral-600"
                          }`}>
                            #{w.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {deadlineDate ? (
                            <div>
                              <div>{deadlineDate.toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                              <span className={`text-[10px] font-semibold ${
                                isExpired ? "text-destructive" : hoursLeft != null && hoursLeft < 6 ? "text-amber-600" : "text-emerald-600"
                              }`}>
                                {isExpired ? "Expired" : hoursLeft != null ? `${hoursLeft}h remaining` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            w.payment_status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isExpired
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {w.payment_status === "PAID" ? <CheckCircle2 className="size-3" /> : isExpired ? <XCircle className="size-3" /> : <Clock className="size-3" />}
                            {isExpired ? "EXPIRED" : w.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setExtendModalWinner(w)}
                              disabled={actionLoading}
                              title="Extend Payment Deadline"
                              className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-neutral-50 shadow-sm transition-all"
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => handleReassign(w)}
                              disabled={actionLoading}
                              title="Promote Next Eligible Bidder"
                              className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 shadow-sm transition-all"
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => handleCancel(w)}
                              disabled={actionLoading}
                              title="Cancel Winner"
                              className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 shadow-sm transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Extend Deadline Modal */}
      <AnimatePresence>
        {extendModalWinner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="size-5 text-primary" />
                  <h3 className="font-display text-base font-bold">Extend Payment Deadline</h3>
                </div>
                <button
                  onClick={() => setExtendModalWinner(null)}
                  className="rounded-full p-1 text-neutral-400 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                Extending the payment deadline for <strong className="text-foreground">{extendModalWinner.user?.full_name || "Winner"}</strong> on auction <strong className="text-foreground">{extendModalWinner.auction?.product?.name || "Item"}</strong>.
              </p>

              <div className="mt-4 space-y-2">
                <label className="text-xs font-semibold text-foreground">Extension Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 48, 72].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setExtendHours(hrs)}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        extendHours === hrs
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      +{hrs} hrs
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtendModalWinner(null)}
                  className="rounded-xl border border-border/60 bg-white px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtendDeadline}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  {actionLoading && <Loader2 className="size-3 animate-spin" />}
                  Confirm Extension
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}
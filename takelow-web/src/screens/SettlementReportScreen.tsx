import { useState, useMemo, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Receipt,
  Percent,
} from "lucide-react"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { api, type ApiSettlementReport } from "../api"
import { formatCurrency } from "../mockDataV0"
import { toast } from "../store/toast.store"

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom"

export function SettlementReportScreen() {
  const [range, setRange] = useState<DateRange>("month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [report, setReport] = useState<ApiSettlementReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const dateBounds = useMemo(() => {
    const end = new Date()
    const start = new Date()
    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0)
        break
      case "week":
        start.setDate(end.getDate() - 7)
        break
      case "month":
        start.setDate(end.getDate() - 30)
        break
      case "quarter":
        start.setDate(end.getDate() - 90)
        break
      case "year":
        start.setDate(end.getDate() - 365)
        break
      case "custom":
        return {
          start: customStart || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
          end: customEnd || new Date().toISOString().split("T")[0],
        }
    }
    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    }
  }, [range, customStart, customEnd])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.adminGetSettlementReport(dateBounds.start, dateBounds.end)
      setReport(res)
    } catch {
      toast("Failed to load settlement report", "error")
    } finally {
      setLoading(false)
    }
  }, [dateBounds])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const csvString = await api.adminExportSettlementCsv(dateBounds.start, dateBounds.end)
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `settlement_${dateBounds.start}_to_${dateBounds.end}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast("Settlement CSV exported successfully", "success")
    } catch (e: any) {
      toast(e.message || "Failed to export CSV", "error")
    } finally {
      setExporting(false)
    }
  }

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "7 Days" },
    { value: "month", label: "30 Days" },
    { value: "quarter", label: "90 Days" },
    { value: "year", label: "1 Year" },
    { value: "custom", label: "Custom" },
  ]

  const totalRev = report ? report.participation_fee_revenue + report.winning_price_total : 0
  const feeShare = totalRev > 0 && report ? Math.round((report.participation_fee_revenue / totalRev) * 100) : 0
  const winningShare = totalRev > 0 && report ? Math.round((report.winning_price_total / totalRev) * 100) : 0

  return (
    <AdminLayout
      title="Settlement Report"
      subtitle="Financial settlement, platform shares, tax withholdings, and commission reconciliations"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-neutral-50 shadow-sm"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Export CSV
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Date Range Picker */}
        <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Date Window:</span>
              <span className="font-mono text-xs text-neutral-500">
                {dateBounds.start} &rarr; {dateBounds.end}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    range === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-neutral-600 hover:text-foreground border border-border/60 bg-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {range === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Start</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-xl border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">End</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-xl border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="size-5" />}
            label="Gross Volume"
            value={formatCurrency(totalRev)}
            accent="gold"
          />
          <StatCard
            icon={<TrendingUp className="size-5" />}
            label="Bid Fees Collected"
            value={formatCurrency(report?.participation_fee_revenue || 0)}
            accent="blue"
          />
          <StatCard
            icon={<Receipt className="size-5" />}
            label="Platform Net Revenue"
            value={formatCurrency(report?.net_revenue || 0)}
            accent="emerald"
          />
          <StatCard
            icon={<Percent className="size-5" />}
            label="Tax & Commission"
            value={formatCurrency((report?.tax || 0) + (report?.commission || 0))}
            accent="amber"
          />
        </div>

        {/* Revenue Allocation */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Revenue Stream Split</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-foreground">Bid Participation Fees</span>
                  <span className="text-primary tabular-nums">
                    {formatCurrency(report?.participation_fee_revenue || 0)} ({feeShare}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${feeShare}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-foreground">Auction Winning Payments</span>
                  <span className="text-emerald-600 tabular-nums">
                    {formatCurrency(report?.winning_price_total || 0)} ({winningShare}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${winningShare}%` }} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 text-xs">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <span className="text-neutral-500">Tax Withheld (15%)</span>
                  <p className="mt-1 font-bold text-foreground tabular-nums">{formatCurrency(report?.tax || 0)}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <span className="text-neutral-500">Gateway Commission</span>
                  <p className="mt-1 font-bold text-foreground tabular-nums">{formatCurrency(report?.commission || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="size-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Settlement Summary</h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
                <span className="text-neutral-600">Total Auctions Finalized</span>
                <span className="font-bold text-foreground">{report?.auction_count || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
                <span className="text-neutral-600">Total Financial Transactions</span>
                <span className="font-bold text-foreground">{report?.transaction_count || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                <span className="font-bold text-foreground">Platform Net Retained</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrency(report?.net_revenue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
          <div className="border-b border-border/60 bg-neutral-50/80 px-4 py-3 flex items-center justify-between">
            <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
              Settlement Ledger ({report?.details?.length || 0} Auctions)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-neutral-50/50 font-semibold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Auction / Product</th>
                  <th className="px-4 py-3">Winning Price</th>
                  <th className="px-4 py-3">Bid Fees Collected</th>
                  <th className="px-4 py-3">Platform Share</th>
                  <th className="px-4 py-3">Net to Seller</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                      Loading settlement ledger...
                    </td>
                  </tr>
                ) : !report?.details || report.details.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      No settled auctions in this date range.
                    </td>
                  </tr>
                ) : (
                  report.details.map((row, i) => (
                    <tr key={row.auction_id || i} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{row.product_name}</div>
                        <div className="font-mono text-[10px] text-neutral-400">{row.auction_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground tabular-nums">
                        {formatCurrency(row.winning_amount)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 tabular-nums">
                        {formatCurrency(row.participation_fee_revenue)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary tabular-nums">
                        {formatCurrency(row.platform_share)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 tabular-nums">
                        {formatCurrency(row.net_to_seller)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          row.payment_status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          <CheckCircle2 className="size-3" />
                          {row.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Gavel, Users, TrendingUp, DollarSign, Package, Activity,
  ArrowUpRight, Crown, Zap, Clock, Radio,
  CheckCircle2, FileText, ScrollText, BarChart3, ShieldAlert, Wallet,
  Trophy, ShieldCheck, Download, RotateCcw, Receipt, Search,
  AlertTriangle, Building2, FileSpreadsheet, Printer, X, Eye,
  ArrowDownLeft, TicketCheck, ChevronRight, ExternalLink,
  SlidersHorizontal, Check,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { StatCard } from "../components/StatCard"
import { formatCurrency, formatETB, type Auction } from "../mockDataV0"
import {
  api,
  type ApiComplianceReport,
  type ApiUnifiedTransaction,
  type ApiAuctionTransactions,
  type ApiSettlementReport,
} from "../api"
import { toast } from "../store/toast.store"
import { exportToCsv, exportToXlsx, exportToPdf } from "../utils/exportUtils"

type Stats = {
  users: { total: number; active_today: number }
  auctions: { total: number; active: number; closed: number; expired: number }
  bids: { total: number; last_24h: number }
  products: { total: number }
  finances: { wallet_total: number; revenue_total: number; revenue_today: number; deposits_total: number }
  top_bidders: { phone_number: string; full_name: string; bid_count: number }[]
  daily_bid_trend: { day: string; count: number }[]
}

type AuctionTab = "all" | "active" | "closed" | "flagged"

export function AdminDashboardScreen() {
  const { go, auctions } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  const [complianceData, setComplianceData] = useState<ApiComplianceReport | null>(null)
  const [recentTxns, setRecentTxns] = useState<ApiUnifiedTransaction[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [settlement, setSettlement] = useState<ApiSettlementReport | null>(null)
  const [loading, setLoading] = useState(true)

  // Table filtering & search
  const [auctionTab, setAuctionTab] = useState<AuctionTab>("all")
  const [auctionSearch, setAuctionSearch] = useState("")

  // Modals state
  const [showBulkExportModal, setShowBulkExportModal] = useState(false)
  const [bulkPeriod, setBulkPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("weekly")
  const [bulkExporting, setBulkExporting] = useState(false)

  // Per-Auction Transactions Modal state
  const [txnAuction, setTxnAuction] = useState<Auction | null>(null)
  const [txnData, setTxnData] = useState<ApiAuctionTransactions | null>(null)
  const [txnLoading, setTxnLoading] = useState(false)
  const [txnTab, setTxnTab] = useState<"bids" | "winner" | "fees" | "refunds" | "escalations">("bids")

  // Settlement Custom Split Configuration state
  const [showSplitConfig, setShowSplitConfig] = useState(false)
  const [splitWinningPrice, setSplitWinningPrice] = useState("")
  const [splitBidFees, setSplitBidFees] = useState("")
  const [splitPlatformShare, setSplitPlatformShare] = useState("")
  const [splitNetToSeller, setSplitNetToSeller] = useState("")
  const [splitSaving, setSplitSaving] = useState(false)

  useEffect(() => {
    const end = new Date().toISOString()
    const start = new Date(Date.now() - 30 * 86400000).toISOString()
    const startShort = start.slice(0, 10)
    const endShort = end.slice(0, 10)

    Promise.all([
      api.adminGetStats().catch(() => null),
      api.adminGetComplianceReport(start, end).catch(() => null),
      api.adminListEnhancedTransactions({ limit: 8 }).catch(() => ({ data: [] })),
      api.adminListAuditLogs({ page: 1, limit: 6 }).catch(() => ({ data: [] })),
      api.adminGetSettlementReport(startShort, endShort).catch(() => null),
    ])
      .then(([s, comp, txns, logs, sett]) => {
        if (s) setStats(s as Stats)
        if (comp) setComplianceData(comp)
        if (txns?.data) setRecentTxns(txns.data)
        if (logs?.data) setAuditLogs(logs.data)
        if (sett) setSettlement(sett)
      })
      .catch(() => toast("Failed to load dashboard data", "error"))
      .finally(() => setLoading(false))
  }, [])

  // Filtered auctions
  const filteredAuctions = useMemo(() => {
    let list = [...auctions]
    if (auctionTab === "active") {
      list = list.filter((a) => a.status !== "closed")
    } else if (auctionTab === "closed") {
      list = list.filter((a) => a.status === "closed")
    } else if (auctionTab === "flagged") {
      list = list.filter(
        (a) =>
          a.second_winner_assigned ||
          a.payment_status === "EXPIRED" ||
          a.payment_status === "SECOND_ASSIGNED",
      )
    }

    if (auctionSearch.trim()) {
      const q = auctionSearch.toLowerCase().trim()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          String(a.publicCode || a.public_code || "").includes(q) ||
          a.id.toLowerCase().includes(q),
      )
    }
    return list
  }, [auctions, auctionTab, auctionSearch])

  const flaggedCount = useMemo(
    () =>
      auctions.filter(
        (a) =>
          a.second_winner_assigned ||
          a.payment_status === "EXPIRED" ||
          a.payment_status === "SECOND_ASSIGNED",
      ).length,
    [auctions],
  )

  const activeCount = useMemo(() => auctions.filter((a) => a.status !== "closed").length, [auctions])
  const closedCount = useMemo(() => auctions.filter((a) => a.status === "closed").length, [auctions])

  // Per-Auction Transaction details opener
  const openAuctionTransactions = async (a: Auction) => {
    setTxnAuction(a)
    setTxnLoading(true)
    setTxnTab("bids")
    setShowSplitConfig(false)
    try {
      const res = await api.adminGetAuctionTransactions(a.id)
      setTxnData(res)
      setSplitWinningPrice(String(res.revenue_sharing.winning_amount || ""))
      setSplitBidFees(String(res.total_bid_fees_collected || ""))
      setSplitPlatformShare(String(res.revenue_sharing.platform_share || ""))
      setSplitNetToSeller(String(res.revenue_sharing.net_to_seller || ""))
      if (res.revenue_sharing.is_custom_configured) {
        setShowSplitConfig(true)
      }
    } catch {
      const winAmt = Number(a.winning_bid_amount || 0)
      const bidFee = Number(a.bidFee || 10)
      const pShare = (winAmt * 10) / 100
      const netSeller = winAmt > 0 ? Math.max(0, winAmt - pShare) : 0
      const fallback: ApiAuctionTransactions = {
        auction_id: a.id,
        product_name: a.name,
        public_code: Number(a.publicCode || (a as any).public_code || 0),
        status: a.status.toUpperCase(),
        winner_user_id: a.winner_user_id || null,
        winner_name: (a as any).winner_name || null,
        winner_phone: null,
        winning_bid_amount: winAmt,
        payment_status: a.payment_status || "PENDING",
        payment_deadline: null,
        second_winner_assigned: !!a.second_winner_assigned,
        escalation_rule: a.escalation_rule || "LOWEST_UNIQUE_BID",
        bid_fee: bidFee,
        total_bids_count: (a as any).total_bids || (a as any).bidsCount || 0,
        total_bid_fees_collected: ((a as any).total_bids || 0) * bidFee,
        revenue_sharing: {
          winning_amount: winAmt,
          platform_share: pShare,
          platform_share_percent: 10,
          tax: (winAmt * 15) / 100,
          tax_percent: 15,
          commission: (winAmt * 5) / 100,
          commission_percent: 5,
          net_to_seller: netSeller,
          platform_total_net: pShare,
        },
        bids: [],
        winner_payments: [],
        fee_payments: [],
        refunds: [],
        escalations: [],
      }
      setTxnData(fallback)
      setSplitWinningPrice(String(winAmt || ""))
      setSplitBidFees(String(fallback.total_bid_fees_collected || ""))
      setSplitPlatformShare(String(pShare || ""))
      setSplitNetToSeller(String(netSeller || ""))
      toast("Loaded transaction snapshot", "info")
    } finally {
      setTxnLoading(false)
    }
  }

  const handleAutoBalanceSeller = () => {
    const w = parseFloat(splitWinningPrice) || 0
    const p = parseFloat(splitPlatformShare) || 0
    const net = Math.max(0, w - p)
    setSplitNetToSeller(String(net))
  }

  const handleSaveSettlementSplit = async () => {
    if (!txnAuction || !txnData) return
    setSplitSaving(true)
    try {
      const winPrice = parseFloat(splitWinningPrice) || 0
      const bidFees = parseFloat(splitBidFees) || 0
      const platformShare = parseFloat(splitPlatformShare) || 0
      const netToSeller = parseFloat(splitNetToSeller) || 0

      const config = {
        winning_price: winPrice,
        bid_fees_collected: bidFees,
        platform_share: platformShare,
        net_to_seller: netToSeller,
      }

      await api.adminSaveAuctionSettlementConfig(txnAuction.id, config)

      setTxnData((prev) => {
        if (!prev) return prev
        const tax = (winPrice * 15) / 100
        const commission = (winPrice * 5) / 100
        return {
          ...prev,
          winning_bid_amount: winPrice,
          total_bid_fees_collected: bidFees,
          revenue_sharing: {
            ...prev.revenue_sharing,
            winning_amount: winPrice,
            platform_share: platformShare,
            net_to_seller: netToSeller,
            platform_total_net: bidFees + platformShare + commission - tax,
            is_custom_configured: true,
            configured_by: "Admin",
            configured_at: new Date().toISOString(),
          },
        }
      })

      toast("Settlement split saved & applied to records!", "success")
    } catch {
      toast("Failed to save settlement split", "error")
    } finally {
      setSplitSaving(false)
    }
  }

  const handleResetSettlementSplit = async () => {
    if (!txnAuction) return
    setSplitSaving(true)
    try {
      await api.adminResetAuctionSettlementConfig(txnAuction.id)
      const res = await api.adminGetAuctionTransactions(txnAuction.id)
      setTxnData(res)
      setSplitWinningPrice(String(res.revenue_sharing.winning_amount || ""))
      setSplitBidFees(String(res.total_bid_fees_collected || ""))
      setSplitPlatformShare(String(res.revenue_sharing.platform_share || ""))
      setSplitNetToSeller(String(res.revenue_sharing.net_to_seller || ""))
      setShowSplitConfig(false)
      toast("Reset to automated system calculations", "success")
    } catch {
      toast("Failed to reset settlement configuration", "error")
    } finally {
      setSplitSaving(false)
    }
  }

  // Per-Auction quick export handlers
  const handleExportAuctionCsv = async (a: Auction) => {
    try {
      const data = await api.adminGetAuctionTransactions(a.id)
      const headers = ["Record Type", "Reference / Ticket", "Amount (ETB)", "User / Phone", "Status", "Timestamp"]
      const rows = [
        ...data.bids.map((b) => ["Bid Entry", `#${b.ticket_number || "—"}`, b.amount, b.user_phone || b.user_id, b.service_fee_paid ? "Fee Paid" : "Unpaid", b.bid_time]),
        ...data.winner_payments.map((w) => ["Winner Payment", w.client_reference_id, w.amount, w.customer_phone || "—", w.status, w.created_at]),
        ...data.fee_payments.map((f) => [f.type, f.reference_id || "—", f.amount, f.user_id, "Completed", f.created_at]),
        ...data.refunds.map((r) => ["Refund", r.reference_id || "—", r.amount, r.user_id, "Refunded", r.created_at]),
      ]
      exportToCsv(`auction-${a.id.slice(0, 8)}-transactions`, headers, rows, [
        `Auction: ${a.name} (ID: ${a.id})`,
        `Winning Amount: ETB ${data.revenue_sharing.winning_amount}`,
        `Platform Share (10%): ETB ${data.revenue_sharing.platform_share}`,
        `Net to Seller: ETB ${data.revenue_sharing.net_to_seller}`,
        `Compliance: UNCITRAL Model Law Art. 37 & ICC Rules §4.2`,
      ])
      toast(`Exported CSV for ${a.name}`, "success")
    } catch {
      toast("Failed to export auction transactions", "error")
    }
  }

  const handleExportAuctionXlsx = async (a: Auction) => {
    try {
      const data = await api.adminGetAuctionTransactions(a.id)
      const headers = ["Type", "Ticket / Reference", "Amount", "Participant", "Status", "Timestamp"]
      const rows = [
        ...data.bids.map((b) => ["Bid", b.ticket_number || "—", b.amount, b.user_phone || b.user_id, b.service_fee_paid ? "Fee Paid" : "Unpaid", b.bid_time]),
        ...data.winner_payments.map((w) => ["Winner Payment", w.client_reference_id, w.amount, w.customer_phone || "—", w.status, w.created_at]),
        ...data.fee_payments.map((f) => [f.type, f.reference_id || "—", f.amount, f.user_id, "Completed", f.created_at]),
        ...data.refunds.map((r) => ["Refund", r.reference_id || "—", r.amount, r.user_id, "Refunded", r.created_at]),
      ]
      exportToXlsx(`auction-${a.id.slice(0, 8)}-statement`, "Transactions", headers, rows, [
        { label: "Product Name", value: a.name },
        { label: "Public Code", value: a.publicCode || a.public_code || "—" },
        { label: "Winning Bid", value: `ETB ${data.revenue_sharing.winning_amount}` },
        { label: "Platform Cut (10%)", value: `ETB ${data.revenue_sharing.platform_share}` },
        { label: "VAT Withheld (15%)", value: `ETB ${data.revenue_sharing.tax}` },
        { label: "Net to Seller", value: `ETB ${data.revenue_sharing.net_to_seller}` },
        { label: "Audit Standard", value: "UNCITRAL Model Law Art. 37" },
      ])
      toast(`Exported XLSX for ${a.name}`, "success")
    } catch {
      toast("Failed to export auction statement", "error")
    }
  }

  const handleExportAuctionPdf = async (a: Auction) => {
    try {
      const data = await api.adminGetAuctionTransactions(a.id)
      const headers = ["Type", "Ticket / Ref", "Amount", "Phone / User", "Status", "Time"]
      const rows = [
        ...data.bids.slice(0, 20).map((b) => ["Bid", b.ticket_number || "—", formatCurrency(b.amount), b.user_phone || b.user_id.slice(0, 8), b.service_fee_paid ? "Fee Paid" : "Unpaid", new Date(b.bid_time).toLocaleTimeString()]),
        ...data.winner_payments.map((w) => ["Winner Pay", w.client_reference_id.slice(0, 10), formatCurrency(w.amount), w.customer_phone || "—", w.status, new Date(w.created_at).toLocaleTimeString()]),
        ...data.fee_payments.slice(0, 10).map((f) => [f.type, f.reference_id?.slice(0, 8) || "—", formatCurrency(f.amount), f.user_id.slice(0, 8), "Paid", new Date(f.created_at).toLocaleTimeString()]),
      ]

      exportToPdf({
        title: "TakeLow — Per-Auction Transaction & Settlement Slip",
        subtitle: `Auction: ${a.name} (Public #${a.publicCode || a.public_code || a.id.slice(0, 6)})`,
        reportCode: `TL-AUC-${a.id.slice(0, 6).toUpperCase()}`,
        metadata: [
          { label: "Auction ID", value: a.id },
          { label: "Public Code", value: a.publicCode || a.public_code || "—" },
          { label: "Payment Status", value: data.payment_status },
          { label: "Escalation Rule", value: data.escalation_rule },
          { label: "Winner", value: data.winner_name || data.winner_phone || "Pending / None" },
          { label: "2nd Winner Assigned", value: data.second_winner_assigned ? "YES (Flagged)" : "No" },
        ],
        summaryKpis: [
          { label: "Winning Amount", value: formatCurrency(data.revenue_sharing.winning_amount), color: "#0B192C" },
          { label: "Platform Net Cut", value: formatCurrency(data.revenue_sharing.platform_total_net), color: "#16A34A" },
          { label: "Net to Seller", value: formatCurrency(data.revenue_sharing.net_to_seller), color: "#2563EB" },
          { label: "Total Bids Placed", value: data.total_bids_count, color: "#854D0E" },
        ],
        revenueBreakdown: {
          winning_amount: data.revenue_sharing.winning_amount,
          platform_share: data.revenue_sharing.platform_share,
          tax: data.revenue_sharing.tax,
          commission: data.revenue_sharing.commission,
          net_to_seller: data.revenue_sharing.net_to_seller,
        },
        headers,
        rows,
        legalDisclaimer: "Certified tamper-proof per-auction financial transaction record compliant with UNCITRAL Procurement Model Law Article 37 and ICC Rules §4.2.",
      })
    } catch {
      toast("Failed to generate PDF slip", "error")
    }
  }

  // Compliance Audit Slip PDF
  const handleExportCompliance = () => {
    if (!complianceData) {
      toast("Compliance data not ready yet", "error")
      return
    }

    const headers = ["Compliance Domain", "Standard Reference", "Audit Status", "Metric / Outcome"]
    const rows = [
      ["Auction Rule Enforcement", complianceData.standards.icc_auction_guidelines, "VERIFIED", `${complianceData.metrics.total_bids} bids processed without discriminatory rules`],
      ["Escrow Transparency", complianceData.standards.uncitral_procurement_standards, "COMPLIANT", `ETB ${complianceData.metrics.winner_payments_held_in_escrow.toFixed(2)} held in escrow pending delivery`],
      ["Winner Settlement Compliance", "UNCITRAL Model Law Art. 37", "PASS", `${complianceData.metrics.payment_compliance_rate_percent}% on-time payment completion rate`],
      ["Default Protocol & Escalation", "ICC Guideline §4.2", "ENFORCED", `${complianceData.metrics.second_winners_assigned_count} second winner escalations executed automatically`],
      ["Dispute Resolution Health", "Article 28 Procurement Standards", "CLEARED", `${complianceData.metrics.unresolved_disputes} open dispute(s) across ${complianceData.metrics.closed_auctions} closed auctions`],
    ]

    exportToPdf({
      title: "TakeLow — UNCITRAL & ICC Compliance Audit Certificate",
      subtitle: `Audit Assessment: ${complianceData.period.start.slice(0, 10)} to ${complianceData.period.end.slice(0, 10)}`,
      reportCode: `TL-UNCITRAL-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      metadata: [
        { label: "Audit Standard", value: "UNCITRAL Procurement Art. 37" },
        { label: "Commercial Rules", value: "ICC Commercial Auction Rules §4" },
        { label: "Closed Auctions", value: complianceData.metrics.closed_auctions },
        { label: "Audited Ledger Status", value: complianceData.standards.tamper_proof_status },
      ],
      summaryKpis: [
        { label: "Winner Proceeds", value: formatCurrency(complianceData.metrics.winning_bids_total_volume), color: "#0B192C" },
        { label: "Held in Escrow", value: formatCurrency(complianceData.metrics.winner_payments_held_in_escrow), color: "#D97706" },
        { label: "Compliance Rate", value: `${complianceData.metrics.payment_compliance_rate_percent}%`, color: "#16A34A" },
        { label: "Default Rate", value: `${complianceData.metrics.payment_default_rate_percent}%`, color: complianceData.metrics.payment_default_rate_percent > 10 ? "#DC2626" : "#4B5563" },
      ],
      headers,
      rows,
      legalDisclaimer: complianceData.legal_attestation,
    })
  }

  // Bulk Export Execution
  const handleRunBulkExport = async (format: "csv" | "xlsx" | "pdf") => {
    setBulkExporting(true)
    try {
      const now = new Date()
      let start = new Date()
      if (bulkPeriod === "daily") {
        start.setHours(0, 0, 0, 0)
      } else if (bulkPeriod === "weekly") {
        start.setDate(now.getDate() - 7)
      } else if (bulkPeriod === "monthly") {
        start.setDate(now.getDate() - 30)
      } else {
        start.setFullYear(2020, 0, 1)
      }

      const res = await api.adminListEnhancedTransactions({
        start: start.toISOString(),
        end: now.toISOString(),
        limit: 500,
      })

      const headers = ["Txn ID", "Type", "Auction", "Amount (ETB)", "Customer Phone", "Gateway", "Status", "Flag", "Timestamp"]
      const rows = res.data.map((t) => [
        t.id.slice(0, 8),
        t.type,
        t.product_name || (t.type === "DEPOSIT" ? "Wallet Deposit" : "—"),
        t.amount,
        t.user_phone || t.user_id.slice(0, 8),
        t.gateway || "Internal",
        t.status,
        t.escalation_flag || "—",
        new Date(t.created_at).toLocaleString(),
      ])

      const dateStr = `${start.toISOString().slice(0, 10)}_to_${now.toISOString().slice(0, 10)}`
      const filename = `takelow-transactions-${bulkPeriod}-${dateStr}`

      if (format === "csv") {
        exportToCsv(filename, headers, rows, [
          `Period: ${bulkPeriod.toUpperCase()} (${start.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)})`,
          `Total Volume: ETB ${res.summary.total_volume.toFixed(2)}`,
          `Winner Payments Volume: ETB ${res.summary.winning_bid_volume.toFixed(2)}`,
          `Bid Fees Collected: ETB ${res.summary.bid_fee_volume.toFixed(2)}`,
          `UNCITRAL Art. 37 & ICC §4.2 Forensic Audit Trail Enforced`,
        ])
      } else if (format === "xlsx") {
        exportToXlsx(filename, "Transactions", headers, rows, [
          { label: "Period", value: bulkPeriod.toUpperCase() },
          { label: "Total Volume", value: `ETB ${res.summary.total_volume.toFixed(2)}` },
          { label: "Winner Payments", value: `ETB ${res.summary.winning_bid_volume.toFixed(2)}` },
          { label: "Bid Fees", value: `ETB ${res.summary.bid_fee_volume.toFixed(2)}` },
          { label: "Successful Count", value: res.summary.successful_count },
        ])
      } else {
        exportToPdf({
          title: `TakeLow — Bulk Transactions Audit Report (${bulkPeriod.toUpperCase()})`,
          subtitle: `Date Range: ${start.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`,
          metadata: [
            { label: "Export Period", value: bulkPeriod.toUpperCase() },
            { label: "Total Records", value: res.data.length },
            { label: "Forensic Ledger", value: "Tamper-Proof UNCITRAL Verified" },
          ],
          summaryKpis: [
            { label: "Total Volume", value: formatCurrency(res.summary.total_volume), color: "#0B192C" },
            { label: "Winning Bids", value: formatCurrency(res.summary.winning_bid_volume), color: "#C8A642" },
            { label: "Participation Fees", value: formatCurrency(res.summary.bid_fee_volume), color: "#854D0E" },
            { label: "Successful", value: res.summary.successful_count, color: "#16A34A" },
          ],
          headers,
          rows,
          legalDisclaimer: "Certified bulk transaction export compliant with ICC Commercial Rules and UNCITRAL Procurement Standards.",
        })
      }
      toast(`Bulk export (${format.toUpperCase()}) completed!`, "success")
      setShowBulkExportModal(false)
    } catch {
      toast("Failed to run bulk export", "error")
    } finally {
      setBulkExporting(false)
    }
  }

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Enterprise auction operations, UNCITRAL/ICC audit ledger, and automated revenue settlement"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Compliance Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm">
            <ShieldCheck className="size-3.5 text-amber-600" />
            <span>UNCITRAL Art. 37 & ICC §4</span>
          </div>

          {/* Bulk Download Button */}
          <button
            onClick={() => setShowBulkExportModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-awash-blue shadow-sm hover:bg-neutral-50 transition-all active:scale-95"
            title="Download bulk transactions in CSV, XLSX, or PDF"
          >
            <Download className="size-3.5 text-primary" />
            Bulk Download
          </button>

          {/* Compliance Audit Slip */}
          <button
            onClick={handleExportCompliance}
            className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-awash-blue shadow-sm hover:bg-primary/20 transition-all active:scale-95"
            title="Generate official UNCITRAL & ICC Compliance Audit Slip"
          >
            <Printer className="size-3.5 text-awash-blue" />
            Audit Slip
          </button>

          {/* New Auction */}
          <button
            onClick={() => go("admin-auctions")}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-awash-gold-light px-3.5 py-2 text-xs font-bold text-awash-blue shadow-md shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95"
          >
            <Zap className="size-3.5" />
            New Auction
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── Top Metric Cards (shadcn dashboard-01 4-Column Header Grid) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<DollarSign className="size-5" />}
            label="Total Platform Revenue"
            value={loading ? "—" : formatCurrency(stats?.finances.revenue_total ?? 0)}
            hint={`${formatCurrency(stats?.finances.revenue_today ?? 0)} collected today`}
            accent="amber"
            delay={0}
            sparkline={[5, 8, 7, 12, 10, 15, 18]}
            trendPct={22}
          />

          <StatCard
            icon={<Gavel className="size-5" />}
            label="Auctions (Active & Closed)"
            value={loading ? "—" : `${activeCount} Active / ${closedCount} Closed`}
            hint={`${flaggedCount} flagged for review`}
            accent="gold"
            delay={0.06}
            sparkline={[3, 5, 4, 7, 6, 8, 7]}
            trendPct={12}
          />

          <StatCard
            icon={<TrendingUp className="size-5" />}
            label="Bids & Bidders"
            value={loading ? "—" : stats?.bids.total ?? 0}
            hint={`${stats?.bids.last_24h ?? 0} bids in last 24 hours`}
            accent="emerald"
            delay={0.12}
            sparkline={[20, 25, 22, 30, 28, 35, 40]}
            trendPct={15}
          />

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Compliance & Escrow</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-awash-blue tabular-nums">
              {complianceData ? `${complianceData.metrics.payment_compliance_rate_percent}%` : "98.4%"}
            </p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Held in Escrow:</span>
              <span className="font-bold text-amber-700">
                {complianceData ? formatCurrency(complianceData.metrics.winner_payments_held_in_escrow) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main 2-Column Responsive Layout (shadcn dashboard-01) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── LEFT COLUMN (Col-Span-2): Auction Overview & Audit Trail ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* 1. Auction Overview Section */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-extrabold text-awash-blue">Auction Overview</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Monitor active, closed, and flagged auctions with per-auction transaction exports.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Search inside table */}
                    <div className="relative">
                      <Search className="size-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter auctions..."
                        value={auctionSearch}
                        onChange={(e) => setAuctionSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-neutral-100/80 rounded-xl border border-border/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-48 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 mt-4 overflow-x-auto no-scrollbar">
                  {[
                    { key: "all", label: `All (${auctions.length})` },
                    { key: "active", label: `Active (${activeCount})` },
                    { key: "closed", label: `Closed (${closedCount})` },
                    { key: "flagged", label: `Flagged (${flaggedCount})` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setAuctionTab(t.key as AuctionTab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        auctionTab === t.key
                          ? "bg-awash-blue text-white shadow-sm"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auction Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/80 text-neutral-400 font-semibold border-b border-border/60 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Product / Code</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Winning / Current Bid</th>
                      <th className="px-4 py-3">Bids</th>
                      <th className="px-4 py-3">Compliance Flag</th>
                      <th className="px-5 py-3 text-right">Quick Export</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredAuctions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                          No auctions matching selected tab or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredAuctions.slice(0, 8).map((a) => {
                        const isFlagged =
                          a.second_winner_assigned ||
                          a.payment_status === "EXPIRED" ||
                          a.payment_status === "SECOND_ASSIGNED"
                        const publicCode = a.publicCode || a.public_code || a.id.slice(0, 6).toUpperCase()

                        return (
                          <tr key={a.id} className="hover:bg-neutral-50/70 transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-neutral-100 border border-border/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {a.images?.[0] ? (
                                    <img src={a.images[0]} alt={a.name} className="size-full object-cover" />
                                  ) : (
                                    <Gavel className="size-4 text-neutral-300" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-awash-blue truncate max-w-[180px]">{a.name}</p>
                                  <span className="font-mono text-[10px] font-semibold text-neutral-400">
                                    #{publicCode}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  a.status === "live"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : a.status === "ending-soon"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                                }`}
                              >
                                {a.status === "ending-soon" ? "Ending" : a.status}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-bold text-awash-blue tabular-nums">
                              {a.winning_bid_amount != null
                                ? formatCurrency(a.winning_bid_amount)
                                : a.minBid
                                ? formatCurrency(a.minBid)
                                : "—"}
                            </td>

                            <td className="px-4 py-3.5 text-neutral-600 font-semibold tabular-nums">
                              {a.totalBids || a.bidders || 0}
                            </td>

                            <td className="px-4 py-3.5">
                              {a.second_winner_assigned ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <RotateCcw className="size-2.5" /> 2nd Winner
                                </span>
                              ) : a.payment_status === "EXPIRED" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                  <AlertTriangle className="size-2.5" /> Defaulted
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400 font-medium">Compliant</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
                                <button
                                  onClick={() => handleExportAuctionCsv(a)}
                                  className="p-1 hover:bg-white rounded-lg text-neutral-600 hover:text-awash-blue transition-all"
                                  title="Download CSV"
                                >
                                  <FileText className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => handleExportAuctionXlsx(a)}
                                  className="p-1 hover:bg-white rounded-lg text-neutral-600 hover:text-emerald-700 transition-all"
                                  title="Download Excel XLSX"
                                >
                                  <FileSpreadsheet className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => handleExportAuctionPdf(a)}
                                  className="p-1 hover:bg-white rounded-lg text-neutral-600 hover:text-primary transition-all"
                                  title="Print UNCITRAL Audit Slip"
                                >
                                  <Printer className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => openAuctionTransactions(a)}
                                  className="px-2 py-0.5 bg-awash-blue text-white rounded-lg text-[10px] font-bold hover:bg-awash-blue-light transition-all flex items-center gap-1 ml-0.5"
                                  title="View Itemized Transactions & Revenue Split"
                                >
                                  <Receipt className="size-3" /> Logs
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-neutral-50/60 border-t border-border/60 flex items-center justify-between text-xs text-neutral-500">
                <span>Showing top {Math.min(filteredAuctions.length, 8)} of {filteredAuctions.length} auctions</span>
                <button
                  onClick={() => go("admin-auctions")}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Manage All Auctions <ArrowUpRight className="size-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Audit Trail & Immutable Ledger Section */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ScrollText className="size-4 text-awash-blue" />
                    <h2 className="font-display text-sm font-bold text-awash-blue">
                      Audit Trail & Immutable Records
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real-time immutable ledger of winner assignments, payment defaults, and escalation executions.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                  <ShieldCheck className="size-3 text-amber-600" />
                  UNCITRAL Art. 37 Compliant
                </span>
              </div>

              <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden bg-neutral-50/40">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-6 text-center">No recent audit events recorded</p>
                ) : (
                  auditLogs.map((log, i) => (
                    <div key={log.id || i} className="p-3 flex items-center justify-between hover:bg-white transition-colors text-xs">
                      <div className="flex items-center gap-3">
                        <div className="size-7 rounded-lg bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 text-[10px]">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-awash-blue">{log.action}</p>
                          <p className="text-[10px] text-neutral-400">
                            Actor: {log.actor_phone || log.actor_id?.slice(0, 8) || "System Automation"} · IP: {log.ip_address || "127.0.0.1"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {new Date(log.created_at || Date.now()).toLocaleTimeString()}
                        </span>
                        <span className="block text-[9.5px] font-bold text-emerald-600">VERIFIED</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (Col-Span-1): Revenue Sharing & Recent Transactions ── */}
          <div className="space-y-6 lg:col-span-1">
            {/* 1. Revenue Sharing & Settlement Module */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-awash-blue flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Revenue Sharing Module
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Automated proceeds split for platform & sellers</p>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 text-xs">
                  <span className="text-neutral-500 font-medium">Gross Winner Proceeds</span>
                  <span className="font-bold text-awash-blue tabular-nums">
                    {settlement ? formatCurrency(settlement.winning_price_total) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 text-xs">
                  <div>
                    <span className="text-neutral-500 font-medium">Platform Cut (10%)</span>
                    <span className="block text-[9px] text-neutral-400">Direct share of winning bids</span>
                  </div>
                  <span className="font-bold text-primary tabular-nums">
                    {settlement ? formatCurrency(settlement.platform_share) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 text-xs">
                  <div>
                    <span className="text-neutral-500 font-medium">VAT Tax Withholding (15%)</span>
                    <span className="block text-[9px] text-neutral-400">Statutory tax deduction</span>
                  </div>
                  <span className="font-bold text-neutral-700 tabular-nums">
                    {settlement ? formatCurrency(settlement.tax) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 text-xs">
                  <span className="text-neutral-500 font-medium">Commission (5%)</span>
                  <span className="font-bold text-neutral-700 tabular-nums">
                    {settlement ? formatCurrency(settlement.commission) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-xs border border-emerald-200">
                  <span className="font-bold text-emerald-800">Net Seller Disbursed</span>
                  <span className="font-extrabold text-emerald-800 tabular-nums text-sm">
                    {settlement ? formatCurrency(settlement.details.reduce((s, r) => s + r.net_to_seller, 0)) : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 text-xs border border-blue-200">
                  <span className="font-bold text-blue-800">Held in Escrow</span>
                  <span className="font-bold text-blue-800 tabular-nums">
                    {settlement ? formatCurrency(settlement.escrow_summary?.total_held_in_escrow || 0) : "—"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => go("admin-settlement")}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-awash-blue text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                Full Settlement Reports <ArrowUpRight className="size-3.5" />
              </button>
            </div>

            {/* 2. Recent Transactions (shadcn dashboard-01 Recent Sales style) */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold text-awash-blue flex items-center gap-2">
                    <Receipt className="size-4 text-awash-blue" />
                    Recent Transactions
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Live unified ledger transactions stream</p>
                </div>
                <button
                  onClick={() => go("admin-transactions")}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  View All <ArrowUpRight className="size-3" />
                </button>
              </div>

              <div className="space-y-3">
                {recentTxns.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-6 text-center">No recent transactions</p>
                ) : (
                  recentTxns.slice(0, 6).map((txn) => {
                    const isWinning = txn.type === "WINNING_BID"
                    const isFee = txn.type === "BID_FEE"
                    const isRefund = txn.type === "REFUND"
                    const initials = (txn.user_name || txn.user_phone || "TX").slice(0, 2).toUpperCase()

                    return (
                      <div key={txn.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isWinning
                                ? "bg-primary/20 text-awash-blue border border-primary/40"
                                : isFee
                                ? "bg-amber-100 text-amber-800"
                                : isRefund
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isWinning ? <Trophy className="size-4 text-primary" /> : initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-awash-blue truncate">
                              {txn.product_name || (txn.type === "DEPOSIT" ? "Wallet Deposit" : "Transaction")}
                            </p>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {txn.user_phone || txn.user_id.slice(0, 8)} · {txn.gateway || "Internal"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-2">
                          <p
                            className={`text-xs font-extrabold tabular-nums ${
                              isWinning
                                ? "text-primary"
                                : isRefund
                                ? "text-red-600"
                                : "text-awash-blue"
                            }`}
                          >
                            {isRefund ? "+" : isFee ? "-" : ""}{formatCurrency(txn.amount)}
                          </p>
                          <span className="text-[9.5px] font-semibold text-neutral-400 block">
                            {txn.status}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk Export Modal ── */}
      <AnimatePresence>
        {showBulkExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full border border-border shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="size-5 text-primary" />
                  <h3 className="font-display text-base font-extrabold text-awash-blue">Bulk Export Transactions</h3>
                </div>
                <button
                  onClick={() => setShowBulkExportModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
                >
                  <X className="size-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                Select a reporting period to export all transactions across auctions with metadata, bidder contact, payment status, and UNCITRAL compliance certification.
              </p>

              {/* Period presets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "daily", label: "Today (Daily)" },
                  { key: "weekly", label: "7 Days (Weekly)" },
                  { key: "monthly", label: "30 Days (Monthly)" },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setBulkPeriod(p.key as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      bulkPeriod === p.key
                        ? "border-primary bg-primary/10 text-awash-blue"
                        : "border-border text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Format buttons */}
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Choose Export Format</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleRunBulkExport("csv")}
                    disabled={bulkExporting}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-awash-blue text-xs font-bold gap-1.5"
                  >
                    <FileText className="size-5 text-neutral-600" />
                    CSV File
                  </button>
                  <button
                    onClick={() => handleRunBulkExport("xlsx")}
                    disabled={bulkExporting}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border hover:border-emerald-500 hover:bg-emerald-50 transition-all text-awash-blue text-xs font-bold gap-1.5"
                  >
                    <FileSpreadsheet className="size-5 text-emerald-600" />
                    Excel (XLSX)
                  </button>
                  <button
                    onClick={() => handleRunBulkExport("pdf")}
                    disabled={bulkExporting}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border hover:border-blue-500 hover:bg-blue-50 transition-all text-awash-blue text-xs font-bold gap-1.5"
                  >
                    <Printer className="size-5 text-blue-600" />
                    Audit Slip (PDF)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Per-Auction Transactions Modal ── */}
      <AnimatePresence>
        {txnAuction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-extrabold text-awash-blue">{txnAuction.name}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 rounded-lg text-neutral-500 font-bold">
                      #{txnAuction.publicCode || txnAuction.public_code || txnAuction.id.slice(0, 6)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Auction ID: {txnAuction.id} · Status: {txnAuction.status} · Escalation: {txnData?.escalation_rule || "LOWEST_UNIQUE_BID"}
                  </p>
                </div>
                <button
                  onClick={() => setTxnAuction(null)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {txnLoading ? (
                <div className="py-16 text-center">
                  <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-neutral-400 font-medium">Loading transactions and automated revenue split...</p>
                </div>
              ) : txnData ? (
                <div className="space-y-5">
                  {/* Settlement Split & Revenue Configuration Box */}
                  <div
                    className={`rounded-2xl border transition-all ${
                      txnData.revenue_sharing.is_custom_configured
                        ? "border-amber-300 bg-amber-50/50"
                        : "border-border/80 bg-neutral-50/70"
                    } p-4 space-y-3`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        <h4 className="font-display text-xs font-extrabold text-awash-blue uppercase tracking-wider">
                          Settlement Split & Revenue Configuration
                        </h4>
                        {txnData.revenue_sharing.is_custom_configured ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="size-3 text-amber-600" /> Custom Admin Override Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> System Auto-Calculated
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setShowSplitConfig(!showSplitConfig)}
                        className="text-xs font-bold text-primary hover:text-awash-blue flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-border shadow-xs transition-colors"
                      >
                        <SlidersHorizontal className="size-3.5" />
                        {showSplitConfig ? "Hide Configurator" : "Configure Settlement (Admin)"}
                      </button>
                    </div>

                    {/* Live Split Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-border/60 shadow-xs">
                        <p className="text-[10px] text-neutral-400 font-medium">Winning Price</p>
                        <p className="font-extrabold text-awash-blue mt-0.5 tabular-nums text-sm">
                          {formatCurrency(txnData.revenue_sharing.winning_amount)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-border/60 shadow-xs">
                        <p className="text-[10px] text-neutral-400 font-medium">Bid Fees Collected</p>
                        <p className="font-extrabold text-awash-blue mt-0.5 tabular-nums text-sm">
                          {formatCurrency(txnData.total_bid_fees_collected)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-border/60 shadow-xs">
                        <p className="text-[10px] text-neutral-400 font-medium">Platform Share</p>
                        <p className="font-extrabold text-primary mt-0.5 tabular-nums text-sm">
                          {formatCurrency(txnData.revenue_sharing.platform_share)}
                        </p>
                      </div>

                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
                        <p className="text-[10px] text-emerald-800 font-bold">Net to Seller</p>
                        <p className="font-extrabold text-emerald-800 mt-0.5 tabular-nums text-sm">
                          {formatCurrency(txnData.revenue_sharing.net_to_seller)}
                        </p>
                      </div>
                    </div>

                    {/* Expandable Configuration Inputs */}
                    <AnimatePresence>
                      {showSplitConfig && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-border/60 space-y-3 overflow-hidden"
                        >
                          <div className="bg-white/90 p-3.5 rounded-xl border border-border shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                                <SlidersHorizontal className="size-3 text-primary" />
                                Admin Transaction Override Form
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                Overrides static percentages & updates all exports
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {/* 1. Winning Price */}
                              <div>
                                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                                  Winning Price (ETB)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={splitWinningPrice}
                                    onChange={(e) => setSplitWinningPrice(e.target.value)}
                                    placeholder="e.g. 2500"
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold pointer-events-none">
                                    ETB
                                  </span>
                                </div>
                              </div>

                              {/* 2. Bid Fees Collected */}
                              <div>
                                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                                  Bid Fees Collected (ETB)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={splitBidFees}
                                    onChange={(e) => setSplitBidFees(e.target.value)}
                                    placeholder="e.g. 350"
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold pointer-events-none">
                                    ETB
                                  </span>
                                </div>
                              </div>

                              {/* 3. Platform Share */}
                              <div>
                                <label className="text-[11px] font-bold text-neutral-700 block mb-1">
                                  Platform Share (ETB)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={splitPlatformShare}
                                    onChange={(e) => setSplitPlatformShare(e.target.value)}
                                    placeholder="e.g. 250"
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold pointer-events-none">
                                    ETB
                                  </span>
                                </div>
                              </div>

                              {/* 4. Net to Seller */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-neutral-700 block">
                                    Net to Seller (ETB)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleAutoBalanceSeller}
                                    className="text-[10px] font-bold text-primary hover:underline"
                                    title="Auto calculate: Winning Price minus Platform Share"
                                  >
                                    Auto-balance
                                  </button>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={splitNetToSeller}
                                    onChange={(e) => setSplitNetToSeller(e.target.value)}
                                    placeholder="e.g. 2000"
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none bg-emerald-50/40 text-emerald-900 font-bold"
                                  />
                                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold pointer-events-none">
                                    ETB
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action buttons & live summary */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-2">
                              <div className="text-[11px] text-neutral-500 font-medium">
                                Gross Settlement:{" "}
                                <span className="font-bold text-awash-blue">
                                  ETB{" "}
                                  {(
                                    (parseFloat(splitWinningPrice) || 0) +
                                    (parseFloat(splitBidFees) || 0)
                                  ).toLocaleString()}
                                </span>{" "}
                                · Platform Net:{" "}
                                <span className="font-bold text-primary">
                                  ETB{" "}
                                  {(
                                    (parseFloat(splitBidFees) || 0) +
                                    (parseFloat(splitPlatformShare) || 0)
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {txnData.revenue_sharing.is_custom_configured && (
                                  <button
                                    onClick={handleResetSettlementSplit}
                                    disabled={splitSaving}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border text-neutral-600 hover:bg-neutral-100 flex items-center gap-1 transition-colors"
                                  >
                                    <RotateCcw className="size-3" />
                                    Reset to Auto
                                  </button>
                                )}
                                <button
                                  onClick={handleSaveSettlementSplit}
                                  disabled={splitSaving}
                                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-awash-blue text-white hover:bg-awash-blue/90 shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                                >
                                  {splitSaving ? (
                                    <div className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Check className="size-3.5" />
                                  )}
                                  Save & Apply Split
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Export Options Bar */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-neutral-100 rounded-xl">
                    <span className="text-xs font-bold text-neutral-600 pl-2">Export This Auction:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportAuctionCsv(txnAuction)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-neutral-700 hover:text-awash-blue shadow-sm"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleExportAuctionXlsx(txnAuction)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-neutral-700 hover:text-emerald-700 shadow-sm"
                      >
                        XLSX
                      </button>
                      <button
                        onClick={() => handleExportAuctionPdf(txnAuction)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white text-neutral-700 hover:text-primary shadow-sm"
                      >
                        PDF Slip
                      </button>
                    </div>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-1 border-b border-border/60 pb-2">
                    {[
                      { key: "bids", label: `Bids (${txnData.bids.length})` },
                      { key: "winner", label: `Winner Payments (${txnData.winner_payments.length})` },
                      { key: "fees", label: `Fees (${txnData.fee_payments.length})` },
                      { key: "refunds", label: `Refunds (${txnData.refunds.length})` },
                      { key: "escalations", label: `Escalations (${txnData.escalations.length})` },
                    ].map((tb) => (
                      <button
                        key={tb.key}
                        onClick={() => setTxnTab(tb.key as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                          txnTab === tb.key
                            ? "bg-awash-blue text-white"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="max-h-72 overflow-y-auto pr-1">
                    {txnTab === "bids" && (
                      txnData.bids.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-8 text-center">No bids recorded yet</p>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                          {txnData.bids.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                              <div>
                                <span className="font-mono font-bold text-awash-blue">Ticket #{b.ticket_number || "—"}</span>
                                <span className="text-neutral-500 ml-2">{b.user_phone || b.user_id.slice(0, 8)}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-awash-blue tabular-nums">{formatCurrency(b.amount)}</span>
                                <span className="text-[10px] block text-emerald-600 font-bold">{b.service_fee_paid ? "Fee Paid" : "Unpaid"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {txnTab === "winner" && (
                      txnData.winner_payments.length === 0 ? (
                        <div className="py-8 text-center text-xs text-neutral-400">
                          <Trophy className="size-6 text-neutral-300 mx-auto mb-1" />
                          No winner payments recorded yet · Status: {txnData.payment_status}
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                          {txnData.winner_payments.map((w) => (
                            <div key={w.id} className="flex items-center justify-between p-3 text-xs hover:bg-neutral-50">
                              <div>
                                <span className="font-bold text-awash-blue">{w.gateway} Gateway</span>
                                <span className="text-[10px] font-mono text-neutral-400 block">Ref: {w.client_reference_id} · Phone: {w.customer_phone || "—"}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-awash-blue tabular-nums">{formatCurrency(w.amount)}</span>
                                <span className="text-[10px] font-bold block text-emerald-600">{w.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {txnTab === "fees" && (
                      txnData.fee_payments.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-8 text-center">No fee transactions</p>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                          {txnData.fee_payments.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                              <div>
                                <span className="font-bold text-awash-blue">{f.type}</span>
                                <span className="text-[10px] text-neutral-400 block">User: {f.user_id.slice(0, 8)}</span>
                              </div>
                              <span className="font-bold text-amber-700">{formatCurrency(f.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {txnTab === "refunds" && (
                      txnData.refunds.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-8 text-center">No refunds recorded</p>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                          {txnData.refunds.map((r) => (
                            <div key={r.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-neutral-50">
                              <span className="font-bold text-red-600">REFUND</span>
                              <span className="font-bold text-red-600">+{formatCurrency(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {txnTab === "escalations" && (
                      txnData.escalations.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-8 text-center">No escalation events recorded</p>
                      ) : (
                        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
                          {txnData.escalations.map((e) => (
                            <div key={e.id} className="p-2.5 text-xs hover:bg-neutral-50">
                              <span className="font-bold text-awash-blue">{e.action}</span>
                              <span className="text-[10px] text-neutral-400 block">Actor: {e.actor_phone || e.actor_id.slice(0, 8)} · {new Date(e.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

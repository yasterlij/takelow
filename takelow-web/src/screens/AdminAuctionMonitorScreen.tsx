import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Radio, Users, TrendingDown, Clock, Eye, Trophy, Gavel, X, Loader2,
  ArrowLeft, RefreshCw, Hash, AlertCircle, CheckCircle2, XCircle, Crown,
} from "lucide-react"
import { useApp } from "../AppContext"
import { AdminLayout } from "../components/AdminLayout"
import { Modal, ConfirmDialog } from "../components/Modal"
import { DataTable } from "../components/DataTable"
import { Countdown } from "../components/Countdown"
import { useAuctionSocket, applySocketUpdate, type SocketUpdatePayload } from "../hooks/useAuctionSocket"
import { api, type ApiWinnerResult } from "../api"
import { toast } from "../store/toast.store"
import { CURRENCY, formatETB } from "../mockDataV0"
import type { Auction } from "../mockDataV0"

type BidRow = { id: string; amount: number; user_id: string; user_name?: string | null; bid_time: string; ticket_number?: string; amount_encrypted?: boolean }

export function AdminAuctionMonitorScreen() {
  const { go, selectedId, getAuction, closeAuction, refreshAuctions, selectAuctionForMonitor } = useApp()
  const auction = getAuction(selectedId)

  const [liveAuction, setLiveAuction] = useState<Auction | undefined>(auction)
  const [bids, setBids] = useState<BidRow[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [showBids, setShowBids] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [closing, setClosing] = useState(false)
  const [winner, setWinner] = useState<ApiWinnerResult | null>(null)
  const [winnerLoading, setWinnerLoading] = useState(false)
  const [showWinner, setShowWinner] = useState(false)

  useEffect(() => {
    if (auction) setLiveAuction(auction)
  }, [auction])

  // Real-time socket updates
  const onSocketUpdate = useCallback((payload: SocketUpdatePayload) => {
    setLiveAuction((prev) =>
      prev ? applySocketUpdate([prev], payload)[0] : prev,
    )
  }, [])

  useAuctionSocket(selectedId, onSocketUpdate)

  // Periodic refresh to catch status changes
  useEffect(() => {
    if (!selectedId) return
    const interval = setInterval(() => {
      refreshAuctions()
    }, 15000)
    return () => clearInterval(interval)
  }, [selectedId, refreshAuctions])

  const fetchBids = useCallback(async () => {
    if (!selectedId) return
    setBidsLoading(true)
    try {
      const result = await api.getAuctionBids(selectedId)
      setBids(result as BidRow[])
    } catch {
      toast("Failed to load bids", "error")
    } finally {
      setBidsLoading(false)
    }
  }, [selectedId])

  const handleViewBids = () => {
    fetchBids()
    setShowBids(true)
  }

  const handleClose = async () => {
    if (!selectedId) return
    setClosing(true)
    try {
      await closeAuction(selectedId)
      await refreshAuctions()
      // After closing, try to draw winner
      const result = await api.drawWinner(selectedId)
      setWinner(result)
      setShowWinner(true)
    } catch (e: any) {
      toast(e?.message || "Failed to close auction", "error")
    } finally {
      setClosing(false)
      setShowCloseConfirm(false)
    }
  }

  const handleDrawWinner = async () => {
    if (!selectedId) return
    setWinnerLoading(true)
    try {
      const result = await api.drawWinner(selectedId)
      setWinner(result)
      setShowWinner(true)
    } catch (e: any) {
      toast(e?.message || "Failed to draw winner", "error")
    } finally {
      setWinnerLoading(false)
    }
  }

  if (!selectedId || !liveAuction) {
    return (
      <AdminLayout title="Monitor Auction">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Gavel className="size-10 text-neutral-300" />
          <p className="mt-4 text-sm font-bold text-neutral-500">No auction selected</p>
          <button
            onClick={() => go("admin-monitor")}
            className="mt-4 rounded-xl bg-awash-blue px-4 py-2 text-xs font-bold text-white"
          >
            Browse Active Auctions
          </button>
        </div>
      </AdminLayout>
    )
  }

  const isClosed = liveAuction.status === "closed" || (liveAuction.endTime && new Date(liveAuction.endTime).getTime() < Date.now())
  const seconds = liveAuction.timeLeft
  const endingSoon = seconds > 0 && seconds < 3600
  const bidCount = liveAuction.totalBids || liveAuction.bidders || 0
  const bidProgress = liveAuction.maxBid ? Math.min(bidCount / liveAuction.maxBid, 1) : 0
  const isUrgent = bidProgress > 0.8

  return (
    <AdminLayout
      title="Auction Monitor"
      subtitle={liveAuction.name}
      actions={
        <button
          onClick={() => go("admin-monitor")}
          className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-bold text-neutral-600 transition-all hover:bg-neutral-50"
        >
          <ArrowLeft className="size-3.5" /> All Auctions
        </button>
      }
    >
      <div className="space-y-4">
        {/* Live status banner */}
        <div className={`flex items-center justify-between rounded-2xl border p-4 ${
          isClosed
            ? "border-neutral-200 bg-neutral-50"
            : endingSoon
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-xl ${
              isClosed ? "bg-neutral-200 text-neutral-500" : endingSoon ? "bg-amber-200 text-amber-700" : "bg-emerald-200 text-emerald-700"
            }`}>
              {isClosed ? <CheckCircle2 className="size-5" /> : <Radio className="size-5 animate-pulse" />}
            </div>
            <div>
              <p className={`font-display text-sm font-bold ${isClosed ? "text-neutral-600" : endingSoon ? "text-amber-800" : "text-emerald-800"}`}>
                {isClosed ? "Auction Closed" : endingSoon ? "Ending Soon" : "Live"}
              </p>
              <p className="text-xs font-medium text-neutral-400">
                {isClosed ? "This auction has ended" : "Real-time monitoring active"}
              </p>
            </div>
          </div>
          {!isClosed && (
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 shadow-sm">
              <Clock className="size-4 text-awash-blue" />
              <Countdown seconds={seconds} size="md" />
            </div>
          )}
        </div>

        {/* Product + stats grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Product card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_4px_20px_rgba(0,43,92,0.04)] lg:col-span-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
              {liveAuction.images?.[0] ? (
                <img src={liveAuction.images[0]} alt={liveAuction.name} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-neutral-300">
                  <Gavel className="size-10" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-display text-sm font-bold text-awash-blue">{liveAuction.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-neutral-400">{liveAuction.category || "No category"}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Market Price</span>
                <span className="font-display text-sm font-extrabold text-primary">{CURRENCY} {formatETB(liveAuction.marketPrice)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <StatBox icon={<Gavel className="size-5" />} label="Total Bids" value={bidCount} accent="text-awash-blue" bg="bg-awash-blue/10" />
            <StatBox icon={<Users className="size-5" />} label="Unique Bidders" value={liveAuction.uniqueBidders ?? "—"} accent="text-primary" bg="bg-primary/10" />
            <StatBox icon={<TrendingDown className="size-5" />} label="Min Bids Required" value={liveAuction.minBid ?? "—"} accent="text-amber-600" bg="bg-amber-500/10" />
            <StatBox icon={<Hash className="size-5" />} label="Max Bid Capacity" value={liveAuction.maxBid ?? "—"} accent="text-emerald-600" bg="bg-emerald-500/10" />

            {/* Bid capacity progress */}
            {liveAuction.maxBid && (
              <div className="col-span-2 rounded-2xl border border-border/60 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-awash-blue">Bid Capacity</span>
                  <span className="text-xs font-medium text-neutral-400">{bidCount} / {liveAuction.maxBid}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bidProgress * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: isUrgent ? "#F97316" : "#10B981" }}
                  />
                </div>
                {isUrgent && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-orange-600">
                    <AlertCircle className="size-3" /> Almost at capacity
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Admin actions */}
        <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
          <h2 className="font-display text-sm font-bold text-awash-blue">Admin Actions</h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={handleViewBids}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-xs font-bold text-awash-blue transition-all hover:bg-awash-blue/5 hover:border-awash-blue/30"
            >
              <Eye className="size-3.5" /> View All Bids ({bidCount})
            </button>
            {!isClosed && (
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={closing}
                className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-destructive/20 transition-all hover:bg-destructive/90 disabled:opacity-50"
              >
                {closing ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                {closing ? "Closing…" : "Close Auction & Draw Winner"}
              </button>
            )}
            {isClosed && (
              <button
                onClick={handleDrawWinner}
                disabled={winnerLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2.5 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-50"
              >
                {winnerLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Crown className="size-3.5" />}
                {winnerLoading ? "Drawing…" : "Draw / View Winner"}
              </button>
            )}
            <button
              onClick={() => { refreshAuctions(); fetchBids() }}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-xs font-bold text-neutral-600 transition-all hover:bg-neutral-50"
            >
              <RefreshCw className="size-3.5" /> Refresh Data
            </button>
          </div>

          {/* Min-bid warning */}
          {liveAuction.minBid && bidCount < liveAuction.minBid && !isClosed && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertCircle className="size-4 shrink-0 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">
                Only {bidCount}/{liveAuction.minBid} bids — auction may auto-extend if under minimum.
              </p>
            </div>
          )}
        </div>

        {/* Recent bids preview */}
        <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-awash-blue">Recent Bids</h2>
            <button onClick={handleViewBids} className="text-[11px] font-bold text-primary hover:text-awash-gold-dark">View all</button>
          </div>
          <div className="mt-3 space-y-2">
            {bids.slice(0, 5).map((b, i) => {
            const coded = `User ${b.user_id?.slice(0, 8) || "—"}`
            const display = b.user_name ? `${b.user_name} (${coded})` : coded
            return (
              <div key={b.id || i} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                  <span className="flex size-5 items-center justify-center rounded-full bg-awash-blue/10 text-[9px] font-bold text-awash-blue/60">{i + 1}</span>
                  {display}
                </span>
                <span className="font-display text-sm font-bold text-awash-blue">{b.amount_encrypted ? `${CURRENCY} ••••` : `${CURRENCY} ${formatETB(b.amount)}`}</span>
              </div>
            )
          })}
            {bids.length === 0 && (
              <p className="py-4 text-center text-xs font-medium text-neutral-400">No bids yet. Click "View All Bids" to refresh.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bids Modal */}
      <Modal open={showBids} onClose={() => setShowBids(false)} title={`All Bids (${bids.length})`} size="lg">
        <button
          onClick={fetchBids}
          className="mb-3 flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
        <div className="rounded-xl border border-border/40">
          <DataTable
            columns={[
              {
                key: "user",
                header: "User",
                render: (b: BidRow) => {
                  const coded = `User ${b.user_id?.slice(0, 8) || "—"}`
                  const display = b.user_name ? `${b.user_name} (${coded})` : coded
                  return <span className="text-xs font-semibold text-neutral-600">{display}</span>
                },
              },
              {
                key: "amount",
                header: "Amount",
                align: "right" as const,
                render: (b: BidRow) => <span className="font-display text-sm font-bold text-awash-blue">{b.amount_encrypted ? `${CURRENCY} ••••` : `${CURRENCY} ${formatETB(b.amount)}`}</span>,
              },
              {
                key: "ticket",
                header: "Ticket",
                render: (b: BidRow) => b.ticket_number ? (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-500">{b.ticket_number}</span>
                ) : <span className="text-neutral-300">—</span>,
              },
              {
                key: "time",
                header: "Time",
                align: "right" as const,
                render: (b: BidRow) => (
                  <span className="text-[11px] font-medium text-neutral-400">
                    {b.bid_time ? new Date(b.bid_time).toLocaleString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                  </span>
                ),
              },
            ]}
            rows={bids}
            rowKey={(b) => b.id || b.ticket_number || b.bid_time}
            loading={bidsLoading}
            empty={{ icon: <Gavel className="size-6" />, title: "No bids placed yet", message: "Bids will appear here in real-time" }}
          />
        </div>
      </Modal>

      {/* Close confirmation */}
      <ConfirmDialog
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleClose}
        title="Close this auction?"
        message={`This will close "${liveAuction.name}" and immediately draw the winner. This action cannot be undone.`}
        confirmLabel="Close & Draw Winner"
        destructive
      />

      {/* Winner result modal */}
      <Modal open={showWinner} onClose={() => setShowWinner(false)} title="Winner Result" size="md">
        {winner ? (
          <div className="space-y-4">
            {winner.winning_bid_amount != null && winner.winner_user_id ? (
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-awash-gold-light shadow-gold-glow-lg"
                >
                  <Crown className="size-8 text-white" />
                </motion.div>
                <h3 className="mt-4 font-display text-lg font-extrabold text-awash-blue">Winner Found!</h3>
                <p className="mt-1 text-sm font-medium text-neutral-500">
                  {winner.winner_name ? `${winner.winner_name} (User ${winner.winner_user_id.slice(0, 8)})` : `User ${winner.winner_user_id.slice(0, 8)}`}
                  {winner.winner_phone && ` · ${winner.winner_phone}`}
                </p>
                <div className="mt-4 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">Winning Bid</p>
                    <p className="font-display text-xl font-extrabold text-primary">{CURRENCY} {formatETB(winner.winning_bid_amount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">Total Bids</p>
                    <p className="font-display text-xl font-extrabold text-awash-blue">{winner.total_bids ?? bidCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase text-neutral-400">Savings</p>
                    <p className="font-display text-xl font-extrabold text-emerald-600">
                      {liveAuction.marketPrice > 0 ? Math.round((1 - winner.winning_bid_amount / liveAuction.marketPrice) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <XCircle className="size-8" />
                </div>
                <h3 className="mt-4 font-display text-lg font-extrabold text-neutral-500">No Winner</h3>
                <p className="mt-1 text-sm font-medium text-neutral-400">
                  No unique bid was found. The auction has been marked as expired.
                </p>
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowWinner(false)}
                className="h-11 flex-1 rounded-xl border border-border/60 bg-white text-sm font-bold text-neutral-600 transition-all hover:bg-neutral-50"
              >
                Close
              </button>
              <button
                onClick={() => { setShowWinner(false); go("admin-monitor") }}
                className="h-11 flex-1 rounded-xl bg-awash-blue text-sm font-bold text-white transition-all hover:bg-awash-blue-light"
              >
                Back to List
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}

function StatBox({ icon, label, value, accent, bg }: { icon: React.ReactNode; label: string; value: string | number; accent: string; bg: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
      <div className={`flex size-9 items-center justify-center rounded-xl ${bg} ${accent}`}>{icon}</div>
      <p className="mt-2 font-display text-xl font-extrabold tabular-nums text-awash-blue">{value}</p>
      <p className="text-xs font-medium text-neutral-400">{label}</p>
    </div>
  )
}

import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  X,
  Pencil,
  XCircle,
  Trash2,
  Eye,
  ImageIcon,
  Filter,
  Search,
  Upload,
  BarChart3,
  TrendingDown,
  ArrowUpRight,
  Camera,
  Link,
  Trophy,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Check,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { AdminLayout } from "../components/AdminLayout"
import { CTAButton, Badge, Card } from "../components/AuctionUI"
import { usePagination, PaginationBar } from "../components/Pagination"
import { STANDARD_AUCTION_CATEGORIES } from "../lib/auctionCategories"
import { formatCurrency, formatMaskedCurrency } from "../mockDataV0"
import type { Auction, ProductSpecs } from "../mockDataV0"

const emptySpecs = { storage: "", ram: "", edition: "", battery: "", camera: "", osVersion: "", display: "", chipset: "" }

export function isNoWinnerAuction(a: Auction): boolean {
  if (a.status === "live" || a.status === "ending-soon" || a.raw_status === "ACTIVE") return false
  const hasWinner = Boolean(
    a.winner_user_id ||
    (a.winners && a.winners.length > 0) ||
    (a.winnersCount && a.winnersCount > 0)
  )
  return !hasWinner
}

export function isClosedWonAuction(a: Auction): boolean {
  if (a.status === "live" || a.status === "ending-soon" || a.raw_status === "ACTIVE") return false
  return !isNoWinnerAuction(a)
}

function AuctionThumb({ src, onClick }: { src?: string; onClick?: () => void }) {
  const [err, setErr] = useState(false)
  const hasSrc = src && (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/"))
  if (err || !hasSrc) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50">
        <ImageIcon className="size-5 text-neutral-300/30" />
      </div>
    )
  }
  return (
    <button onClick={onClick} className="size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" />
    </button>
  )
}

function StatusBadge({ status, isUnsold, isWon }: { status: string; isUnsold?: boolean; isWon?: boolean }) {
  if (isUnsold) {
    return <Badge tone="orange"><RotateCcw className="size-2.5 mr-1" /> Unsold</Badge>
  }
  if (isWon) {
    return <Badge tone="green"><Trophy className="size-2.5 mr-1 text-primary" /> Won</Badge>
  }
  const map: Record<string, { tone: "green" | "orange" | "muted"; label: string }> = {
    live: { tone: "green", label: "Live" },
    "ending-soon": { tone: "orange", label: "Ending Soon" },
    closed: { tone: "muted", label: "Closed" },
  }
  const s = map[status] || { tone: "muted" as const, label: status }
  return <Badge tone={s.tone}>{s.label}</Badge>
}

function BidChart({ amounts, total }: { amounts: number[]; total: number }) {
  const buckets = useMemo(() => {
    if (amounts.length === 0) return []
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)
    const range = max - min || 1
    const count = Math.min(8, amounts.length)
    const bucketSize = range / count
    const result = Array.from({ length: count }, (_, i) => {
      const start = min + i * bucketSize
      return { label: formatCurrency(Math.round(start)), count: 0 }
    })
    amounts.forEach((a) => {
      const idx = Math.min(Math.floor((a - min) / bucketSize), count - 1)
      result[idx].count++
    })
    return result
  }, [amounts])

  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <BarChart3 className="size-3" /> Bid Distribution
      </div>
      <div className="flex items-end gap-1" style={{ height: 48 }}>
        {buckets.map((b, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <div className="mb-0.5 text-[8px] font-bold text-awash-blue opacity-0 transition-opacity group-hover:opacity-100">{b.count}</div>
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-awash-gold/60 to-awash-gold-light/40 transition-all hover:from-awash-gold/80"
              style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[7px] text-neutral-400">
        <span>{buckets[0]?.label || ""}</span>
        <span>{buckets[buckets.length - 1]?.label || ""}</span>
      </div>
    </div>
  )
}

function ImageUploadBox({ src, onFile, onClear }: { src: string; onFile: (dataUrl: string) => void; onClear: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [err, setErr] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => onFile(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20 overflow-hidden rounded-xl border-2 border-dashed border-border bg-neutral-100 transition-colors hover:border-awash-gold/40">
        {src && !err ? (
          <img src={src} alt="Preview" loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Camera className="size-5 text-neutral-400/40" />
            <span className="text-[8px] font-medium text-neutral-400/40">Upload</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 cursor-pointer opacity-0" />
        {src && (
          <button onClick={(e) => { e.stopPropagation(); onClear(); setErr(false); if (fileRef.current) fileRef.current.value = "" }} className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-white shadow">
            <X className="size-3" />
          </button>
        )}
      </div>
      <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-neutral-100 px-3 py-1.5 text-[10px] font-semibold text-awash-blue transition-colors hover:border-awash-gold/40 hover:bg-awash-gold/5">
        <Upload className="size-3.5" /> Browse & Upload
      </button>
      <button onClick={() => setShowUrlInput(!showUrlInput)} className="flex items-center gap-1 text-[9px] font-semibold text-neutral-400 hover:text-awash-gold">
        <Link className="size-3" /> {showUrlInput ? "Hide URL" : "Paste URL"}
      </button>
      {showUrlInput && (
        <div className="flex w-full gap-1">
          <input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-border bg-neutral-100 px-2 py-1 text-[10px] outline-none focus:border-awash-gold" />
          <button onClick={() => { if (urlValue) { onFile(urlValue); setUrlValue("") } }} className="rounded-lg bg-awash-gold px-2 py-1 text-[9px] font-semibold text-awash-blue">Set</button>
        </div>
      )}
    </div>
  )
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><X className="size-6" /></button>
      <img src={src} alt="" loading="lazy" decoding="async" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyForm: {
  name: string
  category: string
  marketPrice: string
  bidFee: string
  description: string
  highlights: string
  specText: string
  imageUrl: string
  startTime: string
  endTime: string
  minBid: string
  maxBid: string
} = {
  name: "",
  category: STANDARD_AUCTION_CATEGORIES[0],
  marketPrice: "",
  bidFee: "10",
  description: "",
  highlights: "",
  specText: "",
  imageUrl: "",
  startTime: "",
  endTime: "",
  minBid: "",
  maxBid: "",
}

type TabType = "all" | "live" | "closed-won" | "unsold" | "no-winner"

export function AdminAuctionsScreen() {
  const { go, auctions, addAuction, updateAuction, deleteAuction, closeAuction, reopenAuction, bulkReopenAuctions, refreshAuctions } = useApp()
  const now = new Date()
  const defaultStart = toDatetimeLocal(now)
  const defaultEnd = toDatetimeLocal(new Date(now.getTime() + 7 * 86400000))
  const defaultStartISO = now.toISOString()
  const defaultEndISO = new Date(now.getTime() + 7 * 86400000).toISOString()

  const [selectedAuctionIds, setSelectedAuctionIds] = useState<string[]>([])
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkReopening, setBulkReopening] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    startTime: defaultStart,
    endTime: defaultEnd,
    durationDays: 7,
    customDates: false,
    overrideBidFee: false,
    bidFee: "10",
  })

  useEffect(() => {
    refreshAuctions()
  }, [refreshAuctions])

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewBidsId, setViewBidsId] = useState<string | null>(null)
  const [bidsByAuction, setBidsByAuction] = useState<Record<string, { amount: number; user_id?: string; user_name?: string | null; bid_time?: string; ticket_number?: string }[]>>({})
  const [bidsLoading, setBidsLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [form, setForm] = useState({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd })
  const [submitting, setSubmitting] = useState(false)
  const [imgPreviewErr, setImgPreviewErr] = useState(false)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [drawingWinner, setDrawingWinner] = useState<string | null>(null)
  const [winnerResult, setWinnerResult] = useState<{ auctionId: string; winnerName?: string; winnerUserId?: string | null; amount?: number | null } | null>(null)

  const [reopenModalAuction, setReopenModalAuction] = useState<Auction | null>(null)
  const [reopenForm, setReopenForm] = useState<{
    startTime: string
    endTime: string
    minBid: string
    maxBid: string
    bidFee: string
    name: string
    category: string
    marketPrice: string
    description: string
    imageUrl: string
  }>({
    startTime: defaultStart,
    endTime: defaultEnd,
    minBid: "",
    maxBid: "",
    bidFee: "10",
    name: "",
    category: STANDARD_AUCTION_CATEGORIES[0],
    marketPrice: "",
    description: "",
    imageUrl: "",
  })
  const [reopenConfirming, setReopenConfirming] = useState(false)
  const [reopening, setReopening] = useState(false)

  useEffect(() => {
    if (!viewBidsId) return
    setBidsLoading(true)
    api.getAuctionBids(viewBidsId)
      .then((bids) => setBidsByAuction((prev) => ({ ...prev, [viewBidsId]: bids })))
      .catch(() => setBidsByAuction((prev) => ({ ...prev, [viewBidsId]: [] })))
      .finally(() => setBidsLoading(false))
  }, [viewBidsId])

  const resetForm = () => {
    setForm({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd })
    setImgPreviewErr(false)
  }

  const openCreate = () => {
    setEditingId(null)
    resetForm()
    setShowForm(true)
  }

  const openEdit = (a: Auction) => {
    setEditingId(a.id)
    const startDate = a.endTime ? new Date(new Date(a.endTime).getTime() - 7 * 86400000) : now
    const endDate = a.endTime ? new Date(a.endTime) : new Date(now.getTime() + 7 * 86400000)
    setForm({
      name: a.name, category: a.category, marketPrice: String(a.marketPrice), bidFee: a.bidFee != null ? String(a.bidFee) : "10",
      description: a.description, highlights: a.highlights.join(", "),
      specText: Object.keys(emptySpecs).map((key) => (a.specs || {})[key as keyof ProductSpecs]).filter(Boolean).join(", "),
      imageUrl: a.images?.[0] || "", startTime: toDatetimeLocal(startDate), endTime: toDatetimeLocal(endDate),
      minBid: a.minBid != null ? String(a.minBid) : "",
      maxBid: a.maxBid != null ? String(a.maxBid) : "",
    })
    setImgPreviewErr(false)
    setShowForm(true)
  }

  const openReopen = (a: Auction) => {
    const currentNow = new Date()
    const newStart = toDatetimeLocal(currentNow)
    const newEnd = toDatetimeLocal(new Date(currentNow.getTime() + 7 * 86400000))
    setReopenForm({
      startTime: newStart,
      endTime: newEnd,
      minBid: a.minBid != null ? String(a.minBid) : "",
      maxBid: a.maxBid != null ? String(a.maxBid) : "",
      bidFee: a.bidFee != null ? String(a.bidFee) : "10",
      name: a.name,
      category: a.category || STANDARD_AUCTION_CATEGORIES[0],
      marketPrice: a.marketPrice ? String(a.marketPrice) : "",
      description: a.description || "",
      imageUrl: a.images?.[0] || "",
    })
    setReopenConfirming(false)
    setReopenModalAuction(a)
  }

  const handleReopenSubmit = async () => {
    if (!reopenModalAuction) return
    setReopening(true)
    try {
      await reopenAuction(reopenModalAuction.id, {
        start_time: new Date(reopenForm.startTime).toISOString(),
        end_time: new Date(reopenForm.endTime).toISOString(),
        min_bid: reopenForm.minBid ? Number(reopenForm.minBid) : undefined,
        max_bid: reopenForm.maxBid ? Number(reopenForm.maxBid) : undefined,
        bid_fee: reopenForm.bidFee ? Number(reopenForm.bidFee) : undefined,
        name: reopenForm.name || undefined,
        category: reopenForm.category || undefined,
        current_market_price: reopenForm.marketPrice ? Number(reopenForm.marketPrice) : undefined,
        description: reopenForm.description || undefined,
        image_urls: reopenForm.imageUrl ? [reopenForm.imageUrl] : undefined,
      })
      setReopenModalAuction(null)
      setActiveTab("live")
    } catch {
      // toast is already handled in AppContext
    } finally {
      setReopening(false)
    }
  }

  useEffect(() => {
    setSelectedAuctionIds([])
  }, [activeTab])

  const toggleSelectAuction = (id: string) => {
    setSelectedAuctionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectedAuctions = useMemo(() => {
    return auctions.filter((a) => selectedAuctionIds.includes(a.id))
  }, [auctions, selectedAuctionIds])


  const openBulkModal = () => {
    const currentNow = new Date()
    setBulkForm({
      startTime: toDatetimeLocal(currentNow),
      endTime: toDatetimeLocal(new Date(currentNow.getTime() + 7 * 86400000)),
      durationDays: 7,
      customDates: false,
      overrideBidFee: false,
      bidFee: "10",
    })
    setBulkConfirming(false)
    setBulkModalOpen(true)
  }

  const handleBulkReopenSubmit = async () => {
    if (selectedAuctionIds.length === 0) return
    setBulkReopening(true)
    try {
      const startTime = new Date(bulkForm.startTime).toISOString()
      const endTime = bulkForm.customDates
        ? new Date(bulkForm.endTime).toISOString()
        : new Date(new Date(bulkForm.startTime).getTime() + bulkForm.durationDays * 86400000).toISOString()

      await bulkReopenAuctions(selectedAuctionIds, {
        startTime,
        endTime,
        bidFee: bulkForm.overrideBidFee && bulkForm.bidFee ? Number(bulkForm.bidFee) : undefined,
        durationDays: bulkForm.durationDays,
      })

      setSelectedAuctionIds([])
      setBulkModalOpen(false)
      setActiveTab("live")
    } catch {
      // toast handled in AppContext
    } finally {
      setBulkReopening(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.name) return
    setSubmitting(true)
    const highlights = form.highlights ? form.highlights.split(",").map((h) => h.trim()).filter(Boolean) : []
    const specValues = form.specText ? form.specText.split(",").map((s) => s.trim()).filter(Boolean) : []
    const minBid = form.minBid ? Number(form.minBid) : undefined
    const maxBid = form.maxBid ? Number(form.maxBid) : undefined
    const base = {
      name: form.name, category: form.category, marketPrice: Number(form.marketPrice || 0),
      description: form.description, highlights,
      specs: Object.fromEntries(Object.keys(emptySpecs).map((key, i) => [key, specValues[i]]).filter(([, value]) => value)),
      ...(form.imageUrl ? { images: [form.imageUrl] } : {}),
      ...(form.startTime ? { startTime: new Date(form.startTime).toISOString() } : {}),
      ...(form.endTime ? { endTime: new Date(form.endTime).toISOString() } : {}),
      ...(minBid != null ? { minBid } : {}),
      ...(maxBid != null ? { maxBid } : {}),
      ...(form.bidFee ? { bidFee: Number(form.bidFee) } : {}),
    }
    if (editingId) {
      await updateAuction(editingId, base)
    } else {
      await addAuction({
        ...base,
        bidFee: Number(form.bidFee),
        startTime: base.startTime || defaultStartISO,
        endTime: base.endTime || defaultEndISO,
      })
    }
    setSubmitting(false)
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this auction permanently?")) await deleteAuction(id)
  }

  const handleClose = async (id: string) => {
    if (window.confirm("Close this auction early?")) await closeAuction(id)
  }

  const handleDrawWinner = async (id: string, name: string) => {
    setDrawingWinner(id)
    setWinnerResult(null)
    try {
      const result = await api.drawWinner(id)
      setWinnerResult({ auctionId: id, winnerName: result.winner_name, winnerUserId: result.winner_user_id, amount: result.winning_bid_amount })
    } catch {
      setWinnerResult({ auctionId: id, winnerName: undefined, winnerUserId: null, amount: undefined })
    }
    setDrawingWinner(null)
  }

  const activeCount = auctions.filter((a) => a.status === "live" || a.status === "ending-soon").length
  const wonCount = auctions.filter(isClosedWonAuction).length
  const unsoldCount = auctions.filter(isNoWinnerAuction).length

  const filtered = useMemo(() => {
    return auctions.filter((a) => {
      if (activeTab === "live") {
        if (a.status !== "live" && a.status !== "ending-soon") return false
      } else if (activeTab === "closed-won") {
        if (!isClosedWonAuction(a)) return false
      } else if (activeTab === "unsold" || activeTab === "no-winner") {
        if (!isNoWinnerAuction(a)) return false
      }
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [auctions, activeTab, search])

  const { page, setPage, perPage, setPerPage, totalPages, paginated, resetPage } = usePagination(filtered, 10)

  const unsoldInFiltered = useMemo(() => {
    return filtered.filter(isNoWinnerAuction)
  }, [filtered])

  const isAllUnsoldSelected =
    unsoldInFiltered.length > 0 &&
    unsoldInFiltered.every((a) => selectedAuctionIds.includes(a.id))

  const toggleSelectAllUnsold = () => {
    if (isAllUnsoldSelected) {
      setSelectedAuctionIds([])
    } else {
      setSelectedAuctionIds(unsoldInFiltered.map((a) => a.id))
    }
  }

  const selectCurrentPageUnsold = () => {
    const pageUnsoldIds = paginated.filter(isNoWinnerAuction).map((a) => a.id)
    setSelectedAuctionIds((prev) => Array.from(new Set([...prev, ...pageUnsoldIds])))
  }

  const TABS = [
    { id: "all" as const, label: "All Auctions", count: auctions.length },
    { id: "live" as const, label: "Active / Live", count: activeCount, tone: "green" as const },
    { id: "closed-won" as const, label: "Closed - Won", count: wonCount, tone: "muted" as const },
    { id: "unsold" as const, label: "Unsold", count: unsoldCount, tone: "orange" as const },
  ]

  return (
    <AdminLayout
      title="Auction Management"
      subtitle={`${auctions.length} total · ${activeCount} active · ${unsoldCount} unsold`}
      actions={
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-4 py-2 text-xs font-bold text-awash-blue shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]">
          <Plus className="size-3.5" /> Create Auction
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        className="space-y-4"
      >
        {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

        {/* ── Tabs & Search Bar ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Segmented Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-white/70 backdrop-blur-md p-1.5 shadow-sm">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); resetPage() }}
                    className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                      isActive ? "text-awash-blue shadow-sm" : "text-neutral-500 hover:text-foreground hover:bg-neutral-100/60"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="auction-tab-indicator"
                        className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-border/40"
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.id === "unsold" && (
                        <RotateCcw className={`size-3 ${isActive ? "text-amber-600" : "text-neutral-400"}`} />
                      )}
                      {tab.label}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        isActive
                          ? tab.id === "unsold"
                            ? "bg-amber-100 text-amber-800"
                            : tab.id === "live"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-awash-gold/20 text-awash-blue"
                          : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200/80"
                      }`}>
                        {tab.count}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage() }}
                placeholder="Search auctions by product name..."
                className="w-full rounded-2xl border border-border/70 bg-white/80 backdrop-blur-sm py-2 pl-9 pr-3 text-xs font-medium outline-none transition-all placeholder:text-neutral-400/60 focus:border-awash-gold focus:bg-white focus:shadow-md"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); resetPage() }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Create / Edit Auction Form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="auction-form"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="mb-4 space-y-3 border border-awash-gold/20 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-awash-blue">{editingId ? "Edit Auction" : "New Auction"}</h2>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 transition-colors hover:bg-neutral-100"><X className="size-4 text-neutral-400" /></button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-3">
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" className="input-full" />
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-full">
                      {STANDARD_AUCTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-shrink-0">
                    <ImageUploadBox
                      src={form.imageUrl}
                      onFile={(dataUrl) => { setForm((f) => ({ ...f, imageUrl: dataUrl })); setImgPreviewErr(false) }}
                      onClear={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    />
                  </div>
                </div>

                <input value={form.bidFee} onChange={(e) => setForm((f) => ({ ...f, bidFee: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="Bid Amount (ETB)" className="input-full" />
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">Min Bids (optional reserve)</span>
                    <input value={form.minBid} onChange={(e) => setForm((f) => ({ ...f, minBid: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="e.g. 5" className="input-full" />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">Max Bids (optional limit)</span>
                    <input value={form.maxBid} onChange={(e) => setForm((f) => ({ ...f, maxBid: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="e.g. 100" className="input-full" />
                  </label>
                </div>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="input-full" rows={2} />
                <input value={form.highlights} onChange={(e) => setForm((f) => ({ ...f, highlights: e.target.value }))} placeholder="Highlights (comma separated)" className="input-full" />
                <input value={form.specText} onChange={(e) => setForm((f) => ({ ...f, specText: e.target.value }))} placeholder="Product specs (comma separated)" className="input-full" />
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">Start Time</span>
                    <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="input-full" />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-neutral-400">End Time</span>
                    <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="input-full" />
                  </label>
                </div>
                <CTAButton onClick={handleSubmit} disabled={submitting || !form.name}>
                  {submitting ? "Saving..." : editingId ? "Update Auction" : "Create Auction"}
                </CTAButton>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reopen Auction Configuration Modal ── */}
        <AnimatePresence>
          {reopenModalAuction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { setReopenModalAuction(null); setReopenConfirming(false) }}
                  className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="size-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700">
                    <RotateCcw className="size-5.5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-awash-blue">Reopen / Relist Auction</h2>
                    <p className="text-xs font-medium text-neutral-500">
                      Re-list "{reopenModalAuction.name}" with updated dates and bidding parameters
                    </p>
                  </div>
                </div>

                {!reopenConfirming ? (
                  <div className="mt-5 space-y-4">
                    {/* Notice Banner */}
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 text-xs text-amber-900">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">Lifecycle State Reset Notice</p>
                        <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                          Reopening will transition this auction back to <strong>ACTIVE</strong>. Any previous bids below reserve will be archived, prior winner records will be purged, and Redis bidding frequency tallies will be wiped for a clean start.
                        </p>
                      </div>
                    </div>

                    {/* Dates Configuration */}
                    <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                        <Calendar className="size-3.5 text-primary" /> Schedule New Duration
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">New Start Time</label>
                          <input
                            type="datetime-local"
                            value={reopenForm.startTime}
                            onChange={(e) => setReopenForm({ ...reopenForm, startTime: e.target.value })}
                            className="input-full bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">New End Time</label>
                          <input
                            type="datetime-local"
                            value={reopenForm.endTime}
                            onChange={(e) => setReopenForm({ ...reopenForm, endTime: e.target.value })}
                            className="input-full bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Rules Adjustment */}
                    <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                        <Gavel className="size-3.5 text-primary" /> Pricing & Bid Rules (Optional)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 mb-1">Market Price</label>
                          <input
                            value={reopenForm.marketPrice}
                            onChange={(e) => setReopenForm({ ...reopenForm, marketPrice: e.target.value.replace(/[^\d.]/g, "") })}
                            placeholder="e.g. 50000"
                            className="input-full bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 mb-1">Bid Fee (ETB)</label>
                          <input
                            value={reopenForm.bidFee}
                            onChange={(e) => setReopenForm({ ...reopenForm, bidFee: e.target.value.replace(/[^\d.]/g, "") })}
                            placeholder="e.g. 10"
                            className="input-full bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 mb-1">Min Bids (Reserve)</label>
                          <input
                            value={reopenForm.minBid}
                            onChange={(e) => setReopenForm({ ...reopenForm, minBid: e.target.value.replace(/[^\d]/g, "") })}
                            placeholder="None"
                            className="input-full bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 mb-1">Max Bids (Cap)</label>
                          <input
                            value={reopenForm.maxBid}
                            onChange={(e) => setReopenForm({ ...reopenForm, maxBid: e.target.value.replace(/[^\d]/g, "") })}
                            placeholder="None"
                            className="input-full bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Adjustments */}
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Product Title</label>
                        <input
                          value={reopenForm.name}
                          onChange={(e) => setReopenForm({ ...reopenForm, name: e.target.value })}
                          className="input-full text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Description</label>
                        <textarea
                          value={reopenForm.description}
                          onChange={(e) => setReopenForm({ ...reopenForm, description: e.target.value })}
                          rows={2}
                          className="input-full text-xs"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setReopenModalAuction(null)}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setReopenConfirming(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-awash-gold to-awash-gold-light px-5 py-2.5 text-xs font-bold text-awash-blue shadow-md hover:shadow-lg active:scale-[0.98]"
                      >
                        Review & Reopen <Sparkles className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Confirmation Dialog Step */
                  <div className="mt-6 space-y-4 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                      <CheckCircle2 className="size-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-awash-blue">Confirm Auction Reopening</h3>
                      <p className="mt-1 text-xs text-neutral-600 max-w-md mx-auto">
                        Are you sure you want to reopen <strong>"{reopenModalAuction.name}"</strong> until{" "}
                        <span className="font-bold text-awash-blue">
                          {new Date(reopenForm.endTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </span>?
                      </p>
                    </div>

                    <div className="rounded-2xl bg-neutral-50 border border-border/70 p-3 text-left text-xs space-y-1 text-neutral-600 max-w-md mx-auto">
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Start Time:</span>
                        <span className="font-semibold">{new Date(reopenForm.startTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">End Time:</span>
                        <span className="font-semibold">{new Date(reopenForm.endTime).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Bid Fee:</span>
                        <span className="font-semibold">{reopenForm.bidFee} ETB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Target Tab:</span>
                        <span className="font-bold text-emerald-700">Active / Live</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setReopenConfirming(false)}
                        disabled={reopening}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                      >
                        Go Back & Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleReopenSubmit}
                        disabled={reopening}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50"
                      >
                        {reopening ? (
                          <>Reopening...</>
                        ) : (
                          <>
                            <RotateCcw className="size-3.5" /> Confirm & Reopen Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Bulk Reopen Modal ── */}
        <AnimatePresence>
          {bulkModalOpen && selectedAuctionIds.length > 0 && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
              onClick={() => { if (!bulkReopening) setBulkModalOpen(false) }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-awash-gold/30 bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  disabled={bulkReopening}
                  onClick={() => { setBulkModalOpen(false); setBulkConfirming(false) }}
                  className="absolute right-4 top-4 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
                >
                  <X className="size-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-700">
                    <RotateCcw className="size-5.5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-awash-blue">
                      Bulk Reopen Auctions
                    </h2>
                    <p className="text-xs font-medium text-neutral-500">
                      Re-list {selectedAuctionIds.length} unsold product{selectedAuctionIds.length > 1 ? "s" : ""} simultaneously
                    </p>
                  </div>
                </div>

                {!bulkConfirming ? (
                  <div className="mt-5 space-y-4">
                    {/* Selected Items Preview */}
                    <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-awash-blue">
                        <span className="flex items-center gap-1.5">
                          <Layers className="size-3.5 text-primary" /> Selected Auctions ({selectedAuctionIds.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedAuctionIds([])}
                          className="text-[10px] font-semibold text-neutral-400 hover:text-red-500"
                        >
                          Clear Selection
                        </button>
                      </div>
                      <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                        {selectedAuctions.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-2xs"
                          >
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            <span className="max-w-[180px] truncate">{a.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleSelectAuction(a.id)}
                              className="text-neutral-400 hover:text-red-500 ml-0.5"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Notice Banner */}
                    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 text-xs text-amber-900">
                      <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">Lifecycle State Reset Notice</p>
                        <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                          All {selectedAuctionIds.length} selected auctions will be reset and transitioned to <strong>ACTIVE</strong>. Prior failed bids and Redis frequency tallies will be cleared for each auction.
                        </p>
                      </div>
                    </div>

                    {/* Schedule Preset Duration */}
                    <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                        <Calendar className="size-3.5 text-primary" /> Relist Duration & Schedule
                      </div>

                      {/* Presets */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { days: 3, label: "3 Days" },
                          { days: 7, label: "7 Days (Std)" },
                          { days: 14, label: "14 Days" },
                          { days: 30, label: "30 Days" },
                        ].map((preset) => {
                          const isSelected = !bulkForm.customDates && bulkForm.durationDays === preset.days
                          return (
                            <button
                              key={preset.days}
                              type="button"
                              onClick={() => {
                                const start = new Date(bulkForm.startTime)
                                const newEnd = toDatetimeLocal(new Date(start.getTime() + preset.days * 86400000))
                                setBulkForm({
                                  ...bulkForm,
                                  durationDays: preset.days,
                                  endTime: newEnd,
                                  customDates: false,
                                })
                              }}
                              className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                                isSelected
                                  ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs"
                                  : "border-border/70 bg-white text-neutral-600 hover:bg-neutral-50"
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Custom Dates toggle */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setBulkForm({ ...bulkForm, customDates: !bulkForm.customDates })}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          {bulkForm.customDates ? "← Use duration presets" : "Set custom start & end date / time →"}
                        </button>
                      </div>

                      {bulkForm.customDates && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                              Start Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={bulkForm.startTime}
                              onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                              className="input-full bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                              End Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={bulkForm.endTime}
                              onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                              className="input-full bg-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pricing & Rules Adjustment */}
                    <div className="rounded-2xl border border-border/70 bg-neutral-50/70 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-awash-blue">
                          <Gavel className="size-3.5 text-primary" /> Bid Fee Policy
                        </div>
                        <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bulkForm.overrideBidFee}
                            onChange={(e) => setBulkForm({ ...bulkForm, overrideBidFee: e.target.checked })}
                            className="size-3.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500"
                          />
                          Override bid fee for all items
                        </label>
                      </div>

                      {bulkForm.overrideBidFee ? (
                        <div className="max-w-xs">
                          <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                            Uniform Bid Fee (ETB)
                          </label>
                          <input
                            value={bulkForm.bidFee}
                            onChange={(e) => setBulkForm({ ...bulkForm, bidFee: e.target.value.replace(/[^\d.]/g, "") })}
                            placeholder="e.g. 10"
                            className="input-full bg-white text-xs"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500">
                          Each item will retain its current configured bid fee.
                        </p>
                      )}
                    </div>

                    {/* Modal Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setBulkModalOpen(false)}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkConfirming(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-[0.98]"
                      >
                        Review & Reopen ({selectedAuctionIds.length}) <Sparkles className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Step 2 Confirmation */
                  <div className="mt-6 space-y-4 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                      <RotateCcw className="size-7" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-awash-blue">
                        Confirm Bulk Reopening
                      </h3>
                      <p className="mt-1 text-xs text-neutral-600 max-w-md mx-auto">
                        Are you sure you want to reopen all <strong>{selectedAuctionIds.length}</strong> selected auctions?
                        They will immediately appear in the <strong>Active / Live</strong> feed for user bidding.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-neutral-50 border border-border/70 p-3.5 text-left text-xs space-y-1.5 text-neutral-600 max-w-md mx-auto">
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Total Items:</span>
                        <span className="font-bold text-awash-blue">{selectedAuctionIds.length} items</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Duration:</span>
                        <span className="font-semibold">
                          {bulkForm.customDates
                            ? `${new Date(bulkForm.startTime).toLocaleDateString()} to ${new Date(bulkForm.endTime).toLocaleDateString()}`
                            : `${bulkForm.durationDays} Days`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Bid Fee Policy:</span>
                        <span className="font-semibold">
                          {bulkForm.overrideBidFee ? `${bulkForm.bidFee} ETB (Uniform)` : "Original Product Fees"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-neutral-400">Target Tab:</span>
                        <span className="font-bold text-emerald-700">Active / Live</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setBulkConfirming(false)}
                        disabled={bulkReopening}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Go Back & Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkReopenSubmit}
                        disabled={bulkReopening}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 disabled:opacity-50"
                      >
                        {bulkReopening ? (
                          <>Reopening {selectedAuctionIds.length} items...</>
                        ) : (
                          <>
                            <RotateCcw className="size-3.5" /> Confirm & Reopen All Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Summary Counts ── */}
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-400">
          <p>
            Showing {filtered.length} of {auctions.length} auctions
            {activeTab !== "all" && ` in "${TABS.find(t => t.id === activeTab)?.label}"`}
          </p>
          <div className="flex gap-1.5">
            <Badge tone="green">{activeCount} active</Badge>
            <Badge tone="orange">{unsoldCount} unsold</Badge>
            <Badge tone="muted">{wonCount} won</Badge>
          </div>
        </div>

        {/* ── Dedicated Unsold / Relist Informational Banner with Bulk Controls ── */}
        {(activeTab === "unsold" || activeTab === "no-winner") && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-white/95 p-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 border border-amber-300/60">
                  <RotateCcw className="size-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-900">
                    Unsold & No-Winner Auctions ({unsoldCount})
                  </h3>
                  <p className="mt-0.5 text-[11px] text-amber-800/80 leading-relaxed">
                    Select individual auctions using the checkboxes or click <strong>Select All</strong> to relist unsold items in bulk.
                  </p>
                </div>
              </div>

              {selectedAuctionIds.length > 0 && (
                <button
                  type="button"
                  onClick={openBulkModal}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] shrink-0"
                >
                  <RotateCcw className="size-3.5" /> Reopen Selected ({selectedAuctionIds.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-200/60 text-xs">
              <button
                type="button"
                onClick={toggleSelectAllUnsold}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100/60 transition-colors"
              >
                {isAllUnsoldSelected ? (
                  <CheckSquare className="size-3.5 text-amber-600" />
                ) : (
                  <Square className="size-3.5 text-neutral-400" />
                )}
                {isAllUnsoldSelected ? "Deselect All Unsold" : `Select All Unsold (${unsoldInFiltered.length})`}
              </button>

              <button
                type="button"
                onClick={selectCurrentPageUnsold}
                className="rounded-lg border border-border/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Select Current Page ({paginated.filter(isNoWinnerAuction).length})
              </button>

              {selectedAuctionIds.length > 0 && (
                <span className="text-[11px] font-bold text-amber-800 ml-auto">
                  {selectedAuctionIds.length} of {unsoldCount} selected
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Auctions List ── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400 rounded-3xl border border-dashed border-border/70 bg-white/40 backdrop-blur-sm"
          >
            <Filter className="size-8 opacity-30 text-awash-blue" />
            <p className="text-sm font-semibold text-foreground">
              {activeTab === "unsold" || activeTab === "no-winner"
                ? "No unsold auctions"
                : activeTab === "closed-won"
                  ? "No won auctions yet"
                  : activeTab === "live"
                    ? "No live auctions running"
                    : "No matching auctions found"}
            </p>
            <p className="text-xs text-neutral-400 max-w-sm text-center">
              {activeTab === "unsold" || activeTab === "no-winner"
                ? "Auctions that end with 0 bids or without meeting reserve will automatically appear here for convenient reopening."
                : search
                  ? `No results matching "${search}". Try clearing your search query.`
                  : "Create an auction to get started with the TakeLow unique bidding lifecycle."}
            </p>
            {search && (
              <button
                onClick={() => { setSearch(""); resetPage() }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Clear search filter
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="flex flex-col gap-2.5"
          >
            {paginated.map((a: Auction) => {
              const bids = viewBidsId === a.id ? (bidsByAuction[a.id] ?? []) : []
              const isEncrypted = bids.some((b: any) => b.amount_encrypted)
              const bidAmounts = isEncrypted ? [] : bids.map((b) => b.amount)
              const avgBid = bidAmounts.length > 0 ? Math.round(bidAmounts.reduce((s, v) => s + v, 0) / bidAmounts.length) : 0
              const isClosed = a.status === "closed"
              const isUnsold = isNoWinnerAuction(a)
              const isWon = isClosedWonAuction(a)
              const isSelected = selectedAuctionIds.includes(a.id)

              return (
                <motion.div
                  key={a.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div className={`flex items-center gap-3 rounded-2xl border bg-white/80 backdrop-blur-sm p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-400/40 shadow-sm"
                      : isUnsold
                        ? "border-amber-200/80 hover:border-amber-300"
                        : isWon
                          ? "border-emerald-200/60 hover:border-emerald-300"
                          : "border-border/60 hover:border-awash-gold/20"
                  }`}>
                    {isUnsold && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelectAuction(a.id)
                        }}
                        aria-label={isSelected ? "Deselect auction" : "Select auction for bulk reopen"}
                        className={`flex size-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
                          isSelected
                            ? "border-amber-500 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xs"
                            : "border-neutral-300 bg-white hover:border-amber-400"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="size-3.5 stroke-[3]" />
                        ) : (
                          <span className="size-1 rounded-full bg-neutral-300" />
                        )}
                      </button>
                    )}
                    <AuctionThumb src={a.images?.[0]} onClick={() => a.images?.[0] && setLightboxImg(a.images[0])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-awash-blue">{a.name}</p>
                        {a.publicCode && <Badge tone="green">Code {a.publicCode}</Badge>}
                        <StatusBadge status={a.status} isUnsold={isUnsold} isWon={isWon} />
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-neutral-400">
                        {a.bidders} bidders · {formatCurrency(a.marketPrice)}
                        {bidAmounts.length > 0 && (
                          <span className="ml-2">· Avg bid {formatCurrency(avgBid)}</span>
                        )}
                        {a.specSummary && <span className="ml-2">· {a.specSummary}</span>}
                        {a.minBid && <span className="ml-2">· Reserve {a.minBid}</span>}
                        {a.maxBid && <span className="ml-2">· Max {a.maxBid}</span>}
                        {a.bidFee != null && <span className="ml-2">· Fee {a.bidFee} ETB</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Reopen Action for Unsold / No Winner Auctions */}
                      {isUnsold && (
                        <button
                          onClick={() => openReopen(a)}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
                          title="Reopen / Relist this unsold auction"
                        >
                          <RotateCcw className="size-3" /> Reopen
                        </button>
                      )}

                      {/* Draw Winner for Closed - Won */}
                      {isWon && (
                        <button
                          onClick={() => handleDrawWinner(a.id, a.name)}
                          disabled={drawingWinner === a.id}
                          className="flex items-center gap-1 rounded-xl bg-awash-gold/15 border border-awash-gold/40 px-2.5 py-1.5 text-[10px] font-bold text-awash-blue hover:bg-awash-gold/25 transition-colors disabled:opacity-50"
                          title="View Winner Details"
                        >
                          {drawingWinner === a.id ? "..." : <><Trophy className="size-3 text-primary" /> Winner</>}
                        </button>
                      )}

                      {/* Active Auction Edit */}
                      {!isClosed && (
                        <button
                          onClick={() => openEdit(a)}
                          className="flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1.5 text-[10px] font-semibold text-awash-blue hover:bg-neutral-50 transition-colors"
                          title="Edit auction"
                        >
                          <Pencil className="size-3" />
                        </button>
                      )}

                      {/* View Bids Button */}
                      <button
                        onClick={() => setViewBidsId(viewBidsId === a.id ? null : a.id)}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                          viewBidsId === a.id
                            ? "bg-awash-blue text-white border-awash-blue"
                            : "border-border/60 text-awash-blue hover:bg-neutral-50"
                        }`}
                        title="View bids"
                      >
                        <Eye className="size-3" />
                      </button>

                      {/* Close Early for Active */}
                      {!isClosed && (
                        <button
                          onClick={() => handleClose(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                          title="Close early"
                        >
                          <XCircle className="size-3" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete auction"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Winner Result banner */}
                  {winnerResult && winnerResult.auctionId === a.id && (
                    <div className="mx-2 mb-2 -mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-inner animate-scale-in">
                      <div className="flex items-center gap-2">
                        <PartyPopper className="size-4 text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-800">Winner Result</p>
                      </div>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {winnerResult.winnerName
                          ? `Winner: ${winnerResult.winnerName}${winnerResult.winnerUserId ? ` (User ${winnerResult.winnerUserId.slice(0, 8)})` : ""}${winnerResult.amount ? ` — ${formatCurrency(winnerResult.amount)}` : ""}`
                          : "No unique winner found for this auction."}
                      </p>
                    </div>
                  )}

                  {/* Bids Breakdown */}
                  {viewBidsId === a.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="-mt-2 mb-2 mx-2 rounded-2xl border border-border/60 bg-gradient-to-br from-neutral-50 to-white p-3 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-[11px] font-bold text-awash-blue">
                          <Eye className="size-3.5" /> Bids ({bids.length})
                        </p>
                        {bidAmounts.length > 1 && (
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <span className="flex items-center gap-1">
                              <TrendingDown className="size-3" /> Min: {formatCurrency(Math.min(...bidAmounts))}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="size-3" /> Max: {formatCurrency(Math.max(...bidAmounts))}
                            </span>
                          </div>
                        )}
                      </div>

                      {bids.length > 1 && <BidChart amounts={bidAmounts} total={bids.length} />}

                      {bidsLoading && bids.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-neutral-400">Loading bids…</p>
                      ) : bids.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-neutral-400">No bids placed yet</p>
                      ) : (
                        <div className="mt-2 flex flex-col gap-1">
                          {bids.map((b, i) => {
                            const coded = b.user_id ? `User ${b.user_id.slice(0, 8)}` : "Anonymous"
                            const display = b.user_name ? `${b.user_name} (${coded})` : coded
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1.5">
                                <span className="flex items-center gap-2 text-[10px] font-medium text-neutral-400">
                                  <span className="flex size-4 items-center justify-center rounded-full bg-awash-blue/10 text-[8px] font-bold text-awash-blue/60">{i + 1}</span>
                                  {display}
                                </span>
                                <span className="text-[11px] font-bold text-awash-blue">{(b as any).amount_encrypted ? formatMaskedCurrency() : formatCurrency(b.amount)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />

        <AnimatePresence>
          {selectedAuctionIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed bottom-6 inset-x-0 z-40 mx-auto flex w-[92%] max-w-xl items-center justify-between gap-3 rounded-2xl border border-amber-300/80 bg-white/95 p-3.5 shadow-2xl shadow-amber-900/10 backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500 font-display text-xs font-bold text-white shadow-sm">
                  {selectedAuctionIds.length}
                </span>
                <span className="text-xs font-bold text-awash-blue">
                  {selectedAuctionIds.length} unsold product{selectedAuctionIds.length > 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAuctionIds([])}
                  className="rounded-xl border border-border/80 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Deselect
                </button>
                <button
                  type="button"
                  onClick={openBulkModal}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
                >
                  <RotateCcw className="size-3.5" /> Reopen All ({selectedAuctionIds.length})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AdminLayout>
  )
}

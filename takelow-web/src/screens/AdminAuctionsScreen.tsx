import { useState, useMemo, useRef } from "react"
import { Plus, X, Pencil, XCircle, Trash2, Eye, ImageIcon, Filter, Search, Upload, BarChart3, TrendingDown, ArrowUpRight, Camera, Link } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Badge, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"
import type { Auction } from "../mockDataV0"

function AuctionThumb({ src }: { src?: string }) {
  const [err, setErr] = useState(false)
  const hasSrc = src && (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/"))
  if (err || !hasSrc) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-muted">
        <ImageIcon className="size-5 text-muted-foreground/30" />
      </div>
    )
  }
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
      <img src={src} alt="" onError={() => setErr(true)} className="h-full w-full object-cover" />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
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
      const end = start + bucketSize
      return { label: `${CURRENCY} ${formatETB(Math.round(start))}`, count: 0 }
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
            <div className="mb-0.5 text-[8px] font-bold text-navy opacity-0 transition-opacity group-hover:opacity-100">{b.count}</div>
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-primary/60 to-primary/40 transition-all hover:from-primary/80"
              style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[7px] text-muted-foreground">
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
      <div className="relative size-20 overflow-hidden rounded-xl border-2 border-dashed border-border bg-secondary transition-colors hover:border-primary/40">
        {src && !err ? (
          <img src={src} alt="Preview" onError={() => setErr(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <Camera className="size-5 text-muted-foreground/40" />
            <span className="text-[8px] font-medium text-muted-foreground/40">Upload</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="absolute inset-0 cursor-pointer opacity-0" />
        {src && (
          <button onClick={(e) => { e.stopPropagation(); onClear(); setErr(false); if (fileRef.current) fileRef.current.value = "" }} className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-white shadow">
            <X className="size-3" />
          </button>
        )}
      </div>
      <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-[10px] font-semibold text-navy transition-colors hover:border-primary/40 hover:bg-primary/5">
        <Upload className="size-3.5" /> Browse & Upload
      </button>
      <button onClick={() => setShowUrlInput(!showUrlInput)} className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground hover:text-primary">
        <Link className="size-3" /> {showUrlInput ? "Hide URL" : "Paste URL"}
      </button>
      {showUrlInput && (
        <div className="flex w-full gap-1">
          <input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-border bg-secondary px-2 py-1 text-[10px] outline-none focus:border-primary" />
          <button onClick={() => { if (urlValue) { onFile(urlValue); setUrlValue("") } }} className="rounded-lg bg-primary px-2 py-1 text-[9px] font-semibold text-primary-foreground">Set</button>
        </div>
      )}
    </div>
  )
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyForm = { name: "", category: "Electronics", marketPrice: "", bidFee: "10", description: "", highlights: "", imageUrl: "", startTime: "", endTime: "", minBid: "", maxBid: "", numWinners: "1" }

export function AdminAuctionsScreen() {
  const { go, auctions, addAuction, updateAuction, deleteAuction, closeAuction, allBids } = useApp()
  const now = new Date()
  const defaultStart = toDatetimeLocal(now)
  const defaultEnd = toDatetimeLocal(new Date(now.getTime() + 7 * 86400000))
  const defaultStartISO = now.toISOString()
  const defaultEndISO = new Date(now.getTime() + 7 * 86400000).toISOString()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewBidsId, setViewBidsId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [form, setForm] = useState({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd })
  const [submitting, setSubmitting] = useState(false)
  const [imgPreviewErr, setImgPreviewErr] = useState(false)

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
    setForm({
      name: a.name, category: a.category, marketPrice: String(a.marketPrice), bidFee: "10",
      description: a.description, highlights: a.highlights.join(", "),
      imageUrl: a.images?.[0] || "", startTime: defaultStart, endTime: defaultEnd,
      minBid: a.minBid != null ? String(a.minBid) : "",
      maxBid: a.maxBid != null ? String(a.maxBid) : "",
      numWinners: a.numWinners != null ? String(a.numWinners) : "1",
    })
    setImgPreviewErr(false)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.marketPrice) return
    setSubmitting(true)
    const highlights = form.highlights ? form.highlights.split(",").map((h) => h.trim()).filter(Boolean) : []
    const minBid = form.minBid ? Number(form.minBid) : undefined
    const maxBid = form.maxBid ? Number(form.maxBid) : undefined
    const numWinners = form.numWinners ? Number(form.numWinners) : undefined
    const base = {
      name: form.name, category: form.category, marketPrice: Number(form.marketPrice),
      description: form.description, highlights,
      ...(form.imageUrl ? { images: [form.imageUrl] } : {}),
      ...(form.startTime ? { startTime: new Date(form.startTime).toISOString() } : {}),
      ...(form.endTime ? { endTime: new Date(form.endTime).toISOString() } : {}),
      ...(minBid != null ? { minBid } : {}),
      ...(maxBid != null ? { maxBid } : {}),
      ...(numWinners != null ? { numWinners } : {}),
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

  const filtered = auctions.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-white px-5 pb-3 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => go("admin-dashboard")} className="mb-2 text-xs font-semibold text-primary">&larr; Back</button>
            <h1 className="font-display text-xl font-extrabold text-navy">Auction Management</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90">
            <Plus className="size-3.5" /> Create Auction
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search auctions..."
              className="w-full rounded-xl border border-border bg-secondary py-2 pl-8 pr-3 text-xs font-medium outline-none placeholder:text-muted-foreground/50 focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-navy outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="live">Live</option>
            <option value="ending-soon">Ending Soon</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 pt-4">
        {showForm && (
          <Card className="mb-4 space-y-3 border border-primary/20 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-navy">{editingId ? "Edit Auction" : "New Auction"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="rounded-lg p-1 hover:bg-muted"><X className="size-4 text-muted-foreground" /></button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-3">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary">
                  {["Electronics", "Smartphones", "Computers", "Audio", "Gaming"].map((c) => <option key={c}>{c}</option>)}
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

            <div className="flex gap-3">
              <input value={form.marketPrice} onChange={(e) => setForm((f) => ({ ...f, marketPrice: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="Market price" className="w-1/2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              <input value={form.bidFee} onChange={(e) => setForm((f) => ({ ...f, bidFee: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="Bid fee" className="w-1/2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
            </div>
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">Min Bids (optional)</span>
                <input value={form.minBid} onChange={(e) => setForm((f) => ({ ...f, minBid: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="e.g. 5" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">Max Bids (optional)</span>
                <input value={form.maxBid} onChange={(e) => setForm((f) => ({ ...f, maxBid: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} placeholder="e.g. 100" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">Winners</span>
                <input value={form.numWinners} onChange={(e) => setForm((f) => ({ ...f, numWinners: e.target.value.replace(/\D/g, "") }))} placeholder="1" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              </label>
            </div>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" rows={2} />
            <input value={form.highlights} onChange={(e) => setForm((f) => ({ ...f, highlights: e.target.value }))} placeholder="Highlights (comma separated)" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">Start</span>
                <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-semibold text-muted-foreground">End</span>
                <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              </label>
            </div>
            <CTAButton onClick={handleSubmit} disabled={submitting || !form.name || !form.marketPrice}>
              {submitting ? "Saving..." : editingId ? "Update Auction" : "Create Auction"}
            </CTAButton>
          </Card>
        )}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {filtered.length} of {auctions.length} auctions
          </p>
          <div className="flex gap-1.5">
            <Badge tone="green">{auctions.filter((a) => a.status === "live" || a.status === "ending-soon").length} active</Badge>
            <Badge tone="muted">{auctions.filter((a) => a.status === "closed").length} closed</Badge>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Filter className="size-8 opacity-30" />
            <p className="text-sm font-medium">No matching auctions</p>
            {search || statusFilter !== "all" ? (
              <button onClick={() => { setSearch(""); setStatusFilter("all") }} className="text-xs font-semibold text-primary">
                Clear filters
              </button>
            ) : (
              <p className="text-xs">Click "Create Auction" to get started</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((a: Auction) => {
              const bids = allBids.filter((b) => b.auctionId === a.id)
              const bidAmounts = bids.map((b) => b.amount)
              const avgBid = bidAmounts.length > 0 ? Math.round(bidAmounts.reduce((s, v) => s + v, 0) / bidAmounts.length) : 0
              return (
                <div key={a.id}>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
                    <AuctionThumb src={a.images?.[0]} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-navy">{a.name}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                        {a.bidders} bidders · {CURRENCY} {formatETB(a.marketPrice)}
                        {bidAmounts.length > 0 && (
                          <span className="ml-2">· Avg bid {CURRENCY} {formatETB(avgBid)}</span>
                        )}
                        {a.minBid && <span className="ml-2">· Min {a.minBid}</span>}
                        {a.maxBid && <span className="ml-2">· Max {a.maxBid}</span>}
                        {a.numWinners && a.numWinners > 1 && <span className="ml-2">· {a.numWinners} winners</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(a)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-navy hover:bg-muted" title="Edit">
                        <Pencil className="size-3" />
                      </button>
                      <button onClick={() => setViewBidsId(viewBidsId === a.id ? null : a.id)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-navy hover:bg-muted" title="View bids">
                        <Eye className="size-3" />
                      </button>
                      {a.status !== "closed" && (
                        <button onClick={() => handleClose(a.id)} className="flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-50" title="Close early">
                          <XCircle className="size-3" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)} className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  {viewBidsId === a.id && (
                    <div className="-mt-2 mb-2 mx-2 rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-[11px] font-bold text-navy">
                          <Eye className="size-3.5" /> Bids ({bids.length})
                        </p>
                        {bidAmounts.length > 1 && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <TrendingDown className="size-3" /> Min: {CURRENCY} {formatETB(Math.min(...bidAmounts))}
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="size-3" /> Max: {CURRENCY} {formatETB(Math.max(...bidAmounts))}
                            </span>
                          </div>
                        )}
                      </div>

                      {bids.length > 1 && <BidChart amounts={bidAmounts} total={bids.length} />}

                      {bids.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-muted-foreground">No bids placed yet</p>
                      ) : (
                        <div className="mt-2 flex flex-col gap-1">
                          {bids.map((b, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1.5">
                              <span className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                                <span className="flex size-4 items-center justify-center rounded-full bg-navy/10 text-[8px] font-bold text-navy/60">{i + 1}</span>
                                {b.userName || "Anonymous"}
                              </span>
                              <span className="text-[11px] font-bold text-navy">{CURRENCY} {formatETB(b.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
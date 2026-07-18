import { useState } from "react"
import { Plus, X, Pencil, XCircle, Trash2, Eye } from "lucide-react"
import { useApp } from "../AppContext"
import { CTAButton, Badge, Card } from "../components/AuctionUI"
import { CURRENCY, formatETB } from "../mockDataV0"
import type { Auction } from "../mockDataV0"

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyForm = { name: "", category: "Electronics", marketPrice: "", bidFee: "10", description: "", highlights: "", startTime: "", endTime: "" }

export function AdminAuctionsScreen() {
  const { go, auctions, addAuction, updateAuction, deleteAuction, closeAuction, allBids, users } = useApp()
  const now = new Date()
  const defaultStart = toDatetimeLocal(now)
  const defaultEnd = toDatetimeLocal(new Date(now.getTime() + 7 * 86400000))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewBidsId, setViewBidsId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd })
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => setForm({ ...emptyForm, startTime: defaultStart, endTime: defaultEnd })

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
      startTime: defaultStart, endTime: defaultEnd,
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.marketPrice) return
    setSubmitting(true)
    const highlights = form.highlights ? form.highlights.split(",").map((h) => h.trim()).filter(Boolean) : []
    if (editingId) {
      await updateAuction(editingId, {
        name: form.name, category: form.category, marketPrice: Number(form.marketPrice),
        description: form.description, highlights,
        ...(form.startTime ? { startTime: new Date(form.startTime).toISOString() } : {}),
        ...(form.endTime ? { endTime: new Date(form.endTime).toISOString() } : {}),
      })
    } else {
      await addAuction({
        name: form.name, category: form.category, marketPrice: Number(form.marketPrice),
        bidFee: Number(form.bidFee), description: form.description, highlights,
        startTime: new Date(form.startTime || defaultStart).toISOString(),
        endTime: new Date(form.endTime || defaultEnd).toISOString(),
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border bg-card px-5 pb-3 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => go("admin-dashboard")} className="mb-2 text-xs font-semibold text-primary">&larr; Back</button>
            <h1 className="font-display text-xl font-extrabold text-navy">Manage Auctions</h1>
          </div>
          <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
            <Plus className="size-3.5" /> New
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-5 pb-8 pt-4">
        {showForm && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-navy">{editingId ? "Edit Auction" : "New Auction"}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null) }}><X className="size-4 text-muted-foreground" /></button>
            </div>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary">
              {["Electronics", "Smartphones", "Computers", "Audio", "Gaming"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="flex gap-3">
              <input value={form.marketPrice} onChange={(e) => setForm((f) => ({ ...f, marketPrice: e.target.value.replace(/\D/g, "") }))} placeholder="Market price" className="w-1/2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
              <input value={form.bidFee} onChange={(e) => setForm((f) => ({ ...f, bidFee: e.target.value.replace(/\D/g, "") }))} placeholder="Bid fee" className="w-1/2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs font-medium outline-none focus:border-primary" />
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

        {auctions.length === 0 && (
          <p className="py-8 text-center text-xs font-medium text-muted-foreground">No auctions yet. Create one above.</p>
        )}
        {auctions.map((a: Auction) => (
          <div key={a.id}>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <img src={a.image || "/placeholder.svg"} alt="" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-navy">{a.name}</p>
                  <Badge tone={a.status === "ending-soon" ? "orange" : a.status === "live" ? "green" : "muted"}>{a.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {a.bidders} bidders &middot; {CURRENCY} {formatETB(a.marketPrice)}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
                  <Pencil className="size-3" />
                </button>
                <button onClick={() => setViewBidsId(viewBidsId === a.id ? null : a.id)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted">
                  <Eye className="size-3" />
                </button>
                {a.status !== "closed" && (
                  <button onClick={() => handleClose(a.id)} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10">
                    <XCircle className="size-3" />
                  </button>
                )}
                <button onClick={() => handleDelete(a.id)} className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
            {viewBidsId === a.id && (
              <div className="-mt-2 mb-2 rounded-2xl border border-border bg-secondary/40 p-3">
                <p className="mb-2 text-[11px] font-bold text-navy">Bids ({allBids.filter(b => b.auctionId === a.id).length})</p>
                {allBids.filter(b => b.auctionId === a.id).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No bids yet</p>
                ) : (
                  allBids.filter(b => b.auctionId === a.id).map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-[10px] font-medium text-muted-foreground">{b.userName || users.find(u => u.id === b.userId)?.name || "Anonymous"}</span>
                      <span className="text-[11px] font-bold text-navy">{CURRENCY} {formatETB(b.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

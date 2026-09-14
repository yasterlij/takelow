import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Package, Plus, Search, X, Pencil, Trash2, Camera, Link, ImageIcon, Filter, DollarSign, ShoppingBag, Tag, CheckCircle2, Clock, XCircle, Check, Ban, Images, CloudDownload } from "lucide-react"
import { useApp } from "../AppContext"
import { api } from "../api"
import { AdminLayout } from "../components/AdminLayout"
import { CTAButton, Badge, Card } from "../components/AuctionUI"
import { usePagination, PaginationBar } from "../components/Pagination"
import { STANDARD_AUCTION_CATEGORIES, normalizeAuctionCategory } from "../lib/auctionCategories"
import { formatCurrency, formatSpecSummary } from "../mockDataV0"
import { toast } from "../store/toast.store"

const specFields = [
  { key: "storage", label: "Storage" },
  { key: "ram", label: "RAM" },
  { key: "edition", label: "Edition" },
  { key: "battery", label: "Battery" },
  { key: "camera", label: "Camera" },
  { key: "osVersion", label: "OS Version" },
  { key: "display", label: "Display" },
  { key: "chipset", label: "Chipset" },
] as const

const emptySpecs = { storage: "", ram: "", edition: "", battery: "", camera: "", osVersion: "", display: "", chipset: "" }
const MAX_PRODUCT_IMAGES = 8
type ProductForm = { name: string; brand: string; category: string; price: string; description: string; imageUrls: string[] } & Record<keyof typeof emptySpecs, string>

function getProductCategory(product: { category?: string | null; name?: string | null }) {
  return normalizeAuctionCategory(product.category, product.name)
}

function productStatus(p: any): "PENDING" | "APPROVED" | "REJECTED" {
  if (p?.approval_status === "PENDING" || p?.approval_status === "REJECTED") return p.approval_status
  return "APPROVED"
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (status === "PENDING") return <Badge tone="gold"><Clock className="size-3" /> Pending</Badge>
  if (status === "REJECTED") return <Badge tone="hot"><XCircle className="size-3" /> Rejected</Badge>
  return <Badge tone="green"><CheckCircle2 className="size-3" /> Approved</Badge>
}

function ProductThumb({ src, onClick }: { src?: string; onClick?: () => void }) {
  const [err, setErr] = useState(false)
  const hasSrc = src && (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/"))
  if (err || !hasSrc) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-canvas">
        <ImageIcon className="size-5 text-neutral-300" />
      </div>
    )
  }
  return (
    <button onClick={onClick} className="size-14 shrink-0 overflow-hidden rounded-xl bg-canvas">
      <img src={src} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" />
    </button>
  )
}

function ImageThumb({ src, isCover, onRemove, onMakeCover }: { src: string; isCover: boolean; onRemove: () => void; onMakeCover: () => void }) {
  const [err, setErr] = useState(false)
  return (
    <div className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-canvas">
      {err ? (
        <div className="flex h-full w-full items-center justify-center"><ImageIcon className="size-5 text-neutral-300" /></div>
      ) : (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" />
      )}
      {isCover && (
        <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 py-0.5 text-[8px] font-semibold text-white">Cover</span>
      )}
      {!isCover && (
        <button onClick={onMakeCover} title="Set as cover" className="absolute inset-0 items-center justify-center bg-ink/50 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:flex">
          Set cover
        </button>
      )}
      <button onClick={onRemove} title="Remove image" className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-white">
        <X className="size-3" />
      </button>
    </div>
  )
}

function ImageUploadGrid({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [uploading, setUploading] = useState(false)
  const full = images.length >= MAX_PRODUCT_IMAGES

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"))
    e.target.value = ""
    if (!files.length || full) return
    setUploading(true)
    const next = [...images]
    try {
      for (const file of files) {
        if (next.length >= MAX_PRODUCT_IMAGES) break
        const res = await api.uploadProductImage(file)
        next.push(res.url)
      }
      onChange(next)
    } catch (e: any) {
      toast(e.message || "Image upload failed", "error")
    }
    setUploading(false)
  }

  const addUrl = () => {
    const url = urlValue.trim()
    if (!url) return
    if (images.includes(url)) {
      toast("Image already added", "warning")
      return
    }
    if (images.length >= MAX_PRODUCT_IMAGES) {
      toast(`Maximum ${MAX_PRODUCT_IMAGES} images`, "warning")
      return
    }
    onChange([...images, url])
    setUrlValue("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-neutral-400">Images ({images.length}/{MAX_PRODUCT_IMAGES}) — first image is the cover</span>
        <button onClick={() => setShowUrlInput(!showUrlInput)} className="flex items-center gap-1 text-[9px] font-medium text-neutral-400 hover:text-foreground">
          <Link className="size-3" /> {showUrlInput ? "Hide URL" : "Paste URL"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <ImageThumb
            key={src + i}
            src={src}
            isCover={i === 0}
            onRemove={() => onChange(images.filter((_, idx) => idx !== i))}
            onMakeCover={() => onChange([src, ...images.filter((_, idx) => idx !== i)])}
          />
        ))}
        {!full && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-canvas transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            <Camera className="size-5 text-neutral-400" />
            <span className="text-[8px] font-medium text-neutral-400">{uploading ? "Uploading..." : "Upload"}</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" multiple onChange={handleFiles} className="hidden" />
      {showUrlInput && (
        <div className="flex w-full gap-1">
          <input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addUrl()} placeholder="https://..." className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1 text-[10px] outline-none focus:border-primary" />
          <button onClick={addUrl} className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-medium text-primary-foreground">Add</button>
        </div>
      )}
    </div>
  )
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><X className="size-6" /></button>
      <img src={src} alt="" loading="lazy" decoding="async" className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

const emptyForm: ProductForm = { name: "", brand: "", category: STANDARD_AUCTION_CATEGORIES[0], price: "", description: "", imageUrls: [], ...emptySpecs }

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED"

export function AdminProductsScreen() {
  const { go, auctions } = useApp()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)

  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listProducts(1, 500)
      const list = (res as any).data || res || []
      setProducts(list)
    } catch (e: any) {
      setError(e.message || "Failed to load products")
      setProducts([])
    }
    setLoading(false)
  }

  useEffect(() => { loadProducts() }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditing(null)
    setShowForm(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (p: any) => {
    setEditing(p)
    setForm({
      name: p.name || "",
      brand: p.brand || "",
      category: getProductCategory(p),
      price: String(p.current_market_price || ""),
      description: p.description || "",
      imageUrls: (p.image_urls || []).slice(0, MAX_PRODUCT_IMAGES),
      ...emptySpecs,
      ...(p.specs || {}),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) return
    setSubmitting(true)
    const data: any = {
      name: form.name.trim(),
      current_market_price: Number(form.price),
      category: form.category.trim() || undefined,
      brand: form.brand.trim() || undefined,
      description: form.description.trim() || undefined,
      specs: Object.fromEntries(Object.keys(emptySpecs).map((key) => [key, (form as any)[key]?.trim()]).filter(([, value]) => value)),
      image_urls: form.imageUrls.length ? form.imageUrls : undefined,
    }
    try {
      if (editing) {
        await api.updateProduct(editing.id, data)
        toast("Product updated", "success")
      } else {
        await api.createProduct(data)
        toast("Product created — pending approval", "success")
      }
      resetForm()
      loadProducts()
    } catch (e: any) {
      toast(e.message || "Failed to save product", "error")
    }
    setSubmitting(false)
  }

  const handleApprove = async (p: any) => {
    setActionBusyId(p.id)
    try {
      await api.approveProduct(p.id)
      toast(`"${p.name}" approved`, "success")
      loadProducts()
    } catch (e: any) {
      toast(e.message || "Failed to approve product", "error")
    }
    setActionBusyId(null)
  }

  const handleReject = async (p: any) => {
    const reason = window.prompt(`Reason for rejecting "${p.name}"? (optional)`) ?? undefined
    setActionBusyId(p.id)
    try {
      await api.rejectProduct(p.id, reason || undefined)
      toast(`"${p.name}" rejected`, "info")
      loadProducts()
    } catch (e: any) {
      toast(e.message || "Failed to reject product", "error")
    }
    setActionBusyId(null)
  }

  const handleLocalizeImages = async (p: any) => {
    setActionBusyId(p.id)
    try {
      const res = await api.downloadProductImages(p.id)
      toast(res.message || `Downloaded ${res.downloaded}/${res.total} images to server`, "success")
      loadProducts()
    } catch (e: any) {
      toast(e.message || "Failed to download images", "error")
    }
    setActionBusyId(null)
  }

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      api.deleteProduct(id)
        .then(() => { toast("Product deleted", "success"); loadProducts() })
        .catch((e: any) => toast(e.message || "Failed to delete product", "error"))
    }
  }

  const categories = STANDARD_AUCTION_CATEGORIES.filter((category) => products.some((p) => getProductCategory(p) === category))
  const pendingCount = products.filter((p) => productStatus(p) === "PENDING").length

  const filtered = products.filter((p: any) => {
    const category = getProductCategory(p)
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase()) && !category.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== "all" && category !== categoryFilter) return false
    if (statusFilter !== "all" && productStatus(p) !== statusFilter) return false
    return true
  })

  const { page, setPage, perPage, setPerPage, totalPages, paginated, resetPage } = usePagination(filtered, 5)

  const totalValue = products.reduce((sum, p) => sum + Number(p.current_market_price || 0), 0)
  const inUseCount = products.filter((p) => auctions.some((a) => a.productId === p.id)).length

  const statusTabs: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "PENDING", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
    { id: "APPROVED", label: "Approved" },
    { id: "REJECTED", label: "Rejected" },
  ]

  return (
    <AdminLayout
      title="Product Management"
      subtitle={`${products.length} products`}
      actions={
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-[#B89A38] active:opacity-80">
          <Plus className="size-3.5" /> New Product
        </button>
      }
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="space-y-4"
      >
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

      <motion.div
        variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-center gap-2"
      >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage() }}
              placeholder="Search products..."
              className="w-full rounded-xl border border-border/60 bg-white py-2 pl-8 pr-3 text-xs font-normal outline-none transition-colors placeholder:text-neutral-400 focus:border-primary"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); resetPage() }}
              className="rounded-xl border border-border/60 bg-white px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
        </motion.div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
        }}
        className="grid grid-cols-3 gap-3"
      >
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <ShoppingBag className="size-5 text-awash-gold-dark" />
              <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{loading ? "..." : products.length}</p>
              <p className="text-[10px] font-medium text-neutral-400">Products</p>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <DollarSign className="size-5 text-awash-gold-dark" />
              <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{formatCurrency(totalValue)}</p>
              <p className="text-[10px] font-medium text-neutral-400">Total Value</p>
            </Card>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
            <Card className="items-center p-3 text-center">
              <Tag className="size-5 text-awash-gold-dark" />
              <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{categories.length}</p>
              <p className="text-[10px] font-medium text-neutral-400">Categories</p>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }} className="flex flex-wrap items-center gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); resetPage() }}
              className={`btn-filter-chip ${statusFilter === tab.id ? "btn-filter-chip-active btn-filter-chip-navy" : "btn-filter-chip-glass"}`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              key="product-form"
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="mb-4 space-y-3 border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-ink">{editing ? "Edit Product" : "New Product"}</h2>
                  <button onClick={resetForm} className="rounded-full p-1 transition-colors hover:bg-cool-wash"><X className="size-4 text-neutral-400" /></button>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-3">
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" maxLength={120} className="input-full" />
                    <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Brand (e.g. Apple, Samsung)" maxLength={255} className="input-full" />
                    <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-full">
                      {STANDARD_AUCTION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").replace(/(\.\d{2})\d+/g, "$1") }))} type="text" inputMode="decimal" placeholder="Market Price (ETB)" className="input-full" />
                  </div>
                </div>

                <ImageUploadGrid images={form.imageUrls} onChange={(urls) => setForm((f) => ({ ...f, imageUrls: urls }))} />

                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" maxLength={2000} className="input-full" rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  {specFields.map((field) => (
                    <label key={field.key}>
                      <span className="mb-1 block text-[10px] font-semibold text-neutral-400">{field.label}</span>
                      <input
                        value={(form as any)[field.key] || ""}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.label}
                        className="input-full"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <CTAButton variant="outline" onClick={resetForm} className="flex-1">Cancel</CTAButton>
                  <CTAButton onClick={handleSave} disabled={submitting || !form.name || !form.price} className="flex-1">
                    {submitting ? "Saving..." : editing ? "Update Product" : "Create Product"}
                  </CTAButton>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="mb-3 flex items-center justify-between"
        >
          <p className="text-xs font-medium text-neutral-400">
            {filtered.length} of {products.length} products
          </p>
          {inUseCount > 0 && (
            <Badge tone="gold">{inUseCount} in auctions</Badge>
          )}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Filter className="size-8 text-destructive opacity-40" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <button onClick={loadProducts} className="text-xs font-medium text-awash-gold-dark transition-colors hover:text-ink">Retry</button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-neutral-400"
          >
            <Package className="size-8 opacity-30" />
            <p className="text-sm font-medium">{search || categoryFilter !== "all" || statusFilter !== "all" ? "No matching products" : "No products yet"}</p>
            {search || categoryFilter !== "all" || statusFilter !== "all" ? (
              <button onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all") }} className="text-xs font-medium text-awash-gold-dark transition-colors hover:text-ink">Clear filters</button>
            ) : (
              <p className="text-xs">Click "New Product" to get started</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="space-y-2"
          >
            {paginated.map((p: any) => {
              const status = productStatus(p)
              const busy = actionBusyId === p.id
              return (
                <motion.div
                  key={p.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  className="flex items-center gap-3 rounded-2xl bg-canvas p-3 transition-colors"
                >
                  <ProductThumb src={p.image_urls?.[0]} onClick={() => p.image_urls?.[0] && setLightboxImg(p.image_urls[0])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                      {p.brand && <span className="text-xs font-normal text-neutral-400">{p.brand}</span>}
                      <Badge tone="navy">{getProductCategory(p)}</Badge>
                      {p.specs && formatSpecSummary(p.specs) && <Badge tone="muted">{formatSpecSummary(p.specs)}</Badge>}
                      {(p.image_urls?.length || 0) > 1 && <Badge tone="muted"><Images className="size-3" /> {p.image_urls.length}</Badge>}
                      <StatusBadge status={status} />
                    </div>
                    <p className="mt-0.5 text-xs font-normal text-neutral-500">
                      {formatCurrency(p.current_market_price)}
                      {p.description && <span className="ml-2">· {p.description.slice(0, 60)}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {(p.image_urls || []).some((u: string) => u.startsWith("http")) && (
                      <button onClick={() => handleLocalizeImages(p)} disabled={busy} className="flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1.5 text-[10px] font-medium text-ink transition-colors hover:bg-white active:scale-95 disabled:opacity-50" title="Download remote images to server storage">
                        <CloudDownload className="size-3" />
                      </button>
                    )}
                    {status === "PENDING" && (
                      <>
                        <button onClick={() => handleApprove(p)} disabled={busy} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10px] font-medium text-primary-foreground transition-colors hover:bg-[#B89A38] active:scale-95 disabled:opacity-50" title="Approve">
                          <Check className="size-3" /> Approve
                        </button>
                        <button onClick={() => handleReject(p)} disabled={busy} className="flex items-center gap-1 rounded-full border border-foreground/70 px-2.5 py-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-foreground hover:text-white active:scale-95 disabled:opacity-50" title="Reject">
                          <Ban className="size-3" />
                        </button>
                      </>
                    )}
                    {status !== "PENDING" && (
                      <button onClick={() => openEdit(p)} className="flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1.5 text-[10px] font-medium text-ink transition-colors hover:bg-white active:scale-95" title="Edit">
                        <Pencil className="size-3" />
                      </button>
                    )}
                    <button onClick={() => confirmDelete(p.id, p.name)} className="flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1.5 text-[10px] font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-95" title="Delete">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
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
      </motion.div>
    </AdminLayout>
  )
}

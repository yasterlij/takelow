import { useState, useMemo, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Inbox, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, ArrowUpDown } from "lucide-react"

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  align?: "left" | "right" | "center"
  sortable?: boolean
  sortValue?: (row: T) => string | number
  filterable?: boolean
  filterValue?: (row: T) => string
  width?: string
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: { icon?: ReactNode; title: string; message?: string }
  onRowClick?: (row: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  showPagination?: boolean
  className?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  searchable = false,
  searchPlaceholder = "Search...",
  pageSize = 10,
  showPagination = false,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let result = [...rows]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          if (col.filterValue) return col.filterValue(row).toLowerCase().includes(q)
          if (col.sortValue) return String(col.sortValue(row)).toLowerCase().includes(q)
          return false
        }),
      )
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      if (col?.sortValue) {
        result.sort((a, b) => {
          const av = col.sortValue!(a)
          const bv = col.sortValue!(b)
          if (typeof av === "number" && typeof bv === "number") {
            return sortDir === "asc" ? av - bv : bv - av
          }
          return sortDir === "asc"
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av))
        })
      }
    }
    return result
  }, [rows, search, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageData = showPagination
    ? filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : filtered

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="ml-2 text-sm font-medium text-neutral-400">Loading…</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 ${className || ""}`}>
      {searchable && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-border/60 bg-white px-4 py-2.5 pl-10 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-white shadow-[0_4px_20px_rgba(0,43,92,0.04)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60 bg-neutral-50/80">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-awash-blue"
                    >
                      {c.header}
                      {sortKey === c.key ? (
                        sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {pageData.map((row, i) => (
                <motion.tr
                  key={rowKey(row)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border/40 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-primary/5" : "hover:bg-neutral-50/60"
                  }`}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 text-sm font-medium text-neutral-700 ${
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                      } ${c.className || ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
              {empty?.icon ?? <Inbox className="size-6" />}
            </div>
            <p className="mt-3 text-sm font-bold text-neutral-500">{empty?.title ?? "No data"}</p>
            {empty?.message && <p className="mt-1 text-xs font-medium text-neutral-400">{empty.message}</p>}
          </div>
        )}
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-400">
            Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-white text-neutral-500 transition-all hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-bold text-awash-blue tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-white text-neutral-500 transition-all hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

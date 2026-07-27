import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Loader2, Inbox } from "lucide-react"

type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  align?: "left" | "right" | "center"
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: { icon?: ReactNode; title: string; message?: string }
  onRowClick?: (row: T) => void
}

export function DataTable<T>({ columns, rows, rowKey, loading, empty, onRowClick }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="ml-2 text-sm font-medium text-neutral-400">Loading…</span>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
          {empty?.icon ?? <Inbox className="size-6" />}
        </div>
        <p className="mt-3 text-sm font-bold text-neutral-500">{empty?.title ?? "No data"}</p>
        {empty?.message && <p className="mt-1 text-xs font-medium text-neutral-400">{empty.message}</p>}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/60">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 ${
                  c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={rowKey(row)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border/40 transition-colors ${
                onRowClick ? "cursor-pointer hover:bg-neutral-50/80" : "hover:bg-neutral-50/50"
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
        </tbody>
      </table>
    </div>
  )
}

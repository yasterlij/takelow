export type AuctionStatus = "live" | "ending-soon" | "closed"

export type AuctionWinnerInfo = {
  user_id: string
  amount: number
  rank: number
  payment_status?: string
  payment_deadline?: string
  name?: string
  phone?: string
}

export type ProductSpecs = {
  storage?: string
  ram?: string
  edition?: string
  battery?: string
  camera?: string
  osVersion?: string
  display?: string
  chipset?: string
}

export type Auction = {
  id: string
  publicCode?: string
  name: string
  category: string
  images: string[]
  marketPrice: number
  bidFee: number
  bidders: number
  timeLeft: number
  status: AuctionStatus
  description: string
  highlights: string[]
  specs?: ProductSpecs | null
  specSummary?: string
  productId?: string
  uniqueBidders?: number
  totalBids?: number
  minBid?: number
  maxBid?: number
  endTime?: string
  winning_bid_amount?: number | null
  winner_user_id?: string | null
  winners?: AuctionWinnerInfo[]
  winnersCount?: number
  payment_status?: string
  total_revenue?: number
}

export const CURRENCY = "birr"

export function formatETB(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatCurrency(amount: number | null | undefined): string {
  return `${formatETB(amount)} ${CURRENCY}`
}

export function formatMaskedCurrency(mask = "••••"): string {
  return `${mask} ${CURRENCY}`
}

export function formatSpecSummary(specs?: ProductSpecs | null): string {
  if (!specs) return ""
  return [specs.storage, specs.ram, specs.edition].filter(Boolean).join(" | ")
}

export function getSpecEntries(specs?: ProductSpecs | null): Array<{ key: keyof ProductSpecs; label: string; value: string }> {
  if (!specs) return []
  const fields: Array<{ key: keyof ProductSpecs; label: string }> = [
    { key: "storage", label: "Storage" },
    { key: "ram", label: "RAM" },
    { key: "edition", label: "Edition" },
    { key: "battery", label: "Battery" },
    { key: "camera", label: "Camera" },
    { key: "osVersion", label: "OS Version" },
    { key: "display", label: "Display" },
    { key: "chipset", label: "Chipset" },
  ]
  return fields
    .map((field) => ({ ...field, value: specs[field.key] || "" }))
    .filter((field) => field.value)
}

export function formatCountdown(totalSeconds: number): {
  d: string
  h: string
  m: string
  s: string
} {
  const clamped = Math.max(0, totalSeconds)
  const d = Math.floor(clamped / 86400)
  const h = Math.floor((clamped % 86400) / 3600)
  const m = Math.floor((clamped % 3600) / 60)
  const s = Math.floor(clamped % 60)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) }
}

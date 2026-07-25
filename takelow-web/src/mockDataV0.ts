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

export type Auction = {
  id: string
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

export const CURRENCY = "ETB"

export function formatETB(amount: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount ?? 0)
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

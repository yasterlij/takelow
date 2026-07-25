import { CURRENCY } from './theme'

export type AuctionStatus = 'live' | 'ending-soon' | 'closed'

export type Auction = {
  id: string
  name: string
  category: string
  images: string[]
  marketPrice: number
  bidFee: number
  bidders: number
  uniqueBidders: number
  timeLeft: number
  endTime: string
  status: AuctionStatus
  description: string
  highlights: string[]
  totalBids: number
  minBid?: number
  maxBid?: number
  winning_bid_amount?: number | null
  winners?: { user_id: string; amount: number; name: string | null; rank: number; payment_status: string | null; payment_deadline: string | null }[]
  winnersCount?: number
  payment_status?: string | null
  payment_deadline?: string | null
}

export { CURRENCY }
export function formatETB(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  return Number(n.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCountdown(totalSeconds: number): { d: string; h: string; m: string; s: string } {
  const clamped = Math.max(0, totalSeconds)
  const d = Math.floor(clamped / 86400)
  const h = Math.floor((clamped % 86400) / 3600)
  const m = Math.floor((clamped % 3600) / 60)
  const s = Math.floor(clamped % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) }
}

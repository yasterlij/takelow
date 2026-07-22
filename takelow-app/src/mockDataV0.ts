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
  numWinners?: number
}

export { CURRENCY }
export function formatETB(amount: number): string {
  return Number(amount.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

import { CURRENCY } from './theme'

export type AuctionStatus = 'live' | 'ending-soon' | 'closed'

export type Auction = {
  id: string
  name: string
  category: string
  image: string
  marketPrice: number
  bidFee: number
  bidders: number
  timeLeft: number
  status: AuctionStatus
  description: string
  highlights: string[]
}

export const auctions: Auction[] = [
  {
    id: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    category: 'Smartphones',
    image: 'https://picsum.photos/seed/iphone15/400/400',
    marketPrice: 85000,
    bidFee: 10,
    bidders: 32,
    timeLeft: 2 * 3600 + 15 * 60 + 30,
    status: 'live',
    description: '6.7-inch Super Retina XDR display, A17 Pro chip, titanium design and a pro camera system.',
    highlights: ['256GB Storage', 'Titanium Body', 'A17 Pro Chip', '48MP Camera'],
  },
  {
    id: 'samsung-55-tv',
    name: 'Samsung 55" Smart TV',
    category: 'Electronics',
    image: 'https://picsum.photos/seed/samsungtv/400/400',
    marketPrice: 65000,
    bidFee: 10,
    bidders: 18,
    timeLeft: 1 * 3600 + 45 * 60 + 10,
    status: 'live',
    description: 'Crystal UHD 4K smart TV with vivid color, slim bezels and built-in streaming.',
    highlights: ['55" Display', '4K UHD', 'Smart Hub', 'HDR10+'],
  },
  {
    id: 'dell-laptop',
    name: 'Dell XPS Laptop',
    category: 'Computers',
    image: 'https://picsum.photos/seed/dellxps/400/400',
    marketPrice: 50000,
    bidFee: 10,
    bidders: 24,
    timeLeft: 3 * 3600 + 30 * 60 + 45,
    status: 'live',
    description: 'Ultra-thin Dell XPS with stunning InfinityEdge display and all-day battery.',
    highlights: ['16GB RAM', '512GB SSD', 'Intel Core i7', '13.4" Display'],
  },
  {
    id: 'headphones',
    name: 'Wireless Headphones Pro',
    category: 'Audio',
    image: 'https://picsum.photos/seed/headphones/400/400',
    marketPrice: 18000,
    bidFee: 10,
    bidders: 41,
    timeLeft: 40 * 60 + 12,
    status: 'ending-soon',
    description: 'Premium noise-cancelling over-ear headphones with 30-hour battery life.',
    highlights: ['Active Noise Cancel', '30h Battery', 'Bluetooth 5.3', 'Fast Charge'],
  },
  {
    id: 'game-console',
    name: 'Next-Gen Game Console',
    category: 'Gaming',
    image: 'https://picsum.photos/seed/ps5/400/400',
    marketPrice: 42000,
    bidFee: 10,
    bidders: 37,
    timeLeft: 5 * 3600 + 5 * 60,
    status: 'live',
    description: 'Fast next-gen console with ultra-high-speed SSD, ray tracing and wireless controller.',
    highlights: ['1TB SSD', '4K Gaming', 'Ray Tracing', '1 Controller'],
  },
]

export function getAuction(id: string | null | undefined): Auction | undefined {
  if (!id) return undefined
  return auctions.find((a) => a.id === id)
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

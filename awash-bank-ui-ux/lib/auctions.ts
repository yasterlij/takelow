export type AuctionStatus = "live" | "ending-soon" | "closed"

export type Auction = {
  id: string
  name: string
  category: string
  image: string
  marketPrice: number
  bidFee: number
  bidders: number
  /** seconds remaining */
  timeLeft: number
  status: AuctionStatus
  description: string
  highlights: string[]
}

export const CURRENCY = "ETB"

export const auctions: Auction[] = [
  {
    id: "iphone-15-pro-max",
    name: "iPhone 15 Pro Max",
    category: "Smartphones",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a7/IPhone_15_pro_max.jpg",
    marketPrice: 85000,
    bidFee: 10,
    bidders: 32,
    timeLeft: 2 * 3600 + 15 * 60 + 30,
    status: "live",
    description:
      "6.7-inch Super Retina XDR display, A17 Pro chip, titanium design and a pro camera system. The most advanced iPhone, up for grabs at the lowest unique bid.",
    highlights: ["256GB Storage", "Titanium Body", "A17 Pro Chip", "48MP Camera"],
  },
  {
    id: "samsung-55-tv",
    name: 'Samsung 55" Smart TV',
    category: "Electronics",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Samsung_LED_TV.jpg",
    marketPrice: 65000,
    bidFee: 10,
    bidders: 18,
    timeLeft: 1 * 3600 + 45 * 60 + 10,
    status: "live",
    description:
      "Crystal UHD 4K smart TV with vivid color, slim bezels and built-in streaming. Bring the cinema home for a fraction of the price.",
    highlights: ['55" Display', "4K UHD", "Smart Hub", "HDR10+"],
  },
  {
    id: "dell-laptop",
    name: "Dell XPS Laptop",
    category: "Computers",
    image: "https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/3405340/dell-xps-0212.0.jpg",
    marketPrice: 50000,
    bidFee: 10,
    bidders: 24,
    timeLeft: 3 * 3600 + 30 * 60 + 45,
    status: "live",
    description:
      "Ultra-thin Dell XPS with a stunning InfinityEdge display, Intel Core processor and all-day battery. Built for work and play.",
    highlights: ["16GB RAM", "512GB SSD", "Intel Core i7", '13.4" Display'],
  },
  {
    id: "headphones",
    name: "Wireless Headphones Pro",
    category: "Audio",
    image: "https://www.classic-phones.com/cdn/shop/files/image_e0fd1474-6c62-43a8-916f-7c118e375ed6_large.jpg?v=1715270049",
    marketPrice: 18000,
    bidFee: 10,
    bidders: 41,
    timeLeft: 40 * 60 + 12,
    status: "ending-soon",
    description:
      "Premium noise-cancelling over-ear headphones with up to 30 hours of battery and crystal-clear sound.",
    highlights: ["Active Noise Cancel", "30h Battery", "Bluetooth 5.3", "Fast Charge"],
  },
  {
    id: "game-console",
    name: "Next-Gen Game Console",
    category: "Gaming",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png",
    marketPrice: 42000,
    bidFee: 10,
    bidders: 37,
    timeLeft: 5 * 3600 + 5 * 60,
    status: "live",
    description:
      "Lightning-fast next-generation console with ultra-high-speed SSD, ray tracing and one wireless controller included.",
    highlights: ["1TB SSD", "4K Gaming", "Ray Tracing", "1 Controller"],
  },
]

export function getAuction(id: string | null | undefined): Auction | undefined {
  if (!id) return undefined
  return auctions.find((a) => a.id === id)
}

export function formatETB(amount: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)
}

export function formatCountdown(totalSeconds: number): {
  h: string
  m: string
  s: string
} {
  const clamped = Math.max(0, totalSeconds)
  const h = Math.floor(clamped / 3600)
  const m = Math.floor((clamped % 3600) / 60)
  const s = Math.floor(clamped % 60)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return { h: pad(h), m: pad(m), s: pad(s) }
}

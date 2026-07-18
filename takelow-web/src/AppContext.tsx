import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { api, setApiToken } from "./api"
import { auctions as mockAuctions, type Auction } from "./mockDataV0"

export type View =
  | "login"
  | "register"
  | "home"
  | "auctions"
  | "my-bids"
  | "product"
  | "pay-fee"
  | "place-bid"
  | "bid-confirmed"
  | "monitor"
  | "closed"
  | "winner"
  | "pay-winning"
  | "payment-confirmed"
  | "delivery"
  | "admin-dashboard"
  | "admin-auctions"
  | "admin-users"

export type UserRole = "admin" | "user"

export type User = {
  id: string
  name: string
  phone: string
  role: UserRole
}

export type PlacedBid = {
  auctionId: string
  amount: number
  placedAt: number
  userId?: string
  userName?: string
}

type AppState = {
  view: View
  selectedId: string | null
  userBid: number | null
  feePaid: boolean
  walletBalance: number
  myBids: PlacedBid[]
  user: User | null
  users: User[]
  allBids: PlacedBid[]
  auctions: Auction[]
  auctionsLoading: boolean
  go: (view: View) => void
  selectAuction: (id: string) => void
  payFee: (fee: number) => void
  submitBid: (amount: number) => void
  payWinning: (amount: number) => void
  reset: () => void
  login: (phone: string, pin: string) => boolean
  register: (name: string, phone: string, pin: string) => void
  logout: () => void
  addAuction: (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string }) => Promise<void>
  updateAuction: (id: string, data: Partial<Pick<Auction, "name" | "category" | "marketPrice" | "description" | "highlights">> & { startTime?: string; endTime?: string }) => Promise<void>
  deleteAuction: (id: string) => Promise<void>
  closeAuction: (id: string) => Promise<void>
  refreshAuctions: () => Promise<void>
  getAuction: (id: string | null | undefined) => Auction | undefined
}

const AppContext = createContext<AppState | null>(null)

const INITIAL_BALANCE = 4250.75

const MOCK_USERS: User[] = [
  { id: "admin-1", name: "Admin Awash", phone: "0911111111", role: "admin" },
  { id: "user-1", name: "Selam Tesfaye", phone: "0913320001", role: "user" },
  { id: "user-2", name: "Abebe Kebede", phone: "0913320002", role: "user" },
  { id: "user-3", name: "Meron Tadesse", phone: "0913320003", role: "user" },
]

const ADMIN_PIN = "1234"
const USER_PIN = "0000"

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem("takelow_user")
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function findUserByPhone(phone: string): User | undefined {
  return MOCK_USERS.find((u) => u.phone === phone)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(() => loadUser() ? "home" : "login")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userBid, setUserBid] = useState<number | null>(null)
  const [feePaid, setFeePaid] = useState(false)
  const [walletBalance, setWalletBalance] = useState(INITIAL_BALANCE)
  const [myBids, setMyBids] = useState<PlacedBid[]>([])
  const [user, setUser] = useState<User | null>(() => loadUser())
  const [allBids, setAllBids] = useState<PlacedBid[]>([])
  const [auctions, setAuctions] = useState<Auction[]>(mockAuctions)
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const users = MOCK_USERS

  const go = useCallback((next: View) => setView(next), [])

  const selectAuction = useCallback((id: string) => {
    setSelectedId(id)
    setFeePaid(false)
    setUserBid(null)
    setView("product")
  }, [])

  const payFee = useCallback((fee: number) => {
    setWalletBalance((b) => Math.max(0, b - fee))
    setFeePaid(true)
    setView("place-bid")
  }, [])

  const submitBid = useCallback(
    (amount: number) => {
      setUserBid(amount)
      if (selectedId && user) {
        const bid: PlacedBid = { auctionId: selectedId, amount, placedAt: Date.now(), userId: user.id, userName: user.name }
        setMyBids((prev) => {
          const withoutCurrent = prev.filter((b) => b.auctionId !== selectedId)
          return [bid, ...withoutCurrent]
        })
        setAllBids((prev) => [bid, ...prev])
      }
      setView("bid-confirmed")
    },
    [selectedId, user],
  )

  const payWinning = useCallback((amount: number) => {
    setWalletBalance((b) => Math.max(0, b - amount))
    setView("payment-confirmed")
  }, [])

  const reset = useCallback(() => {
    setView("home")
    setSelectedId(null)
    setUserBid(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setMyBids([])
  }, [])

  const login = useCallback((phone: string, pin: string): boolean => {
    const found = findUserByPhone(phone)
    if (!found) return false
    const validPin = found.role === "admin" ? pin === ADMIN_PIN : pin === USER_PIN
    if (!validPin) return false
    setUser(found)
    localStorage.setItem("takelow_user", JSON.stringify(found))
    setView("home")
    return true
  }, [])

  const register = useCallback((name: string, phone: string, pin: string) => {
    const newUser: User = { id: `user-${Date.now()}`, name, phone, role: "user" }
    MOCK_USERS.push(newUser)
    setUser(newUser)
    localStorage.setItem("takelow_user", JSON.stringify(newUser))
    setView("home")
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("takelow_user")
    setView("login")
  }, [])

  const refreshAuctions = useCallback(async () => {
    setAuctionsLoading(true)
    try {
      const res = await api.listAuctions()
      const mapped: Auction[] = res.data.map((apiAuction) => ({
        id: apiAuction.id,
        name: apiAuction.product?.name || "Unknown Product",
        category: "",
        image: `/products/${apiAuction.product?.name?.toLowerCase().replace(/\s+/g, "-") || "placeholder"}.png`,
        marketPrice: Number(apiAuction.product?.current_market_price || 0),
        bidFee: 10,
        bidders: 0,
        timeLeft: Math.max(0, Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000)),
        status: apiAuction.status === "ACTIVE" ? "live" : "closed",
        description: apiAuction.product?.description || "",
        highlights: [],
      }))
      setAuctions(mapped)
    } catch {
      // API unreachable — keep current data
    } finally {
      setAuctionsLoading(false)
    }
  }, [])

  const addAuction = useCallback(async (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string }) => {
    try {
      const product = await api.createProduct({
        name: a.name,
        description: a.description,
        current_market_price: a.marketPrice,
      })
      await api.createAuction({
        product_id: product.id,
        start_time: a.startTime,
        end_time: a.endTime,
      })
      await refreshAuctions()
    } catch {
      const id = `auction-${Date.now()}`
      const timeLeft = Math.max(0, Math.floor((new Date(a.endTime).getTime() - Date.now()) / 1000))
      const newAuction: Auction = {
        id,
        name: a.name,
        category: a.category,
        image: "/placeholder.svg",
        marketPrice: a.marketPrice,
        bidFee: a.bidFee,
        bidders: 0,
        timeLeft,
        status: "live",
        description: a.description,
        highlights: a.highlights,
      }
      setAuctions((prev) => [newAuction, ...prev])
    }
    setView("admin-auctions")
  }, [refreshAuctions])

  const closeAuction = useCallback(async (id: string) => {
    try {
      await api.closeAuction(id)
      await refreshAuctions()
    } catch {
      setAuctions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "closed" as const } : a)),
      )
    }
  }, [refreshAuctions])

  const updateAuction = useCallback(async (id: string, data: Partial<Pick<Auction, "name" | "category" | "marketPrice" | "description" | "highlights">> & { startTime?: string; endTime?: string }) => {
    try {
      const auction = await api.listAuctions().then(r => r.data.find(a => a.id === id))
      if (auction?.product?.id) {
        if (data.name || data.marketPrice !== undefined || data.description !== undefined) {
          await api.updateProduct(auction.product.id, {
            ...(data.name ? { name: data.name } : {}),
            ...(data.marketPrice !== undefined ? { current_market_price: data.marketPrice } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
          })
        }
        if (data.startTime || data.endTime) {
          await api.updateAuction(id, {
            ...(data.startTime ? { start_time: data.startTime } : {}),
            ...(data.endTime ? { end_time: data.endTime } : {}),
          })
        }
      }
      await refreshAuctions()
    } catch {
      setAuctions((prev) => prev.map((a) => {
        if (a.id !== id) return a
        const updated = { ...a }
        if (data.name !== undefined) updated.name = data.name
        if (data.category !== undefined) updated.category = data.category
        if (data.marketPrice !== undefined) updated.marketPrice = data.marketPrice
        if (data.description !== undefined) updated.description = data.description
        if (data.highlights !== undefined) updated.highlights = data.highlights
        return updated
      }))
    }
  }, [refreshAuctions])

  const deleteAuction = useCallback(async (id: string) => {
    try {
      await api.deleteAuction(id)
      await refreshAuctions()
    } catch {
      setAuctions((prev) => prev.filter((a) => a.id !== id))
    }
  }, [refreshAuctions])

  const getAuction = useCallback(
    (id: string | null | undefined): Auction | undefined => {
      if (!id) return undefined
      return auctions.find((a) => a.id === id)
    },
    [auctions],
  )

  const value = useMemo(
    () => ({
      view, selectedId, userBid, feePaid, walletBalance, myBids, user, users, allBids,
      auctions, auctionsLoading,
      go, selectAuction, payFee, submitBid, payWinning, reset,
      login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction, refreshAuctions, getAuction,
    }),
    [view, selectedId, userBid, feePaid, walletBalance, myBids, user, users, allBids,
     auctions, auctionsLoading,
     go, selectAuction, payFee, submitBid, payWinning, reset,
     login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction, refreshAuctions, getAuction],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

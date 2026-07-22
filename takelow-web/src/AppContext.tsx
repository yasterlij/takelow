import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react"
import type { ReactNode } from "react"
import { api, setApiToken, setRefreshToken, getApiToken, getRefreshToken } from "./api"
import type { Auction } from "./mockDataV0"

export type View =
  | "login" | "register" | "home" | "auctions" | "my-bids"
  | "product" | "pay-fee" | "place-bid" | "bid-confirmed"
  | "monitor" | "closed" | "winner" | "pay-winning" | "payment-confirmed" | "delivery"
  | "admin-dashboard" | "admin-auctions" | "admin-users" | "deposit"
  | "payment-success" | "payment-failed"

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
  ticketNumber?: string
}

type AppState = {
  view: View
  selectedId: string | null
  userBid: number | null
  bidTicketNumber: string | null
  feePaid: boolean
  walletBalance: number
  myBids: PlacedBid[]
  user: User | null
  allBids: PlacedBid[]
  auctions: Auction[]
  auctionsLoading: boolean
  authError: string | null
  go: (view: View) => void
  selectAuction: (id: string) => void
  payFee: (fee: number) => Promise<void>
  submitBid: (amount: number) => Promise<void>
  payWinning: (amount: number) => Promise<void>
  reset: () => void
  login: (phone: string, password: string) => Promise<boolean>
  register: (phone: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  addAuction: (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number; numWinners?: number }) => Promise<void>
  updateAuction: (id: string, data: Partial<Pick<Auction, "name" | "category" | "marketPrice" | "description" | "highlights" | "images">> & { startTime?: string; endTime?: string; minBid?: number; maxBid?: number; numWinners?: number }) => Promise<void>
  deleteAuction: (id: string) => Promise<void>
  closeAuction: (id: string) => Promise<void>
  refreshAuctions: () => Promise<void>
  refreshWallet: () => Promise<void>
  fetchAuctionById: (id: string) => Promise<Auction | undefined>
  getAuction: (id: string | null | undefined) => Auction | undefined
}

const AppContext = createContext<AppState | null>(null)

const INITIAL_BALANCE = 0
const STORAGE_KEY = "takelow_data"

function mapAuction(apiAuction: any): Auction {
  const timeLeft = Math.max(0, Math.floor((new Date(apiAuction.end_time).getTime() - Date.now()) / 1000))
  return {
    id: apiAuction.id,
    name: apiAuction.product?.name || 'Unknown Product',
    category: apiAuction.product?.brand || '',
    images: apiAuction.product?.image_urls || [],
    marketPrice: Number(apiAuction.product?.current_market_price || 0),
    bidFee: 50,
    bidders: apiAuction.stats?.total_bids ?? 0,
    uniqueBidders: apiAuction.stats?.unique_bidders ?? 0,
    totalBids: apiAuction.stats?.total_bids ?? 0,
    timeLeft,
    endTime: apiAuction.end_time,
    status: (apiAuction.status === 'ACTIVE' ? (timeLeft < 3600 ? 'ending-soon' : 'live') : 'closed') as Auction['status'],
    description: apiAuction.product?.description || '',
    highlights: [],
    minBid: apiAuction.min_bid ?? undefined,
    maxBid: apiAuction.max_bid ?? undefined,
    numWinners: apiAuction.num_winners ?? 1,
  }
}

const POLL_INTERVAL = 30000
const LIVE_VIEWS: View[] = ['home', 'auctions', 'product', 'monitor', 'my-bids']

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('login')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userBid, setUserBid] = useState<number | null>(null)
  const [bidTicketNumber, setBidTicketNumber] = useState<string | null>(null)
  const [feePaid, setFeePaid] = useState(false)
  const [walletBalance, setWalletBalance] = useState(INITIAL_BALANCE)
  const [myBids, setMyBids] = useState<PlacedBid[]>([])
  const [allBids, setAllBids] = useState<PlacedBid[]>([])
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const refreshing = useRef(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw)
        if (saved.auctions?.length) {
          const unique = Array.from(new Map<string, Auction>(saved.auctions.map((a: any) => [a.id, a])).values())
          setAuctions(unique)
        }
        if (saved.allBids?.length) setAllBids(saved.allBids)
        if (saved.myBids?.length) setMyBids(saved.myBids)
        if (saved.walletBalance != null) setWalletBalance(saved.walletBalance)
        if (saved.accessToken && saved.refreshToken && saved.user) {
          setApiToken(saved.accessToken)
          setRefreshToken(saved.refreshToken)
          const appUser = saved.user as User
          setUser(appUser)
          setView('home')
        }
      } catch { /* ignore corrupt data */ }
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const tokens = user ? { accessToken: getApiToken(), refreshToken: getRefreshToken() } : {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ auctions, allBids, myBids, walletBalance, user, ...tokens }))
  }, [auctions, allBids, myBids, walletBalance, user, hydrated])

  useEffect(() => {
    if (!hydrated) return
    refreshAuctions()
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || !user) return
    if (!LIVE_VIEWS.includes(view)) return
    const interval = setInterval(refreshAuctions, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [hydrated, user, view])

  const go = useCallback((next: View) => {
    const adminViews: View[] = ['admin-dashboard', 'admin-auctions', 'admin-users', 'monitor', 'winner']
    if (adminViews.includes(next) && user?.role !== 'admin') return
    setView(next)
  }, [user])

  const selectAuction = useCallback((id: string) => {
    setSelectedId(id)
    setFeePaid(false)
    setUserBid(null)
    setBidTicketNumber(null)
    setView('product')
  }, [])

  const payFee = useCallback(async (fee: number) => {
    if (!selectedId) return
    try {
      setAuthError(null)
      const { payment_url } = await api.createBidFeePaymentLink(selectedId)
      window.open(payment_url, '_blank')
      // Start polling for payment status
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getBidFeePaymentStatus(selectedId)
          if (status.status === 'SUCCESSFUL') {
            clearInterval(pollInterval)
            setFeePaid(true)
            setView('place-bid')
          } else if (status.status === 'FAILED' || status.status === 'EXPIRED' || status.status === 'CANCELLED') {
            clearInterval(pollInterval)
            setAuthError('Bid fee payment failed. Please try again.')
          }
        } catch {
          clearInterval(pollInterval)
          setAuthError('Failed to check payment status.')
        }
      }, 3000)
      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000)
    } catch {
      setAuthError('Failed to create payment link. Please try again.')
    }
  }, [selectedId])

  const submitBid = useCallback(async (amount: number) => {
    if (!selectedId || !user) return
    try {
      const res = await api.bid.place(selectedId, amount)
      const ticket = res.ticket_number
      setBidTicketNumber(ticket ?? null)
      const bid: PlacedBid = { auctionId: selectedId, amount, placedAt: Date.now(), userId: user.id, userName: user.name, ticketNumber: ticket }
      setMyBids((prev) => [bid, ...prev])
      setAllBids((prev) => [bid, ...prev])
      setUserBid(amount)
      setAuctions((prev) =>
        prev.map((a) => (a.id === selectedId ? { ...a, bidders: (a.bidders ?? 0) + 1, totalBids: (a.totalBids ?? 0) + 1 } : a)),
      )
      setView('bid-confirmed')
      refreshWallet()
      setTimeout(() => refreshAuctions(), 3000)
    } catch {
      setAuthError('Failed to place bid. Please try again.')
    }
  }, [selectedId, user])

  const payWinning = useCallback(async (amount: number) => {
    if (!selectedId) return
    try {
      setAuthError(null)
      const { payment_url } = await api.createPaymentLink(selectedId)
      window.open(payment_url, '_blank')
      setView('payment-confirmed')
    } catch {
      setAuthError('Failed to create payment link. Please try again.')
    }
  }, [selectedId])

  const reset = useCallback(() => {
    setView('home')
    setSelectedId(null)
    setUserBid(null)
    setBidTicketNumber(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setMyBids([])
  }, [])

  const refreshAuctions = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    setAuctionsLoading(true)
    try {
      const [activeRes, closedRes] = await Promise.all([
        api.listAuctions(),
        api.listClosedAuctions().catch(() => ({ data: [] })),
      ])
      const allMapped = [...activeRes.data.map(mapAuction), ...closedRes.data.map(mapAuction)]
      const unique = Array.from(new Map(allMapped.map((a) => [a.id, a])).values())
      setAuctions(unique)
    } catch {
      // silent
    } finally {
      setAuctionsLoading(false)
      refreshing.current = false
    }
  }, [])

  const refreshWallet = useCallback(async () => {
    try {
      const res = await api.wallet.balance()
      setWalletBalance(res.balance)
    } catch { /* silent */ }
  }, [])

  const fetchAuctionById = useCallback(async (id: string): Promise<Auction | undefined> => {
    const cached = auctions.find((a) => a.id === id)
    if (cached) return cached
    try {
      const data = await api.getAuction(id)
      const mapped = mapAuction(data)
      setAuctions((prev) => {
        const exists = prev.find((a) => a.id === mapped.id)
        if (exists) return prev
        return [...prev, mapped]
      })
      return mapped
    } catch {
      return undefined
    }
  }, [auctions])

  const login = useCallback(async (phone: string, password: string): Promise<boolean> => {
    try {
      setAuthError(null)
      const res = await api.auth.login(phone, password)
      setApiToken(res.access_token)
      setRefreshToken(res.refresh_token)
      const appUser: User = {
        id: res.user.id,
        name: '',
        phone: res.user.phone_number,
        role: res.user.role as UserRole,
      }
      try {
        const profile = await api.auth.profile()
        appUser.name = profile.full_name || profile.phone_number
      } catch {
        appUser.name = res.user.phone_number
      }
      setUser(appUser)
      setView('home')
      refreshWallet()
      refreshAuctions()
      return true
    } catch (e: any) {
      setAuthError(e.message || 'Invalid credentials')
      return false
    }
  }, [])

  const register = useCallback(async (phone: string, password: string, name: string): Promise<boolean> => {
    try {
      setAuthError(null)
      const res = await api.auth.register(phone, password, name)
      setApiToken(res.access_token)
      setRefreshToken(res.refresh_token)
      const appUser: User = {
        id: res.user.id,
        name,
        phone: res.user.phone_number,
        role: res.user.role as UserRole,
      }
      setUser(appUser)
      setView('home')
      refreshWallet()
      refreshAuctions()
      return true
    } catch (e: any) {
      setAuthError(e.message || 'Registration failed')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setApiToken(null)
    setRefreshToken(null)
    setUser(null)
    setSelectedId(null)
    setUserBid(null)
    setBidTicketNumber(null)
    setFeePaid(false)
    setWalletBalance(INITIAL_BALANCE)
    setMyBids([])
    setAllBids([])
    setAuctions([])
    setAuthError(null)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, user: null, accessToken: null, refreshToken: null }))
      } catch { /* ignore */ }
    }
    setView('login')
  }, [])

  const addAuction = useCallback(async (a: { name: string; category: string; marketPrice: number; bidFee: number; description: string; highlights: string[]; startTime: string; endTime: string; images?: string[]; minBid?: number; maxBid?: number; numWinners?: number }) => {
    if (user?.role !== 'admin') return
    try {
      const product = await api.createProduct({
        name: a.name, description: a.description, current_market_price: a.marketPrice, brand: a.category,
        ...(a.images?.length ? { image_urls: a.images } : {}),
      })
      await api.createAuction({
        product_id: product.id, start_time: a.startTime, end_time: a.endTime,
        min_bid: a.minBid, max_bid: a.maxBid, num_winners: a.numWinners,
      })
      await refreshAuctions()
    } catch {
      // silent
    }
    setView('admin-auctions')
  }, [refreshAuctions, user])

  const closeAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.closeAuction(id)
      await refreshAuctions()
    } catch { /* silent */ }
  }, [refreshAuctions, user])

  const updateAuction = useCallback(async (id: string, data: any) => {
    if (user?.role !== 'admin') return
    try {
      const list = await api.adminListAuctions()
      const auction = list.data.find((a) => a.id === id)
      if (auction?.product?.id) {
        if (data.name || data.marketPrice !== undefined || data.description !== undefined || data.category !== undefined || data.images !== undefined) {
          await api.updateProduct(auction.product.id, {
            ...(data.name ? { name: data.name } : {}),
            ...(data.marketPrice !== undefined ? { current_market_price: data.marketPrice } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.category !== undefined ? { brand: data.category } : {}),
            ...(data.images !== undefined ? { image_urls: data.images } : {}),
          })
        }
        if (data.startTime || data.endTime || data.minBid != null || data.maxBid != null || data.numWinners != null) {
          await api.updateAuction(id, {
            ...(data.startTime ? { start_time: data.startTime } : {}),
            ...(data.endTime ? { end_time: data.endTime } : {}),
            ...(data.minBid != null ? { min_bid: data.minBid } : {}),
            ...(data.maxBid != null ? { max_bid: data.maxBid } : {}),
            ...(data.numWinners != null ? { num_winners: data.numWinners } : {}),
          })
        }
      }
      await refreshAuctions()
    } catch { /* silent */ }
  }, [refreshAuctions, user])

  const deleteAuction = useCallback(async (id: string) => {
    if (user?.role !== 'admin') return
    try {
      await api.deleteAuction(id)
      await refreshAuctions()
    } catch { /* silent */ }
  }, [refreshAuctions, user])

  const getAuction = useCallback((id: string | null | undefined): Auction | undefined => {
    if (!id) return undefined
    return auctions.find((a) => a.id === id)
  }, [auctions])

  const value = useMemo(() => ({
    view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, myBids, user, allBids,
    auctions, auctionsLoading, authError,
    go, selectAuction, payFee, submitBid, payWinning, reset,
    login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction,
    refreshAuctions, refreshWallet, fetchAuctionById, getAuction,
  }), [
    view, selectedId, userBid, bidTicketNumber, feePaid, walletBalance, myBids, user, allBids,
    auctions, auctionsLoading, authError,
    go, selectAuction, payFee, submitBid, payWinning, reset,
    login, register, logout, addAuction, updateAuction, deleteAuction, closeAuction,
    refreshAuctions, refreshWallet, fetchAuctionById, getAuction,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
